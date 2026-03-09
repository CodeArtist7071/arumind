def validate_questions(questions):

    valid_questions = []
    seen_questions = set()

    for q in questions:

        question_text = q.get("question", "").strip()

        options = q.get("options", {})

        # 1️⃣ Reject empty question
        if not question_text:
            continue

        # 2️⃣ Reject duplicates
        if question_text in seen_questions:
            continue

        seen_questions.add(question_text)

        # 3️⃣ Check options exist
        if not all(k in options for k in ["A", "B", "C", "D"]):
            continue

        # 4️⃣ Reject empty options
        if any(not options[k].strip() for k in ["A", "B", "C", "D"]):
            continue

        valid_questions.append(q)

    print(f"[VALIDATOR] Valid questions: {len(valid_questions)} / {len(questions)}")

    return valid_questions