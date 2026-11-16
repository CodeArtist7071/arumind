"""Separate question Markdown pipeline: python questions.py [PDF]."""
import subprocess
import sys
import venv
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def main():
    scripts = 'Scripts/python.exe' if sys.platform == 'win32' else 'bin/python'
    if sys.argv[1:] in (['--setup'], ['--setup-ocr']):
        runtime = ROOT / '.venv-questions'
        if not (runtime / scripts).is_file():
            venv.EnvBuilder(with_pip=True).create(runtime)
        subprocess.run([str(runtime / scripts), '-m', 'pip', 'install', '-r',
                        str(ROOT / 'question_pipeline/requirements.txt')], cwd=ROOT, check=True)
        destination = ROOT / '.venv-charts'
        if not (destination / scripts).is_file():
            venv.EnvBuilder(with_pip=True).create(destination)
        requirements = 'requirements-ocr.txt' if sys.argv[1] == '--setup-ocr' else 'requirements-charts.txt'
        return subprocess.run([str(destination / scripts), '-m', 'pip', 'install', '-r',
                               str(ROOT / 'question_pipeline' / requirements)], cwd=ROOT).returncode
    python = ROOT / '.venv-questions' / scripts
    if not python.is_file():
        raise SystemExit('Independent question environment missing. Run python questions.py --setup once.')
    return subprocess.run([str(python), '-m', 'question_pipeline.run', *sys.argv[1:]], cwd=ROOT).returncode


if __name__ == '__main__':
    raise SystemExit(main())
