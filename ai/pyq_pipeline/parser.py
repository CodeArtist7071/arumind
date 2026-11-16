from __future__ import annotations

import hashlib
import re
from pathlib import Path

Q_RE = re.compile(r"^\s*(?:#{1,6}\s*)?(?:\*\*|__|[*_`])?\s*(?:Q(?:uestion)?\s*\.?\s*(?P<qnum>\d{1,4})|(?P<num>\d{1,4}))\s*[.)\]:-]?(?:\*\*|__|[*_`])?\s*(?P<body>.*)$", re.I)
OPT_RE = re.compile(r"^\s*(?:\(([A-Za-z0-9]{1,3})\)|\[([A-Za-z0-9]{1,3})\]|([A-Za-z0-9]{1,3})[.)])(?:\s+(.*)|\s*)$")
ANSWER_RE = re.compile(r"^\s*(?:correct\s+answer|answer|ans\.?)\s*(?:is\s*)?[:.-]\s*(.+)$", re.I)
ANSWER_PAIR_RE = re.compile(r"(?<![\w])(?P<number>\d{1,4})\s*\.\s*\(?\s*(?P<answer>[A-E1-5])\s*\)?(?=\s|[,;|.]|$)", re.I)
LABELED_ANSWER_RE = re.compile(r"(?<![A-Za-z])(?:Ans(?:wer)?|Sol(?:ution)?)\s*\.?\s*(?P<number>\d{1,4})\s*[.)]\s*\(?\s*(?P<answer>[A-E1-5])\s*\)?", re.I)
NUMBERED_LABELED_ANSWER_RE = re.compile(r"(?<!\w)(?P<number>\d{1,4})\s*[.)]\s*Ans(?:wer)?\s*\.?\s*\(?\s*(?P<answer>[A-E1-5])\s*\)?", re.I)
LINE_ANSWER_RE = re.compile(r"^\s*(?:Q(?:uestion)?\s*\.?\s*)?(?P<number>\d{1,4})\s*[.)-]\s*(?:Ans(?:wer)?\s*[:.)-]?\s*)?\(?\s*(?P<answer>[A-E1-5])\s*\)?(?:\s|$)", re.I)
ANSWER_TOKEN_RE = re.compile(r"(?<![\w])(?P<number>\d{1,4})\s*[.)]\s*\(?\s*(?P<answer>[A-E1-5])\s*\)?(?=\s|[,;|.]|$)", re.I)
ANSWER_KEY_TITLE_RE = re.compile(r"^\s*(?:answer\s*keys?|answers?|key\s*to\s*answers?)\s*(?:[:.\-]+)?\s*$", re.I)
ANSWER_SECTION_END_RE = re.compile(r"^\s*(?:solutions?|explanations?|questions?|exercise|chapter|answers?\s+and\s+solutions?)\b", re.I)
INLINE_OPTION_RE = re.compile(r"(?<!\w)(?:\((?P<paren>[A-E1-5])\)|\[(?P<bracket>[A-E1-5])\]|(?P<plain>[A-E1-5])[.)])\s*", re.I)
YEAR_RE = re.compile(r"\b(19\d{2}|20\d{2})\b")
PAGE_RE = re.compile(r"<!--\s*source page\s+(\d+)\s*-->", re.I)
QUESTION_CUE_RE = re.compile(r"\b(?:which|what|who|whom|whose|when|where|why|how|select|choose|identify|find|calculate|determine|consider|complete|fill|match|following|correct|incorrect|true|false)\b", re.I)


def _answer_key_runs(text: str):
    matches = list(ANSWER_PAIR_RE.finditer(text))
    runs = []
    run = []

    def retain(candidate):
        if len(candidate) < 3:
            return
        has_parenthesized = any("(" in match.group(0) for match in candidate)
        same_line = text.count("\n", candidate[0].start(), candidate[-1].end()) == 0
        if has_parenthesized or same_line:
            runs.append(candidate)

    for match in matches:
        separator = text[run[-1].end():match.start()] if run else ""
        if run and not re.fullmatch(r"[\s,;|:]*", separator):
            retain(run)
            run = []
        run.append(match)
    retain(run)
    return sorted(runs, key=lambda matches: matches[0].start())


