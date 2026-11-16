import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence

try:
    from openpyxl import Workbook, load_workbook
    from openpyxl.formatting.rule import FormulaRule
    from openpyxl.worksheet.datavalidation import DataValidation
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.worksheet.table import Table, TableStyleInfo
except ImportError as exc:
    raise RuntimeError(
        "openpyxl is required. Install it with: python -m pip install openpyxl"
    ) from exc

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("JsonToExcel")

BASE_DIR = Path(__file__).resolve().parent
STRUCTURED_DIR = BASE_DIR / "structured_questions"
EXCEL_DIR = BASE_DIR / "excel_outputs"
MAX_EXCEL_TEXT = 32767

QUESTIONS_HEADERS = [
    "Question ID", "Subject", "Chapter", "Question Number", "Question Text",
    "Option A", "Option B", "Option C", "Option D", "Correct Option",
    "Correct Answer Text", "PDF Page Start", "PDF Page End", "Answer Page",
    "Answer Source", "Confidence", "Validation Status", "Warnings",
    "Table Text", "Document ID", "Extracted Correct Option",
    "Extracted Answer Text", "Question Suffix", "Question Key",
    "Normalized Question Key", "Section ID", "Question Boundary Confidence",
    "Option Grouping Confidence", "Answer Matching Confidence",
    "Chapter Assignment Confidence", "Answer Candidate Count",
    "Best Candidate Score", "Alternative Answers", "Source Element Count",
    "Extraction Profiles", "Provenance Pages", "Parser Version",
]

COLUMN_WIDTHS = {
    "A": 15, "B": 20, "C": 34, "D": 14, "E": 62,
    "F": 32, "G": 32, "H": 32, "I": 32, "J": 15,
    "K": 34, "L": 14, "M": 14, "N": 14, "O": 20,
    "P": 12, "Q": 19, "R": 44, "S": 52, "T": 32,
    "U": 18, "V": 34, "W": 13, "X": 14, "Y": 20,
    "Z": 12, "AA": 18, "AB": 18, "AC": 18, "AD": 18,
    "AE": 18, "AF": 17, "AG": 58, "AH": 18, "AI": 22,
    "AJ": 20, "AK": 14,
}

GREEN = "275D38"
GREEN_LIGHT = "E8F1E9"
YELLOW = "FFF3CD"
RED = "F8D7DA"
ORANGE = "FCE5CD"
BLUE = "D9EAF7"
WHITE = "FFFFFF"
GRAY = "E7E6E6"
LIGHT_BORDER = Side(style="thin", color="D9E2D9")


def safe_excel_text(value: Any) -> Any:
    """Prevent formula injection and enforce Excel's per-cell text limit."""
    if value is None:
        return ""
    if isinstance(value, (int, float, bool)):
        return value
    text = str(value)
    if text[:1] in {"=", "+", "-", "@"}:
        text = "'" + text
    return text[:MAX_EXCEL_TEXT]


def confidence_details(question: Dict[str, Any]) -> Dict[str, float]:
    details = question.get("confidence_details") or {}
    return details if isinstance(details, dict) else {}


def format_candidates(candidates: Sequence[Dict[str, Any]]) -> str:
    values = []
    for candidate in candidates[:5]:
        reasons = ", ".join(str(x) for x in candidate.get("reasons") or [])
        values.append(
            f"{candidate.get('correct_option', '?')} | page "
            f"{candidate.get('answer_page', '?')} | score "
            f"{candidate.get('score', 0):.3f} | {reasons}"
        )
    return safe_excel_text("\n".join(values))


