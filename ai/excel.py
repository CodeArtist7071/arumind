"""Convert completed extraction outputs only: python excel.py"""
import subprocess
import sys
from pathlib import Path


def main():
    root = Path(__file__).resolve().parent
    python = root / '.venv-mineru' / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
    if not python.is_file():
        raise SystemExit('Project environment is missing. Follow README.md setup.')
    return subprocess.run([str(python), '-m', 'doc_pipeline.excel_only', *sys.argv[1:]], cwd=root).returncode


if __name__ == '__main__':
    raise SystemExit(main())
