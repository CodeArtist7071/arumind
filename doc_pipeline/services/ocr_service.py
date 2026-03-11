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
                "type": block.block_type,
                "text": text.strip(),
                "x": vertices[0].x,
                "y": vertices[0].y,
                "width": vertices[1].x - vertices[0].x,
                "height": vertices[2].y - vertices[0].y
            })

    return blocks



def get_diagram_text(diagram, image_path):
    x = max(0, int(diagram["x"]))
    y = max(0, int(diagram["y"]))
    w = int(diagram["width"])
    h = int(diagram["height"])

    img = cv2.imread(image_path)
    if img is None:
        return ""

    crop = img[y:y+h, x:x+w]
    _, encoded = cv2.imencode(".jpg", crop)

    client = vision.ImageAnnotatorClient()
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

    # Block type 3 is PICTURE in Google Cloud Vision API
    if block.get("type") == 3:
        return True

    # fallback heuristic: diagrams usually have very little text
    if len(text) < 20 and block["height"] > 100 and block["width"] > 100:
        return True

    return False

from services.table_detector import detect_tables

def split_diagram_blocks(blocks, image_path=None):

    text_blocks = []
    diagram_blocks = []

    for block in blocks:
        if is_diagram_block(block):
            diagram_blocks.append(block)
        else:
            text_blocks.append(block)

    # OpenCV Fallback: If Google Cloud Vision missed tables, inject them natively 
    if image_path:
        opencv_tables = detect_tables(image_path)
        for tbl in opencv_tables:
            # Only add it if there isn't already a GCV diagram overlapping the same area.
            # This prevents duplicating diagram extractions for the same visual structure.
            overlap = False
            for d in diagram_blocks:
                # simple overlap check
                if (abs(d["x"] - tbl["x"]) < 200 and abs(d["y"] - tbl["y"]) < 200):
                    overlap = True
                    break
            
            if not overlap:
                diagram_blocks.append(tbl)
                print(f"[OCR] Injected missing OpenCV Table structure at y: {tbl['y']}")

    return text_blocks, diagram_blocks


import re
from services.supabase_push import upload_diagram_to_supabase

def detect_diagram_ranges_and_anchors(text_blocks):
    ranges = []
    anchors = []
    
    anchor_keywords = [
        "study the following",
        "study the table",
        "given the below is the table",
        "on the basis",
        "following table",
        "similar figures",
        "bar graph",
        "double bar graph",
        "multiple bar graph",
        "line graph",
        "pie chart",
        "histogram",
        "frequency polygon",
        "frequency curve",
        "scatter plot",
        "pictograph",
        "pictogram",
        "table",
        "tabular data",
        "venn diagram",
        "tree diagram",
        "flowchart",
        "number line",
        "coordinate graph",
        "cartesian plane",
        "geometric diagram",
        "area chart",
        "stacked bar chart",
        "stem and leaf plot"
    ]
    
    for b in text_blocks:
        text = b["text"]
        text_lower = text.lower()
        
        # Check for user-defined exact diagram anchor strings
        if any(kw in text_lower for kw in anchor_keywords):
            anchors.append({"y": b["y"]})
            
        # Check for range patterns e.g. "Q 66-70"
        match = re.search(r'Q\s*(\d+)\s*[-to]+\s*(\d+)', text, re.IGNORECASE)
        if match:
            start_q = int(match.group(1))
            end_q = int(match.group(2))
            ranges.append({"start": start_q, "end": end_q, "y": b["y"]})
            
    return ranges, anchors

