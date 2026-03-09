from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def save_questions(questions):

    if not questions:
        print("⚠️ No questions to save")
        return

    supabase.table("questions").insert(questions).execute()

    print(f"[SUPABASE] Inserted {len(questions)} questions")