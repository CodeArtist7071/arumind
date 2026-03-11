import json
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_fallback_chapter(subject_id):
    res = supabase.table("chapters").select("id").eq("subject_id", subject_id).limit(1).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]['id']
    return None

if __name__ == "__main__":
    with open('outputs/questions.json') as f:
        questions = json.load(f)
        
    subject_id = next((q.get('subject_id') for q in questions if q.get('subject_id')), None)
    
    if subject_id:
        fallback = get_fallback_chapter(subject_id)
        print("Fallback chapter id:", fallback)
    else:
        print("No subject id")
