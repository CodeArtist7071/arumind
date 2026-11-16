import ast
import unittest
from pathlib import Path
from unittest.mock import patch

import test_extraction as fixtures
from question_pipeline.ingestion.mineru import extract


class IndependentExtractionTests(fixtures.ExtractionTests):
    def setUp(self):
        self.override = patch.object(fixtures, 'extract', extract)
        self.override.start()
        self.addCleanup(self.override.stop)


class IndependenceTests(unittest.TestCase):
    def test_no_imports_from_other_pipeline(self):
        for path in Path('question_pipeline').rglob('*.py'):
            tree = ast.parse(path.read_text(encoding='utf-8'))
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    self.assertFalse((node.module or '').startswith('doc_pipeline'), str(path))
                elif isinstance(node, ast.Import):
                    self.assertFalse(any(alias.name.startswith('doc_pipeline') for alias in node.names), str(path))
