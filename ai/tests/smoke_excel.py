"""Real Excel export/import and review CLI test; requires bundled Node and openpyxl."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_question_pipeline import sample
from test_supabase_publish import config, EXAM


def main():
    root = Path(__file__).resolve().parents[1]
    node = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    with tempfile.TemporaryDirectory(dir=root / 'outputs/tests') as temporary:
        folder = Path(temporary)
        bank = folder / 'bank.json'
        row = {**sample(), 'exam_id': EXAM, 'marks': 2, 'source_snippet': 'Synthetic original source'}
        def export(destination):
            bank.write_text(json.dumps({'source_file':'Synthetic test', 'extraction_complete':True,
                                        'questions':[row], 'raw_blocks':[]}), encoding='utf-8')
            subprocess.run([str(node), str(root/'doc_pipeline/export_excel.mjs'), str(bank), str(destination)],
                           cwd=root, check=True)
        workbook = folder/'bank.xlsx'
        export(workbook)
        def command(file, *args, expected=0):
            completed = subprocess.run([sys.executable, '-m', 'doc_pipeline.question_gate', str(file),
                                        '--approvals', str(folder/'approvals.json'), *args], cwd=root,
                                       capture_output=True, text=True)
            assert completed.returncode == expected, completed.stdout + completed.stderr
        command(workbook, 'approve-verified', '--reviewer', 'Synthetic test reviewer')
        command(workbook, 'approve-coverage', '--reviewer', 'Synthetic test reviewer')
        payload = folder/'publish.json'
        command(workbook, 'check', '--output', str(payload))
        assert json.loads(payload.read_text())['ready'] is True
        mapping = folder/'mapping.json'
        mapping.write_text(json.dumps(config()), encoding='utf-8')
        from dataset_pipeline.supabase_publish import prepare
        prepared = prepare(workbook, folder/'approvals.json', mapping, 'https://example.supabase.co')
        assert prepared['questions'][0]['marks'] == 2
        assert prepared['questions'][0]['exam_id'] == EXAM
        row['question'] += ' edited after review'
        edited = folder/'edited.xlsx'
        export(edited)
        command(edited, 'check', '--output', str(payload), expected=1)
        assert json.loads(payload.read_text())['questions'] == []
        command(workbook, 'check', '--output', str(payload))
        command(folder/'missing.xlsx', 'check', '--output', str(payload), expected=1)
        assert json.loads(payload.read_text())['ready'] is False
    print('Excel round-trip, Supabase preparation, batch approval, edit invalidation and stale-payload checks passed.')


if __name__ == '__main__':
    main()
