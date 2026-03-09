import os
from pdf2image import convert_from_path

def split_pdf(pdf_path):
    
    file_name = os.path.basename(pdf_path).replace(".pdf","")

    output_dir = f"uploads/{file_name}"

    os.makedirs(output_dir, exist_ok=True)

    # images = convert_from_path(pdf_path)
    images = convert_from_path(pdf_path, poppler_path=r"C:\tools\poppler\Library\bin")

    paths = []

    for i, img in enumerate(images):

        path = f"{output_dir}/page_{i+1}.png"

        img.save(path, "PNG")

        paths.append(path)

    return paths