def question_to_row(question: Dict[str, Any], parser_version: Any) -> List[Any]:
    details = confidence_details(question)
    candidates = question.get("answer_candidates") or []
    provenance = question.get("provenance") or {}
    extracted_option = str(question.get("correct_option") or "").upper()
    option_values = {
        "A": question.get("option_a", ""), "B": question.get("option_b", ""),
        "C": question.get("option_c", ""), "D": question.get("option_d", ""),
    }
    return [
        safe_excel_text(question.get("question_id", "")),
        safe_excel_text(question.get("subject", "")),
        safe_excel_text(question.get("chapter", "")),
        question.get("question_number", ""),
        safe_excel_text(question.get("question_text", "")),
        safe_excel_text(option_values["A"]), safe_excel_text(option_values["B"]),
        safe_excel_text(option_values["C"]), safe_excel_text(option_values["D"]),
        safe_excel_text(extracted_option), "",
        question.get("pdf_page_start", ""), question.get("pdf_page_end", ""),
        question.get("answer_page", ""), safe_excel_text(question.get("answer_source", "")),
        float(question.get("confidence") or 0),
        safe_excel_text(question.get("validation_status", "")),
        safe_excel_text(question.get("warnings", "")),
        safe_excel_text(question.get("table_text", "")),
        safe_excel_text(question.get("document_id", "")),
        safe_excel_text(extracted_option),
        safe_excel_text(question.get("correct_answer_text", "")),
        safe_excel_text(question.get("question_suffix", "")),
        safe_excel_text(question.get("question_key", question.get("question_number", ""))),
        safe_excel_text(question.get("normalized_question_key", question.get("question_number", ""))),
        question.get("section_id", ""),
        float(details.get("question_boundary") or 0),
        float(details.get("option_grouping") or 0),
        float(details.get("answer_matching") or 0),
        float(details.get("chapter_assignment") or 0),
        len(candidates),
        float(candidates[0].get("score") or 0) if candidates else 0,
        format_candidates(candidates),
        question.get("source_elements", ""),
        safe_excel_text(", ".join(str(x) for x in provenance.get("extraction_profiles") or [])),
        safe_excel_text(", ".join(str(x) for x in provenance.get("pages") or [])),
        parser_version,
    ]


def style_header(worksheet, last_column: int) -> None:
    fill = PatternFill("solid", fgColor=GREEN)
    for cell in worksheet[1][:last_column]:
        cell.fill = fill
        cell.font = Font(color=WHITE, bold=True)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(bottom=LIGHT_BORDER)
    worksheet.row_dimensions[1].height = 38


def set_question_formula(worksheet, row: int) -> None:
    worksheet[f"K{row}"] = (
        f'=SWITCH(UPPER(TRIM(J{row})),"A",F{row},"B",G{row},'
        f'"C",H{row},"D",I{row},"")'
    )


def configure_question_sheet(worksheet, row_count: int, table_name: str) -> None:
    worksheet.sheet_view.showGridLines = False
    worksheet.freeze_panes = "E2"
    worksheet.auto_filter.ref = f"A1:AK{row_count + 1}"
    style_header(worksheet, len(QUESTIONS_HEADERS))
    for column, width in COLUMN_WIDTHS.items():
        worksheet.column_dimensions[column].width = width
    for row in range(2, row_count + 2):
        set_question_formula(worksheet, row)
        worksheet[f"P{row}"].number_format = "0%"
        for column in ("AA", "AB", "AC", "AD", "AF"):
            worksheet[f"{column}{row}"].number_format = "0%"
        for column in ("E", "F", "G", "H", "I", "K", "R", "S", "V", "AG"):
            worksheet[f"{column}{row}"].alignment = Alignment(vertical="top", wrap_text=True)
        for column in ("D", "J", "L", "M", "N", "P", "Q", "U", "W", "X", "Z", "AE"):
            worksheet[f"{column}{row}"].alignment = Alignment(horizontal="center", vertical="top")
    if row_count:
        validation = DataValidation(type="list", formula1='"A,B,C,D"', allow_blank=True)
        validation.error = "Choose A, B, C, D, or leave blank."
        validation.errorTitle = "Invalid option"
        validation.prompt = "Select the reviewed correct option. Column K updates automatically."
        validation.promptTitle = "Correct Option"
        validation.showErrorMessage = True
        validation.showInputMessage = True
        worksheet.add_data_validation(validation)
        validation.add(f"J2:J{row_count + 1}")

        worksheet.conditional_formatting.add(
            f"Q2:Q{row_count + 1}",
            FormulaRule(formula=['Q2="approved"'], fill=PatternFill("solid", fgColor=GREEN_LIGHT)),
        )
        worksheet.conditional_formatting.add(
            f"Q2:Q{row_count + 1}",
            FormulaRule(formula=['Q2="review_required"'], fill=PatternFill("solid", fgColor=YELLOW)),
        )
        worksheet.conditional_formatting.add(
            f"O2:O{row_count + 1}",
            FormulaRule(formula=['O2="conflict"'], fill=PatternFill("solid", fgColor=RED)),
        )
        worksheet.conditional_formatting.add(
            f"O2:O{row_count + 1}",
            FormulaRule(formula=['O2="not_found"'], fill=PatternFill("solid", fgColor=ORANGE)),
        )
        worksheet.conditional_formatting.add(
            f"J2:J{row_count + 1}",
            FormulaRule(formula=['AND(J2<>"",J2<>U2)'], fill=PatternFill("solid", fgColor=BLUE)),
        )
        table = Table(displayName=table_name, ref=f"A1:AK{row_count + 1}")
        table.tableStyleInfo = TableStyleInfo(
            name="TableStyleMedium4", showFirstColumn=False,
            showLastColumn=False, showRowStripes=True, showColumnStripes=False,
        )
        worksheet.add_table(table)


