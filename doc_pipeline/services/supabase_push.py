from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)




# def push_questions(data):

#     for q in data:
#         supabase.table("questions").insert(q).execute()


def push_english(data, subject_id, exam_id):

    print("is data coming", data)

    for q in data:

        q["subject_id"] = subject_id
        q["exam_id"] = exam_id

        supabase.table("questions").insert(q).execute()



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