# PDF question-bank pipeline

For the separate MinerU question-Markdown pipeline with DePlot charts, optional
PaddleOCR cross-checking and resumable Mermaid output, see
[question_pipeline/README.md](question_pipeline/README.md). Run `python questions.py`;
one-time dependencies are installed with `python questions.py --setup`. It has its
own runtime, Google Drive downloader, state and outputs under `question_pipeline/data`.

For a Markdown-first PYQ workflow that starts from already extracted Markdown,
see [pyq_pipeline/README.md](pyq_pipeline/README.md). Put Markdown under
`pyq_pipeline/input/markdown` and run `python -m pyq_pipeline.pipeline process`.
It maintains a resumable SQLite/JSONL state and incrementally exports a reviewable
Excel workbook under `pyq_pipeline/output`; it does not run PDF/OCR ingestion.

## Run everything

From this project folder, run:

```powershell
python main.py
```

This automatically uses the installed MinerU environment, processes each PDF in
`doc_pipeline/google_docs` one at a time, and creates `document.json`, `bank.json`
and `question-bank.xlsx` under `outputs/question-bank`. It uses five-page chunks
with one overlap page. Rerunning resumes extraction and preserves existing Excel
files with manual edits. It does not call Jev or upload to Supabase.

Optional: `python main.py "path/to/book.pdf"` processes one book, and
`python main.py --max-pages 2` runs a clearly marked partial test.

### Resume after stopping or failure

Run **`python main.py`** again with the same input and settings. Keep the existing
`outputs/question-bank` folder. Completed chunks are checked and reused, including
chunks created by splitting a failed window. Existing checkpoints from older runs
are supported. A damaged or unfinished chunk is extracted again from its beginning;
resume does not preserve work inside an unfinished model call.
Editing or deleting `markdown.md` does not repeat OCR: the pipeline uses structured
JSON for merging and Excel conversion. Markdown edits are preserved but are not
imported into the question bank. Extraction JSON and image checksums remain required.
The console prints skipped ranges and the reason for any invalid cached chunk.

Each book's `manifest.json` records completed chunks, unique completed pages, the
active page window, update time, and the last failure or keyboard interruption.
`next_incomplete_page` describes missing page coverage; overlapping windows can
restart earlier than this page. The active window is saved before parsing, so an
unexpected shutdown can leave status `running`; the next launch still recovers
from validated chunk files. Progress is saved after each successful child chunk.
Do not start a second extraction process against the same output folder.

For Excel conversion only, without starting or interrupting extraction:

```powershell
python excel.py
```

This reads completed extractions and writes separate review copies under `outputs/excel`.
It skips incomplete documents and preserves existing Excel files. It can run while
`python main.py` is processing another PDF; no source files or extraction code are changed.
If nothing has finished yet, rerun it later. `main.py` already exports Excel automatically
after each PDF, so this command is optional. It can also accept a completed JSON file:
`python excel.py "path/to/bank.json"`.

Local extraction with MinerU 4, structured JSON, an Excel review workbook, and a
fail-closed Supabase publication gate for `public.questions`. Existing Drive downloads
and Docling code remain separate. Jev is disabled. Database writes happen only through
the explicit upload command after human review and mapping validation.

## Clean generated Markdown separately

Run `python clean_markdown.py --remove "Join on Telegram"` to remove any chosen
literal phrase, case-insensitively, from every `markdown.md` under `outputs`.
Repeat `--remove "another phrase"` to remove multiple phrases. The shorthand
`--remove-Join-on-Telegram` treats hyphens as spaces; use quoted `--remove` text
when the phrase contains actual hyphens. No phrase is removed by default.
Add `--remove-underscores` only when you also want every `_` removed, including
underscores inside links, identifiers and LaTeX subscripts. Other text remains.
The legacy `python main.py --remove-telegram` removes just the Telegram keyword.
The first original is preserved beside each changed file as `markdown.md.bak`.
JSON, images and Excel remain unchanged; this command does not start extraction.
Use `python clean_markdown.py "path/to/folder" --remove "your text"` for another folder.
Run after extraction has stopped or finished; new Markdown generated later needs
another cleanup run. Markdown cleanup does not invalidate extraction checkpoints.

