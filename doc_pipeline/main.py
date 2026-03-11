import json
import os
import time
import re

from services.pdf_splitter import split_pdf
from services.qwen_parser import parse_to_json
from services.ocr_service import attach_diagrams_to_clusters, blocks_to_text, clean_blocks, extract_blocks, extract_text, sort_blocks, split_diagram_blocks
from services.drive_service import download_pdfs
from services.supabase_push import detect_exam_name, detect_subject_name, push_english, resolve_exam_subject_ids
from services.quota_manager import check_vision_quota, check_gemini_quota

from config import ENABLE_ODIA_TRANSLATION

if ENABLE_ODIA_TRANSLATION:
    from services.gemini_translate_service import translate_questions_batch


STATUS_FILE = "status.json"


def log(message):
    print(f"[PIPELINE] {message}")


# -------------------------------
# STATUS FILE MANAGEMENT
# -------------------------------

def load_status():

    if not os.path.exists(STATUS_FILE):
        return {"processed_files": []}

    with open(STATUS_FILE) as f:
        return json.load(f)


def save_status(status):

    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)


# -------------------------------
# TEXT CLEANING
# -------------------------------

def clean_text(text):

    import re
    text = re.sub(r'([A-Da-d1-4])\s+\)', r'\1)', text)
    text = re.sub(r"Page\s+\d+", "", text)
    text = re.sub(r"OSSC.*Exam", "", text)

    return text


# -------------------------------
# PDF PROCESSING
# -------------------------------

# def process_pdf(pdf_path):

#     log(f"Splitting PDF: {pdf_path}")

#     images = split_pdf(pdf_path)

#     log(f"{len(images)} pages detected")

#     full_text = ""

#     for i, img in enumerate(images):

#         log(f"OCR page {i+1}/{len(images)}")

#         try:

#             text = extract_text(img)


#             full_text += extract_blocks(text) + "\n"

#         except Exception as e:

#             log(f"OCR error: {e}")

#     # Clean OCR text
#     full_text = clean_text(full_text)
    

#     # Save OCR debug output
#     os.makedirs("outputs", exist_ok=True)

#     with open("outputs/raw_text.txt", "w", encoding="utf-8") as f:
#         f.write(full_text)

#     log("Saved OCR text to outputs/raw_text.txt")

#     # --------------------------
#     # QWEN PARSING
#     # --------------------------

#     log("Parsing questions with Qwen")

#     json_data = parse_to_json(full_text)

#     print("Parsed JSON Output:")
#     print(json.dumps(json_data, indent=2))

#     if not isinstance(json_data, list):

#         log("Parser returned invalid JSON")
#         return

#     log(f"{len(json_data)} questions extracted")

#     # Save JSON locally
#     with open("outputs/questions.json", "w", encoding="utf-8") as f:
#         json.dump(json_data, f, indent=2)

#     log("Questions saved to outputs/questions.json")

#     # --------------------------
#     # SUPABASE PUSH
#     # --------------------------

#     log("Saving English questions to Supabase")

#     push_english(json_data)



# OPTION_PATTERN = re.compile(
#     r'^(\(?[A-Da-d]\)|[A-Da-d][\).\:]|\(?[1-4]\)|[1-4][\).\:])'
# )
OPTION_PATTERN = re.compile(
    r'(\(?[A-Da-d]\)|[A-Da-d][\).\:]|\(?[1-4]\)|[1-4][\).\:])'
)


def cluster_to_text(cluster):
    
    # cluster["content"] contains both the question and the option blocks
    lines = cluster["content"]
    
    # We simply join them. We can optionally format options but it's 
    # safer to just return the full text and let qwen_parser handle it.
    # Joining with space and then adding newlines where options likely occur.
    full_text = "\n".join(lines)
    
    # Make sure options are on newlines so the parser can identify them
    full_text = re.sub(r'\s+(\(?[A-Da-d]\)|[A-Da-d][\)\.\:]|\(?[1-4]\)|[1-4][\)\.\:])\s', r'\n\1 ', full_text)

    return full_text




QUESTION_PATTERN = re.compile(r'^(Q?\d+[\).])', re.MULTILINE)

def is_question_start(text):
    text = text.strip()
    return bool(QUESTION_PATTERN.match(text))




def build_question_clusters(blocks, initial_subject_id=None):
    from services.subject_tracker import match_subject_id

    clusters = []
    current_cluster = None
    running_subject_id = initial_subject_id

    for block in blocks:
        text = block["text"]
        
        # Check if block is a heading and updates the running subject state
        new_sub = match_subject_id(text)
        if new_sub:
            running_subject_id = new_sub
            print(f"--> STATE UPDATE: Switched to Subject ID {running_subject_id} from heading '{text.strip()}'")

        if is_question_start(text):
            if current_cluster:
                clusters.append(current_cluster)

            current_cluster = {
                "question_block": block,
                "content": [text],
                "subject_id": running_subject_id
            }

        elif current_cluster:
            current_cluster["content"].append(text)

    if current_cluster:
        clusters.append(current_cluster)

    return clusters, running_subject_id


