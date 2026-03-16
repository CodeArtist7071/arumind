import json
import logging
from openodia import other_lang_to_odia

class OdiaTranslator:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.logger.info("Initializing offline translator using openodia")

    def convert_to_odia_numerals(self, text):
        """
        Converts English digits (0-9) to Odia numerals (୦-୯).
        """
        if not text:
            return text
        
        digit_map = {
            '0': '୦', '1': '୧', '2': '୨', '3': '୩', '4': '୪',
            '5': '୫', '6': '୬', '7': '୭', '8': '୮', '9': '୯'
        }
        
        result = ""
        for char in str(text):
            result += digit_map.get(char, char)
        return result

    def translate_text(self, text):
        if not text:
            return ""
            
        try:
            # openodia translation is free and can run offline (with its dictionary)
            translated_text = other_lang_to_odia(text)
            # Apply number conversion to the translated text
            return self.convert_to_odia_numerals(translated_text)
        except Exception as e:
            self.logger.error(f"Translation error: {e}")
            return text

    def translate_question(self, question_obj):
        """
        Translates a single question object to Odia and converts numbers.
        Keeps IDs and metadata intact.
        """
        translated_q = question_obj.copy()
        
        # Translate main question text
        # Supabase uses 'question' field
        if 'question' in question_obj:
            translated_q['question'] = self.translate_text(question_obj.get('question', ''))
        elif 'q' in question_obj:
             translated_q['question'] = self.translate_text(question_obj.get('q', ''))
        
        # Translate options
        translated_options = []
        # Supabase uses 'options' field
        options = question_obj.get('options') or question_obj.get('opt') or []
        
        if isinstance(options, list):
            for opt in options:
                new_opt = opt.copy()
                if isinstance(opt, dict):
                    # Translate option value/text
                    for key in ['v', 'value', 'text']:
                        if key in opt:
                            new_opt[key] = self.translate_text(str(opt[key]))
                translated_options.append(new_opt)
        
        translated_q['options'] = translated_options
        
        # Ensure we don't have conflicting keys if we used 'opt'/'q' source
        translated_q.pop('q', None)
        translated_q.pop('opt', None)
        
        return translated_q

    def translate_questions_batch(self, questions_list):
        """
        Translates a list of questions.
        """
        return [self.translate_question(q) for q in questions_list]

    def translate_questions_batch(self, questions_list):
        """
        Translates a list of questions.
        """
        return [self.translate_question(q) for q in questions_list]
