import os
from google.cloud import vision
from config import GOOGLE_APPLICATION_CREDENTIALS
from google.cloud import vision

import cv2

# set Google credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

client = vision.ImageAnnotatorClient()

def extract_text(image_path):

    with open(image_path, "rb") as img_file:
        content = img_file.read()

    image = vision.Image(content=content)

    response = client.document_text_detection(image=image)

    if response.error.message:
        raise Exception(response.error.message)

    # RETURN THE FULL LAYOUT ANNOTATION (NOT STRING)
    return response.full_text_annotation

def extract_blocks(annotation):

    blocks = []

    for page in annotation.pages:

        for block in page.blocks:

            text = ""

            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    word_text = "".join([s.text for s in word.symbols])
                    text += word_text + " "

            vertices = block.bounding_box.vertices

            blocks.append({
                "text": text.strip(),
                "x": vertices[0].x,
                "y": vertices[0].y,
                "width": vertices[1].x - vertices[0].x,
                "height": vertices[2].y - vertices[0].y
            })

    return blocks



def extract_text_from_block(block):

    client = vision.ImageAnnotatorClient()

    _, encoded = cv2.imencode(".jpg", block)

    image = vision.Image(content=encoded.tobytes())

    response = client.text_detection(image=image)

    texts = response.text_annotations

    if texts:
        return texts[0].description

    return ""    

def blocks_to_text(blocks):

    lines = []

    for b in blocks:
        lines.append(b["text"])

    return "\n".join(lines)

def clean_blocks(blocks):

    cleaned = []

    for b in blocks:
        text = b["text"].strip()

        if len(text) > 2:
            cleaned.append(b)

    return cleaned

def sort_blocks(blocks):

    return sorted(blocks, key=lambda b: (b["y"], b["x"]))


def is_diagram_block(block):

    text = block["text"].strip()

    # diagrams usually have very little text
    if len(text) < 20 and block["height"] > 100 and block["width"] > 100:
        return True

    return False

def split_diagram_blocks(blocks):

    text_blocks = []
    diagram_blocks = []

    for block in blocks:

        if is_diagram_block(block):
            diagram_blocks.append(block)
        else:
            text_blocks.append(block)

    return text_blocks, diagram_blocks


def attach_diagrams_to_clusters(clusters, diagram_blocks):

    for cluster in clusters:

        q_block = cluster["question_block"]

        q_y = q_block["y"]

        cluster["diagram"] = False

        for diagram in diagram_blocks:

            d_y = diagram["y"]

            # if diagram appears shortly after question
            if 0 < (d_y - q_y) < 400:
                cluster["diagram"] = True