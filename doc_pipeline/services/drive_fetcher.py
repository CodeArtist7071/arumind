import os
import io
import json
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2.service_account import Credentials

SCOPES = ["https://www.googleapis.com/auth/drive"]

def download_pdf(file_id, file_name, service):

    request = service.files().get_media(fileId=file_id)

    os.makedirs("pdfs", exist_ok=True)

    fh = io.FileIO(f"pdfs/{file_name}", "wb")
    downloader = MediaIoBaseDownload(fh, request)

    done = False
    while not done:
        status, done = downloader.next_chunk()

    return f"pdfs/{file_name}"