def map_questions(questions, exam_id, subject_id):

    mapped = []

    for q in questions:

        mapped.append({
            "exam_id": exam_id,
            "subject_id": subject_id,
            "question_text": q["question"],
            "option_a": q["options"]["A"],
            "option_b": q["options"]["B"],
            "option_c": q["options"]["C"],
            "option_d": q["options"]["D"],
            "correct_answer": q["answer"]
        })

    print(f"[MAPPER] Questions mapped: {len(mapped)}")

    return mapped