"""One-command launcher: python main.py"""
import subprocess
import sys
from pathlib import Path


def main():
    if sys.argv[1:2] == ['--remove-telegram']:
        from clean_markdown import main as clean
        return clean(['--remove', 'telegram', *sys.argv[2:]])
    root = Path(__file__).resolve().parent
    python = None
    for search_dir in (root, root.parent, root.parent.parent):
        candidate = search_dir / '.venv-mineru' / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
        if candidate.is_file():
            python = candidate
            break

    if python is None:
        python = sys.executable

    return subprocess.run([str(python), '-m', 'dataset_pipeline.run', *sys.argv[1:]], cwd=root.parent).returncode



if __name__ == '__main__':
    raise SystemExit(main())
