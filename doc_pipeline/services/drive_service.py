import os
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2 import service_account
from config import GOOGLE_DRIVE_FOLDER_ID

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

SERVICE_ACCOUNT_FILE = "credentials.json"


def get_drive_service():

    print("[DRIVE] Initializing Google Drive service")

    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print("[DRIVE ERROR] credentials.json not found!")
        raise FileNotFoundError("credentials.json is missing")

    print("[DRIVE] Loading service account credentials")

    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )

    print("[DRIVE] Building Drive API client")

    service = build("drive", "v3", credentials=credentials)

    print("[DRIVE] Google Drive service ready")

    return service


def download_pdfs():

    print("[DRIVE] Starting PDF download process")

    service = get_drive_service()

    print(f"[DRIVE] Searching for PDFs in folder: {GOOGLE_DRIVE_FOLDER_ID}")

    results = service.files().list(
        q=f"'{GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='application/pdf'",
        fields="files(id, name)"
    ).execute()

    files = results.get("files", [])

    print(f"[DRIVE] Found {len(files)} PDF files")

    os.makedirs("pdfs", exist_ok=True)

    downloaded = []

    for file in files:

        print(f"[DRIVE] Downloading: {file['name']}")

        request = service.files().get_media(fileId=file["id"])

        path = os.path.join("pdfs", file["name"])

        with open(path, "wb") as f:
            downloader = MediaIoBaseDownload(f, request)

            done = False
            while not done:
                status, done = downloader.next_chunk()

                if status:
                    print(f"[DRIVE] Download progress: {int(status.progress() * 100)}%")

        print(f"[DRIVE] Download complete: {path}")

        downloaded.append(path)

    print(f"[DRIVE] Total downloaded PDFs: {len(downloaded)}")

    return downloaded