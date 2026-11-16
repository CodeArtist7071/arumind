import os
import sys
import time
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

# Force stdout to UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# PDF and Docling imports
try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    from PyPDF2 import PdfReader, PdfWriter

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DoclingPipeline")

# Base directory configuration
BASE_DIR = Path(__file__).resolve().parent
INPUT_PDFS_DIR = BASE_DIR / "input_pdfs"
OUTPUT_DIR = BASE_DIR / "markdown_outputs"
TEMP_DIR = BASE_DIR / ".temp_chunks"
EXTRACTION_VERSION = 2


class RelationalDoclingPipeline:
    def __init__(self, chunk_size: int = 5):
        """
        Initialize the incremental PDF chunking and Markdown conversion pipeline.
        
        Args:
            chunk_size: Number of PDF pages stored in each Markdown chunk.
        """
        self.chunk_size = chunk_size
        INPUT_PDFS_DIR.mkdir(parents=True, exist_ok=True)
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        TEMP_DIR.mkdir(parents=True, exist_ok=True)

        # Configure Docling pipeline options for markdown extraction
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = True
        pipeline_options.do_table_structure = True

        format_options = {
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
        self.converter = DocumentConverter(format_options=format_options)

    def _get_pdf_total_pages(self, pdf_path: Path) -> int:
        reader = PdfReader(str(pdf_path))
        return len(reader.pages)

    def _extract_pdf_pages_to_temp(self, source_pdf: Path, start_page: int, end_page: int, temp_pdf_path: Path):
        """Extract a range of 1-indexed pages (inclusive) into a temp PDF file."""
        reader = PdfReader(str(source_pdf))
        writer = PdfWriter()
        
        # pypdf uses 0-based indexing
        for i in range(start_page - 1, min(end_page, len(reader.pages))):
            writer.add_page(reader.pages[i])
            
        with open(temp_pdf_path, "wb") as f:
            writer.write(f)

    def _convert_pages_to_markdown(
        self,
        source_pdf: Path,
        doc_id: str,
        chunk_id: str,
        start_page: int,
        end_page: int,
    ) -> str:
        """Convert pages independently while keeping them in one storage chunk."""
        reader = PdfReader(str(source_pdf))
        page_sections = []

        for page_number in range(start_page, end_page + 1):
            temp_page_path = TEMP_DIR / (
                f"{doc_id}_{chunk_id}_page_{page_number:04d}.pdf"
            )

            try:
                writer = PdfWriter()
                writer.add_page(reader.pages[page_number - 1])
                with open(temp_page_path, "wb") as temp_file:
                    writer.write(temp_file)

                conversion = self.converter.convert(str(temp_page_path))
                page_markdown = conversion.document.export_to_markdown().strip()
                page_sections.append(
                    f"<!-- PAGE: {page_number} -->\n\n{page_markdown}\n"
                )
            finally:
                if temp_page_path.exists():
                    try:
                        temp_page_path.unlink()
                    except OSError as cleanup_error:
                        logger.warning(
                            "Could not remove temporary page '%s': %s",
                            temp_page_path.name,
                            cleanup_error,
                        )

        return "\n".join(page_sections)

    def _load_or_create_manifest(self, doc_output_dir: Path, source_pdf: Path, total_pages: int) -> Dict[str, Any]:
        manifest_path = doc_output_dir / "manifest.json"
        doc_id = doc_output_dir.name

        if manifest_path.exists():
            try:
                with open(manifest_path, "r", encoding="utf-8") as f:
                    manifest_data = json.load(f)
                    if (
                        manifest_data.get("chunk_size") == self.chunk_size
                        and manifest_data.get("extraction_version")
                        == EXTRACTION_VERSION
                    ):
                        return manifest_data
                    else:
                        logger.info(
                            "Chunk configuration changed; re-creating manifest "
                            "(old size=%s, new size=%s, old version=%s, new version=%s).",
                            manifest_data.get("chunk_size"),
                            self.chunk_size,
                            manifest_data.get("extraction_version"),
                            EXTRACTION_VERSION,
                        )
            except Exception as e:
                logger.warning(f"Could not read existing manifest ({e}). Re-creating manifest.")

        total_chunks = (total_pages + self.chunk_size - 1) // self.chunk_size
        chunks_info = []

        for idx in range(total_chunks):
            chunk_num = idx + 1
            page_start = (idx * self.chunk_size) + 1
            page_end = min(chunk_num * self.chunk_size, total_pages)
            chunk_id = f"chunk_{chunk_num:04d}"
            
            chunks_info.append({
                "chunk_id": chunk_id,
                "chunk_index": chunk_num,
                "file": f"chunks/{chunk_id}.md",
                "page_start": page_start,
                "page_end": page_end,
                "status": "pending",
                "processed_at": None,
                "error": None
            })

        manifest = {
            "document_id": doc_id,
            "source": source_pdf.name,
            "total_pages": total_pages,
            "chunk_size": self.chunk_size,
            "extraction_version": EXTRACTION_VERSION,
            "total_chunks": total_chunks,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "chunks": chunks_info
        }

        self._save_manifest(doc_output_dir, manifest)
        return manifest

    def _save_manifest(self, doc_output_dir: Path, manifest: Dict[str, Any]):
        manifest_path = doc_output_dir / "manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

    def process_pdf(self, pdf_path: Path):
        """Process a single PDF into relational Markdown chunks with incremental state updates."""
        print(f"\n========================================================")
        print(f" PROCESSING: {pdf_path.name}")
        print(f"========================================================")

        total_pages = self._get_pdf_total_pages(pdf_path)
        doc_id = pdf_path.stem.lower().replace(" ", "_")
        doc_output_dir = OUTPUT_DIR / doc_id
        chunks_dir = doc_output_dir / "chunks"
        chunks_dir.mkdir(parents=True, exist_ok=True)

        manifest = self._load_or_create_manifest(doc_output_dir, pdf_path, total_pages)
        print(f"[+] Total Pages: {total_pages} | Chunk Size: {self.chunk_size} | Total Chunks: {manifest['total_chunks']}")

        for chunk_entry in manifest["chunks"]:
            chunk_id = chunk_entry["chunk_id"]
            chunk_file_rel = chunk_entry["file"]
            chunk_file_path = doc_output_dir / chunk_file_rel
            page_start = chunk_entry["page_start"]
            page_end = chunk_entry["page_end"]

            # Resumable Check: skip if already completed and output file exists
            if chunk_entry["status"] == "completed" and chunk_file_path.exists():
                print(f"[->] Skipping {chunk_id} (Pages {page_start}-{page_end}): Already Completed")
                continue

            print(f"\n[>] Processing {chunk_id} (Pages {page_start}-{page_end})...")
            start_time = time.time()
            try:
                # Convert each physical page independently so reading order and
                # page relationships are not lost inside a multi-page conversion.
                raw_markdown = self._convert_pages_to_markdown(
                    source_pdf=pdf_path,
                    doc_id=doc_id,
                    chunk_id=chunk_id,
                    start_page=page_start,
                    end_page=page_end,
                )

                # 3. Add Relational YAML Front Matter & Page Boundary Markers
                front_matter = (
                    f"---\n"
                    f"document_id: {doc_id}\n"
                    f"chunk_id: {chunk_id}\n"
                    f"chunk_index: {chunk_entry['chunk_index']}\n"
                    f"page_start: {page_start}\n"
                    f"page_end: {page_end}\n"
                    f"---\n\n"
                )

                final_markdown = front_matter + raw_markdown

                expected_markers = page_end - page_start + 1
                if final_markdown.count("<!-- PAGE:") != expected_markers:
                    raise ValueError(
                        f"Expected {expected_markers} page markers in {chunk_id}."
                    )

                # 4. Save markdown chunk immediately to release memory
                with open(chunk_file_path, "w", encoding="utf-8") as f:
                    f.write(final_markdown)

                elapsed = time.time() - start_time
                print(f"[OK] {chunk_id} finished in {elapsed:.2f}s -> {chunk_file_rel}")

                # 5. Update Manifest incrementally
                chunk_entry["status"] = "completed"
                chunk_entry["processed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
                chunk_entry["error"] = None
                self._save_manifest(doc_output_dir, manifest)

            except Exception as e:
                logger.error(f"Failed processing {chunk_id}: {e}")
                chunk_entry["status"] = "failed"
                chunk_entry["error"] = str(e)
                self._save_manifest(doc_output_dir, manifest)

        print(f"\n[OK] Processing finished for '{pdf_path.name}'.")
        print(f"[OK] Chunks & Manifest saved under: {doc_output_dir}\n")

    def run_all(self):
        """Find and process all PDFs in input_pdfs folder."""
        pdf_files = list(INPUT_PDFS_DIR.glob("*.pdf"))
        if not pdf_files:
            print(f"\n[!] No PDF files found in '{INPUT_PDFS_DIR}'.")
            print(f"[!] Place your PDFs in '{INPUT_PDFS_DIR}' and run again.\n")
            return

        for pdf_file in pdf_files:
            self.process_pdf(pdf_file)


if __name__ == "__main__":
    # Configurable chunk size (e.g. 5 pages per chunk to avoid C++ memory std::bad_alloc errors)
    pipeline = RelationalDoclingPipeline(chunk_size=5)
    pipeline.run_all()
