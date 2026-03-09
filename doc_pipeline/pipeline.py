from services.ocr_service import extract_text
from services.qwen_parser import parse_to_json
from services.subject_detector import split_subject_sections
from services.supabase_service import fetch_exams, fetch_subjects, insert_questions
from services.question_mapper import map_questions


def run_pipeline(pdf_path):

    print("\n========= PIPELINE START =========\n")

    # -----------------------------------
    # STEP 1: OCR
    # -----------------------------------
    print("[PIPELINE] Running OCR...")
    raw_text = extract_text(pdf_path)

    if not raw_text:
        print("❌ OCR failed. No text extracted.")
        return

    # -----------------------------------
    # STEP 2: Load DB references
    # -----------------------------------
    exams = fetch_exams()
    subjects = fetch_subjects()

    if not exams:
        print("❌ No exams found in database.")
        return

    if not subjects:
        print("❌ No subjects found in database.")
        return

    exam_id = exams[0]["id"]

    print(f"[PIPELINE] Using exam_id: {exam_id}")

    # -----------------------------------
    # STEP 3: Split document by subjects
    # -----------------------------------
    sections = split_subject_sections(raw_text, subjects)

    # Fallback if no sections detected
    if not sections:

        print("⚠️ No subject sections detected. Using full document.")

        sections = [{
            "subject_id": subjects[0]["id"],
            "subject_name": subjects[0]["name"],
            "text": raw_text
        }]

    all_mapped_questions = []

    # -----------------------------------
    # STEP 4: Process each section
    # -----------------------------------
    for sec in sections:

        print(f"\n[PIPELINE] Processing subject: {sec['subject_name']}")

        questions = parse_to_json(sec["text"])

        if not questions:
            print("[PIPELINE] No questions detected in this section.")
            continue

        mapped = map_questions(
            questions,
            exam_id,
            sec["subject_id"]
        )

        all_mapped_questions.extend(mapped)

    # -----------------------------------
    # STEP 5: Insert into Supabase
    # -----------------------------------
    if all_mapped_questions:

        insert_questions(all_mapped_questions)

    else:
        print("⚠️ No questions parsed. Nothing inserted.")

    print(f"\n[PIPELINE] Total inserted questions: {len(all_mapped_questions)}")

    print("\n========= PIPELINE END =========\n")


# -----------------------------------
# RUN PIPELINE
# -----------------------------------
if __name__ == "__main__":

    pdf_file = "sample-pdf.pdf"  # change this

    run_pipeline(pdf_file)