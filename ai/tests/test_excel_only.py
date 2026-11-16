import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from dataset_pipeline.excel_only import convert


class ExcelOnlyTests(unittest.TestCase):
    def test_only_complete_snapshots_export_and_existing_workbook_preserved(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            inputs = root / 'extraction'
            inputs.mkdir()
            document = {'source_file':'book.pdf','source_sha256':'test','complete':True,'pages':[]}
            original = json.dumps(document)
            (inputs/'document.json').write_text(original)
            (inputs/'manifest.json').write_text(json.dumps({'complete':False,'source_sha256':'test'}))
            with patch('doc_pipeline.excel_only.excel_runtime') as runtime:
                self.assertEqual(convert(inputs, root/'excel'), [])
                runtime.assert_not_called()
            (inputs/'manifest.json').write_text(json.dumps({'complete':True,'source_sha256':'test'}))
            def exporter(args, **kwargs):
                Path(args[-1]).write_bytes(b'Synthetic workbook')
            with (patch('doc_pipeline.excel_only.excel_runtime', return_value=Path('node')),
                  patch('doc_pipeline.excel_only.subprocess.run', side_effect=exporter) as run):
                results = convert(inputs, root/'excel')
                self.assertEqual(len(results), 1)
                results[0].write_bytes(b'Manual edits')
                convert(inputs, root/'excel')
                self.assertEqual(run.call_count, 1)
                self.assertEqual(results[0].read_bytes(), b'Manual edits')
                self.assertEqual((inputs/'document.json').read_text(), original)
                self.assertFalse(list((root/'excel').rglob('.export.lock')))

    def test_partial_bank_skipped(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary)/'bank.json'
            path.write_text(json.dumps({'questions':[], 'extraction_complete':False}))
            self.assertEqual(convert(path, Path(temporary)/'out'), [])
