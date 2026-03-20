import json
import logging
import re
from services.gemini_service import GeminiModel

class OdiaTranslator:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.model = GeminiModel(use_vertexai=False) # Use AI for better accuracy
        self.logger.info("Initializing AI translator using Gemini")

    def translate_question(self, question_obj):
        """
        Translates a single question object to Odia using Gemini AI with expert rules.
        """
        # User defined expert prompt
        prompt = f"""You are an expert Odia language translator specializing in educational and competitive exam content for Odisha state exams (OPSC, OSSC, OSSSC).

Your task is to translate the given MCQ question and its options into natural, exam-appropriate Odia.

## Translation rules — follow exactly

### Language mixing (most important rule)
- Translate ALL general and technical words into Odia
- For ALL technical terms (Speed, Velocity, Force, Pressure, DNA, CPU, RAM, etc.) and ALL Proper Nouns/Acronyms (NASA, WHO, RBI, ISRO, India, etc.), translate/transliterate to Odia but ALWAYS include the original English term in brackets immediately after
- Example: "NASA" → "ନାସା (NASA)"
- Example: "Speed of light" → "ଆଲୋକର ବେଗ (Speed of light)"
- Keep these in English AS-IS ONLY: scientific units (m/s, kg, km, Hz, MHz), mathematical operators (+, -, ×, ÷, =, ^), and chemical formulas (H₂O, CO₂, NaCl)

### Number conversion
- Convert ALL standalone numerals to Odia numerals: 0→୦, 1→୧, 2→୨, 3→୩, 4→୪, 5→୫, 6→୬, 7→୭, 8→୮, 9→୯
- Convert inside words too: "21st" → "୨୧ତମ"
- Keep decimal point as "." — do NOT convert it: "3.14" → "୩.୧୪"
- Keep numbers that are part of units or formulas as-is if clarity requires: "10^8" → "୧୦^୮"
- Years stay as Odia numerals: "1947" → "୧୯୪୭"

### Options structure
- Keep the EXACT same JSON structure: each option must have "l" and "v" keys
- Do NOT add, remove, or reorder options
- The "l" key value (A, B, C, D) must NOT be translated — keep exactly as-is
- Only translate the "v" (value) field

### Quality rules
- Translation must sound natural to an Odia-medium student — not word-for-word literal
- Preserve the exact meaning — do not simplify or add explanation
- If a term has no clean Odia equivalent, keep English — never force a bad translation
- Mathematical relationships must be preserved exactly

JSON Question to translate:
{json.dumps({
    "question": question_obj.get("question", question_obj.get("q")),
    "options": question_obj.get("options", question_obj.get("opt", []))
}, indent=2)}

Return the result as a VALID JSON object with exactly two keys: "question" and "options".
Do not include any other text or markdown formatting.
        """
        
        try:
            response_text = self.model.generate(prompt, response_mime_type="application/json")
            # Clean response text just in case (though response_mime_type should handle it)
            clean_text = re.sub(r'```json\s*|\s*```', '', response_text).strip()
            translated_data = json.loads(clean_text)
            
            result = question_obj.copy()
            result["question"] = translated_data.get("question", result.get("question"))
            result["options"] = translated_data.get("options", result.get("options"))
            
            # Clean up source fields if they were non-standard
            result.pop('q', None)
            result.pop('opt', None)
            
            return result
        except Exception as e:
            self.logger.error(f"AI Translation failed for question: {e}")
            # Fallback to English if translation fails
            return question_obj

    def translate_questions_batch(self, questions_list):
        """
        Translates a list of questions using AI.
        """
        # For simplicity and to avoid prompt size limits, we translate individually,
        # but could be batched for performance later.
        return [self.translate_question(q) for q in questions_list]
