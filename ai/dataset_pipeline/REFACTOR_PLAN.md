# Plan to organize and optimize doc_pipeline

Status: proposed work only. This document does not change the running pipeline.

## Objective

Group code by responsibility, reduce repeated work, and make downloads and exports
safer to resume. Preserve existing extraction results, manual Excel corrections,
review approvals, and simple commands. Keep this pipeline independent from
`question_pipeline`; neither pipeline should import application code from the other.

## Existing behavior to preserve

- `python main.py`: local PDFs → chunked MinerU extraction → question candidates → Excel.
- `python excel.py`: export completed snapshots separately, including while extraction runs.
- `python clean_markdown.py --remove "phrase"`: separate Markdown cleanup.
- Five owning pages plus one overlap page; failed windows split into smaller windows.
- Checksummed extraction checkpoints and reuse of successful chunks.
- Existing reviewed workbooks are preserved.
- Jev remains disabled. Supabase publication requires the explicit review/mapping gate.
- Drive downloading and Docling comparison remain separate entry points unless explicitly changed.

## Findings from the current code

1. `run.py` combines orchestration with Excel-runtime discovery. `excel_only.py`
   imports runtime helpers from the orchestrator. Move those helpers into a shared core module.
2. Extraction and structuring import JSON-writing utilities from `question_gate.py`.
   Move generic state utilities into core; review rules should stay in the review module.
3. There are two different `main.py` files: the project-root launcher and the
   older Drive entry point in this folder. Document both and give the internal
   Drive implementation a descriptive module name.
4. The Drive implementation uses script-relative credentials/download locations,
   while the main extraction command defaults to `doc_pipeline/google_docs`.
   Metadata uses a working-directory-relative `metadata.json`. Reconcile these
   paths explicitly before moving code so existing downloads are still found.
5. The legacy Drive code uses imports such as `from docs_metadata.metadata ...`.
   Replace these with package imports, retaining compatibility with documented commands.
6. The legacy Docling module constructs `DocumentConverter` and creates its output
   directory during import. Initialize these only when Docling is requested.
7. The extraction CLI discovers `*.pdf`, while `run.py` handles extensions
   case-insensitively. Centralize PDF discovery and retain support for `.PDF`.

## Proposed layout

```text
doc_pipeline/
  __init__.py
  run.py                       Thin full-pipeline entry point
  cli.py                       Thin individual-stage entry point
  ingestion/
    drive.py                   Drive authentication, listing and downloading
    download_state.py          Download identity and progress ledger
  extraction/
    mineru.py                  Existing chunking and recovery implementation
    docling.py                 Optional, lazily loaded comparison adapter
  structuring/
    questions.py               Existing conservative question parser
  export/
    excel.py                   Export orchestration and resume receipts
    export_excel.mjs           Workbook generation
  review/
    gate.py                    Human approval and coverage checks
    jev.py                     Disabled optional adapter
  publishing/
    supabase.py                Mapping, preview and explicit upload
  core/
    paths.py                   Stable paths independent of current directory
    storage.py                 Atomic writes and checksum helpers
    runtime.py                 Python/Node runtime discovery
    locking.py                 Writer locks with crash recovery
  REFACTOR_PLAN.md
```

Create `__init__.py` in each package. Keep configuration, secrets, PDFs, and output
directories at their current locations during the first refactor. A later data
migration needs its own explicit mapping and validation.

## Module migration map

| Current implementation | Proposed implementation |
| --- | --- |
| `fetch_google_docs/doc_fetcher.py` | `ingestion/drive.py` |
| `docs_metadata/metadata.py` | `ingestion/download_state.py` |
| `extraction.py` | `extraction/mineru.py` |
| `send_docs_to_docling/docling_processor.py` | `extraction/docling.py` |
| `questions.py` | `structuring/questions.py` |
| `excel_only.py` | `export/excel.py` |
| `export_excel.mjs` | `export/export_excel.mjs` |
| `question_gate.py` | `review/gate.py` |
| `jev.py` | `review/jev.py` |
| `supabase_publish.py` | `publishing/supabase.py` |

