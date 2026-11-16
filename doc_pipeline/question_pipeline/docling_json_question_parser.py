import argparse
import json
import logging
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DoclingJsonQuestionParser")

BASE_DIR = Path(__file__).resolve().parent
JSON_OUTPUT_DIR = BASE_DIR / "docling_json_outputs"
STRUCTURED_OUTPUT_DIR = BASE_DIR / "structured_questions"
PARSER_VERSION = 2

QUESTION_KEY_PATTERN = re.compile(
    r"^\s*(?:q(?:uestion)?\s*[.:-]?\s*)?(?P<number>\d{1,4})"
    r"(?:\s*[.\-:/]?\s*(?:\(\s*(?P<paren>[a-z])\s*\)|(?P<plain>[a-z])))?"
    r"\s*[.)]?\s*$",
    re.IGNORECASE,
)
INLINE_QUESTION_PATTERN = re.compile(
    r"^\s*(?:q(?:uestion)?\s*[.:-]?\s*)?(?P<key>\d{1,4}"
    r"(?:\s*[.\-:/]?\s*(?:\(\s*[a-z]\s*\)|[a-z]))?\s*[.)]?)\s+"
    r"(?P<text>.+)$",
    re.IGNORECASE,
)
OPTION_PATTERN = re.compile(
    r"(?:^|\s)(?:\(\s*(?P<paren>[a-h])\s*\)|\[\s*(?P<bracket>[a-h])\s*\]|"
    r"(?P<plain>[a-h])\s*[.)])\s*"
    r"(?P<value>.*?)(?=(?:\s+(?:\(\s*[a-h]\s*\)|\[\s*[a-h]\s*\]|[a-h]\s*[.)])\s*)|$)",
    re.IGNORECASE,
)
ANSWER_PAIR_PATTERN = re.compile(
    r"(?<!\d)(?P<key>\d{1,4}(?:\s*(?:\(\s*[a-h]\s*\)|[.\-:/]\s*[a-h](?=\s|[.)])|[a-h](?=\s)))?)"
    r"\s*[.):-]?\s*(?:\(\s*(?P<paren>[a-hA-H])\s*\)|(?P<plain>[a-hA-H])\s*[.)]?(?=\s|$))",
)
ANSWER_HEADING_PATTERN = re.compile(r"\b(answer(?:s|\s*key)?|solutions?|correct\s+answers?)\b", re.I)
NOISE_PATTERN = re.compile(r"^(?:page\s*)?\d{1,4}$|copyright|all rights reserved|www\.", re.I)