def append_question_rows(worksheet, questions: Iterable[Dict[str, Any]], parser_version: Any) -> int:
    worksheet.append(QUESTIONS_HEADERS)
    count = 0
    for question in questions:
        worksheet.append(question_to_row(question, parser_version))
        count += 1
    return count


def create_summary_sheet(workbook: Workbook, summary: Dict[str, Any], question_count: int) -> None:
    sheet = workbook.create_sheet("Summary", 0)
    sheet.sheet_view.showGridLines = False
    sheet["A1"] = "Question Extraction Review"
    sheet["A1"].font = Font(size=18, bold=True, color=WHITE)
    sheet["A1"].fill = PatternFill("solid", fgColor=GREEN)
    sheet.merge_cells("A1:D1")
    sheet["A3"] = "Metric"; sheet["B3"] = "Value"; sheet["C3"] = "Meaning"
    metrics = [
        ("Document", safe_excel_text(summary.get("source", "")), "Source PDF"),
        ("Parser version", summary.get("parser_version", ""), "Structured parser schema"),
        ("Total PDF pages", summary.get("total_pdf_pages", 0), "Pages reported by manifest"),
        ("Processed pages", summary.get("processed_pages", 0), "Pages included in this export"),
        ("Pending pages", summary.get("pending_pages", 0), "Pages not included yet"),
        ("Extraction complete", bool(summary.get("is_complete", False)), "Must be TRUE for a final workbook"),
        ("Questions", f"=COUNTA('Questions'!$A$2:$A${question_count + 1})", "Rows in the Questions sheet"),
        ("Approved", f'=COUNTIF(\'Questions\'!$Q$2:$Q${question_count + 1},"approved")', "No parser warnings"),
        ("Review required", f'=COUNTIF(\'Questions\'!$Q$2:$Q${question_count + 1},"review_required")', "Rows requiring verification"),
        ("Printed answers", f'=COUNTIF(\'Questions\'!$O$2:$O${question_count + 1},"printed_answer_key")', "Answers confidently matched"),
        ("Conflicts", f'=COUNTIF(\'Questions\'!$O$2:$O${question_count + 1},"conflict")', "Ambiguous answer candidates"),
        ("Answers not found", f'=COUNTIF(\'Questions\'!$O$2:$O${question_count + 1},"not_found")', "No candidate answer found"),
    ]
    for row, (label, value, meaning) in enumerate(metrics, start=4):
        sheet[f"A{row}"] = label
        if isinstance(value, str) and value.startswith("="):
            sheet[f"B{row}"] = value
        else:
            sheet[f"B{row}"] = value
        sheet[f"C{row}"] = meaning
    sheet["A18"] = "Workflow"
    sheet["A19"] = "Edit Correct Option in column J of the Questions sheet. Column K updates automatically. Blue cells differ from the parser-extracted answer stored in column U."
    sheet.merge_cells("A19:D21")
    sheet["A19"].alignment = Alignment(wrap_text=True, vertical="top")
    for cell in sheet[3]:
        cell.fill = PatternFill("solid", fgColor=GREEN)
        cell.font = Font(color=WHITE, bold=True)
    sheet["A18"].font = Font(bold=True, color=GREEN)
    sheet.column_dimensions["A"].width = 25
    sheet.column_dimensions["B"].width = 28
    sheet.column_dimensions["C"].width = 55
    sheet.column_dimensions["D"].width = 4
    sheet["B4"].alignment = Alignment(wrap_text=True, vertical="top")
    sheet.row_dimensions[4].height = 42
    if not summary.get("is_complete", False):
        sheet["A23"] = "WARNING: This workbook was generated from incomplete PDF extraction. Do not treat it as the final book."
        sheet.merge_cells("A23:D24")
        sheet["A23"].fill = PatternFill("solid", fgColor=RED)
        sheet["A23"].font = Font(bold=True)
        sheet["A23"].alignment = Alignment(wrap_text=True, vertical="center")


