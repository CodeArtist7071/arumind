"""Prepare saved Markdown for text embeddings without changing source files."""
import argparse
import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
DEFAULT_INPUTS = [ROOT / 'outputs/question-bank', ROOT / 'question_pipeline/data/outputs',
                  ROOT / 'dataset_pipeline2/data/question-bank']
IMAGE = re.compile(r'!\[([^\]]*)\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)')
PAGE = re.compile(r'<!--\s*source page (\d+)\s*-->')
HEADING = re.compile(r'^(#{1,6})\s+(.+)$')
QUESTION = re.compile(r'^\s*(?:Q(?:uestion)?\.?\s*)?\d{1,5}[.)]\s+', re.I)


def digest(value):
    return hashlib.sha256(value).hexdigest()


def atomic_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(text, encoding='utf-8')
    temporary.replace(path)


def discover(roots):
    found = set()
    skipped = []
    for root in roots:
        if not root.exists():
            continue
        candidates = [root] if root.is_file() else list(root.rglob('markdown.md'))
        for path in candidates:
            if path.suffix.lower() != '.md':
                continue
            # Do not read incomplete OCR chunk writes.
            if path.parent.parent.name == 'chunks' and not (path.parent / 'complete.json').is_file():
                skipped.append(str(path))
                continue
            # Per-page question-pipeline links are relative to the merged document.
            if path.parent.parent.name == 'pages':
                continue
            found.add(path.resolve())
    return [p for p in sorted(found) if not any(a / 'markdown.md' in found for a in p.parent.parents)], skipped


def paragraphs(text):
    """Do not split fenced code/Mermaid or display math at blank lines."""
    current = []
    fence = None
    math_block = False
    for line in text.splitlines():
        stripped = line.strip()
        marker = re.match(r'^(`{3,}|~{3,})', stripped)
        if marker and not math_block:
            if fence is None:
                fence = marker[1]
            elif stripped.startswith(fence[0] * len(fence)):
                fence = None
        if stripped == '$$' and fence is None:
            math_block = not math_block
        if not stripped and not fence and not math_block:
            if current:
                yield '\n'.join(current)
                current = []
        else:
            current.append(line.rstrip())
    if current:
        yield '\n'.join(current)


def source_info(path, source_hash):
    info = {'markdown_file': str(path), 'sha256': source_hash, 'page_range': None}
    for parent in path.parents:
        manifest = parent / 'manifest.json'
        if manifest.is_file():
            state = json.loads(manifest.read_text(encoding='utf-8'))
            info.update(source_file=state.get('source_file'), source_sha256=state.get('source_sha256'),
                        extraction_complete=state.get('complete', False))
            break
    if path.parent.parent.name == 'chunks':
        match = re.fullmatch(r'(\d+)-(\d+)', path.parent.name)
        if match:
            info['page_range'] = [int(match[1]), int(match[2])]
    return info


def records_for_file(path, removals, target_chars, boundary_counts):
    original = path.read_bytes()
    text = original.decode('utf-8-sig').replace('\r\n', '\n')
    source = source_info(path, digest(original))
    headings = []
    page = None
    buffer = []
    pages = set()
    question = False
    output = []
    changes = []

    def flush():
        nonlocal buffer, pages, question
        if buffer:
            output.append({'text': '\n\n'.join(buffer), 'heading_path': list(headings),
                           'source': {**source, 'pages': sorted(pages)}, 'possible_question': question})
        buffer, pages, question = [], set(), False

    # Page comments must be their own unit, even when no surrounding blank lines exist.
    text = PAGE.sub(lambda m: '\n\n' + m[0] + '\n\n', text)
    for block in paragraphs(text):
        page_match = PAGE.fullmatch(block.strip())
        if page_match:
            page = int(page_match[1])
            continue
        heading = HEADING.fullmatch(block.strip())
        if heading:
            flush()
            depth = len(heading[1])
            headings = headings[:depth - 1] + [heading[2].strip()]
            continue
        protected = block.lstrip().startswith(('```', '~~~', '$$', '\\[')) or '|' in block
        if not protected:
            for phrase in removals:
                updated, count = re.subn(re.escape(phrase), '', block, flags=re.I)
                if count:
                    changes.append({'phrase': phrase, 'occurrences': count})
                block = updated
            # Only explicit page labels, never bare numbers/formulas/question numbers.
            if re.fullmatch(r'\s*(?:page|p\.)\s+\d+(?:\s+(?:of|/)\s+\d+)?\s*', block, re.I):
                changes.append({'removed_page_label': block})
                continue
        if not block.strip() or block.strip() in ('---', '***'):
            continue
        # A numbered block is conservatively kept with options/answers until the
        # next numbered block or heading. Oversized units go to review, not truncation.
        starts_question = bool(QUESTION.match(block)) and not protected
        if starts_question or (not question and buffer and sum(len(b) for b in buffer) + len(block) > target_chars):
            # Keep an image-only introduction with its following question/context.
            if not all(IMAGE.sub('', b).strip() == '' for b in buffer):
                flush()
        question = question or starts_question
        buffer.append(block.strip())
        if page is not None:
            pages.add(page)
        if len(block) <= 120 and not protected and not starts_question:
            boundary_counts[block.strip()].add(str(path))
    flush()
    if path.read_bytes() != original:
        raise RuntimeError(f'Source changed during preparation: {path}. Rerun after its write finishes.')
    return output, {'source': source, 'changes': changes}


