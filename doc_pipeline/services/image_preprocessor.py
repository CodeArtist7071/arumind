import cv2
import numpy as np
import os

def preprocess_for_ocr(image_path):
    """
    Applies image preprocessing techniques to improve OCR accuracy.
    Includes: Resolution enhancement, Noise reduction, Contrast enhancement,
    Binarization (Watermark removal), and Deskewing.
    """
    # Read the image
    img = cv2.imread(image_path)
    if img is None:
        print(f"[Preprocessing] Could not load {image_path}. Returning original.")
        return image_path
        
    # 1. Resolution Enhancement (Super-Resolution via interpolation)
    # Scale up by 1.5x to give OCR more pixel density to work with
    img = cv2.resize(img, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    
    # 2. Convert to Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. Noise Reduction
    # Subtle Gaussian Blur to eliminate high-frequency noise without losing edge sharpness
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    
    # 4. Contrast Enhancement (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast_enhanced = clahe.apply(blurred)
    
    # 5. Binarization and Watermark Removal
    # Adaptive thresholding handles varying lighting and effectively removes light watermarks 
    # while preserving dark text.
    binary = cv2.adaptiveThreshold(
        contrast_enhanced, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 21, 15
    )
    
    # 6. Deskewing (Page Alignment)
    # Find coordinates of all text pixels (in binary, text is black, background is white, 
    # so we invert first to find text pixels).
    inverted = cv2.bitwise_not(binary)
    coords = np.column_stack(np.where(inverted > 0))
    angle = cv2.minAreaRect(coords)[-1]
    
    # minAreaRect returns values in the range [-90, 0)
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
        
    # Only deskew if the angle is significant enough to warrant it (e.g., > 0.5 degrees)
    if abs(angle) > 0.5:
        (h, w) = binary.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        deskewed = cv2.warpAffine(binary, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    else:
        deskewed = binary

    # Prepare output path
    base, ext = os.path.splitext(image_path)
    processed_path = f"{base}_processed{ext}"
    
    # Save the preprocessed image
    cv2.imwrite(processed_path, deskewed)
    
    return processed_path
