"""Run the independent Drive / MinerU / Markdown / OpenRouter / Excel pipeline."""
import argparse
import subprocess
from pathlib import Path
from ingestion.mineru import extract
from core.storage import BASE, DATA, OUTPUTS, read_json, write_json, pipeline_lock
from visuals.client import ChartWorker
from visuals.markdown import enrich


def ask_chart_extraction(pdf):
    while True:
        answer = input(
            f'Run DePlot bar/pie chart extraction for "{pdf.name}"? [y/N]: '
        ).strip().lower()
        if answer in ('y', 'yes'):
            return True
        if answer in ('', 'n', 'no'):
            return False
        print('Please answer yes or no.', flush=True)


def has_completed_chart_extraction(document, output):
    manifest_path = output / 'manifest.json'
    markdown_path = output / 'markdown.md'
    if not manifest_path.is_file() or not markdown_path.is_file():
        return False
    try:
        manifest = read_json(manifest_path)
    except (OSError, ValueError):
        return False
    document_state = read_json(document)
    return (manifest.get('status') in ('complete', 'partial') and
            manifest.get('chart_extraction', 'completed') == 'completed' and
            manifest.get('source_sha256') == document_state.get('source_sha256'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', nargs='?', type=Path, help='Optional local PDF/folder; default downloads Drive PDFs')
    parser.add_argument('--document', type=Path, help='Use existing MinerU document.json; skip PDF extraction')
    parser.add_argument('--max-pages', type=int, help='Partial test only')
    parser.add_argument('--verify-chart-text', action='store_true',
                        help='Use PaddleOCR to cross-check DePlot labels and values')
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--download-only', action='store_true')
    modes.add_argument('--extract-only', action='store_true')
    modes.add_argument('--excel-only', action='store_true', help='Resume OpenRouter and Excel on existing Markdown')
    args = parser.parse_args()
    if args.document and args.input:
        parser.error('Choose a local PDF/folder or --document, not both')
    worker = None
    drive = None
    config = read_json(BASE / 'config.json')
    from ai.structure import structure
    from export.excel import generate_excel_sheet

    def finish(markdown, source_hash):
        if args.extract_only:
            return
        status = markdown.parent / 'pipeline.json'
        write_json(status, {'stage': 'openrouter', 'source_sha256': source_hash})
        bank = structure(markdown, source_hash, config)
        if bank is None:
            write_json(status, {'stage': 'waiting_for_openrouter', 'source_sha256': source_hash})
            print('Markdown saved. Configure OpenRouter in question_pipeline/config.json and set OPENROUTER_API_KEY, then rerun.', flush=True)
            return
        write_json(status, {'stage': 'excel', 'source_sha256': source_hash})
        workbook = generate_excel_sheet(bank)
        write_json(status, {'stage': 'complete', 'source_sha256': source_hash, 'workbook': str(workbook)})
        print(f'Excel ready for review: {workbook}', flush=True)

    try:
        with pipeline_lock(DATA / 'state/pipeline.lock'):
            if args.excel_only:
                manifests = sorted(OUTPUTS.rglob('manifest.json'))
                if not manifests:
                    raise ValueError('No extracted Markdown found')
                for manifest in manifests:
                    state = read_json(manifest)
                    if state.get('status') in ('complete', 'partial'):
                        finish(manifest.with_name('markdown.md'), state['source_sha256'])
                return
            if args.document:
                documents = [args.document]
                files = []
            elif args.input:
                files = sorted(p for p in args.input.iterdir() if p.suffix.lower() == '.pdf') if args.input.is_dir() else [args.input]
                documents = []
            else:
                from ingestion.drive import Drive
                drive = Drive()
                remote = drive.list_pdfs(config['drive_folder_id'])
                # Download and hand off each PDF sequentially; no whole-book buffering.
                files = (drive.download(item) for item in remote)
                documents = []
                if not remote:
                    print('No PDFs found in the configured Drive folder.')
            for pdf in files:
                if args.download_only:
                    continue
                if not pdf.is_file() or pdf.suffix.lower() != '.pdf':
                    raise ValueError(f'Invalid PDF: {pdf}')
                document = extract(pdf, DATA / 'extractions', chunk_pages=config['chunk_pages'],
                    overlap=config['overlap_pages'], tier=config['tier'], max_pages=args.max_pages)
                output = OUTPUTS / document.parent.parent.name / document.parent.name
                if has_completed_chart_extraction(document, output):
                    print(f'Skip completed DePlot extraction: {pdf.name}', flush=True)
                    markdown = output / 'markdown.md'
                else:
                    extract_charts = ask_chart_extraction(pdf)
                    if extract_charts and worker is None:
                        worker = ChartWorker(args.verify_chart_text or config.get('verify_chart_text', False))
                    markdown = enrich(document, output, worker, extract_charts=extract_charts)
                finish(markdown, read_json(document)['source_sha256'])
            for document in documents:
                output = OUTPUTS / document.parent.parent.name / document.parent.name
                if has_completed_chart_extraction(document, output):
                    print(f'Skip completed DePlot extraction: {document.name}', flush=True)
                    markdown = output / 'markdown.md'
                else:
                    extract_charts = ask_chart_extraction(document)
                    if extract_charts and worker is None:
                        worker = ChartWorker(args.verify_chart_text or config.get('verify_chart_text', False))
                    markdown = enrich(document, output, worker, extract_charts=extract_charts)
                finish(markdown, read_json(document)['source_sha256'])
    except (ValueError, OSError, RuntimeError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Question pipeline stopped: {error}\nRerun the same command to resume.\n')
    finally:
        if worker is not None:
            worker.close()
        if drive is not None:
            drive.close()


if __name__ == '__main__':
    main()
