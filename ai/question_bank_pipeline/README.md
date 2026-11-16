# dataset_pipeline2 — Baidu Unlimited-OCR

Independent source copy of `doc_pipeline`. Its default PDF extractor is
`baidu/Unlimited-OCR`, not MinerU. The original two pipelines are unchanged.
Code was copied; environments, model weights, PDFs, credentials, download ledgers
and extraction results were not duplicated. There are no runtime imports from
either existing pipeline.

## Simple commands

From the `ai` folder:

```powershell
python dataset2.py --setup
python dataset2.py --check
python dataset2.py "path/to/book.pdf" --max-pages 2
python dataset2.py "path/to/book.pdf"
```

For the default input folder, put PDFs in `dataset_pipeline2/google_docs`, then run:

```powershell
python dataset2.py
```

An existing PDF folder can be passed explicitly without copying its PDFs. Restart
the identical command to resume. Use `python dataset2.py --excel-only` to export
completed JSON separately. The full command already exports Excel after each PDF.

## Runtime requirements and current validation

Baidu documents Transformers inference on NVIDIA CUDA, with a Python 3.12.3 /
CUDA 12.9 baseline. Setup creates `.venv-dataset2` using the Python executing the
launcher and installs the published pinned dependencies plus local pipeline tools.
Use Python 3.12 to match that upstream baseline; the current workspace also has
Python 3.13, which has not been validated with this model here.

The adapter requires a CUDA device supporting BF16. It does not use Vulkan and
does not provide an untested CPU fallback. The CUDA 12.8 PyTorch wheels selected
from the [official wheel list](https://pytorch.org/get-started/previous-versions/) need a
compatible NVIDIA driver. Native Windows model inference is not validated here;
use a compatible NVIDIA Linux/WSL environment if the upstream runtime needs it.
The adapter is tested with simulated model outputs, not a real GPU/model run.

The first real extraction downloads weights/custom model code from the official
Hugging Face repository at pinned revision
`07dea832e22aefee32ad281d4b80551282e1c168` into this pipeline's own model cache.
`trust_remote_code=True` is required by the published model. The preflight command
does not download weights. Setup and the multi-GB model download have not been
run automatically as part of creating this copy.

References: [official inference instructions](https://github.com/baidu/Unlimited-OCR),
[model implementation](https://huggingface.co/baidu/Unlimited-OCR/blob/07dea832e22aefee32ad281d4b80551282e1c168/modeling_unlimitedocr.py).

## Extraction and resume

- PDFs run sequentially, in five-page windows with one overlapping page.
- Within each window, OCR processes one page at a time using the published
  single-image `gundam` configuration. This keeps exact source-page attribution
  and bounded page rendering; it does not use the model's multi-page inference API.
- Model initialization is reused within each PDF. Overlapping pages reuse verified
  per-page OCR rather than running the model twice.
- Each completed page saves its original rendering, raw OCR, and checksums.
  Windows additionally save structured JSON, Markdown and completion markers.
- Source content, pinned model revision, mode and key dependency versions determine
  cache identity. Changed settings or source PDFs get a separate result directory.
- Restart checks both window data and its per-page evidence. Corrupt/missing evidence
  is regenerated; successfully saved other pages are reused.
- Partial runs remain marked partial. Empty output and generation without an EOS
  token fail explicitly rather than being silently marked complete.
- Model/GPU failures stop extraction with checkpoints retained. They do not trigger
  repeated inference on a broken backend. Other window failures can split recursively.
- Markdown edits do not invalidate OCR. Raw JSON remains the structuring input.

Output: `dataset_pipeline2/data/question-bank/BOOK/CONFIGURATION/`.
Separate Excel exports: `dataset_pipeline2/data/excel/`.
Model cache: `dataset_pipeline2/data/model-cache/`.

## Preserved downstream behavior and limitations

Question parsing remains the original conservative, pattern-based candidate parser.
Excel generation uses the existing installed artifact-tool dependency, with this
copy's own exporter. Existing Excel files are preserved. Candidates require human
review; JSON/Markdown are also retained for dataset preparation.

The adapter retains raw layout markers and page images. It does not claim MinerU's
exact block schema, reconstruct diagram crops, or add Mermaid/chart extraction.
Tables and equations are retained as OCR text. Page images provide visual evidence.
EOS checks detect generation termination, not factual accuracy or full coverage.
The copied Excel preservation logic has no new transactional export receipt.

The optional Docling comparison adapter remains separate. Jev remains disabled.
Supabase uploads still require explicitly invoking the copied publication gate;
the default command does not publish data.

## Optional copied Drive downloader

Place your OAuth desktop-client JSON at
`dataset_pipeline2/secrets/drive-client.json`, then run:

```powershell
python dataset2.py --download-only
```

It uses the original folder ID in `dataset_pipeline2/main.py`, writes PDFs to
this copy's `google_docs` folder, and uses its own token and download ledger.
This is the legacy downloader with corrected independent paths; it does not yet
have the question pipeline's range-resume/checksum download implementation.
Download progress restarts for an incomplete file. Then run `python dataset2.py`.
