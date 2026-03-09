import re


def regex_parse_questions(text):

    pattern = r'(\d+)\.\s*(.*?)\nA\.\s*(.*?)\nB\.\s*(.*?)\nC\.\s*(.*?)\nD\.\s*(.*?)(?=\n\d+\.|\Z)'

    matches = re.findall(pattern, text, re.DOTALL)

    questions = []

    for m in matches:

        questions.append({
            "question_number": int(m[0]),
            "question": m[1].strip(),
            "options": {
                "A": m[2].strip(),
                "B": m[3].strip(),
                "C": m[4].strip(),
                "D": m[5].strip()
            },
            "answer": ""
        })

    print(f"[REGEX PARSER] Extracted {len(questions)} questions")

    return questions