import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    from PyPDF2 import PdfReader, PdfWriter

try:
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption
except ImportError as exc:
    raise RuntimeError(
        "Docling is not installed in this Python environment. Install the "
        "project's Docling dependencies before running this processor."
    ) from exc

try:
    from docling.datamodel.pipeline_options import OcrMode, TableFormerMode
except ImportError:
    OcrMode = TableFormerMode = None

try:
    from docling.chunking import HybridChunker
except ImportError:
    HybridChunker = None

try:
    from docling.datamodel.accelerator_options import AcceleratorOptions
except ImportError:
    AcceleratorOptions = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DoclingJsonPipeline")

BASE_DIR = Path(__file__).resolve().parent
INPUT_PDFS_DIR = BASE_DIR / "input_pdfs"
JSON_OUTPUT_DIR = BASE_DIR / "docling_json_outputs"
TEMP_DIR = BASE_DIR / ".temp_json_pages"
EXTRACTION_VERSION = 4
PROFILE_NAMES = ("auto", "digital", "scanned", "maximum")


@dataclass(frozen=True)
class ExtractionConfig:
    profile: str = "auto"
    ocr_enabled: bool = True
    ocr_languages: tuple[str, ...] = ()
    force_full_page_ocr: bool = False
    images_scale: float = 2.0
    generate_page_images: bool = False
    generate_picture_images: bool = False
    generate_table_images: bool = False
    code_enrichment: bool = False
    formula_enrichment: bool = False
    picture_classification: bool = False
    picture_description: bool = False
    chart_extraction: bool = False
    heading_hierarchy: bool = True
    allow_external_plugins: bool = False
    enable_remote_services: bool = False
    document_timeout: Optional[float] = None
    auto_text_threshold: int = 80
    structure_chunks: bool = True
    page_batch_size: int = 8
    max_retries: int = 2
    num_threads: int = max(1, min(8, os.cpu_count() or 4))
    device: str = "auto"
    ocr_batch_size: int = 4
    layout_batch_size: int = 4
    table_batch_size: int = 4
    queue_max_size: int = 100
    batch_polling_interval_seconds: float = 0.5
    artifacts_path: Optional[str] = None
    private_mode: bool = True

    def manifest_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["ocr_languages"] = list(self.ocr_languages)
        return data


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def calculate_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def document_to_dict(document: Any) -> Dict[str, Any]:
    """Export the complete DoclingDocument without flattening its structure."""
    if hasattr(document, "export_to_dict"):
        result = document.export_to_dict()
    elif hasattr(document, "model_dump"):
        result = document.model_dump(mode="json")
    elif hasattr(document, "export_to_json"):
        exported = document.export_to_json()
        result = json.loads(exported) if isinstance(exported, str) else exported
    else:
        raise TypeError("This Docling version has no supported structured export method.")
    if not isinstance(result, dict):
        raise TypeError("Docling structured export did not return a JSON object.")
    return result


def _set_supported(target: Any, name: str, value: Any) -> bool:
    """Set an option only when the installed Docling release supports it."""
    if not hasattr(target, name):
        return False
    try:
        setattr(target, name, value)
        return True
    except (AttributeError, TypeError, ValueError) as error:
        logger.warning("Could not set Docling option %s: %s", name, error)
        return False


def _enum_value(enum_type: Any, *names: str) -> Any:
    if enum_type is not None:
        for name in names:
            if hasattr(enum_type, name):
                return getattr(enum_type, name)
    return None


def _result_diagnostics(result: Any) -> Dict[str, Any]:
    status = getattr(result, "status", None)
    errors = []
    for error in getattr(result, "errors", None) or []:
        errors.append(
            error.model_dump(mode="json")
            if hasattr(error, "model_dump")
            else str(error)
        )
    return {
        "status": getattr(status, "value", str(status)) if status is not None else None,
        "errors": errors,
    }


def _content_summary(document: Dict[str, Any]) -> Dict[str, Any]:
    texts = document.get("texts") or []
    tables = document.get("tables") or []
    pictures = document.get("pictures") or []
    groups = document.get("groups") or []
    characters = sum(
        len(str(item.get("text") or item.get("orig") or ""))
        for item in texts
        if isinstance(item, dict)
    )
    warnings = []
    if not texts and not tables and not pictures:
        warnings.append("Docling returned no text, table, or picture elements.")
    elif characters < 20 and not tables:
        warnings.append("Very little text was extracted; review OCR and page layout.")
    return {
        "text_items": len(texts),
        "text_characters": characters,
        "table_items": len(tables),
        "picture_items": len(pictures),
        "group_items": len(groups),
        "warnings": warnings,
    }


