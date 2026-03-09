def chunk_questions(question_blocks, chunk_size=8):

    print("\n[CHUNK] Creating chunks")

    chunks = []

    for i in range(0, len(question_blocks), chunk_size):

        chunk = question_blocks[i:i + chunk_size]

        chunks.append(chunk)

    print(f"[CHUNK] Total chunks created: {len(chunks)}")

    return chunks