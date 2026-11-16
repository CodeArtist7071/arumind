from __future__ import annotations

import hashlib
import json
import logging
import re
import unicodedata
from pathlib import Path

from pyq_pipeline.llm import OpenRouterAdapter
from pyq_pipeline.parser import file_hash, parse_markdown, read_markdown
from pyq_pipeline.validation import validate_record

log = logging.getLogger(__name__)


def _map_record(record, registry):
    statuses = {}
    for key, kind, id_field in (("subject", "subjects", "subject_id"), ("chapter", "chapters", "chapter_id")):
        raw = record[key].get("raw_name")
        result = registry.resolve(kind, raw, record["subject"].get("subject_id") if key == "chapter" else None)
        record[key].update({"canonical_name": result["canonical_name"], id_field: result["id"]})
        if raw:
            statuses[key] = result["status"]
            if result["status"] != "mapped":
                record["review_reasons"].append(f"{key} mapping {result['status']}: {raw}")
                if record.get("_allow_mapping_proposals", True):
                    registry.propose(kind, raw, record["source"].get("file_path"))
            record.setdefault("mapping_audit", []).append({"kind": kind, **result})
        elif key == "subject":
            statuses[key] = "unresolved"
            record["review_reasons"].append("subject mapping unresolved: no Subject label found")
    record["mapping_version"] = registry.version
    chapter_status = statuses.get("chapter", "not_provided")
    required_statuses = [statuses.get("subject", "unresolved")]
    if chapter_status != "not_provided":
        required_statuses.append(chapter_status)
    if all(status == "mapped" for status in required_statuses):
        record["mapping_status"] = "mapped"
    elif "ambiguous" in required_statuses:
        record["mapping_status"] = "ambiguous"
    else:
        record["mapping_status"] = "unresolved"


def _normalize_question(value):
    value = unicodedata.normalize("NFKC", value or "").casefold()
    return re.sub(r"[^\w]+", " ", value).strip()


def _duplicate_candidates(store):
    seen = {}
    for r in store.iter_records():
        option_signature = " ".join(f"{_normalize_question(o.get('label'))}:{_normalize_question(o.get('text'))}" for o in r.get("options", []))
        key = _normalize_question(r.get("question_text")) + " || " + option_signature
        if len(key) < 25:
            continue
        current = (r["record_id"], r.get("source", {}).get("file_hash"), r.get("exam", {}).get("canonical_name"), r.get("exam", {}).get("year"))
        for prior in seen.get(key, []):
            same_source = current[1] == prior[1]
            same_exam_year = current[2] is not None and current[2] == prior[2] and current[3] == prior[3]
            if same_source or same_exam_year:
                r.setdefault("duplicate_candidates", []).append(prior[0])
                r.setdefault("review_reasons", []).append("Potential duplicate question; review before merging.")
                earlier = store.get_record(prior[0])
                if earlier:
                    earlier.setdefault("duplicate_candidates", []).append(r["record_id"])
                    earlier.setdefault("review_reasons", []).append("Potential duplicate question; review before merging.")
                    store.update_record(earlier)
        if r.get("duplicate_candidates"):
            store.update_record(r)
        seen.setdefault(key, []).append(current)


