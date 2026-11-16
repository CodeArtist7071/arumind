"""Persistent isolated PaddleOCR/DePlot worker using a JSON-lines protocol."""
import contextlib
import importlib.util
import importlib.metadata
import json
import sys

from question_pipeline.visuals.charts import chart_kind, corroborate, mermaid, parse_table


def check(verify_text=False):
    modules = ('torch', 'transformers', 'PIL', 'cv2') + (('paddleocr', 'paddle') if verify_text else ())
    missing = [name for name in modules
               if importlib.util.find_spec(name) is None]
    if missing:
        setup = '--setup-ocr' if verify_text else '--setup'
        raise RuntimeError('Missing chart dependencies: ' + ', '.join(missing) + '. Run python questions.py ' + setup)


class Models:
    def __init__(self):
        self.ocr = self.processor = self.model = None
        import torch
        self.torch = torch
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'

    def extract(self, image, hint, verify_text=False):
        if verify_text and self.ocr is None:
            from paddleocr import PaddleOCR
            self.ocr = PaddleOCR(lang='en', ocr_version='PP-OCRv5', device='cpu',
                                 use_doc_orientation_classify=False, use_doc_unwarping=False,
                                 use_textline_orientation=False)
        texts = []
        for result in self.ocr.predict(str(image)) if verify_text else ():
            data = result.json
            if isinstance(data, str):
                data = json.loads(data)
            data = data.get('res', data)
            texts.extend({'text': text, 'score': float(score)}
                         for text, score in zip(data['rec_texts'], data['rec_scores']))
        kind = chart_kind(hint + '\n' + ' '.join(t['text'] for t in texts), image)
        base = {'ocr': texts, 'kind': kind, 'human_verified': False, 'ocr_cross_check': verify_text}
        if kind is None:
            return {**base, 'status': 'needs_review', 'reason': 'No confident pie/bar classification; image retained'}
        from PIL import Image
        from transformers import Pix2StructProcessor, Pix2StructForConditionalGeneration
        if self.model is None:
            print(f'CHART_PROGRESS: loading DePlot model on {self.device}',
                  file=sys.__stdout__, flush=True)
            self.processor = Pix2StructProcessor.from_pretrained('google/deplot')
            self.model = Pix2StructForConditionalGeneration.from_pretrained('google/deplot')
            try:
                self.model = self.model.to(self.device).eval()
            except self.torch.cuda.OutOfMemoryError:
                if self.device != 'cuda':
                    raise
                print('CHART_PROGRESS: CUDA memory is full while loading DePlot; using CPU',
                      file=sys.__stdout__, flush=True)
                self.device = 'cpu'
                self.torch.cuda.empty_cache()
                self.model = self.model.to('cpu').eval()
        with Image.open(image) as source:
            inputs = self.processor(images=source.convert('RGB'),
                text='Generate underlying data table of the figure below:', return_tensors='pt')
        try:
            inputs = inputs.to(self.device)
            print(f'CHART_PROGRESS: running DePlot inference on {self.device}',
                  file=sys.__stdout__, flush=True)
            with self.torch.inference_mode():
                predictions = self.model.generate(**inputs, max_new_tokens=512, do_sample=False)
        except self.torch.cuda.OutOfMemoryError:
            if self.device != 'cuda':
                raise
            print('CHART_PROGRESS: CUDA memory is full; retrying this chart on CPU',
                  file=sys.__stdout__, flush=True)
            self.torch.cuda.empty_cache()
            self.device = 'cpu'
            self.model = self.model.to('cpu')
            inputs = inputs.to('cpu')
            with self.torch.inference_mode():
                predictions = self.model.generate(**inputs, max_new_tokens=512, do_sample=False)
        raw = self.processor.decode(predictions[0], skip_special_tokens=True)
        base['deplot_text'] = raw
        eos = self.model.generation_config.eos_token_id
        eos = eos if isinstance(eos, list) else [eos]
        if int(predictions[0][-1]) not in eos:
            return {**base, 'status': 'needs_review', 'reason': 'DePlot output truncated'}
        try:
            table = parse_table(raw)
            if verify_text:
                corroborate(table, texts)
            diagram = mermaid(kind, table)
        except ValueError as error:
            return {**base, 'status': 'needs_review', 'reason': str(error)}
        return {**base, 'status': 'reconstructed', 'table': table, 'mermaid': diagram}


def main():
    check('--verify-chart-text' in sys.argv)
    if '--check' in sys.argv:
        packages = ['torch', 'transformers', 'Pillow', 'opencv-contrib-python']
        if '--verify-chart-text' in sys.argv:
            packages += ['paddleocr', 'paddlepaddle']
        print(json.dumps({name: importlib.metadata.version(name) for name in packages}))
        return
    models = Models()
    print(f'CHART_INFO: DePlot device={models.device}', flush=True)
    for line in sys.stdin:
        try:
            request = json.loads(line)
            print('CHART_PROGRESS: classifying image and running chart extraction', flush=True)
            with contextlib.redirect_stdout(sys.stderr):
                result = models.extract(request['image'], request['hint'], request.get('verify_text', False))
            payload = {'ok': True, 'result': result}
        except Exception as error:
            payload = {'ok': False, 'error': f'{type(error).__name__}: {error}'}
        print('CHART_RESULT:' + json.dumps(payload, ensure_ascii=True, allow_nan=False), flush=True)


if __name__ == '__main__':
    main()
