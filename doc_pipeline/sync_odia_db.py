import json
import logging
from services.supabase_push import supabase
from services.odia_translator import OdiaTranslator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("sync_odia_db.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("SyncOdiaDB")

def sync_questions():
    logger.info("Starting sync between questions and odia_questions...")
    
    try:
        # 1. Fetch all questions from the English table
        response = supabase.table("questions").select("*").execute()
        en_questions = response.data
        
        if not en_questions:
            logger.info("No questions found in English 'questions' table.")
            return
            
        logger.info(f"Found {len(en_questions)} questions in English table.")
        
        # 2. Fetch existing questions from Odia table for duplicate check
        # We'll use the original question ID as the reference if possible, 
        # or we can check by question text. 
        # Best practice: if odia_questions has 'id', use the same ID as 'questions'.
        odia_response = supabase.table("odia_questions").select("id").execute()
        existing_odia_ids = {q['id'] for q in odia_response.data}
        
        translator = OdiaTranslator()
        
        success_count = 0
        skip_count = 0
        
        for q_en in en_questions:
            q_id = q_en['id']
            
            # 3. Duplicate check
            if q_id in existing_odia_ids:
                logger.info(f"Question ID {q_id} already exists in odia_questions. Skipping.")
                skip_count += 1
                continue
            
            logger.info(f"Translating question ID {q_id}...")
            
            try:
                # 4. Translate question and options
                q_odia = translator.translate_question(q_en)
                
                # 5. Push to odia_questions
                # Ensure we keep the same ID to maintain the relationship
                supabase.table("odia_questions").insert(q_odia).execute()
                
                logger.info(f"✓ Pushed question ID {q_id} to odia_questions.")
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to process question ID {q_id}: {e}")
                
        logger.info(f"Sync complete. Pushed: {success_count}, Skipped (Duplicates): {skip_count}")
        
    except Exception as e:
        logger.error(f"Sync process failed: {e}")

if __name__ == "__main__":
    sync_questions()
