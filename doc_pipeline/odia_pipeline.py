import os
import json
import logging
from services.odia_translator import OdiaTranslator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("odia_pipeline.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("OdiaPipeline")

def run_odia_pipeline():
    outputs_dir = "outputs"
    odia_dir = "odia_questions"
    
    if not os.path.exists(odia_dir):
        os.makedirs(odia_dir)
        
    translator = OdiaTranslator()
    
    # Scan for JSON files in outputs directory
    files = [f for f in os.listdir(outputs_dir) if f.endswith(".json")]
    
    if not files:
        logger.info("No JSON files found in outputs directory.")
        return

    for filename in files:
        input_path = os.path.join(outputs_dir, filename)
        logger.info(f"Processing {filename}...")
        
        try:
            with open(input_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Check if it's a list of questions or a single question object
            if isinstance(data, list):
                # Filter items that look like questions (have 'q' and 'opt' fields)
                questions_to_translate = [q for q in data if isinstance(q, dict) and 'q' in q and 'opt' in q]
                if questions_to_translate:
                    logger.info(f"Found {len(questions_to_translate)} questions in {filename}.")
                    translated_data = translator.translate_questions_batch(data) # Translate all in list
                else:
                    logger.info(f"No questions found in {filename}. Skipping.")
                    continue
            elif isinstance(data, dict) and 'q' in data and 'opt' in data:
                logger.info(f"Found a single question in {filename}.")
                translated_data = translator.translate_question(data)
            else:
                logger.debug(f"File {filename} does not contain question structure. Skipping.")
                continue
                
            output_path = os.path.join(odia_dir, filename) # Keep same filename
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(translated_data, f, ensure_ascii=False, indent=2)
                
            logger.info(f"Successfully saved translated questions to {output_path}")
            
        except Exception as e:
            logger.error(f"Failed to process {filename}: {e}")

if __name__ == "__main__":
    run_odia_pipeline()
