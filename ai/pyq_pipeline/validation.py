from __future__ import annotations

import re

EXCEL_LIMIT = 32767


def validate_record(record: dict, max_cell_chars: int = EXCEL_LIMIT) -> list[dict]:
    issues = []
    def add(code, severity, message):
        issues.append({"code": code, "severity": severity, "message": message})
    if not str(record.get("question_text", "")).strip():
        add("missing_question_text", "error", "Question text is empty.")
    if not record.get("record_id") or not isinstance(record.get("record_id"), str):
        add("missing_record_id", "error", "Stable record_id is required.")
    if record.get("extraction_status") not in {"extracted", "needs_review", "failed"}:
        add("invalid_extraction_status", "error", "extraction_status is not in the supported status set.")
    if record.get("mapping_status") not in {"mapped", "unresolved", "ambiguous", "not_applicable"}:
        add("invalid_mapping_status", "error", "mapping_status is not in the supported status set.")
    if record.get("answer_verification_status") not in {"not_verified", "source_answer", "answer_key_matched", "conflict"}:
        add("invalid_answer_status", "error", "answer_verification_status is not in the supported status set.")
    if not isinstance(record.get("source"), dict) or not record.get("source", {}).get("file_hash"):
        add("missing_source_provenance", "error", "Source file hash and provenance are required.")
    for group in ("exam", "subject", "chapter", "topic"):
        if not isinstance(record.get(group), dict):
            add("invalid_metadata_group", "error", f"{group} metadata must be an object.")
    options = record.get("options") or []
    if not isinstance(options, list) or any(not isinstance(o, dict) or not isinstance(o.get("label"), str) or not isinstance(o.get("text"), str) for o in options):
        add("invalid_options", "error", "options must be a list of objects with string label and text.")
        options = []
    if not isinstance(record.get("correct_answers"), list) or any(not isinstance(a, str) for a in record.get("correct_answers", [])):
        add("invalid_correct_answers", "error", "correct_answers must be a list of strings.")
    if record.get("question_type") not in {"single_choice", "multiple_select", "true_false", "numerical", "descriptive", "unknown"}:
        add("invalid_question_type", "warning", "Question type is unsupported and needs review.")
    labels = [str(o.get("label", "")).casefold() for o in options]
    if len(labels) != len(set(labels)):
        add("duplicate_option_labels", "error", "Option labels are repeated.")
    if options and any(not str(o.get("text", "")).strip() for o in options):
        add("empty_option", "warning", "One or more options have no text.")
    valid_labels = {x.casefold() for x in labels}
    for answer in record.get("correct_answers") or []:
        token = str(answer).strip().strip("()[]").casefold()
        if valid_labels and token not in valid_labels and not re.fullmatch(r"[-+]?\d+(?:\.\d+)?", token):
            add("invalid_answer_reference", "warning", f"Answer {answer!r} does not match an option label.")
    if record.get("chapter", {}).get("subject_id") and record.get("subject", {}).get("subject_id") and record["chapter"]["subject_id"] != record["subject"]["subject_id"]:
        add("chapter_subject_mismatch", "error", "Chapter belongs to a different subject.")
    if record.get("mapping_status") != "mapped":
        add("unresolved_mapping", "warning", "One or more taxonomy mappings need review.")
    if record.get("answer_verification_status") == "conflict":
        add("answer_conflict", "error", "Source answer and answer key conflict.")
    if record.get("source", {}).get("source_quote") and len(record["source"]["source_quote"]) > max_cell_chars:
        add("excel_cell_overflow", "warning", "Full source quote exceeds Excel's cell limit; retained in JSONL.")
    if record.get("source", {}).get("unresolved_table"):
        add("unresolved_table", "warning", "Source contains a table that could not be confidently segmented.")
    if record.get("source", {}).get("unresolved_image_reference"):
        add("unresolved_image_reference", "warning", "Source references an image; confirm it is not essential question content.")
    if not record.get("options") and record.get("question_type") == "unknown":
        add("question_type_unknown", "info", "No options or question type could be inferred.")
    return issues
