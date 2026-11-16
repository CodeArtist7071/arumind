import os
import sys
import time
import json
import json5
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

import pandas as pd
import requests

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("QuestionParser")

# Force stdout to UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add parent directory to sys.path to access config.py if needed
CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent
if str(PARENT_DIR) not in sys.path:
    sys.path.insert(0, str(PARENT_DIR))

try:
    from config import API_KEY, GEMINI_MODEL, PROJECT_ID, REGION
except ImportError:
    API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = "gemini-2.5-flash-lite"
    PROJECT_ID = "aruedu"
    REGION = "us-central1"

# LLM usage is opt-in so deterministic parsing remains the default.
LLM_ENABLED = os.getenv("LLM_ENABLED", "false").strip().lower() in {
    "1", "true", "yes", "on"
}

# Import Google GenAI SDK if available
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

# Try importing GeminiModel from services
try:
    from services.gemini_service import GeminiModel as ServiceGeminiModel
except ImportError:
    ServiceGeminiModel = None

# Configure Models
PRIMARY_MODEL = GEMINI_MODEL if GEMINI_MODEL else "gemini-2.5-flash-lite"
FALLBACK_MODEL = "gemini-2.5-flash"

# Directories
MARKDOWN_OUTPUTS_DIR = CURRENT_DIR / "markdown_outputs"
EXCEL_OUTPUTS_DIR = CURRENT_DIR / "excel_outputs"
EXCEL_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


# -------------------------------------------------------------------
# REGEX PARSER FALLBACK
# -------------------------------------------------------------------
ANSWER_PAIR_PATTERN = re.compile(
    r"(?<!\d)(?P<number>\d{1,4})\s*[.):-]?\s*"
    r"(?:\(\s*(?P<paren>[a-d])\s*\)|(?P<plain>[a-d])\s*[.)]?)",
    re.IGNORECASE,
)


def extract_answer_key(text: str) -> Dict[int, str]:
    """Normalize compact answer pairs such as 1(a), 1. (a), 1a, or 1.a)."""
    answers_by_number: Dict[int, set[str]] = {}

    for line in text.splitlines():
        matches = list(ANSWER_PAIR_PATTERN.finditer(line))

        # Requiring a dense sequence avoids treating normal question text as a key.
        if len(matches) < 2:
            continue

        for match in matches:
            number = int(match.group("number"))
            option = (match.group("paren") or match.group("plain")).upper()
            answers_by_number.setdefault(number, set()).add(option)

    # Conflicting values usually indicate repeated numbering at a chapter boundary.
    return {
        number: next(iter(options))
        for number, options in answers_by_number.items()
        if len(options) == 1
    }


def regex_extract_questions(text: str) -> List[Dict[str, Any]]:
    """Fallback Regex Extractor to parse MCQs directly from markdown text if LLM API is unavailable."""
    # Pre-clean option formats
    clean = re.sub(r'(?im)(?<=\n|\s)\(\s*[Aa]\s*\)', '\nA. ', text)
    clean = re.sub(r'(?im)(?<=\n|\s)\(\s*[Bb]\s*\)', '\nB. ', clean)
    clean = re.sub(r'(?im)(?<=\n|\s)\(\s*[Cc]\s*\)', '\nC. ', clean)
    clean = re.sub(r'(?im)(?<=\n|\s)\(\s*[Dd]\s*\)', '\nD. ', clean)

    clean = re.sub(r'(?im)(?<=\n|\s)[Aa]\s*[\)\.]', '\nA. ', clean)
    clean = re.sub(r'(?im)(?<=\n|\s)[Bb]\s*[\)\.]', '\nB. ', clean)
    clean = re.sub(r'(?im)(?<=\n|\s)[Cc]\s*[\)\.]', '\nC. ', clean)
    clean = re.sub(r'(?im)(?<=\n|\s)[Dd]\s*[\)\.]', '\nD. ', clean)

    pattern = r"""
    (\d{1,4})\s*[\.\)]\s*                # question number
    (.*?)                                # question text
    \s*[Aa]\s*[\)\.:]\s*(.*?)            # option A
    \s*[Bb]\s*[\)\.:]\s*(.*?)            # option B
    \s*[Cc]\s*[\)\.:]\s*(.*?)            # option C
    \s*[Dd]\s*[\)\.:]\s*(.*?)            # option D
    (?=\s*\d{1,4}\s*[\.\)]|\Z)           # next question boundary
    """

    matches = re.findall(pattern, clean, re.DOTALL | re.VERBOSE)
    questions = []
    answer_key = extract_answer_key(text)

    for m in matches:
        q_num = m[0]
        q_text = m[1].strip()
        opt_a = m[2].strip()
        opt_b = m[3].strip()
        opt_c = m[4].strip()
        opt_d = m[5].strip()

        if q_text and (opt_a or opt_b):
            questions.append({
                "question_number": int(q_num),
                "question_text": f"{q_num}. {q_text}",
                "option_a": opt_a,
                "option_b": opt_b,
                "option_c": opt_c,
                "option_d": opt_d,
                "correct_option": answer_key.get(int(q_num), ""),
                "answer_source": (
                    "printed_answer_key" if int(q_num) in answer_key else "not_found"
                ),
                "explanation": "",
                "subject": "",
                "topic": ""
            })

    return questions