def images_for(text, source):
    images = []
    for match in IMAGE.finditer(text):
        reference = match[2].strip('<>')
        parsed = urlparse(reference)
        item = {'reference': reference, 'alt_text': match[1], 'description_verified': False}
        if parsed.scheme in ('http', 'https', 'data'):
            item['status'] = 'remote_not_fetched'
        else:
            path = (Path(source['markdown_file']).parent / unquote(reference)).resolve()
            item.update(path=str(path), status='local' if path.is_file() else 'missing')
        images.append(item)
    return images


def prepare(roots, output, removals=(), target_chars=2400):
    if target_chars < 200 or any(not phrase.strip() for phrase in removals):
        raise ValueError('Use target_chars >= 200 and nonempty removal phrases')
    files, skipped = discover(roots)
    if not files:
        raise ValueError('No committed Markdown found. Pass a Markdown file or extraction folder.')
    unique = {}
    boundaries = defaultdict(set)
    audits = []
    total = 0
    for path in files:
        rows, audit = records_for_file(path, removals, target_chars, boundaries)
        audits.append(audit)
        for row in rows:
            total += 1
            source = row.pop('source')
            images = images_for(row['text'], source)
            flags = []
            if images:
                flags.append('image_description_required')
            if any(i['status'] == 'missing' for i in images):
                flags.append('missing_image')
            if '![' in row['text'] and not images:
                flags.append('unsupported_image_syntax')
            if len(row['text']) > target_chars * 2:
                flags.append('oversized_semantic_unit')
            if '\ufffd' in row['text']:
                flags.append('encoding_replacement_character')
            if '```mermaid' in row['text']:
                flags.append('chart_data_needs_review')
            if len(row['text'].strip()) < 80:
                flags.append('short_context')
            # Preserve source image identity so different diagrams never deduplicate
            # simply because both use the same relative filename.
            identity = {'text': row['text'], 'headings': row['heading_path'], 'images': images}
            key = digest(json.dumps(identity, sort_keys=True, ensure_ascii=False).encode())
            if key in unique:
                if source not in unique[key]['sources']:
                    unique[key]['sources'].append(source)
                continue
            embedding_text = '\n'.join(row['heading_path']) + '\n\n' + IMAGE.sub('[Image requires description]', row['text'])
            unique[key] = {'id': key, **row, 'embedding_text': embedding_text.strip(), 'images': images,
                'sources': [source], 'estimated_tokens': math.ceil(len(embedding_text) / 4),
                'quality_flags': flags, 'review_status': 'pending',
                'route': 'review' if flags else 'text_candidate'}
        print(f'Prepared: {path.name} ({len(rows)} chunks)', flush=True)
    records = list(unique.values())
    payload = '\n'.join(json.dumps(row, ensure_ascii=False) for row in records) + '\n'
    version = digest((payload + json.dumps({'audit': audits, 'removals': list(removals),
                                           'target_chars': target_chars}, sort_keys=True)).encode())[:16]
    destination = output / version
    # Immutable-by-convention generated snapshots; keep prior versions/manual review elsewhere.
    if destination.exists():
        version_file = destination / 'chunks.jsonl'
        if version_file.is_file() and version_file.read_text(encoding='utf-8') != payload:
            raise RuntimeError(f'Existing dataset differs; preserving it: {destination}')
    atomic_text(destination / 'chunks.jsonl', payload)
    for route, name in (('text_candidate', 'text_candidates.jsonl'), ('review', 'needs_review.jsonl')):
        atomic_text(destination / name, ''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in records if row['route'] == route))
    report = {'version': version, 'source_files': len(files), 'chunks': len(records),
              'duplicates_merged': total - len(records), 'text_candidates': sum(r['route'] == 'text_candidate' for r in records),
              'needs_review': sum(r['route'] == 'review' for r in records), 'skipped_unfinished_files': skipped,
              'repeated_text_suggestions': [{'text': text, 'file_count': len(paths)} for text, paths in boundaries.items() if len(paths) >= 3],
              'audit': audits, 'notice': 'Candidates are not human-verified. No images were interpreted and no vectors were generated.'}
    atomic_text(destination / 'report.json', json.dumps(report, ensure_ascii=False, indent=2))
    print(f'Dataset: {destination}\nText candidates: {report["text_candidates"]}; review: {report["needs_review"]}; duplicates merged: {report["duplicates_merged"]}')
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', nargs='?', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'outputs/embedding-dataset')
    parser.add_argument('--remove', action='append', default=[], metavar='PHRASE')
    parser.add_argument('--target-chars', type=int, default=2400)
    args = parser.parse_args()
    try:
        prepare([args.input] if args.input else DEFAULT_INPUTS, args.output, args.remove, args.target_chars)
    except (ValueError, OSError, RuntimeError) as error:
        parser.exit(1, f'Dataset preparation stopped: {error}\n')


if __name__ == '__main__':
    main()
