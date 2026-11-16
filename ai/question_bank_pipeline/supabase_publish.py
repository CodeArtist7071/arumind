"""Review-gated, single-request publishing to public.questions. No schema changes."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID, uuid5

from .question_gate import PUBLISH_FIELDS, gate, read_questions, write_json


def uuid_value(value, field: str, optional=False):
    if optional and value in (None, ""):
        return None
    try:
        parsed = UUID(str(value))
        if parsed.int == 0:
            raise ValueError()
        return str(parsed)
    except (ValueError, TypeError, AttributeError) as error:
        raise ValueError(f"{field} requires a nonzero UUID") from error


def numeric(value, field: str):
    try:
        if isinstance(value, bool):
            raise ValueError()
        number = Decimal(str(value))
        if not number.is_finite() or not 0 <= number <= Decimal('999999.99'):
            raise ValueError()
        if number != number.quantize(Decimal('0.01')):
            raise ValueError()
        return float(number)
    except (InvalidOperation, ValueError) as error:
        raise ValueError(f"{field} must be numeric(8,2), nonnegative, with at most two decimal places") from error


def boolean(value, field):
    if type(value) is not bool:
        raise ValueError(f"{field} must be a boolean, not text or a number")
    return value


def positive_integer(value, field, optional=False):
    if optional and value in (None, ""):
        return None
    try:
        number = Decimal(str(value))
        if not number.is_finite() or number != number.to_integral_value() or not 1 <= number <= 2147483647:
            raise ValueError()
        return int(number)
    except (InvalidOperation, ValueError) as error:
        raise ValueError(f"{field} must be a positive PostgreSQL integer") from error


def project_url(url: str) -> str:
    parsed = urlsplit(url)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or parsed.path not in ('', '/')):
        raise ValueError('SUPABASE_URL must be an HTTPS project origin without a path, credentials or query')
    return url.rstrip('/')


def map_rows(rows: list[dict], config: dict) -> list[dict]:
    if not isinstance(config, dict):
        raise ValueError('Mapping must be a JSON object')
    allowed = {'dataset_id', 'options_format', 'correct_answer_format', 'defaults', 'overrides'}
    if set(config) - allowed:
        raise ValueError(f"Unknown mapping fields: {sorted(set(config) - allowed)}")
    namespace = UUID(uuid_value(config.get('dataset_id'), 'dataset_id'))
    option_format = config.get('options_format')
    if option_format not in ('label_map', 'label_text_list'):
        raise ValueError('Set options_format explicitly to label_map or label_text_list')
    answer_format = config.get('correct_answer_format')
    if answer_format not in ('label', 'text'):
        raise ValueError('Set correct_answer_format explicitly to label or text')
    defaults, overrides = config.get('defaults', {}), config.get('overrides', {})
    if not isinstance(defaults, dict) or not isinstance(overrides, dict):
        raise ValueError('defaults and overrides must be JSON objects')
    ids = {row['question_id'] for row in rows}
    if set(overrides) - ids:
        raise ValueError('Mapping overrides contain IDs absent from this workbook')
    result = []
    for row in rows:
        override = overrides.get(row['question_id'], {})
        if not isinstance(override, dict):
            raise ValueError('Each question override must be an object')
        if (set(defaults) | set(override)) - set(PUBLISH_FIELDS):
            raise ValueError('Mapping contains unsupported metadata fields')
        # Explicit per-question overrides > populated Excel metadata > batch defaults.
        meta = {**defaults, **{key: row[key] for key in PUBLISH_FIELDS
                              if row.get(key) is not None and row.get(key) != ''}, **override}
        if meta.get('question_type', 'SINGLE_CHOICE') != 'SINGLE_CHOICE':
            raise ValueError('Current reviewed-bank format supports SINGLE_CHOICE only')
        difficulty = meta.get('difficulty_level', 'MODERATE')
        if difficulty not in ('EASY', 'MODERATE', 'HARD'):
            raise ValueError('Invalid difficulty_level')
        diagram = boolean(meta.get('diagram_present', False), 'diagram_present')
        diagram_url = meta.get('diagram_url')
        if diagram_url == '':
            diagram_url = None
        if diagram:
            if not isinstance(diagram_url, str) or urlsplit(diagram_url).scheme != 'https' or not urlsplit(diagram_url).hostname:
                raise ValueError('A diagram question requires an HTTPS diagram_url')
        elif diagram_url is not None:
            raise ValueError('diagram_url is populated but diagram_present is false')
        snippet = meta.get('source_snippet')
        if snippet == '':
            snippet = None
        if snippet is not None and not isinstance(snippet, str):
            raise ValueError('source_snippet must be text')
        options = {label: row[f'option_{label.lower()}'] for label in 'ABCD'}
        target = {
            'id': str(uuid5(namespace, row['question_id'])),
            'exam_id': uuid_value(meta.get('exam_id'), 'exam_id'),
            'subject_id': uuid_value(meta.get('subject_id'), 'subject_id'),
            'chapter_id': uuid_value(meta.get('chapter_id'), 'chapter_id'),
            'pdf_id': uuid_value(meta.get('pdf_id'), 'pdf_id', optional=True),
            'paper_set': uuid_value(meta.get('paper_set'), 'paper_set', optional=True),
            'question_text': row['question'],
            'options': options if option_format == 'label_map' else [
                {'label': label, 'text': text} for label, text in options.items()],
            'correct_answer': row['correct_answer'] if answer_format == 'label' else options[row['correct_answer']],
            'explanation': row.get('explanation') or None,
            'difficulty_level': difficulty,
            'marks': numeric(meta.get('marks', 1), 'marks'),
            'negative_marks': numeric(meta.get('negative_marks', 0), 'negative_marks'),
            'is_active': boolean(meta.get('is_active', True), 'is_active'),
            'page_number': positive_integer(row['source_page'], 'page_number'),
            'question_number': positive_integer(meta.get('question_number'), 'question_number', optional=True),
            'question_type': 'SINGLE_CHOICE', 'diagram_present': diagram,
            'diagram_url': diagram_url, 'source_snippet': snippet,
        }
        result.append(target)
    if len({row['id'] for row in result}) != len(result):
        raise ValueError('Duplicate mapped UUIDs')
    return result


def encode(value) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode('utf-8')


def prepare(workbook: Path, approvals_path: Path, mapping: Path, url: str) -> dict:
    rows = read_questions(workbook)
    approvals = json.loads(approvals_path.read_text(encoding='utf-8'))
    report = gate(rows, approvals)
    if not report['ready']:
        raise ValueError('Review gate blocked upload: ' + json.dumps(report['issues']))
    config = json.loads(mapping.read_text(encoding='utf-8'))
    mapped = map_rows(rows, config)
    target = project_url(url) + '/rest/v1/questions'
    digest = hashlib.sha256(encode({'target': target, 'rows': mapped})).hexdigest()
    return {'ready': True, 'target': target, 'payload_sha256': digest, 'question_count': len(mapped), 'questions': mapped}


def upload(preview: dict, expected_sha256: str, *, transport=None) -> dict:
    import httpx

    actual = hashlib.sha256(encode({'target': preview['target'], 'rows': preview['questions']})).hexdigest()
    if not preview.get('ready') or actual != expected_sha256 or actual != preview.get('payload_sha256'):
        raise ValueError('Payload/target changed; prepare and review the new preview before uploading')
    payload = encode(preview['questions'])
    if len(payload) > 10 * 1024 * 1024:
        raise ValueError('Payload exceeds the 10 MiB single-request limit. Use a transactional server importer; no partial batches were sent.')
    key = os.environ.get('SUPABASE_SECRET_KEY')
    legacy = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') if not key else None
    if not key and not legacy:
        raise ValueError('Set SUPABASE_SECRET_KEY (backend only) or a legacy SUPABASE_SERVICE_ROLE_KEY')
    headers = {'apikey': key or legacy, 'Content-Type': 'application/json', 'Content-Profile': 'public',
               'Prefer': 'resolution=merge-duplicates,return=minimal'}
    if legacy:
        headers['Authorization'] = f'Bearer {legacy}'
    # One request means one PostgREST transaction. No redirects, automatic retries or partial batches.
    try:
        with httpx.Client(timeout=120, follow_redirects=False, transport=transport) as client:
            response = client.post(preview['target'], params={'on_conflict': 'id'}, headers=headers, content=payload)
    except httpx.RequestError as error:
        raise RuntimeError('Upload outcome unknown due to a transport failure. Check the database before retrying the same stable IDs.') from error
    if response.status_code not in (200, 201, 204):
        # Do not print the request headers, key, or potentially sensitive server response.
        raise RuntimeError(f'Supabase returned HTTP {response.status_code}; no success recorded. Check database/API logs before retrying.')
    return {'status': 'submitted', 'question_count': len(preview['questions']),
            'target': preview['target'], 'payload_sha256': actual,
            'submitted_at': datetime.now(timezone.utc).isoformat(), 'http_status': response.status_code}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prepare', 'upload'])
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--approvals', required=True, type=Path)
    parser.add_argument('--mapping', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path, help='Preview or upload receipt; must be separate from inputs')
    parser.add_argument('--expected-sha256', help='Exact hash from the reviewed prepare preview; required for upload')
    args = parser.parse_args()
    if args.output.resolve() in {path.resolve() for path in (args.workbook, args.approvals, args.mapping)}:
        parser.error('Output must not overwrite an input')
    if args.command == 'upload' and not args.expected_sha256:
        parser.error('upload requires --expected-sha256 from a reviewed prepare result')
    write_json(args.output, {'ready': False, 'status': 'not_completed', 'questions': []})
    try:
        # Always derive from current workbook and ledger, never trust an exported ready flag.
        preview = prepare(args.workbook, args.approvals, args.mapping, os.environ.get('SUPABASE_URL', ''))
        result = preview if args.command == 'prepare' else upload(preview, args.expected_sha256)
        write_json(args.output, result)
    except (ValueError, OSError, RuntimeError, KeyError) as error:
        write_json(args.output, {'ready': False, 'status': 'failed_or_unconfirmed', 'questions': [], 'error': str(error)})
        parser.exit(1, str(error) + '\n')
    print(json.dumps({key: value for key, value in result.items() if key != 'questions'}, indent=2))


if __name__ == '__main__':
    main()
