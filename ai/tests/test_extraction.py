import json
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from dataset_pipeline.extraction import extract


class ExtractionTests(unittest.TestCase):
    def run_fake(self, root, fail_ranges=(), interrupt_range=None, observe=None):
        calls = []
        class Writer:
            def __init__(self, folder):
                self.folder = Path(folder)

        def parse(path, *, tier, page_range):
            first, last = map(int, page_range.split('-'))
            calls.append((first, last))
            if observe:
                observe(first, last)
            if (first, last) == interrupt_range:
                raise KeyboardInterrupt()
            if (first, last) in fail_ranges:
                raise MemoryError('Test window exceeds memory budget')
            def save(writer):
                writer.folder.mkdir(parents=True, exist_ok=True)
                data = {"pages": [{"page_idx": page - 1, "blocks": []} for page in range(first, last+1)]}
                (writer.folder / 'structured_content.json').write_text(json.dumps(data))
                (writer.folder / 'markdown.md').write_text('Generated markdown')
                (writer.folder / 'image.jpg').write_bytes(b'test image asset')
            return types.SimpleNamespace(save=save)

        modules = {'pypdf': types.SimpleNamespace(PdfReader=lambda stream: types.SimpleNamespace(pages=range(7))),
                   'mineru.parser': types.SimpleNamespace(parse=parse),
                   'mineru.parser.writer': types.SimpleNamespace(FileBasedDataWriter=Writer)}
        pdf = root / 'test.pdf'
        pdf.write_bytes(b'test source hash input')
        with patch.dict('sys.modules', modules), patch('importlib.metadata.version', return_value='test'):
            result = extract(pdf, root / 'output', chunk_pages=3, overlap=1)
        return result, calls

    def test_overlap_deduplicated_and_resume_checksums(self):
        with tempfile.TemporaryDirectory() as tmp:
            path, calls = self.run_fake(Path(tmp))
            self.assertEqual(calls, [(1,4),(4,7),(7,7)])
            data = json.loads(path.read_text())
            self.assertEqual([p['source_page'] for p in data['pages']], list(range(1,8)))
            self.assertTrue(data['complete'])
            _, calls = self.run_fake(Path(tmp))
            self.assertEqual(calls, [])
            chunk = Path(data['chunks'][0]['folder']) / 'structured_content.json'
            chunk.write_text('{}')
            _, calls = self.run_fake(Path(tmp))
            self.assertEqual(calls, [(1,4)])

    def test_failed_window_splits_without_losing_pages(self):
        with tempfile.TemporaryDirectory() as tmp:
            path, calls = self.run_fake(Path(tmp), fail_ranges={(1,4)})
            self.assertIn((1,2), calls)
            self.assertIn((3,4), calls)
            self.assertEqual(len(json.loads(path.read_text())['pages']), 7)

    def test_failed_single_page_stops_book(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(RuntimeError):
                self.run_fake(Path(tmp), fail_ranges={(7,7)})
            self.assertFalse(list(Path(tmp).rglob('document.json')))

    def test_interrupt_records_progress_and_resumes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            def observe(first, last):
                state = json.loads(next(root.rglob('manifest.json')).read_text())
                self.assertEqual(state['current_window'], {'first_page': first, 'last_page': last})
            with self.assertRaises(KeyboardInterrupt):
                self.run_fake(root, interrupt_range=(4,7), observe=observe)
            state = json.loads(next(root.rglob('manifest.json')).read_text())
            self.assertEqual(state['extraction_status'], 'interrupted')
            self.assertEqual(state['completed_pages'], 4)
            self.assertEqual(state['next_incomplete_page'], 5)
            _, calls = self.run_fake(root)
            self.assertEqual(calls, [(4,7),(7,7)])

    def test_split_failure_resumes_children_without_retrying_parent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(KeyboardInterrupt):
                self.run_fake(root, fail_ranges={(1,4)}, interrupt_range=(3,4))
            # Simulate the older extractor, which did not write split.json.
            for marker in root.rglob('split.json'):
                marker.unlink()
            _, calls = self.run_fake(root)
            self.assertEqual(calls, [(3,4),(4,7),(7,7)])

    def test_invalid_marker_reextracts_only_affected_window(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path, _ = self.run_fake(root)
            first = Path(json.loads(path.read_text())['chunks'][0]['folder'])
            (first / 'complete.json').write_text('{broken')
            _, calls = self.run_fake(root)
            self.assertEqual(calls, [(1,4)])

    def test_edited_or_missing_markdown_does_not_repeat_ocr(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path, _ = self.run_fake(root)
            chunks = json.loads(path.read_text())['chunks']
            markdown = Path(chunks[0]['folder']) / 'markdown.md'
            markdown.write_text('My corrected markdown')
            (Path(chunks[1]['folder']) / 'markdown.md').unlink()
            _, calls = self.run_fake(root)
            self.assertEqual(calls, [])
            self.assertEqual(markdown.read_text(), 'My corrected markdown')

    def test_damaged_image_still_invalidates_chunk(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path, _ = self.run_fake(root)
            chunk = Path(json.loads(path.read_text())['chunks'][0]['folder'])
            (chunk / 'image.jpg').write_bytes(b'damaged')
            _, calls = self.run_fake(root)
            self.assertEqual(calls, [(1,4)])

    def test_failure_records_completed_chunks(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(RuntimeError):
                self.run_fake(root, fail_ranges={(7,7)})
            state = json.loads(next(root.rglob('manifest.json')).read_text())
            self.assertEqual(state['extraction_status'], 'failed')
            self.assertEqual(len(state['chunks']), 2)
            self.assertEqual(state['current_window']['first_page'], 7)
            _, calls = self.run_fake(root)
            self.assertEqual(calls, [(7,7)])
