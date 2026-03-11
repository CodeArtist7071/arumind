import os
from main import log, process_pdf

if __name__ == "__main__":
    pdf_file = "sample-pdf.pdf"
    if os.path.exists(pdf_file):
        log(f"Processing local {pdf_file}")
        process_pdf(pdf_file)
    else:
        log("sample-pdf.pdf not found")
