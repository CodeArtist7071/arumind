"""Fail-closed review gate. No network writes; approved snapshots are local audit records."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path


CONTENT_FIELDS = (
    "question_id", "question", "option_a", "option_b", "option_c", "option_d",
    "correct_answer", "explanation", "subject", "topic", "source_file", "source_page",
)
PUBLISH_FIELDS = (
    "exam_id", "subject_id", "chapter_id", "pdf_id", "paper_set", "difficulty_level",
    "marks", "negative_marks", "is_active", "diagram_present", "diagram_url",
    "question_number", "question_type", "source_snippet",
)
REQUIRED_FIELDS = (
    "question_id", "question", "option_a", "option_b", "option_c", "option_d",
    "correct_answer", "source_file", "source_page",
)


def content(row: dict) -> dict:
    # Preserve exact cell content: even a small correction requires reapproval.
    result = {key: row.get(key, "") for key in CONTENT_FIELDS}
    # Optional metadata preserves old workbook compatibility; populated fields are reviewed.
    result.update({key: row[key] for key in PUBLISH_FIELDS
                   if key in row and row[key] is not None and row[key] != ""})
    return result


def fingerprint(row: dict) -> str:
    encoded = json.dumps(content(row), sort_keys=True, ensure_ascii=False,
                         allow_nan=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def validate(row: dict) -> list[str]:
    errors = [f"Missing {key}" for key in REQUIRED_FIELDS
              if row.get(key) is None or not str(row.get(key, "")).strip()]
    for key in CONTENT_FIELDS:
        if key != "source_page" and not isinstance(row.get(key, ""), str):
            errors.append(f"{key} must be text")
    if row.get("correct_answer") not in ("A", "B", "C", "D"):
        errors.append("correct_answer must be A, B, C or D")
    page = row.get("source_page")
    if isinstance(page, bool) or not isinstance(page, (int, float)) or not math.isfinite(page) or page < 1 or int(page) != page:
        errors.append("source_page must be a positive integer")
    if row.get("question_id") == "__coverage__":
        errors.append("question_id uses a reserved ledger key")
    options = [str(row.get(f"option_{letter}", "")).strip().casefold() for letter in "abcd"]
    if len(set(options)) != 4:
        errors.append("Options must be distinct")
    return errors


def read_questions(path: Path) -> list[dict]:
    from openpyxl import load_workbook

    workbook = load_workbook(path, read_only=True, data_only=False)
    try:
        sheet = workbook["Questions"]
        iterator = sheet.iter_rows()
        headers = [cell.value for cell in next(iterator)]
        if len(headers) != len(set(headers)):
            raise ValueError("Duplicate Excel headers")
        missing = set(CONTENT_FIELDS) - set(headers)
        if missing:
            raise ValueError(f"Missing Excel headers: {sorted(missing)}")
        rows = []
        for cells in iterator:
            if all(cell.value is None for cell in cells):
                continue
            if any(cell.data_type == "f" for cell in cells):
                raise ValueError(f"Formulas are not accepted in question row {cells[0].row}")
            row = {key: (cell.value if cell.value is not None else "")
                   for key, cell in zip(headers, cells) if key is not None}
            rows.append(row)
        return rows
    finally:
        workbook.close()


def bank_fingerprint(rows: list[dict]) -> str:
    hashes = sorted(fingerprint(row) for row in rows)
    return hashlib.sha256(json.dumps(hashes).encode()).hexdigest()


def gate(rows: list[dict], approvals: dict) -> dict:
    issues = []
    seen = set()
    if not rows:
        issues.append({"question_id": None, "errors": ["Question bank is empty"]})
    coverage = approvals.get("__coverage__", {})
    if (coverage.get("bank_sha256") != bank_fingerprint(rows)
            or not coverage.get("reviewer") or not coverage.get("reviewed_at")):
        issues.append({"question_id": None, "errors": ["Source coverage not reviewed, or bank changed since coverage review"]})
    for row in rows:
        question_id = str(row.get("question_id", ""))
        errors = validate(row)
        if question_id in seen:
            errors.append("Duplicate question_id")
        seen.add(question_id)
        approval = approvals.get(question_id, {})
        if approval.get("content_sha256") != fingerprint(row):
            errors.append("Not reviewed, or content changed since review")
        if not approval.get("reviewer") or not approval.get("reviewed_at"):
            errors.append("Missing reviewer audit record")
        if row.get("review_status") != "verified":
            errors.append("review_status must be verified; modified/corrected still require review")
        if errors:
            issues.append({"question_id": question_id, "errors": errors})
    return {"ready": not issues, "question_count": len(rows), "issues": issues}


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False), encoding="utf-8")
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--approvals", type=Path, required=True)
    sub = parser.add_subparsers(dest="command", required=True)
    approve = sub.add_parser("approve", help="Record a human review of one current question")
    approve.add_argument("--question-id", required=True)
    approve.add_argument("--reviewer", required=True)
    coverage = sub.add_parser("approve-coverage", help="Attest that all intended source questions are accounted for")
    coverage.add_argument("--reviewer", required=True)
    batch = sub.add_parser("approve-verified", help="Snapshot all rows the human has already marked verified")
    batch.add_argument("--reviewer", required=True)
    check = sub.add_parser("check", help="Check all questions; export only if every row passes")
    check.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "check":
        if args.output.resolve() in (args.workbook.resolve(), args.approvals.resolve()):
            parser.error("Check output must not overwrite the workbook or approval ledger")
        # Invalidate stale payload even if workbook loading or ledger parsing fails next.
        write_json(args.output, {"ready": False, "questions": [], "issues": ["Validation has not completed"]})
    rows = read_questions(args.workbook)
    approvals = json.loads(args.approvals.read_text(encoding="utf-8")) if args.approvals.exists() else {}
    if args.command == "approve-coverage":
        if not rows or not args.reviewer.strip():
            parser.error("Coverage approval requires a nonempty bank and reviewer")
        approvals["__coverage__"] = {"bank_sha256": bank_fingerprint(rows),
                                     "reviewer": args.reviewer.strip(),
                                     "reviewed_at": datetime.now(timezone.utc).isoformat()}
        write_json(args.approvals, approvals)
    elif args.command == "approve-verified":
        selected = [row for row in rows if row.get("review_status") == "verified"]
        ids = [str(row.get("question_id")) for row in rows]
        if len(ids) != len(set(ids)):
            parser.error("Duplicate question IDs; no approvals recorded")
        if not selected or not args.reviewer.strip():
            parser.error("No verified rows or no reviewer provided")
        invalid = {row["question_id"]: validate(row) for row in selected if validate(row)}
        if invalid:
            parser.error(f"Fix invalid rows before approval: {invalid}")
        now = datetime.now(timezone.utc).isoformat()
        for row in selected:
            approvals[row["question_id"]] = {"content_sha256": fingerprint(row),
                                               "reviewer": args.reviewer.strip(), "reviewed_at": now}
        write_json(args.approvals, approvals)
        print(f"Recorded {len(selected)} human review snapshots")
    elif args.command == "approve":
        matches = [row for row in rows if str(row.get("question_id")) == args.question_id]
        if len(matches) != 1:
            parser.error("Approval requires exactly one matching question_id")
        row = matches[0]
        errors = validate(row)
        if errors or row.get("review_status") != "verified" or not args.reviewer.strip():
            parser.error(f"Set verified after human review and fix validation errors: {errors}")
        approvals[args.question_id] = {
            "content_sha256": fingerprint(row), "reviewer": args.reviewer.strip(),
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
        write_json(args.approvals, approvals)
    else:
        report = gate(rows, approvals)
        # Always replace the output: a failed check must never leave an old ready payload.
        write_json(args.output, {**report, "questions": [content(row) for row in rows] if report["ready"] else [],
                                 "approvals": approvals if report["ready"] else {}})
        print(json.dumps(report, indent=2))
        raise SystemExit(0 if report["ready"] else 1)


if __name__ == "__main__":
    main()
