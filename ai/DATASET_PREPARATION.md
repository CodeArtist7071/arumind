# Prepare extracted Markdown for embeddings

Run `python prepare_dataset.py` from the ai folder. It reads committed extraction
Markdown from the existing pipelines and creates JSONL under
`outputs/embedding-dataset/<snapshot>/`. It never edits the original Markdown,
images, model environments or extraction checkpoints. No GPU, API key or third-party
Python dependencies are required.

To select another folder or remove a specific phrase:

```powershell
python prepare_dataset.py "path/to/extractions" --remove "Join on Telegram"
```

Repeated `--remove` arguments are supported. Removal is literal and case-insensitive,
and is not applied inside detected code, math or table blocks. No promotion phrase
is removed by default. Underscores, equations and numbers remain intact.

## Generated files

- `chunks.jsonl`: all chunks, provenance, heading context, image references and flags.
- `text_candidates.jsonl`: chunks passing basic mechanical checks, still pending review.
- `needs_review.jsonl`: images needing descriptions, missing images, oversized units,
  short fragments and other detected issues.
- `report.json`: counts, exact-duplicate merges, explicit cleaning audit, skipped
  unfinished files, and repeated short-text suggestions.

## What the code does

1. Selects merged Markdown where present instead of reading its child chunks again.
   Otherwise it reads saved OCR chunks with completion markers. It can use completed
   chunks from an unfinished book; that does not imply full-book coverage.
2. Preserves explicit source-page comments; for legacy chunk Markdown without page
   markers it records the known page range rather than inventing an exact page.
3. Uses Markdown headings as context. Keeps fenced blocks, display math and potential
   numbered questions intact. Groups prose toward 2,400 characters. Oversized semantic
   units are flagged rather than truncated. Token estimates use characters/4 and must
   be replaced with the actual embedding model's tokenizer before embedding.
4. Removes explicit standalone page labels and user-specified phrases. Repeated text
   is suggested for review, not automatically erased from potentially valid lessons.
5. Merges exactly identical text chunks with the same heading/image context, retaining
   every source occurrence. It does not promise semantic deduplication or perfect
   removal of overlap pages whose chunk boundaries differ.
6. Resolves basic inline Markdown image links without fetching remote resources.
   Image-bearing chunks require visual review. Alt text is retained but not treated
   as a verified description; tables, charts and diagrams are not interpreted.

## Limits and next stage

This is a deterministic preparation tool, not an AI verifier. Question detection is
heuristic; numbered prose can be grouped conservatively as a possible question.
Basic inline image syntax is supported; unusual Markdown/HTML may need manual review.
Unclosed code/math and malformed source Markdown also require review. A clean-looking
chunk can still contain OCR mistakes that mechanical checks cannot detect.

Keep human corrections in a separate reviewed dataset; generated snapshot files are
not the review workspace. Original PDFs, Markdown and images remain the evidence.

Before generating vectors, choose the embedding model, validate its token limits,
review the candidate set, and supply verified image descriptions where necessary.
Embedding model ID/revision, content hash and preprocessing version should accompany
each vector. This command does not create vectors or upload anything to Supabase.
