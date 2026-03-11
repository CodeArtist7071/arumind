import re
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global cached subjects
_SUBJECTS_CACHE = None

def get_subjects():
    global _SUBJECTS_CACHE
    if _SUBJECTS_CACHE is None:
        print("[TRACKER] Fetching subjects from Supabase...")
        res = supabase.table("subjects").select("id,name").execute()
        _SUBJECTS_CACHE = res.data
    return _SUBJECTS_CACHE

def is_heading(block_text):
    """
    Checks if a block possesses heading-like qualities:
    - Short length (< 10 words)
    - Is not a question number
    """
    text = block_text.strip()
    if not text:
        return False
        
    # Exclude basic question numbering formats like "12." or "Q 45."
    if re.match(r'^Q?\s*\d+[\)\.]', text, re.IGNORECASE):
        return False
        
    words = text.split()
    if len(words) > 8: 
        return False
        
    return True

def match_subject_id(block_text):
    """
    Cross-references a potential heading against the Supabase subjects list (case-insensitive).
    Returns the subject_id if found, None otherwise.
    """
    if not is_heading(block_text):
        return None
        
    subjects = get_subjects()
    text_clean = block_text.strip().lower()
    
    # Strip leading numerals or bullets (e.g., "IV. Logical Reasoning" -> "logical reasoning")
    text_clean = re.sub(r'^([ivxlcdm]+|[a-z]|\d+)[\.\)\-\:]\s*', '', text_clean)
    text_clean = text_clean.strip()

    if not text_clean:
        return None
        
    for subject in subjects:
        subj_clean = subject["name"].strip().lower()
        # Direct exact or substring match case-insensitive
        if subj_clean == text_clean or subj_clean in text_clean:
            # We found a match!
            print(f"[TRACKER] Matched Heading '{block_text.strip()}' -> Subject: {subject['name']}")
            return subject["id"]
            
    return None
