"""Independent read-only Drive client with verified, resumable PDF downloads."""
import hashlib
import os
import re
from pathlib import Path
from google.auth.transport.requests import Request, AuthorizedSession
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from core.storage import BASE, DATA, read_json, sha256, write_json


SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
FIELDS = 'id,name,mimeType,modifiedTime,version,size,md5Checksum'
CHUNK = 8 * 1024 * 1024


def remote_signature(document):
    return {key: document.get(key) for key in ('id', 'version', 'modifiedTime', 'size', 'md5Checksum')}


def filename(document):
    # File ID prevents same-name collisions and survives remote renames.
    if not re.fullmatch(r'[A-Za-z0-9_-]+', document['id']):
        raise ValueError('Invalid Drive file ID')
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', Path(document['name']).stem).strip(' .')[:75]
    return document['id'] + '__' + (name or 'book') + '.pdf'


def download_one(document, directory, ledger, ledger_path, fetch_range, latest):
    directory.mkdir(parents=True, exist_ok=True)
    identity = document['id']
    signature = remote_signature(document)
    previous = ledger.get(identity, {})
    # Retain the established local filename after a Drive rename.
    local_name = previous.get('filename', filename(document))
    if Path(local_name).name != local_name:
        raise ValueError('Unsafe path in download ledger')
    target = directory / local_name
    # Recover a finished file even if the process died before writing its receipt,
    # or Drive changed only metadata such as the filename.
    if target.is_file() and document.get('md5Checksum') and target.stat().st_size == int(document['size']):
        with target.open('rb') as stream:
            matches = hashlib.file_digest(stream, 'md5').hexdigest() == document['md5Checksum']
        if matches:
            ledger[identity] = {'remote': signature, 'name': document['name'], 'filename': local_name,
                                'status': 'complete', 'sha256': sha256(target), 'bytes_downloaded': target.stat().st_size}
            write_json(ledger_path, ledger)
            print(f'Skip verified PDF: {document["name"]}', flush=True)
            return target
    if (previous.get('remote') == signature and previous.get('status') == 'complete'
            and target.is_file() and sha256(target) == previous.get('sha256')):
        print(f'Skip downloaded PDF: {document["name"]}', flush=True)
        return target
    size = int(document['size'])
    if size <= 0:
        raise ValueError('Drive PDF has an invalid size')
    partial = target.with_suffix('.pdf.part')
    offset = 0
    if (previous.get('remote') == signature and partial.is_file()
            and partial.stat().st_size == previous.get('bytes_downloaded')
            and sha256(partial) == previous.get('partial_sha256')):
        offset = partial.stat().st_size
    if not offset:
        partial.write_bytes(b'')
    record = {'remote': signature, 'name': document['name'], 'filename': local_name,
              'status': 'downloading', 'bytes_downloaded': offset}
    ledger[identity] = record
    running_hash = hashlib.sha256()
    with partial.open('rb') as prefix:
        while data := prefix.read(CHUNK):
            running_hash.update(data)
    record['partial_sha256'] = running_hash.hexdigest()
    write_json(ledger_path, ledger)
    try:
        with partial.open('ab') as stream:
            while offset < size:
                end = min(size - 1, offset + CHUNK - 1)
                data = fetch_range(document, offset, end)
                if len(data) != end - offset + 1:
                    raise ValueError('Incomplete download range; saved prefix will be reused')
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
                offset += len(data)
                running_hash.update(data)
                record.update(bytes_downloaded=offset, partial_sha256=running_hash.hexdigest())
                write_json(ledger_path, ledger)
                print(f'Download {document["name"]}: {offset}/{size} bytes', flush=True)
        if remote_signature(latest(identity)) != signature:
            raise ValueError('Drive PDF changed during download; rerun to fetch its new version')
        with partial.open('rb') as stream:
            if document.get('md5Checksum') and hashlib.file_digest(stream, 'md5').hexdigest() != document['md5Checksum']:
                record['partial_sha256'] = None  # Do not reuse corrupt bytes on the next run.
                raise ValueError('Downloaded PDF checksum differs from Drive')
        with partial.open('rb') as stream:
            if b'%PDF-' not in stream.read(1024):
                record['partial_sha256'] = None
                raise ValueError('Downloaded file does not contain a PDF header')
        checksum = sha256(partial)
        partial.replace(target)
        record.update(status='complete', sha256=checksum)
        record.pop('last_error', None)
        write_json(ledger_path, ledger)
        return target
    except (Exception, KeyboardInterrupt) as error:
        record.update(status='interrupted' if isinstance(error, KeyboardInterrupt) else 'failed',
                      last_error=f'{type(error).__name__}: {error}')
        write_json(ledger_path, ledger)
        raise


class Drive:
    def __init__(self):
       
        secret_dir = BASE / 'secrets'
        token = secret_dir / 'drive-token.json'
        credentials_file = secret_dir / 'drive-client.json'
        credentials = Credentials.from_authorized_user_file(str(token), SCOPES) if token.exists() else None
        if credentials and credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())
            except RefreshError:
                print('Saved Drive sign-in could not be refreshed; Google sign-in is required.')
                credentials = None
        if not credentials or not credentials.valid:
            if not credentials_file.is_file():
                raise ValueError('Place your Google OAuth desktop client JSON at question_pipeline/secrets/drive-client.json')
            credentials = InstalledAppFlow.from_client_secrets_file(str(credentials_file), SCOPES).run_local_server(port=55342)
        secret_dir.mkdir(parents=True, exist_ok=True)
        # Never print credentials or token contents.
        import json
        write_json(token, json.loads(credentials.to_json()))
        self.service = build('drive', 'v3', credentials=credentials, cache_discovery=False)
        self.session = AuthorizedSession(credentials)

    def list_pdfs(self, folder_id):
        if not re.fullmatch(r'[A-Za-z0-9_-]+', folder_id):
            raise ValueError('Invalid Drive folder ID')
        token = None
        documents = []
        while True:
            result = self.service.files().list(
                q=f"'{folder_id}' in parents and mimeType='application/pdf' and trashed=false",
                fields=f'nextPageToken,files({FIELDS})', pageToken=token, pageSize=100,
                supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
            documents.extend(result.get('files', []))
            token = result.get('nextPageToken')
            if not token:
                return sorted(documents, key=lambda item: (item['name'], item['id']))

    def latest(self, identity):
        return self.service.files().get(fileId=identity, fields=FIELDS, supportsAllDrives=True).execute()

    def fetch_range(self, document, start, end):
        url = f'https://www.googleapis.com/drive/v3/files/{document["id"]}'
        with self.session.get(url, params={'alt': 'media', 'supportsAllDrives': 'true'},
                headers={'Range': f'bytes={start}-{end}'}, stream=True, timeout=90) as response:
            response.raise_for_status()
            expected = f'bytes {start}-{end}/{document["size"]}'
            whole = start == 0 and end + 1 == int(document['size'])
            if not ((response.status_code == 206 and response.headers.get('Content-Range') == expected)
                    or (response.status_code == 200 and whole)):
                raise ValueError('Drive did not honor the requested download range')
            data = bytearray()
            for block in response.iter_content(256 * 1024):
                data.extend(block)
                if len(data) > end - start + 1:
                    raise ValueError('Drive returned too much data for the range')
            return bytes(data)

    def download(self, document):
        ledger_path = DATA / 'state/downloads.json'
        ledger = read_json(ledger_path, {})
        return download_one(document, DATA / 'downloads', ledger, ledger_path, self.fetch_range, self.latest)

    def close(self):
        self.session.close()
        self.service.close()
