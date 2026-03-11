import json
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_table(table_name):
    # Depending on table size, pagination might be needed. 
    # For now, fetching first 1000 rows (default limit)
    try:
        response = supabase.table(table_name).select("*").limit(1000).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching {table_name}: {e}")
        return []

def main():
    print("Fetching data from Supabase...")
    boards = fetch_table("exam_boards")
    exams = fetch_table("exams")
    exam_subjects = fetch_table("exam_subjects")
    subjects = fetch_table("subjects")
    chapters = fetch_table("chapters")
    
    # Create lookups
    board_dict = {b["id"]: b for b in boards}
    exam_dict = {e["id"]: e for e in exams}
    subject_dict = {s["id"]: s for s in subjects}
    
    # Build chapters per subject
    chapters_by_subject = {}
    for c in chapters:
        sid = c.get("subject_id")
        if sid:
            if sid not in chapters_by_subject:
                chapters_by_subject[sid] = []
            chapters_by_subject[sid].append({
                "chapter_id": c["id"],
                "chapter_name": c.get("name"),
                "exam_type": c.get("exam_type", "")
            })
            
    # Build subjects per exam using the junction table
    subjects_by_exam = {}
    for es in exam_subjects:
        eid = es.get("exam_id")
        sid = es.get("subject_id")
        if eid and sid:
            if eid not in subjects_by_exam:
                subjects_by_exam[eid] = []
                
            subj = subject_dict.get(sid)
            if subj:
                subjects_by_exam[eid].append({
                    "subject_id": subj["id"],
                    "subject_name": subj.get("name"),
                    "description": subj.get("description", ""),
                    "chapters": chapters_by_subject.get(sid, [])
                })
                
    # Build exams per board
    exams_by_board = {}
    for e in exams:
        bid = e.get("exam_board_id")
        if bid:
            if bid not in exams_by_board:
                exams_by_board[bid] = []
                
            exams_by_board[bid].append({
                "exam_id": e["id"],
                "exam_name": e.get("name"),
                "full_name": e.get("full_name", ""),
                "type": e.get("type", ""),
                "subjects": subjects_by_exam.get(e["id"], [])
            })
            
    # Assemble final JSON hierarchy
    output_hierarchy = []
    for b in boards:
        output_hierarchy.append({
            "board_id": b["id"],
            "board_name": b.get("name"),
            "full_name": b.get("full_name", ""),
            "description": b.get("description", ""),
            "exams": exams_by_board.get(b["id"], [])
        })
        
    output_file = "structure.json"
    with open(output_file, "w") as f:
        json.dump(output_hierarchy, f, indent=2)
        
    print(f"Successfully created {output_file}")

if __name__ == "__main__":
    main()
