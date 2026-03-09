from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY


supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# -----------------------------
# FETCH EXAMS
# -----------------------------
def fetch_exams():

    res = supabase.table("exams").select("*").execute()

    exams = res.data

    print(f"[SUPABASE] Loaded {len(exams)} exams")

    return exams


# -----------------------------
# FETCH SUBJECTS
# -----------------------------
def fetch_subjects():

    res = supabase.table("subjects").select("*").execute()

    subjects = res.data

    print(f"[SUPABASE] Loaded {len(subjects)} subjects")

    return subjects

def insert_questions(questions):

    res = supabase.table("questions").insert(questions).execute()

    print(f"[SUPABASE] Inserted {len(questions)} questions")

    return res