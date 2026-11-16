"""Sequential, resumable MinerU extraction with bounded page windows."""
from __future__ import annotations

import hashlib
import importlib.metadata
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from ..review.gate import write_json


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def extract(pdf: Path, output: Path, chunk_pages: int = 5,
            overlap: int = 1, tier: str = "standard", max_pages: int | None = None) -> Path:
    os.environ.setdefault("MINERU_HOME", str(Path(".mineru-cache").resolve()))
    os.environ.setdefault("MINERU_PROCESSING_WINDOW_SIZE", "2")
    from pypdf import PdfReader

    if chunk_pages < 1 or not 0 <= overlap < chunk_pages:
        raise ValueError("Use chunk_pages >= 1 and 0 <= overlap < chunk_pages")
    if max_pages is not None and max_pages < 1:
        raise ValueError("max_pages must be positive")
    digest = sha256(pdf)
    with pdf.open("rb") as stream:
        total = len(PdfReader(stream).pages)
    stop = min(total, max_pages) if max_pages else total
    version = importlib.metadata.version("mineru")
    destination = output / f"{pdf.stem[:70]}-{digest[:12]}" / f"{tier}-{version}-c{chunk_pages}-o{overlap}-p{stop}"
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {"source_file": str(pdf.resolve()), "source_sha256": digest,
                "total_pages": total, "requested_pages": stop, "tier": tier,
                "mineru_version": version, "complete": False, "chunks": []}
    completed = {}

    def checkpoint(status="running", window=None, error=None):
        manifest["chunks"] = list(completed.values())
        pages = {page for chunk in completed.values()
                 for page in range(chunk["first_page"], chunk["last_page"] + 1)}
        manifest.update(extraction_status=status, current_window=window,
                        completed_pages=len(pages),
                        next_incomplete_page=next((p for p in range(1, stop + 1) if p not in pages), None),
                        updated_at=datetime.now(timezone.utc).isoformat(), last_error=error)
        write_json(destination / "manifest.json", manifest)

    def cached(first, last):
        folder = destination / "chunks" / f"{first:06}-{last:06}"
        def reject(reason):
            print(f"{pdf.name}: retry pages {first}-{last}: {reason}", flush=True)
            return None

        if not (folder / "complete.json").is_file():
            return None
        try:
            saved = json.loads((folder / "complete.json").read_text(encoding="utf-8"))
            if saved["first_page"] != first or saved["last_page"] != last:
                return reject("checkpoint page range does not match")
            files = saved["files"]
            if "structured_content.json" not in files:
                return reject("checkpoint is missing structured JSON checksum")
            for name, checksum in files.items():
                # Markdown is an editable presentation export, never the input to
                # JSON merging or question/Excel generation. Its edits must not
                # invalidate expensive OCR. Keep validating JSON and all assets.
                if name == "markdown.md" or name in {"failure.json", "split.json"}:
                    continue
                path = (folder / name).resolve()
                if not path.is_relative_to(folder.resolve()) or not path.is_file() or sha256(path) != checksum:
                    return reject(f"missing or changed extraction file: {name}")
            data = json.loads((folder / "structured_content.json").read_text(encoding="utf-8"))
            if {p["page_idx"] + 1 for p in data["pages"]} != set(range(first, last + 1)):
                return reject("structured JSON page coverage does not match")
            return {**saved, "folder": str(folder.resolve())}
        except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
            return reject(f"unreadable checkpoint: {type(error).__name__}")

    def is_split(first, last):
        folder = destination / "chunks" / f"{first:06}-{last:06}"
        # Older versions saved child chunks without a split marker.
        mid = (first + last) // 2
        return first < last and ((folder / "split.json").is_file() or
            any((destination / "chunks" / f"{a:06}-{b:06}").is_dir()
                for a, b in ((first, mid), (mid + 1, last))))

    def restore(first, last):
        saved = cached(first, last)
        if saved:
            completed[(first, last)] = saved
        elif is_split(first, last):
            mid = (first + last) // 2
            restore(first, mid)
            restore(mid + 1, last)

    for first in range(1, stop + 1, chunk_pages):
        restore(first, min(stop, first + chunk_pages - 1 + overlap))
    checkpoint()
    if completed:
        print(f"{pdf.name}: resuming with {len(completed)} verified saved chunks "
              f"({manifest['completed_pages']}/{stop} pages)", flush=True)

    def run_window(first: int, last: int) -> list[dict]:
        folder = destination / "chunks" / f"{first:06}-{last:06}"
        marker = folder / "complete.json"
        if (first, last) in completed:
            print(f"{pdf.name}: skip saved pages {first}-{last}", flush=True)
            return [completed[(first, last)]]
        if is_split(first, last):
            mid = (first + last) // 2
            return run_window(first, mid) + run_window(mid + 1, last)
        checkpoint(window={"first_page": first, "last_page": last})
        print(f"{pdf.name}: pages {first}-{last} ({tier})", flush=True)
        try:
            # Avoid loading the inference stack for already extracted books.
            from mineru.parser import parse
            from mineru.parser.writer import FileBasedDataWriter
            result = parse(str(pdf), tier=tier, page_range=f"{first}-{last}")
            result.save(FileBasedDataWriter(str(folder)))
            structured_path = folder / "structured_content.json"
            structured = json.loads(structured_path.read_text(encoding="utf-8"))
            actual = {page["page_idx"] + 1 for page in structured["pages"]}
            if actual != set(range(first, last + 1)):
                raise ValueError(f"Page coverage mismatch: {sorted(actual)}")
            saved = {"first_page": first, "last_page": last,
                     "folder": str(folder.resolve()),
                     "files": {str(path.relative_to(folder)): sha256(path)
                               for path in folder.rglob("*") if path.is_file()
                               and path.name not in {"complete.json", "failure.json", "split.json"}
                               and not path.name.endswith(".tmp")}}
            write_json(marker, saved)
            completed[(first, last)] = saved
            checkpoint()
            return [saved]
        except Exception as error:
            write_json(folder / "failure.json", {"error_type": type(error).__name__, "error": str(error)})
            # Halve failed windows; do not drop a page or silently downgrade extraction quality.
            if first == last or isinstance(error, (ImportError, PermissionError, ConnectionError)):
                raise RuntimeError(f"Extraction failed on {pdf.name}, page {first}; see {folder}") from error
            mid = (first + last) // 2
            write_json(folder / "split.json", {"first_page": first, "last_page": last, "mid_page": mid})
            return run_window(first, mid) + run_window(mid + 1, last)

    try:
        ordered_chunks = []
        for first in range(1, stop + 1, chunk_pages):
            last = min(stop, first + chunk_pages - 1 + overlap)
            ordered_chunks.extend(run_window(first, last))
        manifest["chunks"] = ordered_chunks
    except (Exception, KeyboardInterrupt) as error:
        checkpoint("interrupted" if isinstance(error, KeyboardInterrupt) else "failed",
                   manifest.get("current_window"),
                   {"type": type(error).__name__, "message": str(error)})
        raise
    # First occurrence owns an overlapping page; retain every raw alternative on disk.
    pages = {}
    for chunk in manifest["chunks"]:
        folder = Path(chunk["folder"])
        data = json.loads((folder / "structured_content.json").read_text(encoding="utf-8"))
        for page in data["pages"]:
            page_number = page["page_idx"] + 1
            pages.setdefault(page_number, {**page, "source_page": page_number,
                                           "asset_directory": str(folder), "chunk": folder.name})
    if set(pages) != set(range(1, stop + 1)):
        raise ValueError("Merged document has missing pages")
    manifest["complete"] = stop == total
    manifest["extraction_status"] = "complete" if stop == total else "partial"
    write_json(destination / "document.json", {**manifest, "pages": [pages[key] for key in sorted(pages)]})
    write_json(destination / "manifest.json", manifest)
    return destination / "document.json"