def process_pdf(pdf_path):

    log("==================================================")
    log("STARTING PDF PROCESSING")
    log(f"Input PDF: {pdf_path}")

    # --------------------------
    # SPLIT PDF
    # --------------------------
    log("Splitting PDF into images")

    images = split_pdf(pdf_path)

    log(f"PDF split complete. Total pages detected: {len(images)}")

    all_questions = []
    debug_text = ""
    global_exam_id = None
    current_subject_id = None

    # --------------------------
    # PAGE LOOP
    # --------------------------
    for i, img in enumerate(images):

        log("--------------------------------------------------")
        log(f"Processing page {i+1}/{len(images)}")

        try:

            # --------------------------
            # IMAGE PREPROCESSING
            # --------------------------
            log("Running Image Preprocessing")
            from services.image_preprocessor import preprocess_for_ocr
            processed_img = preprocess_for_ocr(img)

            # --------------------------
            # OCR
            # --------------------------
            log("Running OCR extraction")

            annotation = extract_text(processed_img)

            log(f"OCR extraction complete. Type returned: {type(annotation)}")

            # --------------------------
            # BLOCK EXTRACTION
            # --------------------------
            log("Extracting layout blocks")

            blocks = extract_blocks(annotation)
            from services.qwen_parser import detect_exam_board_and_subject
            page_text = blocks_to_text(blocks)
            s_id, e_id = detect_exam_board_and_subject(page_text)
            
            if i < 4 and e_id and not global_exam_id:
                global_exam_id = e_id
                log(f"Global Exam ID locked from page {i+1}: {global_exam_id}")
            
            # We explicitly ignore s_id here in favor of structure-based chronological Subject Tracking below.

            log(f"Blocks extracted: {len(blocks)}")

            # --------------------------
            # SORT BLOCKS
            # --------------------------
            log("Sorting blocks in reading order")

            blocks = sort_blocks(blocks)

            log("Block sorting completed")

            # --------------------------
            # CLEAN BLOCKS
            # --------------------------
            log("Cleaning noise blocks")

            blocks = clean_blocks(blocks)

            log(f"Blocks remaining after cleaning: {len(blocks)}")

            # --------------------------
            # SPLIT DIAGRAMS
            # --------------------------
            log("Separating diagram blocks")

            text_blocks, diagram_blocks = split_diagram_blocks(blocks, processed_img)

            log(f"Text blocks: {len(text_blocks)}")
            log(f"Diagram blocks: {len(diagram_blocks)}")

            # --------------------------
            # BUILD CLUSTERS
            # --------------------------
            log("Building question clusters and resolving stateful headings")

            clusters, current_subject_id = build_question_clusters(text_blocks, current_subject_id)

            log(f"{len(clusters)} clusters detected on page {i+1}")

            # --------------------------
            # DIAGRAM LINKING
            # --------------------------
            log("Linking diagrams to clusters")

            attach_diagrams_to_clusters(clusters, diagram_blocks, text_blocks, processed_img)

            log("Diagram linking completed")

            # --------------------------
            # PROCESS CLUSTERS
            # --------------------------
            for c_idx, cluster in enumerate(clusters):

                log(f"Processing cluster {c_idx+1}/{len(clusters)}")

                cluster_text = cluster_to_text(cluster)

                log(f"Cluster text length: {len(cluster_text)} characters")

                debug_text += cluster_text + "\n\n"

                try:

                    log("Sending cluster to parser")
                    
                    cluster_subject_id = cluster.get("subject_id") or current_subject_id
                    json_data = parse_to_json(cluster_text, cluster_subject_id, global_exam_id)

                    log(f"Parser returned type: {type(json_data)}")
                    
                    # Extract the questions list whether it's wrapped in a dict or standalone
                    if isinstance(json_data, dict) and "questions" in json_data:
                        parsed_questions = json_data["questions"]
                    elif isinstance(json_data, list):
                        parsed_questions = json_data
                    else:
                        parsed_questions = []

                    if isinstance(parsed_questions, list) and len(parsed_questions) > 0:

                        log(f"{len(parsed_questions)} questions parsed from cluster")

                        for q in parsed_questions:
                            q["diagram_present"] = cluster.get("diagram", False)
                            q["diagram_url"] = cluster.get("diagram_url", None)

                        all_questions.extend(parsed_questions)

                        log(f"Total accumulated questions: {len(all_questions)}")

                    else:

                        log("Parser output empty or not a list. Cluster skipped.")

                except Exception as e:

                    log(f"Cluster parse error: {e}")

        except Exception as e:

            log(f"OCR error on page {i+1}: {e}")

    log("--------------------------------------------------")
    log("OCR processing completed")

    # --------------------------
    # SAVE DEBUG TEXT
    # --------------------------
    log("Saving clustered OCR text for debugging")

    os.makedirs("outputs", exist_ok=True)

    with open("outputs/raw_text.txt", "w", encoding="utf-8") as f:
        f.write(debug_text)

    log("Saved OCR text to outputs/raw_text.txt")
    log(f"Total debug text length: {len(debug_text)} characters")

    # --------------------------
    # VALIDATE OUTPUT
    # --------------------------
    log("Validating parsed question list")

    if not isinstance(all_questions, list):

        log("Invalid JSON output from parser")
        return

    log(f"Total questions extracted: {len(all_questions)}")

    # --------------------------
    # DIAGRAM & LINKED METADATA PROPAGATION
    # --------------------------
    log("Propagating diagrams for linked questions")
    
    # Map questions by integer question_number
    q_map = {}
    for q in all_questions:
        q_num = q.get("question_number")
        if q_num is not None:
            try:
                q_map[int(q_num)] = q
            except ValueError:
                pass

        if "linked_questions" not in q:
            q["linked_questions"] = []
        if "appear_year" not in q:
            q["appear_year"] = None

    processed_groups = set()
    for q in all_questions:
        linked = q.get("linked_questions", [])
        if not isinstance(linked, list):
            linked = []
            q["linked_questions"] = linked

        q_num = q.get("question_number")
        
        group_nums = [int(x) for x in linked if str(x).isdigit()]
        if q_num is not None and str(q_num).isdigit():
            group_nums.append(int(q_num))
            
        group_nums = list(set(group_nums))
        
        if len(group_nums) > 1:
            group = tuple(sorted(group_nums))
            if group not in processed_groups:
                processed_groups.add(group)
                
                group_diagram_url = None
                group_diagram_present = False
                
                for num in group:
                    if num in q_map:
                        if q_map[num].get("diagram_present") and q_map[num].get("diagram_url"):
                            group_diagram_url = q_map[num]["diagram_url"]
                            group_diagram_present = True
                            break
                
                if group_diagram_present:
                    for num in group:
                        if num in q_map and not q_map[num].get("diagram_url"):
                            q_map[num]["diagram_present"] = True
                            q_map[num]["diagram_url"] = group_diagram_url
                            log(f"Propagated diagram to question {num} from linked group")
    # SAVE QUESTIONS JSON
    # --------------------------
    log("Saving questions JSON")

    with open("outputs/questions.json", "w", encoding="utf-8") as f:
        json.dump(all_questions, f, indent=2)

    log("Questions saved to outputs/questions.json")

    # --------------------------
    # SUPABASE PUSH
    # --------------------------
    log(f"Final Detected Exam ID: {global_exam_id}")
    log(f"Final Detected Subject ID: {current_subject_id}")

    if not global_exam_id or not current_subject_id:
        log("Exam or subject detection failed. Skipping Supabase push.")
        return
    else:
        log("Questions contain fully mapped subject_id, exam_id, and chapter_id.")
        # push_english(all_questions, current_subject_id, global_exam_id)
        pass

    # --------------------------
    # PUSH TO SUPABASE
    # --------------------------
    log("Pushing English questions to Supabase")

    push_english(all_questions, current_subject_id, global_exam_id)

    log("English questions pushed successfully")

    # --------------------------
    # ODIA TRANSLATION
    # --------------------------
    if ENABLE_ODIA_TRANSLATION:

        log("Odia translation enabled")

        log("Checking Gemini quota")

        check_gemini_quota()

        log("Translating questions to Odia")

        odia_questions = translate_questions_batch(all_questions)

        log(f"Odia translation complete. Questions translated: {len(odia_questions)}")

        log("Pushing Odia questions to Supabase")

        push_odia(odia_questions)

        log("Odia questions pushed successfully")

    else:

        log("Odia translation disabled")

    log("==================================================")
    log("PDF processing completed successfully")

# -------------------------------
# MAIN FUNCTION
# -------------------------------

def main(pdf_path):

    start = time.time()

    status = load_status()

    name = os.path.basename(pdf_path)

    if name in status["processed_files"]:
        log("Already processed")
        return

    log(f"Starting processing: {name}")

    process_pdf(pdf_path)

    status["processed_files"].append(name)

    save_status(status)

    log(f"Completed in {time.time() - start:.2f} seconds")


# -------------------------------
# PIPELINE ENTRY
# -------------------------------

if __name__ == "__main__":

    log("Downloading PDFs from Google Drive")

    pdf_files = download_pdfs()

    log(f"Found {len(pdf_files)} PDFs")

    for pdf in pdf_files:

        log(f"Processing {pdf}")

        main(pdf)



   










