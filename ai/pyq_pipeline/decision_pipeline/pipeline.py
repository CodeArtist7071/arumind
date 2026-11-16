from __future__ import annotations

import base64
import hashlib
import json
import logging
import mimetypes
import os
import re
import time
from collections import Counter
from pathlib import Path
from typing import Any

import httpx
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from pyq_pipeline.parser import discover, file_hash, parse_markdown, read_markdown

log = logging.getLogger(__name__)
API_URL = "https://openrouter.ai/api/v1/chat/completions"
PARSER_VERSION = "rule-based-2026-10-30-10"
HEADERS = [
    "document_name", "subject_name", "chapter_name", "question_number", "question_text", "option_a", "option_b",
    "option_c", "option_d", "option_e", "correct_answer", "answer_key_chunk", "answer_key_source_chunk", "answer_key_section", "answer_match_type", "table_context",
    "chart_references", "chart_data_extracted", "explanation", "source_page", "extraction_status",
    "validation_status", "review_notes", "source_file", "source_chunk",
]
TABLE_HEADERS = ["document_name", "subject_name", "chapter_name", "source_file", "source_chunk", "table_number", "table_markdown", "nearby_questions"]
CHART_HEADERS = ["document_name", "subject_name", "chapter_name", "source_file", "source_chunk", "image_reference", "chart_type", "nearby_questions", "asset_status", "extraction_note"]
GENERIC_HEADINGS = re.compile(r"^(?:contents?|index|preface|introduction|previous year questions?|practice questions?|examination[- ]wise questions?|chapterwise questions?|variety questions?|questions?|answer key|answers?|solutions?|explanations?|eduquity[- ]based pattern.*questions?)\b", re.I)
SUBJECT_PATTERNS = [
    (re.compile(r"\bdata\s+interpretation\b", re.I), "Data Interpretation"),
    (re.compile(r"\b(?:general\s+knowledge|static\s*g\.?k\.?)\b", re.I), "General Knowledge"),
    (re.compile(r"\b(?:general\s+science|science)\b", re.I), "General Science"),
    (re.compile(r"\b(?:general\s+studies|\bGS\b)", re.I), "General Studies"),
    (re.compile(r"\bcomputer(?:s)?\b", re.I), "Computer"),
    (re.compile(r"\benglish\b", re.I), "English"),
    (re.compile(r"\b(?:maths?|mathematics|quantitative aptitude)\b", re.I), "Mathematics"),
    (re.compile(r"\breasoning\b", re.I), "Reasoning"),
    (re.compile(r"\bhistory\b", re.I), "History"),
    (re.compile(r"\bgeography\b", re.I), "Geography"),
    (re.compile(r"\bpolity\b", re.I), "Polity"),
    (re.compile(r"\b(?:economics?|economy)\b", re.I), "Economics"),
]
PAPER_HEADING_PREFIX_RE = re.compile(r"^(?:SSC|RRB|NTPC|RPF|UPSC|UPPSC|BPSC|MPPSC|CGL|CHSL|Stenographer|Constable|Technician)\b", re.I)
PAPER_HEADING_CUE_RE = re.compile(r"\b(?:CGL|CHSL|NTPC|CBT|Tier|Shift|Morning|Evening|Selection Post|Stenographer|ALP|Constable|Technician|Mains|Prelims?)\b|\b(?:19|20)\d{2}\b|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}", re.I)
QUESTION_PROMPT = """Extract the single multiple-choice question from the QUESTION SOURCE BLOCK.
CONTEXT is only for understanding a passage or continuation; never extract another question from it.
Use only information present in the source block or an attached chart image. Do not answer the question or infer a correct answer.
Return one JSON object only, with these keys: is_question (boolean), question_number (string),
question_text (string), options (object with keys a,b,c,d and optional e string values), source_quote (string),
chart_data (string|null). Transcribe chart labels, values, series and units only when clearly readable;
otherwise use chart_data=null.
If this is not one complete four-option question, set is_question=false. Keep option labels and
their text paired exactly as shown. Do not include explanations or markdown fences."""


def _load_local_env(project_root: Path) -> None:
    """Read OpenRouter settings without printing their values."""
    if os.environ.get("OPENROUTER_API_KEY", "").strip():
        return
    env_files = [Path(__file__).resolve().parent / ".env", project_root.parent / ".env"]
    for env_file in env_files:
        if not env_file.is_file():
            continue
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            match = re.match(r"\s*(?:export\s+)?(OPENROUTER_API_KEY|OPENROUTER_MODEL)\s*=\s*(.*?)\s*$", line)
            if not match:
                continue
            name, value = match.group(1), match.group(2).strip().strip("\"'")
            if value and not os.environ.get(name, "").strip():
                os.environ[name] = value


def _document_name(path: Path, input_dir: Path) -> tuple[str, str]:
    relative = path.resolve().relative_to(input_dir.resolve())
    folder = relative.parts[0] if len(relative.parts) > 1 else path.parent.name
    display = folder.split("__", 1)[-1] if "__" in folder else folder
    display = re.sub(r"\s+", " ", display).strip(" .") or "markdown_document"
    folder_key = hashlib.sha256(folder.encode("utf-8")).hexdigest()[:16]
    return display, folder_key