def _explicit_answer_key_blocks(text: str) -> list[dict]:
    """Read numbered answers only inside explicitly titled answer-key boxes/sections."""
    lines = text.splitlines(keepends=True)
    offsets = []
    cursor = 0
    for line in lines:
        offsets.append(cursor)
        cursor += len(line)

    blocks = []
    active_start = None
    active_title = ""
    for index, raw in enumerate(lines):
        clean = raw.strip().lstrip("#").strip().strip("*_`). ")
        is_heading = raw.lstrip().startswith("#")
        is_answer_title = bool(ANSWER_KEY_TITLE_RE.match(clean))
        if active_start is not None and ((is_heading and not is_answer_title)
                                         or ANSWER_SECTION_END_RE.match(clean)
                                         or re.match(r"^\s*(?:#{1,6}\s*)?(?:\*\*)?Q(?:uestion)?\s*\.?\s*\d", raw, re.I)):
            end = offsets[index]
            if end > active_start:
                blocks.append({"start": active_start, "end": end, "title": active_title})
            active_start = None
            active_title = ""
        if is_answer_title:
            if active_start is not None:
                blocks.append({"start": active_start, "end": offsets[index], "title": active_title})
            active_start = offsets[index] + len(raw)
            active_title = clean.rstrip(":- ") or "Answer Key"
    if active_start is not None and cursor > active_start:
        blocks.append({"start": active_start, "end": cursor, "title": active_title})

    result = []
    for block_index, block in enumerate(blocks, start=1):
        body = text[block["start"]:block["end"]]
        for match in ANSWER_PAIR_RE.finditer(body):
            result.append({
                "question_number": match.group("number"),
                "answer": match.group("answer").upper(),
                "page": None,
                "section": block["title"],
                "source_offset": block["start"] + match.start(),
                "match_type": "answer_key_box",
                "answer_key_block": f"{block['start']}:{block_index}",
            })

    # Many extracted PDFs render the key as a bordered Markdown table without
    # a title. Accept only tables where nearly every non-empty cell is a
    # numbered answer token; this excludes normal question/option tables.
    table_index = 0
    line_index = 0
    while line_index < len(lines):
        if "|" not in lines[line_index]:
            line_index += 1
            continue
        first_line = line_index
        while line_index < len(lines) and "|" in lines[line_index]:
            line_index += 1
        table_lines = lines[first_line:line_index]
        cells = []
        pair_matches = []
        for row_index, raw in enumerate(table_lines):
            row = raw.strip().strip("|")
            row_cells = [cell.strip() for cell in row.split("|")]
            for cell in row_cells:
                clean_cell = cell.strip().strip("*_` ")
                if not clean_cell or re.fullmatch(r":?-{3,}:?", clean_cell):
                    continue
                cells.append(clean_cell)
                match = re.fullmatch(r"(?P<number>\d{1,4})\s*\.\s*\(?\s*(?P<answer>[A-E1-5])\s*\)?\s*[.,;:]?", clean_cell, re.I)
                if match:
                    pair_matches.append((row_index, match))
        in_titled_block = any(block["start"] <= offsets[first_line] < block["end"] for block in blocks)
        if not in_titled_block and len(pair_matches) >= 3 and len(pair_matches) / max(1, len(cells)) >= 0.8:
            table_index += 1
            block_start = offsets[first_line]
            block_id = f"{block_start}:untitled-table-{table_index}"
            for row_index, match in pair_matches:
                line_start = offsets[first_line + row_index]
                result.append({
                    "question_number": match.group("number"),
                    "answer": match.group("answer").upper(),
                    "page": None,
                    "section": "Untitled bordered answer-key table",
                    "source_offset": line_start + match.start(),
                    "match_type": "answer_key_box",
                    "answer_key_block": block_id,
                })
    return result


