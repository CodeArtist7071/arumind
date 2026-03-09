import requests
import json
import re
import os
import subprocess
from services.chunk_processor import chunk_questions
from config import REGION, PROJECT_ID, MODEL_ID, SUPABASE_KEY, SUPABASE_URL
import re
from supabase import create_client, Client

# -------------------------------------------------
# MODEL INITIALIZATION (VERTEX AI MISTRAL)
# -------------------------------------------------
# -------------------------------------------------
# MODEL INITIALIZATION (GEMINI)
# -------------------------------------------------
class GeminiModel:

    def __init__(self):

        from config import API_KEY, GEMINI_MODEL

        self.url = f"https://aiplatform.googleapis.com/v1/publishers/google/models/{GEMINI_MODEL}:generateContent?key={API_KEY}"

        self.headers = {
            "Content-Type": "application/json"
        }

        self.session = requests.Session()

        print("[MODEL] Gemini initialized")


    def generate(self, prompt):

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048
            }
        }

        try:

            response = self.session.post(
                url=self.url,
                headers=self.headers,
                json=payload,
                timeout=120
            )

            print("[MODEL] Status:", response.status_code)
            print("[MODEL] STATUS:", response)

            if response.status_code != 200:
                print(response.text)
                return ""

            data = response.json()

            return data["candidates"][0]["content"]["parts"][0]["text"]

        except Exception as e:
            print("[MODEL ERROR]", e)
            return ""
# Initialize model
model = GeminiModel()


# -------------------------------------------------
# CLEAN JSON OUTPUT
# -------------------------------------------------
def clean_json_output(text):

    match = re.search(r"\[[\s\S]*?\]", text)

    if match:
        return match.group(0)

    return "[]"


# -------------------------------------------------
# CLEAN OCR TEXT
# -------------------------------------------------






# -------------------------------------------------
# CLEAN OCR TEXT
# -------------------------------------------------

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def detect_exam_board_and_subject(text):

    subject_id = None
    exam_id = None

    subjects = supabase.table("subjects").select("id,name").execute().data
    exams = supabase.table("exams").select("id,name").execute().data

    text_lower = text.lower()

    for subject in subjects:
        if subject["name"].lower() in text_lower:
            subject_id = subject["id"]
            print(f"[PARSER] Found Subject: {subject['name']}")
            break

    for exam in exams:
        if exam["name"].lower() in text_lower:
            exam_id = exam["id"]
            print(f"[PARSER] Found Exam: {exam['name']}")
            break

    return subject_id, exam_id


def clean_ocr_text(text):

    print("\n[PARSER] Cleaning OCR text")

    subject_id, exam_id = detect_exam_board_and_subject(text)

    replacements = {
        "(A)": "A.",
        "(B)": "B.",
        "(C)": "C.",
        "(D)": "D.",
        "A)": "A.",
        "B)": "B.",
        "C)": "C.",
        "D)": "D."
    }

    for k, v in replacements.items():
        text = text.replace(k, v)

    text = re.sub(r"\nA\s+", "\nA. ", text)
    text = re.sub(r"\nB\s+", "\nB. ", text)
    text = re.sub(r"\nC\s+", "\nC. ", text)
    text = re.sub(r"\nD\s+", "\nD. ", text)

    text = re.sub(r"Page\s*\d+", "", text)
    text = re.sub(r"\n{2,}", "\n", text)

    if "1." in text:
        text = text.split("1.", 1)[1]
        text = "1. " + text

    return text, subject_id, exam_id

# def clean_ocr_text(text):

#     print("\n[PARSER] Cleaning OCR text")

#     replacements = {
#         "(A)": "A.",
#         "(B)": "B.",
#         "(C)": "C.",
#         "(D)": "D.",
#         "A)": "A.",
#         "B)": "B.",
#         "C)": "C.",
#         "D)": "D."
#     }

#     for k, v in replacements.items():
#         text = text.replace(k, v)

#     text = re.sub(r"\nA\s+", "\nA. ", text)
#     text = re.sub(r"\nB\s+", "\nB. ", text)
#     text = re.sub(r"\nC\s+", "\nC. ", text)
#     text = re.sub(r"\nD\s+", "\nD. ", text)

#     text = re.sub(r"Page\s*\d+", "", text)
#     text = re.sub(r"\n{2,}", "\n", text)

#     if "1." in text:
#         text = text.split("1.", 1)[1]
#         text = "1. " + text

#     return text


# -------------------------------------------------
# REGEX QUESTION EXTRACTOR
# -------------------------------------------------
def regex_extract_questions(text):

    pattern = r"""
    (\d{1,4})\s*[\.\)]\s*                # question number
    (.*?)                                # question text
    \s*[Aa]\s*[\)\.:]\s*(.*?)            # option A
    \s*[Bb]\s*[\)\.:]\s*(.*?)            # option B
    \s*[Cc]\s*[\)\.:]\s*(.*?)            # option C
    \s*[Dd]\s*[\)\.:]\s*(.*?)            # option D
    (?=\s*\d{1,4}\s*[\.\)]|\Z)           # next question
    """

    matches = re.findall(pattern, text, re.DOTALL | re.VERBOSE)

    questions = []

    for m in matches:

        q = {
            "question_number": int(m[0]),
            "question": m[1].strip(),
            "options": {
                "A": m[2].strip(),
                "B": m[3].strip(),
                "C": m[4].strip(),
                "D": m[5].strip()
            },
            "correct_answer": ""
        }

        questions.append(q)

    return questions


