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
        # We'll use the original question ID as the reference.
        odia_response = supabase.table("odia_questions").select("id").execute()
        existing_odia_ids = {q['id'] for q in odia_response.data}
        
        translator = OdiaTranslator()
        total_en = len(en_questions)
        success_count = 0
        skip_count = 0
        
        for index, q_en in enumerate(en_questions, 1):
            q_id = q_en['id']
            progress_pct = (index / total_en) * 100
            
            # 3. Duplicate check (skips if already translated)
            if q_id in existing_odia_ids:
                logger.info(f"[{index}/{total_en}] ({progress_pct:.1f}%) Question ID {q_id} already exists. Skipping.")
                skip_count += 1
                continue
            
            logger.info(f"[{index}/{total_en}] ({progress_pct:.1f}%) Translating question ID {q_id}...")
            
            try:
                # 4. Translate question and options
                translated_data = translator.translate_question(q_en)
                
                # 5. Prepare payload for odia_questions
                # We copy all metadata from the English question to satisfy NOT NULL constraints
                q_odia = q_en.copy()
                
                # 6. Apply Odia translation and set the link column
                q_odia["question"] = translated_data.get("question")
                q_odia["options"] = translated_data.get("options")
                q_odia["odia_question_id"] = q_id
                
                # 7. Remove fields that shouldn't be in the Odia record (like nested joins or language if missing)
                q_odia.pop("question_translations", None)
                q_odia.pop("language", None)
                
                # 8. Push to odia_questions
                # Ensure we keep the same ID to maintain the relationship
                supabase.table("odia_questions").upsert(q_odia).execute()
                
                logger.info(f"✓ Pushed question ID {q_id} to odia_questions (Fully Synced).")
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to process question ID {q_id}: {e}")
                
        logger.info(f"Sync complete. Pushed: {success_count}, Skipped (Duplicates): {skip_count}")
        
    except Exception as e:
        logger.error(f"Sync process failed: {e}")

if __name__ == "__main__":
    sync_questions()