## Environment setup

Python 3.13 is used in the project-local `.venv-mineru` environment.

```powershell
python -m venv .venv-mineru
.\.venv-mineru\Scripts\python.exe -m pip install -r requirements.txt
```

MinerU downloads its models on first use. Standard/advanced extraction needs its
inference runtime and sufficient RAM; package installation alone is not a model test.
Keep `MINERU_HOME` in a writable directory. No PDF is sent to a remote parser by this code.

## Extract one PDF at a time

Run commands from the repository root:

```powershell
.\.venv-mineru\Scripts\python.exe -m doc_pipeline.cli extract doc_pipeline/google_docs --chunk-pages 5 --overlap 1
```

The default is `standard`, not the lower-quality flash tier. Each PDF completes before
the next begins. Windows have five owning pages plus one context page. Failed windows
are split down to single pages; a failing page stops the book. Chunk result files and
image assets are checksummed for resume. Changing source content, MinerU version,
tier or chunk settings selects a separate output directory. Do not run two extractors
against the same output directory concurrently.

`--max-pages 2` explicitly runs a partial smoke test. Such output is marked partial.
The output contains raw chunk JSON/images, `manifest.json`, and merged `document.json`.
Overlapping pages are emitted once, using their first extraction. Alternative chunks
remain available for inspection. This does not reconcile differing OCR automatically.

## Structure and export

```powershell
.\.venv-mineru\Scripts\python.exe -m doc_pipeline.cli structure PATH_TO_DOCUMENT_JSON --output outputs/question-bank/bank.json
```

The conservative parser recognizes numbered questions with `(a)` through `(d)` or
`a.` through `d.` options and explicit inline answer labels. It never guesses an answer
from a separate key. Every candidate starts pending. Other layouts, diagrams and
unrecognized questions remain in raw source blocks for manual review. This is a
candidate builder, not a claim of exhaustive extraction or semantic correctness.

Excel export uses the Codex bundled `@oai/artifact-tool`. Set up a `node_modules`
junction to the runtime packages (the desktop dependency loader reports its path),
then run its bundled Node:

```powershell
node doc_pipeline/export_excel.mjs outputs/question-bank/bank.json outputs/question-bank/bank.xlsx
```

On this Windows Codex installation, the helper resolves the bundled runtime and
creates the module junction if needed:

```powershell
.\scripts\export-bank.ps1 -InputJson outputs/question-bank/bank.json -OutputXlsx outputs/question-bank/bank.xlsx
```

The workbook has Questions, Source blocks, and Readme sheets. Export refuses to
overwrite an existing workbook so it cannot erase manual corrections. Source-block
text over 30,000 characters is split into numbered parts; raw JSON remains authoritative.
Question fields over Excel's cell limit fail explicitly. Long source paragraphs can
be inspected in the formula bar or JSON. Pass `--preview` to the Node command to
render representative worksheet PNGs alongside the export.

## Optional AI decision review

Run `python ai_review.py` to review completed question banks separately from extraction.
This stage is disabled by default in `question_pipeline/review-config.json`. When ready, supply an
OpenRouter model ID that supports JSON-schema structured outputs, set the
`OPENROUTER_API_KEY` environment variable locally, and set `enabled` to true.
No key belongs in the JSON config. An explicit bank path is also accepted:
`python ai_review.py "path/to/bank.json"`.

The reviewer checks each existing MCQ candidate for missing or corrupted content;
it does not discover missed questions or compare raw Docling/MinerU documents yet.
It sends candidate text and its source snippet to OpenRouter, without page images.
Results go to a separate `ai-review.json`; original questions, Excel, approvals and
Supabase are unchanged. AI decisions never count as verification. Successful reviews
are cached per input/model/config and reused on restart; edits invalidate the cache.
Requests run sequentially without automatic retries. Malformed or truncated responses
stop review. Large questions are rejected rather than silently truncating source text.

