"""Pinned Baidu Unlimited-OCR adapter; no MinerU or Vulkan dependency."""
import hashlib
import importlib.metadata
import json
import re
from pathlib import Path

from .question_gate import write_json

MODEL = 'baidu/Unlimited-OCR'
REVISION = '07dea832e22aefee32ad281d4b80551282e1c168'
DPI = 300
MAX_LENGTH = 32768
CACHE = Path(__file__).resolve().parent / 'data/model-cache'


class BackendError(RuntimeError):
    """A backend/configuration failure that splitting PDF windows cannot fix."""


def checksum(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def blocks_from_raw(raw):
    """Retain native block labels and raw evidence without inventing coordinates."""
    pattern = re.compile(r'^<\|det\|>([^<\s]+)(?:\s*\[[^\]]*\])?<\|/det\|>(.*)$')
    blocks = []
    for line in raw.splitlines():
        match = pattern.match(line.strip())
        if match:
            blocks.append({'type': match[1], 'content': match[2].strip()})
        elif blocks:
            blocks[-1]['content'] += '\n' + line
        else:
            blocks.append({'type': 'text', 'content': line})
    return blocks


class Backend:
    def __init__(self, mode='gundam'):
        if mode not in ('gundam', 'base'):
            raise ValueError('Unlimited-OCR mode must be gundam or base')
        self.mode = mode
        self.model = self.tokenizer = None
        packages = {}
        for name in ('torch', 'transformers', 'PyMuPDF', 'Pillow'):
            try:
                packages[name] = importlib.metadata.version(name)
            except importlib.metadata.PackageNotFoundError:
                packages[name] = 'not-installed'
        self.settings = dict(model=MODEL, revision=REVISION, mode=mode, dpi=DPI,
                             max_length=MAX_LENGTH, adapter_version=1, packages=packages)
        self.identity = hashlib.sha256(json.dumps(self.settings, sort_keys=True).encode()).hexdigest()[:16]

    def load(self):
        if self.model is not None:
            return
        try:
            import torch
            from transformers import AutoModel, AutoTokenizer
        except ImportError as error:
            raise BackendError('Install the separate runtime: python dataset2.py --setup') from error
        if not torch.cuda.is_available() or not torch.cuda.is_bf16_supported():
            raise BackendError('Unlimited-OCR requires an NVIDIA CUDA GPU supporting BF16. '
                               'This backend cannot use Vulkan or silently fall back to CPU.')
        kwargs = dict(revision=REVISION, trust_remote_code=True, cache_dir=str(CACHE))
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(MODEL, **kwargs)
            self.model = AutoModel.from_pretrained(MODEL, use_safetensors=True,
                                                   torch_dtype=torch.bfloat16, **kwargs).eval().cuda()
        except Exception as error:
            raise BackendError(f'Unable to load the CUDA OCR model: {error}') from error

    def infer(self, image, folder):
        self.load()
        # eval_mode returns raw text. Do not invoke upstream save_results postprocessing,
        # which evaluates model-generated geometry expressions.
        original = self.model.generate
        finished = False

        def checked_generate(*args, **kwargs):
            nonlocal finished
            output = original(*args, **kwargs)
            finished = int(output[0, -1].item()) == self.tokenizer.eos_token_id
            return output

        self.model.generate = checked_generate
        try:
            raw = self.model.infer(self.tokenizer, prompt='<image>document parsing.',
                image_file=str(image), output_path=str(folder), base_size=1024,
                image_size=640 if self.mode == 'gundam' else 1024,
                crop_mode=self.mode == 'gundam', eval_mode=True, save_results=False,
                max_length=MAX_LENGTH, no_repeat_ngram_size=35, ngram_window=128)
        except Exception as error:
            raise BackendError('Unlimited-OCR inference failed; restart the command to resume. '
                               f'{type(error).__name__}: {error}') from error
        finally:
            self.model.generate = original
        if not finished:
            raise BackendError('OCR generation did not finish with EOS; refusing to save truncated output.')
        if not isinstance(raw, str) or not raw.strip():
            raise BackendError('OCR returned empty output; page needs inspection, not automatic completion.')
        return raw

    def extract_window(self, pdf, first, last, folder, page_root):
        import fitz
        folder.mkdir(parents=True, exist_ok=True)
        pages = []
        with fitz.open(pdf) as document:
            for number in range(first, last + 1):
                page_dir = page_root / f'{number:06}'
                page_dir.mkdir(parents=True, exist_ok=True)
                marker = page_dir / 'complete.json'
                record = None
                if marker.is_file():
                    try:
                        saved = json.loads(marker.read_text(encoding='utf-8'))
                        files = saved['files']
                        required = {'raw.json', 'page.png'}
                        if saved['identity'] == self.identity and required <= files.keys():
                            valid = True
                            for name, expected in files.items():
                                path = (page_dir / name).resolve()
                                if not path.is_relative_to(page_dir.resolve()) or not path.is_file() or checksum(path) != expected:
                                    valid = False
                                    break
                            if valid:
                                record = json.loads((page_dir / 'raw.json').read_text(encoding='utf-8'))
                                if record['page_idx'] != number - 1 or not isinstance(record['raw'], str) or not record['raw'].strip():
                                    record = None
                    except (ValueError, KeyError, TypeError, OSError):
                        record = None
                if record is None:
                    # Load/check the GPU before rendering or allocating page pixels.
                    self.load()
                    page = document[number - 1]
                    width = page.rect.width * DPI / 72
                    height = page.rect.height * DPI / 72
                    if width * height > 50_000_000:
                        raise BackendError(f'Page {number} exceeds the 50 MP rendering limit; inspect its PDF dimensions.')
                    image = page_dir / 'page.png'
                    temporary = page_dir / 'page.partial.png'
                    page.get_pixmap(dpi=DPI, alpha=False).save(temporary)
                    temporary.replace(image)
                    raw = self.infer(image, page_dir)
                    record = {'page_idx': number - 1, 'raw': raw, 'settings': self.settings,
                              'source_page_image': str(image.resolve())}
                    write_json(page_dir / 'raw.json', record)
                    write_json(marker, {'identity': self.identity,
                        'files': {name: checksum(page_dir / name) for name in ('raw.json', 'page.png')}})
                else:
                    print(f'Skip verified OCR page {number}', flush=True)
                pages.append({'page_idx': number - 1, 'blocks': blocks_from_raw(record['raw']),
                              'source_page_image': record['source_page_image'],
                              'raw_ocr_file': str((page_dir / 'raw.json').resolve())})
        write_json(folder / 'structured_content.json', {'pages': pages})
        markdown = folder / 'markdown.md'
        if not markdown.exists():
            temporary = markdown.with_suffix('.md.tmp')
            temporary.write_text('\n\n---\n\n'.join(
                f'<!-- source page {p["page_idx"] + 1} -->\n\n' +
                '\n\n'.join(b['content'] for b in p['blocks']) for p in pages), encoding='utf-8')
            temporary.replace(markdown)
