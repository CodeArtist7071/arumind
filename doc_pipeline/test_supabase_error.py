import json
import os
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def run():
    with open('outputs/questions.json') as f:
        questions = json.load(f)

    # We need subject_id and exam_id
    subject_id = questions[0].get('subject_id')
    exam_id = questions[0].get('exam_id')

    for q in questions[:1]:
        payload = dict(q)
        payload["subject_id"] = subject_id
        payload["exam_id"] = exam_id
        
        # Remove keys that aren't inside the Supabase schema yet to prevent PGRST204 errors
        payload.pop("diagram_present", None)
        payload.pop("linked_questions", None)
        payload.pop("appear_year", None)
        payload.pop("question_number", None)

        try:
            res = supabase.table("questions").insert(payload).execute()
            print("Success:", res)
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    run()
