import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx

from question_pipeline.ai.review import Reviewer, run
from dataset_pipeline.question_gate import CONTENT_FIELDS


class AIReviewTests(unittest.TestCase):
    def config(self):
        return {'enabled': True, 'openrouter_model': 'test/model', 'laya_enabled': False}

    def test_review_caches_and_invalidates_on_edit(self):
        calls = []
        def respond(request):
            calls.append(json.loads(request.content))
            return httpx.Response(200, json={'choices': [{'finish_reason': 'stop', 'message': {
                'content': json.dumps({'decision': 'needs_review', 'issues': ['Missing answer']})}}]})
        with tempfile.TemporaryDirectory() as tmp, patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
            root = Path(tmp)
            bank, output = root / 'bank.json', root / 'review.json'
            row = dict.fromkeys(CONTENT_FIELDS, '')
            row.update(question_id='q1', question='Test?', review_status='pending')
            data = {'extraction_complete': True, 'questions': [row]}
            bank.write_text(json.dumps(data))
            original = bank.read_bytes()
            with httpx.Client(transport=httpx.MockTransport(respond)) as client:
                run(bank, output, self.config(), client=client)
                run(bank, output, self.config(), client=client)
                self.assertEqual(len(calls), 1)
                self.assertEqual(bank.read_bytes(), original)
                data['questions'][0]['question'] = 'Edited?'
                bank.write_text(json.dumps(data))
                run(bank, output, self.config(), client=client)
                self.assertEqual(len(calls), 2)
            self.assertTrue(json.loads(output.read_text())['advisory_only'])

    def test_no_key_fails_before_network(self):
        with patch.dict('os.environ', {}, clear=True):
            with self.assertRaisesRegex(ValueError, 'OPENROUTER_API_KEY'):
                Reviewer(self.config())

    def test_laya_windows_rejected(self):
        with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test'}), patch('platform.system', return_value='Windows'):
            with self.assertRaisesRegex(ValueError, 'Apple Silicon'):
                Reviewer({**self.config(), 'laya_enabled': True})

    def test_bad_response_and_truncation_rejected(self):
        with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test'}):
            reviewer = Reviewer(self.config())
        for finish, value in [('length', '{}'), ('stop', '{"decision":"verified","issues":[]}')]:
            with self.subTest(finish=finish):
                def respond(request):
                    return httpx.Response(200, json={'choices': [{'finish_reason': finish, 'message': {'content': value}}]})
                with httpx.Client(transport=httpx.MockTransport(respond)) as client:
                    with self.assertRaises(ValueError):
                        reviewer.review({}, client)