def _safe_filename(display_name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", display_name).strip("._-")[:120] or "markdown_document"


def _normalize_source(value: str) -> str:
    value = re.sub(r"[*_`~]", "", value or "").casefold()
    return re.sub(r"[^\w]+", " ", value, flags=re.UNICODE).strip()


def _nearest_table(text: str, offset: int, source_quote: str) -> str:
    blocks = _table_blocks(text)
    previous = [body for pos, body in blocks if pos <= offset and offset - pos <= 10000]
    inside = "\n".join(line for line in source_quote.splitlines() if "|" in line and line.count("|") >= 2)
    table = previous[-1] if previous else ""
    if inside and inside not in table:
        table = (table + "\n\n" + inside).strip()
    return table[-8000:]


def _image_references(text: str) -> list[str]:
    matches = re.findall(r"!\[[^\]]*\]\(([^)]+)\)|<img\b[^>]*\bsrc=[\"']([^\"']+)", text, re.I)
    refs = []
    for markdown_ref, html_ref in matches:
        ref = (markdown_ref or html_ref).strip().strip("<>")
        if ref and not re.match(r"^(?:https?:|data:)", ref, re.I) and ref not in refs:
            refs.append(ref)
    return refs


def _subject_name(document_name: str, raw_subject: str | None) -> str:
    if raw_subject and raw_subject.strip():
        return raw_subject.strip()
    for pattern, label in SUBJECT_PATTERNS:
        if pattern.search(document_name):
            return label
    return ""


def _normalize_options(items: list[dict[str, Any]]) -> tuple[dict[str, str], dict[str, str]]:
    raw = {str(item.get("label", "")).strip().casefold(): str(item.get("text", "")).strip() for item in items}
    if all(label in {"a", "b", "c", "d", "e"} for label in raw):
        return raw, {label: label for label in raw}
    positional_labels = {str(number): chr(ord("a") + number - 1) for number in range(1, 6)}
    roman_labels = {label: chr(ord("a") + index) for index, label in enumerate(("i", "ii", "iii", "iv", "v"))}
    mapping = positional_labels if raw and all(label in positional_labels for label in raw) else roman_labels
    if raw and all(label in mapping for label in raw):
        return {mapping[label]: value for label, value in raw.items()}, mapping
    return {label: value for label, value in raw.items() if label in "abcde"}, {label: label for label in raw if label in "abcde"}


def _chapter_name(raw_chapter: str | None, heading: str | None) -> str:
    value = (raw_chapter or heading or "").strip().strip("#*_ `")
    value = re.sub(r"^chapter\s*\d+\s*[:.\-]?\s*", "", value, flags=re.I).strip()
    ignored = GENERIC_HEADINGS.match(value) or re.match(r"^(?:Q(?:uestion)?\.?\s*\d+|Sol(?:ution)?\.?\s*\d+)\b", value, re.I)
    is_exam_heading = PAPER_HEADING_PREFIX_RE.search(value) and PAPER_HEADING_CUE_RE.search(value)
    return "" if not value or ignored or is_exam_heading else value


def _table_blocks(text: str) -> list[tuple[int, str]]:
    html_blocks = [(match.start(), match.end(), match.group(0))
                   for match in re.finditer(r"<table\b[^>]*>.*?</table\s*>", text, re.I | re.S)]
    blocks: list[tuple[int, str]] = [(start, body.strip()) for start, _end, body in html_blocks]
    offset = 0
    start: int | None = None
    lines: list[str] = []
    for raw in text.splitlines(keepends=True):
        line = raw.rstrip("\r\n")
        if "|" in line and line.count("|") >= 2:
            if any(start <= offset < end for start, end, _body in html_blocks):
                offset += len(raw)
                continue
            start = offset if start is None else start
            lines.append(line)
        else:
            if lines:
                body = "\n".join(lines).strip()
                if any(not re.fullmatch(r"\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*", row) for row in lines):
                    blocks.append((start or 0, body))
            start, lines = None, []
        offset += len(raw)
    if lines:
        blocks.append((start or 0, "\n".join(lines).strip()))
    return sorted(blocks, key=lambda item: item[0])


def _image_records(text: str) -> list[tuple[int, str, str, str]]:
    pattern = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<md>[^)]+)\)|<img\b[^>]*\bsrc=[\"'](?P<html>[^\"']+)[\"'][^>]*>", re.I)
    results = []
    for match in pattern.finditer(text):
        ref = (match.group("md") or match.group("html") or "").strip().strip("<>")
        if not ref or re.match(r"^(?:https?:|data:)", ref, re.I):
            continue
        surrounding = text[max(0, match.start() - 350):min(len(text), match.end() + 350)]
        description = f"{match.group('alt') or ''} {Path(ref).name} {surrounding}".casefold()
        chart_type = "pie" if re.search(r"\bpie\s*(?:chart|graph|diagram)?\b", description) else (
            "bar" if re.search(r"\bbar\s*(?:chart|graph|diagram)?\b", description) else "unknown")
        results.append((match.start(), ref, chart_type, surrounding.strip()))
    return results


def _heading_near(text: str, offset: int) -> str | None:
    cursor = 0
    heading = None
    for raw in text.splitlines(keepends=True):
        if cursor > offset:
            break
        match = re.match(r"^\s*#{1,6}\s+(.+?)\s*#*\s*$", raw.rstrip("\r\n"))
        if match:
            candidate = match.group(1).strip()
            if not re.match(r"^(?:Q(?:uestion)?\.?\s*\d+|Sol(?:ution)?\.?\s*\d+)\b", candidate, re.I):
                heading = candidate
        else:
            plain = raw.strip()
            if (plain and plain.upper() == plain and "|" not in plain
                    and re.fullmatch(r"[A-Z][A-Z0-9 &,'()/:-]{2,79}", plain)
                    and plain not in {"NOT TO SCALE", "CONTINUED", "ANSWER KEY"}):
                heading = plain.title()
        cursor += len(raw)
    return heading


