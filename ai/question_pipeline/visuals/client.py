"""Persistent chart subprocess, isolated from the MinerU runtime."""
import hashlib
import json
import os
import queue
import subprocess
import sys
import threading
import time
from core.storage import BASE, sha256
from .charts import VERSION

ROOT = BASE.parent

def worker_source_hash():
    # Normalize the import-only relocation to retain existing resume signatures.
    source = (BASE / 'visuals/worker.py').read_bytes()
    source = source.replace(b'from question_pipeline.visuals.charts import', b'from .charts import')
    return hashlib.sha256(source).hexdigest()


class ChartWorker:
    def __init__(self, verify_text=False):
        self.verify_text = verify_text
        self.timeout_seconds = max(1, int(os.environ.get('QUESTION_PIPELINE_CHART_TIMEOUT_SECONDS', '900')))
        self.python = ROOT / '.venv-charts' / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
        if not self.python.is_file():
            raise RuntimeError('Chart environment missing. First run: python questions.py --setup')
        checked = subprocess.run([str(self.python), '-m', 'question_pipeline.visuals.worker', '--check',
                        *(['--verify-chart-text'] if verify_text else [])],
                       cwd=ROOT, check=True, capture_output=True, text=True)
        self.process = None
        self.output_queue = None
        self.reader = None
        self.identity = {'implementation': VERSION, 'verify_text': verify_text,
                         'packages': json.loads(checked.stdout),
                         'requirements': sha256(ROOT / 'question_pipeline/requirements-charts.txt'),
                         'worker': worker_source_hash(),
                         'validation': sha256(BASE / 'visuals/charts.py')}

    def extract(self, image, hint):
        if self.process is None:
            self.process = subprocess.Popen([str(self.python), '-u', '-m', 'question_pipeline.visuals.worker'],
                cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding='utf-8')
            self.output_queue = queue.Queue()
            process = self.process
            output_queue = self.output_queue

            def read_output():
                try:
                    for output_line in process.stdout:
                        output_queue.put(output_line)
                finally:
                    output_queue.put(None)

            self.reader = threading.Thread(target=read_output, daemon=True)
            self.reader.start()
        self.process.stdin.write(json.dumps({'image': str(image), 'hint': hint,
                                            'verify_text': self.verify_text}, ensure_ascii=True) + '\n')
        self.process.stdin.flush()
        deadline = time.monotonic() + self.timeout_seconds
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                self._terminate_worker()
                raise TimeoutError(
                    f'Chart analysis exceeded {self.timeout_seconds} seconds for {image}; '
                    'completed MinerU extraction and chart caches are preserved. Rerun to resume.'
                )
            try:
                line = self.output_queue.get(timeout=remaining)
            except queue.Empty:
                continue
            if line is None:
                raise RuntimeError('Chart worker exited before returning a result; rerun to resume')
            if line.startswith('CHART_INFO:') or line.startswith('CHART_PROGRESS:'):
                print(line.strip().split(':', 1)[1].strip(), flush=True)
                continue
            if not line.startswith('CHART_RESULT:'):
                continue
            response = json.loads(line[len('CHART_RESULT:'):])
            if not response['ok']:
                raise RuntimeError(response['error'])
            return response['result']

    def _terminate_worker(self):
        process = self.process
        if process is None:
            return
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)
        if process.stdout is not None:
            process.stdout.close()
        self.process = None
        self.output_queue = None
        self.reader = None

    def close(self):
        if self.process is not None:
            if self.process.poll() is None:
                self.process.stdin.close()
                try:
                    self.process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    self._terminate_worker()
            if self.process is not None:
                if self.process.stdout is not None:
                    self.process.stdout.close()
                self.process = None
                self.output_queue = None
                self.reader = None


