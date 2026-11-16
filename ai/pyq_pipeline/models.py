from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

STATUSES = {"extracted", "needs_review", "failed"}
MAPPING_STATUSES = {"mapped", "unresolved", "ambiguous", "not_applicable"}
ANSWER_STATUSES = {"not_verified", "source_answer", "answer_key_matched", "conflict"}


@dataclass
class MetadataValue:
    raw_name: str | None = None
    canonical_name: str | None = None
    id: str | None = None


@dataclass
class Option:
    label: str
    text: str


@dataclass
class QuestionRecord:
    record_id: str
    exam: dict[str, Any] = field(default_factory=lambda: {"raw_name": None, "canonical_name": None, "exam_id": None, "year": None, "session": None, "paper": None, "shift": None, "set": None})
    subject: dict[str, Any] = field(default_factory=lambda: {"raw_name": None, "canonical_name": None, "subject_id": None})
    chapter: dict[str, Any] = field(default_factory=lambda: {"raw_name": None, "canonical_name": None, "chapter_id": None})
    topic: dict[str, Any] = field(default_factory=lambda: {"raw_name": None, "canonical_name": None, "topic_id": None})
    question_text: str = ""
    options: list[dict[str, str]] = field(default_factory=list)
    correct_answers: list[str] = field(default_factory=list)
    question_type: str = "unknown"
    explanation: str | None = None
    language: str | None = None
    source: dict[str, Any] = field(default_factory=dict)
    mapping_status: str = "unresolved"
    extraction_status: str = "needs_review"
    answer_verification_status: str = "not_verified"
    review_reasons: list[str] = field(default_factory=list)
    mapping_version: str = ""
    duplicate_candidates: list[str] = field(default_factory=list)
    schema_version: str = "1.0"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
