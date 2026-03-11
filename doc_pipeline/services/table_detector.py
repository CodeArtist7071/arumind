import cv2
import numpy as np

def detect_tables(image_path):
    """
    Detects table grids in an image using morphological operations.
    Returns a list of bounding boxes: [{"x": x, "y": y, "width": w, "height": h, "type": 3, "text": ""}]
    """
    img = cv2.imread(image_path)
    if img is None:
        return []

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply adaptive thresholding to get a binary image (tables/lines are white, background is black)
    binary = cv2.adaptiveThreshold(
        ~gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, -2
    )
    
    # Horizontal lines
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    
    # Vertical lines
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    
    # Combine lines to get the grid
    table_mask = cv2.addWeighted(horizontal_lines, 0.5, vertical_lines, 0.5, 0.0)
    _, table_mask = cv2.threshold(table_mask, 100, 255, cv2.THRESH_BINARY)
    
    # Find contours (the tables)
    contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    table_blocks = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        # Filter for significant area to avoid noise
        if w > 100 and h > 100:
            table_blocks.append({
                "type": 3,  # Treat it as a picture/diagram block
                "text": "",
                "x": x,
                "y": y,
                "width": w,
                "height": h,
                "is_opencv_table": True
            })
            
    return table_blocks
