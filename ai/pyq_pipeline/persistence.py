from __future__ import annotations

import json
import sqlite3
from pathlib import Path


class StateStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY, hash TEXT, status TEXT, error TEXT, attempts INTEGER NOT NULL DEFAULT 0)")
            db.execute("CREATE TABLE IF NOT EXISTS records(record_id TEXT PRIMARY KEY, file_path TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL)")
            db.execute("CREATE INDEX IF NOT EXISTS records_file ON records(file_path)")
            db.execute("CREATE TABLE IF NOT EXISTS answer_keys(key_id TEXT PRIMARY KEY, file_path TEXT NOT NULL, payload TEXT NOT NULL)")

    def _connect(self):
        db = sqlite3.connect(self.path, timeout=30)
        db.row_factory = sqlite3.Row
        return db

    def file_status(self, path):
        with self._connect() as db:
            row = db.execute("SELECT * FROM files WHERE path=?", (str(path),)).fetchone()
        return dict(row) if row else None

    def set_file(self, path, digest, status, error=None):
        with self._connect() as db:
            db.execute("INSERT INTO files(path,hash,status,error,attempts) VALUES(?,?,?,?,1) ON CONFLICT(path) DO UPDATE SET hash=excluded.hash,status=excluded.status,error=excluded.error,attempts=files.attempts+1", (str(path), digest, status, error))

    def save_records(self, records, keys, path, digest):
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM records WHERE file_path=?", (str(path),))
            for record in records:
                db.execute("INSERT OR REPLACE INTO records(record_id,file_path,payload,status) VALUES(?,?,?,?)", (record["record_id"], str(path), json.dumps(record, ensure_ascii=False), record.get("extraction_status", "needs_review")))
            db.execute("DELETE FROM answer_keys WHERE file_path=?", (str(path),))
            for i, key in enumerate(keys):
                key_id = f"{digest}:{key.get('source_offset',i)}"
                db.execute("INSERT OR REPLACE INTO answer_keys(key_id,file_path,payload) VALUES(?,?,?)", (key_id, str(path), json.dumps(key, ensure_ascii=False)))
            db.execute("INSERT INTO files(path,hash,status,error,attempts) VALUES(?,?,?,NULL,1) ON CONFLICT(path) DO UPDATE SET hash=excluded.hash,status=excluded.status,error=NULL,attempts=files.attempts+1", (str(path), digest, "complete"))

    def iter_records(self):
        with self._connect() as db:
            cursor = db.execute("SELECT payload FROM records ORDER BY file_path,record_id")
            for row in cursor:
                yield json.loads(row[0])

    def iter_answer_keys(self):
        with self._connect() as db:
            cursor = db.execute("SELECT payload FROM answer_keys ORDER BY file_path,key_id")
            for row in cursor:
                yield json.loads(row[0])

    def write_jsonl(self, output_path: Path):
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = output_path.with_name(output_path.name + ".partial")
        with temporary.open("w", encoding="utf-8", newline="\n") as stream:
            for record in self.iter_records():
                stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
        temporary.replace(output_path)

    def update_record(self, record):
        with self._connect() as db:
            db.execute("UPDATE records SET payload=?,status=? WHERE record_id=?", (json.dumps(record, ensure_ascii=False), record.get("extraction_status", "needs_review"), record["record_id"]))

    def get_record(self, record_id):
        with self._connect() as db:
            row = db.execute("SELECT payload FROM records WHERE record_id=?", (record_id,)).fetchone()
        return json.loads(row[0]) if row else None

    def count_records(self):
        with self._connect() as db:
            return db.execute("SELECT COUNT(*) FROM records").fetchone()[0]

    def summary(self):
        with self._connect() as db:
            files = [dict(r) for r in db.execute("SELECT status,COUNT(*) AS count FROM files GROUP BY status")]
            records = [dict(r) for r in db.execute("SELECT status,COUNT(*) AS count FROM records GROUP BY status")]
            errors = [dict(r) for r in db.execute("SELECT path,error,attempts FROM files WHERE status='failed'")]
        return {"files": files, "records": records, "failed_files": errors, "total_records": self.count_records()}
