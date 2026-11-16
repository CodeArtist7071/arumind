import os
import sys
import time
import shutil
import json
import logging
from pathlib import Path
from typing import Optional, List

# Force stdout to UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add parent directory to sys.path to access config.py if needed
CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent
if str(PARENT_DIR) not in sys.path:
    sys.path.insert(0, str(PARENT_DIR))

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("QuestionPipelineMain")

# Import Local Pipeline Modules
from docling_processor import RelationalDoclingPipeline, INPUT_PDFS_DIR, OUTPUT_DIR as MARKDOWN_OUTPUTS_DIR, TEMP_DIR
from question_parser import RelationalQuestionParserPipeline, EXCEL_OUTPUTS_DIR

# Import Google Drive API dependencies if available
try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2 import service_account
    DRIVE_API_AVAILABLE = True
except ImportError:
    DRIVE_API_AVAILABLE = False

# Configuration & Google Drive Setup
SERVICE_ACCOUNT_FILE = PARENT_DIR / "credentials.json"
if not SERVICE_ACCOUNT_FILE.exists():
    SERVICE_ACCOUNT_FILE = CURRENT_DIR / "credentials.json"

try:
    from config import GOOGLE_DRIVE_FOLDER_ID
except ImportError:
    GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")

SCOPES = ["https://www.googleapis.com/auth/drive"]


class GoogleDriveUploader:
    def __init__(self):
        self.service = None
        if not DRIVE_API_AVAILABLE:
            logger.warning("[DRIVE] googleapiclient module not installed. Drive upload will be skipped.")
            return

        if not SERVICE_ACCOUNT_FILE.exists():
            logger.warning(f"[DRIVE] Service account key '{SERVICE_ACCOUNT_FILE}' not found. Drive upload skipped.")
            return

        try:
            creds = service_account.Credentials.from_service_account_file(
                str(SERVICE_ACCOUNT_FILE), scopes=SCOPES
            )
            self.service = build("drive", "v3", credentials=creds)
            logger.info("[DRIVE] Google Drive API client initialized successfully.")
        except Exception as e:
            logger.error(f"[DRIVE] Failed to initialize Google Drive client: {e}")
            self.service = None

    def create_drive_folder(self, folder_name: str, parent_id: Optional[str] = None) -> Optional[str]:
        """Create a folder on Google Drive and return its Folder ID."""
        if not self.service:
            return None

        metadata = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder"
        }
        if parent_id:
            metadata["parents"] = [parent_id]

        try:
            folder = self.service.files().create(body=metadata, fields="id").execute()
            logger.info(f"[DRIVE] Created Drive folder '{folder_name}' (ID: {folder.get('id')})")
            return folder.get("id")
        except Exception as e:
            logger.error(f"[DRIVE] Failed to create Drive folder '{folder_name}': {e}")
            return None

    def upload_file(self, local_file_path: Path, drive_parent_id: Optional[str] = None) -> bool:
        """Upload a single file to Google Drive and verify API success response ID."""
        if not self.service or not local_file_path.exists():
            return False

        file_metadata = {"name": local_file_path.name}
        if drive_parent_id:
            file_metadata["parents"] = [drive_parent_id]

        try:
            media = MediaFileUpload(str(local_file_path), resumable=True)
            uploaded_file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields="id, name"
            ).execute()
            
            drive_id = uploaded_file.get("id")
            if drive_id:
                logger.info(f"[DRIVE SUCCESS] Uploaded '{local_file_path.name}' -> Drive File ID: {drive_id}")
                return True
            else:
                logger.error(f"[DRIVE ERROR] Drive API returned no file ID for '{local_file_path.name}'.")
                return False
        except Exception as e:
            logger.error(f"[DRIVE ERROR] Exception uploading '{local_file_path.name}': {e}")
            return False

    def upload_document_outputs(self, doc_id: str, doc_output_dir: Path, excel_file: Optional[Path]) -> bool:
        """
        Uploads all generated Markdown chunk files and Excel spreadsheet to Google Drive.
        Returns True ONLY if EVERY file returns a verified successful response ID from Google Drive API.
        """
        if not self.service:
            logger.warning(f"[DRIVE] Google Drive service not authenticated. Skipping upload for '{doc_id}'.")
            return False

        logger.info(f"[DRIVE] Starting upload for document '{doc_id}'...")
        
        # 1. Create main document folder on Drive
        doc_folder_id = self.create_drive_folder(doc_id, parent_id=GOOGLE_DRIVE_FOLDER_ID if GOOGLE_DRIVE_FOLDER_ID else None)
        if not doc_folder_id:
            logger.error(f"[DRIVE ERROR] Failed to get Folder ID from Drive for '{doc_id}'. Aborting cleanup.")
            return False

        # 2. Upload manifest and parse state if present
        for meta_file in ["manifest.json", "parse_state.json"]:
            m_path = doc_output_dir / meta_file
            if m_path.exists():
                meta_success = self.upload_file(m_path, drive_parent_id=doc_folder_id)
                if not meta_success:
                    logger.error(f"[DRIVE ERROR] Upload for metadata file '{meta_file}' unverified. Aborting cleanup.")
                    return False

        # 3. Create 'chunks' subfolder on Drive and upload all .md chunks
        chunks_dir = doc_output_dir / "chunks"
        if chunks_dir.exists():
            drive_chunks_folder_id = self.create_drive_folder("chunks", parent_id=doc_folder_id)
            if not drive_chunks_folder_id:
                logger.error(f"[DRIVE ERROR] Failed creating 'chunks' folder on Drive. Aborting cleanup.")
                return False

            md_files = list(chunks_dir.glob("*.md"))
            for md_file in md_files:
                chunk_success = self.upload_file(md_file, drive_parent_id=drive_chunks_folder_id)
                if not chunk_success:
                    logger.error(f"[DRIVE ERROR] Upload for chunk file '{md_file.name}' unverified. Aborting cleanup.")
                    return False

        # 4. Create 'parsed_questions' subfolder on Drive and upload all .json question files
        parsed_q_dir = doc_output_dir / "parsed_questions"
        if parsed_q_dir.exists():
            drive_pq_folder_id = self.create_drive_folder("parsed_questions", parent_id=doc_folder_id)
            if not drive_pq_folder_id:
                logger.error(f"[DRIVE ERROR] Failed creating 'parsed_questions' folder on Drive. Aborting cleanup.")
                return False

            json_files = list(parsed_q_dir.glob("*.json"))
            for j_file in json_files:
                j_success = self.upload_file(j_file, drive_parent_id=drive_pq_folder_id)
                if not j_success:
                    logger.error(f"[DRIVE ERROR] Upload for parsed question file '{j_file.name}' unverified. Aborting cleanup.")
                    return False

        # 5. Upload generated Excel file if exists
        if excel_file and excel_file.exists():
            excel_success = self.upload_file(excel_file, drive_parent_id=doc_folder_id)
            if not excel_success:
                logger.error(f"[DRIVE ERROR] Upload for Excel output '{excel_file.name}' unverified. Aborting cleanup.")
                return False

        logger.info(f"[DRIVE VERIFIED SUCCESS] All files for '{doc_id}' received successful Drive API response IDs.")
        return True