def _json_value(value: Any) -> Any:
    """Convert Docling/Pydantic values to JSON-safe data without losing metadata."""
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if hasattr(value, "export_to_dict"):
        return value.export_to_dict()
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def extract_structure_chunks(document: Any, enabled: bool) -> Dict[str, Any]:
    """Create hierarchy-aware chunks while preserving Docling metadata/provenance."""
    if not enabled:
        return {"enabled": False, "method": None, "scope": "page", "items": []}
    if HybridChunker is None:
        return {
            "enabled": True,
            "method": None,
            "scope": "page",
            "items": [],
            "warning": "HybridChunker is unavailable in the installed Docling version.",
        }
    try:
        chunker = HybridChunker()
        items = []
        for index, chunk in enumerate(chunker.chunk(dl_doc=document)):
            exported = _json_value(chunk)
            if not isinstance(exported, dict):
                exported = {"text": str(getattr(chunk, "text", exported))}
            exported.setdefault("chunk_index", index)
            exported.setdefault("text", str(getattr(chunk, "text", "")))
            # contextualize() joins headings/captions with the chunk body, which
            # is useful for retrieval without replacing the lossless raw text.
            contextualize = getattr(chunker, "contextualize", None)
            if callable(contextualize):
                exported["contextualized_text"] = contextualize(chunk)
            items.append(exported)
        return {
            "enabled": True,
            "method": "docling_hybrid_chunker",
            "scope": "page",
            "items": items,
        }
    except Exception as error:
        logger.warning("Structure-aware chunking failed: %s", error)
        return {
            "enabled": True,
            "method": "docling_hybrid_chunker",
            "scope": "page",
            "items": [],
            "warning": str(error),
        }


def build_asset_index(structured: Dict[str, Any]) -> Dict[str, Any]:
    """Index tables and figures with their references and original provenance."""
    output: Dict[str, list[Dict[str, Any]]] = {"tables": [], "figures": []}
    for source_name, target_name in (("tables", "tables"), ("pictures", "figures")):
        for index, item in enumerate(structured.get(source_name) or []):
            if not isinstance(item, dict):
                continue
            entry = {
                "element_ref": _item_ref(item, f"#/{source_name}/{index}"),
                "label": item.get("label"),
                "provenance": item.get("prov") or [],
                "captions": item.get("captions") or [],
            }
            if source_name == "tables":
                data = item.get("data") or {}
                entry["num_rows"] = data.get("num_rows")
                entry["num_cols"] = data.get("num_cols")
            output[target_name].append(entry)
    return output


def _item_ref(item: Any, fallback: str) -> str:
    reference = getattr(item, "self_ref", None)
    if reference is not None:
        reference = getattr(reference, "cref", reference)
        return str(reference)
    if isinstance(item, dict):
        return str(item.get("self_ref") or fallback)
    return fallback


def extract_reading_order(document: Any, structured: Dict[str, Any]) -> Dict[str, Any]:
    """Capture Docling's semantic human-reading sequence without re-sorting it."""
    items = []
    iterator = getattr(document, "iterate_items", None)
    if callable(iterator):
        try:
            for position, entry in enumerate(iterator()):
                item, level = entry if isinstance(entry, tuple) else (entry, None)
                label = getattr(item, "label", "")
                label = getattr(label, "value", label)
                text = getattr(item, "text", "")
                items.append(
                    {
                        "reading_order_index": position,
                        "element_ref": _item_ref(item, f"#/reading_order/{position}"),
                        "label": str(label or ""),
                        "level": level,
                        "text_preview": str(text or "")[:160],
                    }
                )
            if items:
                return {"source": "docling_iterate_items", "items": items}
        except Exception as error:
            logger.warning("Could not export Docling semantic reading order: %s", error)

    # Older Docling releases may not expose iterate_items(). Their exported text
    # array is already emitted in Docling's predicted order, so preserve it.
    for position, item in enumerate(structured.get("texts") or []):
        items.append(
            {
                "reading_order_index": position,
                "element_ref": _item_ref(item, f"#/texts/{position}"),
                "label": str(item.get("label") or ""),
                "level": None,
                "text_preview": str(item.get("text") or "")[:160],
            }
        )
    return {"source": "structured_text_order_fallback", "items": items}


