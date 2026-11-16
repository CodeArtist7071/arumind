"""Upload generated Excel workbooks to a configured Google Drive folder."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any


PIPELINE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_DIR.parents[1]
DEFAULT_WORKBOOK_DIR = PIPELINE_DIR / "output" / "workbooks"
CONFIG_PATH = PIPELINE_DIR / "config.json"
OAUTH_DIR = REPO_ROOT / "question_pipeline" / "secrets"
CLIENT_PATH = OAUTH_DIR / "drive-client.json"
TOKEN_PATH = OAUTH_DIR / "drive-upload-token.json"
SCOPES = ["https://www.googleapis.com/auth/drive"]


def configured_folder_id(override: str | None = None) -> str:
    folder_id = override or os.getenv("PYQ_WORKBOOK_DRIVE_FOLDER_ID")
    if not folder_id and CONFIG_PATH.is_file():
        config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        folder_id = config.get("workbook_drive_folder_id")
    folder_id = str(folder_id or "").strip()
    if not folder_id:
        raise ValueError(
            "Set workbook_drive_folder_id in pyq_pipeline/decision_pipeline/config.json "
            "or pass --folder-id."
        )
    if not re.fullmatch(r"[A-Za-z0-9_-]+", folder_id):
        raise ValueError("Invalid Google Drive folder ID")
    return folder_id


def _drive_service():
    try:
        from google.auth.exceptions import RefreshError
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise RuntimeError(
            "Google Drive upload dependencies are missing. Install pyq_pipeline/requirements.txt."
        ) from exc

    OAUTH_DIR.mkdir(parents=True, exist_ok=True)
    credentials = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES) if TOKEN_PATH.is_file() else None
    if credentials and credentials.expired and credentials.refresh_token:
        try:
            credentials.refresh(Request())
        except RefreshError:
            credentials = None
    if not credentials or not credentials.valid or not credentials.has_scopes(SCOPES):
        if not CLIENT_PATH.is_file():
            raise FileNotFoundError(
                f"Missing Google OAuth desktop client: {CLIENT_PATH}"
            )
        # Upload uses a separate token because the PDF downloader's token is read-only.
        credentials = InstalledAppFlow.from_client_secrets_file(
            str(CLIENT_PATH), SCOPES
        ).run_local_server(port=55342)
    TOKEN_PATH.write_text(credentials.to_json(), encoding="utf-8")
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


def upload_workbooks(workbook_dir: Path, folder_id: str | None = None) -> dict[str, Any]:
    target_folder = configured_folder_id(folder_id)
    paths = sorted(
        (path for path in workbook_dir.glob("*.xlsx") if path.is_file()),
        key=lambda path: path.name.casefold(),
    )
    if not paths:
        return {"folder_id": target_folder, "uploaded": 0, "files": []}

    service = _drive_service()
    from googleapiclient.http import MediaFileUpload

    try:
        folder = service.files().get(
            fileId=target_folder,
            fields="id,name,mimeType,capabilities(canAddChildren)",
            supportsAllDrives=True,
        ).execute()
        if folder.get("mimeType") != "application/vnd.google-apps.folder":
            raise ValueError("The configured Drive ID is not a folder")
        if folder.get("capabilities", {}).get("canAddChildren") is False:
            raise PermissionError("The signed-in Google account cannot add files to this folder")

        existing: dict[str, list[dict[str, str]]] = {}
        page_token = None
        while True:
            response = service.files().list(
                q=f"'{target_folder}' in parents and trashed=false",
                spaces="drive",
                fields="nextPageToken,files(id,name,mimeType)",
                pageSize=1000,
                pageToken=page_token,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            ).execute()
            for item in response.get("files", []):
                existing.setdefault(item.get("name", ""), []).append(item)
            page_token = response.get("nextPageToken")
            if not page_token:
                break

        results = []
        for path in paths:
            matches = existing.get(path.name, [])
            if len(matches) > 1:
                raise RuntimeError(
                    f"Multiple Drive files named {path.name!r} already exist in the destination folder."
                )
            media = MediaFileUpload(
                str(path),
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                resumable=True,
            )
            if matches:
                result = service.files().update(
                    fileId=matches[0]["id"],
                    media_body=media,
                    fields="id,name,webViewLink",
                    supportsAllDrives=True,
                ).execute()
                action = "updated"
            else:
                result = service.files().create(
                    body={"name": path.name, "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                          "parents": [target_folder]},
                    media_body=media,
                    fields="id,name,webViewLink",
                    supportsAllDrives=True,
                ).execute()
                action = "created"
            results.append({
                "name": result.get("name", path.name),
                "action": action,
                "id": result.get("id"),
                "webViewLink": result.get("webViewLink"),
            })
        return {"folder_id": target_folder, "uploaded": len(results), "files": results}
    finally:
        service.close()
