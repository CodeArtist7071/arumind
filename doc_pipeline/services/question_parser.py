from services.qwen_parser import parse_to_json
from services.parser_selector import hybrid_parse


def parse_sections(sections, exam_id):

    all_questions = []

    for section in sections:

        print(f"[PARSER] Processing subject: {section['subject_name']}")

        questions = hybrid_parse(section["text"])

        for q in questions:

            q["exam_id"] = exam_id
            q["subject_id"] = section["subject_id"]

            all_questions.append(q)

    return all_questions


# def parse_sections(sections, exam_id):

#     all_questions = []

#     for section in sections:

#         print(f"[PARSER] Parsing {section['subject_name']}")

#         questions = parse_to_json(section["text"])

#         for q in questions:

#             q["exam_id"] = exam_id
#             q["subject_id"] = section["subject_id"]

#             all_questions.append(q)

#     return all_questions