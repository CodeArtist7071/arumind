# Question-by-question Markdown pipeline

This pipeline is isolated from the existing `pyq_pipeline process` workflow. It scans each top-level PDF folder under `pyq_pipeline/input/markdown`, recognizes question blocks with four options, and creates one workbook named after that folder's PDF title. It reads the PDF title from the folder name after `__` when present. At process startup it prints the number of PDF folders and Markdown files, then processes every matching folder unless `--document` is supplied.

For each Markdown document it parses all chunks and indexes answer-key entries by question number. Explicitly titled answer-key boxes and untitled bordered tables made almost entirely of numbered answer cells (for example, `1.(a)`, `2.(b)`) are the primary source. A key maps only to the nearest preceding same-number question in the same Markdown file. The parser does not attach keys across chunk files: the extracted chunks overlap and numbering can restart for another paper, so proximity alone cannot safely identify the matching question. Inline `Sol.12.(b)` answer labels are lower-priority and cannot override a mapped key box. The empty workbook template is created with `correct_answer` dropdown validation already installed. As question rows are populated, `correct_answer` contains the matched option text and its dropdown is populated by that row's options A-D; missing answers show `select answers`. `answer_key_chunk` displays the matching lowercase option letter and updates when a reviewer selects an option from the dropdown; `answer_key_source_chunk` retains the Markdown chunk location. Validation status and review notes explain uncertain rows. Each row also records the key section and match type. Nearby Markdown table rows and image references are retained with source locations.

## Deterministic extraction without an LLM

Run `python -m pyq_pipeline.decision_pipeline process --no-llm`. This mode does not require an API key and does not make network requests. It writes parsed questions/options and matched answer keys to `Questions`, Markdown and HTML tables to `Tables`, and image/chart references to `Charts`. Question starts support plain, bold, and Markdown heading forms; options support inline or multiline lettered and numbered labels. Incomplete or ambiguous records are retained with validation status and review notes instead of being silently dropped. Subject names use explicit `Subject:` metadata or a recognizable PDF-title subject; chapter names use explicit `Chapter:` metadata or the nearest non-question heading. Pie/bar labels are inferred only when those words appear near an image reference. Image-only graphs are listed with their source and asset status, but their labels and values cannot be read from pixels in deterministic mode. Uncertain subject/chapter names remain blank rather than being invented.

## Configure OpenRouter

Set `OPENROUTER_API_KEY` in the process environment or this folder's `.env` file. The process environment takes precedence; otherwise the configured `OPENROUTER_MODEL` is used, and `--model` can explicitly override it. Free model availability, provider routing, and request quotas can change. Use `--max-questions` for a pilot; completed questions and answer keys are stored in JSON and reruns resume pending questions.

Requests are paced with a default two-second delay (`--request-interval 2`). Use `--max-questions` for a pilot; completed questions and answer keys are stored in JSON and reruns resume pending questions.

## Run

From the repository root, inspect the PDF folder and Markdown counts:

```powershell
python -m pyq_pipeline.decision_pipeline inventory
```

Then process all PDF folders from the existing Markdown input folder:

```powershell
python -m pyq_pipeline.decision_pipeline process --document "Vedic Era" --max-questions 10
```

To continue that document, rerun the command with the same filter. To scan every PDF folder, omit `--document`; for a parser-only preview without API calls, use `--dry-run`. Use `--no-llm` to populate workbooks from the deterministic parser alone. JSON memory is saved after each response; the workbook is refreshed in batches of ten responses. If Excel locks the main workbook, the pipeline reuses one `*.updated.xlsx` file instead of producing a new timestamped copy after every question. Close the workbook and rerun to publish to the main filename.

Workbooks are written to `pyq_pipeline/decision_pipeline/output/workbooks/`. Per-document JSON memory is written to `pyq_pipeline/decision_pipeline/output/memory/`. The workbook contains the document title, question number, stem, four options, matched answer, model status, source file, and Markdown chunk.

## Upload workbooks to Google Drive

Set `workbook_drive_folder_id` in the local, Git-ignored file `pyq_pipeline/decision_pipeline/config.json` (copy the shape from `config.example.json`), or set `PYQ_WORKBOOK_DRIVE_FOLDER_ID`. Then run:

```powershell
python -m pyq_pipeline.decision_pipeline upload
```

The command uploads every `.xlsx` file in `output/workbooks/`. If a file with the same name already exists in the destination folder, it updates that file rather than creating a duplicate. You can override the configured folder for one run with `--folder-id YOUR_FOLDER_ID`; `--output` can select a different pipeline output root.

The PDF downloader uses OAuth credentials at `question_pipeline/secrets/drive-client.json` with a read-only token. Uploading uses that same desktop OAuth client configuration but creates a separate `question_pipeline/secrets/drive-upload-token.json` token with Drive write access, so the downloader's read-only token remains unchanged. The first upload run opens Google sign-in for this additional permission. The signed-in account must have permission to add files to the destination folder.
