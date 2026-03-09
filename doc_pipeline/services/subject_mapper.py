import re


def detect_subject(raw_text, subjects):

    raw_lower = raw_text.lower()

    for sub in subjects:

        name = sub["name"].lower()

        # match first word
        first_word = name.split()[0]

        if first_word in raw_lower:

            print(f"[MAPPER] Subject detected → {name}")

            return sub["id"]

    print("⚠️ Subject not detected")

    return None