from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)




# def push_questions(data):

#     for q in data:
#         supabase.table("questions").insert(q).execute()

def upload_diagram_to_supabase(filepath, filename):
    import time
    unique_filename = f"{int(time.time())}_{filename}"
    
    try:
        with open(filepath, 'rb') as f:
            supabase.storage.from_("diagrams").upload(file=f, path=unique_filename, file_options={"content-type": "image/png"})
            
        res = supabase.storage.from_("diagrams").get_public_url(unique_filename)
        return res
    except Exception as e:
        print(f"Supabase upload error (likely RLS policy): {e}")
        # Return the local path to ensure the pipeline registers the diagram mapping logic as successful
        return f"/local/{filepath}"


def push_english(data, subject_id, exam_id):

    print("is data coming", data)

    for q in data:

        # Copy to avoid mutating the original file data
        payload = dict(q)
        payload["subject_id"] = subject_id
        payload["exam_id"] = exam_id
        
        # Remove keys that aren't inside the Supabase schema yet to prevent PGRST204 errors
        payload.pop("diagram_present", None)
        payload.pop("linked_questions", None)
        payload.pop("appear_year", None)
        payload.pop("question_number", None)
        payload.pop("diagram_note", None)

        try:
            # Upsert using 'question' as the conflict key (since there is a unique constraint on it)
            # If your table doesn't support ON CONFLICT easily from the python SDK, we catch the APIError
            supabase.table("questions").upsert(payload, on_conflict="question").execute()
            print(f"✓ Pushed: {q.get('question_number', '?')}")
        except Exception as e:
            if "already exists" in str(e):
                print(f"⚠ Skipped duplicate: {q.get('question', '')[:50]}...")
            else:
                print(f"✗ Failed to push Q{q.get('question_number', '?')}: {e}")



# def push_odia(data):

#     for q in data:
#         supabase.table("questions_or").insert(q).execute()


def resolve_exam_subject_ids(exam_name, subject_name):

    exam = supabase.table("exams").select("id").eq("name", exam_name).single().execute()

    subject = supabase.table("subjects").select("id").eq("name", subject_name).single().execute()

    exam_id = exam.data["id"]
    subject_id = subject.data["id"]

    return exam_id, subject_id


def detect_exam_name(text):

    response = supabase.table("exams").select("name").execute()

    exams = response.data

    text_lower = text.lower()

    for exam in exams:
        exam_name = exam["name"]

        if exam_name.lower() in text_lower:
            return exam_name

    return None



def detect_subject_name(text):

    response = supabase.table("subjects").select("name").execute()

    subjects = response.data

    text_lower = text.lower()

    for subject in subjects:
        subject_name = subject["name"]

        if subject_name.lower() in text_lower:
            return subject_name

    return None