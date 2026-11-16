# Question Pipeline Documentation

This directory contains the Relational PDF Chunking, Question Extraction, Google Drive Upload, and Excel Export Pipeline.

---

## 📁 Directory Structure

```text
doc_pipeline/question_pipeline/
├── main.py                         # Full Pipeline Orchestrator (Convert -> Parse -> Drive Upload -> Cleanup)
├── docling_processor.py            # Extracts PDF pages into relational Markdown chunks
├── question_parser.py              # Parses Markdown chunks into structured questions (JSON & Excel)
├── question_parser.md              # Complete Technical Workflow & Code Syntax Guide
├── README.md                       # Documentation (This file)
├── input_pdfs/                     # Source PDF documents folder
├── markdown_outputs/               # Processed Markdown chunks and state manifests
│   └── <doc_id>/
│       ├── manifest.json           # Document structure memory
│       ├── parse_state.json        # Question parser state tracker (for resumability)
│       ├── chunks/                 # Markdown chunks (5 pages each)
│       └── parsed_questions/       # Extracted question JSON files per chunk
└── excel_outputs/                  # Output Excel spreadsheets (.xlsx)
    └── <doc_id>_questions.xlsx
```

---

## 🚀 How to Run

### Option 1: Full End-to-End Automated Pipeline (Recommended)
Runs conversion, question parsing, Google Drive upload, and performs post-upload cleanup automatically:
```powershell
cd c:\Users\yoges\arumind\doc_pipeline\question_pipeline
python main.py
```

### Option 2: Step-by-Step Manual Execution

#### Step 1: Process PDF into Markdown Chunks
```powershell
cd c:\Users\yoges\arumind\doc_pipeline\question_pipeline
python docling_processor.py
```

#### Step 2: Parse Questions into Excel
```powershell
cd c:\Users\yoges\arumind\doc_pipeline\question_pipeline
python question_parser.py
```

---

## ☁️ Google Drive Upload & Post-Upload Safe Cleanup (`main.py`)

`main.py` manages cloud backups and local disk cleanup safely:

1. **Upload & Verification Phase**: 
   - Uploads each document file (metadata, `.md` chunks, `.xlsx` spreadsheet) to Google Drive via Drive API v3.
   - **Strict Verification Rule**: `main.py` inspects the response from Google Drive API for every single uploaded file. It requires an explicit, valid Google Drive File ID (`uploaded_file.get("id")`) returned by the API.

2. **Conditional Safe Cleanup**:
   - **ONLY IF a successful response message & File ID are returned for EVERY file**:
     - Deletes raw `.pdf` files from `input_pdfs/`.
     - Deletes heavy `.md` chunk files from `markdown_outputs/<doc_id>/chunks/` to free up disk space.
   - **Preserves Memory Intact**:
     - `manifest.json` and `parse_state.json` are **never deleted**. The pipeline keeps memory intact so it knows what was previously processed.
   - **If Upload Fails, Is Skipped, or Returns No Drive ID**:
     - Keeps all local `.pdf`, `.md`, and `.xlsx` files intact to prevent any data loss.

---

## ⚙️ Architecture & Fallback Mechanism

`question_parser.py` uses a **3-tier resilient fallback architecture** to ensure question extraction never crashes or fails even if API limits or network issues occur:

```text
┌───────────────────────────────────────────────────────────┐
│ Attempt 1: Primary LLM (gemini-2.5-flash-lite)           │
└─────────────────────────────┬─────────────────────────────┘
                              │ (If Rate Limited / Errored)
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Attempt 2: Fallback LLM (gemini-2.5-flash)              │
└─────────────────────────────┬─────────────────────────────┘
                              │ (If API Unavailable)
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Attempt 3: Local Regex Question Extractor                 │
└─────────────────────────────┬─────────────────────────────┘
```

---

## 💾 Resumable State & Stopping

The parser has **full state memory**:
- Each chunk's extracted questions are saved immediately to `markdown_outputs/<doc_id>/parsed_questions/chunk_XXXX.json`.
- The completion state is recorded in `parse_state.json`.
- If you stop the execution (`Ctrl+C` or closing terminal), you can re-run `python main.py` or `python question_parser.py` at any time. It will **skip already completed chunks** and resume from where it stopped.

---

## 📊 Excel Output Structure (`.xlsx`)

The final output is saved to `excel_outputs/<doc_id>_questions.xlsx` containing the following columns:

| Column Name | Description |
|---|---|
| `Question ID` | Auto-incremented identifier (e.g. `QST_00001`) |
| `Document ID` | Source document ID (e.g. `arihant-general-studies`) |
| `Chunk ID` | Source chunk ID (e.g. `chunk_0001`) |
| `Page Start` | Starting PDF page number |
| `Page End` | Ending PDF page number |
| `Question Text` | Full question text statement |
| `Option A` | Text for choice A |
| `Option B` | Text for choice B |
| `Option C` | Text for choice C |
| `Option D` | Text for choice D |
| `Correct Option` | Correct answer key (`A`, `B`, `C`, or `D`) |
| `Explanation` | Solution / explanation (if available) |
| `Subject` | Extracted subject (e.g., History, Polity) |
| `Topic` | Extracted chapter / topic |
| `Extraction Model` | Strategy used (`Primary LLM`, `Fallback LLM`, or `Regex Extractor`) |