def clean_text(value: Any) -> str:
    text = str(value or "").replace("/.notdef", " ").replace("□", " ")
    text = re.sub(r"�+", "_____", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_heading(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", clean_text(value).lower()).strip()


@dataclass(frozen=True)
class QuestionKey:
    number: int
    suffix: str = ""

    @property
    def display(self) -> str:
        return f"{self.number}({self.suffix})" if self.suffix else str(self.number)

    @property
    def normalized(self) -> str:
        return f"{self.number}{self.suffix}"


def parse_question_key(value: str) -> Optional[QuestionKey]:
    match = QUESTION_KEY_PATTERN.fullmatch(clean_text(value))
    if not match:
        return None
    suffix = (match.group("paren") or match.group("plain") or "").lower()
    return QuestionKey(int(match.group("number")), suffix)


def get_bbox(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    provenance = item.get("prov") or []
    bbox = provenance[0].get("bbox") if provenance else None
    return bbox if isinstance(bbox, dict) else None


def bbox_top(item: Dict[str, Any], page_height: float) -> float:
    bbox = get_bbox(item) or {}
    origin = str(bbox.get("coord_origin", "BOTTOMLEFT")).upper()
    return float(bbox.get("t", 0)) if origin == "TOPLEFT" else page_height - float(bbox.get("t", page_height))


def bbox_left(item: Dict[str, Any]) -> float:
    return float((get_bbox(item) or {}).get("l", 0))


def bbox_width(item: Dict[str, Any]) -> float:
    bbox = get_bbox(item) or {}
    return max(0.0, float(bbox.get("r", 0)) - float(bbox.get("l", 0)))


def element_ref(item: Dict[str, Any], fallback: str) -> str:
    return str(item.get("self_ref") or fallback)


def extract_options(text: str) -> Dict[str, str]:
    options: Dict[str, str] = {}
    for match in OPTION_PATTERN.finditer(clean_text(text)):
        label = (match.group("paren") or match.group("bracket") or match.group("plain")).upper()
        value = clean_text(match.group("value"))
        if value:
            options[label] = value
    return options


def extract_answer_pairs(text: str) -> List[Tuple[QuestionKey, str, str]]:
    pairs = []
    for match in ANSWER_PAIR_PATTERN.finditer(clean_text(text)):
        key = parse_question_key(match.group("key"))
        if key:
            option = (match.group("paren") or match.group("plain")).upper()
            pairs.append((key, option, match.group(0).strip()))
    return pairs


def table_to_text(table: Dict[str, Any]) -> str:
    rows = []
    for row in table.get("data", {}).get("grid") or []:
        values = [clean_text(cell.get("text")) for cell in row]
        if any(values):
            rows.append(" | ".join(values))
    return " ; ".join(rows)


def is_subject_heading(text: str) -> bool:
    if not text or len(text) > 90:
        return False
    letters = [c for c in text if c.isalpha()]
    return len(letters) >= 4 and sum(c.isupper() for c in letters) / len(letters) >= 0.85


def heading_similarity(left: str, right: str) -> float:
    a, b = normalize_heading(left), normalize_heading(right)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


class DoclingJsonQuestionParser:
    def __init__(self, document_dir: Path):
        self.document_dir = document_dir
        self.pages_dir = document_dir / "pages"
        self.manifest = json.loads((document_dir / "manifest.json").read_text(encoding="utf-8"))
        self.document_id = self.manifest.get("document_id", document_dir.name)
        self.subject = ""
        self.chapter = ""
        self.section_id = 0
        self.answer_block_id = 0
        self.in_answer_block = False
        self.current: Optional[Dict[str, Any]] = None
        self.questions: List[Dict[str, Any]] = []
        self.answer_entries: List[Dict[str, Any]] = []
        self.page_warnings: Dict[int, List[str]] = defaultdict(list)
        self.repeated_marginal_text: set[str] = set()

    def _load_pages(self) -> List[Tuple[Path, Dict[str, Any]]]:
        completed = {
            int(page["pdf_page"])
            for page in self.manifest.get("pages", [])
            if page.get("status") == "completed"
        }
        loaded = []
        for path in sorted(self.pages_dir.glob("page_*.json")):
            number = int(path.stem.split("_")[-1])
            if number in completed:
                loaded.append((path, json.loads(path.read_text(encoding="utf-8"))))
        return loaded

    def _detect_repeated_margins(self, pages: List[Tuple[Path, Dict[str, Any]]]) -> None:
        occurrences: Dict[str, set[int]] = defaultdict(set)
        for _, data in pages:
            page_number = int(data["pdf_page"])
            height = float(data.get("page_height") or 0)
            for item in data.get("docling_document", {}).get("texts") or []:
                text = clean_text(item.get("text"))
                if not text or len(text) > 120 or not get_bbox(item) or height <= 0:
                    continue
                top = bbox_top(item, height)
                if top <= height * 0.09 or top >= height * 0.91:
                    occurrences[normalize_heading(text)].add(page_number)
        self.repeated_marginal_text = {
            text for text, page_numbers in occurrences.items()
            if text and len(page_numbers) >= 3
        }

    def _is_noise(self, item: Dict[str, Any], page_height: float) -> bool:
        text = clean_text(item.get("text"))
        normalized = normalize_heading(text)
        if not text:
            return True
        if NOISE_PATTERN.search(text) and get_bbox(item):
            top = bbox_top(item, page_height)
            if top <= page_height * 0.12 or top >= page_height * 0.88:
                return True
        return normalized in self.repeated_marginal_text

    def _ordered_texts(
        self,
        texts: List[Dict[str, Any]],
        width: float,
        height: float,
        reading_order: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        # Prefer the explicit semantic sequence exported from
        # DoclingDocument.iterate_items(). Unknown elements retain their source
        # order after all explicitly ordered elements.
        order = {
            str(item.get("element_ref")): int(item["reading_order_index"])
            for item in (reading_order or {}).get("items") or []
            if item.get("element_ref") and item.get("reading_order_index") is not None
        }
        if not order:
            return texts
        original = {id(item): index for index, item in enumerate(texts)}
        return sorted(
            texts,
            key=lambda item: (
                order.get(element_ref(item, ""), len(order) + original[id(item)]),
                original[id(item)],
            ),
        )

    def _legacy_two_column_order(self, texts: List[Dict[str, Any]], width: float, height: float) -> List[Dict[str, Any]]:
        """Retained as an explicit fallback for future document profiles."""
        positioned = [item for item in texts if get_bbox(item)]
        if len(positioned) < 4 or width <= 0:
            return texts
        full_width = {id(item) for item in positioned if bbox_width(item) >= width * 0.62}
        left = [item for item in positioned if id(item) not in full_width and bbox_left(item) < width * 0.48]
        right = [item for item in positioned if id(item) not in full_width and bbox_left(item) >= width * 0.48]
        two_columns = len(left) >= 3 and len(right) >= 3
        original_index = {id(item): index for index, item in enumerate(texts)}
        if not two_columns:
            return sorted(texts, key=lambda item: (bbox_top(item, height), bbox_left(item), original_index[id(item)]))

        # Full-width elements retain their vertical position. Column elements are
        # read left-to-right within the vertical band between full-width anchors.
        anchors = sorted((bbox_top(item, height), item) for item in texts if id(item) in full_width)
        bands: List[Tuple[float, float]] = []
        boundaries = [-1.0] + [top for top, _ in anchors] + [height + 1.0]
        for index in range(len(boundaries) - 1):
            bands.append((boundaries[index], boundaries[index + 1]))
        ordered: List[Dict[str, Any]] = []
        used: set[int] = set()
        for low, high in bands:
            band_items = [item for item in texts if id(item) not in full_width and low < bbox_top(item, height) < high]
            ordered.extend(sorted([x for x in band_items if bbox_left(x) < width * 0.48], key=lambda x: (bbox_top(x, height), bbox_left(x))))
            ordered.extend(sorted([x for x in band_items if bbox_left(x) >= width * 0.48], key=lambda x: (bbox_top(x, height), bbox_left(x))))
            used.update(id(x) for x in band_items)
            anchor = next((item for top, item in anchors if abs(top - high) < 0.01), None)
            if anchor:
                ordered.append(anchor)
                used.add(id(anchor))
        ordered.extend(item for item in texts if id(item) not in used)
        return ordered

    def _new_question(self, key: QuestionKey, text: str, page: int, item: Dict[str, Any], page_profile: str) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "subject": self.subject,
            "chapter": self.chapter,
            "section_id": self.section_id,
            "question_number": key.number,
            "question_suffix": key.suffix,
            "question_key": key.display,
            "normalized_question_key": key.normalized,
            "question_text_parts": [clean_text(text)] if clean_text(text) else [],
            "options": {},
            "pdf_page_start": page,
            "pdf_page_end": page,
            "start_bbox": get_bbox(item),
            "table_texts": [],
            "source_elements": 1,
            "provenance": {"pages": [page], "element_refs": [element_ref(item, "")], "bounding_boxes": [get_bbox(item)] if get_bbox(item) else [], "extraction_profiles": [page_profile] if page_profile else []},
            "parser_warnings": list(self.page_warnings.get(page, [])),
        }

    def _add_provenance(self, question: Dict[str, Any], page: int, item: Dict[str, Any], profile: str) -> None:
        provenance = question["provenance"]
        if page not in provenance["pages"]:
            provenance["pages"].append(page)
        ref = element_ref(item, "")
        if ref and ref not in provenance["element_refs"]:
            provenance["element_refs"].append(ref)
        bbox = get_bbox(item)
        if bbox:
            provenance["bounding_boxes"].append(bbox)
        if profile and profile not in provenance["extraction_profiles"]:
            provenance["extraction_profiles"].append(profile)
        for warning in self.page_warnings.get(page, []):
            if warning not in question["parser_warnings"]:
                question["parser_warnings"].append(warning)

    def _finish_current(self) -> None:
        if not self.current:
            return
        question = self.current
        question["question_text"] = clean_text(" ".join(question.pop("question_text_parts")))
        question["table_text"] = clean_text(" ".join(question.pop("table_texts")))
        question.pop("start_bbox", None)
        self.questions.append(question)
        self.current = None

    def _record_answers(self, pairs: Iterable[Tuple[QuestionKey, str, str]], page: int) -> None:
        if not self.in_answer_block:
            self.answer_block_id += 1
            self.in_answer_block = True
        for key, option, raw in pairs:
            self.answer_entries.append({
                "subject": self.subject,
                "chapter": self.chapter,
                "section_id": self.section_id,
                "answer_block_id": self.answer_block_id,
                "question_number": key.number,
                "question_suffix": key.suffix,
                "normalized_question_key": key.normalized,
                "correct_option": option,
                "answer_page": page,
                "raw_answer": raw,
            })

    def _handle_heading(self, text: str, item: Dict[str, Any], page_width: float) -> bool:
        if ANSWER_HEADING_PATTERN.search(text):
            self._finish_current()
            self.answer_block_id += 1
            self.in_answer_block = True
            return True
        if is_subject_heading(text):
            self._finish_current()
            if normalize_heading(text) != normalize_heading(self.subject):
                self.subject = text
                self.chapter = ""
                self.section_id += 1
            self.in_answer_block = False
            return True
        raw_heading = str(item.get("orig") or item.get("text") or "")
        visually_prominent = page_width > 0 and bbox_width(item) >= page_width * 0.40
        damaged_prominent = "/.notdef" in raw_heading and page_width > 0 and bbox_width(item) >= page_width * 0.30
        if (
            (visually_prominent or damaged_prominent)
            and 2 <= len(text.split()) <= 14
            and len(text) <= 100
            and not parse_question_key(text)
        ):
            self._finish_current()
            self.chapter = text
            self.section_id += 1
            self.in_answer_block = False
            return True
        return False

    def _attach_tables(self, page_questions: List[Dict[str, Any]], tables: List[Dict[str, Any]], page_height: float) -> None:
        candidates = page_questions or ([self.current] if self.current else [])
        for table in tables:
            text = table_to_text(table)
            table_bbox = get_bbox(table)
            if not text or not table_bbox or not candidates:
                continue
            table_left = bbox_left(table)
            table_top = bbox_top(table, page_height)
            ranked = []
            for question in candidates:
                bbox = question.get("start_bbox") or {}
                q_left = float(bbox.get("l", 0))
                origin = str(bbox.get("coord_origin", "BOTTOMLEFT")).upper()
                q_top = float(bbox.get("t", 0)) if origin == "TOPLEFT" else page_height - float(bbox.get("t", page_height))
                horizontal = abs(q_left - table_left)
                vertical = table_top - q_top
                if horizontal <= 120 and vertical >= -20:
                    ranked.append((horizontal * 0.4 + abs(vertical), question))
            if ranked:
                target = min(ranked, key=lambda pair: pair[0])[1]
                if "table_texts" in target:
                    target["table_texts"].append(text)
                else:
                    target["table_text"] = clean_text(
                        f"{target.get('table_text', '')} {text}"
                    )

    def _process_page(self, data: Dict[str, Any]) -> None:
        page = int(data["pdf_page"])
        document = data.get("docling_document", {})
        docling_pages = document.get("pages") or {}
        docling_page = next(iter(docling_pages.values()), {}) if isinstance(docling_pages, dict) else {}
        docling_size = docling_page.get("size") or {}
        width = float(docling_size.get("width") or data.get("page_width") or 0)
        height = float(docling_size.get("height") or data.get("page_height") or 0)
        profile = data.get("extraction_detection", {}).get("effective_profile", "")
        diagnostics = data.get("docling_result", {})
        warnings = list(data.get("content_summary", {}).get("warnings") or [])
        if diagnostics.get("errors"):
            warnings.append("Docling reported conversion errors")
        if diagnostics.get("status") and str(diagnostics["status"]).lower() not in {"success", "completed"}:
            warnings.append(f"Docling status: {diagnostics['status']}")
        self.page_warnings[page].extend(warnings)

        texts = [item for item in document.get("texts") or [] if not self._is_noise(item, height)]
        texts = self._ordered_texts(texts, width, height, data.get("reading_order"))
        simple_answer_items = sum(
            bool(parse_question_key(clean_text(item.get("marker"))))
            and bool(re.fullmatch(r"\(?\s*[a-hA-H]\s*\)?", clean_text(item.get("text"))))
            for item in texts
        )
        page_answer_layout = simple_answer_items >= 4
        page_questions: List[Dict[str, Any]] = []

        for index, item in enumerate(texts):
            text = clean_text(item.get("text"))
            marker = clean_text(item.get("marker"))
            label = str(item.get("label") or "")
            key = parse_question_key(marker)
            inline = INLINE_QUESTION_PATTERN.match(text) if not marker else None
            if inline:
                key = parse_question_key(inline.group("key"))
                text = clean_text(inline.group("text"))

            raw = clean_text(f"{marker} {text}")
            answer_pairs = extract_answer_pairs(raw)
            dense_answer_line = len(answer_pairs) >= 3 and bool(re.match(r"^\s*\d", raw))
            answer_context = (
                self.in_answer_block
                or page_answer_layout
                or dense_answer_line
                or bbox_top(item, height) >= height * 0.90
            )
            is_single_answer = (
                key
                and re.fullmatch(r"\(?\s*[a-hA-H]\s*\)?", text)
                and answer_context
            )
            if is_single_answer:
                option = re.search(r"[a-hA-H]", text).group(0).upper()
                self._finish_current()
                self._record_answers([(key, option, raw)], page)
                continue
            if answer_context and answer_pairs:
                self._finish_current()
                self._record_answers(answer_pairs, page)
                continue

            if label == "section_header" and self._handle_heading(text, item, width):
                continue

            if key:
                current_text = " ".join(self.current["question_text_parts"]).lower() if self.current else ""
                is_numbered_statement = (
                    self.current is not None
                    and inline is not None
                    and key.number <= 10
                    and any(cue in current_text for cue in ("following", "statement", "match", "list i", "codes"))
                )
                if is_numbered_statement:
                    self.current["question_text_parts"].append(raw)
                    self.current["source_elements"] += 1
                    self._add_provenance(self.current, page, item, profile)
                    continue
                if self.current and (
                    "match" in current_text
                    or "list i" in current_text
                ) and key.number < int(self.current["question_number"]):
                    self.current["question_text_parts"].append(raw)
                    self.current["source_elements"] += 1
                    self._add_provenance(self.current, page, item, profile)
                    continue
                self._finish_current()
                self.in_answer_block = False
                self.current = self._new_question(key, text, page, item, profile)
                page_questions.append(self.current)
                continue

            if not self.current or not text:
                continue
            options = extract_options(raw)
            if options:
                for option, value in options.items():
                    if option in self.current["options"] and self.current["options"][option] != value:
                        self.current["parser_warnings"].append(f"Duplicate option {option}")
                    self.current["options"][option] = value
            else:
                self.current["question_text_parts"].append(raw)
            self.current["pdf_page_end"] = page
            self.current["source_elements"] += 1
            self._add_provenance(self.current, page, item, profile)

        self._attach_tables(page_questions, document.get("tables") or [], height)

    def _score_answer(self, question: Dict[str, Any], answer: Dict[str, Any]) -> Tuple[float, List[str]]:
        score, reasons = 0.0, []
        if question["normalized_question_key"] == answer["normalized_question_key"]:
            score += 0.48; reasons.append("exact normalized question key")
        elif question["question_number"] == answer["question_number"] and not question["question_suffix"]:
            score += 0.35; reasons.append("same base question number")
        else:
            return 0.0, []
        chapter_similarity = heading_similarity(question["chapter"], answer["chapter"])
        if chapter_similarity >= 0.9:
            score += 0.25; reasons.append("same chapter")
        elif chapter_similarity >= 0.65:
            score += 0.12; reasons.append("similar chapter")
        if question["subject"] and heading_similarity(question["subject"], answer["subject"]) >= 0.9:
            score += 0.08; reasons.append("same subject")
        if question["section_id"] == answer["section_id"]:
            score += 0.15; reasons.append("same section")
        else:
            score -= 0.08
        page_distance = answer["answer_page"] - question["pdf_page_end"]
        if page_distance >= 0:
            score += 0.15 / (1.0 + page_distance / 10.0)
            reasons.append("answer follows question")
        else:
            score -= 0.20
        if answer["correct_option"] in question["options"]:
            score += 0.05; reasons.append("option exists")
        return min(score, 1.0), reasons

    def _match_answers(self) -> None:
        by_key: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        by_number: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
        for answer in self.answer_entries:
            by_key[answer["normalized_question_key"]].append(answer)
            by_number[answer["question_number"]].append(answer)

        seen_identity: Counter[Tuple[int, str]] = Counter()
        for index, question in enumerate(self.questions, start=1):
            identity = (question["section_id"], question["normalized_question_key"])
            seen_identity[identity] += 1
            candidates = list(by_key.get(question["normalized_question_key"], []))
            if not candidates and not question["question_suffix"]:
                candidates = list(by_number.get(question["question_number"], []))
            ranked = []
            for answer in candidates:
                score, reasons = self._score_answer(question, answer)
                if score:
                    ranked.append({"score": round(score, 3), "reasons": reasons, **answer})
            ranked.sort(key=lambda candidate: (-candidate["score"], abs(candidate["answer_page"] - question["pdf_page_end"])))

            warnings = list(dict.fromkeys(question.pop("parser_warnings", [])))
            chosen = None
            if ranked:
                top = ranked[0]
                competitors = [candidate for candidate in ranked[1:] if top["score"] - candidate["score"] <= 0.06 and candidate["correct_option"] != top["correct_option"]]
                if top["score"] >= 0.55 and not competitors:
                    chosen = top
                elif competitors:
                    warnings.append("Conflicting high-scoring printed answers")
                else:
                    warnings.append("Printed answer match is weak")
            else:
                warnings.append("Printed answer not found")

            options = question["options"]
            required_options = ("A", "B", "C", "D")
            for required in required_options:
                if required not in options:
                    warnings.append(f"Option {required} missing")
            if not question["question_text"]:
                warnings.append("Question text missing")
            if not question["chapter"]:
                warnings.append("Chapter not identified")
            if seen_identity[identity] > 1:
                warnings.append("Duplicate question key in section")

            correct_option = chosen["correct_option"] if chosen else ""
            if correct_option and correct_option not in options:
                warnings.append("Correct option text missing")
            boundary_confidence = 0.95 if question["question_text"] and question["source_elements"] >= 2 else 0.72
            option_confidence = min(1.0, len(options) / 4.0)
            answer_confidence = chosen["score"] if chosen else 0.0
            chapter_confidence = 0.9 if question["chapter"] else 0.35
            overall = round(min(boundary_confidence, option_confidence, answer_confidence, chapter_confidence), 2)
            validation = "approved" if not warnings and overall >= 0.85 else "review_required"

            question.update({
                "question_id": f"QST_{index:05d}",
                "option_a": options.get("A", ""), "option_b": options.get("B", ""),
                "option_c": options.get("C", ""), "option_d": options.get("D", ""),
                "additional_options": {key: value for key, value in options.items() if key not in required_options},
                "correct_option": correct_option,
                "correct_answer_text": options.get(correct_option, ""),
                "answer_page": chosen["answer_page"] if chosen else "",
                "raw_answer": chosen["raw_answer"] if chosen else "",
                "answer_source": "printed_answer_key" if chosen else ("conflict" if ranked else "not_found"),
                "answer_candidates": ranked[:5],
                "confidence": overall,
                "confidence_details": {
                    "question_boundary": round(boundary_confidence, 2),
                    "option_grouping": round(option_confidence, 2),
                    "answer_matching": round(answer_confidence, 2),
                    "chapter_assignment": round(chapter_confidence, 2),
                },
                "validation_status": validation,
                "warnings": "; ".join(dict.fromkeys(warnings)),
            })
            question.pop("options", None)

    def parse(self) -> Dict[str, Any]:
        pages = self._load_pages()
        self._detect_repeated_margins(pages)
        for _, data in pages:
            self._process_page(data)
        self._finish_current()
        self._match_answers()
        review_count = sum(q["validation_status"] == "review_required" for q in self.questions)
        summary = {
            "parser_version": PARSER_VERSION,
            "document_id": self.document_id,
            "source": self.manifest.get("source", ""),
            "total_pdf_pages": self.manifest.get("total_pages", 0),
            "processed_pages": len(pages),
            "pending_pages": self.manifest.get("total_pages", 0) - len(pages),
            "questions_extracted": len(self.questions),
            "approved_questions": len(self.questions) - review_count,
            "review_required": review_count,
            "answer_entries": len(self.answer_entries),
            "answer_blocks": self.answer_block_id,
            "repeated_marginal_patterns_removed": len(self.repeated_marginal_text),
            "is_complete": len(pages) == self.manifest.get("total_pages", 0),
        }
        return {"summary": summary, "questions": self.questions}


def save_result(result: Dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(".json.tmp")
    temporary_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary_path.replace(output_path)


def find_document(document: Optional[str]) -> Path:
    candidates = sorted(path for path in JSON_OUTPUT_DIR.iterdir() if path.is_dir())
    if document:
        selected = JSON_OUTPUT_DIR / document
        if not selected.is_dir():
            raise FileNotFoundError(f"Docling JSON document not found: {selected}")
        return selected
    if len(candidates) != 1:
        raise RuntimeError("Specify --document when zero or multiple documents exist.")
    return candidates[0]


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse Docling JSON into validated production question records.")
    parser.add_argument("--document")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    document_dir = find_document(args.document)
    result = DoclingJsonQuestionParser(document_dir).parse()
    output_path = args.output or STRUCTURED_OUTPUT_DIR / f"{document_dir.name}_questions.json"
    save_result(result, output_path)
    logger.info("Saved %s questions to %s", len(result["questions"]), output_path)
    logger.info("Summary: %s", result["summary"])


if __name__ == "__main__":
    main()
