import json
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_all(table_name):
    try:
        response = supabase.table(table_name).select("*").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching {table_name}: {e}")
        return []

if __name__ == "__main__":
    tables = ["exam_board", "exams", "subjects", "chapters", "exam_boards"]
    data = {}
    for t in tables:
        data[t] = fetch_all(t)
    
    with open("temp_schema_dump.json", "w") as f:
        json.dump(data, f, indent=2)
    print("Dumped to temp_schema_dump.json")