def create_candidates_sheet(workbook: Workbook, questions: Sequence[Dict[str, Any]]) -> None:
    sheet = workbook.create_sheet("Answer Candidates")
    headers = ["Question ID", "Question Key", "Candidate Option", "Answer Page", "Score", "Reasons", "Raw Answer", "Answer Block"]
    sheet.append(headers)
    for question in questions:
        for candidate in question.get("answer_candidates") or []:
            sheet.append([
                safe_excel_text(question.get("question_id", "")),
                safe_excel_text(question.get("question_key", question.get("question_number", ""))),
                safe_excel_text(candidate.get("correct_option", "")), candidate.get("answer_page", ""),
                float(candidate.get("score") or 0),
                safe_excel_text(", ".join(str(x) for x in candidate.get("reasons") or [])),
                safe_excel_text(candidate.get("raw_answer", "")), candidate.get("answer_block_id", ""),
            ])
    sheet.sheet_view.showGridLines = False
    sheet.freeze_panes = "A2"
    style_header(sheet, len(headers))
    for column, width in {"A": 16, "B": 16, "C": 17, "D": 14, "E": 12, "F": 48, "G": 30, "H": 14}.items():
        sheet.column_dimensions[column].width = width
    for cell in sheet["E"][1:]:
        cell.number_format = "0%"
    if sheet.max_row > 1:
        table = Table(displayName="AnswerCandidatesTable", ref=f"A1:H{sheet.max_row}")
        table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium4", showRowStripes=True)
        sheet.add_table(table)


def create_provenance_sheet(workbook: Workbook, questions: Sequence[Dict[str, Any]]) -> None:
    sheet = workbook.create_sheet("Provenance")
    headers = ["Question ID", "Question Key", "PDF Pages", "Extraction Profiles", "Element References", "Bounding Boxes"]
    sheet.append(headers)
    for question in questions:
        provenance = question.get("provenance") or {}
        sheet.append([
            safe_excel_text(question.get("question_id", "")),
            safe_excel_text(question.get("question_key", question.get("question_number", ""))),
            safe_excel_text(", ".join(str(x) for x in provenance.get("pages") or [])),
            safe_excel_text(", ".join(str(x) for x in provenance.get("extraction_profiles") or [])),
            safe_excel_text(", ".join(str(x) for x in provenance.get("element_refs") or [])),
            safe_excel_text(json.dumps(provenance.get("bounding_boxes") or [], ensure_ascii=False)),
        ])
    sheet.sheet_view.showGridLines = False
    sheet.freeze_panes = "A2"
    style_header(sheet, len(headers))
    for column, width in {"A": 16, "B": 16, "C": 18, "D": 22, "E": 50, "F": 65}.items():
        sheet.column_dimensions[column].width = width
    for row_number, row in enumerate(sheet.iter_rows(min_row=2), start=2):
        sheet.row_dimensions[row_number].height = 32
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=False)
    if sheet.max_row > 1:
        table = Table(displayName="ProvenanceTable", ref=f"A1:F{sheet.max_row}")
        table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium4", showRowStripes=True)
        sheet.add_table(table)


