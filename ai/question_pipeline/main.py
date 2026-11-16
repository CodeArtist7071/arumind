"""One-command launcher: python question_pipeline/main.py"""
import subprocess
import sys
from pathlib import Path


def main():
    if sys.argv[1:2] == ['--remove-telegram']:
        from clean_markdown import main as clean
        return clean(['--remove', 'telegram', *sys.argv[2:]])

    root = Path(__file__).resolve().parent
    project_root = root.parent
    for import_root in (project_root, root):
        if str(import_root) not in sys.path:
            sys.path.insert(0, str(import_root))

    python = None
    for search_dir in (project_root, root, project_root.parent):
        candidate = search_dir / '.venv-questions' / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
        if candidate.is_file():
            python = candidate
            break
    if python is None:
        python = sys.executable

    args = sys.argv[1:]
    # Run Drive authentication under the same isolated Python used for OCR. This
    # avoids mixing the caller's global requests/google packages with the venv.
    if Path(sys.executable).resolve() != python.resolve():
        return subprocess.run([str(python), str(Path(__file__).resolve()), *args],
                              cwd=project_root).returncode

    bypass_drive = any(flag in args for flag in ('--excel-only', '--document', '--help', '-h'))
    has_local_input = bool(args and not args[0].startswith('-'))
    if not bypass_drive and not has_local_input:
        from core.storage import BASE, DATA, read_json
        from ingestion.drive import Drive

        config = read_json(BASE / 'config.json')
        drive = None
        try:
            try:
                drive = Drive()
            except ValueError as error:
                token = BASE / 'secrets' / 'drive-token.json'
                if 'missing fields refresh_token' not in str(error) or not token.is_file():
                    raise
                # Preserve the malformed token for diagnosis; Drive() will start
                # the normal OAuth sign-in because the active token is now absent.
                backup = token.with_name(f'drive-token.invalid-{token.stat().st_mtime_ns}.json')
                token.replace(backup)
                print(f'Saved Drive token lacked a refresh token; starting sign-in. '
                      f'Previous token preserved as {backup.name}.', flush=True)
                drive = Drive()
            remote_pdfs = drive.list_pdfs(config['drive_folder_id'])
            if not remote_pdfs:
                print('No PDFs found in the configured Google Drive folder.')
                return 0
            downloaded = []
            for index, item in enumerate(remote_pdfs, 1):
                print(f'Downloading PDF {index}/{len(remote_pdfs)}: {item["name"]}', flush=True)
                downloaded.append(drive.download(item))
        except (KeyError, OSError, RuntimeError, ValueError) as error:
            print(f'Google Drive download failed; OCR was not started: {error}', file=sys.stderr)
            return 1
        finally:
            if drive is not None:
                drive.close()

        if '--download-only' in args:
            print(f'Downloaded/verified {len(downloaded)} PDF(s). OCR was not started.')
            return 0
        args = [str(DATA / 'downloads'), *args]

    return subprocess.run([str(python), '-m', 'run', *args], cwd=root).returncode


if __name__ == '__main__':
    raise SystemExit(main())

