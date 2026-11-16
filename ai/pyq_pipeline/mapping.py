from __future__ import annotations

import csv
import hashlib
import json
import re
import shutil
from pathlib import Path


def normalize(value) -> str:
    return re.sub(r"[^\w]+", " ", str(value or "").casefold(), flags=re.UNICODE).strip()


class MappingRegistry:
    FILES = {"exams": "exams.json", "subjects": "subjects.json", "chapters": "chapters.json", "topics": "topics.json"}

    def __init__(self, config_dir: Path):
        self.config_dir = Path(config_dir)
        self.data = {}
        for kind, name in self.FILES.items():
            path = self.config_dir / name
            self.data[kind] = json.loads(path.read_text(encoding="utf-8-sig")) if path.exists() else {kind: []}
        self.version = hashlib.sha256(json.dumps(self.data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        self.proposals_path = self.config_dir / "mapping-proposals.json"

    def entries(self, kind):
        raw = self.data.get(kind, {})
        return raw.get(kind, []) if isinstance(raw, dict) else raw

    def resolve(self, kind, raw_value, parent_id=None):
        if not raw_value:
            return {"raw_name": raw_value, "canonical_name": None, "id": None, "status": "unresolved", "method": "missing", "candidates": []}
        if kind == "chapters" and not parent_id:
            return {"raw_name": raw_value, "canonical_name": None, "id": None, "status": "unresolved", "method": "missing_subject", "candidates": []}
        entries = [e for e in self.entries(kind) if e.get("is_active", True)
                   and (kind != "chapters" or e.get("subject_id") == parent_id)]
        value = normalize(raw_value)
        exact_canonical = [e for e in entries if normalize(e.get("canonical_name")) == value]
        exact_alias = [e for e in entries if any(normalize(a) == value for a in e.get("aliases", []))]
        normalized = exact_canonical or exact_alias or [e for e in entries if normalize(e.get("canonical_name")) == value]
        method = "canonical" if exact_canonical else "alias" if exact_alias else "normalized"
        if len(normalized) == 1:
            entry = normalized[0]
            return {"raw_name": raw_value, "canonical_name": entry.get("canonical_name"), "id": entry.get("id"),
                    "status": "mapped" if entry.get("id") else "unresolved", "method": method, "candidates": []}
        candidates = []
        if not normalized:
            try:
                from difflib import get_close_matches
                names = [str(e.get("canonical_name", "")) for e in entries]
                candidates = get_close_matches(str(raw_value), names, n=3, cutoff=0.55)
            except Exception:
                candidates = []
        return {"raw_name": raw_value, "canonical_name": None, "id": None,
                "status": "ambiguous" if normalized or len(candidates) > 1 else "unresolved",
                "method": "ambiguous" if normalized else "fuzzy_proposal" if candidates else "unresolved", "candidates": normalized or candidates}

    def import_table(self, path: Path, kind: str):
        path = Path(path)
        if path.suffix.casefold() == ".csv":
            with path.open(encoding="utf-8-sig", newline="") as f:
                rows = list(csv.DictReader(f))
        elif path.suffix.casefold() in {".xlsx", ".xlsm"}:
            from openpyxl import load_workbook
            ws = load_workbook(path, read_only=True, data_only=True).active
            rows_iter = ws.iter_rows(values_only=True)
            headers = [str(v or "").strip() for v in next(rows_iter)]
            rows = [dict(zip(headers, row)) for row in rows_iter]
        else:
            raise ValueError("Mapping table must be CSV or XLSX")
        return [{"id": str(r.get("id") or "").strip() or None,
                 "canonical_name": str(r.get("canonical_name") or r.get("name") or "").strip(),
                 "aliases": [a.strip() for a in str(r.get("aliases") or "").split("|") if a.strip()],
                 **({"subject_id": str(r.get("subject_id"))} if r.get("subject_id") else {})} for r in rows if r.get("canonical_name") or r.get("name")]

    def audit(self):
        return {"mapping_version": self.version, "counts": {kind: len(self.entries(kind)) for kind in self.FILES}, "registry": self.data}

    def propose(self, kind, raw_value, source):
        item = {"kind": kind, "raw_value": raw_value, "source": source}
        prior = json.loads(self.proposals_path.read_text(encoding="utf-8")) if self.proposals_path.exists() else []
        key = (kind, normalize(raw_value))
        if not any((p["kind"], normalize(p["raw_value"])) == key for p in prior):
            prior.append(item)
            temp = self.proposals_path.with_suffix(".tmp")
            temp.write_text(json.dumps(prior, ensure_ascii=False, indent=2), encoding="utf-8")
            temp.replace(self.proposals_path)

    def approve_proposals(self, dry_run=False):
        if not self.proposals_path.exists():
            return "No mapping proposals to approve."
        proposals = json.loads(self.proposals_path.read_text(encoding="utf-8"))
        approved = [p for p in proposals if isinstance(p.get("approved"), dict) and p["approved"].get("id") and p["approved"].get("canonical_name")]
        if dry_run:
            return f"Dry run: {len(approved)} proposals are fully approved with a canonical name and existing ID; {len(proposals)-len(approved)} remain unresolved."
        changed = 0
        remaining = []
        for proposal in proposals:
            approval = proposal.get("approved") or {}
            kind = proposal.get("kind")
            if not (approval.get("id") and approval.get("canonical_name") and kind in self.FILES):
                remaining.append(proposal)
                continue
            entries = self.entries(kind)
            aliases = list(approval.get("aliases", []))
            aliases.append(proposal["raw_value"])
            if any(str(entry.get("id")) == str(approval["id"]) for entry in entries):
                remaining.append(proposal)
                continue
            entries.append({"id": str(approval["id"]), "canonical_name": str(approval["canonical_name"]),
                            "aliases": sorted(set(str(a) for a in aliases if a)),
                            **({"subject_id": str(approval["subject_id"])} if kind == "chapters" and approval.get("subject_id") else {})})
            changed += 1
        for kind, filename in self.FILES.items():
            self.config_dir.mkdir(parents=True, exist_ok=True)
            path = self.config_dir / filename
            content = json.dumps({kind: self.entries(kind)}, ensure_ascii=False, indent=2)
            temp = path.with_suffix(path.suffix + ".tmp")
            temp.write_text(content, encoding="utf-8")
            temp.replace(path)
        temp = self.proposals_path.with_suffix(".tmp")
        temp.write_text(json.dumps(remaining, ensure_ascii=False, indent=2), encoding="utf-8")
        temp.replace(self.proposals_path)
        return f"Approved {changed} mapping proposals with supplied canonical names and IDs; {len(remaining)} remain unresolved."
