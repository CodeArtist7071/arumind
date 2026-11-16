"""Extract each PDF, structure its questions, and export its Excel review workbook."""
import argparse
import json
import subprocess
from pathlib import Path

from .extraction import extract
from .review.gate import write_json
from .structuring.questions import build_bank


ROOT = Path(__file__).resolve().parent


def excel_runtime() -> Path:
    node = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    if not node.is_file() or not (ROOT.parent / 'node_modules/@oai/artifact-tool').is_dir():
        raise RuntimeError('Excel runtime is unavailable. Follow the Excel runtime setup in README.md.')
    return node


def run(source: Path, output: Path, max_pages: int | None = None):
    files = sorted((path for path in source.iterdir() if path.is_file() and path.suffix.lower() == '.pdf')) if source.is_dir() else [source]
    if not files or any(not path.is_file() or path.suffix.lower() != '.pdf' for path in files):
        raise ValueError(f'No PDFs found at {source}')
    node = excel_runtime()  # Fail before spending time on extraction if Excel cannot run.
    results = []
    for index, pdf in enumerate(files, 1):
        print(f'[{index}/{len(files)}] Checking saved extraction: {pdf.name}', flush=True)
        document_path = extract(pdf, output, chunk_pages=5, overlap=1, tier='standard', max_pages=max_pages)
        workbook = document_path.parent / 'dataset.xlsx'
        if workbook.exists():
            print(f'Keeping existing workbook with any manual edits: {workbook}', flush=True)
        else:
            bank_path = document_path.parent / 'dataset.json'
            write_json(bank_path, build_bank(json.loads(document_path.read_text(encoding='utf-8'))))
            subprocess.run([str(node), str(ROOT / 'export_excel.mjs'),
                            str(bank_path.resolve()), str(workbook.resolve())], cwd=ROOT, check=True)
            if not workbook.is_file():
                raise RuntimeError(f'Exporter did not create {workbook}')
            print(f'Excel ready for human review: {workbook}', flush=True)
        results.append(workbook)
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', nargs='?', type=Path, default=ROOT / 'google_docs')
    parser.add_argument('--output', type=Path, default=ROOT / 'outputs/question-bank')

    parser.add_argument('--max-pages', type=int, help='Optional partial test; omit to extract full PDFs')
    args = parser.parse_args()
    try:
        results = run(args.input, args.output, args.max_pages)
    except (ValueError, OSError, RuntimeError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Pipeline stopped: {error}\nRerun the same command to resume extraction.\n')
    print(f'Finished. {len(results)} Excel workbook(s) under {args.output}. Questions still require review.')


if __name__ == '__main__':
    main()
