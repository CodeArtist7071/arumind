import os
import sys
import json
from supabase import create_client

# Add parent directory to path to allow importing models/services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Initialize Supabase with the SERVICE ROLE KEY to bypass RLS
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def load_mapped_syllabus():
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "syllabus.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_or_create_board(name):
    res = supabase.table("exam_boards").select("id").eq("name", name).execute()
    if res.data:
        return res.data[0]["id"]
    
    # Create new board
    print(f"[DB] Creating Board: {name}")
    new_res = supabase.table("exam_boards").insert({"name": name, "is_active": True}).execute()
    return new_res.data[0]["id"]

def get_or_create_exam(name, board_id):
    res = supabase.table("exams").select("id").eq("name", name).execute()
    if res.data:
        return res.data[0]["id"]
    
    # Create new exam
    print(f"[DB] Creating Exam: {name}")
    new_res = supabase.table("exams").insert({
        "name": name, 
        "full_name": name, # Fallback
        "exam_board_id": board_id,
        "is_active": True
    }).execute()
    return new_res.data[0]["id"]

def get_or_create_subject(name):
    res = supabase.table("subjects").select("id").eq("name", name).execute()
    if res.data:
        return res.data[0]["id"]
    
    # Create new subject
    print(f"[DB] Creating Subject: {name}")
    new_res = supabase.table("subjects").insert({"name": name}).execute()
    return new_res.data[0]["id"]

def link_exam_subject(exam_id, subject_id):
    res = supabase.table("exam_subjects").select("id").eq("exam_id", exam_id).eq("subject_id", subject_id).execute()
    if not res.data:
        print(f"[DB] Linking Exam {exam_id[:8]} to Subject {subject_id[:8]}")
        supabase.table("exam_subjects").insert({"exam_id": exam_id, "subject_id": subject_id}).execute()

def get_or_create_chapter(name, subject_id):
    res = supabase.table("chapters").select("id").eq("name", name).eq("subject_id", subject_id).execute()
    if res.data:
        return res.data[0]["id"]
    
    # Create new chapter
    print(f"[DB] Creating Chapter: {name}")
    new_res = supabase.table("chapters").insert({"name": name, "subject_id": subject_id}).execute()
    return new_res.data[0]["id"]

def push_syllabus():
    print("[PUSH] Loading syllabus.json...")
    data = load_mapped_syllabus()
    print(f"[PUSH] Found {len(data)} associations to process.")

    # Caches to avoid redundant lookups
    board_cache = {}
    exam_cache = {}
    subject_cache = {}
    link_cache = set()
    chapter_cache = set()

    success_count = 0

    for i, entry in enumerate(data):
        board_name = entry.get("board", "OSSC").strip()
        exam_name = entry.get("exam", "Unknown").strip()
        subject_name = entry.get("subject", "General Awareness").strip()
        chapter_name = entry.get("chapter", "Miscellaneous").strip()

        try:
            # 1. Resolve Board
            if board_name not in board_cache:
                board_cache[board_name] = get_or_create_board(board_name)
            board_id = board_cache[board_name]

            # 2. Resolve Exam
            exam_key = f"{board_name}:{exam_name}"
            if exam_key not in exam_cache:
                exam_cache[exam_key] = get_or_create_exam(exam_name, board_id)
            exam_id = exam_cache[exam_key]

            # 3. Resolve Subject
            if subject_name not in subject_cache:
                subject_cache[subject_name] = get_or_create_subject(subject_name)
            subject_id = subject_cache[subject_name]

            # 4. Link Exam-Subject
            link_key = f"{exam_id}:{subject_id}"
            if link_key not in link_cache:
                link_exam_subject(exam_id, subject_id)
                link_cache.add(link_key)

            # 5. Resolve Chapter
            chapter_key = f"{subject_id}:{chapter_name}"
            if chapter_key not in chapter_cache:
                get_or_create_chapter(chapter_name, subject_id)
                chapter_cache.add(chapter_key)

            success_count += 1
            if i % 10 == 0:
                print(f"[PUSH] Processed {i}/{len(data)} items...")

        except Exception as e:
            print(f"[ERROR] Failed on item {i} ({chapter_name}): {e}")

    print(f"\n[FINAL SUCCESS] Successfully synchronized {success_count} syllabus entries with Supabase.")

if __name__ == "__main__":
    push_syllabus()
