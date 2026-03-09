def split_by_subject(raw_text, subjects):

    sections = []

    for i in range(len(subjects)):

        start = subjects[i]["position"]

        if i + 1 < len(subjects):
            end = subjects[i+1]["position"]
        else:
            end = len(raw_text)

        section_text = raw_text[start:end]

        sections.append({
            "subject_id": subjects[i]["id"],
            "subject_name": subjects[i]["name"],
            "text": section_text
        })

    return sections