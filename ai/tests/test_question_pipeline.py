import copy
import unittest

from dataset_pipeline.question_gate import CONTENT_FIELDS, bank_fingerprint, fingerprint, gate, validate
from dataset_pipeline.questions import build_bank


def sample():
    row = dict.fromkeys(CONTENT_FIELDS, "")
    row.update(question_id="test-1", question="Two plus two?", option_a="1", option_b="2",
               option_c="3", option_d="4", correct_answer="D", source_file="test.pdf",
               source_page=1, review_status="verified")
    return row


def approvals(rows):
    result = {row["question_id"]: {"content_sha256": fingerprint(row), "reviewer": "Test reviewer",
                                   "reviewed_at": "2026-09-23T00:00:00+00:00"} for row in rows}
    result["__coverage__"] = {"bank_sha256": bank_fingerprint(rows), "reviewer": "Test reviewer",
                              "reviewed_at": "2026-09-23T00:00:00+00:00"}
    return result


class ReviewGateTests(unittest.TestCase):
    def test_verified_snapshot_passes(self):
        rows = [sample()]
        self.assertTrue(gate(rows, approvals(rows))["ready"])

    def test_every_content_edit_invalidates_approval(self):
        row = sample()
        ledger = approvals([row])
        for key in CONTENT_FIELDS:
            changed = copy.deepcopy(row)
            changed[key] = 2 if key == "source_page" else str(changed[key]) + " changed"
            self.assertFalse(gate([changed], ledger)["ready"], key)

    def test_corrected_is_not_verified(self):
        row = sample()
        ledger = approvals([row])
        row["review_status"] = "corrected"
        self.assertFalse(gate([row], ledger)["ready"])

    def test_removed_row_invalidates_coverage(self):
        rows = [sample(), {**sample(), "question_id": "test-2"}]
        self.assertFalse(gate(rows[:1], approvals(rows))["ready"])

    def test_empty_unapproved_duplicate_fail(self):
        row = sample()
        for rows, ledger in [([], {}), ([row], {}), ([row, row], approvals([row]))]:
            self.assertFalse(gate(rows, ledger)["ready"])

    def test_invalid_answer_page_options_fail(self):
        for update in ({"correct_answer": "E"}, {"source_page": 0}, {"source_page": True},
                       {"option_b": "1"}, {"question": None}):
            self.assertTrue(validate({**sample(), **update}))

    def test_cross_page_question_and_missing_answer(self):
        document = {"source_file": "test.pdf", "source_sha256": "a" * 64, "complete": True,
                    "pages": [{"source_page": 1, "asset_directory": "test", "blocks": [
                        {"type": "text", "content": "1. Two plus two?\n(a) 1\n(b) 2"}]},
                        {"source_page": 2, "asset_directory": "test", "blocks": [
                        {"type": "text", "content": "(c) 3\n(d) 4\n2. Theory paragraph."}]}]}
        bank = build_bank(document)
        self.assertEqual(len(bank["questions"]), 1)
        self.assertEqual(bank["questions"][0]["option_d"], "4")
        self.assertEqual(bank["questions"][0]["source_page"], 1)
        self.assertEqual(bank["questions"][0]["correct_answer"], "")
        self.assertEqual(len(bank["raw_blocks"]), 2)


if __name__ == "__main__":
    unittest.main()