def _atomic_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.{time.time_ns()}.partial")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False, indent=2))
            handle.flush()
            os.fsync(handle.fileno())
        for attempt in range(5):
            try:
                temporary.replace(path)
                return
            except PermissionError:
                if attempt == 4:
                    raise
                time.sleep(0.25 * (2 ** attempt))
    except PermissionError as exc:
        raise PermissionError(
            f"Could not replace pipeline memory file {path}. Close it if open, stop duplicate pipeline runs, "
            "and retry; the temporary checkpoint was kept for recovery."
        ) from exc


def _new_workbook(path: Path, document_name: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    wb = Workbook()
    ws = wb.active
    ws.title = "Questions"
    ws.append(HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="38761D")
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    widths = {"A": 40, "B": 24, "C": 32, "D": 16, "E": 60, "K": 16,
              "L": 24, "M": 50, "N": 48, "O": 50, "P": 50, "Q": 12,
              "R": 20, "S": 18, "T": 60, "U": 55, "V": 24}
    for col in "FGHIJ":
        widths[col] = 36
    for col, width in widths.items():
        ws.column_dimensions[col].width = width
    _add_correct_answer_dropdown(ws)
    for sheet_name, headers in (("Tables", TABLE_HEADERS), ("Charts", CHART_HEADERS)):
        detail = wb.create_sheet(sheet_name)
        detail.append(headers)
        for cell in detail[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="38761D")
            cell.alignment = Alignment(wrap_text=True, vertical="top")
        detail.freeze_panes = "A2"
        detail.auto_filter.ref = detail.dimensions
        columns = "ABCDEFGH" if sheet_name == "Tables" else "ABCDEFGHIJ"
        for column in columns:
            detail.column_dimensions[column].width = 70 if column in "AG" else 42
    wb.properties.title = document_name
    wb.save(path)


def _model_request(model: str, source: str, api_key: str, image_paths: list[str] | None = None) -> dict[str, Any]:
    content: Any = source
    if image_paths:
        content = [{"type": "text", "text": source}]
        for raw_path in image_paths[:2]:
            image_path = Path(raw_path)
            if not image_path.is_file() or image_path.stat().st_size > 5_000_000:
                continue
            mime = mimetypes.guess_type(image_path.name)[0] or "image/jpeg"
            encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
            content.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{encoded}"}})
    payload = {
        "model": model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": QUESTION_PROMPT},
            {"role": "user", "content": content},
        ],
    }
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            response = httpx.post(
                API_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=90,
            )
            if response.status_code in {400, 404} and isinstance(content, list) and len(content) > 1:
                log.warning("Selected OpenRouter free route did not accept image input; retrying this question as text-only.")
                payload["messages"][1]["content"] = source
                response = httpx.post(
                    API_URL,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=90,
                )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            if isinstance(content, list):
                content = "".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
            text = str(content).strip()
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.I)
            parsed = json.loads(text)
            if not isinstance(parsed, dict):
                raise ValueError("Model response was not a JSON object")
            return parsed
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
            last_error = exc
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status is not None and status not in {408, 429, 500, 502, 503, 504}:
                break
            if attempt < 3:
                retry_after = getattr(getattr(exc, "response", None), "headers", {}).get("Retry-After")
                delay = min(float(retry_after), 30) if retry_after and retry_after.isdigit() else min(2 ** attempt, 12)
                time.sleep(delay)
    raise RuntimeError(f"OpenRouter extraction failed: {last_error}") from last_error