def convert_json_to_excel(input_path: Path, output_path: Path, allow_incomplete: bool = False) -> int:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    questions = payload.get("questions")
    summary = payload.get("summary") or {}
    if not isinstance(questions, list) or not questions:
        raise ValueError("Input JSON does not contain a non-empty 'questions' array.")
    if not summary.get("is_complete", False) and not allow_incomplete:
        raise RuntimeError(
            "PDF extraction is incomplete. Finish Docling processing or rerun with "
            "--allow-incomplete to create a clearly marked partial workbook."
        )

    workbook = Workbook()
    questions_sheet = workbook.active
    questions_sheet.title = "Questions"
    parser_version = summary.get("parser_version", "")
    question_count = append_question_rows(questions_sheet, questions, parser_version)
    configure_question_sheet(questions_sheet, question_count, "QuestionsTable")

    review_sheet = workbook.create_sheet("Review Required")
    review_questions = [q for q in questions if q.get("validation_status") == "review_required"]
    review_count = append_question_rows(review_sheet, review_questions, parser_version)
    configure_question_sheet(review_sheet, review_count, "ReviewRequiredTable")
    review_sheet["J1"].comment = None

    create_summary_sheet(workbook, summary, question_count)
    create_candidates_sheet(workbook, questions)
    create_provenance_sheet(workbook, questions)
    workbook.calculation.fullCalcOnLoad = True
    workbook.calculation.forceFullCalc = True
    workbook.calculation.calcMode = "auto"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(".tmp.xlsx")
    workbook.save(temporary_path)
    temporary_path.replace(output_path)

    validation_book = load_workbook(output_path, read_only=False, data_only=False)
    expected_sheets = {"Summary", "Questions", "Review Required", "Answer Candidates", "Provenance"}
    if set(validation_book.sheetnames) != expected_sheets:
        raise RuntimeError(f"Workbook validation failed: sheets were {validation_book.sheetnames}.")
    sheet = validation_book["Questions"]
    if sheet.max_row != question_count + 1:
        raise RuntimeError("Workbook validation failed: question row count mismatch.")
    if [cell.value for cell in sheet[1]] != QUESTIONS_HEADERS:
        raise RuntimeError("Workbook validation failed: question header mismatch.")
    if question_count and not str(sheet["K2"].value or "").startswith("=SWITCH("):
        raise RuntimeError("Workbook validation failed: correct-answer formula missing.")
    if validation_book["Review Required"].max_row != review_count + 1:
        raise RuntimeError("Workbook validation failed: review row count mismatch.")
    question_ids = [sheet[f"A{row}"].value for row in range(2, sheet.max_row + 1)]
    if len(question_ids) != len(set(question_ids)):
        raise RuntimeError("Workbook validation failed: duplicate Question IDs.")
    validation_book.close()
    logger.info("Created %s with %s questions and %s review rows.", output_path, question_count, review_count)
    return question_count


def find_default_input() -> Path:
    candidates = sorted(STRUCTURED_DIR.glob("*_questions.json"))
    if len(candidates) != 1:
        raise RuntimeError("Specify --input when structured_questions contains zero or multiple JSON files.")
    return candidates[0]


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert structured question JSON into a production review workbook.")
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--allow-incomplete", action="store_true", help="Create a clearly marked partial workbook.")
    args = parser.parse_args()
    input_path = args.input.resolve() if args.input else find_default_input()
    output_path = args.output.resolve() if args.output else EXCEL_DIR / f"{input_path.stem}.xlsx"
    convert_json_to_excel(input_path, output_path, allow_incomplete=args.allow_incomplete)


if __name__ == "__main__":
    main()