def _split_inline_options(line: str) -> list[str]:
    markers = list(INLINE_OPTION_RE.finditer(line))
    if len(markers) < 2:
        return [line]
    sequences = []
    for index, marker in enumerate(markers):
        label = next(group for group in marker.groups() if group is not None).casefold()
        if label not in {"a", "1"}:
            continue
        sequence = [marker]
        expected = "b" if label == "a" else "2"
        for candidate in markers[index + 1:]:
            candidate_label = next(group for group in candidate.groups() if group is not None).casefold()
            if candidate_label == expected:
                sequence.append(candidate)
                expected = chr(ord(expected) + 1)
                if expected not in {"b", "c", "d", "e", "f", "2", "3", "4", "5", "6"}:
                    break
        if len(sequence) >= 3:
            sequences.append(sequence)
    if not sequences:
        return [line]
    sequence = max(enumerate(sequences), key=lambda item: (len(item[1]), item[0]))[1]
    leading_option = OPT_RE.match(line)
    leading_option_label = next((group for group in leading_option.groups()[:3] if group is not None), "").casefold() if leading_option else ""
    if leading_option_label in {"a", "b", "c", "d", "1", "2", "3", "4"} and sequence[0].start() != markers[0].start():
        return [line]
    parts = []
    prefix = line[:sequence[0].start()].strip()
    if prefix:
        parts.append(prefix)
    for index, marker in enumerate(sequence):
        end = sequence[index + 1].start() if index + 1 < len(sequence) else len(line)
        label = next(group for group in marker.groups() if group is not None)
        option_text = line[marker.end():end].strip()
        parts.append(f"({label}) {option_text}".rstrip())
    return parts


def _has_repeated_inline_option_grid(line: str) -> bool:
    labels = [next(group for group in marker.groups() if group is not None).casefold()
              for marker in INLINE_OPTION_RE.finditer(line)]
    alphabetic = sum(labels.count(label) >= 2 for label in ("a", "b", "c", "d"))
    numeric = sum(labels.count(label) >= 2 for label in ("1", "2", "3", "4"))
    return max(alphabetic, numeric) >= 3


def _has_local_option_sequence(lines: list[str], start_index: int) -> bool:
    labels: list[str] = []
    for index in range(start_index, min(len(lines), start_index + 14)):
        line = lines[index].rstrip("\r\n")
        if index > start_index:
            next_question = Q_RE.match(line)
            if next_question:
                break
        for part in _split_inline_options(line):
            if Q_RE.match(part):
                continue
            option = OPT_RE.match(part)
            if option:
                label = next((value for value in option.groups()[:3] if value is not None), "").casefold()
                if label in {"a", "b", "c", "d", "e", "1", "2", "3", "4", "5"}:
                    labels.append(label)
        for sequence in (("a", "b", "c", "d"), ("1", "2", "3", "4")):
            for position in range(max(0, len(labels) - 3)):
                if labels[position:position + 4] == list(sequence):
                    return True
            for position in range(max(0, len(labels) - 2)):
                if labels[position:position + 3] == list(sequence[:3]):
                    return True
    return False


def _is_question_start(line: str, body: str, lines: list[str], line_index: int) -> bool:
    if re.match(r"^\s*(?:#{1,6}\s*)?(?:\*\*|__|[*_`])?\s*Q(?:uestion)?\b", line, re.I):
        return True
    if "?" in body or QUESTION_CUE_RE.search(body):
        return True
    if re.search(r"(?:_{2,}|\.{3,}|…{2,})", body):
        return True
    return _has_local_option_sequence(lines, line_index)


def discover(folder: Path, patterns=("*.md", "*.markdown")) -> list[Path]:
    if not folder.exists():
        return []
    result = {p.resolve() for pattern in patterns for p in folder.rglob(pattern) if p.is_file()}
    return sorted(result, key=lambda p: str(p).casefold())


