from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_exams():

    response = supabase.table("exams").select("*").execute()

    return response.data

def fetch_subjects():

    response = supabase.table("subjects").select("*").execute()

    return response.data