class QuestionExtractor:
    def __init__(self):
        self.service_model = None
        if ServiceGeminiModel:
            try:
                self.service_model = ServiceGeminiModel(use_vertexai=True)
            except Exception:
                pass

    def _call_gemini_rest_api(self, model_name: str, prompt: str) -> Optional[str]:
        """Call Gemini REST API directly using API_KEY if available."""
        if not API_KEY or API_KEY == "AIzaSyC_O5m_HebPhcyMDjP_IqKj3pNdaW9-DQ0":
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={API_KEY}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
        }

        try:
            res = requests.post(url, headers=headers, json=payload, timeout=60)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
        except Exception as e:
            logger.warning(f"REST API call to '{model_name}' failed: {e}")
        return None

    def generate_with_fallback(self, prompt: str, chunk_text: str) -> tuple[List[Dict[str, Any]], str]:
        """
        Executes primary LLM model. If primary fails with any exception or empty response,
        automatically falls back to secondary model, and finally to Regex parser.
        Returns tuple of (questions_list, strategy_used).
        """
        if not LLM_ENABLED:
            logger.info("[PARSER] LLM disabled. Using deterministic regex extractor.")
            return regex_extract_questions(chunk_text), "Regex Extractor (LLM Disabled)"

        # Attempt 1: Primary Model via REST or Service
        logger.info(f"[LLM] Primary Attempt 1: '{PRIMARY_MODEL}'...")
        res_text = self._call_gemini_rest_api(PRIMARY_MODEL, prompt)
        if not res_text and self.service_model:
            try:
                res_text = self.service_model.generate(prompt, response_mime_type="application/json")
            except Exception as e:
                logger.warning(f"[LLM] ServiceGeminiModel failed: {e}")

        if res_text:
            parsed = clean_and_parse_json(res_text)
            if parsed:
                return parsed, f"Primary LLM ({PRIMARY_MODEL})"

        # Attempt 2: Fallback Model
        logger.info(f"[LLM] Fallback Attempt 2: '{FALLBACK_MODEL}'...")
        res_text = self._call_gemini_rest_api(FALLBACK_MODEL, prompt)
        if res_text:
            parsed = clean_and_parse_json(res_text)
            if parsed:
                return parsed, f"Fallback LLM ({FALLBACK_MODEL})"

        # Attempt 3: Regex Extractor Fallback
        logger.info("[PARSER] LLM API calls unavailable or failed. Utilizing Fallback Regex Extractor...")
        regex_parsed = regex_extract_questions(chunk_text)
        return regex_parsed, "Regex Extractor (Fallback)"


def clean_and_parse_json(raw_text: str) -> List[Dict[str, Any]]:
    """Clean markdown backticks and robustly parse JSON array."""
    if not raw_text:
        return []

    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    start_idx = text.find("[")
    end_idx = text.rfind("]")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        text = text[start_idx:end_idx + 1]

    try:
        data = json5.loads(text)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            return [data]
    except Exception as e:
        logger.warning(f"JSON parsing error ({e}). Returning empty list.")

    return []


