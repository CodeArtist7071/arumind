import json
import logging
from services.odia_translator import OdiaTranslator

# Configure basic logging to see what's happening
logging.basicConfig(level=logging.INFO)

def test_single_translation():
    translator = OdiaTranslator()
    
    # A sample complex question with technical terms and numbers
    sample_q = {
        "question": "What is the Speed of light in a vacuum as measured by NASA research entities in 1947?",
        "options": [
            {"l": "A", "v": "3.0 x 10^8 m/s"},
            {"l": "B", "v": "1.5 x 10^8 m/s"},
            {"l": "C", "v": "4.25 x 10^8 m/s"},
            {"l": "D", "v": "Zero (0)"}
        ]
    }
    
    print("--- Original English Question ---")
    print(json.dumps(sample_q, indent=2))
    
    print("\n--- Translating... ---")
    translated = translator.translate_question(sample_q)
    
    print("\n--- Translated Odia Question ---")
    print(json.dumps(translated, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    test_single_translation()
