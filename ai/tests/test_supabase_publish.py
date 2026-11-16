import copy
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx

from dataset_pipeline.question_gate import fingerprint
from dataset_pipeline.supabase_publish import encode, map_rows, prepare, project_url, upload
from test_question_pipeline import sample, approvals


EXAM = 'b1b9ce80-a9a5-4b74-93a8-f1f5557b0311'
SUBJECT = 'b1b9ce80-a9a5-4b74-93a8-f1f5557b0312'
CHAPTER = 'b1b9ce80-a9a5-4b74-93a8-f1f5557b0313'


def config():
    return {'dataset_id': '54b598ad-db72-4c0f-9db6-1c7d76ecae00',
            'options_format': 'label_map', 'correct_answer_format': 'label',
            'defaults': {'exam_id': EXAM, 'subject_id': SUBJECT, 'chapter_id': CHAPTER},
            'overrides': {}}


def preview():
    value = {'ready': True, 'target': 'https://example.supabase.co/rest/v1/questions',
             'questions': map_rows([sample()], config())}
    value['payload_sha256'] = hashlib.sha256(encode({'target': value['target'], 'rows': value['questions']})).hexdigest()
    return value


class SupabaseMappingTests(unittest.TestCase):
    def test_schema_mapping_preserves_db_managed_fields(self):
        mapped = map_rows([sample()], config())[0]
        self.assertEqual(mapped['question_text'], 'Two plus two?')
        self.assertEqual(mapped['options'], {'A':'1','B':'2','C':'3','D':'4'})
        self.assertEqual(mapped['correct_answer'], 'D')
        self.assertEqual(mapped['page_number'], 1)
        self.assertEqual(mapped['difficulty_level'], 'MODERATE')
        self.assertTrue({'created_at', 'updated_at', 'embedding'}.isdisjoint(mapped))

    def test_ids_stable_across_corrections(self):
        original = map_rows([sample()], config())[0]['id']
        corrected = map_rows([{**sample(), 'question':'Corrected text'}], config())[0]['id']
        self.assertEqual(original, corrected)
        changed = map_rows([{**sample(), 'question_id':'test-2'}], config())[0]['id']
        self.assertNotEqual(original, changed)

    def test_explicit_json_formats(self):
        settings = {**config(), 'options_format':'label_text_list', 'correct_answer_format':'text'}
        mapped = map_rows([sample()], settings)[0]
        self.assertEqual(mapped['options'][3], {'label':'D','text':'4'})
        self.assertEqual(mapped['correct_answer'], '4')
        with self.assertRaises(ValueError):
            map_rows([sample()], {**config(), 'options_format':None})

    def test_overrides_and_review_hash(self):
        row = {**sample(), 'marks': 2, 'chapter_id': SUBJECT}
        settings = config()
        settings['overrides'] = {'test-1': {'marks': 3}}
        mapped = map_rows([row], settings)[0]
        self.assertEqual(mapped['marks'], 3)
        self.assertEqual(mapped['chapter_id'], SUBJECT)
        self.assertNotEqual(fingerprint(row), fingerprint(sample()))
        self.assertEqual(fingerprint(sample()), fingerprint({**sample(), 'pdf_id': ''}))

    def test_invalid_schema_metadata_rejected(self):
        for changes in ({'marks': -1}, {'marks': 1.234}, {'marks': 1000000},
                        {'negative_marks': 'NaN'}, {'exam_id': None}, {'subject_id':'invalid'},
                        {'is_active':'true'}, {'difficulty_level':'AVERAGE'},
                        {'question_type':'MULTIPLE_CHOICE'}, {'diagram_present':True},
                        {'question_number': 0}, {'embedding':[]}):
            with self.subTest(changes=changes):
                settings = config()
                settings['defaults'].update(changes)
                with self.assertRaises(ValueError):
                    map_rows([sample()], settings)

    def test_prepare_rechecks_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ledger, mapping = root/'approvals.json', root/'mapping.json'
            ledger.write_text(json.dumps(approvals([sample()])))
            mapping.write_text(json.dumps(config()))
            with patch('doc_pipeline.supabase_publish.read_questions', return_value=[sample()]):
                result = prepare(root/'bank.xlsx', ledger, mapping, 'https://example.supabase.co')
                self.assertTrue(result['ready'])
            with patch('doc_pipeline.supabase_publish.read_questions', return_value=[{**sample(), 'question':'Edited'}]):
                with self.assertRaisesRegex(ValueError, 'Review gate'):
                    prepare(root/'bank.xlsx', ledger, mapping, 'https://example.supabase.co')

    def test_insecure_or_credential_url_rejected(self):
        for url in ('http://example.com','https://key@example.com','https://example.com/path','https://example.com?key=x'):
            with self.assertRaises(ValueError):
                project_url(url)


class SupabaseUploadTests(unittest.TestCase):
    def test_one_request_to_expected_table(self):
        calls = []
        def handler(request):
            calls.append(request)
            self.assertEqual(request.url.path, '/rest/v1/questions')
            self.assertEqual(request.url.params['on_conflict'], 'id')
            self.assertEqual(request.headers['apikey'], 'test-secret')
            self.assertNotIn('authorization', request.headers)
            self.assertEqual(json.loads(request.content)[0]['exam_id'], EXAM)
            return httpx.Response(201)
        data = preview()
        with patch.dict(os.environ, {'SUPABASE_SECRET_KEY': 'test-secret'}, clear=True):
            receipt = upload(data, data['payload_sha256'], transport=httpx.MockTransport(handler))
        self.assertEqual(len(calls), 1)
        self.assertEqual(receipt['status'], 'submitted')

    def test_changed_target_and_payload_never_sent(self):
        for field in ('target','questions'):
            data = preview()
            if field == 'target':
                data['target'] = 'https://another.supabase.co/rest/v1/questions'
            else:
                data['questions'][0]['chapter_id'] = SUBJECT
            with self.assertRaisesRegex(ValueError, 'changed'):
                upload(data, data['payload_sha256'])

    def test_database_rejection_not_retried(self):
        calls = []
        def handler(request):
            calls.append(request)
            return httpx.Response(409)
        data = preview()
        with patch.dict(os.environ, {'SUPABASE_SECRET_KEY':'test-secret'}, clear=True):
            with self.assertRaisesRegex(RuntimeError, '409'):
                upload(data, data['payload_sha256'], transport=httpx.MockTransport(handler))
        self.assertEqual(len(calls), 1)

    def test_transport_failure_reports_unknown_outcome(self):
        def handler(request):
            raise httpx.ReadTimeout('Synthetic timeout', request=request)
        data = preview()
        with patch.dict(os.environ, {'SUPABASE_SECRET_KEY':'test-secret'}, clear=True):
            with self.assertRaisesRegex(RuntimeError, 'outcome unknown'):
                upload(data, data['payload_sha256'], transport=httpx.MockTransport(handler))
