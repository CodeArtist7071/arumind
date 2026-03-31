import os
import sys
import json
import pandas as pd

# Add parent directory to path to allow importing models/services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.gemini_service import GeminiModel
from services.ocr_service import extract_text, blocks_to_text, extract_blocks

def load_prompt():
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ai_prompt", "syllabus_prompt.txt")
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()

def load_reference_structure():
    ref_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "structure_flat.json")
    with open(ref_path, "r", encoding="utf-8") as f:
        return json.load(f)

def extract_from_excel_chunks(file_path):
    print(f"[PROCESS] Reading Excel file for chunking: {file_path}")
    df = pd.read_excel(file_path)
    
    # Identify key columns (handling trailing spaces found in previous run)
    board_col = next((c for c in df.columns if 'BOARD' in c.upper()), df.columns[0])
    exam_col = next((c for c in df.columns if 'EXAM' in c.upper()), df.columns[1])
    
    print(f"[PROCESS] Using '{board_col}' and '{exam_col}' for grouping.")
    
    # Forward-fill to handle blank cells under the same category
    df[board_col] = df[board_col].ffill()
    df[exam_col] = df[exam_col].ffill()
    
    # Group by Board and Exam
    groups = df.groupby([board_col, exam_col])
    
    chunks = []
    for (board, exam), group_df in groups:
        # Clean current group
        group_df = group_df.dropna(how='all').dropna(axis=1, how='all')
        if not group_df.empty:
            chunks.append({
                "board": str(board).strip(),
                "exam": str(exam).strip(),
                "csv": group_df.to_csv(index=False)
            })
            
    print(f"[PROCESS] Split syllabus into {len(chunks)} logical chunks.")
    return chunks

def extract_from_image(file_path):
    print(f"[PROCESS] Running OCR on image: {file_path}")
    annotation = extract_text(file_path)
    blocks = extract_blocks(annotation)
    return blocks_to_text(blocks)

def process_syllabus(file_path):
    print(f"[PROCESS] Starting syllabus processing: {file_path}")
    ext = os.path.splitext(file_path)[1].lower()
    
    # Initialize components
    ref_structure = load_reference_structure()
    base_prompt = load_prompt()
    model = GeminiModel(use_vertexai=False)
    
    master_mapped_data = []
    
    if ext in ['.xlsx', '.xls', '.csv']:
        chunks = extract_from_excel_chunks(file_path)
        for i, chunk in enumerate(chunks):
            print(f"\n[PROCESS] Processing Chunk {i+1}/{len(chunks)}: {chunk['board']} - {chunk['exam']}")
            
            # Construct chunk-specific prompt
            full_prompt = base_prompt + "\n\n"
            full_prompt += "### REFERENCE STRUCTURE (JSON):\n" + json.dumps(ref_structure, indent=1) + "\n\n"
            full_prompt += f"### TARGET BOARD: {chunk['board']}\n"
            full_prompt += f"### TARGET EXAM: {chunk['exam']}\n"
            full_prompt += "### SYLLABUS DATA (CSV):\n" + chunk['csv'] + "\n\n"
            full_prompt += "Output ONLY the mapped JSON list for THIS EXAM only."

            try:
                response_text = model.generate(
                    full_prompt, 
                    response_mime_type="application/json",
                    config={"max_output_tokens": 4096} # 4k is enough for one exam chunk
                )
                
                # Parse single chunk
                import json5
                start = response_text.find('[')
                end = response_text.rfind(']')
                if start != -1 and end != -1:
                    chunk_data = json5.loads(response_text[start:end+1])
                    if isinstance(chunk_data, list):
                        master_mapped_data.extend(chunk_data)
                        print(f"[SUCCESS] Mapped {len(chunk_data)} chapters from chunk.")
                
                # Progressive save
                output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "syllabus.json")
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(master_mapped_data, f, indent=2)

            except Exception as e:
                print(f"[ERROR] Failed to process chunk {chunk['exam']}: {e}")

    elif ext in ['.png', '.jpg', '.jpeg', '.pdf']:
        raw_text = extract_from_image(file_path)
        print(f"[PROCESS] Extracted {len(raw_text)} chars from OCR.")
        # Single-pass for images (could be refined to split PDF pages later)
        full_prompt = base_prompt + "\n\n" + \
                      "### REFERENCE STRUCTURE:\n" + json.dumps(ref_structure, indent=1) + "\n\n" + \
                      "### EXTRACTED TEXT:\n" + raw_text + "\n\n" + \
                      "Output JSON list."
        
        response_text = model.generate(full_prompt, response_mime_type="application/json", config={"max_output_tokens": 8192})
        # parse ... (simplified for this update)
        import json5
        start = response_text.find('[')
        end = response_text.rfind(']')
        if start != -1 and end != -1:
             master_mapped_data = json5.loads(response_text[start:end+1])

    if master_mapped_data:
        output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "syllabus.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(master_mapped_data, f, indent=2)
        print(f"\n[FINAL SUCCESS] Total of {len(master_mapped_data)} chapters mapped and saved.")
    else:
        print("[ERROR] No mapping results achieved.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process_syllabus.py <path_to_syllabus_file>")
    else:
        file_path = sys.argv[1]
        if os.path.exists(file_path):
            process_syllabus(file_path)
        else:
            print(f"[ERROR] File not found: {file_path}")