def _extract_candidates(files: list[Path], input_dir: Path, asset_dir: Path, state: dict[str, Any], document_name: str) -> None:
    old_hashes = state.setdefault("file_hashes", {})
    questions = state.setdefault("questions", {})
    tables = state.setdefault("tables", {})
    charts = state.setdefault("charts", {})
    answer_key_entries = []
    inherited_chapter = ""
    for file_index, path in enumerate(files, start=1):
        text, decode_warning = read_markdown(path)
        digest = file_hash(text)
        relative = str(path.resolve().relative_to(input_dir.resolve()))
        if old_hashes.get(relative) != digest:
            for question_id in [qid for qid, q in questions.items() if q.get("source_file") == relative]:
                del questions[question_id]
            for collection in (tables, charts):
                for asset_id in [asset_id for asset_id, asset in collection.items() if asset.get("source_file") == relative]:
                    del collection[asset_id]
            old_hashes[relative] = digest
        records, keys = parse_markdown(path, text, decode_warning)
        if file_index % 25 == 0:
            log.info("Scanned %d/%d Markdown chunks", file_index, len(files))
        for key in keys:
            answer_key_entries.append({
                "question_number": str(key.get("question_number", "")),
                "answer": str(key.get("answer", "")).strip().upper(),
                "source_file": relative,
                "source_chunk": path.parent.name,
                "source_offset": int(key.get("source_offset", 0)),
                "section": key.get("section"),
                "match_type": key.get("match_type", "answer_key_box"),
                "answer_key_block": key.get("answer_key_block"),
            })
        for record in records:
            record_number = str(record.get("source", {}).get("original_question_number", ""))
            record_offset = int(record.get("source", {}).get("start_offset", 0))
            for raw_answer in record.get("correct_answers", []):
                answer_match = re.search(r"(?:option\s*)?\(?\s*([A-E1-5])\s*\)?", str(raw_answer), re.I)
                if answer_match:
                    answer_key_entries.append({
                        "question_number": record_number, "answer": answer_match.group(1).upper(),
                        "source_file": relative, "source_chunk": path.parent.name,
                        "source_offset": record_offset, "section": "Question-local answer",
                        "match_type": "question_local", "answer_key_block": None,
                    })
            opts, option_label_map = _normalize_options(record.get("options", []))
            has_visual_only_content = bool(record.get("source", {}).get("unresolved_image_reference"))
            if not record.get("question_text", "").strip() and not has_visual_only_content:
                continue
            number = str(record.get("source", {}).get("original_question_number", ""))
            source_offset = record.get("source", {}).get("start_offset", 0)
            qid = hashlib.sha256(f"{digest}:{source_offset}:{number}".encode()).hexdigest()[:24]
            context = text[max(0, int(source_offset) - 1400):int(source_offset)].strip()
            table_context = _nearest_table(text, int(source_offset), record.get("source", {}).get("source_quote", ""))
            raw_subject = record.get("subject", {}).get("raw_name")
            raw_chapter = record.get("chapter", {}).get("raw_name")
            subject_name = _subject_name(document_name, raw_subject)
            chapter_candidate = _chapter_name(raw_chapter, record.get("source", {}).get("heading"))
            if chapter_candidate:
                inherited_chapter = chapter_candidate
            chapter_name = chapter_candidate or inherited_chapter
            visual_window = text[max(0, int(source_offset) - 8000):int(source_offset)] + record.get("source", {}).get("source_quote", "")
            refs = _image_references(visual_window)[-2:]
            relative_parent = Path(relative).parent
            image_paths = []
            for ref in refs:
                possible = (asset_dir / relative_parent / ref).resolve()
                try:
                    possible.relative_to(asset_dir.resolve())
                except ValueError:
                    continue
                if possible.is_file():
                    image_paths.append(str(possible))
            # source_quote is the parsed source span; context is retained in JSON for audit/retry.
            questions.setdefault(qid, {
                "question_id": qid,
                "question_number": number,
                "subject_name": subject_name,
                "chapter_name": chapter_name,
                "source_offset": int(source_offset),
                "question_text": record["question_text"].strip(),
                "source_question_text": record["question_text"].strip(),
                "options": {label: value for label, value in opts.items() if label in "abcde" and value},
                "source_option_label_map": option_label_map,
                "source_options": {label: value for label, value in opts.items() if label in "abcde" and value},
                "source_quote": record.get("source", {}).get("source_quote", ""),
                "context_before": context,
                "table_context": table_context,
                "chart_references": refs,
                "image_paths": image_paths,
                "chart_data": None,
                "explanation": record.get("explanation") or "",
                "source_page": record.get("source", {}).get("page"),
                "format_warnings": list(record.get("review_reasons", [])),
                "source_file": relative,
                "source_chunk": path.parent.name,
                "llm_status": "pending",
                "llm_error": None,
            })
            # Upgrade JSON memory created by earlier versions of this pipeline.
            questions[qid].setdefault("table_context", table_context)
            questions[qid]["subject_name"] = subject_name
            questions[qid]["chapter_name"] = chapter_name
            questions[qid]["source_question_text"] = record["question_text"].strip()
            questions[qid]["source_options"] = {label: value for label, value in opts.items() if label in "abcde" and value}
            questions[qid]["source_option_label_map"] = option_label_map
            questions[qid]["explanation"] = record.get("explanation") or ""
            questions[qid]["source_page"] = record.get("source", {}).get("page")
            questions[qid]["format_warnings"] = list(record.get("review_reasons", []))
            questions[qid].setdefault("chart_references", refs)
            questions[qid].setdefault("image_paths", image_paths)
            questions[qid].setdefault("chart_data", None)
            questions[qid]["source_offset"] = int(source_offset)
            if questions[qid].get("llm_status") != "extracted":
                questions[qid]["options"] = {label: value for label, value in opts.items() if label in "abcde" and value}
            if questions[qid].get("llm_status") == "rejected_review" and (table_context or image_paths):
                questions[qid]["llm_status"] = "pending"
                questions[qid]["llm_error"] = None

        question_offsets = [(int(q.get("source_offset", 0)), str(q.get("question_number", "")), q)
                            for q in questions.values() if q.get("source_file") == relative]
        for table_index, (table_offset, table_markdown) in enumerate(_table_blocks(text), start=1):
            asset_id = hashlib.sha256(f"{digest}:table:{table_offset}".encode()).hexdigest()[:24]
            nearby = [number for question_offset, number, _q in question_offsets
                      if abs(question_offset - table_offset) <= 12000]
            tables[asset_id] = {
                "asset_id": asset_id, "document_name": document_name,
                "subject_name": _subject_name(document_name, None),
                "chapter_name": _chapter_name(None, _heading_near(text, table_offset)),
                "source_file": relative, "source_chunk": path.parent.name,
                "table_number": table_index, "table_markdown": table_markdown,
                "nearby_questions": ", ".join(dict.fromkeys(nearby)),
            }
        for image_offset, ref, chart_type, _description in _image_records(text):
            asset_id = hashlib.sha256(f"{digest}:image:{image_offset}:{ref}".encode()).hexdigest()[:24]
            relative_parent = Path(relative).parent
            possible = (asset_dir / relative_parent / ref).resolve()
            try:
                possible.relative_to(asset_dir.resolve())
                asset_found = possible.is_file()
            except ValueError:
                asset_found = False
            charts[asset_id] = {
                "asset_id": asset_id, "document_name": document_name,
                "subject_name": _subject_name(document_name, None),
                "chapter_name": _chapter_name(None, _heading_near(text, image_offset)),
                "source_file": relative, "source_chunk": path.parent.name,
                "image_reference": ref, "chart_type": chart_type,
                "nearby_questions": ", ".join(dict.fromkeys(
                    number for question_offset, number, _q in question_offsets
                    if abs(question_offset - image_offset) <= 12000
                )),
                "asset_status": "image file found" if asset_found else "image file missing",
                "extraction_note": "Chart values are not read from images in no-LLM mode; review the source image manually.",
            }
    unique_keys = {}
    for key in answer_key_entries:
        signature = (key["question_number"], key["answer"], key["source_file"], key["source_offset"], key.get("answer_key_block"))
        unique_keys[signature] = key
    state["answer_key_entries"] = list(unique_keys.values())