# -------------------------------------------------
# DETECT QUESTION BLOCKS (LLM FALLBACK)
# -------------------------------------------------


# -------------------------------------------------
def detect_question_blocks(text):

    blocks = re.split(r"(?=\n?\d+\s*[\.\)\-])", text)

    questions = []

    option_pattern = r"A[\.\)\:]?\s.*B[\.\)\:]?\s.*C[\.\)\:]?\s.*D[\.\)\:]?"

    for block in blocks:

        block = block.strip()

        if len(block) < 40:
            continue

        if re.search(option_pattern, block, re.DOTALL):
            questions.append(str(block))

    return questions

# -------------------------------------------------
# SAFE JSON PARSER
# -------------------------------------------------
def safe_json_parse(text):

    try:
        return json.loads(text)

    except:

        text = text.replace("\n", " ")

        try:
            return json.loads(text)
        except:
            return []


# -------------------------------------------------
# DEDUPLICATE QUESTIONS
# -------------------------------------------------
def deduplicate_questions(questions):

    seen = set()
    unique = []

    for q in questions:

        key = q["question"]

        if key not in seen:
            seen.add(key)
            unique.append(q)

    return unique


# -------------------------------------------------
# MAIN PARSER
# # -------------------------------------------------
# def parse_to_json(text):

#     print("\n========== PARSER PIPELINE START ==========")

#     clean_text, exam_board_id, subject_id = clean_ocr_text(text)
#     print("CLEAN TEXT CHECKING..",clean_text)
#     # STEP 1 — REGEX EXTRACTION
  
#     regex_questions = regex_extract_questions(clean_text)
#     print("REGEX",regex_questions); 
#     print("[PARSER] Regex extracted:", len(regex_questions))

#     # STEP 2 — DETECT BLOCKS FOR LLM
#     question_blocks = detect_question_blocks(clean_text)

#     print("[PARSER] Blocks for LLM:", len(question_blocks))

#     chunks = chunk_questions(question_blocks, chunk_size=8)

#     llm_questions = []

#     for i, chunk in enumerate(chunks):

#         print(f"\n[CHUNK] Processing {i+1}/{len(chunks)}")

#         chunk_text = "\n\n".join(chunk)

#         prompt = f"""
# Extract MCQ questions from the text.

# Rules:
# - Only MCQs
# - Must contain A B C D
# - Do NOT invent questions
# - Return ONLY JSON

# FORMAT:

# [
#  {{
#    "question": "",
#    "options": {{
#      "A": "",
#      "B": "",
#      "C": "",
#      "D": ""
#    }},
#    "correct_answer": ""
#  }}
# ]

# TEXT:
# {chunk_text}
# """

#         result = model.generate(prompt)

#         result = clean_json_output(result)

#         parsed = safe_json_parse(result)

#         if parsed:
#             llm_questions.extend(parsed)

#     # STEP 3 — MERGE RESULTS
#     all_questions = regex_questions + llm_questions

#     # STEP 4 — REMOVE DUPLICATES
#     all_questions = deduplicate_questions(all_questions)

#     print("\n[PARSER] Total extracted:", len(all_questions))

#     print("========== PARSER PIPELINE END ==========")

#     return all_questions


def parse_to_json(text):

    print("\n========== PARSER PIPELINE START ==========")

    clean_text, subject_id, exam_id = clean_ocr_text(text)
    print("checking the clean_text",clean_text)
    # STEP 1 — REGEX EXTRACTION
    regex_questions = regex_extract_questions(clean_text)

    print("[PARSER] Regex extracted:", len(regex_questions))

    # STEP 2 — DETECT BLOCKS
    question_blocks = detect_question_blocks(clean_text)

    print("[PARSER] Blocks for LLM:", len(question_blocks))

    chunks = chunk_questions(question_blocks, chunk_size=8)

    llm_questions = []

    for i, chunk in enumerate(chunks):

        print(f"\n[CHUNK] Processing {i+1}/{len(chunks)}")

        # SAFE JOIN
        chunk_text = "\n\n".join(map(str, chunk))

        prompt = f"""
Extract MCQ questions from the text.

Rules:
- Only MCQs
- Must contain A B C D
- Do NOT invent questions
- Return ONLY JSON

FORMAT:

[
 {{
   "question": "",
   "options": {{
     "A": "",
     "B": "",
     "C": "",
     "D": ""
   }},
   "correct_answer": ""
 }}
]

TEXT:
{chunk_text}
"""

        result = model.generate(prompt)

        result = clean_json_output(result)

        parsed = safe_json_parse(result)

        if parsed:
            llm_questions.extend(parsed)

    # STEP 3 — MERGE RESULTS
    all_questions = regex_questions + llm_questions

    # STEP 4 — REMOVE DUPLICATES
    all_questions = deduplicate_questions(all_questions)

    print("\n[PARSER] Total extracted:", len(all_questions))

    print("========== PARSER PIPELINE END ==========")

    return {
        "questions": all_questions,
        "subject_id": subject_id,
        "exam_id": exam_id
    }