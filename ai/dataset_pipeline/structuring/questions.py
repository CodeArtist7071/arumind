"""Conservative MCQ candidates. Unmatched content remains available for review."""
from __future__ import annotations

import re

from ..review.gate import CONTENT_FIELDS


START = re.compile(r"(?m)^\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,5})[.)]\s+")
OPTION = re.compile(r"(?<!\w)(?:\(([a-dA-D])\)|([a-dA-D])[.)])\s+")
ANSWER = re.compile(r"(?im)^\s*(?:ans(?:wer)?\.?)[\s:–-]*\(?([a-dA-D])\)?(?:[.)])?(?:\s|$)")


def block_text(block: dict) -> str:
    value = block.get("content", "")
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "".join(block_text(item) for item in value if isinstance(item, dict))
    return ""


def build_bank(document: dict) -> dict:
    parts, offsets, raw_blocks = [], [], []
    position = 0
    for page in document["pages"]:
        for index, block in enumerate(page["blocks"]):
            text = block_text(block)
            raw_blocks.append({"source_page": page["source_page"], "block_index": index,
                               "type": block.get("type", "unknown"), "text": text,
                               "asset_directory": page["asset_directory"], "raw": block})
            if text:
                offsets.append((position, page["source_page"], index))
                parts.append(text + "\n")
                position += len(text) + 1
    joined = "".join(parts)
    starts = list(START.finditer(joined))
    questions = []
    for i, match in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(joined)
        passage = joined[match.end():end].strip()
        options = list(OPTION.finditer(passage))
        labels = [(opt.group(1) or opt.group(2)).lower() for opt in options]
        # Never infer MCQs from numbered theory paragraphs or answer-key lists.
        if labels != list("abcd"):
            continue
        page, block_index = next((page, block) for offset, page, block in reversed(offsets)
                                 if offset <= match.start())
        row = dict.fromkeys(CONTENT_FIELDS, "")
        row.update(question_id=f"{document['source_sha256'][:16]}-p{page}-b{block_index}-q{match.group(1)}-{i}",
                   question=passage[:options[0].start()].strip(),
                   source_file=document["source_file"], source_page=page,
                   review_status="pending", review_notes="Candidate only: compare question, options and answer with PDF.",
                   raw_text=passage, source_snippet=passage, question_number=int(match.group(1)))
        answer = ANSWER.search(passage, options[-1].end())
        for n, opt in enumerate(options):
            finish = options[n + 1].start() if n < 3 else (answer.start() if answer else len(passage))
            row[f"option_{labels[n]}"] = passage[opt.end():finish].strip()
        if answer:
            row["correct_answer"] = answer.group(1).upper()
            row["explanation"] = passage[answer.end():].strip()
        questions.append(row)
    return {"source_file": document["source_file"], "source_sha256": document["source_sha256"],
            "extraction_complete": document["complete"], "questions": questions,
            "raw_blocks": raw_blocks, "coverage_reviewed": False,
            "notice": "Pattern-based candidates are not exhaustive. Review raw blocks for missed questions and answer keys."}