def read_markdown(path: Path, preferred="utf-8-sig") -> tuple[str, str | None]:
    errors = []
    for encoding in (preferred, "utf-8", "cp1252", "latin-1"):
        try:
            return path.read_text(encoding=encoding), None if not errors else f"Decoded with fallback {encoding}; attempted: {', '.join(errors)}"
        except (UnicodeDecodeError, LookupError) as exc:
            errors.append(f"{encoding}: {exc}")
    return path.read_text(encoding="utf-8", errors="replace"), "Replacement decoding used: " + "; ".join(errors)


def file_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def parse_markdown(path: Path, text: str, decode_warning: str | None = None) -> tuple[list[dict], list[dict]]:
    digest = file_hash(text)
    answer_runs = _answer_key_runs(text)
    answer_spans = [(run[0].start(), run[-1].end()) for run in answer_runs]
    masked_chars = list(text)
    for start, end in answer_spans:
        for index in range(start, end):
            if masked_chars[index] not in "\r\n":
                masked_chars[index] = " "
    parse_text = "".join(masked_chars)
    lines = parse_text.splitlines(keepends=True)
    starts, offset, page, heading = [], 0, None, None
    metadata = {"exam": None, "subject": None, "chapter": None, "topic": None, "session": None, "paper": None, "shift": None, "set": None}
    metadata_at_offset = []
    in_match_list_items = False
    for idx, raw in enumerate(lines):
        line = raw.rstrip("\r\n")
        marker = PAGE_RE.search(line)
        if marker:
            page = int(marker.group(1))
        if line.startswith("#") and not Q_RE.match(line):
            heading = line.lstrip("# ").strip() or heading
        elif (line.strip() and not Q_RE.match(line) and not OPT_RE.match(line)
              and "|" not in line and not line.lstrip().startswith("<")
              and line.strip().upper() == line.strip()
              and re.fullmatch(r"[A-Z][A-Z0-9 &,'()/:-]{2,79}", line.strip())
              and line.strip() not in {"NOT TO SCALE", "CONTINUED", "ANSWER KEY"}):
            heading = line.strip().title()
        metadata_match = re.match(r"\s*(exam|subject|chapter|topic|session|paper|shift|set)\s*:\s*(.+?)\s*$", line, re.I)
        if metadata_match:
            metadata[metadata_match.group(1).casefold()] = metadata_match.group(2).strip()
            metadata_at_offset.append((offset, dict(metadata)))
        match = Q_RE.match(line)
        in_answer_section = bool(heading and re.search(r"answer\s*key|answers?", heading, re.I))
        question_body_is_answer = bool(re.match(r"^(?:ans\.?|answer|correct answer)\s*[:.-]", match.group("body"), re.I)) if match else False
        body = (match.group("body") or "").strip() if match else ""
        explicit_question_marker = bool(re.match(r"^\s*(?:#{1,6}\s*)?(?:\*\*|__|[*_`])?\s*Q(?:uestion)?\b", line, re.I))
        if match and (body or explicit_question_marker) and _is_question_start(line, body, lines, idx) and not ANSWER_RE.match(line) and not question_body_is_answer and not in_answer_section and not in_match_list_items:
            starts.append((idx, offset, int(match.group("qnum") or match.group("num")), page, heading, (match.group("body") or "").strip()))
        if re.search(r"\bList\s+I{1,2}\b", line, re.I) and not re.search(r"\bCodes\b", line, re.I):
            in_match_list_items = True
        if re.search(r"\bCodes\b", line, re.I):
            in_match_list_items = False
        offset += len(raw)
    records = []
    for i, (line_idx, start, number, source_page, heading_at_start, first) in enumerate(starts):
        active_metadata = {}
        for metadata_offset, metadata_values in metadata_at_offset:
            if metadata_offset <= start:
                active_metadata = metadata_values
            else:
                break
        end = starts[i + 1][1] if i + 1 < len(starts) else len(parse_text)
        for answer_start, _answer_end in answer_spans:
            if start < answer_start < end:
                end = answer_start
                break
        answer_heading = re.search(r"(?im)^\s*#{1,6}\s*(?:answer\s*key|answers?)\b[^\r\n]*", parse_text[start:end])
        if answer_heading:
            end = start + answer_heading.start()
        raw_segment = parse_text[start:end].strip()
        source_quote = text[start:end].strip()
        has_table = any("|" in ln and ln.count("|") >= 2 for ln in raw_segment.splitlines())
        has_image_ref = bool(re.search(r"!\[[^\]]*\]\([^)]*\)|<img\b", raw_segment, re.I))
        segment_lines = raw_segment.splitlines()
        stem_parts, options, answers, explanation = [], [], [], []
        active = "stem"
        in_answer_section = False
        in_match_list_items = False
        format_warnings = []
        local_page = source_page
        for source_line in segment_lines:
            if _has_repeated_inline_option_grid(source_line):
                warning = "Inline text repeats option labels; statement lists and answer choices may be ambiguous."
                if warning not in format_warnings:
                    format_warnings.append(warning)
            initial_option = OPT_RE.match(source_line)
            initial_label = next((group for group in initial_option.groups()[:3] if group is not None), "").casefold() if initial_option else ""
            if active == "options" and len(options) >= 4 and initial_label == "a":
                format_warnings.append("A new option A appears after four options; it may belong to a question with a missing number or stem.")
                break
            if in_match_list_items:
                stem_parts.append(source_line)
                if re.search(r"\bCodes\b", source_line, re.I):
                    in_match_list_items = False
                continue
            for ln in _split_inline_options(source_line):
                question_match = Q_RE.match(ln)
                if question_match:
                    question_stem = (question_match.group("body") or "").strip()
                    if question_stem:
                        stem_parts.append(question_stem)
                    continue
                if ln.lstrip().startswith("#") and re.search(r"answer\s*key|answers?", ln, re.I):
                    in_answer_section = True
                    continue
                if in_answer_section:
                    continue
                page_match = PAGE_RE.search(ln)
                if page_match:
                    local_page = int(page_match.group(1))
                    continue
                if re.search(r"!\[[^\]]*\]\([^)]+\)|<img\b", ln, re.I) or ln.strip().upper() == "NOT TO SCALE":
                    continue
                opt = OPT_RE.match(ln)
                ans = ANSWER_RE.match(ln)
                option_label = next((g for g in opt.groups()[:3] if g is not None), "").casefold() if opt else ""
                if opt and (active == "options" or option_label in {"a", "b", "c", "d", "e", "1", "2", "3", "4", "5", "i", "ii", "iii", "iv"}):
                    active = "options"
                    label = next(g for g in opt.groups()[:3] if g is not None)
                    options.append({"label": label, "text": (opt.group(4) or "").strip()})
                elif ans:
                    active = "answer"
                    answers.append(ans.group(1).strip())
                elif re.match(r"^\s*(?:explanation|solution)\s*[:.-]", ln, re.I):
                    active = "explanation"
                    explanation.append(re.sub(r"^\s*(?:explanation|solution)\s*[:.-]\s*", "", ln, flags=re.I))
                elif active == "stem":
                    stem_parts.append(ln)
                elif active == "options" and options:
                    options[-1]["text"] += "\n" + ln
                elif active == "answer" and answers:
                    answers[-1] += " " + ln
                elif active == "explanation":
                    explanation.append(ln)
            if re.search(r"\bList\s+I{1,2}\b", source_line, re.I) and not re.search(r"\bCodes\b", source_line, re.I):
                in_match_list_items = True
        qtext = "\n".join(stem_parts).strip()
        qtext = Q_RE.sub(lambda m: (m.group("body") or "").strip(), qtext, count=1)
        if any("repeats option labels" in warning for warning in format_warnings):
            preserved_lines = []
            for raw_line in raw_segment.splitlines():
                if re.search(r"!\[[^\]]*\]\([^)]+\)|<img\b", raw_line, re.I) or raw_line.strip().upper() == "NOT TO SCALE":
                    continue
                line_match = Q_RE.match(raw_line)
                preserved_lines.append((line_match.group("body") or "").strip() if line_match else raw_line)
            qtext = "\n".join(line for line in preserved_lines if line).strip()
            options = []
        stable = hashlib.sha256(f"{digest}:{start}:{number}".encode()).hexdigest()[:24]
        year = None
        metadata_text = f"{path.stem} {heading_at_start or ''}"
        year_match = YEAR_RE.search(metadata_text)
        if year_match:
            year = int(year_match.group(1))
        record = {
            "record_id": stable, "exam": {"raw_name": active_metadata.get("exam"), "canonical_name": None, "exam_id": None, "year": year, "session": active_metadata.get("session"), "paper": active_metadata.get("paper"), "shift": active_metadata.get("shift"), "set": active_metadata.get("set")},
            "subject": {"raw_name": active_metadata.get("subject"), "canonical_name": None, "subject_id": None},
            "chapter": {"raw_name": active_metadata.get("chapter"), "canonical_name": None, "chapter_id": None},
            "topic": {"raw_name": active_metadata.get("topic"), "canonical_name": None, "topic_id": None},
            "question_text": qtext, "options": options, "correct_answers": answers,
            "question_type": "single_choice" if options else "unknown", "explanation": "\n".join(explanation).strip() or None,
            "language": None, "source": {"file_path": str(path), "file_hash": digest, "start_offset": start,
              "end_offset": end, "heading": heading_at_start, "page": local_page, "original_question_number": str(number),
              "answer_key_source": str(path) if answers else None, "source_quote": source_quote,
              "unresolved_table": has_table, "unresolved_image_reference": has_image_ref},
            "mapping_status": "unresolved", "extraction_status": "needs_review", "answer_verification_status": "source_answer" if answers else "not_verified",
            "review_reasons": ([decode_warning] if decode_warning else []) + format_warnings, "mapping_version": "", "duplicate_candidates": [], "schema_version": "1.0",
        }
        records.append(record)
    # Explicit answer-key boxes are the primary source of truth. Per-question
    # solution labels remain available as a lower-confidence fallback.
    answer_keys = _explicit_answer_key_blocks(text)
    key_offset = 0
    answer_heading = None
    for line in text.splitlines(keepends=True):
        clean_line = line.rstrip("\r\n")
        plain_heading = clean_line.strip().lstrip("#").strip().strip("*_").strip().rstrip(":")
        is_heading = clean_line.lstrip().startswith("#")
        if re.match(r"(?:answer\s*key|answers?|solutions?)\b", plain_heading, re.I):
            answer_heading = plain_heading
        elif is_heading:
            answer_heading = None

        searchable = re.sub(r"\\text\s*\{([^{}]*)\}", r"\1", clean_line, flags=re.I)
        searchable = re.sub(r"[\\${}]", "", searchable)
        direct = list(LABELED_ANSWER_RE.finditer(searchable))
        for match in direct:
            answer_keys.append({"question_number": match.group("number"), "answer": match.group("answer").upper(),
                                "page": None, "section": answer_heading or "Inline labeled solution",
                                "source_file": str(path), "source_offset": key_offset + match.start(),
                                "match_type": "inline_solution", "answer_key_block": None})
        # Common source layout: `1. Ans. (b)`; this appears inside extracted
        # HTML table cells as well as on standalone Markdown lines.
        for match in NUMBERED_LABELED_ANSWER_RE.finditer(searchable):
            answer_keys.append({"question_number": match.group("number"), "answer": match.group("answer").upper(),
                                "page": None, "section": answer_heading or "Inline labeled solution",
                                "source_file": str(path), "source_offset": key_offset + match.start(),
                                "match_type": "inline_solution", "answer_key_block": None})
        key_offset += len(line)
    return records, answer_keys