def _chunk_start(value: str) -> int | None:
    match = re.search(r"(\d{1,6})-(\d{1,6})$", str(value))
    return int(match.group(1)) if match else None


def _answers_by_question(state: dict[str, Any]) -> dict[str, dict[str, Any]]:
    questions = list(state.get("questions", {}).values())
    questions_by_number: dict[str, list[dict[str, Any]]] = {}
    for question in questions:
        questions_by_number.setdefault(str(question.get("question_number", "")), []).append(question)
    assigned: dict[str, dict[str, Any]] = {}
    keys = sorted(state.get("answer_key_entries", []), key=lambda item: (
        0 if item.get("match_type") == "answer_key_box" else 1,
        str(item.get("source_file", "")), int(item.get("source_offset", 0)),
    ))
    explicit_box_targets: set[str] = set()
    for key in keys:
        number = str(key.get("question_number", ""))
        candidates = questions_by_number.get(number, [])
        key_file = str(key.get("source_file", ""))
        key_offset = int(key.get("source_offset", 0))
        match_type = str(key.get("match_type", "answer_key_box"))
        same_file = [q for q in candidates if str(q.get("source_file", "")) == key_file
                     and int(q.get("source_offset", 0)) <= key_offset]
        target = None
        method = ""
        if same_file:
            closest_offset = max(int(q.get("source_offset", 0)) for q in same_file)
            closest = [q for q in same_file if int(q.get("source_offset", 0)) == closest_offset]
            if len(closest) == 1:
                target = closest[0]
                method = "same_markdown_file"
        else:
            # Chunk files overlap and often restart numbering for a new paper.
            # A nearby chunk alone is not enough evidence to identify the key's question.
            continue
        if target is None:
            continue
        qid = target["question_id"]
        if match_type != "answer_key_box" and qid in explicit_box_targets:
            continue
        if match_type == "answer_key_box":
            explicit_box_targets.add(qid)
            # An explicit key box supersedes a lower-confidence solution label.
            old = assigned.get(qid)
            if old and old.get("methods", set()) <= {"inline_solution", "question_local"}:
                assigned.pop(qid, None)
        entry = assigned.setdefault(qid, {"answers": set(), "chunks": set(), "sections": set(), "methods": set()})
        answer = str(key.get("answer", "")).strip().upper()
        if answer.isdigit():
            try:
                position = int(answer) - 1
                if 0 <= position < len(target.get("options", {})):
                    answer = chr(ord("A") + position)
            except ValueError:
                pass
        else:
            label_map = target.get("source_option_label_map", {})
            answer = str(label_map.get(answer.casefold(), answer)).upper()
        entry["answers"].add(answer)
        entry["chunks"].add(str(key.get("source_chunk", "")))
        if key.get("section"):
            entry["sections"].add(str(key["section"]))
        entry["methods"].add("explicit_answer_key_block" if match_type == "answer_key_box" else method)
    return assigned