def perform_safe_cleanup(doc_id: str, doc_output_dir: Path, source_pdf_files: List[Path]):
    """
    Cleans up input PDFs and heavy Markdown chunk files ONLY after successful upload to Google Drive.
    Preserves memory state files (manifest.json, parse_state.json) intact.
    """
    logger.info(f"[CLEANUP] Performing safe cleanup for document '{doc_id}'...")

    # 1. Delete Markdown .md chunk files to free disk space (keep manifest.json and parse_state.json intact)
    chunks_dir = doc_output_dir / "chunks"
    if chunks_dir.exists():
        md_files = list(chunks_dir.glob("*.md"))
        deleted_chunks = 0
        for md_file in md_files:
            try:
                md_file.unlink()
                deleted_chunks += 1
            except Exception as e:
                logger.warning(f"[CLEANUP] Could not delete '{md_file.name}': {e}")
        logger.info(f"[CLEANUP] Deleted {deleted_chunks} heavy Markdown chunk files from '{chunks_dir}'. (Memory manifest intact)")

    # 2. Delete source input PDF files
    for pdf_file in source_pdf_files:
        if pdf_file.exists():
            try:
                pdf_file.unlink()
                logger.info(f"[CLEANUP] Deleted source PDF '{pdf_file.name}' from '{INPUT_PDFS_DIR}'.")
            except Exception as e:
                logger.warning(f"[CLEANUP] Could not delete source PDF '{pdf_file.name}': {e}")

    # 3. Clean temp folder
    if TEMP_DIR.exists():
        for temp_file in TEMP_DIR.glob(f"{doc_id}_*"):
            try:
                temp_file.unlink()
            except Exception:
                pass


def run_full_pipeline():
    """
    Main Orchestrator Workflow:
    1. Run Docling PDF Converter (PDF -> Markdown Chunks)
    2. Run Relational Question Parser (Markdown -> JSON & Excel)
    3. Upload Extracted Outputs to Google Drive
    4. Perform Safe Cleanup (only after successful upload)
    """
    print(f"\n========================================================")
    print(f"       STARTING RELATIONAL QUESTION PIPELINE MAIN       ")
    print(f"========================================================\n")

    # Step 1: Run PDF to Markdown conversion
    logger.info("STAGE 1: Converting PDFs to Relational Markdown Chunks...")
    docling_pipeline = RelationalDoclingPipeline()
    docling_pipeline.run_all()

    # Step 2: Run Question Extraction to Excel
    logger.info("STAGE 2: Parsing MCQs & Exporting to Excel...")
    question_pipeline = RelationalQuestionParserPipeline()
    question_pipeline.run_all()

    # Step 3: Initialize Google Drive Uploader
    uploader = GoogleDriveUploader()

    # Step 4: Iterate processed document directories and upload/clean
    doc_dirs = [d for d in MARKDOWN_OUTPUTS_DIR.iterdir() if d.is_dir()]
    if not doc_dirs:
        logger.info("[MAIN] No processed document output directories found.")
        return

    for doc_dir in doc_dirs:
        doc_id = doc_dir.name
        
        # Locate corresponding source PDF in input_pdfs
        pdf_matches = list(INPUT_PDFS_DIR.glob(f"*.pdf"))
        doc_pdfs = [p for p in pdf_matches if p.stem.lower().replace(" ", "_") == doc_id]

        # Locate corresponding excel output
        excel_matches = list(EXCEL_OUTPUTS_DIR.glob(f"{doc_id}*.xlsx"))
        excel_file = excel_matches[0] if excel_matches else None

        # Upload outputs to Google Drive
        upload_success = uploader.upload_document_outputs(doc_id, doc_dir, excel_file)

        # Step 5: Safe Cleanup only on successful upload
        if upload_success:
            perform_safe_cleanup(doc_id, doc_dir, doc_pdfs)
        else:
            logger.info(f"[MAIN] Keeping local files for '{doc_id}' intact (Drive upload was skipped or unverified).")

    print(f"\n========================================================")
    print(f"       PIPELINE EXECUTION COMPLETED SUCCESSFULLY        ")
    print(f"========================================================\n")


if __name__ == "__main__":
    run_full_pipeline()
