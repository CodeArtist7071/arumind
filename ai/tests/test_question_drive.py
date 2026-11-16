import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from question_pipeline.ingestion.drive import download_one, filename
from question_pipeline.core.storage import read_json


class DownloadTests(unittest.TestCase):
    def test_resume_skip_corruption_and_remote_change(self):
        payload = b'%PDF-1.7\n' + b'content' * 10
        remote = {'id': 'abc', 'name': 'book.pdf', 'size': str(len(payload)), 'version': '1',
                  'modifiedTime': 'today', 'md5Checksum': hashlib.md5(payload).hexdigest()}
        calls = []
        interrupted = True
        def fetch(document, start, end):
            calls.append(start)
            if interrupted and start > 0:
                raise KeyboardInterrupt()
            return payload[start:end+1]
        with tempfile.TemporaryDirectory() as tmp, patch('question_pipeline.ingestion.drive.CHUNK', 16):
            root = Path(tmp)
            state = root / 'downloads.json'
            with self.assertRaises(KeyboardInterrupt):
                download_one(remote, root, {}, state, fetch, lambda identity: remote)
            interrupted = False
            ledger = read_json(state)
            # A second stop before receiving the next range must preserve the prefix.
            with self.assertRaises(KeyboardInterrupt):
                download_one(remote, root, ledger, state,
                             lambda *args: (_ for _ in ()).throw(KeyboardInterrupt()), lambda identity: remote)
            ledger = read_json(state)
            target = download_one(remote, root, ledger, state, fetch, lambda identity: remote)
            self.assertEqual(calls[:3], [0,16,16])
            self.assertEqual(target.read_bytes(), payload)
            count = len(calls)
            download_one(remote, root, ledger, state, fetch, lambda identity: remote)
            self.assertEqual(len(calls), count)
            remote['version'] = '2'; remote['name'] = 'renamed.pdf'
            download_one(remote, root, ledger, state, fetch, lambda identity: remote)
            self.assertEqual(len(calls), count)
            target.write_bytes(b'broken')
            download_one(remote, root, ledger, state, fetch, lambda identity: remote)
            self.assertGreater(len(calls), count)
            self.assertEqual(target.read_bytes(), payload)

    def test_same_name_different_id_has_distinct_path(self):
        self.assertNotEqual(filename({'id':'one','name':'book.pdf'}), filename({'id':'two','name':'book.pdf'}))
