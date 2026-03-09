import json
import os
from config import VISION_FREE_LIMIT, GEMINI_FREE_LIMIT

USAGE_FILE = "usage.json"


def load_usage():

    if not os.path.exists(USAGE_FILE):
        return {"vision_pages": 0, "gemini_tokens": 0}

    with open(USAGE_FILE) as f:
        return json.load(f)


def save_usage(data):

    with open(USAGE_FILE, "w") as f:
        json.dump(data, f, indent=2)


def check_vision_quota(pages):

    usage = load_usage()

    if usage["vision_pages"] + pages > VISION_FREE_LIMIT:
        raise Exception("Vision API free quota exceeded")

    usage["vision_pages"] += pages

    if usage["vision_pages"] > VISION_FREE_LIMIT * 0.9:
        print("Warning: Vision quota near limit")

    save_usage(usage)


def check_gemini_quota(tokens):

    usage = load_usage()

    if usage["gemini_tokens"] + tokens > GEMINI_FREE_LIMIT:
        raise Exception("Gemini free quota exceeded")

    usage["gemini_tokens"] += tokens

    save_usage(usage)