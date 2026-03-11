import json
import os
import json5
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY,REGION, API_KEY, GEMINI_MODEL,PROJECT_ID
from google import genai
from google.genai import types
import random

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


class GeminiModel:
    def __init__(self, use_vertexai=True, project=PROJECT_ID, location=REGION, async_mode=False):
        """
        Initialize Gemini model client.
        - use_vertexai=True to connect via Vertex AI, else uses Gemini Developer API.
        - async_mode=True to use async client.
        """
        self.async_mode = async_mode
        self.model_id = GEMINI_MODEL

        if use_vertexai:
            if async_mode:
                self.client = genai.Client(
                    vertexai=True,
                    project=project,
                    location=location,
                    http_options=types.HttpOptions(api_version='v1')
                ).aio
            else:
                self.client = genai.Client(
                    vertexai=True,
                    project=project,
                    location=location,
                    http_options=types.HttpOptions(api_version='v1')
                )
            print("[MODEL] Gemini initialized via Vertex AI")
        else:
            if async_mode:
                self.client = genai.Client(
                    api_key=API_KEY,
                    http_options=types.HttpOptions(api_version='v1alpha')
                ).aio
            else:
                self.client = genai.Client(
                    api_key=API_KEY,
                    http_options=types.HttpOptions(api_version='v1alpha')
                )
            print("[MODEL] Gemini initialized via Gemini Developer API")

    def generate(self, prompt):
        try:
            if self.async_mode:
                import asyncio

                async def async_generate():
                    response = await self.client.models.generate_content(
                        model=self.model_id,
                        contents=prompt
                    )
                    return response.text

                return asyncio.run(async_generate())
            else:
                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=prompt
                )
                return response.text
        except Exception as e:
            print("[MODEL ERROR]", e)
            return ""


def clean_json_output(text):
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1 and end > start:
        return text[start:end+1]
    return "[]"


def load_prompt():
    prompt_path = os.path.join("ai_prompt", "question_prompt.txt")
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()
        


def safe_json_parse(text):
    text = clean_json_output(text)
    try:
        return json5.loads(text)
    except Exception as e:
        print("JSON parse error", e)
        return []


