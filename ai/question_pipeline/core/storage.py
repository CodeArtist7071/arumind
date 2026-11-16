"""Local state helpers owned by the independent question pipeline."""
import hashlib
import json
import os
from contextlib import contextmanager
from pathlib import Path


BASE = Path(__file__).resolve().parents[1]
DATA = BASE / 'data'
OUTPUTS = BASE / 'outputs'


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
    temporary.replace(path)


def read_json(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else default


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def content(row):
    fields = ('question_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d',
              'correct_answer', 'explanation', 'subject', 'topic', 'source_file', 'source_page')
    result = {key: row.get(key, '') for key in fields}
    result.update({key: value for key, value in row.items()
                   if key not in ('review_status', 'review_notes') and key not in result})
    return result


@contextmanager
def pipeline_lock(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a+b') as stream:
        if path.stat().st_size == 0:
            stream.write(b'0'); stream.flush()
        stream.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            raise RuntimeError('Another question pipeline is already running') from error
        try:
            yield
        finally:
            stream.seek(0)
            if os.name == 'nt':
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