An optional Laya-MLX adapter records an additional local risk probability when
`laya_enabled` is true. It requires Apple Silicon/macOS and a separately installed
`laya-mlx` package; it is deliberately not added to this Windows extraction environment.
Leave it false on Windows. Laya scores do not skip OpenRouter review or authorize
publication. Its short context and accuracy require evaluation on your question data.
No live model validation has been performed. Jev stays disabled.

References: [Laya-MLX](https://github.com/mizorewww/laya-mlx),
[OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

## Jev disabled (retained implementation)

The `jev-review` command is removed and `jev.review()` raises before any API call,
even when `TYPESAFE_API_KEY` is configured. The old implementation is retained behind
that unconditional guard for future restoration. Neither extraction nor publishing
uses Jev. Validation and human review remain active.

## Docling comparison

Docling is optional and is not installed in the checked project environments. Install
`docling` in a separate environment before using this command, to keep the two ML
dependency stacks independent. The adapter uses Docling's documented conversion API;
live Docling inference has not been tested here.

```powershell
python -m doc_pipeline.cli docling-compare PATH_TO_PDF --first-page 10 --last-page 12 --output outputs/question-bank/docling-10-12.json
```

This preserves Docling's structured result separately for source-page comparison.
It does not automatically choose a winner between two disagreeing extractors.

## Review before Supabase

This initial schema is for four-option, single-answer MCQs. Questions uses these headers:

`question_id, question, option_a, option_b, option_c, option_d, correct_answer,
explanation, subject, topic, source_file, source_page, review_status, review_notes`

1. Compare each question, options, answer, formulas and any diagrams with the source PDF.
2. Correct the Excel row and set `review_status` to `verified`. `modified` and `corrected`
   do not grant approval.
3. Record a review snapshot using the command below. Reviewer identity is a local
   attestation, not authenticated identity; keep the approval ledger under trusted control.
4. Check source coverage, including unmatched blocks and separate answer keys, then
   attest coverage. This step must account for all intended questions; row validation
   alone cannot establish that extraction is complete.
5. Run check. Every row must pass; there is no partial upload mode.

```powershell
.\.venv-mineru\Scripts\python.exe -m doc_pipeline.question_gate outputs/question-bank/bank.xlsx --approvals outputs/question-bank/approvals.json approve --question-id QUESTION_ID --reviewer YOUR_NAME
.\.venv-mineru\Scripts\python.exe -m doc_pipeline.question_gate outputs/question-bank/bank.xlsx --approvals outputs/question-bank/approvals.json approve-coverage --reviewer YOUR_NAME
.\.venv-mineru\Scripts\python.exe -m doc_pipeline.question_gate outputs/question-bank/bank.xlsx --approvals outputs/question-bank/approvals.json check --output outputs/question-bank/publish.json
```

The gate validates IDs, required content, answer membership, distinct options, source
pages, reviewer records and content hashes. Formulas in imported rows are rejected.
Any content edit invalidates that row's approval and the bank's coverage review.
Adding/removing a row also invalidates coverage. A failing check replaces the output
with `ready: false` and an empty questions array, avoiding stale ready payloads.
The gate does not prove factual correctness or prevent a trusted operator falsifying
an approval ledger. For multi-user production use, store authenticated reviews server-side.

For a large bank, `approve-verified --reviewer YOUR_NAME` records snapshots for all
rows you have already manually marked verified. It does not change pending rows.
## Supabase mapping and upload

Copy `config/supabase.example.json` to your own mapping file. Fill `dataset_id` with a
UUID generated once for this bank and retain it permanently (for example with
`python -c "import uuid; print(uuid.uuid4())"`). It is a local identity namespace,
not a database foreign key. Each database ID is UUIDv5(dataset_id, question_id).
Reusing the namespace and source question ID updates the same record; changing them
creates different IDs. This does not deduplicate earlier rows inserted with random UUIDs.

Set `defaults.exam_id`, `subject_id` and `chapter_id` to real existing database UUIDs.
Populate optional `pdf_id` and `paper_set` as appropriate. Metadata precedence is:
per-question `overrides[question_id]`, populated Excel metadata, then batch defaults.
For books spanning chapters, use row IDs or per-question overrides; do not assign one
chapter to the whole book unless that is correct. Unknown mapping keys fail validation.

The table's JSONB column does not specify your app's option structure, so the mapper
requires both of these explicit settings:

- `options_format: "label_map"` creates `{"A":"...","B":"...","C":"...","D":"..."}`.
- `options_format: "label_text_list"` creates `[{"label":"A","text":"..."}, ...]`.
- `correct_answer_format: "label"` saves `A`/`B`/`C`/`D`; `"text"` saves the selected option text.

Confirm these against your app model before publishing. This pipeline currently
accepts four-option `SINGLE_CHOICE` questions only; the table's other question types
require corresponding extraction/review support and are explicitly rejected here.

Mapping: `question` -> `question_text`, `source_page` -> `page_number`, options A-D ->
`options`, plus answer, explanation and schema metadata. Source question numbers and
snippets are captured by new extractions. Existing banks may leave them null. Fields
`created_at`, `updated_at` and `embedding` are omitted so database defaults/triggers
and existing embeddings remain managed by the database. If a published question's text
changes, your embedding job must regenerate its vector before vector-based retrieval;
this importer does not generate or validate embeddings. No schema migration is needed.
Diagram questions require an HTTPS `diagram_url`; this command does not upload images.

Set `SUPABASE_URL` to the HTTPS project origin. `prepare` needs no API key and makes
no network calls. It rechecks every review and writes the exact payload and a SHA-256
covering both the target URL and mapped rows:

```powershell
.\.venv-mineru\Scripts\python.exe -m doc_pipeline.supabase_publish prepare outputs/question-bank/bank.xlsx --approvals outputs/question-bank/approvals.json --mapping config/supabase.json --output outputs/question-bank/supabase-preview.json
```

Review that JSON, including IDs, answer representation, flags and chapter assignments.
Set `SUPABASE_SECRET_KEY` in the local/backend environment (legacy
`SUPABASE_SERVICE_ROLE_KEY` is also supported). Never put this key in Android code,
Excel, the mapping file, source control or chat. Then use the printed payload hash:

```powershell
.\.venv-mineru\Scripts\python.exe -m doc_pipeline.supabase_publish upload outputs/question-bank/bank.xlsx --approvals outputs/question-bank/approvals.json --mapping config/supabase.json --expected-sha256 HASH_FROM_PREVIEW --output outputs/question-bank/upload-receipt.json
```

Upload re-reads the workbook, approvals and mapping and recomputes the payload; it
does not trust the previous preview's ready flag. Changed content requires reapproval;
changed metadata or destination requires a new preview/hash. Optional Excel metadata
also participates in question approval hashes. A single PostgREST upsert on `id`
provides a database transaction for the entire batch. Foreign-key existence is checked
by PostgreSQL at write time; local UUID validation does not verify parent relationships.
There are no automatic retries or partial batches. Payloads above 10 MiB fail locally
and require a transactional server-side importer. A transport failure has an unknown
commit outcome; check the database before retrying the same IDs. Upload can overwrite
mapped fields on those stable IDs, so avoid concurrent database edits to this bank.
The local review ledger is trusted operator data, not a server-enforced permission system.

References: [PostgREST transactions](https://docs.postgrest.org/en/v13/references/transactions.html),
[upsert API](https://docs.postgrest.org/en/v13/references/api/tables_views.html),
[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Tests

```powershell
.\.venv-mineru\Scripts\python.exe -m unittest discover -s tests -v
```

Tests cover edits after review, deleted rows, duplicates, missing reviews, invalid
answers, page validation and question continuation across pages.

Validation performed in this workspace: 23 unit tests passed; the real Excel
export/import smoke test passed, including batch approvals, changed content and stale
payload invalidation. Run it with `.\.venv-mineru\Scripts\python.exe tests/smoke_excel.py`.
MinerU 4.0.6 standard/hybrid inference successfully extracted the SSC PDF cover page
with JSON and image assets (about 78 seconds after model loading). This is an inference
smoke test, not question/formula accuracy validation. Full-book extraction has not been
run. Jev is disabled; no live Jev calls or Supabase uploads have been performed.