def get_mapping():
    flat_path = "structure_flat.json"
    with open(flat_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_round_robin_subject_chapter(mapping):
    tracker_file = "chapter_tracker.json"
    
    current_index = 0
    priority_board = None
    
    if os.path.exists(tracker_file):
        try:
            with open(tracker_file, "r", encoding="utf-8") as tf:
                state = json.load(tf)
                current_index = state.get("current_index", 0)
                priority_board = state.get("priority_board", None)
        except Exception:
            current_index = 0
            priority_board = None

    flat_list = []
    # Build a flattened list of (exam, subject, chapter)
    for board_name, exams in mapping.items():
        # If priority_board is set, skip any other board
        if priority_board and board_name != priority_board:
            continue
            
        for exam_name, subjects in exams.items():
            for subject_name, chapters in subjects.items():
                for chapter in chapters:
                    flat_list.append((exam_name, subject_name, chapter))
    
    if not flat_list:
        return "Demo Exam", "Demo Subject", "Demo Chapter"
        
    # Keep index within bounds
    if current_index >= len(flat_list):
        current_index = 0
        
    selected_exam, selected_subject, selected_chapter = flat_list[current_index]
    
    # Update state for next run
    next_index = (current_index + 1) % len(flat_list)
    
    state_to_save = {
        "current_index": next_index, 
        "total_chapters_found": len(flat_list),
        "priority_board": priority_board
    }
    
    with open(tracker_file, "w", encoding="utf-8") as tf:
        json.dump(state_to_save, tf, indent=2)
        
    print(f"Round Robin Tracker: Selected index {current_index} of {len(flat_list)} total valid combinations (Priority: {priority_board}).")
    return selected_exam, selected_subject, selected_chapter


def fetch_ids(exam_name, subject_name, chapter_name):
    exam_res = supabase.table("exams").select("id").eq("name", exam_name).execute()
    exam_id = exam_res.data[0]["id"] if exam_res.data else None

    subj_res = supabase.table("subjects").select("id").eq("name", subject_name).execute()
    subj_id = subj_res.data[0]["id"] if subj_res.data else None

    chap_res = supabase.table("chapters").select("id").eq("name", chapter_name).execute()
    chap_id = chap_res.data[0]["id"] if chap_res.data else None

    return exam_id, subj_id, chap_id


def push_to_supabase(questions_data, exam_id, subject_id, chapter_id):
    print(f"Checking {len(questions_data)} questions against Supabase to avoid duplicates...")
    
    # Fetch existing questions for this specific chapter to avoid repeating
    existing_res = supabase.table("questions").select("question").eq("chapter_id", chapter_id).execute()
    existing_questions = [row["question"].strip().lower() for row in (existing_res.data or [])]
    
    diff_map = {"E": "Easy", "M": "Moderate", "H": "Hard"}
    inserted_count = 0
    
    for q in questions_data:
        generated_q_text = q.get("q", "").strip()
        
        # Deduplication check
        if generated_q_text.lower() in existing_questions:
            print(f"Skipping duplicate question: '{generated_q_text[:30]}...'")
            continue
            
        try:
            diff_raw = q.get("diff", "M")
            mapped_diff = diff_map.get(diff_raw, "Moderate")
            
            payload = {
                "exam_id": exam_id,
                "subject_id": subject_id,
                "chapter_id": chapter_id,
                "question": generated_q_text,
                "options": q.get("opt", []),
                "correct_answer": q.get("ans", ""),
                "difficulty_level": mapped_diff,
                "marks": q.get("marks", 2),
            }
            supabase.table("questions").insert(payload).execute()
            inserted_count += 1
            # Add to local cache so we don't insert duplicate within the same batch
            existing_questions.append(generated_q_text.lower())
        except Exception as e:
            print(f"Failed to insert question '{generated_q_text[:30]}...':")
            print(e)
            if hasattr(e, 'json'):
                print(e.json())
                
    print(f"Push complete! Inserted {inserted_count} new questions (Skipped {len(questions_data) - inserted_count} duplicates).")


def generate_questions(
    use_vertexai=False, project=None, location=None, async_mode=False
):
    print("Loading mapping and prompt...")
    mapping = get_mapping()
    base_prompt = load_prompt()
    model = GeminiModel(
        use_vertexai=use_vertexai, project=project, location=location, async_mode=async_mode
    )

    exam_name, subject_name, chapter_name = get_round_robin_subject_chapter(mapping)
    print(f"Targeting Exam: {exam_name}, Subject: {subject_name}, Chapter: {chapter_name}")

    prompt = base_prompt + f"\n\nGenerate exactly 10 questions for Subject: '{subject_name}', Chapter: '{chapter_name}'."

    print("Connecting to Gemini Model to generate 10 questions...")
    response_text = model.generate(prompt)

    # Save raw model response for debugging
    os.makedirs("outputs", exist_ok=True)
    with open("outputs/raw_model_response.txt", "w", encoding="utf-8") as rf:
        rf.write(response_text)

    questions = safe_json_parse(response_text)

    if not questions:
        print("No questions could be parsed. See outputs/raw_model_response.txt. Exiting.")
        return

    print(f"Successfully generated {len(questions)} questions. Fetching IDs for mapping...")
    exam_id, subject_id, chapter_id = fetch_ids(exam_name, subject_name, chapter_name)
    print(f"Mapped IDs - Exam: {exam_id}, Subject: {subject_id}, Chapter: {chapter_id}")

    with open("outputs/generated_questions.json", "w", encoding="utf-8") as f:
        json.dump(questions, f, separators=(',', ':'))

    push_to_supabase(questions, exam_id, subject_id, chapter_id)
    print("Generation and pushing complete!")


if __name__ == "__main__":
    # Example usage: You can toggle Vertex AI or async_mode here
    generate_questions(
        use_vertexai=False,  # Set True for Vertex AI
        project=PROJECT_ID,  # Required if Vertex AI
        location=REGION,  # Required if Vertex AI
        async_mode=False,  # Set True for async
    )