import json
import tempfile
import unittest
import types
from pathlib import Path
from unittest.mock import patch

from question_pipeline.visuals.charts import corroborate, mermaid, parse_table
from question_pipeline.run import enrich
from question_pipeline.visuals.worker import Models
from question_pipeline.visuals import markdown as markdown_stage


class ChartTests(unittest.TestCase):
    def test_chunk_metadata_reused_and_rechecked_on_next_run(self):
        class Worker:
            identity = {'test': 1}
            def extract(self, path, hint):
                return {'status': 'needs_review'}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            document = self.fixture(root)
            middle_path = root / 'chunk/middle_json.json'
            rendered = []
            def render(middle, index, prefix):
                rendered.append(middle)
                return self.renderer(middle, index, prefix)
            with patch.object(markdown_stage, 'sha256', wraps=markdown_stage.sha256) as hashes:
                enrich(document, root / 'out', Worker(), render)
                self.assertEqual(sum(call.args[0] == middle_path for call in hashes.call_args_list), 1)
            self.assertIs(rendered[0], rendered[1])
            rendered.clear()
            enrich(document, root / 'out', Worker(), render)
            self.assertEqual(rendered, [])
            middle_path.write_text(json.dumps({'pages': [], 'changed': True}))
            enrich(document, root / 'out', Worker(), render)
            self.assertEqual(len(rendered), 2)
            self.assertTrue(rendered[0]['changed'])

    def test_default_does_not_load_paddle(self):
        models = Models()
        with patch('question_pipeline.visuals.worker.chart_kind', return_value=None):
            result = models.extract('unused.png', '')
        self.assertIsNone(models.ocr)
        self.assertFalse(result['ocr_cross_check'])

    def test_optional_paddle_evidence(self):
        class OCR:
            def __init__(self, **kwargs):
                pass
            def predict(self, image):
                return [types.SimpleNamespace(json={'res': {'rec_texts': ['Label'], 'rec_scores': [0.99]}})]
        with patch.dict('sys.modules', {'paddleocr': types.SimpleNamespace(PaddleOCR=OCR)}), \
                patch('question_pipeline.visuals.worker.chart_kind', return_value=None):
            result = Models().extract('unused.png', '', verify_text=True)
        self.assertTrue(result['ocr_cross_check'])
        self.assertEqual(result['ocr'][0]['text'], 'Label')

    def test_pie_and_bar(self):
        table = parse_table('TITLE | Sales<0x0A>Category | Share<0x0A>A | 40%<0x0A>B | 60%')
        corroborate(table, [{'text': 'A 40% B 60%', 'score': 0.99}])
        self.assertIn('"A" : 40', mermaid('pie', table))
        self.assertIn('bar [40, 60]', mermaid('bar', table))

    def test_uncertain_values_rejected(self):
        table = parse_table('Name | Value\nA | 40\nB | 60')
        with self.assertRaises(ValueError):
            corroborate(table, [{'text': 'A 40 B 80', 'score': 0.99}])
        with self.assertRaises(ValueError):
            parse_table('Name | X | Y\nA | 4 | 3\nB | 6 | 7')
        table['labels'][0] = 'bad"\n```'
        with self.assertRaises(ValueError):
            mermaid('bar', table)

    def test_invalid_pie_total(self):
        table = parse_table('Name | Share\nA | 40%\nB | 80%')
        with self.assertRaises(ValueError):
            mermaid('pie', table)

    def fixture(self, root):
        chunk = root / 'chunk'
        (chunk / 'images').mkdir(parents=True)
        pages = []
        for number in (1, 2):
            source = f'images/chart{number}.png'
            (chunk / source).write_bytes(f'image {number}'.encode())
            pages.append({'source_page': number, 'asset_directory': str(chunk),
                          'blocks': [{'type': 'image', 'image_source': source}]})
        (chunk / 'middle_json.json').write_text(json.dumps({'pages': []}))
        document = root / 'document.json'
        document.write_text(json.dumps({'source_sha256': 'abc', 'complete': True, 'pages': pages}))
        return document

    @staticmethod
    def renderer(middle, index, prefix):
        return f'Question {index + 1}\n\n![]({prefix}/images/chart{index + 1}.png)\n\nOptions A B C D'

    def test_interrupt_resume_and_in_place_render(self):
        class Worker:
            identity = {'test': 1}
            calls = []
            interrupt = True
            def extract(self, path, hint):
                self.calls.append(path.name)
                if path.name == 'chart2.png' and self.interrupt:
                    raise KeyboardInterrupt()
                return {'status': 'reconstructed', 'mermaid': '```mermaid\npie\n"A" : 40\n"B" : 60\n```'}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            document = self.fixture(root)
            worker = Worker()
            output = root / 'output'
            with self.assertRaises(KeyboardInterrupt):
                enrich(document, output, worker, self.renderer)
            state = json.loads((output / 'manifest.json').read_text())
            self.assertEqual(state['completed_pages'], [1])
            self.assertEqual(state['status'], 'interrupted')
            worker.interrupt = False
            result = enrich(document, output, worker, self.renderer)
            self.assertEqual(worker.calls, ['chart1.png', 'chart2.png', 'chart2.png'])
            text = result.read_text()
            self.assertEqual(text.count('```mermaid'), 2)
            self.assertLess(text.index('```mermaid'), text.index('Options A'))
            enrich(document, output, worker, self.renderer)
            self.assertEqual(len(worker.calls), 3)
            result.write_text('User corrected merged markdown')
            enrich(document, output, worker, self.renderer)
            self.assertEqual(result.read_text(), 'User corrected merged markdown')

    def test_uncertain_chart_keeps_image(self):
        class Worker:
            identity = {'test': 1}
            def extract(self, path, hint):
                return {'status': 'needs_review', 'reason': 'Unreadable values'}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = enrich(self.fixture(root), root / 'out', Worker(), self.renderer)
            text = result.read_text()
            self.assertIn('chart1.png)', text)
            self.assertNotIn('```mermaid', text)
            self.assertIn('manual review', text)


if __name__ == '__main__':
    unittest.main()
