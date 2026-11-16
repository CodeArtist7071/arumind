import ast
import json
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from pypdf import PdfWriter
from question_bank_pipeline.extraction import extract
from question_bank_pipeline.questions import build_bank
from question_bank_pipeline.unlimited_backend import Backend, BackendError, blocks_from_raw


class FakePDF:
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def __getitem__(self, index):
        return types.SimpleNamespace(rect=types.SimpleNamespace(width=100, height=100),
            get_pixmap=lambda **kwargs: types.SimpleNamespace(save=lambda path: path.write_bytes(b'page-image')))


class Dataset2Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.pdf = self.root / 'book.pdf'
        writer = PdfWriter()
        for _ in range(5):
            writer.add_blank_page(width=100, height=100)
        writer.write(self.pdf)
        self.calls = []
        self.fail = None

        def infer(backend, image, folder):
            number = int(folder.name)
            self.calls.append(number)
            if number == self.fail:
                raise KeyboardInterrupt()
            return f'<|det|>text [0,0,100,100]<|/det|>{number}. Two plus two?\n(a) 1 (b) 2 (c) 3 (d) 4\nAnswer: D'

        for replacement in (patch.dict('sys.modules', {'fitz': types.SimpleNamespace(open=lambda path: FakePDF())}),
                            patch.object(Backend, 'load'), patch.object(Backend, 'infer', infer)):
            replacement.start()
            self.addCleanup(replacement.stop)

    def run_extract(self, **kwargs):
        return extract(self.pdf, self.root / 'out', chunk_pages=2, overlap=1, **kwargs)

    def test_overlap_and_restart_never_repeat_verified_pages(self):
        result = self.run_extract()
        self.assertEqual(self.calls, [1, 2, 3, 4, 5])
        self.run_extract()
        self.assertEqual(self.calls, [1, 2, 3, 4, 5])
        document = json.loads(result.read_text())
        self.assertTrue(document['complete'])
        self.assertEqual([p['source_page'] for p in document['pages']], [1, 2, 3, 4, 5])
        bank = build_bank(document)
        self.assertEqual(len(bank['questions']), 5)
        self.assertTrue(all(q['review_status'] == 'pending' for q in bank['questions']))

    def test_interruption_recovers_pages_inside_unfinished_window(self):
        self.fail = 3
        with self.assertRaises(KeyboardInterrupt):
            self.run_extract()
        manifest = next((self.root / 'out').rglob('manifest.json'))
        self.assertEqual(json.loads(manifest.read_text())['extraction_status'], 'interrupted')
        self.fail = None
        self.run_extract()
        self.assertEqual(self.calls, [1, 2, 3, 3, 4, 5])

    def test_corrupt_page_evidence_repaired_without_repeating_other_pages(self):
        result = self.run_extract()
        (result.parent / 'pages/000002/raw.json').write_text('corrupt')
        self.run_extract()
        self.assertEqual(self.calls, [1, 2, 3, 4, 5, 2])

    def test_partial_and_edited_markdown(self):
        result = self.run_extract(max_pages=2)
        self.assertFalse(json.loads(result.read_text())['complete'])
        markdown = next(result.parent.rglob('markdown.md'))
        markdown.write_text('human corrected text')
        self.run_extract(max_pages=2)
        self.assertEqual(self.calls, [1, 2])
        self.assertEqual(markdown.read_text(), 'human corrected text')

    def test_independent_imports(self):
        for path in Path('dataset_pipeline2').rglob('*.py'):
            for node in ast.walk(ast.parse(path.read_text(encoding='utf-8'))):
                names = [node.module or ''] if isinstance(node, ast.ImportFrom) else (
                    [alias.name for alias in node.names] if isinstance(node, ast.Import) else [])
                self.assertFalse(any(name.split('.')[0] in ('mineru', 'doc_pipeline', 'question_pipeline')
                                     for name in names), str(path))


class GenerationTests(unittest.TestCase):
    def test_truncated_generation_is_rejected_and_method_restored(self):
        class Model:
            def generate(self, **kwargs):
                return types.SimpleNamespace()
            def infer(self, tokenizer, **kwargs):
                self.generate()
                return 'incomplete'
        class Tokens:
            def __getitem__(self, key):
                return types.SimpleNamespace(item=lambda: 42)
        backend = Backend()
        backend.model = Model()
        backend.model.generate = lambda **kwargs: Tokens()
        backend.tokenizer = types.SimpleNamespace(eos_token_id=1)
        original = backend.model.generate
        with self.assertRaisesRegex(BackendError, 'EOS'):
            backend.infer(Path('unused.png'), Path('unused'))
        self.assertIs(backend.model.generate, original)

    def test_raw_table_and_image_blocks_are_retained(self):
        blocks = blocks_from_raw('<|det|>table [0,0,10,10]<|/det|><table>data</table>\n<|det|>image<|/det|>chart')
        self.assertEqual([b['type'] for b in blocks], ['table', 'image'])
        self.assertEqual(blocks[0]['content'], '<table>data</table>')


if __name__ == '__main__':
    unittest.main()
