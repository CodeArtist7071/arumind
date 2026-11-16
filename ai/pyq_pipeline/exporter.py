from __future__ import annotations

import json
import logging
from collections import Counter
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from pyq_pipeline.validation import validate_record

logger = logging.getLogger(__name__)

HEADERS = ["record_id", "source_document", "exam", "exam_id", "year", "session", "paper", "shift", "set", "subject", "subject_id", "chapter", "chapter_id", "topic", "topic_id", "question_text", "option_a", "option_b", "option_c", "option_d", "options_json", "correct_answers", "question_type", "explanation", "language", "source_file", "source_hash", "source_page", "source_start_offset", "source_end_offset", "question_number", "mapping_status", "extraction_status", "answer_verification_status", "review_reasons", "schema_version", "mapping_version"]


def _cell(value, full_records, record_id, field, limit):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    elif not isinstance(value, str):
        return value
    if len(value) > limit:
        full_records.append({"record_id": record_id, "field": field, "value": value})
        value = value[:limit - 80] + f" … [full value in companion JSONL: {record_id}/{field}]"
    if value.startswith(("=", "+", "-", "@")):
        value = "'" + value
    return value


def _safe_cells(values):
    return [("'" + value if isinstance(value, str) and value.startswith(("=", "+", "-", "@")) else value) for value in values]


def _style(ws):
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="38761D")
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    for col in ws.columns:
        letter = get_column_letter(col[0].column)
        width = min(50, max(12, max((len(str(c.value or "")) for c in col[:100]), default=12) + 2))
        ws.column_dimensions[letter].width = width


def _nested_value(record, field):
    current = record
    for part in str(field).split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def _source_document_name(source_file, input_dir):
    if not source_file:
        return None
    path = Path(str(source_file))
    try:
        relative = path.resolve().relative_to(Path(input_dir).resolve())
    except ValueError:
        return path.stem
    if len(relative.parts) > 1:
        document_folder = relative.parts[0]
        return document_folder.split("__", 1)[1] if "__" in document_folder else document_folder
    return path.stem


