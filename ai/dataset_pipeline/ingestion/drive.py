import io
import re
import os
import sys
from pathlib import Path

# Paths are relative to this script.
BASE_DIR = Path(__file__).resolve().parent
PARENT_DIR = BASE_DIR.parent
if str(PARENT_DIR) not in sys.path:
    sys.path.insert(0, str(PARENT_DIR))

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload
from .download_state import load_metadata, save_metadata
from datetime import datetime

TOKEN_FILE = BASE_DIR / "token.json"

CREDENTIALS_FILE = BASE_DIR / "drive-client.json"
DOWNLOAD_FOLDER = BASE_DIR / "google_docs"

# Google Drive Folder ID - Add your folder ID here:
FOLDER_ID = "1riH6Si-VnqYFqF3yard2PxWxPS6_J9w7"

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document"
DOCX_MIME_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)


def authenticate():
    creds = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(
            str(TOKEN_FILE), SCOPES
        )

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except RefreshError as error:
            print(f"Could not refresh credentials: {error}")
            print("Please sign in again.")
            creds = None

    if not creds or not creds.valid:
        if not CREDENTIALS_FILE.is_file():
            raise FileNotFoundError(
                f"Missing OAuth desktop-client file: {CREDENTIALS_FILE}"
            )

        flow = InstalledAppFlow.from_client_secrets_file(
            str(CREDENTIALS_FILE), SCOPES
        )
        creds = flow.run_local_server(port=56789)

    TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return creds


def create_drive_service():
    return build("drive", "v3", credentials=authenticate())


def clean_filename(name):
    # Remove characters that are invalid in Windows filenames.
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    name = name.strip().rstrip(". ")

    if not name:
        name = "Untitled"

    # Windows reserves these names, including when followed by extensions.
    reserved_names = {
        "CON", "PRN", "AUX", "NUL",
        *(f"COM{i}" for i in range(1, 10)),
        *(f"LPT{i}" for i in range(1, 10)),
    }

    if name.split(".")[0].upper() in reserved_names:
        name = f"_{name}"

    return name[:100].rstrip(". ")


GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document"
PDF_MIME_TYPE = "application/pdf"


def get_google_docs(service, folder_id):
    documents = []
    page_token = None

    query = (
        f"'{folder_id}' in parents "
        f"and mimeType='{PDF_MIME_TYPE}' "
        "and trashed=false"
    )

    while True:
        response = (
            service.files()
            .list(
                q=query,
                spaces="drive",
                fields="nextPageToken, files(id, name, mimeType, modifiedTime)",
                pageSize=100,
                pageToken=page_token,
            ).execute()
        )

        documents.extend(
            response.get("files", [])
        )

        page_token = response.get(
            "nextPageToken"
        )

        if not page_token:
            break

    return documents

def download_google_doc(
    service,
    document,
    metadata
):

    file_id = document["id"]

    file_name = clean_filename(
        document["name"]
    )

    print(f"Downloading: {file_name}")

    request = service.files().get_media(
        fileId=file_id,
    )

    file_data = io.BytesIO()

    downloader = MediaIoBaseDownload(
        file_data,
        request
    )

    done = False

    while not done:

        status, done = downloader.next_chunk()

        if status:

            progress = int(
                status.progress() * 100
            )

            print(
                f"Progress: {progress}%",
                end="\r"
            )

    output_path = os.path.join(
        DOWNLOAD_FOLDER,
        f"{file_name}"
    )

    with open(
        output_path,
        "wb"
    ) as file:

        file.write(
            file_data.getvalue()
        )

    # Store metadata
    metadata[file_id] = {
        "file_id": file_id,
        "name": document["name"],
        "mime_type": document["mimeType"],
        "modified_time":document.get("modifiedTime"),
        "local_path": output_path,
        "downloaded_at": datetime.now().isoformat(),
    }

    save_metadata(metadata)

    print(
        f"Downloaded: {output_path}"
    )


def should_download(document, metadata):
    file_id = document["id"]
    file_name = document["name"]

    # Best check: unique Google Drive file ID
    if file_id in metadata:
        print(f"Already downloaded: {file_name}")
        return False

    # Optional secondary check by name
    for saved_file in metadata.values():
        if saved_file.get("name") == file_name:
            print(f"File with same name already exists: {file_name}")
            return False

    return True