def _match_answer_keys(store):
    by_context = {}
    for r in store.iter_records():
        source = r["source"]
        number = str(source.get("original_question_number") or "")
        path = str(source.get("file_path") or "")
        context = (Path(path).stem.casefold(), r.get("exam", {}).get("year"), number)
        by_context.setdefault(context, []).append(r["record_id"])
    for key in store.iter_answer_keys():
        number = str(key.get("question_number") or "")
        key_stem = re.sub(r"(?:answer\s*key|answers?|questions?|question\s*paper|paper)", "", Path(key.get("source_file", "")).stem.casefold()).strip(" _-.")
        # Number alone is unsafe: require a unique question within the same source stem.
        candidates = [r for (stem, _year, qn), group in by_context.items()
                      if qn == number and (re.sub(r"(?:answer\s*key|answers?|questions?|question\s*paper|paper)", "", stem).strip(" _-.") == key_stem
                                           or (key_stem and (stem.startswith(key_stem) or key_stem.startswith(stem)))) for r in group]
        if len(candidates) != 1:
            continue
        record = store.get_record(candidates[0])
        answer = str(key.get("answer") or "").strip()
        prior = record.get("correct_answers") or []
        record.setdefault("source", {})["answer_key_source"] = key.get("source_file")
        record["source"]["answer_key_quote"] = answer
        if prior and {x.casefold() for x in prior} != {answer.casefold()}:
            record["answer_verification_status"] = "conflict"
            record["review_reasons"].append(f"Answer conflict: question source={prior}; answer key={answer}")
        elif not prior:
            record["correct_answers"] = [answer]
            record["answer_verification_status"] = "answer_key_matched"
        store.update_record(record)


