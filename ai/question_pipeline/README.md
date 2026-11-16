# Independent question pipeline

Run from the project root:

```powershell
python questions.py
```

One-time installation: `python questions.py --setup`.
This creates `.venv-questions` for MinerU/Drive/OpenRouter and `.venv-charts` for DePlot.
No application code, input folder, extraction cache, token file or state is loaded
from the other pipeline. Libraries and the bundled Excel SDK are ordinary dependencies.

## Code layout

```text
question_pipeline/
  run.py                 Command handling and stage orchestration
  ingestion/             Google Drive downloads and resumable MinerU extraction
  visuals/               Chart detection, model worker, Markdown rendering
  ai/                    OpenRouter structuring and optional advisory review
  export/                Excel tool and workbook generator
  core/                  Shared paths, atomic state writes, checksums and locking
  config.json            Pipeline settings
  review-config.json     Optional reviewer settings
  secrets/               Private OAuth files
  data/                  Downloads, checkpoints and generated outputs
```

The launcher remains `python questions.py`. Configuration and data locations are
unchanged. Markdown rendering reuses the active chunk's metadata and checksum
across its pages, then releases it when moving to the next chunk. Fully cached
pages do not need to parse that metadata again. This reduces repeated disk reads
and JSON parsing; it does not change MinerU model inference speed or accuracy.

## Processing stages

1. List PDFs directly inside the Drive folder in `question_pipeline/config.json`.
2. Download one PDF and verify its bytes before handing it to MinerU.
3. Extract in five-page windows with one overlap page, splitting failed windows.
4. Render Markdown with MinerU. DePlot reconstructs supported pie/bar charts as
   Mermaid blocks beside their original images, before following question text.
5. Extract question rows from bounded Markdown batches, preserving exact source
   quotes, page numbers, and section labels. Nearby page text and recent extracted
   questions help resolve chunk boundaries and prevent duplicate rows.
6. Scan the full Markdown again in bounded batches for answer keys, then map keys
   across the document by question number and section. Ambiguous or unmatched keys
   remain in Review with their source evidence.
7. Validate each response, save the bank, and create/update its Excel workbook as
   question batches complete. The workbook is available during extraction and after
   resume; answer mappings update it after the answer-key pass.

All mutable data belongs to `question_pipeline/data`:

- `downloads`: PDFs and unfinished `.part` files.
- `state/downloads.json`: Drive identity/version, file sizes, checksums and progress.
- `extractions`: MinerU chunks, JSON, images and chunk completion markers.
- `outputs`: Markdown, chart evidence, LLM response cache, question JSON and Excel.
- `model-cache`: this pipeline's MinerU models, downloaded on first extraction.

The workbook contains Questions, Source Markdown, and Review items. Questions stay
pending human review. Answer keys map by normalized question number and exact
section label; when a number is unique in the document, a section label is not
required. Answer source page and quote are stored separately from question evidence.
Mermaid source is retained as text in Excel; Excel does not render Mermaid diagrams.
Original chart images remain referenced in the Markdown.

## Configuration

The Drive folder is initially the same folder ID used by your earlier downloader.
Change `drive_folder_id` in `question_pipeline/config.json` if needed. Listing is
not recursive and downloads PDF files, not native Google Docs or Drive shortcuts.

Place Google OAuth desktop credentials at `question_pipeline/secrets/drive-client.json`.
The read-only Drive token is stored separately as `drive-token.json` there. Both
files and all downloaded data are ignored by Git. First use may open Google sign-in.
For this workspace the existing OAuth files were copied once into this private
folder; there is no continuing reference to the original files.

When ready, set `openrouter_model`, `openrouter_enabled: true`, and
`OPENROUTER_API_KEY` in the independent config. Keep the config local and out of
source control. The chosen model must support function calling with the supplied
schema.

Without that configuration, download/extraction still work and the pipeline records
`waiting_for_openrouter`. Rerun with `--excel-only` after configuring it. Markdown
text is sent to OpenRouter at that stage; images are not uploaded. The model must
copy source-supported answers/explanations and leave missing ones empty. It must
not solve questions or generate new ones. Source quotes and chart Markdown are
checked against input, but these checks cannot prove every field is accurate or
that all questions were found. Unmatched content stays available for review.

## Resume

Use the same command after interruption. Only one process can run this pipeline
at a time; its operating-system lock is released automatically after a crash.

- Downloads resume verified byte ranges. Drive ID avoids duplicate-name collisions.
  Remote version/size/checksum changes are detected. Valid PDFs survive Drive renames;
  damaged local PDFs are downloaded again. A remote update during download prevents
  publication of mixed-version bytes.
- MinerU resumes completed chunks, including saved children of split windows.
  Incomplete chunks restart from their beginning.
- Chart results and Markdown pages have separate checkpoints. Model/runtime errors
  stop the stage, keeping completed work. Unsupported charts are review outcomes,
  not successful data reconstruction.
- OpenRouter caches question and answer-key batches by model, source, prompt/schema,
  and context; question batches also include recent question memory. Edited Markdown
  reruns affected batches. Failed or truncated calls are never marked complete and
  there are no automatic retries.
- Excel is staged and atomically replaced as each batch is saved. Its filename is
  stable for the source document, so the same workbook grows during extraction.

## Commands

```powershell
python questions.py --download-only
python questions.py --extract-only
python questions.py --excel-only
python questions.py "path/to/book.pdf"
```

Local input skips Drive. A partial test is `python questions.py "book.pdf" --max-pages 2`.
`--document "path/to/document.json"` explicitly processes an existing compatible
MinerU document when requested; there is no automatic access to another pipeline.

## Charts

DePlot is the default chart data extractor. Detection uses captions plus geometric
circle/aligned-bar heuristics. This is not a trained chart classifier and can miss
complex, horizontal, stacked, 3D or unlabeled charts. Only complete single-series,
two-column numeric tables with unique labels are rendered. Original images remain
in place with a review note when classification or data recovery is uncertain.
Mermaid requires a multiline fenced block and a compatible Markdown viewer.
Reconstructed data is model output, not human-verified source data.

Optional PaddleOCR cross-checking:

```powershell
python questions.py --setup-ocr
python questions.py --verify-chart-text
```

PaddleOCR reads printed labels and values. It cannot measure bar heights or pie
proportions. Its strict cross-check can therefore reject valid charts without
printed values. It is not loaded by default. DePlot/Paddle weights download on
first use, and models stay loaded across charts. Jev/Laya are not used here.

The independent advisory reviewer in `ai_review.py` is a separate optional feature.
Its settings are in `review-config.json`; it is not the Markdown-to-Excel stage.

Sources: [Drive downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads),
[OpenRouter tools](https://openrouter.ai/docs/guides/features/tool-calling),
[DePlot](https://huggingface.co/google/deplot),
[PaddleOCR](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html).