def build_question_prompt(chunk_markdown: str, page_start: int, page_end: int) -> str:
    """Build structured LLM prompt to extract all questions from a markdown chunk."""
    return f"""You are an expert Educational Data Parser & Question Extractor.
Extract ALL Multiple Choice Questions (MCQs) and Practice Questions found in the provided Markdown document slice (Pages {page_start} to {page_end}).

### Extraction Rules:
1. Extract every question, option, answer key, and explanation present in the document.
2. If options are missing (e.g. fill in the blanks or subjective questions), set option fields to null or empty string.
3. Only extract a correct answer when it is explicitly printed in the supplied text. Never solve or infer an answer.
4. Keep exact text formatting, formulas, and math expressions intact.
5. Return a strict JSON array of question objects.

### JSON Output Format:
[
  {{
    "question_text": "Full question statement",
    "option_a": "Option A text",
    "option_b": "Option B text",
    "option_c": "Option C text",
    "option_d": "Option D text",
    "correct_option": "A / B / C / D or null if unknown",
    "answer_source": "printed_answer_key / explicit_solution / not_found",
    "explanation": "Detailed solution or explanation if available",
    "subject": "Subject name if identifiable (e.g. History, Geography, Polity)",
    "topic": "Topic/Chapter name if identifiable"
  }}
]

### Document Slice (Pages {page_start} - {page_end}):
{chunk_markdown}
"""


