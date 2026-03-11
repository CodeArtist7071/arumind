import json
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_tables():
    # just getting a query that causes a deliberate error to see available tables or if there's an easy way
    pass

if __name__ == "__main__":
    tables_to_check = ["exam_subjects", "syllabus", "exam_subject_mapping", "subject_exams"]
    data = {}
    for t in tables_to_check:
        try:
            res = supabase.table(t).select("*").limit(1).execute()
            data[t] = res.data
        except Exception as e:
            data[t] = str(e)

    with open("temp_tables.json", "w") as f:
        json.dump(data, f, indent=2)
    print("Checked temp tables")