def process_files(files, store, registry, settings, use_llm=False, retry_failed=False, dry_run=False, on_file=None):
    if use_llm and settings.llm_provider.casefold() != "openrouter":
        raise ValueError(f"Unsupported LLM provider {settings.llm_provider!r}; configured adapters: openrouter")
    llm = OpenRouterAdapter(settings) if use_llm else None
    counts = {"processed": 0, "skipped": 0, "failed": 0, "export_failed": 0, "questions": 0}
    for path in files:
        digest = ""
        try:
            text, warning = read_markdown(path, settings.encoding)
            source_digest = file_hash(text)
            signature_data = {"source": source_digest, "schema": "1.0", "mapping": registry.version,
                              "mapping_policy": "subject_then_chapter_v1",
                              "parser_policy": "inline-options-unheaded-answer-keys_v1",
                              "llm_enabled": bool(llm), "llm_model": settings.llm_model if llm else None,
                              "chunk_chars": settings.chunk_chars, "overlap_chars": settings.overlap_chars}
            digest = hashlib.sha256(json.dumps(signature_data, sort_keys=True).encode()).hexdigest()
            old = store.file_status(path)
            if old and old.get("hash") == digest and old.get("status") == "complete" and not retry_failed:
                counts["skipped"] += 1
                continue
            if old and old.get("hash") == digest and old.get("status") == "failed" and not retry_failed:
                counts["skipped"] += 1
                log.warning("Skipping previously failed file %s; pass --retry-failed or use resume", path)
                continue
            records, keys = parse_markdown(path, text, warning)
            # Optional rescue pass is deliberately bounded and only fills deterministic-parser gaps.
            if llm:
                width = min(settings.chunk_chars, 2400)
                step = max(500, width - min(settings.overlap_chars, width // 4))
                known_offsets = {r["source"].get("start_offset") for r in records}
                prior_memory = "\n".join(f"{r['source'].get('original_question_number')}: {r['question_text'][:240]}" for r in records[-10:])
                for start in range(0, len(text), step):
                    owned = text[start:start + width]
                    if not re.search(r"\?", owned):
                        continue
                    if any(start <= offset < start + len(owned) for offset in known_offsets if offset is not None):
                        continue
                    if not re.search(r"(?im)^\s*(?:\([A-Za-z0-9]+\)|[A-D][.)])\s+", owned) and len(re.findall(r"\?", owned)) < 2:
                        continue
                    preceding = text[max(0, start - settings.overlap_chars):start]
                    context = f"PREVIOUS SOURCE CONTEXT:\n{preceding}\n\nRECENT EXTRACTED QUESTION MEMORY (do not emit again):\n{prior_memory}"
                    for item in llm.extract(owned, context):
                        qtext = str(item.get("question_text") or "").strip()
                        quote = str(item.get("source_quote") or "").strip()
                        options = item.get("options", [])
                        answers = item.get("correct_answers", [])
                        if not qtext or not quote or quote not in owned:
                            continue
                        if not isinstance(options, list) or any(not isinstance(o, dict) or not isinstance(o.get("label"), str) or not isinstance(o.get("text"), str) for o in options):
                            continue
                        if not isinstance(answers, list) or any(not isinstance(answer, str) for answer in answers):
                            continue
                        start_offset = start + owned.find(quote)
                        rid = hashlib.sha256(f"{source_digest}:{start_offset}:llm".encode()).hexdigest()[:24]
                        item_type = item.get("question_type", "unknown")
                        if item_type not in {"single_choice", "multiple_select", "true_false", "numerical", "descriptive", "unknown"}:
                            item_type = "unknown"
                        records.append({"record_id": rid, "exam": {"raw_name": None, "canonical_name": None, "exam_id": None, "year": None, "session": None, "paper": None, "shift": None, "set": None},
                            "subject": {"raw_name": None, "canonical_name": None, "subject_id": None}, "chapter": {"raw_name": None, "canonical_name": None, "chapter_id": None}, "topic": {"raw_name": None, "canonical_name": None, "topic_id": None},
                            "question_text": qtext, "options": options, "correct_answers": answers, "question_type": item_type,
                            "explanation": item.get("explanation") if isinstance(item.get("explanation"), str) else None, "language": None, "source": {"file_path": str(path), "file_hash": source_digest, "start_offset": start_offset, "end_offset": start_offset + len(quote), "heading": None, "page": None, "original_question_number": str(item.get("question_number")) if item.get("question_number") is not None else None, "answer_key_source": None, "source_quote": quote},
                            "mapping_status": "unresolved", "extraction_status": "needs_review", "answer_verification_status": "source_answer" if answers else "not_verified", "review_reasons": ["LLM-assisted extraction; review source grounding."], "mapping_version": registry.version, "duplicate_candidates": [], "schema_version": "1.0"})
                        known_offsets.add(start_offset)
                        prior_memory = (prior_memory + f"\n{item.get('question_number')}: {qtext[:240]}").strip()
            for record in records:
                record["source"]["file_hash"] = source_digest
                record["_allow_mapping_proposals"] = not dry_run
                _map_record(record, registry)
                record.pop("_allow_mapping_proposals", None)
                if record.get("options"):
                    normalized_type = str(record.get("question_type", "")).casefold().replace(" ", "_")
                    if re.search(r"\b(select|choose)\s+(?:all|the\s+correct\s+statements)", record["question_text"], re.I):
                        normalized_type = "multiple_select"
                    elif len(record["options"]) == 2 and {str(o.get("text", "")).strip().casefold() for o in record["options"]} == {"true", "false"}:
                        normalized_type = "true_false"
                    elif normalized_type not in {"multiple_select", "true_false"}:
                        normalized_type = "single_choice"
                    record["question_type"] = normalized_type
                elif record.get("correct_answers") and all(re.fullmatch(r"[-+]?\d+(?:\.\d+)?", str(x).strip()) for x in record["correct_answers"]):
                    record["question_type"] = "numerical"
                elif record.get("question_type") not in {"descriptive", "unknown"}:
                    record["question_type"] = "unknown"
                issues = validate_record(record, settings.max_cell_chars)
                record["validation_issues"] = issues
                if issues:
                    record["review_reasons"].extend(i["message"] for i in issues if i["severity"] in ("warning", "error"))
                record["extraction_status"] = "needs_review" if record["review_reasons"] or not record["question_text"] else "extracted"
            if not dry_run:
                store.save_records(records, keys, path, digest)
            counts["processed"] += 1
            counts["questions"] += len(records)
            log.info("%s: %d candidate questions", path, len(records))
            if not dry_run and on_file:
                try:
                    on_file(path, len(records))
                except Exception:
                    counts["export_failed"] += 1
                    log.exception("Progress export failed after processing %s; SQLite checkpoint is safe", path)
        except Exception as exc:
            counts["failed"] += 1
            log.exception("Failed processing %s", path)
            if not dry_run:
                store.set_file(path, digest, "failed", str(exc))
    if not dry_run:
        _match_answer_keys(store)
        _duplicate_candidates(store)
    return counts
