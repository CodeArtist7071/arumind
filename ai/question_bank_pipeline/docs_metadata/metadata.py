import json
import os
from pathlib import Path


METADATA_FILE = Path(__file__).resolve().parents[1] / "data/downloads.json"


def load_metadata():

    if not os.path.exists(METADATA_FILE):
        return {}

    with open(METADATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def save_metadata(metadata):
    METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(METADATA_FILE, "w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=4, ensure_ascii=False)

        

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