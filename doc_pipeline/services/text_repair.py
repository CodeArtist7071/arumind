def repair_ocr_text(text):

    replacements = {
        "A)": "A.",
        "B)": "B.",
        "C)": "C.",
        "D)": "D.",
        "(A)": "A.",
        "(B)": "B.",
        "(C)": "C.",
        "(D)": "D."
    }

    for k, v in replacements.items():
        text = text.replace(k, v)

    return text