def extract_and_upload_diagram(diagram, image_path):
    x = max(0, int(diagram["x"]))
    y = max(0, int(diagram["y"]))
    w = int(diagram["width"])
    h = int(diagram["height"])
    
    img = cv2.imread(image_path)
    if img is None:
        return None
        
    crop = img[y:y+h, x:x+w]
    filename = f"diagram_{x}_{y}.png"
    filepath = os.path.join("outputs", "diagrams", filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    cv2.imwrite(filepath, crop)
    
    try:
        url = upload_diagram_to_supabase(filepath, filename)
        print(f"[OCR] Sliced and uploaded diagram: {url}")
        return url
    except Exception as e:
        print(f"Error uploading diagram: {e}")
        return None

def attach_diagrams_to_clusters(clusters, diagram_blocks, text_blocks, image_path):
    ranges, anchors = detect_diagram_ranges_and_anchors(text_blocks)

    # Pre-extract text for all diagrams
    for diagram in diagram_blocks:
        if "extracted_text" not in diagram:
            diagram["extracted_text"] = get_diagram_text(diagram, image_path)

    for cluster in clusters:
        cluster["diagram"] = False
        cluster["diagram_url"] = None

        q_block = cluster["question_block"]
        q_y = q_block["y"]
        q_text = q_block["text"].strip()

        q_num = None
        q_match = re.match(r'^Q?(\d+)[\).]', q_text)
        if q_match:
            q_num = int(q_match.group(1))

        assigned_via_special = False
        assigned_diagram = None
        
        # 1. Match via Explicit Question Number inside Diagram
        if q_num is not None:
            q_num_pattern = r'\b' + str(q_num) + r'\b'
            for diagram in diagram_blocks:
                d_text = diagram.get("extracted_text", "")
                if re.search(q_num_pattern, d_text) and abs(diagram["y"] - q_y) < 1500: # reasonable page proximity 
                    cluster["diagram"] = True
                    if "uploaded_url" not in diagram:
                        diagram["uploaded_url"] = extract_and_upload_diagram(diagram, image_path)
                    cluster["diagram_url"] = diagram.get("uploaded_url")
                    print(f"[OCR] Mapped diagram to Q{q_num} via explicitly matched interior number.")
                    assigned_via_special = True
                    assigned_diagram = diagram
                    break

        # 2. Match via Unique Text overlap
        if not assigned_via_special and q_num is not None:
            # simple heuristic: words longer than 5 chars
            words = [w.lower() for w in re.findall(r'[a-zA-Z]{6,}', q_text)]
            if len(words) >= 2:
                for diagram in diagram_blocks:
                    d_text = diagram.get("extracted_text", "").lower()
                    matches = sum(1 for w in words if w in d_text)
                    if matches >= 2 and abs(diagram["y"] - q_y) < 1500:
                        cluster["diagram"] = True
                        if "uploaded_url" not in diagram:
                            diagram["uploaded_url"] = extract_and_upload_diagram(diagram, image_path)
                        cluster["diagram_url"] = diagram.get("uploaded_url")
                        print(f"[OCR] Mapped diagram to Q{q_num} via word overlap ({matches} words).")
                        assigned_via_special = True
                        assigned_diagram = diagram
                        break

        # 3. Match via Explicit QA Range (e.g. "Q 66-70")
        if not assigned_via_special and q_num is not None:
            for r in ranges:
                if r["start"] <= q_num <= r["end"]:
                    nearest_d = None
                    for diagram in diagram_blocks:
                        if 0 <= (diagram["y"] - r["y"]) < 600 or abs(diagram["y"] - r["y"]) < 400:
                            nearest_d = diagram
                            break
                    
                    if nearest_d:
                        cluster["diagram"] = True
                        if "uploaded_url" not in nearest_d:
                            nearest_d["uploaded_url"] = extract_and_upload_diagram(nearest_d, image_path)
                        cluster["diagram_url"] = nearest_d.get("uploaded_url")
                        assigned_via_special = True
                        assigned_diagram = nearest_d
                        break

        # 4. Match via Anchor Phrases (e.g. "Study the following table")
        if not assigned_via_special:
            for a in anchors:
                if 0 < (q_y - a["y"]) < 1200:
                    nearest_d = None
                    for diagram in diagram_blocks:
                        if abs(diagram["y"] - a["y"]) < 600:
                            nearest_d = diagram
                            break
                    
                    if nearest_d:
                        cluster["diagram"] = True
                        if "uploaded_url" not in nearest_d:
                            nearest_d["uploaded_url"] = extract_and_upload_diagram(nearest_d, image_path)
                        cluster["diagram_url"] = nearest_d.get("uploaded_url")
                        assigned_via_special = True
                        assigned_diagram = nearest_d
                        break

        # 5. Fallback: Proximity Map (Matches diagrams placed strictly at the bottom of the question)
        if not assigned_via_special:
            for diagram in diagram_blocks:
                d_y = diagram["y"]
                if 0 < (d_y - q_y) < 500:
                    cluster["diagram"] = True
                    if "uploaded_url" not in diagram:
                        diagram["uploaded_url"] = extract_and_upload_diagram(diagram, image_path)
                    cluster["diagram_url"] = diagram.get("uploaded_url")
                    assigned_diagram = diagram
                    break

        # Check for Note below the mapped diagram
        if assigned_diagram:
            bottom_edge = assigned_diagram["y"] + assigned_diagram["height"]
            for b in text_blocks:
                b_text = b["text"].strip()
                # If a text block starts with Note and is within 300px below the diagram
                if b_text.lower().startswith("note") and 0 < (b["y"] - bottom_edge) < 300:
                    cluster["diagram_note"] = b_text
                    print(f"[OCR] Found Note attached to diagram for Q{q_num}: {b_text[:30]}...")
                    # Also explicitly append the note directly to the textual block for Gemini
                    cluster["question_block"]["text"] += f"\n[Diagram Note: {b_text}]"
                    break