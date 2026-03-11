import json
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def setup_fallback_chapter(subject_id):
    # Check if a chapter exists
    res = supabase.table("chapters").select("id").eq("subject_id", subject_id).limit(1).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]['id']
    
    # Otherwise, create one
    print(f"Creating 'Miscellaneous' chapter for subject {subject_id}")
    insert_res = supabase.table("chapters").insert({
        "name": "Miscellaneous",
        "subject_id": subject_id
    }).execute()
    
    return insert_res.data[0]['id']

if __name__ == "__main__":
    with open('outputs/questions.json') as f:
        questions = json.load(f)
        
    subject_id = next((q.get('subject_id') for q in questions if q.get('subject_id')), None)
    
    if subject_id:
        chapter_id = setup_fallback_chapter(subject_id)
        print("Fallback chapter id resolved to:", chapter_id)
        
        # update questions
        changed = False
        for q in questions:
            if not q.get("chapter_id"):
                q["chapter_id"] = chapter_id
                changed = True
        
        if changed:
            with open('outputs/questions.json', 'w') as f:
                json.dump(questions, f, indent=4)
            print("Successfully updated questions.json with the fallback chapter_id")
