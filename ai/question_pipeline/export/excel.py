"""Whitelisted local Excel tool: accepts validated question data, never model code."""
import os
import subprocess
from pathlib import Path

from core.storage import BASE, read_json, sha256, write_json


def update_progress_workbook(bank_path):
    node = Path(os.environ.get('QUESTION_NODE', str(Path.home() /
        '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')))
    if not node.is_file():
        raise RuntimeError('Bundled Excel runtime missing; set QUESTION_NODE to the configured Node executable')
    bank = read_json(bank_path)
    signature = sha256(bank_path)
    source_id = bank.get('source_sha256', signature)[:12]
    output = bank_path.with_name(f'questions-{source_id}.xlsx')
    receipt = output.with_suffix('.receipt.json')
    previous = read_json(receipt, {})
    if output.exists():
        if previous.get('bank_sha256') != signature:
            if not previous:
                raise RuntimeError(f'Existing workbook has no progress receipt; preserving it: {output}')
        else:
            print(f'Excel progress is current: {output}', flush=True)
            return output
    temporary = output.with_name(output.stem + '.partial.xlsx')
    # Remove only our incomplete staging file from a previously interrupted update.
    temporary.unlink(missing_ok=True)
    subprocess.run([str(node), str(BASE / 'export/export_excel.mjs'), str(bank_path.resolve()),
                    str(temporary.resolve())], cwd=BASE, check=True)
    if not temporary.is_file():
        raise RuntimeError('Excel exporter did not create a workbook')
    temporary.replace(output)
    write_json(receipt, {'bank_sha256': signature, 'workbook_sha256': sha256(output)})
    return output


def generate_excel_sheet(bank_path):
    """Return the incrementally maintained workbook, refreshing it if needed."""
    return update_progress_workbook(bank_path)