def _rows(state: dict[str, Any], document_name: str) -> list[list[Any]]:
    answer_keys = _answers_by_question(state)
    rows = []
    for q in sorted(state.get("questions", {}).values(), key=lambda x: (x.get("source_file", "").casefold(), int(x.get("question_number", 0) or 0), x.get("question_id", ""))):
        matched = answer_keys.get(q.get("question_id"), {"answers": set(), "chunks": set(), "sections": set(), "methods": set()})
        answers = matched["answers"]
        correct_answer_label = next(iter(answers)) if len(answers) == 1 else ""
        options = q.get("options", {})
        correct_answer_text = str(options.get(correct_answer_label.casefold(), "")).strip() if correct_answer_label else ""
        displayed_correct_answer = correct_answer_text or "select answers"
        notes = list(q.get("format_warnings", []))
        has_four_options = all(str(options.get(label, "")).strip() for label in "abcd")
        if not str(q.get("question_text", "")).strip():
            notes.append("Question text was not available in the Markdown; inspect the image/source block.")
        if not has_four_options:
            notes.append("Fewer than four labeled options were parsed; missing choices were left blank.")
        if len(answers) > 1:
            notes.append("Multiple answer-key entries disagree for this question number.")
        elif not correct_answer_label:
            notes.append("No unambiguous answer-key entry was matched.")
        elif not correct_answer_text:
            notes.append("Matched answer label has no corresponding parsed option.")
        if not q.get("subject_name"):
            notes.append("Subject was not explicit or confidently inferred.")
        if not q.get("chapter_name"):
            notes.append("Chapter heading was not confidently identified.")
        validation_status = (
            "conflict" if len(answers) > 1 else
            "incomplete" if not str(q.get("question_text", "")).strip() or not has_four_options else
            "needs_review" if notes else "verified"
        )
        rows.append([
            document_name, q.get("subject_name", ""), q.get("chapter_name", ""),
            q.get("question_number"), q.get("question_text"),
            options.get("a", ""), options.get("b", ""), options.get("c", ""), options.get("d", ""), options.get("e", ""),
            displayed_correct_answer, correct_answer_label.casefold(), ", ".join(sorted(matched["chunks"])),
            ", ".join(sorted(matched.get("sections", set()))),
            ", ".join(sorted(matched.get("methods", set()))), q.get("table_context", ""), "; ".join(
                f"{ref} ({'image found' if any(Path(p).name.casefold() == Path(ref).name.casefold() for p in q.get('image_paths', [])) else 'asset missing'})"
                for ref in q.get("chart_references", [])
            ),
            q.get("chart_data") or "", q.get("explanation", ""), q.get("source_page", ""),
            q.get("llm_status", "pending"), validation_status, "; ".join(dict.fromkeys(notes)),
            q.get("source_file"), q.get("source_chunk"),
        ])
    return rows


def _write_records_sheet(wb, sheet_name: str, headers: list[str], records: list[dict[str, Any]]) -> None:
    ws = wb[sheet_name] if sheet_name in wb.sheetnames else wb.create_sheet(sheet_name)
    ws.delete_rows(1, ws.max_row)
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="38761D")
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    for record in records:
        ws.append([record.get(header, "") for header in headers])
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions


def _add_correct_answer_dropdown(ws) -> None:
    """Let reviewers select the default label or one of this row's options."""
    headers = [str(cell.value or "") for cell in ws[1]]
    answer_index = headers.index("correct_answer") + 1
    answer_label_index = headers.index("answer_key_chunk") + 1
    option_indices = [headers.index(f"option_{label}") + 1 for label in "abcde"]
    answer_column = get_column_letter(answer_index)
    old_helper_columns = [
        column
        for column in range(1, ws.max_column + 1)
        if str(ws.cell(row=1, column=column).value or "").startswith("_answer_dropdown_")
    ]
    for column in reversed(old_helper_columns):
        ws.delete_cols(column)
    # Keep a per-question list on the same sheet because Excel data validation
    # cannot reliably use a direct cross-sheet range. Hide the helper columns
    # so the question table remains unchanged for reviewers.
    helper_start = ws.max_column + 1
    helper_columns = list(range(helper_start, helper_start + 6))
    ws.cell(row=1, column=helper_start, value="_answer_dropdown_default")
    for offset, label in enumerate("abcde", start=1):
        ws.cell(row=1, column=helper_start + offset, value=f"_answer_dropdown_{label}")
    for column in helper_columns:
        ws.column_dimensions[get_column_letter(column)].hidden = True
    # The workbook is regenerated from pipeline data, so replace any prior
    # validation instead of stacking a duplicate on each incremental save.
    ws.data_validations.dataValidation = []
    last_validation_row = max(ws.max_row, 2)
    for row_index in range(2, last_validation_row + 1):
        answer_cell = f"{answer_column}{row_index}"
        option_cells = [f"{get_column_letter(column)}{row_index}" for column in option_indices]
        ws.cell(row=row_index, column=helper_start, value="select answers")
        for offset, option_column in enumerate(option_indices, start=1):
            ws.cell(
                row=row_index,
                column=helper_start + offset,
                value=f"={get_column_letter(option_column)}{row_index}",
            )
        label_cell = ws.cell(row=row_index, column=answer_label_index)
        label_cell.value = (
            f'=IF({answer_cell}="select answers","",'
            f'IF({answer_cell}={option_cells[0]},"a",'
            f'IF({answer_cell}={option_cells[1]},"b",'
            f'IF({answer_cell}={option_cells[2]},"c",'
            f'IF({answer_cell}={option_cells[3]},"d",'
            f'IF({answer_cell}={option_cells[4]},"e",""))))))'
        )
    validation = DataValidation(
        type="list",
        formula1=(
            f"=${get_column_letter(helper_start)}2:"
            f"${get_column_letter(helper_start + 5)}2"
        ),
        allow_blank=True,
    )
    validation.showDropDown = False
    validation.showInputMessage = True
    validation.promptTitle = "Choose the correct answer"
    validation.prompt = "Select one of this question's option texts."
    ws.add_data_validation(validation)
    # Cover every populated question row without extending into unused rows.
    validation.add(f"{answer_column}2:{answer_column}{last_validation_row}")