def export_workbook(store, output_dir: Path, settings, template_path: Path | None = None):
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "pyq_question_bank.xlsx"
    full_path = output_dir / "long_cells.jsonl"
    template_path = template_path or settings.template
    if template_path:
        template_path = Path(template_path)
        if not template_path.is_file():
            raise FileNotFoundError(f"Excel template does not exist: {template_path}")
        wb = load_workbook(template_path)
        questions = wb["Questions"] if "Questions" in wb.sheetnames else wb.active
        questions.title = "Questions"
        headers = [str(c.value or "").strip() for c in questions[1]]
        if not headers or any(not h for h in headers):
            raise ValueError("Template first row must contain nonempty column headers")
        column_mapping = settings.column_mapping or {}
        missing = [header for header in headers if header not in column_mapping]
        if missing:
            raise ValueError("Explicit export.column_mapping is required for template headers: " + ", ".join(missing))
        questions.delete_rows(1, questions.max_row)
        questions.append(headers)
        for existing in list(wb.sheetnames):
            if existing != "Questions":
                del wb[existing]
    else:
        wb = Workbook(write_only=False)
        questions = wb.active
        questions.title = "Questions"
        questions.append(HEADERS)
        column_mapping = {}
        headers = HEADERS
    review = wb.create_sheet("Review Queue")
    review.append(["record_id", "source_document", "source_file", "question_text", "mapping_status", "answer_status", "review_reasons", "validation_issues"])
    audit = wb.create_sheet("Mapping Audit")
    audit.append(["record_id", "kind", "raw_value", "canonical_value", "id", "method", "status", "candidates", "mapping_version"])
    duplicates = wb.create_sheet("Duplicate Candidates")
    duplicates.append(["record_id", "candidate_record_id", "question_text", "source_file"])
    summaries = Counter()
    overflow = []
    for record in store.iter_records():
        summaries["total_questions"] += 1
        summaries[f"extraction:{record.get('extraction_status', 'unknown')}"] += 1
        summaries[f"mapping:{record.get('mapping_status', 'unresolved')}"] += 1
        summaries[f"answer:{record.get('answer_verification_status', 'not_verified')}"] += 1
        source = record.get("source", {})
        options = record.get("options") or []
        option_by_label = {str(o.get("label", "")).casefold(): o.get("text", "") for o in options}
        row = [record.get("record_id"), _source_document_name(source.get("file_path"), settings.input_dir), record.get("exam", {}).get("canonical_name") or record.get("exam", {}).get("raw_name"), record.get("exam", {}).get("exam_id"), record.get("exam", {}).get("year"), record.get("exam", {}).get("session"), record.get("exam", {}).get("paper"), record.get("exam", {}).get("shift"), record.get("exam", {}).get("set"), record.get("subject", {}).get("canonical_name") or record.get("subject", {}).get("raw_name"), record.get("subject", {}).get("subject_id"), record.get("chapter", {}).get("canonical_name") or record.get("chapter", {}).get("raw_name"), record.get("chapter", {}).get("chapter_id"), record.get("topic", {}).get("canonical_name") or record.get("topic", {}).get("raw_name"), record.get("topic", {}).get("topic_id"), record.get("question_text"), option_by_label.get("a", ""), option_by_label.get("b", ""), option_by_label.get("c", ""), option_by_label.get("d", ""), options, record.get("correct_answers"), record.get("question_type"), record.get("explanation"), record.get("language"), source.get("file_path"), source.get("file_hash"), source.get("page"), source.get("start_offset"), source.get("end_offset"), source.get("original_question_number"), record.get("mapping_status"), record.get("extraction_status"), record.get("answer_verification_status"), record.get("review_reasons"), record.get("schema_version"), record.get("mapping_version")]
        standard = dict(zip(HEADERS, row))
        if template_path:
            values = []
            for header in headers:
                field = column_mapping[header]
                value = standard.get(field) if field in standard else _nested_value(record, field)
                values.append(_cell(value, overflow, record["record_id"], header, settings.max_cell_chars))
            questions.append(values)
        else:
            questions.append([_cell(v, overflow, record["record_id"], HEADERS[i], settings.max_cell_chars) for i, v in enumerate(row)])
        issues = record.get("validation_issues") or validate_record(record, settings.max_cell_chars)
        if record.get("review_reasons") or issues or record.get("extraction_status") != "extracted":
            review.append(_safe_cells([record.get("record_id"), _source_document_name(source.get("file_path"), settings.input_dir), source.get("file_path"), _cell(record.get("question_text"), overflow, record["record_id"], "review_question_text", settings.max_cell_chars), record.get("mapping_status"), record.get("answer_verification_status"), json.dumps(record.get("review_reasons"), ensure_ascii=False), json.dumps(issues, ensure_ascii=False)]))
            summaries["review_queue"] += 1
        for entry in record.get("mapping_audit", []):
            audit.append(_safe_cells([record.get("record_id"), entry.get("kind"), entry.get("raw_name"), entry.get("canonical_name"), entry.get("id"), entry.get("method"), entry.get("status"), json.dumps(entry.get("candidates"), ensure_ascii=False), record.get("mapping_version")]))
        for candidate in record.get("duplicate_candidates", []):
            duplicates.append(_safe_cells([record.get("record_id"), candidate, _cell(record.get("question_text"), overflow, record["record_id"], "duplicate_question_text", settings.max_cell_chars), source.get("file_path")]))
            summaries["duplicate_candidates"] += 1
    for sheet in (questions, review, audit, duplicates):
        _style(sheet)
    summary = wb.create_sheet("Processing Summary")
    summary.append(["metric", "count"])
    for key, value in sorted(summaries.items()):
        summary.append([key, value])
    for row in store.summary().get("failed_files", []):
        summary.append([f"failed_file:{row['path']}", row.get("error")])
    _style(summary)
    temp = path.with_name(path.stem + ".partial.xlsx")
    wb.save(temp)
    try:
        temp.replace(path)
        exported_path = path
    except PermissionError:
        # Excel holds an exclusive lock on an open workbook on Windows. Keep the
        # completed export under a new name so processing can still finish.
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        exported_path = path.with_name(f"{path.stem}.updated_{timestamp}{path.suffix}")
        temp.replace(exported_path)
        logger.warning(
            "Could not replace %s because it is in use. Saved this export to %s; "
            "close the workbook and rerun the export to update the standard file.",
            path,
            exported_path,
        )
    with full_path.open("w", encoding="utf-8") as stream:
        for row in overflow:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    return exported_path
