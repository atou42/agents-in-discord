#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


REQUIRED_DIMENSIONS = [
    "identity",
    "appearance",
    "personality",
    "background",
    "faction",
    "relationships",
    "abilities",
    "limitations",
    "key_experiences",
]

REQUIRED_VISIBLE_DIMENSIONS = [
    "identity",
    "personality",
    "key_experiences",
    "relationships",
    "abilities",
    "limitations",
]

PROHIBITED_VISIBLE_KEYS = {
    "story_use",
    "search_keywords",
    "style_prompt",
    "generation_prompt",
    "reference_images",
    "source_url",
    "source_title",
    "fact_extraction_notes",
}

DIMENSION_ALIASES = {
    "identity": {"identity", "profile", "role"},
    "appearance": {"appearance", "visual_description", "visual_cues", "look", "silhouette"},
    "personality": {"personality", "temperament", "traits", "values"},
    "background": {"background", "history", "origin", "past"},
    "faction": {"faction", "affiliation", "allegiance", "organization"},
    "relationships": {
        "relationships",
        "relationship",
        "ties",
        "bonds",
        "key_relationships",
        "allies_enemies",
    },
    "abilities": {"abilities", "ability", "powers", "power", "skills", "combat_style"},
    "limitations": {"limitations", "limitation", "weaknesses", "weakness", "constraints", "costs"},
    "key_experiences": {
        "key_experiences",
        "key_events",
        "major_events",
        "major_experiences",
        "turning_points",
        "milestones",
    },
}


def has_text(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def canonical_key(raw_key: str) -> str:
    key = raw_key.strip().lower().replace("-", "_").replace(" ", "_")
    for dimension, aliases in DIMENSION_ALIASES.items():
        if key in aliases:
            return dimension
    return key


def load_atoms(world_import_path: Path) -> list[dict]:
    payload = json.loads(world_import_path.read_text(encoding="utf-8"))
    atoms = []
    for section in payload.get("sections", []):
        atoms.extend(section.get("atoms", []))
    if atoms:
        return atoms
    return payload.get("atoms", [])


def collect_structured_fields(atom: dict) -> dict[str, str]:
    fields = {}
    metadata = atom.get("metadata")
    if isinstance(metadata, dict):
        for raw_key, value in metadata.items():
            if has_text(value):
                fields[canonical_key(raw_key)] = str(value).strip()
    content = atom.get("content")
    if isinstance(content, list):
        for item in content:
            if not isinstance(item, dict):
                continue
            raw_key = item.get("key")
            value = item.get("value")
            if has_text(raw_key) and has_text(value):
                fields[canonical_key(str(raw_key))] = str(value).strip()
    return fields


def collect_prohibited_visible_keys(atom: dict) -> list[str]:
    found = []
    content = atom.get("content")
    if not isinstance(content, list):
        return found
    for item in content:
        if not isinstance(item, dict):
            continue
        raw_key = item.get("key")
        if not has_text(raw_key):
            continue
        key = canonical_key(str(raw_key))
        if key in PROHIBITED_VISIBLE_KEYS:
            found.append(key)
    return sorted(set(found))


def collect_visible_fields(atom: dict) -> dict[str, str]:
    fields = {}
    content = atom.get("content")
    if not isinstance(content, list):
        return fields
    for item in content:
        if not isinstance(item, dict):
            continue
        raw_key = item.get("key")
        value = item.get("value")
        if has_text(raw_key) and has_text(value):
            fields[canonical_key(str(raw_key))] = str(value).strip()
    return fields


def audit_character(atom: dict) -> dict:
    fields = collect_structured_fields(atom)
    visible_fields = collect_visible_fields(atom)
    missing_dimensions = [dimension for dimension in REQUIRED_DIMENSIONS if dimension not in fields]
    missing_visible_dimensions = [
        dimension for dimension in REQUIRED_VISIBLE_DIMENSIONS if dimension not in visible_fields
    ]
    prohibited_visible_keys = collect_prohibited_visible_keys(atom)
    notes = []
    if not has_text(atom.get("description")):
        notes.append("missing description")
    if not fields:
        notes.append("no structured character fields")
    if len(fields) < 6:
        notes.append("structured dimensions too thin")
    if not visible_fields:
        notes.append("no reader-facing content fields")
    return {
        "id": atom.get("id", ""),
        "name": atom.get("name", ""),
        "missingDimensions": missing_dimensions,
        "missingVisibleDimensions": missing_visible_dimensions,
        "prohibitedVisibleKeys": prohibited_visible_keys,
        "structuredKeys": sorted(fields.keys()),
        "visibleKeys": sorted(visible_fields.keys()),
        "notes": notes,
        "pass": (
            not missing_dimensions
            and not missing_visible_dimensions
            and not prohibited_visible_keys
            and not notes
        ),
    }


def build_report(run_dir: Path) -> dict:
    world_import_path = run_dir / "import/world_import.json"
    atoms = load_atoms(world_import_path)
    characters = [atom for atom in atoms if atom.get("type") == "character"]
    audits = [audit_character(atom) for atom in characters]
    failures = [item for item in audits if not item["pass"]]
    verdict = "PASS"
    if failures:
        verdict = "FAIL"
    return {
        "verdict": verdict,
        "worldImportPath": str(world_import_path),
        "rules": {
            "requiredDimensions": REQUIRED_DIMENSIONS,
            "requiredVisibleDimensions": REQUIRED_VISIBLE_DIMENSIONS,
            "prohibitedVisibleKeys": sorted(PROHIBITED_VISIBLE_KEYS),
        },
        "summary": {
            "characterCount": len(characters),
            "passedCount": len(characters) - len(failures),
            "failedCount": len(failures),
        },
        "failures": failures,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit character-card completeness and hygiene.")
    parser.add_argument("--run-dir", required=True)
    parser.add_argument(
        "--report-path",
        help="Optional explicit output path. Defaults to <run-dir>/checks/character_card_check.json",
    )
    args = parser.parse_args()

    run_dir = Path(args.run_dir).expanduser().resolve()
    report = build_report(run_dir)
    report_path = (
        Path(args.report_path).expanduser().resolve()
        if args.report_path
        else run_dir / "checks/character_card_check.json"
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["verdict"] == "FAIL":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