Preserve old documented module commands with thin forwarding entry points where
needed. Because `extraction.py` becomes a package, its `__init__.py` can re-export
`extract` to keep `from doc_pipeline.extraction import extract` working. Update
internal imports, tests, the PowerShell export helper, and documentation together.

## Optimization priorities

### 1. Protect resume and reviewed data

- Keep current source hashes, chunk identities, manifests and output paths stable.
- A code move alone must not trigger PDF re-extraction or invalidate approval hashes.
- Write to temporary files and atomically replace only complete results.
- Add scoped writer locks to prevent simultaneous writers targeting the same book.
  Keep the separate Excel command able to read committed snapshots while extraction runs.
- Never infer that a pre-existing workbook is complete merely because it exists.
  Introduce export receipts for new workbooks; preserve legacy workbooks without
  receipts and report them for review instead of overwriting them.
- An interrupted new export should leave a staging file, not a final-looking workbook.

### 2. Strengthen download memory

- Track Drive file ID and remote revision/checksum rather than filename alone.
- Skip a download only when local bytes validate against the saved identity.
- Use ID-qualified filenames so different remote files with the same name do not collide.
- Stream into `.part` files. Resume only when the remote revision and saved prefix match.
- Validate completed bytes before final rename, then atomically update the ledger.
- Preserve existing download formats, including native Google Docs export behavior;
  confirm format-specific revision and verification rules before implementation.
- Import legacy ledger entries conservatively. Never delete old records or trust
  an unverified file simply to avoid a download.

### 3. Reduce avoidable processing

- Profile a representative bounded extraction before claiming a speed improvement.
- Keep model initialization lazy and reuse supported model instances within a run.
- Reuse immutable metadata within the current chunk; release it before the next chunk.
- Hash each unchanged artifact once per processing pass where safe. Validate again
  on the next run; do not weaken persistent checksum validation.
- Skip structuring/export when an input fingerprint and valid stage receipt match.
  Include parser/export format versions in the relevant fingerprints.
- Preserve five-page chunking initially. Benchmark changes before increasing chunk
  size or concurrency: model memory and question continuity take priority.

## Implementation sequence

1. Record the current commands, import dependencies, paths and baseline test results.
2. Stop the process being refactored before moving its modules. Do not modify or
   relocate its active outputs. The independent question pipeline is outside scope.
3. Move generic path/storage/runtime helpers into core without changing behavior.
4. Move one stage at a time and update callers plus compatibility entry points.
5. Verify legacy checkpoint reuse and workbook preservation before optimizing code.
6. Add download/export resume improvements separately, with migration tests.
7. Run the acceptance checks below, then update the root README with actual behavior.
8. Remove obsolete wrappers only after confirming no supported command uses them.
   Do not delete environments, weights, tokens or source PDFs as part of code cleanup.

## Acceptance checks

- Existing unit tests pass; add focused regression tests for changed behavior.
- Root launchers and documented module commands still work from their supported locations.
- Both lowercase and uppercase PDF extensions are discovered consistently.
- Importing the Docling adapter does not load models or create output directories.
- Interrupted extraction resumes completed parent/child chunks without repeating them.
- Changed/corrupt source artifacts invalidate only the relevant cached work.
- Edited Markdown does not unnecessarily invalidate extraction JSON checkpoints.
- Drive interruption, remote revision changes, same-name files and corrupt local downloads
  are handled without silently accepting incomplete data.
- Excel writes finish atomically; an interruption cannot masquerade as a finished workbook.
- Manually edited legacy Excel files remain untouched.
- Review coverage, content-change detection and Supabase payload validation remain intact.
- No automatic Jev calls, Supabase writes or cross-pipeline imports are introduced.
- A bounded real PDF and Excel readback check succeeds; distinguish this from a
  full-book extraction or accuracy benchmark in the completion report.

## Completion report

Report the final folder layout, unchanged commands, measured optimizations, tests
actually run, and any remaining limitations. Do not promise faster model inference
based solely on reorganizing files.