def _publish(path: Path, state: dict[str, Any], document_name: str) -> Path:
    from openpyxl import load_workbook

    wb = load_workbook(path)
    ws = wb["Questions"]
    existing_headers = [str(cell.value or "") for cell in ws[1]] if ws.max_row else []
    if existing_headers != HEADERS:
        if ws.max_row:
            ws.delete_rows(1, ws.max_row)
        ws.append(HEADERS)
        for cell in ws[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="38761D")
            cell.alignment = Alignment(wrap_text=True, vertical="top")
    if ws.max_row > 1:
        ws.delete_rows(2, ws.max_row - 1)
    for row in _rows(state, document_name):
        safe_row = [("'" + value if isinstance(value, str) and value.startswith(("=", "+", "-", "@")) else value) for value in row]
        ws.append(safe_row)
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")
    _add_correct_answer_dropdown(ws)
    ws.auto_filter.ref = ws.dimensions
    _write_records_sheet(wb, "Tables", TABLE_HEADERS, list(state.get("tables", {}).values()))
    _write_records_sheet(wb, "Charts", CHART_HEADERS, list(state.get("charts", {}).values()))
    temp = path.with_name(path.stem + ".partial.xlsx")
    wb.save(temp)
    try:
        temp.replace(path)
        return path
    except PermissionError:
        fallback = path.with_name(f"{path.stem}.updated{path.suffix}")
        temp.replace(fallback)
        log.warning("Workbook is open or locked; saved this update to %s", fallback)
        return fallback


