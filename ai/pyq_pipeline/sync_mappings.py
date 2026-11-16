"""Synchronize the PYQ taxonomy from read-only Supabase REST tables."""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID

import httpx


ROOT = Path(__file__).resolve().parent
PAGE_SIZE = 500
TABLES = {
    "exams": ("exams", "id,name,full_name,is_active,exam_board_id,type"),
    "subjects": ("subjects", "id,name,is_active,display_order"),
    "chapters": ("chapters", "id,name,subject_id,is_active,exam_type,display_order"),
    "topics": ("topics", "id,name,chapter_id,subject_id,is_active"),
}


def _project_url(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise ValueError("SUPABASE_URL must be an HTTPS project origin")
    return value.rstrip("/")


def _fetch(client: httpx.Client, base: str, key: str, table: str, columns: str):
    result = []
    start = 0
    while True:
        response = client.get(f"{base}/rest/v1/{table}",
                              params={"select": columns, "order": "name.asc"},
                              headers={"apikey": key, "Accept": "application/json",
                                       "Range": f"{start}-{start + PAGE_SIZE - 1}"})
        if response.status_code == 404 and table == "topics":
            return None
        if response.status_code not in (200, 206):
            # Do not echo server response bodies or any request headers.
            raise RuntimeError(f"Supabase read of public.{table} failed with HTTP {response.status_code}")
        try:
            batch = response.json()
        except ValueError as error:
            raise RuntimeError(f"Supabase public.{table} returned non-JSON data") from error
        if not isinstance(batch, list):
            raise RuntimeError(f"Supabase public.{table} response was not a row array")
        result.extend(batch)
        if len(batch) < PAGE_SIZE:
            return result
        start += len(batch)


def _entry(kind: str, row: dict) -> dict:
    identifier = str(UUID(str(row.get("id"))))
    name = str(row.get("name") or "").strip()
    if not name:
        raise ValueError(f"public.{kind} contains a row without a name")
    entry = {"id": identifier, "canonical_name": name,
             "aliases": [], "is_active": row.get("is_active") is not False}
    if kind == "exams":
        full = str(row.get("full_name") or "").strip()
        if full and full.casefold() != name.casefold():
            entry["aliases"].append(full)
        for field in ("exam_board_id", "type"):
            if row.get(field) is not None:
                entry[field] = row[field]
    elif kind == "chapters":
        if row.get("subject_id"):
            entry["subject_id"] = str(UUID(str(row["subject_id"])))
        for field in ("exam_type",):
            if row.get(field) is not None:
                entry[field] = row[field]
    elif kind == "topics":
        for field in ("chapter_id", "subject_id"):
            if row.get(field):
                entry[field] = str(UUID(str(row[field])))
    return entry


def sync() -> dict:
    base = _project_url(os.environ.get("SUPABASE_URL", "").strip())
    key = os.environ.get("SUPABASE_ANON_KEY", "").strip()
    if not key:
        raise ValueError("Set SUPABASE_ANON_KEY to a SELECT-capable client key")
    data = {}
    for kind, (table, columns) in TABLES.items():
        with httpx.Client(timeout=30, follow_redirects=False) as client:
            rows = _fetch(client, base, key, table, columns)
        unavailable = rows is None
        entries = [] if unavailable else [_entry(kind, row) for row in rows]
        data[kind] = {kind: entries, "source_table": f"public.{table}" if not unavailable else None,
                      "note": "Table is not exposed through the Supabase REST API" if unavailable else None,
                      "synced_at": datetime.now(timezone.utc).isoformat(),
                      "active_count": sum(1 for item in entries if item["is_active"]),
                      "record_count": len(entries)}

    # Preserve any manually curated aliases for IDs that remain in the upstream catalog.
    for kind in TABLES:
        target = ROOT / "config" / f"{kind}.json"
        if target.exists():
            try:
                previous = json.loads(target.read_text(encoding="utf-8-sig")).get(kind, [])
            except (ValueError, OSError):
                previous = []
            previous_by_id = {str(item.get("id")): item for item in previous if isinstance(item, dict) and item.get("id")}
            for item in data[kind][kind]:
                existing = previous_by_id.get(item["id"], {})
                aliases = list(item.get("aliases", [])) + list(existing.get("aliases", []))
                item["aliases"] = sorted({str(alias).strip() for alias in aliases if str(alias).strip()}, key=str.casefold)

    ROOT.joinpath("config").mkdir(parents=True, exist_ok=True)
    staged = []
    try:
        for kind, config in data.items():
            path = ROOT / "config" / f"{kind}.json"
            temp = path.with_suffix(path.suffix + ".sync-tmp")
            temp.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            staged.append((temp, path))
        for temp, path in staged:
            temp.replace(path)
    finally:
        for temp, _ in staged:
            temp.unlink(missing_ok=True)
    return {kind: {"records": config["record_count"], "active": config["active_count"],
                   "source_table": config["source_table"]} for kind, config in data.items()}


def main() -> int:
    result = sync()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
