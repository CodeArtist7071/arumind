import os
from services.ocr_service import extract_text, extract_blocks, split_diagram_blocks, attach_diagrams_to_clusters, detect_diagram_ranges_and_anchors
from main import build_question_clusters, clean_blocks, sort_blocks

def test_page7():
    print("Testing OCR heuristics on page_7_processed.png")
    image_path = "uploads/sample-pdf/page_7_processed.png"
    
    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found.")
        return

    print("1. Running Google Cloud Vision extraction...")
    annotation = extract_text(image_path)
    
    print("2. Extracting basic layout blocks...")
    blocks = extract_blocks(annotation)
    blocks = sort_blocks(blocks)
    blocks = clean_blocks(blocks)
    
    print("3. Isolating diagram blocks vs text blocks...")
    text_blocks, diagram_blocks = split_diagram_blocks(blocks, image_path)
    print(f"   -> Found {len(text_blocks)} text blocks and {len(diagram_blocks)} diagram blocks.")
    
    for i, db in enumerate(diagram_blocks):
        print(f"   [Diagram {i+1}] Type: {db.get('type')}, Location y: {db['y']}, h: {db['height']}, w: {db['width']}")

    print("4. Grouping questions into clusters...")
    clusters = build_question_clusters(text_blocks)
    print(f"   -> Built {len(clusters)} question blocks.")

    print("5. Running Diagram Detection Anchor logic...")
    ranges, anchors = detect_diagram_ranges_and_anchors(text_blocks)
    print(f"   -> Found Explicit Rangers: {len(ranges)}")
    print(f"   -> Found Anchor strings ('Study the table', etc): {len(anchors)}")

    print("6. Executing attach_diagrams_to_clusters heuristics...")
    attach_diagrams_to_clusters(clusters, diagram_blocks, text_blocks, image_path)
    
    print("\n--- TEST RESULTS ---")
    mapped_count = 0
    for c in clusters:
        q_text = c['question_block']['text'].strip()
        short_q = q_text[:30] + "..." if len(q_text) > 30 else q_text
        if c.get("diagram"):
            mapped_count += 1
            print(f"MATCHED: {short_q}")
            print(f"   URL: {c.get('diagram_url')}")
            if c.get("diagram_note"):
                print(f"   NOTE: {c.get('diagram_note')}")
        else:
            print(f"UNMATCHED: {short_q}")

    print(f"\nSummary: Mapped {mapped_count} diagrams to {len(clusters)} question clusters.")

if __name__ == "__main__":
    test_page7()