def run_pipeline(
    input_dir: Path,
    output_dir: Path,
    model: str | None = None,
    asset_dir: Path | None = None,
    document_filter: str | None = None,
    max_questions: int | None = None,
    dry_run: bool = False,
    no_llm: bool = False,
    request_interval: float = 2.0,
) -> dict[str, Any]:
    input_dir, output_dir = Path(input_dir), Path(output_dir)
    if request_interval < 0:
        raise ValueError("request_interval must be zero or greater")
    if not input_dir.is_dir():
        raise FileNotFoundError(f"Markdown input folder not found: {input_dir}")
    files = discover(input_dir)
    grouped: dict[str, list[Path]] = {}
    names: dict[str, str] = {}
    for path in files:
        name, document_key = _document_name(path, input_dir)
        if document_filter and document_filter.casefold() not in (name + " " + document_key).casefold():
            continue
        grouped.setdefault(document_key, []).append(path)
        names[document_key] = name
    if not grouped:
        return {"documents": 0, "markdown_files": 0, "questions_detected": 0, "extracted": 0, "failed": 0}

    project_root = Path(__file__).resolve().parents[1]
    asset_dir = Path(asset_dir or project_root.parent / "question_pipeline" / "data" / "extractions").resolve()
    log.info("Discovered %d PDF Markdown folders containing %d Markdown files.", len(grouped), sum(map(len, grouped.values())))
    for key, document_files in grouped.items():
        log.info("PDF folder: %s | Markdown files: %d", names[key], len(document_files))
    _load_local_env(project_root)
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    selected_model = model or os.environ.get("OPENROUTER_MODEL", "openrouter/free")
    log.info("Using configured OpenRouter model: %s", selected_model)
    if not dry_run and not no_llm and not api_key:
        raise RuntimeError("Set OPENROUTER_API_KEY in the environment or project .env before running the LLM extraction.")

    summary = {"documents": len(grouped), "markdown_files": sum(map(len, grouped.values())),
               "questions_detected": 0, "extracted": 0, "deterministic": 0,
               "needs_review": 0, "incomplete": 0, "conflicts": 0, "failed": 0, "workbooks": []}
    remaining = max_questions
    used_workbook_names: set[str] = set()
    for document_key, document_files in grouped.items():
        document_name = names[document_key]
        filename = _safe_filename(document_name)
        if filename.casefold() in used_workbook_names:
            filename = f"{filename}_{document_key[:8]}"
        used_workbook_names.add(filename.casefold())
        state_path = output_dir / "memory" / f"{document_key}.json"
        workbook_path = output_dir / "workbooks" / f"{filename}.xlsx"
        if state_path.is_file():
            try:
                state = json.loads(state_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                raise RuntimeError(f"Cannot read saved memory file {state_path}: {exc}") from exc
        else:
            state = {"version": 1, "parser_version": PARSER_VERSION, "document_name": document_name,
                     "file_hashes": {}, "answer_keys": {}, "questions": {}}
        if state.get("parser_version") != PARSER_VERSION:
            # Reparse unchanged Markdown with the improved rules, retaining completed LLM work by stable question ID.
            state["questions"] = {
                question_id: question for question_id, question in state.get("questions", {}).items()
                if question.get("llm_status") == "extracted"
            }
            state["tables"] = {}
            state["charts"] = {}
            state["answer_key_entries"] = []
            state["file_hashes"] = {}
            state["parser_version"] = PARSER_VERSION
        state["document_name"] = document_name
        _extract_candidates(document_files, input_dir, asset_dir, state, document_name)
        _atomic_json(state_path, state)
        candidates = list(state.get("questions", {}).values())
        summary["questions_detected"] += len(candidates)
        log.info("%s: found %d question candidates; matching answer keys by question number", document_name, len(candidates))
        if not candidates:
            if workbook_path.exists():
                _publish(workbook_path, state, document_name)
            log.info("%s: no four-option question structure found; no workbook created", document_name)
            continue
        if not workbook_path.exists():
            _new_workbook(workbook_path, document_name)
            log.info("Created empty workbook first: %s", workbook_path)
        calls = 0
        provider_failed = False
        workbook_active_path = workbook_path
        unsaved_results = 0
        for question_index, question in enumerate(candidates, start=1):
            if no_llm:
                question["question_text"] = question.get("source_question_text", question.get("question_text", ""))
                question["options"] = question.get("source_options", question.get("options", {}))
                question["llm_status"] = "deterministic_only"
                question["llm_error"] = None
                summary["deterministic"] += 1
                continue
            if not question.get("question_text", "").strip() or not all(
                str(question.get("options", {}).get(label, "")).strip() for label in "abcd"
            ):
                question["llm_status"] = "needs_review"
                question["llm_error"] = "Question text or four labeled options are incomplete in the Markdown; no LLM call was sent."
                continue
            if question.get("llm_status") == "extracted":
                summary["extracted"] += 1
                continue
            if dry_run or no_llm:
                question["llm_status"] = "dry_run"
                continue
            if remaining is not None and remaining <= 0:
                log.info("Question limit reached; remaining questions saved for resume.")
                break
            try:
                log.info("LLM request %d/%d | %s | %s | Q%s", question_index, len(candidates), document_name,
                         question.get("source_chunk"), question.get("question_number"))
                source = (
                    "CONTEXT (use only to understand this question; do not extract from it):\n"
                    + question.get("context_before", "")
                    + "\n\nRELATED MARKDOWN TABLE (if present):\n"
                    + question.get("table_context", "")
                    + "\n\nQUESTION SOURCE BLOCK (extract this one question only):\n"
                    + question["source_quote"]
                    + "\n\nCHART IMAGE REFERENCES: "
                    + (", ".join(question.get("chart_references", [])) or "none")
                )
                raw = _model_request(selected_model, source, api_key, question.get("image_paths", []))
                options = raw.get("options") if isinstance(raw.get("options"), dict) else {}
                model_number = str(raw.get("question_number", "")).strip()
                # Keep parser output as the source of truth if the model omits fields or changes labels.
                if raw.get("is_question") is False:
                    question["llm_status"] = "rejected_review"
                    question["llm_error"] = "Model judged the source block not to be a complete question."
                elif model_number and model_number != str(question["question_number"]):
                    question["llm_status"] = "needs_review"
                    question["llm_error"] = f"Model returned question number {model_number}; parser found {question['question_number']}."
                elif not all(str(options.get(label, "")).strip() for label in question.get("options", {})):
                    question["llm_status"] = "needs_review"
                    question["llm_error"] = "Model response did not contain all four option texts; deterministic source parsing retained."
                else:
                    source_normalized = _normalize_source(question["source_quote"])
                    expected_labels = list(question.get("options", {}))
                    model_fields = [str(raw.get("question_text") or "")] + [str(options[label]) for label in expected_labels]
                    model_quote = str(raw.get("source_quote") or "")
                    grounded = bool(model_quote and model_quote in question["source_quote"])
                    grounded = grounded and all(
                        _normalize_source(field) and _normalize_source(field) in source_normalized
                        for field in model_fields
                    )
                    if not grounded:
                        question["llm_status"] = "needs_review"
                        question["llm_error"] = "Model output could not be verified against the Markdown source; deterministic parsing retained."
                    else:
                        # The model result is used only when its fields are grounded in Markdown.
                        question["question_text"] = str(raw.get("question_text") or question["question_text"]).strip()
                        question["options"] = {label: str(options[label]).strip() for label in expected_labels}
                        chart_data = raw.get("chart_data")
                        question["chart_data"] = str(chart_data).strip() if chart_data else None
                        question["llm_status"] = "extracted"
                        question["llm_error"] = None
                        summary["extracted"] += 1
                calls += 1
                if remaining is not None:
                    remaining -= 1
            except Exception as exc:  # The failed item remains pending for a later resume.
                question["llm_status"] = "pending"
                question["llm_error"] = str(exc)
                summary["failed"] += 1
                provider_failed = True
                log.exception("LLM extraction failed for %s Q%s in %s", document_name, question.get("question_number"), question.get("source_file"))
            _atomic_json(state_path, state)
            unsaved_results += 1
            # Save every ten replies; JSON memory is checkpointed after every reply.
            if unsaved_results >= 10 or provider_failed:
                workbook_active_path = _publish(workbook_active_path, state, document_name)
                unsaved_results = 0
            log.info("%s | Q%s | %s", document_name, question.get("question_number"), question.get("llm_status"))
            if provider_failed:
                log.error("Stopping after the first OpenRouter failure; pending questions remain in JSON memory for resume.")
                break
            if calls and request_interval:
                log.info("Rate pacing: waiting %.1f seconds before the next OpenRouter request.", request_interval)
                time.sleep(request_interval)
        if dry_run or no_llm or calls == 0 or unsaved_results:
            workbook_active_path = _publish(workbook_active_path, state, document_name)
        _atomic_json(state_path, state)
        validation_index = HEADERS.index("validation_status")
        validation_counts = Counter(row[validation_index] for row in _rows(state, document_name))
        summary["needs_review"] += validation_counts["needs_review"]
        summary["incomplete"] += validation_counts["incomplete"]
        summary["conflicts"] += validation_counts["conflict"]
        summary["workbooks"].append(str(workbook_active_path))
        if provider_failed:
            break
    return summary
