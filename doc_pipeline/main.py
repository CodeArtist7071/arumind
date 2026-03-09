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


def normalize_options(lines):

    options = []
    current_option = None

    for line in lines:

        if OPTION_PATTERN.match(line.strip()):

            if current_option:
                options.append(current_option.strip())

            current_option = line

        else:

            if current_option:
                current_option += " " + line

    if current_option:
        options.append(current_option.strip())

    return options


def cluster_to_text(cluster):

    lines = cluster["content"]

    options = normalize_options(lines)

    if options:
        return "\n".join(options)

    return "\n".join(lines)




QUESTION_PATTERN = re.compile(r'^(Q?\d+[\).])', re.MULTILINE)

def is_question_start(text):
    text = text.strip()
    return bool(QUESTION_PATTERN.match(text))




def build_question_clusters(blocks):

    clusters = []
    current_cluster = None

    for block in blocks:

        text = block["text"]

        if is_question_start(text):

            if current_cluster:
                clusters.append(current_cluster)

            current_cluster = {
                "question_block": block,
                "content": [text]
            }

        elif current_cluster:

            current_cluster["content"].append(text)

    if current_cluster:
        clusters.append(current_cluster)

    return clusters



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

    # --------------------------
    # PAGE LOOP
    # --------------------------
    for i, img in enumerate(images):

        log("--------------------------------------------------")
        log(f"Processing page {i+1}/{len(images)}")

        try:

            # --------------------------
            # OCR
            # --------------------------
            log("Running OCR extraction")

            annotation = extract_text(img)

            log(f"OCR extraction complete. Type returned: {type(annotation)}")

            # --------------------------
            # BLOCK EXTRACTION
            # --------------------------
            log("Extracting layout blocks")

            blocks = extract_blocks(annotation)

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

            text_blocks, diagram_blocks = split_diagram_blocks(blocks)

            log(f"Text blocks: {len(text_blocks)}")
            log(f"Diagram blocks: {len(diagram_blocks)}")

            # --------------------------
            # BUILD CLUSTERS
            # --------------------------
            log("Building question clusters")

            clusters = build_question_clusters(text_blocks)

            log(f"{len(clusters)} clusters detected on page {i+1}")

            # --------------------------
            # DIAGRAM LINKING
            # --------------------------
            log("Linking diagrams to clusters")

            attach_diagrams_to_clusters(clusters, diagram_blocks)

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

                    json_data = parse_to_json(cluster_text)

                    log(f"Parser returned type: {type(json_data)}")

                    if isinstance(json_data, list):

                        log(f"{len(json_data)} questions parsed from cluster")

                        for q in json_data:
                            q["diagram_present"] = cluster.get("diagram", False)

                        all_questions.extend(json_data)

                        log(f"Total accumulated questions: {len(all_questions)}")

                    else:

                        log("Parser output not a list. Cluster skipped.")

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
    # DETECT EXAM + SUBJECT
    # --------------------------
    log("Detecting exam and subject from OCR text")

    header_text = debug_text[:1500]

    log(f"Header text length used for detection: {len(header_text)}")

    exam_name = detect_exam_name(header_text)
    subject_name = detect_subject_name(header_text)

    log(f"Detected exam name: {exam_name}")
    log(f"Detected subject name: {subject_name}")

    if not exam_name or not subject_name:

        log("Exam or subject detection failed. Skipping Supabase push.")
        return

    # --------------------------
    # RESOLVE IDS
    # --------------------------
    log("Resolving exam_id and subject_id from Supabase")

    exam_id, subject_id = resolve_exam_subject_ids(exam_name, subject_name)

    log(f"Resolved exam_id: {exam_id}")
    log(f"Resolved subject_id: {subject_id}")

    # --------------------------
    # VALIDATE OUTPUT
    # --------------------------
    log("Validating parsed question list")

    if not isinstance(all_questions, list):

        log("Invalid JSON output from parser")
        return

    log(f"Total questions extracted: {len(all_questions)}")

    # --------------------------
    # SAVE QUESTIONS JSON
    # --------------------------
    log("Saving questions JSON")

    with open("outputs/questions.json", "w", encoding="utf-8") as f:
        json.dump(all_questions, f, indent=2)

    log("Questions saved to outputs/questions.json")

    # --------------------------
    # PUSH TO SUPABASE
    # --------------------------
    log("Pushing English questions to Supabase")

    push_english(all_questions, subject_id, exam_id)

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



   










