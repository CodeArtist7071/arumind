"""Independent Unlimited-OCR launcher: python dataset2.py [PDF]."""
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PYTHON = ROOT / '.venv-dataset2' / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')


def main():
    args = sys.argv[1:]
    if args == ['--setup']:
        if not PYTHON.is_file():
            venv.EnvBuilder(with_pip=True).create(PYTHON.parents[1])
        subprocess.run([str(PYTHON), '-m', 'pip', 'install', 'torch==2.10.0',
                        'torchvision==0.25.0', '--index-url', 'https://download.pytorch.org/whl/cu128'], check=True)
        return subprocess.run([str(PYTHON), '-m', 'pip', 'install', '-r',
                               str(ROOT / 'dataset_pipeline2/requirements.txt')], cwd=ROOT).returncode
    if args in (['--help'], ['-h']):
        print('python dataset2.py [PDF or folder] [--max-pages N]\n'
              'python dataset2.py --setup       Install isolated CUDA dependencies\n'
              'python dataset2.py --check       Check CUDA without downloading weights\n'
              'python dataset2.py --excel-only  Export completed JSON\n'
              'python dataset2.py --download-only  Run the copied Drive downloader')
        return 0
    if not PYTHON.is_file():
        raise SystemExit('Run python dataset2.py --setup first. An NVIDIA CUDA/BF16 GPU is required.')
    module = 'dataset_pipeline2.run'
    switches = {'--excel-only': 'dataset_pipeline2.excel_only',
                '--download-only': 'dataset_pipeline2.main', '--check': 'dataset_pipeline2.check_runtime'}
    if args and args[0] in switches:
        module = switches[args.pop(0)]
    return subprocess.run([str(PYTHON), '-m', module, *args], cwd=ROOT).returncode


if __name__ == '__main__':
    raise SystemExit(main())
