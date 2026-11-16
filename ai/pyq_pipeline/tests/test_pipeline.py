import json
import shutil
from pathlib import Path

from openpyxl import Workbook, load_workbook

from pyq_pipeline.config import load_settings
from pyq_pipeline.exporter import export_workbook
from pyq_pipeline.mapping import MappingRegistry
from pyq_pipeline.parser import parse_markdown
from pyq_pipeline.persistence import StateStore
from pyq_pipeline.processing import process_files


def test_parse_questions_options_unicode_and_answer_section(tmp_path):
    path = tmp_path / "exam_2024.md"
    text = """# Exam 2024
Exam: Sample
Subject: Arithmetic
<!-- source page 2 -->
Q.1 Find √9 = ?
(a) 2
(b) 3

Question 2: Choose the true statement.
A. 🟢 2 is even.
B. 3 is even.

## Answer Key
1. B
2. A
"""
    records, keys = parse_markdown(path, text)
    assert len(records) == 2
    assert records[0]["question_text"] == "Find √9 = ?"
    assert [o["label"] for o in records[0]["options"]] == ["a", "b"]
    assert records[0]["exam"]["year"] == 2024
    assert records[0]["subject"]["raw_name"] == "Arithmetic"
    assert records[0]["source"]["page"] == 2
    assert "Answer Key" not in records[-1]["source"]["source_quote"]
    assert [k["answer"] for k in keys] == ["B", "A"]


def test_mapping_canonical_alias_and_ambiguous(tmp_path):
    config = tmp_path / "config"
    config.mkdir()
    (config / "subjects.json").write_text(json.dumps({"subjects": [
        {"id": "existing-id-1", "canonical_name": "Arithmetic", "aliases": ["Maths"]},
        {"id": "existing-id-2", "canonical_name": "Arithmetic", "aliases": ["Numbers"]},
    ]}), encoding="utf-8")
    registry = MappingRegistry(config)
    assert registry.resolve("subjects", "Maths")["id"] == "existing-id-1"
    result = registry.resolve("subjects", "Arithmetic")
    assert result["status"] == "ambiguous"
    assert registry.resolve("subjects", "Unlisted")["id"] is None


def test_resume_is_idempotent_and_exports_reviewable_workbook(tmp_path):
    root = Path(__file__).parent.parent
    input_dir = tmp_path / "input"
    input_dir.mkdir()
    md = input_dir / "demo.md"
    md.write_text("# Demo 2024\nExam: Demo\n\nQ1. Which is correct?\nA. Yes\nB. No\n", encoding="utf-8")
    config = tmp_path / "config"
    shutil.copytree(root / "config", config)
    registry = MappingRegistry(config)
    from dataclasses import replace
    settings = replace(load_settings(root / "config" / "settings.yaml", root), state_db=tmp_path / "state.sqlite3", output_dir=tmp_path / "out")
    store = StateStore(settings.state_db)
    progress = []
    export_workbook(store, tmp_path / "out", settings)
    first = process_files([md], store, registry, settings,
                          on_file=lambda _path, _count: progress.append(export_workbook(store, tmp_path / "out", settings)))
    assert first["questions"] == 1
    assert len(progress) == 1
    second = process_files([md], store, registry, settings)
    assert second["skipped"] == 1
    assert store.count_records() == 1
    output = export_workbook(store, tmp_path / "out", settings)
    wb = load_workbook(output, read_only=True, data_only=True)
    assert wb.sheetnames == ["Questions", "Review Queue", "Mapping Audit", "Duplicate Candidates", "Processing Summary"]
    assert wb["Questions"].max_row == 2
    assert (tmp_path / "out" / "long_cells.jsonl").exists()


def test_template_export_requires_and_uses_explicit_header_mapping(tmp_path):
    root = Path(__file__).parent.parent
    input_file = tmp_path / "template-source.md"
    input_file.write_text("# Demo 2024\n\nQ1. A sample prompt?\nA. Yes\nB. No\n", encoding="utf-8")
    registry = MappingRegistry(root / "config")
    from dataclasses import replace
    settings = replace(load_settings(root / "config" / "settings.yaml", root), state_db=tmp_path / "state.sqlite3",
                       column_mapping={"Prompt": "question_text", "Exam year": "exam.year"})
    store = StateStore(settings.state_db)
    process_files([input_file], store, registry, settings)
    template = tmp_path / "template.xlsx"
    template_book = Workbook()
    template_book.active.append(["Prompt", "Exam year"])
    template_book.save(template)
    result = export_workbook(store, tmp_path / "out", settings, template_path=template)
    exported = load_workbook(result, read_only=True, data_only=True)
    assert list(exported["Questions"].values)[0] == ("Prompt", "Exam year")
    assert list(exported["Questions"].values)[1] == ("A sample prompt?", 2024)
