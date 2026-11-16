"""Optional advisory question review: python ai_review.py."""
import subprocess
import sys
from pathlib import Path


if __name__ == '__main__':
    root = Path(__file__).resolve().parent
    python = root / '.venv-questions' / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
    if not python.is_file():
        raise SystemExit('Project environment is missing. Follow README.md setup.')
    raise SystemExit(subprocess.run([str(python), '-m', 'question_pipeline.ai.review', *sys.argv[1:]], cwd=root).returncode)
