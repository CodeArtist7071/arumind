"""Read completed JSON snapshots and export separately from a running main pipeline."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

from .question_gate import write_json
from .questions import build_bank
from .run import ROOT, excel_runtime


def convert(source: Path, output: Path) -> list[Path]:
    paths = sorted(source.rglob('document.json')) if source.is_dir() else [source]
    if not source.exists():
        raise ValueError(f'Input does not exist: {source}')
    results = []
    node = None
    for path in paths:
        data = json.loads(path.read_text(encoding='utf-8'))
        if 'pages' in data:
            manifest_path = path.parent / 'manifest.json'
            # main.py writes document.json then marks the manifest complete, both atomically.
            manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
            if data.get('complete') is not True or manifest.get('complete') is not True:
                print(f'Skipping incomplete/in-progress extraction: {path}', flush=True)
                continue
            if data.get('source_sha256') != manifest.get('source_sha256'):
                raise ValueError(f'Source snapshot and manifest disagree: {path}')
            bank = build_bank(data)
        elif 'questions' in data:
            if data.get('extraction_complete') is not True:
                print(f'Skipping partial bank: {path}', flush=True)
                continue
            bank = data
        else:
            raise ValueError(f'Expected document.json or bank.json: {path}')
        identity = hashlib.sha256(str(path.resolve()).encode('utf-8')).hexdigest()[:12]
        name = re.sub(r'[^\w.-]+', '_', Path(bank.get('source_file', path.parent.name)).stem)[:60]
        folder = output / f'{name}-{identity}'
        folder.mkdir(parents=True, exist_ok=True)
        # Separate folder means the already-running main.py cannot overwrite these files.
        workbook = folder / 'question-bank.xlsx'
        lock = folder / '.export.lock'
        try:
            lock_stream = lock.open('x')
        except FileExistsError:
            print(f'Another Excel export owns {folder}; skipped.', flush=True)
            continue
        try:
            if workbook.exists():
                print(f'Keeping existing workbook: {workbook}', flush=True)
            else:
                if node is None:
                    node = excel_runtime()
                bank_path = folder / 'bank.json'
                write_json(bank_path, bank)
                subprocess.run([str(node), str(ROOT / 'dataset_pipeline2/export_excel.mjs'),
                                str(bank_path.resolve()), str(workbook.resolve())], cwd=ROOT, check=True)
                if not workbook.is_file():
                    raise RuntimeError(f'Excel exporter did not create {workbook}')
                print(f'Created: {workbook}', flush=True)
            results.append(workbook)
        finally:
            lock_stream.close()
            lock.unlink()
    if not results:
        print('No completed documents ready yet. Let dataset2.py continue, then run python dataset2.py --excel-only again.', flush=True)
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', nargs='?', type=Path, default=ROOT / 'dataset_pipeline2/data/question-bank')
    parser.add_argument('--output', type=Path, default=ROOT / 'dataset_pipeline2/data/excel')
    args = parser.parse_args()
    # Never share output files with the running extraction/export pipeline.
    extraction_root = (ROOT / 'dataset_pipeline2/data/question-bank').resolve()
    destination = args.output.resolve()
    if destination == extraction_root or extraction_root in destination.parents:
        parser.error('Choose an Excel output outside dataset_pipeline2/data/question-bank to avoid the running pipeline.')
    if not args.input.exists() and args.input == ROOT / 'dataset_pipeline2/data/question-bank':
        print('No completed extraction yet. Let dataset2.py continue and rerun python dataset2.py --excel-only later.')
        return
    try:
        convert(args.input, args.output)
    except (ValueError, OSError, RuntimeError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Excel conversion stopped: {error}\n')


if __name__ == '__main__':
    main()
