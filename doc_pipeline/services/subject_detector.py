from rapidfuzz import fuzz
import re


def detect_subjects(raw_text, subjects):

    detected = []

    raw_lower = raw_text.lower()

    for subject in subjects:

        subject_name = subject["name"].lower()

        if subject_name in raw_lower:

            detected.append({
                "id": subject["id"],
                "name": subject["name"],
                "position": raw_lower.find(subject_name)
            })

        else:

            score = fuzz.partial_ratio(subject_name, raw_lower)

            if score > 80:
                detected.append({
                    "id": subject["id"],
                    "name": subject["name"],
                    "position": raw_lower.find(subject_name)
                })

    detected.sort(key=lambda x: x["position"])

    print(f"[SUBJECT DETECTOR] Found {len(detected)} subjects")

    return detected

import re


def split_subject_sections(raw_text, subjects):

    print("\n[SECTION] Detecting subject sections")

    sections = []

    raw_lower = raw_text.lower()

    for sub in subjects:

        subject_name = sub["name"].lower()

        first_word = subject_name.split()[0]

        pattern = rf"{first_word}.*?\n"

        match = re.search(pattern, raw_lower)

        if match:

            start = match.start()

            sections.append({
                "subject_id": sub["id"],
                "subject_name": subject_name,
                "start": start
            })

    if not sections:

        print("⚠️ No subject headers detected")

        return []

    # Sort by text position
    sections = sorted(sections, key=lambda x: x["start"])

    subject_chunks = []

    for i, sec in enumerate(sections):

        start = sec["start"]

        if i + 1 < len(sections):
            end = sections[i + 1]["start"]
        else:
            end = len(raw_text)

        chunk_text = raw_text[start:end]

        subject_chunks.append({
            "subject_id": sec["subject_id"],
            "subject_name": sec["subject_name"],
            "text": chunk_text
        })

    print(f"[SECTION] Detected {len(subject_chunks)} subject sections")

    return subject_chunks