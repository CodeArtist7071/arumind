from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    input_dir: Path
    output_dir: Path
    state_db: Path
    file_patterns: tuple[str, ...] = ("*.md", "*.markdown")
    encoding: str = "utf-8-sig"
    batch_size: int = 100
    chunk_chars: int = 12000
    overlap_chars: int = 500
    retry_count: int = 3
    concurrency: int = 1
    confidence_threshold: float = 0.85
    llm_enabled: bool = False
    llm_provider: str = "openrouter"
    llm_model: str = ""
    api_key_env: str = "OPENROUTER_API_KEY"
    api_base: str = "https://openrouter.ai/api/v1/chat/completions"
    timeout_seconds: int = 60
    max_cell_chars: int = 32000
    template: Path | None = None
    column_mapping: dict | None = None


def _parse_yaml(path: Path) -> dict:
    text = path.read_text(encoding="utf-8-sig")
    try:
        import yaml
        return yaml.safe_load(text) or {}
    except ImportError:
        # Settings template is also valid JSON, which is a YAML subset.
        return json.loads(text)


def load_settings(path: Path, package_root: Path | None = None) -> Settings:
    root = (package_root or Path(__file__).resolve().parent).resolve()
    raw = _parse_yaml(path) if path.exists() else {}
    paths = raw.get("paths", {})
    llm = raw.get("llm", {})
    processing = raw.get("processing", {})
    export = raw.get("export", {})
    def resolved(value, default):
        p = Path(value or default)
        return (root / p).resolve() if not p.is_absolute() else p.resolve()
    return Settings(
        input_dir=resolved(paths.get("input"), "input/markdown"),
        output_dir=resolved(paths.get("output"), "output"),
        state_db=resolved(paths.get("state_db"), "intermediate/state.sqlite3"),
        file_patterns=tuple(raw.get("file_patterns", ["*.md", "*.markdown"])),
        encoding=raw.get("encoding", "utf-8-sig"),
        batch_size=int(processing.get("batch_size", 100)),
        chunk_chars=int(processing.get("chunk_chars", 12000)),
        overlap_chars=int(processing.get("overlap_chars", 500)),
        retry_count=int(llm.get("retry_count", 3)),
        concurrency=max(1, int(processing.get("concurrency", 1))),
        confidence_threshold=float(processing.get("confidence_threshold", 0.85)),
        llm_enabled=bool(llm.get("enabled", False)), llm_provider=llm.get("provider", "openrouter"),
        llm_model=llm.get("model", ""), api_key_env=llm.get("api_key_env", "OPENROUTER_API_KEY"),
        api_base=llm.get("api_base", "https://openrouter.ai/api/v1/chat/completions"),
        timeout_seconds=int(llm.get("timeout_seconds", 60)), max_cell_chars=int(export.get("max_cell_chars", 32000)),
        template=resolved(export.get("template"), "") if export.get("template") else None,
        column_mapping=dict(export.get("column_mapping", {})),
    )
