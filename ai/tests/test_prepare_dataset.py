import json
import tempfile
import unittest
from pathlib import Path

from prepare_dataset import discover, paragraphs, prepare, records_for_file
from collections import defaultdict


class PreparationTests(unittest.TestCase):
    def test_fences_and_formula_survive(self):
        text = '```mermaid\npie\n\n"A" : 40\n```\n\n$$\nx_1 + x_2\n\n= 3\n$$'
        blocks = list(paragraphs(text))
        self.assertEqual(len(blocks), 2)
        self.assertIn('x_1', blocks[1])

    def test_heading_question_page_and_removal(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'markdown.md'
            original = '# Physics\n\n<!-- source page 4 -->\n\n1. What is x_1?\n\n(a) 1\n(b) 2\n\nJoin on Telegram\n\nAnswer: A\n\n2. Next question'
            path.write_text(original)
            rows, audit = records_for_file(path, ['Join on Telegram'], 2400, defaultdict(set))
            self.assertEqual(rows[0]['heading_path'], ['Physics'])
            self.assertEqual(rows[0]['source']['pages'], [4])
            self.assertIn('Answer: A', rows[0]['text'])
            self.assertIn('x_1', rows[0]['text'])
            self.assertNotIn('Telegram', rows[0]['text'])
            self.assertEqual(path.read_text(), original)
            self.assertTrue(audit['changes'])

    def test_image_review_exact_dedup_and_stable_rerun(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ('a', 'b'):
                path = root / name / 'markdown.md'
                path.parent.mkdir()
                path.write_text('# Topic\n\n' + 'A meaningful source paragraph. ' * 8)
            image_md = root / 'c/markdown.md'
            image_md.parent.mkdir()
            image_md.write_text('![](images/missing.png)\n\nThis diagram needs a description.')
            result = prepare([root], root / 'out')
            rows = [json.loads(line) for line in (result / 'chunks.jsonl').read_text().splitlines()]
            self.assertEqual(len(rows), 2)
            self.assertEqual(len(rows[0]['sources']), 2)
            self.assertIn('missing_image', rows[1]['quality_flags'])
            self.assertEqual(rows[1]['route'], 'review')
            self.assertEqual(result, prepare([root], root / 'out'))

    def test_discovery_skips_unfinished_and_prefers_merged(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            chunk = root / 'book/chunks/000001-000005/markdown.md'
            chunk.parent.mkdir(parents=True)
            chunk.write_text('unfinished')
            self.assertEqual(discover([root])[0], [])
            (chunk.parent / 'complete.json').write_text('{}')
            self.assertEqual(discover([root])[0], [chunk.resolve()])
            merged = root / 'book/markdown.md'
            merged.write_text('merged')
            self.assertEqual(discover([root])[0], [merged.resolve()])

    def test_oversized_question_is_reviewed_not_truncated(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            text = '1. ' + 'long question ' * 100
            (root / 'markdown.md').write_text(text)
            result = prepare([root], root / 'out', target_chars=200)
            row = json.loads((result / 'chunks.jsonl').read_text())
            self.assertEqual(row['text'], text.strip())
            self.assertIn('oversized_semantic_unit', row['quality_flags'])


if __name__ == '__main__':
    unittest.main()
