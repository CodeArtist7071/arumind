from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from .pipeline import run_pipeline
from .drive_upload import DEFAULT_WORKBOOK_DIR, upload_workbooks
from pyq_pipeline.parser import discover


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="pyq-decision-pipeline",
        description="Extract questions from Markdown and manage the resulting workbooks.",
    )
    parser.add_argument("command", nargs="?", choices=["inventory", "process", "upload"], default="process")
    parser.add_argument("--input", type=Path, help="Markdown root (defaults to pyq_pipeline/input/markdown)")
    parser.add_argument("--output", type=Path, help="Output root (defaults to decision_pipeline/output)")
    parser.add_argument("--folder-id", help="Google Drive destination folder ID for the upload command")
    parser.add_argument("--document", help="Only process a PDF folder name or part of that name")
    parser.add_argument("--model", default=None, help="OpenRouter model override (defaults to configured OPENROUTER_MODEL)")
    parser.add_argument("--max-questions", type=int, help="Limit LLM calls for a small pilot")
    parser.add_argument("--request-interval", type=float, default=2.0,
                        help="Seconds to wait between LLM requests (default: 2)")
    parser.add_argument("--dry-run", action="store_true", help="Detect candidates and answer keys without calling OpenRouter")
    parser.add_argument("--no-llm", action="store_true", help="Create workbooks with deterministic parser output only")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    root = Path(__file__).resolve().parent.parent
    input_dir = (args.input or root / "input" / "markdown").resolve()
    if args.command == "inventory":
        grouped = {}
        for path in discover(input_dir):
            relative = path.resolve().relative_to(input_dir)
            folder = relative.parts[0] if len(relative.parts) > 1 else path.parent.name
            title = folder.split("__", 1)[-1] if "__" in folder else folder
            grouped.setdefault(folder, {"pdf_folder": title, "markdown_files": 0})["markdown_files"] += 1
        print(json.dumps({"input": str(input_dir), "pdf_folders": len(grouped),
                          "markdown_files": sum(item["markdown_files"] for item in grouped.values()),
                          "documents": list(grouped.values())}, ensure_ascii=False, indent=2))
        return 0
    if args.command == "upload":
        workbook_dir = (args.output / "workbooks").resolve() if args.output else DEFAULT_WORKBOOK_DIR
        print(json.dumps(upload_workbooks(workbook_dir, args.folder_id), ensure_ascii=False, indent=2))
        return 0
    result = run_pipeline(
        input_dir=input_dir,
        output_dir=(args.output or Path(__file__).resolve().parent / "output").resolve(),
        model=args.model,
        document_filter=args.document,
        max_questions=args.max_questions,
        dry_run=args.dry_run,
        no_llm=args.no_llm,
        request_interval=args.request_interval,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("failed", 0) == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
