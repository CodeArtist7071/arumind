from __future__ import annotations

import argparse
import filecmp
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import shutil

from pyq_pipeline.config import load_settings
from pyq_pipeline.mapping import MappingRegistry
from pyq_pipeline.parser import discover
from pyq_pipeline.persistence import StateStore
from pyq_pipeline.processing import process_files
from pyq_pipeline.exporter import export_workbook


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="pyq-pipeline", description="Extract and validate PYQs from existing Markdown files.")
    p.add_argument("command", choices=["inventory", "process", "validate", "export", "report", "resume", "mappings", "import-extractions"])
    p.add_argument("mapping_action", nargs="?", choices=["audit", "propose", "approve"])
    p.add_argument("--input", type=Path)
    p.add_argument("--source", type=Path, help="Source folder for import-extractions (defaults to question_pipeline/data/extractions)")
    p.add_argument("--output", type=Path)
    p.add_argument("--template", type=Path, help="Excel template whose first-row headers are mapped explicitly in settings.yaml")
    p.add_argument("--config", type=Path)
    p.add_argument("--file", action="append", dest="files")
    p.add_argument("--limit", type=int)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--no-llm", action="store_true")
    p.add_argument("--retry-failed", action="store_true")
    p.add_argument("--pilot", type=int, help="Process at most N Markdown files")
    return p


def main(argv=None) -> int:
    args = parser().parse_args(argv)
    root = Path(__file__).resolve().parent
    cfg = load_settings(args.config or root / "config" / "settings.yaml", root)
    input_dir = (args.input or cfg.input_dir).resolve()
    output_dir = (args.output or cfg.output_dir).resolve()
    root.joinpath("logs").mkdir(parents=True, exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", handlers=[
        logging.StreamHandler(), RotatingFileHandler(root / "logs" / "pipeline.log", maxBytes=5_000_000,
                                                      backupCount=3, encoding="utf-8")])
    if args.command == "import-extractions":
        source_dir = (args.source or root.parent / "question_pipeline" / "data" / "extractions").resolve()
        if not source_dir.is_dir():
            raise FileNotFoundError(f"Markdown extraction folder does not exist: {source_dir}")
        input_dir.mkdir(parents=True, exist_ok=True)
        copied = updated = unchanged = 0
        for source in sorted(source_dir.rglob("*"), key=lambda path: str(path).casefold()):
            if not source.is_file() or source.suffix.casefold() not in {".md", ".markdown"}:
                continue
            target = input_dir / source.relative_to(source_dir)
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.is_file() and filecmp.cmp(source, target, shallow=False):
                unchanged += 1
                continue
            was_present = target.exists()
            shutil.copy2(source, target)
            if was_present:
                updated += 1
            else:
                copied += 1
        print(json.dumps({"source": str(source_dir), "input": str(input_dir),
                          "copied": copied, "updated": updated, "unchanged": unchanged}, indent=2))
        return 0
    if args.command == "mappings":
        registry = MappingRegistry(root / "config")
        action = args.mapping_action or "audit"
        if action == "approve":
            if args.dry_run:
                print("Dry run: mapping registry was not changed.")
            else:
                print(registry.approve_proposals(dry_run=args.dry_run))
        else:
            report = registry.audit()
            if action == "propose" and registry.proposals_path.exists():
                report["proposals"] = json.loads(registry.proposals_path.read_text(encoding="utf-8"))
            print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    files = discover(input_dir, cfg.file_patterns)
    if args.files:
        selected = {str(Path(f).resolve()) for f in args.files}
        files = [f for f in files if str(f.resolve()) in selected or f.name in args.files]
    limit = args.pilot or args.limit
    if limit:
        files = files[:limit]
    if args.command == "inventory":
        print(json.dumps({"input": str(input_dir), "files": len(files), "markdown": [str(f) for f in files]}, ensure_ascii=False, indent=2))
        return 0
    store = StateStore(cfg.state_db)
    registry = MappingRegistry(root / "config")
    if args.command in ("process", "resume"):
        template = args.template or cfg.template
        if not args.dry_run:
            # Publish the workbook structure before touching source files. Every completed file
            # refreshes this workbook, so interruption leaves usable partial output.
            export_workbook(store, output_dir, cfg, template_path=template)
        def publish_progress(_path, _question_count):
            store.write_jsonl(root / "intermediate" / "records.jsonl")
            export_workbook(store, output_dir, cfg, template_path=template)
        counts = process_files(files, store, registry, cfg, use_llm=cfg.llm_enabled and not args.no_llm,
                               retry_failed=args.retry_failed or args.command == "resume", dry_run=args.dry_run, on_file=publish_progress)
        print(json.dumps(counts, ensure_ascii=False, indent=2))
        if not args.dry_run:
            store.write_jsonl(root / "intermediate" / "records.jsonl")
            export_workbook(store, output_dir, cfg, template_path=template)
        return 0 if counts.get("failed", 0) == 0 else 2
    if args.command == "validate":
        from pyq_pipeline.validation import validate_record
        bad = 0
        for record in store.iter_records():
            issues = validate_record(record)
            if issues:
                bad += 1
        print(json.dumps({"records": store.count_records(), "records_with_issues": bad}, indent=2))
        return 0
    if args.command == "export":
        print(export_workbook(store, output_dir, cfg, template_path=args.template or cfg.template))
        return 0
    if args.command == "report":
        print(json.dumps(store.summary(), ensure_ascii=False, indent=2))
        return 0
    return 2
