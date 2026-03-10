# Document Processing Pipeline

This directory contains the Python-based pipeline for processing exam and subject documents. 

## Features
- Downloads PDF files from Google Drive.
- Splits PDFs into images and runs OCR text extraction.
- Analyzes unstructured text to extract questions, multi-choice options, and diagrams.
- Evaluates the text using Gemini AI to map to exact topics/chapters.
- Resolves math-based questions to determine the correct logical answer.
- Securely skips tracking API credentials (`credentials.json`, `google-vision-ocr.json`) and configuration values (`config.py`).
- Pushes finalized parsing data cleanly into Supabase tables.

## Execution
Run the pipeline directly via:
```bash
python main.py
```