class RelationalQuestionParserPipeline:
    def __init__(self):
        self.extractor = QuestionExtractor()

    def process_document(self, doc_dir: Path):
        manifest_path = doc_dir / "manifest.json"
        if not manifest_path.exists():
            logger.warning(f"No manifest.json found in '{doc_dir}'. Skipping.")
            return

        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        doc_id = manifest.get("document_id", doc_dir.name)
        chunks = manifest.get("chunks", [])

        parsed_questions_dir = doc_dir / "parsed_questions"
        parsed_questions_dir.mkdir(parents=True, exist_ok=True)

        parse_state_path = doc_dir / "parse_state.json"
        parse_state = self._load_parse_state(parse_state_path)
        extraction_version = manifest.get("extraction_version", 1)
        if parse_state.get("_extraction_version") != extraction_version:
            logger.info(
                "Extraction version changed for '%s'; invalidating parser cache.",
                doc_id,
            )
            parse_state = {"_extraction_version": extraction_version}
            self._save_parse_state(parse_state_path, parse_state)

        print(f"\n========================================================")
        print(f" PARSING QUESTIONS FOR: {doc_id}")
        print(f" Total Chunks: {len(chunks)}")
        print(f"========================================================")

        all_doc_questions = []

        for chunk_entry in chunks:
            chunk_id = chunk_entry["chunk_id"]
            chunk_rel = chunk_entry["file"]
            chunk_md_path = doc_dir / chunk_rel
            page_start = chunk_entry["page_start"]
            page_end = chunk_entry["page_end"]

            chunk_json_out = parsed_questions_dir / f"{chunk_id}.json"

            # Resumable Check: skip if chunk was already parsed and json exists
            if parse_state.get(chunk_id, {}).get("status") == "completed" and chunk_json_out.exists():
                try:
                    with open(chunk_json_out, "r", encoding="utf-8") as jf:
                        chunk_q_list = json.load(jf)
                        if chunk_q_list:
                            print(f"[->] Skipping {chunk_id} (Pages {page_start}-{page_end}): {len(chunk_q_list)} Questions Already Parsed")
                            all_doc_questions.extend(chunk_q_list)
                            continue
                except Exception:
                    pass

            if not chunk_md_path.exists():
                logger.warning(f"Chunk file '{chunk_md_path}' does not exist yet. Skipping for now.")
                continue

            print(f"\n[>] Processing {chunk_id} (Pages {page_start}-{page_end})...")
            start_time = time.time()

            try:
                with open(chunk_md_path, "r", encoding="utf-8") as mf:
                    chunk_md_content = mf.read()

                prompt = build_question_prompt(chunk_md_content, page_start, page_end)
                questions, strategy_used = self.extractor.generate_with_fallback(prompt, chunk_md_content)

                # Attach chunk metadata to each question
                enriched_questions = []
                for q in questions:
                    q_entry = {
                        "document_id": doc_id,
                        "chunk_id": chunk_id,
                        "page_start": page_start,
                        "page_end": page_end,
                        "model_used": strategy_used,
                        "question_number": q.get("question_number"),
                        "question_text": q.get("question_text", ""),
                        "option_a": q.get("option_a", ""),
                        "option_b": q.get("option_b", ""),
                        "option_c": q.get("option_c", ""),
                        "option_d": q.get("option_d", ""),
                        "correct_option": q.get("correct_option", ""),
                        "answer_source": q.get("answer_source", "not_found"),
                        "explanation": q.get("explanation", ""),
                        "subject": q.get("subject", ""),
                        "topic": q.get("topic", "")
                    }
                    enriched_questions.append(q_entry)

                # Save per-chunk JSON output
                with open(chunk_json_out, "w", encoding="utf-8") as jf:
                    json.dump(enriched_questions, jf, indent=2)

                all_doc_questions.extend(enriched_questions)

                elapsed = time.time() - start_time
                print(f"[OK] {chunk_id} extracted {len(enriched_questions)} questions in {elapsed:.2f}s using '{strategy_used}'")

                # Update parse state
                parse_state[chunk_id] = {
                    "status": "completed",
                    "question_count": len(enriched_questions),
                    "model_used": strategy_used,
                    "parsed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                self._save_parse_state(parse_state_path, parse_state)

            except Exception as e:
                logger.error(f"Error parsing questions for {chunk_id}: {e}")
                parse_state[chunk_id] = {
                    "status": "failed",
                    "error": str(e),
                    "parsed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                self._save_parse_state(parse_state_path, parse_state)

        # Export to Excel sheet
        self._export_to_excel(doc_id, all_doc_questions)

    def _load_parse_state(self, state_path: Path) -> Dict[str, Any]:
        if state_path.exists():
            try:
                with open(state_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def _save_parse_state(self, state_path: Path, state: Dict[str, Any]):
        with open(state_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    def _export_to_excel(self, doc_id: str, questions: List[Dict[str, Any]]):
        if not questions:
            print(f"\n[!] No questions found to export for '{doc_id}'.")
            return

        excel_filename = EXCEL_OUTPUTS_DIR / f"{doc_id}_questions.xlsx"

        rows = []
        for idx, q in enumerate(questions, start=1):
            rows.append({
                "Question ID": f"QST_{idx:05d}",
                "Document ID": q.get("document_id", ""),
                "Chunk ID": q.get("chunk_id", ""),
                "Page Start": q.get("page_start", ""),
                "Page End": q.get("page_end", ""),
                "Question Number": q.get("question_number", ""),
                "Question Text": q.get("question_text", ""),
                "Option A": q.get("option_a", ""),
                "Option B": q.get("option_b", ""),
                "Option C": q.get("option_c", ""),
                "Option D": q.get("option_d", ""),
                "Correct Option": q.get("correct_option", ""),
                "Answer Source": q.get("answer_source", "not_found"),
                "Explanation": q.get("explanation", ""),
                "Subject": q.get("subject", ""),
                "Topic": q.get("topic", ""),
                "Extraction Model": q.get("model_used", "")
            })

        df = pd.DataFrame(rows)

        # Write to Excel using openpyxl with formatted column widths
        try:
            writer = pd.ExcelWriter(excel_filename, engine="openpyxl")
        except PermissionError:
            # If user has the file open in Excel, save to a fallback timestamped file
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            excel_filename = EXCEL_OUTPUTS_DIR / f"{doc_id}_questions_{timestamp}.xlsx"
            logger.warning(f"Primary Excel file is locked/open in another program. Saving to backup file: '{excel_filename.name}'")
            writer = pd.ExcelWriter(excel_filename, engine="openpyxl")

        with writer:
            df.to_excel(writer, sheet_name="Questions", index=False)
            worksheet = writer.sheets["Questions"]

            # Format header & column width
            for col in worksheet.columns:
                col_name = str(col[0].value)
                max_len = max(len(col_name), 12)
                col_letter = col[0].column_letter
                worksheet.column_dimensions[col_letter].width = min(max_len + 4, 60)

        print(f"\n========================================================")
        print(f"[OK] EXPORTED {len(rows)} QUESTIONS TO EXCEL:")
        print(f" -> {excel_filename.resolve()}")
        print(f"========================================================\n")

    def run_all(self):
        doc_dirs = [d for d in MARKDOWN_OUTPUTS_DIR.iterdir() if d.is_dir()]
        if not doc_dirs:
            print(f"[!] No document output directories found in '{MARKDOWN_OUTPUTS_DIR}'.")
            return

        for doc_dir in doc_dirs:
            self.process_document(doc_dir)


if __name__ == "__main__":
    pipeline = RelationalQuestionParserPipeline()
    pipeline.run_all()
