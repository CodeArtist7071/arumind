# PYQ Markdown-to-Excel pipeline

This package processes Markdown that has already been extracted. It does not fetch or OCR PDFs. It runs on Windows and writes an incremental SQLite state database, then exports an Excel workbook and companion JSONL for values beyond Excel's cell limit.

## Quick start (PowerShell)

```powershell
cd C:\Users\yoges\arumind\ai
python -m pip install -r pyq_pipeline\requirements.txt
python -m pyq_pipeline.pipeline inventory
```

Put `.md` or `.markdown` files under `pyq_pipeline\input\markdown`, then run:

```powershell
python -m pyq_pipeline.pipeline process --pilot 3 --no-llm
python -m pyq_pipeline.pipeline report
python -m pyq_pipeline.pipeline export
```

Workbook output is `pyq_pipeline\output\pyq_question_bank.xlsx`. The workbook is initialized before reading files and refreshed after each completed file; JSONL and SQLite checkpoints are refreshed alongside it. Re-running `process` skips unchanged files based on source, schema, and mapping signatures; `--retry-failed` retries recorded failures. `resume` uses the same idempotent processing path. Use `--file file.md` to select a file and `--dry-run` to parse without writing state/workbook.

## Runtime configuration

Edit `config/settings.yaml` to change folders, glob patterns, encoding, chunk sizes, retry policy, provider endpoint, model and export limits. The starter settings file is JSON syntax, valid YAML; PyYAML is installed for future normal YAML syntax. LLM extraction is off by default. To enable the optional OpenRouter adapter, set a model in settings and set the configured environment variable, e.g. `$env:OPENROUTER_API_KEY = "..."`; credentials are never read from config or logged. Deterministic parsing and Excel export need no key.

Subject and chapter are the mapping priorities. Add authoritative canonical names, aliases, and existing IDs to `config/subjects.json` and `config/chapters.json`. Subject must map first; a chapter is matched only within that subject, and a chapter label is optional. Exam and topic labels may remain in source metadata, but they do not affect mapping status or enter the mapping review queue. The parser reads explicit `Subject:` and `Chapter:` labels from Markdown; it does not classify a question from its wording. Unknown subject/chapter values are preserved and proposals are saved to `config/mapping-proposals.json`; fuzzy matches are suggestions only. `mappings audit` shows the loaded registry. `mappings approve` never invents IDs: edit proposals with authoritative values and IDs in the registry yourself. CSV/XLSX table import is available through `MappingRegistry.import_table` for scripted admin workflows.

To refresh the registries from Supabase, set `SUPABASE_URL` and a SELECT-capable `SUPABASE_ANON_KEY` in the shell, then run `python -m pyq_pipeline.sync_mappings`. The sync reads the `exams`, `subjects`, `chapters`, and `topics` REST tables and writes their existing IDs and names into the JSON files. The current Supabase REST API does not expose `topics`, so that registry stays empty until the table is made available. Never use a service-role key for this workflow.

For a workbook template, pass `--template C:\\path\\template.xlsx` or set `export.template`. Put exact headers on row 1, then fill `export.column_mapping` with an explicit `"Header": "record_field"` mapping. Fields can use dotted paths such as `exam.year` or standard flattened field names such as `question_text`, `option_a`, and `source_file`. Unmapped headers stop export with an actionable error; the template itself is not overwritten.

## Pipeline and recovery

The parser supports numbered question stems, common option labels (including inline `(a)`–`(d)` choices), page markers, headings, simple inline answers/explanations, headed answer-key rows, and unheaded runs such as `1. (b) 2. (a)`. It preserves Markdown segments, offsets, hashes, and page markers. The optional bounded LLM pass attempts question-like chunks that do not overlap a deterministically recognized question; it receives preceding source context and recent-question memory, and every result must quote owned source text and remains reviewable. It does not solve questions or treat model answers as verified. Logs are written to the terminal and rotating files under `logs/`.

SQLite at `intermediate/state.sqlite3` is the restart checkpoint. A changed file hash is reprocessed. Each file's records and answer keys commit transactionally. Answer keys are associated only when the source stem and question number resolve uniquely; ambiguous number-only matches are left untouched. Exact duplicate text is reported conservatively and never deleted. The output workbook contains Questions, Review Queue, Mapping Audit, Duplicate Candidates, and Processing Summary sheets.

## Commands

```text
python -m pyq_pipeline.pipeline import-extractions
python -m pyq_pipeline.pipeline inventory
python -m pyq_pipeline.pipeline process [--pilot N] [--file PATH] [--no-llm] [--dry-run]
python -m pyq_pipeline.pipeline resume [--retry-failed]
python -m pyq_pipeline.pipeline validate
python -m pyq_pipeline.pipeline mappings audit
python -m pyq_pipeline.pipeline mappings propose
python -m pyq_pipeline.pipeline mappings approve
python -m pyq_pipeline.pipeline export
python -m pyq_pipeline.pipeline report
```

`validate` reports the current persisted record set. `process` and `resume` also refresh the workbook. Exit code 2 indicates one or more file processing failures. Review `Review Queue` and SQLite `files.error` before rerunning. The parser is intentionally conservative; custom document formats should be represented in fixtures and parser tests before bulk ingestion.

See [DATA_DICTIONARY.md](DATA_DICTIONARY.md) for all workbook fields. Tests use synthetic Markdown and mocked dependencies; run `python -m pytest pyq_pipeline/tests`.
