import json
import os
from services.supabase_push import push_english
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def run():
    with open('outputs/questions.json') as f:
        questions = json.load(f)

    url_mapping = {}

    for q in questions:
        if q.get('diagram_present') and q.get('diagram_url') and q['diagram_url'].startswith('/local/'):
            local_path = q['diagram_url'].replace('/local/', '')
            local_path = local_path.replace('\\', '/')
            if local_path not in url_mapping:
                filepath = local_path
                filename = os.path.basename(filepath)
                print(f"Uploading {filepath}...")
                import time
                unique_filename = f"{int(time.time())}_{filename}"
                with open(filepath, 'rb') as img_f:
                    supabase.storage.from_("diagrams").upload(file=img_f, path=unique_filename, file_options={"content-type": "image/png"})
                
                public_url = supabase.storage.from_("diagrams").get_public_url(unique_filename)
                print(f"Mapped {local_path} -> {public_url}")
                url_mapping[local_path] = public_url

            q['diagram_url'] = url_mapping[local_path]

    with open('outputs/questions.json', 'w') as f:
        json.dump(questions, f, indent=2)

    print("Images uploaded and JSON updated. Now pushing questions to Supabase...")

    # We need subject_id and exam_id
    subject_id = next((q.get('subject_id') for q in questions if q.get('subject_id')), None)
    exam_id = next((q.get('exam_id') for q in questions if q.get('exam_id')), None)

    # Resolve chapter constraints by ensuring every question has a chapter_id map, even if default
    from tmp_chapter_fix import setup_fallback_chapter
    chapter_id = setup_fallback_chapter(subject_id) if subject_id else None

    push_questions = []
    for q in questions:
        # Ignore empty subject ids to satisfy the DB constraint
        if subject_id is not None:
            if chapter_id and not q.get("chapter_id"):
                q["chapter_id"] = chapter_id
            push_questions.append(q)

    push_english(push_questions, subject_id, exam_id)
    print("Finished uploading to Supabase!")

if __name__ == "__main__":
    run()
