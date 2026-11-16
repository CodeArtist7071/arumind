import os
import subprocess
import sys
import unittest
from unittest.mock import patch

from dataset_pipeline.jev import review


class JevTests(unittest.TestCase):
    def test_disabled_even_with_api_key(self):
        with patch.dict(os.environ, {'TYPESAFE_API_KEY': 'test-only'}):
            with self.assertRaisesRegex(RuntimeError, 'disabled'):
                review({})

    def test_command_not_available(self):
        result = subprocess.run([sys.executable, '-m', 'doc_pipeline.cli', 'jev-review'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('invalid choice', result.stderr)
