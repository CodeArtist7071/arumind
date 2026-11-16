import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from dataset_pipeline.run import run


class RunTests(unittest.TestCase):
    def test_one_book_exported_before_next_and_existing_excel_preserved(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / 'pdfs'
            source.mkdir()
            for name in ('a.pdf', 'b.PDF'):
                (source / name).write_bytes(b'test')
            events = []
            def extraction(pdf, output, **kwargs):
                events.append('extract-' + pdf.stem)
                folder = output / pdf.stem
                folder.mkdir(parents=True, exist_ok=True)
                doc = folder / 'document.json'
                doc.write_text(json.dumps({'pages': [], 'complete': True, 'source_file': str(pdf), 'source_sha256': 'a'*64}))
                return doc
            def exporter(args, **kwargs):
                workbook = Path(args[-1])
                events.append('export-' + workbook.parent.name)
                workbook.write_bytes(b'synthetic workbook')
            with (patch('doc_pipeline.run.excel_runtime', return_value=Path('node')),
                 patch('doc_pipeline.run.extract', side_effect=extraction),
                 patch('doc_pipeline.run.subprocess.run', side_effect=exporter)):
                results = run(source, root/'out')
                self.assertEqual(events, ['extract-a','export-a','extract-b','export-b'])
                results[0].write_bytes(b'manual edits')
                events.clear()
                run(source, root/'out')
                self.assertEqual(events, ['extract-a','extract-b'])
                self.assertEqual(results[0].read_bytes(), b'manual edits')

    def test_invalid_source_stops_before_runtime(self):
        with tempfile.TemporaryDirectory() as temporary, patch('doc_pipeline.run.excel_runtime') as runtime:
            with self.assertRaises(ValueError):
                run(Path(temporary), Path(temporary)/'output')
            runtime.assert_not_called()
