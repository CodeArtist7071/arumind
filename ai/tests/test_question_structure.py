import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx

from question_pipeline.ai.structure import chunks, structure, validate


class StructureTests(unittest.TestCase):
    def row(self):
        return {'question_number':'1', 'source_page':1, 'question_text':'What is 2+2?',
                'options':[{'label':'A','text':'4'}, {'label':'B','text':'5'}], 'correct_answer':'',
                'explanation':'', 'question_type':'SINGLE_CHOICE', 'source_quote':'1. What is 2+2?',
                'diagram_markdown':'', 'review_notes':'Answer absent'}

    def test_tool_calls_cache_and_content_change(self):
        calls = []
        def respond(request):
            payload = json.loads(request.content)
            self.assertEqual(payload['tool_choice']['function']['name'], 'generate_excel_sheet')
            calls.append(payload)
            return httpx.Response(200, json={'choices':[{'finish_reason':'tool_calls','message':{
                'tool_calls':[{'function':{'name':'generate_excel_sheet','arguments':json.dumps({
                    'questions':[self.row()], 'unresolved':[]})}}]}}]})
        with tempfile.TemporaryDirectory() as tmp, patch.dict('os.environ', {'OPENROUTER_API_KEY':'test'}):
            path = Path(tmp) / 'markdown.md'
            path.write_text('<!-- source page 1 -->\n\n1. What is 2+2?\nA. 4\nB. 5\n')
            config = {'openrouter_enabled':True,'openrouter_model':'test/model'}
            with httpx.Client(transport=httpx.MockTransport(respond)) as client:
                bank = structure(path, 'source', config, client)
                structure(path, 'source', config, client)
                self.assertEqual(len(calls), 1)
                path.write_text(path.read_text() + '\nExtra source context\n')
                structure(path, 'source', config, client)
                self.assertEqual(len(calls), 2)
            row = json.loads(bank.read_text())['questions'][0]
            self.assertEqual(row['correct_answer'], '')
            self.assertEqual(row['review_status'], 'pending')

    def test_missing_credentials_does_not_call_model(self):
        self.assertIsNone(structure(Path('does-not-exist'), 'source', {'openrouter_enabled':False}))

    def test_invented_source_or_chart_rejected(self):
        row = self.row()
        with self.assertRaises(ValueError):
            validate({'questions':[row],'unresolved':[]}, {'page':1,'text':'unrelated'}, '')
        row['diagram_markdown'] = 'invented chart'
        with self.assertRaises(ValueError):
            validate({'questions':[row],'unresolved':[]}, {'page':1,'text':row['source_quote']}, row['source_quote'])

    def test_fence_not_split_and_oversized_block_fails(self):
        text = '<!-- source page 1 -->\n\n' + 'a' * 900 + '\n\n```mermaid\npie\n"A" : 2\n```\n'
        plan = chunks(text, 1000)
        self.assertTrue(any('```mermaid\npie\n"A" : 2\n```' in chunk['text'] for chunk in plan))
        with self.assertRaises(ValueError):
            chunks('<!-- source page 1 -->\n' + 'a' * 2000, 1000)