def _first_bbox(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    provenance = item.get("prov") or []
    bbox = provenance[0].get("bbox") if provenance else None
    return bbox if isinstance(bbox, dict) else None


def _cluster_left_edges(values: list[float], tolerance: float) -> list[list[float]]:
    clusters: list[list[float]] = []
    for value in sorted(values):
        if not clusters or value - (sum(clusters[-1]) / len(clusters[-1])) > tolerance:
            clusters.append([value])
        else:
            clusters[-1].append(value)
    return clusters


def analyze_page_columns(
    structured: Dict[str, Any],
    fallback_width: float,
    fallback_height: float,
    reading_order: Dict[str, Any],
) -> Dict[str, Any]:
    """Infer page columns from Docling bounding boxes without changing its order."""
    pages = structured.get("pages") or {}
    first_page = next(iter(pages.values()), {}) if isinstance(pages, dict) else {}
    size = first_page.get("size") or {}
    page_width = float(size.get("width") or fallback_width or 0)
    page_height = float(size.get("height") or fallback_height or 0)
    records = []
    for collection_name in ("texts", "tables", "pictures"):
        singular = collection_name[:-1] if collection_name.endswith("s") else collection_name
        for index, item in enumerate(structured.get(collection_name) or []):
            if not isinstance(item, dict):
                continue
            bbox = _first_bbox(item)
            if not bbox:
                continue
            left = float(bbox.get("l", 0))
            right = float(bbox.get("r", left))
            label = str(item.get("label") or singular)
            records.append(
                {
                    "element_ref": _item_ref(item, f"#/{collection_name}/{index}"),
                    "element_type": singular,
                    "label": label,
                    "left": left,
                    "right": right,
                    "width": max(0.0, right - left),
                    "bbox": bbox,
                }
            )

    if page_width <= 0 or not records:
        return {
            "method": "docling_bbox_left_edge_clustering_v1",
            "column_count": 0,
            "confidence": 0.0,
            "page_width": page_width,
            "page_height": page_height,
            "columns": [],
            "elements": [],
            "warnings": ["Insufficient bounding-box data for column detection."],
        }

    excluded_labels = {"page_header", "page_footer", "caption", "footnote"}
    candidates = [
        record for record in records
        if record["width"] <= page_width * 0.66
        and record["label"].lower() not in excluded_labels
    ]
    tolerance = max(12.0, page_width * 0.055)
    raw_clusters = _cluster_left_edges([record["left"] for record in candidates], tolerance)
    minimum_support = max(2, round(len(candidates) * 0.045))
    supported = [cluster for cluster in raw_clusters if len(cluster) >= minimum_support]

    # Nearby indentation levels belong to the same column. True column starts
    # require a substantial horizontal gap relative to page width.
    merged: list[list[float]] = []
    for cluster in supported:
        center = sum(cluster) / len(cluster)
        if merged and center - (sum(merged[-1]) / len(merged[-1])) < page_width * 0.145:
            merged[-1].extend(cluster)
        else:
            merged.append(list(cluster))
    if not merged and candidates:
        merged = [[record["left"] for record in candidates]]

    starts = [sum(cluster) / len(cluster) for cluster in merged]
    starts.sort()
    boundaries = [0.0]
    for left, right in zip(starts, starts[1:]):
        boundaries.append((left + right) / 2.0)
    boundaries.append(page_width)
    columns = []
    for index, start in enumerate(starts, start=1):
        member_records = [
            record for record in candidates
            if boundaries[index - 1] <= record["left"] < boundaries[index]
        ]
        columns.append(
            {
                "column_index": index,
                "left": round(boundaries[index - 1], 3),
                "right": round(boundaries[index], 3),
                "detected_start": round(start, 3),
                "supporting_elements": len(member_records),
            }
        )

    order_index = {
        item.get("element_ref"): item.get("reading_order_index")
        for item in reading_order.get("items") or []
    }
    element_assignments = []
    for record in records:
        overlaps = []
        for column in columns:
            overlap = max(
                0.0,
                min(record["right"], column["right"])
                - max(record["left"], column["left"]),
            )
            if overlap > 0 and overlap >= max(1.0, record["width"] * 0.18):
                overlaps.append(column["column_index"])
        primary = overlaps[0] if len(overlaps) == 1 else 0
        element_assignments.append(
            {
                "element_ref": record["element_ref"],
                "element_type": record["element_type"],
                "label": record["label"],
                "column_index": primary,
                "column_indices": overlaps,
                "spans_columns": len(overlaps) > 1,
                "reading_order_index": order_index.get(record["element_ref"]),
                "bbox": record["bbox"],
            }
        )

    support = sum(column["supporting_elements"] for column in columns)
    support_ratio = support / max(1, len(candidates))
    if len(starts) <= 1:
        separation_score = 1.0
    else:
        gaps = [(right - left) / page_width for left, right in zip(starts, starts[1:])]
        separation_score = min(1.0, min(gaps) / 0.20)
    confidence = round(min(1.0, 0.55 * support_ratio + 0.45 * separation_score), 3)
    warnings = []
    if confidence < 0.60:
        warnings.append("Column detection confidence is low; inspect bounding boxes.")
    return {
        "method": "docling_bbox_left_edge_clustering_v1",
        "column_count": len(columns),
        "confidence": confidence,
        "page_width": page_width,
        "page_height": page_height,
        "columns": columns,
        "elements": element_assignments,
        "warnings": warnings,
    }


class DoclingJsonProcessor:
    def __init__(self, config: ExtractionConfig):
        if config.profile not in PROFILE_NAMES:
            raise ValueError(f"Unsupported extraction profile: {config.profile}")
        if config.private_mode and (config.enable_remote_services or config.allow_external_plugins):
            raise ValueError(
                "Private mode forbids remote services and external plugins. "
                "Use --no-private-mode only after reviewing data-security requirements."
            )
        for directory in (INPUT_PDFS_DIR, JSON_OUTPUT_DIR, TEMP_DIR):
            directory.mkdir(parents=True, exist_ok=True)
        self.config = config
        self._converters: Dict[str, DocumentConverter] = {}

    def _build_converter(self, effective_profile: str) -> DocumentConverter:
        options = PdfPipelineOptions()
        is_scanned = effective_profile in {"scanned", "maximum"}
        is_maximum = effective_profile == "maximum"
        do_ocr = self.config.ocr_enabled and effective_profile != "digital"

        settings = {
            "do_ocr": do_ocr,
            "do_table_structure": True,
            "images_scale": self.config.images_scale,
            "generate_page_images": self.config.generate_page_images or is_maximum,
            "generate_picture_images": self.config.generate_picture_images or is_maximum,
            "generate_table_images": self.config.generate_table_images,
            "do_code_enrichment": self.config.code_enrichment or is_maximum,
            "do_formula_enrichment": self.config.formula_enrichment or is_maximum,
            "do_picture_classification": self.config.picture_classification or is_maximum,
            "do_picture_description": self.config.picture_description or is_maximum,
            "do_chart_extraction": self.config.chart_extraction or is_maximum,
            "allow_external_plugins": self.config.allow_external_plugins,
            "enable_remote_services": self.config.enable_remote_services,
            "ocr_batch_size": self.config.ocr_batch_size,
            "layout_batch_size": self.config.layout_batch_size,
            "table_batch_size": self.config.table_batch_size,
            "queue_max_size": self.config.queue_max_size,
            "batch_polling_interval_seconds": self.config.batch_polling_interval_seconds,
        }
        if self.config.artifacts_path:
            settings["artifacts_path"] = Path(self.config.artifacts_path)
        if self.config.document_timeout is not None:
            settings["document_timeout"] = self.config.document_timeout
        for name, value in settings.items():
            _set_supported(options, name, value)

        if AcceleratorOptions is not None:
            try:
                accelerator = AcceleratorOptions(
                    num_threads=self.config.num_threads,
                    device=self.config.device,
                )
                _set_supported(options, "accelerator_options", accelerator)
            except (TypeError, ValueError) as error:
                logger.warning("Could not configure Docling accelerator: %s", error)

        table_options = getattr(options, "table_structure_options", None)
        if table_options is not None:
            _set_supported(table_options, "do_cell_matching", True)
            accurate = _enum_value(TableFormerMode, "ACCURATE", "accurate")
            if accurate is not None:
                _set_supported(table_options, "mode", accurate)

        ocr_options = getattr(options, "ocr_options", None)
        if do_ocr and ocr_options is not None:
            if self.config.ocr_languages:
                _set_supported(ocr_options, "lang", list(self.config.ocr_languages))
            full_page = self.config.force_full_page_ocr or is_scanned
            _set_supported(ocr_options, "force_full_page_ocr", full_page)
            full_page_mode = _enum_value(OcrMode, "FULL_PAGE", "full_page")
            if full_page and full_page_mode is not None:
                _set_supported(ocr_options, "mode", full_page_mode)

        heading_options = getattr(options, "heading_hierarchy_options", None)
        if heading_options is not None:
            _set_supported(heading_options, "enabled", self.config.heading_hierarchy)
            _set_supported(heading_options, "use_bookmarks", True)
            _set_supported(heading_options, "use_numbering", True)

        return DocumentConverter(
            allowed_formats=[InputFormat.PDF],
            format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)},
        )

    def _converter_for(self, effective_profile: str) -> DocumentConverter:
        if effective_profile not in self._converters:
            logger.info("Loading Docling '%s' extraction profile.", effective_profile)
            self._converters[effective_profile] = self._build_converter(effective_profile)
        return self._converters[effective_profile]

    def _effective_profile(self, page: Any) -> tuple[str, Dict[str, Any]]:
        try:
            embedded_text = page.extract_text() or ""
        except Exception as error:
            logger.warning("Could not inspect embedded page text: %s", error)
            embedded_text = ""
        characters = len(re.sub(r"\s+", "", embedded_text))
        selected = self.config.profile
        if selected == "auto":
            # Hybrid keeps native PDF text and also OCRs text inside page images.
            selected = "hybrid" if characters >= self.config.auto_text_threshold else "scanned"
        return selected, {
            "requested_profile": self.config.profile,
            "effective_profile": selected,
            "embedded_text_characters": characters,
            "auto_text_threshold": self.config.auto_text_threshold,
        }

    @staticmethod
    def _document_id(pdf_path: Path) -> str:
        normalized = re.sub(r"[^a-z0-9._+-]+", "_", pdf_path.stem.lower())
        return normalized.strip("_") or "document"

    @staticmethod
    def _save_json_atomic(path: Path, data: Dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = path.with_suffix(path.suffix + ".tmp")
        with temporary_path.open("w", encoding="utf-8") as output:
            json.dump(data, output, ensure_ascii=False, indent=2)
            output.flush()
        temporary_path.replace(path)

    def _create_manifest(self, pdf_path: Path, document_id: str, total_pages: int, source_sha256: str) -> Dict[str, Any]:
        return {
            "document_id": document_id,
            "source": pdf_path.name,
            "source_sha256": source_sha256,
            "total_pages": total_pages,
            "extraction_version": EXTRACTION_VERSION,
            "extraction_config": self.config.manifest_dict(),
            "ocr_enabled": self.config.ocr_enabled,
            "deployment": {
                "mode": "private_local" if self.config.private_mode else "network_services_allowed",
                "remote_services_enabled": self.config.enable_remote_services,
                "external_plugins_enabled": self.config.allow_external_plugins,
                "artifacts_path": self.config.artifacts_path,
            },
            "queue": {
                "type": "durable_manifest_queue",
                "page_batch_size": self.config.page_batch_size,
                "max_retries": self.config.max_retries,
                "docling_stage_queue_max_size": self.config.queue_max_size,
            },
            "created_at": utc_now(),
            "updated_at": utc_now(),
            "layout_summary": {
                "pages_analyzed": 0,
                "column_count_distribution": {},
                "dominant_column_count": 0,
                "maximum_column_count": 0,
            },
            "pages": [
                {
                    "pdf_page": number,
                    "file": f"pages/page_{number:04d}.json",
                    "status": "pending",
                    "effective_profile": None,
                    "quality_warnings": [],
                    "detected_column_count": None,
                    "column_detection_confidence": None,
                    "reading_order_source": None,
                    "processed_at": None,
                    "attempts": 0,
                    "started_at": None,
                    "error": None,
                }
                for number in range(1, total_pages + 1)
            ],
        }

    def _load_or_create_manifest(self, output_dir: Path, pdf_path: Path, total_pages: int, source_sha256: str) -> Dict[str, Any]:
        manifest_path = output_dir / "manifest.json"
        if manifest_path.exists():
            try:
                existing = json.loads(manifest_path.read_text(encoding="utf-8"))
                compatible = (
                    existing.get("source_sha256") == source_sha256
                    and existing.get("total_pages") == total_pages
                    and existing.get("extraction_version") == EXTRACTION_VERSION
                    and existing.get("extraction_config") == self.config.manifest_dict()
                )
                if compatible:
                    return existing
                logger.info("Source or extraction configuration changed; rebuilding manifest.")
            except (OSError, ValueError, TypeError) as error:
                logger.warning("Could not reuse manifest: %s", error)
        manifest = self._create_manifest(pdf_path, self._document_id(pdf_path), total_pages, source_sha256)
        self._save_json_atomic(manifest_path, manifest)
        return manifest

    @staticmethod
    def _write_single_page_pdf(reader: PdfReader, page_number: int, destination: Path) -> None:
        writer = PdfWriter()
        writer.add_page(reader.pages[page_number - 1])
        with destination.open("wb") as output:
            writer.write(output)

    def _convert_page(self, reader: PdfReader, source_pdf: Path, document_id: str, page_number: int) -> Dict[str, Any]:
        temporary_pdf = TEMP_DIR / f"{document_id}_page_{page_number:04d}.pdf"
        page = reader.pages[page_number - 1]
        effective_profile, detection = self._effective_profile(page)
        try:
            self._write_single_page_pdf(reader, page_number, temporary_pdf)
            result = self._converter_for(effective_profile).convert(temporary_pdf)
            document = document_to_dict(result.document)
            reading_order = extract_reading_order(result.document, document)
            layout_analysis = analyze_page_columns(
                document,
                fallback_width=float(page.mediabox.width),
                fallback_height=float(page.mediabox.height),
                reading_order=reading_order,
            )
            content_summary = _content_summary(document)
            structure_chunks = extract_structure_chunks(
                result.document, self.config.structure_chunks
            )
            asset_index = build_asset_index(document)
            if structure_chunks.get("warning"):
                content_summary["warnings"].append(structure_chunks["warning"])
            content_summary["warnings"] = list(
                dict.fromkeys(
                    content_summary["warnings"] + layout_analysis["warnings"]
                )
            )
            return {
                "document_id": document_id,
                "source": source_pdf.name,
                "pdf_page": page_number,
                "page_width": float(page.mediabox.width),
                "page_height": float(page.mediabox.height),
                "extracted_at": utc_now(),
                "extraction_version": EXTRACTION_VERSION,
                "ocr_enabled": effective_profile != "digital" and self.config.ocr_enabled,
                "extraction_detection": detection,
                "docling_result": _result_diagnostics(result),
                "content_summary": content_summary,
                "reading_order": reading_order,
                "layout_analysis": layout_analysis,
                "structure_chunks": structure_chunks,
                "content_assets": asset_index,
                "docling_document": document,
            }
        finally:
            if temporary_pdf.exists():
                try:
                    temporary_pdf.unlink()
                except OSError as error:
                    logger.warning("Could not remove temporary page '%s': %s", temporary_pdf.name, error)

    def process_pdf(self, pdf_path: Path, start_page: int = 1, end_page: Optional[int] = None, force: bool = False) -> None:
        reader = PdfReader(str(pdf_path))
        total_pages = len(reader.pages)
        end_page = total_pages if end_page is None else min(end_page, total_pages)
        if start_page < 1 or start_page > end_page:
            raise ValueError(f"Invalid page range {start_page}-{end_page} for {total_pages} pages.")

        document_id = self._document_id(pdf_path)
        output_dir = JSON_OUTPUT_DIR / document_id
        (output_dir / "pages").mkdir(parents=True, exist_ok=True)
        logger.info("Calculating source fingerprint for '%s'...", pdf_path.name)
        manifest = self._load_or_create_manifest(output_dir, pdf_path, total_pages, calculate_sha256(pdf_path))
        manifest_path = output_dir / "manifest.json"
        logger.info("Processing '%s', pages %s-%s of %s with profile '%s'.", pdf_path.name, start_page, end_page, total_pages, self.config.profile)

        pending_pages = []
        for page_number in range(start_page, end_page + 1):
            state = manifest["pages"][page_number - 1]
            output = output_dir / state["file"]
            if not force and state.get("status") == "completed" and output.exists():
                logger.info("Skipping page %s: already completed.", page_number)
            else:
                state["status"] = "queued"
                pending_pages.append(page_number)

        # This manifest is the durable queue. Small bounded batches prevent a
        # large PDF from filling RAM; Docling's own OCR/layout/table stages use
        # the configured worker threads, batch sizes, and bounded queues.
        for batch_start in range(0, len(pending_pages), self.config.page_batch_size):
            batch = pending_pages[batch_start:batch_start + self.config.page_batch_size]
            logger.info("Starting page batch %s", batch)
            for page_number in batch:
                page_state = manifest["pages"][page_number - 1]
                page_output = output_dir / page_state["file"]
                started_at = time.perf_counter()
                page_state["status"] = "processing"
                page_state["started_at"] = utc_now()
                self._save_json_atomic(manifest_path, manifest)
                last_error: Optional[Exception] = None
                for attempt in range(1, self.config.max_retries + 2):
                    page_state["attempts"] = int(page_state.get("attempts") or 0) + 1
                    try:
                        page_data = self._convert_page(reader, pdf_path, document_id, page_number)
                        self._save_json_atomic(page_output, page_data)
                        page_state.update({
                            "status": "completed",
                            "effective_profile": page_data["extraction_detection"]["effective_profile"],
                            "quality_warnings": page_data["content_summary"]["warnings"],
                            "detected_column_count": page_data["layout_analysis"]["column_count"],
                            "column_detection_confidence": page_data["layout_analysis"]["confidence"],
                            "reading_order_source": page_data["reading_order"]["source"],
                            "processed_at": utc_now(),
                            "error": None,
                        })
                        last_error = None
                        logger.info("Page %s completed with '%s' profile in %.2fs -> %s", page_number, page_state["effective_profile"], time.perf_counter() - started_at, page_output.name)
                        break
                    except Exception as error:
                        last_error = error
                        page_state["error"] = str(error)
                        logger.exception(
                            "Page %s attempt %s/%s failed: %s",
                            page_number,
                            attempt,
                            self.config.max_retries + 1,
                            error,
                        )
                if last_error is not None:
                    page_state.update({
                        "status": "failed",
                        "processed_at": utc_now(),
                        "error": str(last_error),
                    })

                completed_counts = Counter(
                    int(state["detected_column_count"])
                    for state in manifest["pages"]
                    if state.get("status") == "completed"
                    and state.get("detected_column_count") is not None
                )
                positive_counts = {count: pages for count, pages in completed_counts.items() if count > 0}
                manifest["layout_summary"] = {
                    "pages_analyzed": sum(completed_counts.values()),
                    "column_count_distribution": {
                        str(count): pages for count, pages in sorted(completed_counts.items())
                    },
                    "dominant_column_count": (
                        max(positive_counts, key=positive_counts.get) if positive_counts else 0
                    ),
                    "maximum_column_count": max(positive_counts, default=0),
                }
                manifest["updated_at"] = utc_now()
                self._save_json_atomic(manifest_path, manifest)

    def run_all(self, start_page: int = 1, end_page: Optional[int] = None, force: bool = False) -> None:
        pdf_files = sorted(INPUT_PDFS_DIR.glob("*.pdf"))
        if not pdf_files:
            logger.warning("No PDF files found in '%s'.", INPUT_PDFS_DIR)
            return
        for pdf_path in pdf_files:
            self.process_pdf(pdf_path, start_page, end_page, force)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export PDF pages as complete, structured Docling JSON.")
    parser.add_argument("--pdf", type=Path, help="Process one specific PDF.")
    parser.add_argument("--start-page", type=int, default=1)
    parser.add_argument("--end-page", type=int)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--profile", choices=PROFILE_NAMES, default="auto", help="auto detects digital/scanned pages; maximum enables heavy enrichment.")
    parser.add_argument("--no-ocr", action="store_true")
    parser.add_argument("--ocr-lang", action="append", default=[], help="OCR language code; repeat for multiple languages.")
    parser.add_argument("--force-full-page-ocr", action="store_true")
    parser.add_argument("--images-scale", type=float, default=2.0)
    parser.add_argument("--generate-page-images", action="store_true")
    parser.add_argument("--generate-picture-images", action="store_true")
    parser.add_argument("--generate-table-images", action="store_true")
    parser.add_argument("--code-enrichment", action="store_true")
    parser.add_argument("--formula-enrichment", action="store_true")
    parser.add_argument("--picture-classification", action="store_true")
    parser.add_argument("--picture-description", action="store_true")
    parser.add_argument("--chart-extraction", action="store_true")
    parser.add_argument("--no-heading-hierarchy", action="store_true")
    parser.add_argument("--allow-external-plugins", action="store_true")
    parser.add_argument("--enable-remote-services", action="store_true")
    parser.add_argument("--document-timeout", type=float)
    parser.add_argument("--auto-text-threshold", type=int, default=80)
    parser.add_argument("--no-structure-chunks", action="store_true")
    parser.add_argument("--page-batch-size", type=int, default=8)
    parser.add_argument("--max-retries", type=int, default=2)
    parser.add_argument("--num-threads", type=int, default=max(1, min(8, os.cpu_count() or 4)))
    parser.add_argument("--device", default="auto", help="Docling accelerator device, for example auto, cpu, cuda, or mps.")
    parser.add_argument("--ocr-batch-size", type=int, default=4)
    parser.add_argument("--layout-batch-size", type=int, default=4)
    parser.add_argument("--table-batch-size", type=int, default=4)
    parser.add_argument("--queue-max-size", type=int, default=100)
    parser.add_argument("--batch-polling-interval", type=float, default=0.5)
    parser.add_argument("--artifacts-path", type=Path, help="Local Docling model-artifact directory for offline/private deployment.")
    parser.add_argument("--no-private-mode", action="store_true", help="Allow explicitly requested plugins or remote services; private mode is the default.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.images_scale <= 0:
        raise ValueError("--images-scale must be greater than zero.")
    if args.auto_text_threshold < 0:
        raise ValueError("--auto-text-threshold cannot be negative.")
    positive_options = {
        "--page-batch-size": args.page_batch_size,
        "--num-threads": args.num_threads,
        "--ocr-batch-size": args.ocr_batch_size,
        "--layout-batch-size": args.layout_batch_size,
        "--table-batch-size": args.table_batch_size,
        "--queue-max-size": args.queue_max_size,
    }
    for name, value in positive_options.items():
        if value < 1:
            raise ValueError(f"{name} must be at least 1.")
    if args.max_retries < 0:
        raise ValueError("--max-retries cannot be negative.")
    if args.batch_polling_interval <= 0:
        raise ValueError("--batch-polling-interval must be greater than zero.")
    config = ExtractionConfig(
        profile=args.profile,
        ocr_enabled=not args.no_ocr,
        ocr_languages=tuple(args.ocr_lang),
        force_full_page_ocr=args.force_full_page_ocr,
        images_scale=args.images_scale,
        generate_page_images=args.generate_page_images,
        generate_picture_images=args.generate_picture_images,
        generate_table_images=args.generate_table_images,
        code_enrichment=args.code_enrichment,
        formula_enrichment=args.formula_enrichment,
        picture_classification=args.picture_classification,
        picture_description=args.picture_description,
        chart_extraction=args.chart_extraction,
        heading_hierarchy=not args.no_heading_hierarchy,
        allow_external_plugins=args.allow_external_plugins,
        enable_remote_services=args.enable_remote_services,
        document_timeout=args.document_timeout,
        auto_text_threshold=args.auto_text_threshold,
        structure_chunks=not args.no_structure_chunks,
        page_batch_size=args.page_batch_size,
        max_retries=args.max_retries,
        num_threads=args.num_threads,
        device=args.device,
        ocr_batch_size=args.ocr_batch_size,
        layout_batch_size=args.layout_batch_size,
        table_batch_size=args.table_batch_size,
        queue_max_size=args.queue_max_size,
        batch_polling_interval_seconds=args.batch_polling_interval,
        artifacts_path=str(args.artifacts_path.resolve()) if args.artifacts_path else None,
        private_mode=not args.no_private_mode,
    )
    processor = DoclingJsonProcessor(config)
    if args.pdf:
        pdf_path = args.pdf.resolve()
        if not pdf_path.exists() or pdf_path.suffix.lower() != ".pdf":
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        processor.process_pdf(pdf_path, args.start_page, args.end_page, args.force)
    else:
        processor.run_all(args.start_page, args.end_page, args.force)


if __name__ == "__main__":
    main()
