from pathlib import Path 
from docling.document_converter import DocumentConverter

converter = DocumentConverter()
OUTPUT_FOLDER = Path(__file__).resolve().parent / "docling_output"
OUTPUT_FOLDER.mkdir(exist_ok=True)

def process_pdf_with_docling(pdf_path:str):
    pdf_path = Path(pdf_path)
    print(f"Processing PDF: {pdf_path}")
    result = converter.convert(pdf_path)
    markdown_result = result.document.export_to_markdown()

    output_file = (
        OUTPUT_FOLDER/f"{pdf_path.stem}.md"
    )
    output_file.write_text(
        markdown_result,
        encoding="utf-8"
    )
    print(f"Markdown saved to: {output_file}")
    return output_file