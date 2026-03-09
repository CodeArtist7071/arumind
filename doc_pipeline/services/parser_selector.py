from services.regex_mcq_parser import regex_parse_questions
from services.qwen_parser import parse_to_json


def hybrid_parse(text):

    regex_questions = regex_parse_questions(text)

    # If regex detected enough questions use it
    if len(regex_questions) > 20:
        print("[PARSER] Using REGEX parser")
        return regex_questions

    print("[PARSER] Falling back to Qwen")

    qwen_questions = parse_to_json(text)

    return qwen_questions