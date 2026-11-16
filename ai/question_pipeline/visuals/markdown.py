"""Resume page Markdown and insert chart evidence at its source image."""
import hashlib
import json
import os
import re
import time
from pathlib import Path
from urllib.parse import quote
from core.storage import sha256, write_json
from .charts import VERSION


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(text, encoding='utf-8')
    temporary.replace(path)


def image_blocks(value):
    if isinstance(value, dict):
        if value.get('image_source') and value.get('type') in ('image', 'chart'):
            yield value
        for child in value.values():
            yield from image_blocks(child)
    elif isinstance(value, list):
        for child in value:
            yield from image_blocks(child)


def render_page(middle, page_idx, asset_prefix):
    # Use MinerU's renderer to preserve tables, equations, nested blocks and order.
    from mineru.parser.base import ParseResult
    selected = {**middle, 'pages': [p for p in middle['pages'] if p['page_idx'] == page_idx],
                'is_full_document': False}
    if len(selected['pages']) != 1:
        raise ValueError(f'Missing or duplicate source page {page_idx + 1}')
    return ParseResult.from_dict(selected).markdown(asset_base_url=asset_prefix)


def enrich(document_path, output, worker, renderer=render_page, extract_charts=True):
    document = json.loads(document_path.read_text(encoding='utf-8'))
    output.mkdir(parents=True, exist_ok=True)
    manifest = {'source_sha256': document['source_sha256'], 'status': 'running',
                'complete': False, 'completed_pages': [], 'current_page': None,
                'chart_extraction': 'running' if extract_charts else 'skipped',
                'charts_reconstructed': 0, 'images_needing_review': 0}
    state_path = output / 'manifest.json'
    write_json(state_path, manifest)
    page_paths = []
    active_middle_path = None
    middle_hash = middle = None
    try:
        for page in document['pages']:
            page_number = page['source_page']
            print(f'Markdown page {page_number}/{len(document["pages"])}', flush=True)
            manifest['current_page'] = page_number
            write_json(state_path, manifest)
            chunk = Path(page['asset_directory'])
            middle_path = chunk / 'middle_json.json'
            # Keep only the active chunk in memory, regardless of book length.
            if middle_path != active_middle_path:
                active_middle_path = middle_path
                middle_hash = sha256(middle_path)
                middle = None
            blocks = list(image_blocks(page['blocks']))
            assets = {}
            for block in blocks:
                source = block['image_source']
                path = (chunk / source).resolve()
                if not path.is_relative_to(chunk.resolve()) or not path.is_file():
                    raise ValueError(f'Missing or unsafe image asset: {source}')
                assets[source] = sha256(path)
            worker_identity = worker.identity if extract_charts else 'chart-extraction-skipped'
            signature = digest({'version': VERSION, 'page': page, 'middle': middle_hash,
                                'assets': assets, 'worker': worker_identity})
            page_folder = output / 'pages' / f'{page_number:06}'
            page_path = page_folder / 'markdown.md'
            marker = page_folder / 'complete.json'
            saved = None
            if marker.is_file() and page_path.is_file():
                try:
                    candidate = json.loads(marker.read_text(encoding='utf-8'))
                    if candidate['input_sha256'] == signature:
                        saved = candidate
                except (ValueError, KeyError, TypeError):
                    pass
            if saved is None:
                # All page links are relative to the FINAL merged Markdown folder.
                prefix = quote(Path(os.path.relpath(chunk, output)).as_posix(), safe='/.-_')
                if middle is None:
                    middle = json.loads(middle_path.read_text(encoding='utf-8'))
                markdown = renderer(middle, page_number - 1, prefix)
                reviews = []
                for index, block in enumerate(blocks):
                    source = block['image_source']
                    image = (chunk / source).resolve()
                    hint = json.dumps({k: block.get(k, '') for k in ('captions', 'content')}, ensure_ascii=False)
                    if not extract_charts:
                        continue
                    chart_key = digest({'image': assets[source], 'hint': hint, 'worker': worker.identity})
                    cache = output / 'charts' / f'{chart_key}.json'
                    chart = None
                    if cache.is_file():
                        try:
                            cached = json.loads(cache.read_text(encoding='utf-8'))
                            if (cached['input_sha256'] == chart_key and
                                    cached['result']['status'] in ('reconstructed', 'needs_review')):
                                chart = cached['result']
                        except (ValueError, KeyError, TypeError):
                            pass
                    if chart is None:
                        started = time.monotonic()
                        print(f'Page {page_number}, image {index + 1}/{len(blocks)}: chart analysis started', flush=True)
                        chart = worker.extract(image, hint)
                        write_json(cache, {'input_sha256': chart_key, 'result': chart})
                        duration = time.monotonic() - started
                        print(f'Page {page_number}, image {index + 1}/{len(blocks)}: '
                              f'chart analysis finished in {duration:.1f}s ({chart["status"]})', flush=True)
                    else:
                        print(f'Page {page_number}, image {index + 1}/{len(blocks)}: using cached chart result', flush=True)
                    # Locate this exact image reference, not a nearby question or page end.
                    target = prefix + '/' + source.replace('\\', '/')
                    pattern = re.compile(r'!\[[^\]]*\]\(' + re.escape(target) + r'\)')
                    matches = list(pattern.finditer(markdown))
                    if len(matches) != 1:
                        raise ValueError(f'Cannot uniquely locate chart image in rendered page: {source}')
                    note = '\n\n> Chart data reconstructed automatically; compare with the original image.\n\n' + chart['mermaid'] if chart['status'] == 'reconstructed' else '\n\n> Visual retained: chart detection/data needs manual review.'
                    match = matches[0]
                    markdown = markdown[:match.end()] + note + markdown[match.end():]
                    reviews.append({'source_image': source, 'cache': str(cache.resolve()), 'status': chart['status']})
                # Never overwrite edited Markdown silently when source/config changed.
                if page_path.exists():
                    backup = page_path.with_name('markdown.md.before-update.bak')
                    if not backup.exists():
                        backup.write_bytes(page_path.read_bytes())
                write_text(page_path, f'<!-- source page {page_number} -->\n\n' + markdown + '\n')
                saved = {'input_sha256': signature, 'charts': reviews}
                write_json(marker, saved)
            else:
                print(f'Skip saved Markdown page {page_number}', flush=True)
            for chart in saved['charts']:
                field = 'charts_reconstructed' if chart['status'] == 'reconstructed' else 'images_needing_review'
                manifest[field] += 1
            page_paths.append(page_path)
            manifest['completed_pages'].append(page_number)
            write_json(state_path, manifest)
            print(f'Markdown page {page_number}/{len(document["pages"])} complete', flush=True)
        merged = output / 'markdown.md'
        merge_key = digest([sha256(path) for path in page_paths])
        merge_marker = output / 'merged.json'
        previous = {}
        if merge_marker.is_file():
            try:
                previous = json.loads(merge_marker.read_text(encoding='utf-8'))
            except ValueError:
                pass
        if not merged.exists() or previous.get('input_sha256') != merge_key:
            if merged.exists():
                backup = output / 'markdown.md.before-update.bak'
                if not backup.exists():
                    backup.write_bytes(merged.read_bytes())
            write_text(merged, '\n\n---\n\n'.join(path.read_text(encoding='utf-8') for path in page_paths))
            write_json(merge_marker, {'input_sha256': merge_key})
        manifest.update(status='complete' if document['complete'] else 'partial',
                        chart_extraction='completed' if extract_charts else 'skipped',
                        complete=document['complete'], current_page=None)
        write_json(state_path, manifest)
        return merged
    except (Exception, KeyboardInterrupt) as error:
        manifest.update(status='interrupted' if isinstance(error, KeyboardInterrupt) else 'failed',
                        last_error=f'{type(error).__name__}: {error}')
        write_json(state_path, manifest)
        raise


