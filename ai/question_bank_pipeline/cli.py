"""Local PDF -> JSON -> question-bank workflow."""
import argparse
import json
from pathlib import Path

from .question_gate import write_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    extract = commands.add_parser("extract")
    extract.add_argument("input", type=Path, help="One PDF or a directory, processed sequentially")
    extract.add_argument("--output", type=Path, default=Path("dataset_pipeline2/data/question-bank"))
    extract.add_argument("--chunk-pages", type=int, default=5)
    extract.add_argument("--overlap", type=int, default=1)
    extract.add_argument("--tier", choices=["gundam", "base"], default="gundam")
    extract.add_argument("--max-pages", type=int, help="Explicit partial smoke test")
    bank = commands.add_parser("structure")
    bank.add_argument("document", type=Path)
    bank.add_argument("--output", type=Path, required=True)
    compare = commands.add_parser("docling-compare", help="Extract a bounded page range as alternate JSON")
    compare.add_argument("pdf", type=Path)
    compare.add_argument("--first-page", type=int, required=True)
    compare.add_argument("--last-page", type=int, required=True)
    compare.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "extract":
        from .extraction import extract as run
        files = sorted(path for path in args.input.iterdir() if path.is_file() and path.suffix.lower() == '.pdf') if args.input.is_dir() else [args.input]
        if not files or any(not path.is_file() or path.suffix.lower() != ".pdf" for path in files):
            parser.error("No valid PDFs found")
        for path in files:
            print(run(path, args.output, args.chunk_pages, args.overlap, args.tier, args.max_pages))
    elif args.command == "structure":
        from .questions import build_bank
        write_json(args.output, build_bank(json.loads(args.document.read_text(encoding="utf-8"))))
    elif args.command == "docling-compare":
        if args.first_page < 1 or args.last_page < args.first_page or args.last_page - args.first_page >= 10:
            parser.error("Choose a valid one-based range of at most 10 pages")
        from docling.document_converter import DocumentConverter
        from docling.datamodel.base_models import ConversionStatus
        result = DocumentConverter().convert(args.pdf, page_range=(args.first_page, args.last_page))
        if result.status != ConversionStatus.SUCCESS:
            raise RuntimeError(f"Docling conversion was not successful: {result.status}")
        write_json(args.output, {"source_file": str(args.pdf.resolve()),
                                "first_page": args.first_page, "last_page": args.last_page,
                                "extractor": "docling", "document": result.document.export_to_dict()})


if __name__ == "__main__":
    main()
