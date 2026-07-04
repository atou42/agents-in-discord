#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import stat as stat_module
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


STAGES = [
    ("world_understanding", "World understanding"),
    ("delivery_contract", "Delivery contract"),
    ("source_inventory", "Source inventory"),
    ("world_diagnosis", "World diagnosis"),
    ("style_decision", "Style decision"),
    ("atom_package", "Atom package"),
    ("studio_world_bootstrap", "Studio world bootstrap"),
    ("bound_space_import", "Bound-space import"),
    ("cover_quality", "Cover quality"),
    ("work_media", "Work and media"),
    ("board_layout", "Board layout"),
    ("final_acceptance", "Final acceptance"),
    ("workflow_sync", "Workflow sync"),
]

REQUIRED_FILES = [
    "README.md",
    "capabilities.json",
    "source_map.md",
    "delivery_contract.md",
    "execution_plan.md",
    "world_diagnosis.md",
    "style_decision.json",
    "final_report.md",
    "stage_gate_log.json",
    "coverage/source_inventory.json",
    "coverage/coverage_report.json",
    "references/fandom_reference_pack.json",
    "checks/execution_plan_check.json",
    "checks/fandom_reference_check.json",
    "checks/character_card_check.json",
    "checks/english_provenance_check.json",
    "checks/import_smoke.json",
    "checks/style_audit.json",
    "checks/visible_leaks_check.json",
    "checks/final_acceptance_audit.json",
    "import/world_import.json",
    "manifests/live_manifest.json",
    "manifests/board_placements.json",
    "screenshots/board/board-final.png",
    "screenshots/cover/world-cover.png",
]

REQUIRED_DIRS = [
    "assets/key_characters",
    "assets/key_locations",
    "assets/key_visuals",
    "references",
]

STYLE_DECISION_SOURCE_TYPES = {"style_space", "approved_style_library"}
SOURCE_INVENTORY_STAGE_ID = "source_inventory"
WORLD_DIAGNOSIS_STAGE_ID = "world_diagnosis"
STYLE_DECISION_STAGE_ID = "style_decision"
CHARACTER_REQUIRED_SECTIONS = {
    "identity": {"identity", "profile", "role", "who_they_are", "essence"},
    "personality": {
        "personality",
        "temperament",
        "values",
        "creed",
        "habit",
        "contradiction",
        "disposition",
    },
    "experience": {
        "experience",
        "experiences",
        "background",
        "history",
        "backstory",
        "past",
        "important_experiences",
        "turning_points",
    },
    "relationships": {"relationships", "relationship", "bonds", "ties", "allies_enemies"},
    "abilities": {"abilities", "ability", "powers", "power", "skills", "combat", "capabilities"},
    "limitations": {
        "limitations",
        "limitation",
        "weaknesses",
        "weakness",
        "costs",
        "constraints",
        "restrictions",
    },
}
CHARACTER_FORBIDDEN_VISIBLE_FIELDS = {
    "story_use",
    "search_keywords",
    "style_prompt",
    "generation_prompt",
    "reference_images",
    "source_url",
    "source_title",
    "fact_extraction_notes",
    "source_fetch_failures",
}
# Pipeline vocabulary that must never appear on user-visible tags.
FORBIDDEN_VISIBLE_TAGS = {"tier1", "tier2", "tier3", "tier 1", "tier 2", "tier 3"}
# Internal style-library codes (PT-01, SP-03, ...) leaking into visible copy.
# Internal style-library codes (PT-01, SP-03, ...) leaking into visible copy.
# Prefix list matches the style library's code families; extend it when the
# library grows. Kept prefix-scoped so canon names like AK-47 don't false-fail.
STYLE_CODE_PREFIXES = ("PT", "SP", "ST", "AS")
INTERNAL_CODE_RE = re.compile(
    r"\b(?:" + "|".join(STYLE_CODE_PREFIXES) + r")[-_]\d{2,3}\b", re.IGNORECASE
)
# Prompt-scaffold phrases that mark generation text leaking into creator-facing copy.
PROMPT_SCAFFOLD_RE = re.compile(
    r"\b(masterpiece|best quality|8k|ultra[- ]detailed|negative prompt|lora|trending on artstation)\b",
    re.IGNORECASE,
)
REFERENCE_SUBJECT_TYPES = {"world", "character", "location", "object", "event", "faction", "system"}
WORLD_ID_RE = re.compile(r"^world_[A-Za-z0-9]+$")
UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
DELIVERY_CONTRACT_SECTIONS = [
    "Target World",
    "Canon Boundary",
    "Primary Family",
    "Board Target Mode",
    "Visual Style Authority",
    "Final Required IDs",
    "Final Required Files",
    "Acceptance Evidence",
]
WORLD_DIAGNOSIS_SECTIONS = [
    "Narrative Pressure",
    "Entry Point",
    "Asset Center Of Gravity",
    "Relationship Structure",
    "Scale",
    "Time Structure",
    "Visual Recognition Mechanism",
    "Prose Distance",
    "Board Reading Mode",
    "Diagnosis Implications",
]
EXECUTION_PLAN_SECTIONS = [
    "Delegation Decision",
    "Parallelizable Slices",
    "Planned Workers",
    "Serial Exceptions",
    "Verification Ownership",
]
SOURCE_MAP_SECTIONS = [
    "Source Surfaces",
    "Canon Boundary",
    "Initial Diagnosis Assumptions",
]
TEMP_FILE_RE = re.compile(r"(\.lock$|\.tmp$|~$|\.temp$)", re.IGNORECASE)
CJK_RE = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\U00020000-\U0002ffff]")
WORKFLOW_HUB = Path(__file__).resolve().parent.parent
CAPABILITY_REGISTRY_PATH = WORKFLOW_HUB / "capability_registry.json"
DELEGATION_MAP_PATH = WORKFLOW_HUB / "delegation_map.json"
TARGET_LOCKS_DIR = WORKFLOW_HUB / "target_locks"
LOCKED_TARGET_KEYS = ["tier1Characters", "totalAtoms", "keyCharacterAssets", "nonCharacterAtoms"]
REQUIRED_TARGET_KEYS = ["tier1Characters", "totalAtoms", "keyCharacterAssets"]
FULL_WORLD_TIER1_FLOOR_RATIO = 0.15
FULL_WORLD_TIER1_FLOOR_MIN = 12
DELIVERY_SCALES = {"full_world", "core_sample"}
IMPORT_SMOKE_MAX_SAMPLE = 10
STYLE_AUDIT_ASSET_DIRS = ["assets/key_characters", "assets/key_locations", "assets/key_visuals"]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slugify(text: str) -> str:
    value = text.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "world-run"


def read_json(path: Path, expect: type | None = dict):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"missing file: {path}")
    except json.JSONDecodeError as exc:
        fail(f"bad json in {path}: {exc}")
    if expect is not None and not isinstance(data, expect):
        fail(f"expected a JSON {expect.__name__} in {path}, got {type(data).__name__}")
    return data


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_if_missing(path: Path, content: str) -> None:
    if not path.exists():
        ensure_parent(path)
        path.write_text(content, encoding="utf-8")


def has_nonempty_string(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        fail(f"missing file: {path}")


def has_markdown_section(text: str, heading: str) -> bool:
    pattern = re.compile(rf"^##+\s+{re.escape(heading)}\s*$", re.IGNORECASE | re.MULTILINE)
    return bool(pattern.search(text))


def markdown_section_body(text: str, heading: str) -> str:
    pattern = re.compile(
        rf"^##+\s+{re.escape(heading)}\s*$\n?(.*?)(?=^##+\s+|\Z)",
        re.IGNORECASE | re.MULTILINE | re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        return ""
    return match.group(1).strip()


def list_non_readme_files(path: Path) -> list[Path]:
    if not path.exists() or not path.is_dir():
        return []
    files = []
    for item in path.iterdir():
        if item.is_file() and item.name.lower() != "readme.md":
            files.append(item)
    return files


def stage_index(stage_id: str) -> int:
    for index, (current_stage_id, _) in enumerate(STAGES):
        if current_stage_id == stage_id:
            return index
    fail(f"unknown stage id: {stage_id}")


def style_decision_template() -> dict:
    return {
        "selectedStyle": {
            "sourceType": "",
            "sourceId": "",
            "sourceName": "",
            "sourceUrl": "",
        },
        "selectionEvidence": [
            {
                "kind": "query_log_or_screenshot",
                "path": "",
                "note": "",
            }
        ],
        "selectionRationale": "",
        "worldFitSummary": "",
        "unifiedStyleStatement": "",
        "referencePackPath": "references/fandom_reference_pack.json",
        "referenceSubjectsUsed": [],
        "negativeConstraints": [
            "no live-action",
            "no film-still imitation",
            "no cross-style contamination",
        ],
        "subjectGuidance": {
            "characters": "",
            "locations": "",
            "objects": "",
            "events": "",
            "keyVisuals": "",
        },
        "selectionExecutor": "clean-context style selector subagent",
        "verifiedBy": "main-builder",
    }


def fandom_reference_pack_template(world_name: str, wiki: str, scope: str) -> dict:
    return {
        "worldName": world_name,
        "wiki": wiki,
        "scope": scope,
        "purpose": "Fandom-grounded reference pack used before style selection and asset generation.",
        "referenceSubjects": [
            {
                "subjectType": "character",
                "subjectName": "",
                "fandomPageTitle": "",
                "fandomPageUrl": "",
                "whyItMatters": "Identity anchor for style and later cover generation.",
                "referenceImages": [
                    {
                        "url": "",
                        "label": "",
                        "usage": "style_selection",
                    }
                ],
            }
        ],
        "styleSelectionSet": {
            "referenceSubjectNames": [],
            "mustCover": ["characters", "locations", "objects", "events", "keyVisuals"],
            "notes": "",
        },
    }


def validate_fandom_reference_pack(base: Path, expected_wiki: str = "") -> tuple[list[str], list[str], dict]:
    path = base / "references/fandom_reference_pack.json"
    failures = []
    warnings = []
    report = {
        "path": str(path),
        "subjectCount": 0,
        "imageCount": 0,
        "subjectTypes": {},
        "styleSelectionSubjectCount": 0,
    }
    if not path.exists():
        return ["references/fandom_reference_pack.json missing"], warnings, report

    payload = read_json(path)
    if not has_nonempty_string(payload.get("worldName")):
        failures.append("fandom_reference_pack.json missing worldName")
    if not has_nonempty_string(payload.get("wiki")):
        failures.append("fandom_reference_pack.json missing wiki")
    elif expected_wiki and payload.get("wiki") != expected_wiki:
        failures.append(
            f"fandom_reference_pack.json wiki mismatch: expected {expected_wiki}, got {payload.get('wiki')}"
        )
    if not has_nonempty_string(payload.get("scope")):
        failures.append("fandom_reference_pack.json missing scope")

    subjects = payload.get("referenceSubjects")
    if not isinstance(subjects, list) or not subjects:
        failures.append("fandom_reference_pack.json needs non-empty referenceSubjects")
        return failures, warnings, report

    seen_subjects = set()
    has_character = False
    has_non_character = False
    total_images = 0
    for index, subject in enumerate(subjects):
        if not isinstance(subject, dict):
            failures.append(f"referenceSubjects[{index}] must be an object")
            continue
        subject_type = subject.get("subjectType")
        if subject_type not in REFERENCE_SUBJECT_TYPES:
            failures.append(
                f"referenceSubjects[{index}] subjectType must be one of {sorted(REFERENCE_SUBJECT_TYPES)}"
            )
        else:
            report["subjectTypes"][subject_type] = report["subjectTypes"].get(subject_type, 0) + 1
            if subject_type == "character":
                has_character = True
            else:
                has_non_character = True
        subject_name = subject.get("subjectName")
        if not has_nonempty_string(subject_name):
            failures.append(f"referenceSubjects[{index}] missing subjectName")
            subject_key = f"<subject-{index}>"
        else:
            subject_key = subject_name.strip()
        seen_subjects.add(subject_key)
        for key in ["fandomPageTitle", "fandomPageUrl", "whyItMatters"]:
            if not has_nonempty_string(subject.get(key)):
                failures.append(f"referenceSubjects[{index}] missing {key}")
        images = subject.get("referenceImages")
        if not isinstance(images, list) or not images:
            failures.append(f"referenceSubjects[{index}] needs at least one referenceImages entry")
            continue
        for image_index, image in enumerate(images):
            if not isinstance(image, dict):
                failures.append(
                    f"referenceSubjects[{index}].referenceImages[{image_index}] must be an object"
                )
                continue
            if not has_nonempty_string(image.get("url")):
                failures.append(
                    f"referenceSubjects[{index}].referenceImages[{image_index}] missing url"
                )
            if not has_nonempty_string(image.get("usage")):
                failures.append(
                    f"referenceSubjects[{index}].referenceImages[{image_index}] missing usage"
                )
            total_images += 1

    report["subjectCount"] = len(seen_subjects)
    report["imageCount"] = total_images
    # The floor scales with delivery scope. A fixed floor of 3 let the Cyberpunk
    # full_world run judge style for a 30-character cast on 5 subjects / 8 images.
    min_subjects, min_images = 3, 3
    lock = read_target_lock(base)
    if lock and lock.get("deliveryScale") == "full_world":
        tier1 = lock.get("targets", {}).get("tier1Characters")
        if isinstance(tier1, int) and tier1 >= 20:
            min_subjects = max(min_subjects, min(12, tier1 // 3))
            min_images = max(min_images, min(20, tier1 // 2))
    report["minSubjects"] = min_subjects
    report["minImages"] = min_images
    if len(seen_subjects) < min_subjects:
        failures.append(
            f"fandom_reference_pack.json needs at least {min_subjects} distinct reference subjects"
            f" for this delivery scale (found {len(seen_subjects)})"
        )
    if total_images < min_images:
        failures.append(
            f"fandom_reference_pack.json needs at least {min_images} total reference images"
            f" for this delivery scale (found {total_images})"
        )
    if not has_character:
        failures.append("fandom_reference_pack.json needs at least one character reference subject")
    if not has_non_character:
        failures.append(
            "fandom_reference_pack.json needs at least one non-character reference subject for world/style range"
        )

    style_selection = payload.get("styleSelectionSet")
    if not isinstance(style_selection, dict):
        failures.append("fandom_reference_pack.json missing styleSelectionSet object")
        return failures, warnings, report
    selection_names = style_selection.get("referenceSubjectNames")
    if not isinstance(selection_names, list) or not selection_names:
        failures.append("styleSelectionSet.referenceSubjectNames must be a non-empty list")
    else:
        usable_names = []
        for item in selection_names:
            if has_nonempty_string(item):
                usable_names.append(item.strip())
                if item.strip() not in seen_subjects:
                    failures.append(
                        f"styleSelectionSet.referenceSubjectNames includes unknown subject: {item.strip()}"
                    )
        report["styleSelectionSubjectCount"] = len(usable_names)
        if len(usable_names) < 3:
            failures.append("styleSelectionSet.referenceSubjectNames must name at least three subjects")
    must_cover = style_selection.get("mustCover")
    if not isinstance(must_cover, list) or len([item for item in must_cover if has_nonempty_string(item)]) < 5:
        failures.append("styleSelectionSet.mustCover must list characters, locations, objects, events, and keyVisuals")
    if not has_nonempty_string(style_selection.get("notes")):
        warnings.append("fandom_reference_pack.json styleSelectionSet.notes is empty")

    return failures, warnings, report


def validate_delivery_contract(base: Path, manifest: dict) -> tuple[list[str], list[str]]:
    path = base / "delivery_contract.md"
    failures = []
    warnings = []
    if not path.exists():
        return ["delivery_contract.md missing"], warnings
    text = read_text(path)
    lowered = text.lower()
    if "fill this before production starts" in lowered:
        failures.append("delivery_contract.md still contains scaffold placeholder text")
    if len(text.strip()) < 400:
        failures.append("delivery_contract.md too short")
    for heading in DELIVERY_CONTRACT_SECTIONS:
        if not has_markdown_section(text, heading):
            failures.append(f"delivery_contract.md missing section: {heading}")
    world_name = manifest["world"].get("name", "")
    if world_name and world_name not in text:
        warnings.append("delivery_contract.md does not mention the target world name explicitly")
    return failures, warnings


def validate_execution_plan(base: Path, manifest: dict) -> tuple[list[str], list[str], dict]:
    path = base / "execution_plan.md"
    failures = []
    warnings = []
    report = {
        "path": str(path),
        "delegatedWorkerMentioned": False,
        "parallelSliceKeywords": [],
    }
    if not path.exists():
        return ["execution_plan.md missing"], warnings, report

    text = read_text(path)
    lowered = text.lower()
    if len(text.strip()) < 350:
        failures.append("execution_plan.md too short")
    if "[one short paragraph]" in lowered:
        failures.append("execution_plan.md still contains scaffold placeholder text")
    if (
        "record the first delegated slice here." in lowered
        or "name the independent slices that should be delegated in parallel" in lowered
    ):
        failures.append("execution_plan.md still contains scaffold instruction text")
    for heading in EXECUTION_PLAN_SECTIONS:
        if not has_markdown_section(text, heading):
            failures.append(f"execution_plan.md missing section: {heading}")

    world = manifest.get("world", {})
    if world.get("name") and world["name"] not in text:
        warnings.append("execution_plan.md does not mention the target world name explicitly")

    decision_body = markdown_section_body(text, "Delegation Decision")
    slices_body = markdown_section_body(text, "Parallelizable Slices")
    workers_body = markdown_section_body(text, "Planned Workers")
    serial_body = markdown_section_body(text, "Serial Exceptions")
    verify_body = markdown_section_body(text, "Verification Ownership")

    if len(decision_body) < 60:
        failures.append("execution_plan.md Delegation Decision is too short")
    if len(slices_body) < 60:
        failures.append("execution_plan.md Parallelizable Slices is too short")
    if len(workers_body) < 60:
        failures.append("execution_plan.md Planned Workers is too short")
    if len(serial_body) < 40:
        failures.append("execution_plan.md Serial Exceptions is too short")
    if len(verify_body) < 40:
        failures.append("execution_plan.md Verification Ownership is too short")

    worker_keywords = ["subagent", "sub-agent", "worker", "verifier"]
    report["delegatedWorkerMentioned"] = any(keyword in lowered for keyword in worker_keywords)
    if not report["delegatedWorkerMentioned"]:
        failures.append("execution_plan.md must name at least one delegated subagent, worker, or verifier")

    slice_keywords = [
        "source inventory",
        "world diagnosis",
        "style",
        "character",
        "verification",
        "cover",
        "board",
        "asset",
    ]
    report["parallelSliceKeywords"] = [keyword for keyword in slice_keywords if keyword in slices_body.lower()]
    if not report["parallelSliceKeywords"]:
        failures.append(
            "execution_plan.md Parallelizable Slices must name at least one concrete slice where subagents improve speed or quality"
        )

    if "serial" not in serial_body.lower() and "cannot" not in serial_body.lower() and "must stay" not in serial_body.lower():
        warnings.append("execution_plan.md Serial Exceptions does not clearly explain what must remain serial")
    if "main builder" not in verify_body.lower() and "main agent" not in verify_body.lower():
        warnings.append("execution_plan.md Verification Ownership does not clearly name main-builder acceptance ownership")

    delegation_map = {}
    if DELEGATION_MAP_PATH.exists():
        try:
            delegation_map = json.loads(DELEGATION_MAP_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            warnings.append(f"delegation map unreadable: {DELEGATION_MAP_PATH}")
    else:
        warnings.append(f"delegation map missing: {DELEGATION_MAP_PATH}")
    unaddressed = []
    for slice_item in delegation_map.get("slices", []):
        if not isinstance(slice_item, dict) or slice_item.get("default") != "delegate":
            continue
        keyword = str(slice_item.get("keyword", "")).lower()
        if keyword and not re.search(rf"\b{re.escape(keyword)}\b", lowered):
            unaddressed.append(f"{slice_item.get('sliceKey', '?')} (keyword: {keyword})")
    report["unaddressedDelegationSlices"] = unaddressed
    if unaddressed:
        failures.append(
            "execution_plan.md does not address default-delegate slices from delegation_map.json"
            " (adopt each or justify serial under Serial Exceptions): " + "; ".join(unaddressed)
        )

    return failures, warnings, report


def validate_source_map(base: Path, manifest: dict) -> tuple[list[str], list[str]]:
    path = base / "source_map.md"
    failures = []
    warnings = []
    if not path.exists():
        return ["source_map.md missing"], warnings
    text = read_text(path)
    if len(text.strip()) < 250:
        failures.append("source_map.md too short")
    for heading in SOURCE_MAP_SECTIONS:
        if not has_markdown_section(text, heading):
            failures.append(f"source_map.md missing section: {heading}")
    world = manifest["world"]
    if world.get("wiki") and world["wiki"] not in text:
        warnings.append("source_map.md does not mention the target wiki explicitly")
    if world.get("scope") and world["scope"] not in text:
        warnings.append("source_map.md does not mention the declared scope explicitly")
    return failures, warnings


def validate_world_diagnosis(base: Path, manifest: dict) -> tuple[list[str], list[str]]:
    path = base / "world_diagnosis.md"
    failures = []
    warnings = []
    if not path.exists():
        return ["world_diagnosis.md missing"], warnings
    text = read_text(path)
    lowered = text.lower()
    if "record diagnosis before atom writing" in lowered:
        failures.append("world_diagnosis.md still contains scaffold placeholder text")
    if len(text.strip()) < 500:
        failures.append("world_diagnosis.md too short")
    for heading in WORLD_DIAGNOSIS_SECTIONS:
        if not has_markdown_section(text, heading):
            failures.append(f"world_diagnosis.md missing section: {heading}")
    world = manifest.get("world", {})
    if not has_nonempty_string(world.get("primaryFamily")):
        failures.append("run_manifest world.primaryFamily missing")
    if not has_nonempty_string(world.get("secondaryLens")):
        warnings.append("run_manifest world.secondaryLens missing")
    return failures, warnings


def validate_source_inventory(base: Path, manifest: dict) -> tuple[list[str], list[str], dict]:
    inventory_path = base / "coverage/source_inventory.json"
    report_path = base / "coverage/coverage_report.json"
    failures = []
    warnings = []
    report = {"inventoryPath": str(inventory_path), "reportPath": str(report_path)}

    inventory = read_json(inventory_path)
    coverage = read_json(report_path)
    world = manifest["world"]

    if not has_nonempty_string(inventory.get("world")):
        failures.append("coverage/source_inventory.json missing world")
    if not has_nonempty_string(inventory.get("scope")):
        failures.append("coverage/source_inventory.json missing scope")
    elif world.get("scope") and inventory.get("scope") != world.get("scope"):
        warnings.append("coverage/source_inventory.json scope differs from run manifest")

    sources = inventory.get("sources")
    if not isinstance(sources, list) or not sources:
        failures.append("coverage/source_inventory.json needs non-empty sources")
    else:
        fandom_sources = [item for item in sources if isinstance(item, dict) and item.get("type") == "fandom"]
        if not fandom_sources:
            failures.append("coverage/source_inventory.json needs at least one fandom source")
        else:
            matching_wiki = False
            for item in fandom_sources:
                if item.get("wiki") == world.get("wiki"):
                    matching_wiki = True
            if world.get("wiki") and not matching_wiki:
                failures.append("coverage/source_inventory.json fandom source wiki does not match run manifest")

    commands = inventory.get("commands")
    if not isinstance(commands, list) or len([item for item in commands if has_nonempty_string(item)]) < 3:
        failures.append("coverage/source_inventory.json needs at least three source commands")

    summary = inventory.get("candidateSummary")
    required_summary_keys = ["characters", "locations", "organizations", "events", "systems", "objects"]
    if not isinstance(summary, dict):
        failures.append("coverage/source_inventory.json missing candidateSummary object")
    else:
        for key in required_summary_keys:
            item = summary.get(key)
            if not isinstance(item, dict):
                failures.append(f"coverage/source_inventory.json missing candidateSummary.{key}")
                continue
            if not has_nonempty_string(item.get("observedSurface")):
                failures.append(f"coverage/source_inventory.json missing candidateSummary.{key}.observedSurface")
            if not has_nonempty_string(item.get("planningNote")):
                failures.append(f"coverage/source_inventory.json missing candidateSummary.{key}.planningNote")

    if not has_nonempty_string(inventory.get("groupingPressure")):
        warnings.append("coverage/source_inventory.json missing groupingPressure")

    exclusions = inventory.get("exclusions")
    if not isinstance(exclusions, list) or not exclusions:
        failures.append("coverage/source_inventory.json needs non-empty exclusions list")

    if not has_nonempty_string(coverage.get("planningVerdict")):
        failures.append("coverage/coverage_report.json missing planningVerdict")
    if not has_nonempty_string(coverage.get("coverageShape")):
        failures.append("coverage/coverage_report.json missing coverageShape")
    numeric_targets = coverage.get("numericTargets")
    if not isinstance(numeric_targets, dict):
        failures.append(
            "coverage/coverage_report.json missing numericTargets object"
            " (declare at least tier1Characters so later gates can measure delivery)"
        )
    else:
        tier1 = numeric_targets.get("tier1Characters")
        if not isinstance(tier1, int) or tier1 <= 0:
            failures.append("coverage/coverage_report.json numericTargets.tier1Characters must be a positive integer")
        for optional_key in ["totalAtoms", "keyCharacterAssets"]:
            value = numeric_targets.get(optional_key)
            if value is not None and (not isinstance(value, int) or value <= 0):
                failures.append(f"coverage/coverage_report.json numericTargets.{optional_key} must be a positive integer when set")
        if "totalAtoms" not in numeric_targets:
            warnings.append("coverage/coverage_report.json numericTargets.totalAtoms not declared; import gate cannot measure atom delivery")
        if "keyCharacterAssets" not in numeric_targets:
            warnings.append("coverage/coverage_report.json numericTargets.keyCharacterAssets not declared; cover gate cannot measure asset delivery")
    next_step_risks = coverage.get("nextStepRisks")
    if not isinstance(next_step_risks, list) or not next_step_risks:
        failures.append("coverage/coverage_report.json needs non-empty nextStepRisks")
    if not has_nonempty_string(coverage.get("acceptanceReadiness")):
        failures.append("coverage/coverage_report.json missing acceptanceReadiness")
    limitations = coverage.get("limitations")
    if not isinstance(limitations, list):
        failures.append("coverage/coverage_report.json limitations must be a list")

    report["sourceCount"] = len(sources) if isinstance(sources, list) else 0
    report["commandCount"] = len(commands) if isinstance(commands, list) else 0
    return failures, warnings, report


def validate_style_decision(base: Path) -> tuple[list[str], list[str]]:
    path = base / "style_decision.json"
    failures = []
    warnings = []
    if not path.exists():
        return ["style_decision.json missing"], warnings

    payload = read_json(path)
    fandom_failures, fandom_warnings, fandom_report = validate_fandom_reference_pack(base)
    fandom_subjects = set(fandom_report.get("subjectTypes", {}).keys())
    reference_pack_path = payload.get("referencePackPath")
    if reference_pack_path != "references/fandom_reference_pack.json":
        failures.append("style_decision.json referencePackPath must be references/fandom_reference_pack.json")
    if fandom_failures:
        failures.append("style_decision.json depends on a missing or invalid fandom reference pack")
    elif fandom_warnings:
        warnings.extend(fandom_warnings)

    selected = payload.get("selectedStyle")
    if not isinstance(selected, dict):
        return ["style_decision.json missing selectedStyle object"], warnings

    source_type = selected.get("sourceType")
    if source_type not in STYLE_DECISION_SOURCE_TYPES:
        failures.append(
            "style_decision.json selectedStyle.sourceType must be style_space or approved_style_library"
        )
    for key in ["sourceId", "sourceName"]:
        if not has_nonempty_string(selected.get(key)):
            failures.append(f"style_decision.json missing selectedStyle.{key}")

    evidence = payload.get("selectionEvidence")
    if not isinstance(evidence, list) or not evidence:
        failures.append("style_decision.json missing selectionEvidence")
    else:
        usable_evidence = 0
        for index, item in enumerate(evidence):
            if not isinstance(item, dict):
                failures.append(f"style_decision.json selectionEvidence[{index}] must be an object")
                continue
            if has_nonempty_string(item.get("path")):
                usable_evidence += 1
                evidence_path = base / str(item["path"]).strip()
                if not evidence_path.exists():
                    failures.append(
                        f"style_decision.json selectionEvidence[{index}] path does not exist: {item['path']}"
                    )
        if usable_evidence == 0:
            failures.append("style_decision.json selectionEvidence needs at least one non-empty path")

    if not has_nonempty_string(payload.get("selectionRationale")):
        failures.append("style_decision.json missing selectionRationale")
    elif len(payload["selectionRationale"].strip()) < 40:
        failures.append("style_decision.json selectionRationale too short")

    if not has_nonempty_string(payload.get("worldFitSummary")):
        failures.append("style_decision.json missing worldFitSummary")
    if not has_nonempty_string(payload.get("unifiedStyleStatement")):
        failures.append("style_decision.json missing unifiedStyleStatement")

    reference_subjects = payload.get("referenceSubjectsUsed")
    if not isinstance(reference_subjects, list) or len([item for item in reference_subjects if has_nonempty_string(item)]) < 3:
        failures.append("style_decision.json referenceSubjectsUsed must name at least three Fandom reference subjects")
    else:
        pack_payload = read_json(base / "references/fandom_reference_pack.json")
        subject_names = {
            item.get("subjectName", "").strip()
            for item in pack_payload.get("referenceSubjects", [])
            if isinstance(item, dict) and has_nonempty_string(item.get("subjectName"))
        }
        style_selection_names = {
            str(item).strip()
            for item in pack_payload.get("styleSelectionSet", {}).get("referenceSubjectNames", [])
            if has_nonempty_string(item)
        }
        for item in reference_subjects:
            if not has_nonempty_string(item):
                continue
            name = str(item).strip()
            if name not in subject_names:
                failures.append(f"style_decision.json referenceSubjectsUsed includes unknown subject: {name}")
            if style_selection_names and name not in style_selection_names:
                failures.append(
                    f"style_decision.json referenceSubjectsUsed must come from styleSelectionSet.referenceSubjectNames: {name}"
                )

    negative_constraints = payload.get("negativeConstraints")
    if not isinstance(negative_constraints, list) or len([x for x in negative_constraints if has_nonempty_string(x)]) < 2:
        failures.append("style_decision.json needs at least two negativeConstraints")

    guidance = payload.get("subjectGuidance")
    if not isinstance(guidance, dict):
        failures.append("style_decision.json missing subjectGuidance object")
    else:
        for key in ["characters", "locations", "objects", "events", "keyVisuals"]:
            if not has_nonempty_string(guidance.get(key)):
                failures.append(f"style_decision.json missing subjectGuidance.{key}")

    if not has_nonempty_string(payload.get("selectionExecutor")):
        failures.append("style_decision.json missing selectionExecutor (who actually ran the selection)")
    elif "subagent" not in payload["selectionExecutor"].lower() and "clean-context" not in payload["selectionExecutor"].lower():
        warnings.append("style_decision.json selectionExecutor does not mention a clean-context subagent")

    if not has_nonempty_string(payload.get("verifiedBy")):
        failures.append("style_decision.json missing verifiedBy (sub reports are not evidence without main-builder review)")

    # Style is an aesthetic judgment machines cannot verify. For full_world runs
    # the decision must be confirmed by the user before the gate passes: present
    # the candidate comparison and recommendation, get approval, and record it.
    # The Cyberpunk run picked a generic hero-splash style over the library's own
    # Cyberpunk entry with a plausible-sounding rationale nobody reviewed.
    lock = read_target_lock(base)
    if lock and lock.get("deliveryScale") == "full_world":
        approval = payload.get("userApproval")
        if not isinstance(approval, dict):
            failures.append(
                "style_decision.json missing userApproval: full_world style decisions require"
                " explicit user confirmation. Present the candidates and recommendation to the"
                ' user, then record {"approvedBy": "user", "approvedAt": <ISO time>,'
                ' "candidatesPresented": [...]}.'
            )
        else:
            if approval.get("approvedBy") != "user":
                failures.append('style_decision.json userApproval.approvedBy must be "user"')
            if _parse_iso_ts(approval.get("approvedAt", "")) is None:
                failures.append("style_decision.json userApproval.approvedAt missing or not an ISO timestamp")
            candidates = approval.get("candidatesPresented")
            if not isinstance(candidates, list) or len([c for c in candidates if has_nonempty_string(c)]) < 2:
                failures.append(
                    "style_decision.json userApproval.candidatesPresented must list at least two"
                    " candidates that were shown to the user (a single-option confirmation is not a choice)"
                )

    return failures, warnings


def validate_bootstrap_ids(base: Path, manifest: dict) -> tuple[list[str], list[str], dict]:
    failures = []
    warnings = []
    world = manifest["world"]
    report = {
        "worldId": world.get("worldId", ""),
        "spaceId": world.get("spaceId", ""),
        "studioUrl": world.get("studioUrl", ""),
        "cohubUrl": world.get("cohubUrl", ""),
    }
    world_id = world.get("worldId", "")
    space_id = world.get("spaceId", "")
    if not has_nonempty_string(world_id) or not WORLD_ID_RE.match(str(world_id)):
        failures.append("run_manifest world.worldId missing or invalid")
    if not has_nonempty_string(space_id) or not UUID_RE.match(str(space_id)):
        failures.append("run_manifest world.spaceId missing or invalid")
    studio_url = world.get("studioUrl", "")
    if not has_nonempty_string(studio_url):
        failures.append("run_manifest world.studioUrl missing")
    elif world_id and world_id not in studio_url:
        failures.append("run_manifest world.studioUrl does not include worldId")
    cohub_url = world.get("cohubUrl", "")
    if not has_nonempty_string(cohub_url):
        failures.append("run_manifest world.cohubUrl missing")
    elif space_id and space_id not in cohub_url:
        failures.append("run_manifest world.cohubUrl does not include spaceId")
    if not has_nonempty_string(world.get("primaryFamily")):
        warnings.append("run_manifest world.primaryFamily missing at bootstrap stage")
    return failures, warnings, report


def count_import_atoms(payload: dict) -> int:
    if not isinstance(payload, dict):
        return 0
    total = 0
    for section in payload.get("sections", []):
        if isinstance(section, dict) and isinstance(section.get("atoms"), list):
            total += len(section["atoms"])
    return total


def count_import_non_character_atoms(payload: dict) -> int:
    if not isinstance(payload, dict):
        return 0
    total = 0
    for section in payload.get("sections", []):
        if not isinstance(section, dict) or not isinstance(section.get("atoms"), list):
            continue
        for atom in section["atoms"]:
            if isinstance(atom, dict) and atom.get("type") not in (None, "", "character"):
                total += 1
    return total


def validate_import_draft_coverage(base: Path) -> tuple[list[str], list[str], dict]:
    """Before live import, atom_package must already respect the locked planning bar."""
    failures = []
    warnings = []
    import_doc = read_json(base / "import/world_import.json")
    import_atoms = _collect_all_atoms(import_doc)
    report = {
        "importAtomCount": count_import_atoms(import_doc),
        "importCharacterCount": len(collect_character_entries_from_world_import(import_doc)),
        "importNonCharacterCount": count_import_non_character_atoms(import_doc),
    }

    targets = coverage_numeric_targets(base)
    total_target = targets.get("totalAtoms")
    if isinstance(total_target, int) and total_target > 0:
        report["totalAtomsTarget"] = total_target
        if report["importAtomCount"] < total_target:
            failures.append(
                f"import atom count {report['importAtomCount']} is below the declared"
                f" numericTargets.totalAtoms {total_target}; atom_package cannot PASS while the"
                " draft import is still materially below the locked delivery bar"
            )
    else:
        warnings.append("numericTargets.totalAtoms missing; draft import coverage cannot be measured")

    tier1_target = targets.get("tier1Characters")
    if isinstance(tier1_target, int) and tier1_target > 0:
        report["tier1CharactersTarget"] = tier1_target
        effective_tier1_coverage = report["importCharacterCount"]
        cap_resolution_path = base / "checks/import_cap_resolution.json"
        if report["importCharacterCount"] < tier1_target and cap_resolution_path.exists():
            resolution = read_json(cap_resolution_path)
            overflow = resolution.get("tier1CharacterOverflow")
            represented = 0
            missing_overflow = []
            import_index = {
                (atom.get("type"), atom.get("name"))
                for atom in import_atoms
                if isinstance(atom, dict)
            }
            if not isinstance(overflow, list):
                failures.append("checks/import_cap_resolution.json tier1CharacterOverflow must be a list")
            else:
                for item in overflow:
                    if not isinstance(item, dict):
                        failures.append(
                            "checks/import_cap_resolution.json tier1CharacterOverflow entries must be objects"
                        )
                        continue
                    name = item.get("representationAtomName")
                    atom_type = item.get("representationType")
                    if not has_nonempty_string(name) or not has_nonempty_string(atom_type):
                        failures.append(
                            "checks/import_cap_resolution.json tier1CharacterOverflow entries need"
                            " representationAtomName and representationType"
                        )
                        continue
                    if (atom_type, name) in import_index:
                        represented += 1
                    else:
                        missing_overflow.append(f"{atom_type}:{name}")
            effective_tier1_coverage += represented
            report["tier1DraftCapResolution"] = {
                "path": str(cap_resolution_path),
                "tier1OverflowRepresented": represented,
                "effectiveTier1Coverage": effective_tier1_coverage,
                "missingOverflowRepresentations": missing_overflow,
            }
            if missing_overflow:
                failures.append(
                    "checks/import_cap_resolution.json points to missing import overflow atoms: "
                    + ", ".join(missing_overflow)
                )
        report["effectiveTier1CharacterCoverage"] = effective_tier1_coverage
        if effective_tier1_coverage < tier1_target:
            failures.append(
                f"effective import tier1 character coverage {effective_tier1_coverage} is below the declared"
                f" numericTargets.tier1Characters {tier1_target}; the draft import has not yet met the"
                " locked major-character floor"
            )
    else:
        warnings.append("numericTargets.tier1Characters missing; draft major-character coverage cannot be measured")

    non_char_target = targets.get("nonCharacterAtoms")
    if isinstance(non_char_target, int) and non_char_target > 0:
        report["nonCharacterAtomsTarget"] = non_char_target
        if report["importNonCharacterCount"] < non_char_target:
            failures.append(
                f"import non-character atom count {report['importNonCharacterCount']} is below the declared"
                f" numericTargets.nonCharacterAtoms {non_char_target}; atom_package must not devolve into"
                " a character-only draft"
            )
    elif non_char_target is None:
        warnings.append("numericTargets.nonCharacterAtoms missing; draft world-shape balance cannot be measured")

    return failures, warnings, report


def validate_import_state(base: Path) -> tuple[list[str], list[str], dict]:
    failures = []
    warnings = []
    import_doc = read_json(base / "import/world_import.json")
    live_manifest = load_live_payload(base)
    report = {
        "importAtomCount": count_import_atoms(import_doc),
        "liveAtomCount": len(live_manifest.get("atoms", [])) if isinstance(live_manifest.get("atoms"), list) else 0,
        "liveWorkCount": len(live_manifest.get("works", [])) if isinstance(live_manifest.get("works"), list) else 0,
        "tempResidue": [],
    }

    for key in ["worldName", "description", "visualStyle", "seedPrompt"]:
        if not has_nonempty_string(import_doc.get(key)):
            failures.append(f"import/world_import.json missing {key}")
    sections = import_doc.get("sections")
    if not isinstance(sections, list) or not sections:
        failures.append("import/world_import.json needs non-empty sections")
    else:
        for index, section in enumerate(sections):
            if not isinstance(section, dict):
                failures.append(f"import/world_import.json sections[{index}] must be an object")
                continue
            if not has_nonempty_string(section.get("section")):
                failures.append(f"import/world_import.json sections[{index}] missing section id")
            if not isinstance(section.get("atoms"), list) or not section.get("atoms"):
                failures.append(f"import/world_import.json sections[{index}] needs non-empty atoms")

    if report["importAtomCount"] == 0:
        failures.append("import/world_import.json has zero import atoms")
    atoms = live_manifest.get("atoms")
    if not isinstance(atoms, list) or not atoms:
        failures.append("manifests/live_manifest.json has zero live atoms")
    if report["importAtomCount"] and report["liveAtomCount"] != report["importAtomCount"]:
        failures.append(
            f"live atom count mismatch: import={report['importAtomCount']} live={report['liveAtomCount']}"
        )

    targets = coverage_numeric_targets(base)
    total_target = targets.get("totalAtoms")
    if isinstance(total_target, int) and total_target > 0:
        report["totalAtomsTarget"] = total_target
        if report["liveAtomCount"] < total_target:
            failures.append(
                f"live atom count {report['liveAtomCount']} is below the declared numericTargets.totalAtoms {total_target};"
                " deliver the target or revise coverage_report with a documented reason"
            )
    tier1_target = targets.get("tier1Characters")
    if isinstance(tier1_target, int) and tier1_target > 0:
        live_characters = collect_character_entries_from_live_manifest(live_manifest)
        report["tier1CharactersTarget"] = tier1_target
        report["liveCharacterCount"] = len(live_characters)
        effective_tier1_coverage = len(live_characters)
        cap_resolution_path = base / "checks/import_cap_resolution.json"
        if len(live_characters) < tier1_target and cap_resolution_path.exists():
            resolution = read_json(cap_resolution_path)
            overflow = resolution.get("tier1CharacterOverflow")
            represented = 0
            missing_overflow = []
            live_index = {
                (atom.get("type"), atom.get("name"))
                for atom in live_manifest.get("atoms", [])
                if isinstance(atom, dict)
            }
            if not isinstance(overflow, list):
                failures.append("checks/import_cap_resolution.json tier1CharacterOverflow must be a list")
            else:
                for item in overflow:
                    if not isinstance(item, dict):
                        failures.append(
                            "checks/import_cap_resolution.json tier1CharacterOverflow entries must be objects"
                        )
                        continue
                    name = item.get("representationAtomName")
                    atom_type = item.get("representationType")
                    if not has_nonempty_string(name) or not has_nonempty_string(atom_type):
                        failures.append(
                            "checks/import_cap_resolution.json tier1CharacterOverflow entries need"
                            " representationAtomName and representationType"
                        )
                        continue
                    if (atom_type, name) in live_index:
                        represented += 1
                    else:
                        missing_overflow.append(f"{atom_type}:{name}")
            effective_tier1_coverage += represented
            report["tier1CapResolution"] = {
                "path": str(cap_resolution_path),
                "tier1OverflowRepresented": represented,
                "effectiveTier1Coverage": effective_tier1_coverage,
                "missingOverflowRepresentations": missing_overflow,
            }
            if missing_overflow:
                failures.append(
                    "checks/import_cap_resolution.json points to missing live overflow atoms: "
                    + ", ".join(missing_overflow)
                )
        report["effectiveTier1CharacterCoverage"] = effective_tier1_coverage
        if effective_tier1_coverage < tier1_target:
            failures.append(
                f"effective live tier1 character coverage {effective_tier1_coverage} is below the declared"
                f" numericTargets.tier1Characters {tier1_target}"
            )
    non_char_target = targets.get("nonCharacterAtoms")
    if isinstance(non_char_target, int) and non_char_target > 0:
        live_atoms = live_manifest.get("atoms", [])
        non_char = [
            a for a in live_atoms
            if isinstance(a, dict) and a.get("type") not in (None, "", "character")
        ]
        report["nonCharacterAtomsTarget"] = non_char_target
        report["liveNonCharacterCount"] = len(non_char)
        if len(non_char) < non_char_target:
            failures.append(
                f"live non-character atom count {len(non_char)} is below the declared"
                f" numericTargets.nonCharacterAtoms {non_char_target};"
                " the world must not degrade into a character-only wall"
            )

    for path in base.rglob("*"):
        if not path.is_file():
            continue
        if TEMP_FILE_RE.search(path.name):
            report["tempResidue"].append(str(path.relative_to(base)))
    if report["tempResidue"]:
        failures.append("run directory contains lock or temp residue")

    return failures, warnings, report


def validate_cover_assets(base: Path, manifest: dict) -> tuple[list[str], list[str], dict]:
    failures = []
    warnings = []
    world_cover = base / "screenshots/cover/world-cover.png"
    key_characters = list_non_readme_files(base / "assets/key_characters")
    key_locations = list_non_readme_files(base / "assets/key_locations")
    key_visuals = list_non_readme_files(base / "assets/key_visuals")
    report = {
        "worldCoverExists": world_cover.exists(),
        "keyCharacterAssetCount": len(key_characters),
        "keyLocationAssetCount": len(key_locations),
        "keyVisualAssetCount": len(key_visuals),
    }
    if not world_cover.exists() or world_cover.stat().st_size == 0:
        failures.append("screenshots/cover/world-cover.png missing or empty")
    if len(key_characters) == 0:
        failures.append("assets/key_characters has no exported assets")
    if len(key_visuals) == 0:
        failures.append("assets/key_visuals has no exported assets")
    if manifest.get("delivery", {}).get("requiresKeyLocationAssets") and len(key_locations) == 0:
        failures.append("assets/key_locations has no exported assets")
    targets = coverage_numeric_targets(base)
    key_target = targets.get("keyCharacterAssets")
    if isinstance(key_target, int) and key_target > 0:
        report["keyCharacterAssetTarget"] = key_target
        if len(key_characters) < key_target:
            failures.append(
                f"assets/key_characters has {len(key_characters)} assets, below the declared"
                f" numericTargets.keyCharacterAssets {key_target}"
            )

    # Per-character coverage: every live character atom should have an archived
    # asset whose filename contains its slugified name. Card-only cast members
    # (12 of 30 in the Cyberpunk run) are reported by name.
    if (base / "manifests/live_manifest.json").exists():
        live = load_live_payload(base)
        live_chars = [
            a.get("name", "") for a in live.get("atoms", [])
            if isinstance(a, dict) and a.get("type") == "character" and has_nonempty_string(a.get("name"))
        ]
        if live_chars:
            asset_slugs = " ".join(slugify(item.stem) for item in key_characters)
            unarchived = [name for name in live_chars if slugify(name) not in asset_slugs]
            report["liveCharacterCount"] = len(live_chars)
            report["charactersWithoutAssets"] = unarchived
            lock = read_target_lock(base)
            waived = bool(lock and lock.get("assetCoverageWaived"))
            if unarchived and not waived:
                shown = ", ".join(unarchived[:8]) + (f" (+{len(unarchived)-8} more)" if len(unarchived) > 8 else "")
                failures.append(
                    f"{len(unarchived)} live character(s) have no archived asset in assets/key_characters:"
                    f" {shown}. Archive an asset per character or relock with --waive-asset-coverage."
                )
    return failures, warnings, report


def validate_work_media(base: Path) -> tuple[list[str], list[str], dict]:
    failures = []
    warnings = []
    live_manifest = load_live_payload(base)
    works = live_manifest.get("works")
    report = {"workCount": len(works) if isinstance(works, list) else 0}
    if not isinstance(works, list) or not works:
        failures.append("manifests/live_manifest.json has no linked works")
    return failures, warnings, report


def validate_board_layout(base: Path) -> tuple[list[str], list[str], dict]:
    failures = []
    warnings = []
    placements_path = base / "manifests/board_placements.json"
    screenshot_path = base / "screenshots/board/board-final.png"
    placements = read_json(placements_path, expect=None)
    live_manifest = load_live_payload(base)
    atom_count = len(live_manifest.get("atoms", [])) if isinstance(live_manifest.get("atoms"), list) else 0
    work_count = len(live_manifest.get("works", [])) if isinstance(live_manifest.get("works"), list) else 0
    placement_count = len(placements) if isinstance(placements, list) else 0
    report = {
        "placementCount": placement_count,
        "atomCount": atom_count,
        "workCount": work_count,
        "boardScreenshotExists": screenshot_path.exists(),
    }
    if not isinstance(placements, list) or not placements:
        failures.append("manifests/board_placements.json has no placements")
    if placement_count and placement_count < atom_count + work_count:
        failures.append("board placements count is lower than atoms plus works")
    if not screenshot_path.exists() or screenshot_path.stat().st_size == 0:
        failures.append("screenshots/board/board-final.png missing or empty")
    return failures, warnings, report


def _iter_visible_text(payload) -> list:
    """Collect visible copy strings from an import package or live manifest."""
    texts = []

    def visit_atom(atom: dict) -> None:
        for key, value in extract_visible_pairs(atom):
            texts.append(value)
        for field in ["worldName", "name", "title", "prologue", "description"]:
            if has_nonempty_string(atom.get(field)):
                texts.append(atom[field].strip())
        tags = atom.get("tags")
        if isinstance(tags, list):
            for tag in tags:
                if has_nonempty_string(tag):
                    texts.append(str(tag).strip())

    if isinstance(payload, dict):
        for field in ["worldName", "description", "coreConflict", "prologue"]:
            if has_nonempty_string(payload.get(field)):
                texts.append(payload[field].strip())
        for section in payload.get("sections", []):
            if isinstance(section, dict):
                if has_nonempty_string(section.get("title")):
                    texts.append(section["title"].strip())
                for atom in section.get("atoms", []):
                    if isinstance(atom, dict):
                        visit_atom(atom)
        for atom in payload.get("atoms", []):
            if isinstance(atom, dict):
                visit_atom(atom)
        for work in payload.get("works", []):
            if isinstance(work, dict):
                visit_atom(work)
    return texts


def validate_english_provenance(base: Path, sources=("import", "live")) -> tuple[list[str], list[str], dict]:
    """Fail if visible copy still carries CJK text unless a Cohub English-space pass is recorded."""
    failures = []
    warnings = []
    report = {"cjkSamples": {}, "cohubEvidence": None, "sourcesChecked": list(sources)}

    surface_texts = {}
    if "import" in sources:
        import_doc = read_json(base / "import/world_import.json")
        surface_texts["import"] = _iter_visible_text(import_doc)
    if "live" in sources:
        live_manifest = load_live_payload(base)
        surface_texts["live"] = _iter_visible_text(live_manifest)

    cjk_hits = {}
    for surface, texts in surface_texts.items():
        hits = [t[:60] for t in texts if CJK_RE.search(t)]
        if hits:
            cjk_hits[surface] = hits[:5]
    report["cjkSamples"] = cjk_hits

    # Look for a recorded Cohub English-space pass. To count as evidence the
    # cache must show actual translated pairs, not just a forged space id.
    cohub_ok = False
    for candidate in [
        base / "import/cohub_translation_cache.json",
        base / "references/english_pass_evidence.json",
    ]:
        if not candidate.exists():
            continue
        data = read_json(candidate)
        meta = data.get("meta") if isinstance(data, dict) else None
        space_id = ""
        if isinstance(meta, dict):
            space_id = str(meta.get("spaceId", ""))
        elif isinstance(data, dict):
            space_id = str(data.get("cohubSpaceId", ""))
        if space_id:
            translations = data.get("translations") or data.get("entries")
            pair_count = len(translations) if isinstance(translations, (dict, list)) else 0
            report["cohubEvidence"] = {
                "path": str(candidate.relative_to(base)),
                "spaceId": space_id,
                "pairCount": pair_count,
            }
            expected = _capability_space_id(base, "englishExpressionSpace")
            if expected and space_id != expected:
                failures.append(
                    f"english provenance space {space_id} does not match capability registry {expected}"
                )
            elif pair_count == 0:
                warnings.append(
                    "english evidence file records the right space but zero translated pairs;"
                    " it does not prove a real translation pass"
                )
            else:
                cohub_ok = True
            break

    if cjk_hits:
        detail = "; ".join(f"{surface}: {samples[0]}" for surface, samples in cjk_hits.items())
        failures.append(f"visible copy still contains CJK text and must be authored/polished in English: {detail}")

    if not cohub_ok and report["cohubEvidence"] is None:
        warnings.append(
            "no Cohub English-space evidence found; acceptable only if all visible copy was authored directly in English"
        )

    return failures, warnings, report


def _capability_space_id(base: Path, key: str) -> str:
    cap_path = base / "capabilities.json"
    if not cap_path.exists():
        return ""
    try:
        data = json.loads(cap_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return ""
    if not isinstance(data, dict):
        return ""
    entry = data.get(key)
    if isinstance(entry, dict):
        return str(entry.get("spaceId", ""))
    return ""


def validate_import_smoke(base: Path) -> tuple[list[str], list[str], dict]:
    """Require an evidenced small-batch dry-run that produced atomsAdded > 0 before full import."""
    path = base / "checks/import_smoke.json"
    failures = []
    warnings = []
    report = {"path": str(path)}
    if not path.exists():
        return ["checks/import_smoke.json missing (run a small dry-run import before the full import)"], warnings, report
    data = read_json(path)
    sample_size = data.get("sampleSize")
    atoms_added = data.get("atomsAdded")
    if not isinstance(sample_size, int) or sample_size <= 0:
        failures.append("import_smoke.json sampleSize must be a positive integer")
    elif sample_size > IMPORT_SMOKE_MAX_SAMPLE:
        warnings.append(f"import_smoke.json sampleSize {sample_size} is larger than a smoke test needs")
    if not isinstance(atoms_added, int) or atoms_added <= 0:
        failures.append("import_smoke.json atomsAdded must be a positive integer proving the schema imports")
    if not has_nonempty_string(data.get("samplePath")):
        failures.append("import_smoke.json missing samplePath pointing at the dry-run package")
    if not has_nonempty_string(data.get("importedAt")):
        warnings.append("import_smoke.json missing importedAt timestamp")
    report.update({"sampleSize": sample_size, "atomsAdded": atoms_added})
    return failures, warnings, report


def _latest_asset_mtime(base: Path) -> float:
    latest = 0.0
    for rel in STYLE_AUDIT_ASSET_DIRS:
        for item in list_non_readme_files(base / rel):
            latest = max(latest, item.stat().st_mtime)
    cover = base / "screenshots/cover/world-cover.png"
    if cover.exists():
        latest = max(latest, cover.stat().st_mtime)
    return latest


def validate_style_audit(base: Path) -> tuple[list[str], list[str], dict]:
    """A clean-context verifier must sign off asset/style consistency after assets are final."""
    path = base / "checks/style_audit.json"
    failures = []
    warnings = []
    report = {"path": str(path)}
    if not path.exists():
        return ["checks/style_audit.json missing (clean-context style/consistency sign-off required)"], warnings, report
    data = read_json(path)
    if data.get("verdict") != "PASS":
        failures.append(f"style_audit.json verdict is {data.get('verdict')!r}, must be PASS")
    executor = data.get("executor", "")
    if not has_nonempty_string(executor):
        failures.append("style_audit.json missing executor")
    elif "subagent" not in executor.lower() and "clean-context" not in executor.lower():
        warnings.append("style_audit.json executor should be a clean-context subagent, not the main builder self-approving")
    if not has_nonempty_string(data.get("summary")) or len(str(data.get("summary", "")).strip()) < 80:
        failures.append(
            "style_audit.json summary must substantively describe the style findings"
            " (at least 80 characters); an empty summary proves nothing was reviewed"
        )
    if not has_nonempty_string(data.get("verifierSessionId")):
        failures.append(
            "style_audit.json missing verifierSessionId: record the clean-context"
            " subagent/session identifier that performed the audit, so it is traceable"
        )
    assets = data.get("assetsReviewed")
    if not isinstance(assets, list) or len(assets) < 1:
        failures.append("style_audit.json must list the assets reviewed")
    else:
        # The audit must cover the assets that actually exist, not a stale or partial list.
        actual_assets = set()
        for rel in STYLE_AUDIT_ASSET_DIRS:
            for item in list_non_readme_files(base / rel):
                actual_assets.add(str(item.relative_to(base)))
        reviewed = {str(item).strip() for item in assets if has_nonempty_string(item)}
        unreviewed = sorted(actual_assets - reviewed)
        report["actualAssetCount"] = len(actual_assets)
        report["reviewedCount"] = len(reviewed)
        if unreviewed:
            failures.append(
                "style_audit.json assetsReviewed does not cover all exported assets;"
                f" unreviewed: {', '.join(unreviewed[:5])}"
                + (f" (+{len(unreviewed)-5} more)" if len(unreviewed) > 5 else "")
            )
    if not has_nonempty_string(data.get("styleDecisionRef")):
        failures.append("style_audit.json must reference the style_decision it judged against")
    audited_at = data.get("auditedAt")
    if not has_nonempty_string(audited_at):
        failures.append("style_audit.json missing auditedAt timestamp")
    else:
        try:
            audited_ts = datetime.fromisoformat(str(audited_at).replace("Z", "+00:00")).timestamp()
            latest_asset = _latest_asset_mtime(base)
            report["auditedTs"] = audited_ts
            report["latestAssetTs"] = latest_asset
            if latest_asset and audited_ts + 1 < latest_asset:
                failures.append(
                    "style_audit.json auditedAt predates the latest asset change; re-audit after the last asset edit"
                )
        except ValueError:
            failures.append(
                "style_audit.json auditedAt is not an ISO timestamp; freshness cannot be verified, re-audit with a valid timestamp"
            )
    report["verdict"] = data.get("verdict")
    return failures, warnings, report


def _parse_iso_ts(value: str) -> float | None:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError):
        return None


def _stage_passed_ts(base: Path, stage_id: str) -> float | None:
    stage_log = read_json(base / "stage_gate_log.json")
    for stage in stage_log.get("stages", []):
        if stage.get("stageId") == stage_id:
            return _parse_iso_ts(stage.get("passedAt", ""))
    return None


def validate_snapshot_freshness(base: Path) -> tuple[list[str], list[str], dict]:
    """Live snapshots must postdate bound_space_import PASS, else work/board gates read stale state."""
    failures = []
    warnings = []
    report = {}
    import_ts = _stage_passed_ts(base, "bound_space_import")
    report["boundSpaceImportPassedAt"] = import_ts
    snapshots = {
        "manifests/live_manifest.json": "liveManifestMtime",
        "manifests/board_placements.json": "boardPlacementsMtime",
    }
    for relative, report_key in snapshots.items():
        path = base / relative
        if not path.exists():
            failures.append(f"{relative} missing")
            continue
        mtime = path.stat().st_mtime
        report[report_key] = mtime
        if import_ts and mtime + 1 < import_ts:
            failures.append(
                f"{relative} predates the bound_space_import PASS; re-pull the live snapshot"
                " so work/board gates measure current state, not a stale copy"
            )
    screenshot = base / "screenshots/board/board-final.png"
    placements = base / "manifests/board_placements.json"
    if screenshot.exists() and placements.exists():
        if screenshot.stat().st_mtime + 1 < placements.stat().st_mtime:
            failures.append(
                "screenshots/board/board-final.png is older than board_placements.json;"
                " re-capture the board after the latest placement change"
            )
    return failures, warnings, report


def validate_final_acceptance_audit(base: Path) -> tuple[list[str], list[str], dict]:
    """final_acceptance needs a clean-context verdict file, same mechanism as style_audit."""
    path = base / "checks/final_acceptance_audit.json"
    failures = []
    warnings = []
    report = {"path": str(path)}
    if not path.exists():
        return [
            "checks/final_acceptance_audit.json missing (a clean-context verifier must sign off"
            " the final delivery; the main builder may not self-approve final acceptance)"
        ], warnings, report
    data = read_json(path)
    if data.get("verdict") != "PASS":
        failures.append(f"final_acceptance_audit.json verdict is {data.get('verdict')!r}, must be PASS")
    executor = data.get("executor", "")
    if not has_nonempty_string(executor):
        failures.append("final_acceptance_audit.json missing executor")
    elif "subagent" not in executor.lower() and "clean-context" not in executor.lower():
        failures.append(
            "final_acceptance_audit.json executor must be a clean-context subagent,"
            " not the main builder self-approving"
        )
    checked = data.get("checkedArtifacts")
    if not isinstance(checked, list) or len(checked) < 3:
        failures.append(
            "final_acceptance_audit.json must list at least three checkedArtifacts"
            " (e.g. final_report.md, board screenshot, live manifest)"
        )
    audited_at = data.get("auditedAt")
    audited_ts = _parse_iso_ts(audited_at) if audited_at else None
    if audited_ts is None:
        failures.append("final_acceptance_audit.json auditedAt missing or not an ISO timestamp")
    else:
        latest = 0.0
        for relative in [
            "final_report.md",
            "screenshots/board/board-final.png",
            "manifests/live_manifest.json",
            "manifests/board_placements.json",
        ]:
            path_item = base / relative
            if path_item.exists():
                latest = max(latest, path_item.stat().st_mtime)
        report["auditedTs"] = audited_ts
        report["latestArtifactTs"] = latest
        if latest and audited_ts + 1 < latest:
            failures.append(
                "final_acceptance_audit.json auditedAt predates the latest delivery artifact;"
                " re-run the clean-context acceptance after the last change"
            )
    if not has_nonempty_string(data.get("summary")) or len(str(data.get("summary", "")).strip()) < 80:
        failures.append(
            "final_acceptance_audit.json summary must substantively describe what was verified"
            " (at least 80 characters); an empty or token summary is not an acceptance review"
        )
    if not has_nonempty_string(data.get("verifierSessionId")):
        failures.append(
            "final_acceptance_audit.json missing verifierSessionId: record the clean-context"
            " subagent/session identifier that performed the review, so the audit is traceable"
        )
    report["verdict"] = data.get("verdict")
    return failures, warnings, report


def validate_capabilities(base: Path) -> tuple[list[str], list[str]]:
    path = base / "capabilities.json"
    if not path.exists():
        return ["capabilities.json missing (init-run should snapshot the capability registry)"], []
    failures = []
    warnings = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"capabilities.json is not valid JSON: {exc}"], []
    if not isinstance(data, dict):
        return [f"capabilities.json must be a JSON object, got {type(data).__name__}"], []
    for key in ["englishExpressionSpace", "styleSpace", "importSamples"]:
        if key not in data:
            failures.append(f"capabilities.json missing {key}")
    eng = data.get("englishExpressionSpace")
    if isinstance(eng, dict) and not has_nonempty_string(eng.get("spaceId")):
        failures.append("capabilities.json englishExpressionSpace.spaceId is empty")
    return failures, warnings


def coverage_numeric_targets(base: Path) -> dict:
    coverage = read_json(base / "coverage/coverage_report.json")
    targets = coverage.get("numericTargets")
    return targets if isinstance(targets, dict) else {}


# --- Target lock: anti-downgrade ratchet ---------------------------------------
#
# The 2026-07-03 Frieren run edited numericTargets down from 18/140/12 to 5/5/5
# mid-run so the gates would measure against the shrunken delivery. The lock
# closes that path: targets are snapshotted OUTSIDE the run dir (workflow hub),
# fingerprinted, made read-only, and git-committed. Every stage PASS from
# source_inventory onward requires the coverage report to equal the lock
# exactly. Relocking is ratchet-only: numbers may rise, never fall.


def _lock_path_for_run(base: Path) -> Path:
    digest = hashlib.sha256(str(base.resolve()).encode("utf-8")).hexdigest()[:16]
    return TARGET_LOCKS_DIR / f"{base.resolve().name}-{digest}.lock.json"


def _lock_fingerprint(payload: dict) -> str:
    keys = ["runDir", "targets", "deliveryScale", "observedSurface", "lockedAt", "relockOf"]
    # Include newer fields only when present so fingerprints of older locks stay valid.
    if "assetCoverageWaived" in payload:
        keys.append("assetCoverageWaived")
    body = {key: payload.get(key) for key in keys}
    return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def _git_commit_lock(lock_path: Path, message: str) -> str:
    try:
        subprocess.run(
            ["git", "add", str(lock_path)],
            cwd=str(WORKFLOW_HUB), capture_output=True, text=True, timeout=30, check=True,
        )
        result = subprocess.run(
            ["git", "commit", "-m", message, "--", str(lock_path)],
            cwd=str(WORKFLOW_HUB), capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            return "committed"
        return f"commit skipped: {result.stdout.strip() or result.stderr.strip()}"
    except (subprocess.SubprocessError, OSError) as exc:
        return f"commit failed: {exc}"


def read_target_lock(base: Path) -> dict | None:
    lock_path = _lock_path_for_run(base)
    if not lock_path.exists():
        return None
    data = read_json(lock_path)
    return data


def validate_target_lock(base: Path, manifest: dict) -> tuple[list[str], list[str], dict]:
    failures = []
    warnings = []
    lock = read_target_lock(base)
    report = {"lockPath": str(_lock_path_for_run(base)), "locked": lock is not None}
    if lock is None:
        failures.append(
            "no target lock found; run lock-targets before source_inventory can PASS"
            " (targets must be frozen outside the run dir so they cannot be edited down mid-run)"
        )
        return failures, warnings, report

    recorded_fingerprint = lock.get("fingerprint", "")
    if _lock_fingerprint(lock) != recorded_fingerprint:
        failures.append("target lock fingerprint mismatch: the lock file itself was edited after creation")

    locked_run_dir = lock.get("runDir", "")
    if locked_run_dir and locked_run_dir != str(base.resolve()):
        failures.append(f"target lock belongs to a different run dir: {locked_run_dir}")

    locked_targets = lock.get("targets", {})
    current_targets = coverage_numeric_targets(base)
    report["lockedTargets"] = locked_targets
    report["currentTargets"] = {key: current_targets.get(key) for key in LOCKED_TARGET_KEYS}
    for key in LOCKED_TARGET_KEYS:
        locked_value = locked_targets.get(key)
        current_value = current_targets.get(key)
        if locked_value is None:
            continue
        if current_value != locked_value:
            failures.append(
                f"numericTargets.{key} was changed after locking: locked={locked_value} current={current_value};"
                " downgrading delivery targets mid-run is forbidden — restore the locked value"
                " (a genuine scope change requires relock-targets with user approval, and numbers can only go up)"
            )

    scale = lock.get("deliveryScale", "")
    report["deliveryScale"] = scale
    manifest_scale = manifest.get("delivery", {}).get("deliveryScale", "")
    if manifest_scale and scale and manifest_scale != scale:
        failures.append(
            f"run_manifest deliveryScale {manifest_scale!r} does not match locked scale {scale!r}"
        )
    return failures, warnings, report


def _tier1_floor(observed_characters: int) -> int:
    return max(FULL_WORLD_TIER1_FLOOR_MIN, int(observed_characters * FULL_WORLD_TIER1_FLOOR_RATIO))


def lock_targets(args: argparse.Namespace) -> None:
    base, manifest, stage_log = load_run(args.run_dir)
    targets = coverage_numeric_targets(base)
    missing = [key for key in REQUIRED_TARGET_KEYS if not isinstance(targets.get(key), int) or targets.get(key) <= 0]
    if missing:
        fail("cannot lock: coverage_report numericTargets missing or non-positive: " + ", ".join(missing))
    extra_bad = [
        key for key in LOCKED_TARGET_KEYS
        if key not in REQUIRED_TARGET_KEYS and targets.get(key) is not None
        and (not isinstance(targets.get(key), int) or targets.get(key) <= 0)
    ]
    if extra_bad:
        fail("cannot lock: optional numericTargets present but non-positive: " + ", ".join(extra_bad))
    if targets.get("nonCharacterAtoms") is None and args.delivery_scale == "full_world":
        print(
            "WARNING: numericTargets.nonCharacterAtoms not declared; a full-world board without a"
            " non-character floor can degrade into a character-only wall",
            file=sys.stderr,
        )

    # Every tier-1 character deserves an archived asset. The Cyberpunk 2077 run
    # locked keyCharacterAssets=18 against tier1Characters=30, leaving 12 core
    # cast members card-only — each gate was numerically green while the gap
    # hid in the difference. Assets must cover the cast unless explicitly waived.
    tier1_value = targets.get("tier1Characters")
    key_assets_value = targets.get("keyCharacterAssets")
    if (
        isinstance(tier1_value, int) and isinstance(key_assets_value, int)
        and key_assets_value < tier1_value and not args.waive_asset_coverage
    ):
        fail(
            f"cannot lock: keyCharacterAssets={key_assets_value} is below tier1Characters={tier1_value}."
            " Every tier-1 character needs an archived asset; raise the target or pass"
            " --waive-asset-coverage with a documented reason in the coverage report."
        )

    # Observed-surface numbers must be backed by raw source output, not self-report.
    # The first Cyberpunk lock understated the surface (reported 20 while 50-result
    # windows existed) because nothing required the raw evidence to exist at lock time.
    evidence_dir = base / "coverage/observed_surface_evidence"
    if args.delivery_scale == "full_world":
        evidence_files = list_non_readme_files(evidence_dir)
        if not evidence_files:
            fail(
                "cannot lock full_world: coverage/observed_surface_evidence/ has no raw source outputs."
                " Save the actual fandom category/search command outputs there so the observed"
                " character surface is verifiable, then lock."
            )

    # The planning verifier snapshots the targets it accepted. Locking below that
    # snapshot means someone edited coverage_report down between planning PASS and
    # lock time — the exact pre-lock window the Frieren run exploited (planning
    # said 18/140/12, first lock was 13/18/5).
    planning_check_path = base / "checks/planning_package_check.json"
    if planning_check_path.exists():
        planning_check = read_json(planning_check_path)
        verified = planning_check.get("verifiedNumericTargets")
        if isinstance(verified, dict):
            for key, verified_value in verified.items():
                current_value = targets.get(key)
                if isinstance(verified_value, int) and isinstance(current_value, int) and current_value < verified_value:
                    fail(
                        f"cannot lock: numericTargets.{key}={current_value} is below the planning-verified"
                        f" value {verified_value} recorded in checks/planning_package_check.json."
                        " Targets were edited down after planning verification; restore them or re-run"
                        " the planning verifier on an honestly revised package."
                    )

    scale = args.delivery_scale
    if scale not in DELIVERY_SCALES:
        fail(f"--delivery-scale must be one of {sorted(DELIVERY_SCALES)}")

    observed = args.observed_characters
    if scale == "full_world":
        if observed is None or observed <= 0:
            fail(
                "--observed-characters is required for full_world scale"
                " (the character-page count actually seen on the source surface)"
            )
        # Cross-check the self-reported count against the source inventory's own
        # record, so the floor cannot be lowered by understating the surface.
        inventory_path = base / "coverage/source_inventory.json"
        if inventory_path.exists():
            inventory = read_json(inventory_path)
            observed_text = str(
                inventory.get("candidateSummary", {}).get("characters", {}).get("observedSurface", "")
            )
            counts = [
                int(match) for match in re.findall(r"\b(\d{2,4})\b", observed_text)
                if 10 <= int(match) <= 5000 and not (1900 <= int(match) <= 2099)
            ]
            if counts and observed < max(counts):
                fail(
                    f"--observed-characters {observed} is below the character surface recorded in"
                    f" coverage/source_inventory.json ({max(counts)} per its own observedSurface text)."
                    " The floor cannot be lowered by understating the observed surface."
                )
        floor = _tier1_floor(observed)
        if targets["tier1Characters"] < floor:
            fail(
                f"tier1Characters target {targets['tier1Characters']} is below the full_world floor {floor}"
                f" (= max({FULL_WORLD_TIER1_FLOOR_MIN}, {int(FULL_WORLD_TIER1_FLOOR_RATIO*100)}% of {observed} observed characters)."
                " Either raise the target or lock the run as core_sample with explicit user approval."
            )
    if scale == "core_sample" and args.approved_by != "user":
        fail(
            "core_sample scale requires --approved-by user: an agent may not unilaterally"
            " decide a run is a reduced sample; that decision belongs to the user"
        )

    lock_path = _lock_path_for_run(base)
    existing = read_target_lock(base)
    if existing and not args.relock:
        fail(f"target lock already exists: {lock_path}. Use relock-targets to raise targets.")
    if existing and args.relock:
        old_targets = existing.get("targets", {})
        for key in LOCKED_TARGET_KEYS:
            old_value = old_targets.get(key)
            new_value = targets.get(key)
            if isinstance(old_value, int) and isinstance(new_value, int) and new_value < old_value:
                fail(
                    f"relock refused: numericTargets.{key} would drop from {old_value} to {new_value}."
                    " The ratchet only turns one way — targets can rise, never fall."
                )
        old_scale = existing.get("deliveryScale", "")
        if old_scale == "full_world" and scale == "core_sample":
            fail("relock refused: a full_world run cannot be downgraded to core_sample")

    payload = {
        "runDir": str(base.resolve()),
        "worldName": manifest["world"].get("name", ""),
        "targets": {key: targets[key] for key in LOCKED_TARGET_KEYS if isinstance(targets.get(key), int)},
        "deliveryScale": scale,
        "observedSurface": {"characters": observed} if observed else {},
        "lockedAt": utc_now(),
        "lockedBy": args.locked_by,
        "assetCoverageWaived": bool(args.waive_asset_coverage),
        "relockOf": existing.get("fingerprint", "") if existing else "",
    }
    payload["fingerprint"] = _lock_fingerprint(payload)

    TARGET_LOCKS_DIR.mkdir(parents=True, exist_ok=True)
    if lock_path.exists():
        lock_path.chmod(lock_path.stat().st_mode | stat_module.S_IWUSR)
    write_json(lock_path, payload)
    lock_path.chmod(stat_module.S_IRUSR | stat_module.S_IRGRP | stat_module.S_IROTH)
    git_status = _git_commit_lock(lock_path, f"target-lock: {payload['worldName']} {scale} {payload['targets']}")

    manifest.setdefault("delivery", {})["deliveryScale"] = scale
    save_run(base, manifest, stage_log)
    print(json.dumps({"status": "LOCKED", "lockPath": str(lock_path), "git": git_status, "lock": payload}, ensure_ascii=False, indent=2))


def extract_visible_pairs(payload: dict) -> list[tuple[str, str]]:
    pairs = []
    if has_nonempty_string(payload.get("description")):
        pairs.append(("description", payload["description"].strip()))

    def append_from_content(content) -> None:
        if isinstance(content, list):
            for item in content:
                if not isinstance(item, dict):
                    continue
                key = item.get("key") or item.get("label") or item.get("name") or "content"
                value = item.get("value") or item.get("text") or item.get("body")
                if has_nonempty_string(key) and has_nonempty_string(value):
                    pairs.append((str(key).strip(), str(value).strip()))
        elif isinstance(content, dict):
            for key, value in content.items():
                if has_nonempty_string(key) and has_nonempty_string(value):
                    pairs.append((str(key).strip(), str(value).strip()))
        elif has_nonempty_string(content):
            pairs.append(("content", str(content).strip()))

    for field in ["content", "visibleContent", "visible_content"]:
        append_from_content(payload.get(field))
    return pairs


def collect_character_entries_from_world_import(payload: dict) -> list[dict]:
    entries = []
    if not isinstance(payload, dict):
        return entries
    for section in payload.get("sections", []):
        if not isinstance(section, dict):
            continue
        for atom in section.get("atoms", []):
            if isinstance(atom, dict) and atom.get("type") == "character":
                entries.append(atom)
    return entries


def collect_character_entries_from_atom_updates(payload) -> list[dict]:
    entries = []
    if not isinstance(payload, list):
        return entries
    for item in payload:
        if not isinstance(item, dict):
            continue
        data = item.get("data")
        if isinstance(data, dict) and data.get("type") == "character":
            entries.append(data)
    return entries


def collect_character_entries_from_live_manifest(payload: dict) -> list[dict]:
    entries = []
    if not isinstance(payload, dict):
        return entries
    for atom in payload.get("atoms", []):
        if isinstance(atom, dict) and atom.get("type") == "character":
            entries.append(atom)
    return entries


def load_live_payload(base: Path) -> dict:
    """Load the live manifest and replace summary arrays with full snapshots when present."""
    payload = read_json(base / "manifests/live_manifest.json")
    atoms_path = base / "manifests/live_atoms.json"
    if atoms_path.exists():
        atoms = read_json(atoms_path, expect=None)
        if not isinstance(atoms, list):
            fail("manifests/live_atoms.json must be a JSON array when present")
        payload = dict(payload)
        payload["atoms"] = atoms
    works_path = base / "manifests/live_works.json"
    if works_path.exists():
        works = read_json(works_path, expect=None)
        if not isinstance(works, list):
            fail("manifests/live_works.json must be a JSON array when present")
        payload = dict(payload)
        payload["works"] = works
    return payload


def _scan_visible_leaks(kind: str, name: str, entry: dict, label: str) -> list[str]:
    """Cross-type leak scan: forbidden fields, pipeline tags, internal codes, prompt scaffold."""
    problems = []
    visible_pairs = list(extract_visible_pairs(entry))
    # The visible name/title is itself a product surface; scan it too.
    for name_field in ["name", "title"]:
        if has_nonempty_string(entry.get(name_field)):
            visible_pairs.append((name_field, entry[name_field].strip()))
    forbidden_fields = set()
    for key, value in visible_pairs:
        normalized = normalize_key(key)
        if normalized in CHARACTER_FORBIDDEN_VISIBLE_FIELDS:
            forbidden_fields.add(normalized)
        if isinstance(value, str):
            if INTERNAL_CODE_RE.search(value):
                problems.append(
                    f"{label} {kind} {name} visible field {key!r} leaks an internal style/library code: "
                    + INTERNAL_CODE_RE.search(value).group(0)
                )
            if PROMPT_SCAFFOLD_RE.search(value):
                problems.append(
                    f"{label} {kind} {name} visible field {key!r} contains prompt-scaffold text: "
                    + PROMPT_SCAFFOLD_RE.search(value).group(0)
                )
    if forbidden_fields:
        problems.append(
            f"{label} {kind} {name} exposes internal visible fields: {', '.join(sorted(forbidden_fields))}"
        )
    tags = entry.get("tags")
    if isinstance(tags, list):
        leaked_tags = sorted(
            {str(tag).strip().lower() for tag in tags if str(tag).strip().lower() in FORBIDDEN_VISIBLE_TAGS}
        )
        if leaked_tags:
            problems.append(
                f"{label} {kind} {name} exposes pipeline tags on the visible card: {', '.join(leaked_tags)}"
            )
    return problems


def _collect_all_atoms(payload: dict) -> list[dict]:
    atoms = []
    if not isinstance(payload, dict):
        return atoms
    for section in payload.get("sections", []):
        if isinstance(section, dict):
            for atom in section.get("atoms", []):
                if isinstance(atom, dict):
                    atoms.append(atom)
    for atom in payload.get("atoms", []):
        if isinstance(atom, dict):
            atoms.append(atom)
    return atoms


def validate_visible_leaks(base: Path, sources=("import", "live")) -> tuple[list[str], list[str], dict]:
    """Leak scan across ALL atom types, world-level fields and works — not just character cards."""
    failures = []
    warnings = []
    report = {"sourcesChecked": list(sources), "atomsScanned": 0, "worksScanned": 0}

    def scan_payload(payload: dict, label: str) -> None:
        world_name = payload.get("worldName") or "<world>"
        world_entry = {
            key: payload.get(key)
            for key in ["description", "coreConflict", "prologue", "visualStyle", "seedPrompt"]
            if has_nonempty_string(payload.get(key))
        }
        if world_entry:
            failures.extend(_scan_visible_leaks("world", world_name, {"content": world_entry}, label))
        for atom in _collect_all_atoms(payload):
            report["atomsScanned"] += 1
            kind = atom.get("type") or "atom"
            name = atom.get("name") if has_nonempty_string(atom.get("name")) else "<unnamed>"
            failures.extend(_scan_visible_leaks(kind, name, atom, label))
        for work in payload.get("works", []):
            if not isinstance(work, dict):
                continue
            report["worksScanned"] += 1
            name = work.get("title") or work.get("name") or "<untitled>"
            failures.extend(_scan_visible_leaks("work", name, work, label))

    if "import" in sources:
        scan_payload(read_json(base / "import/world_import.json"), "import")
    if "live" in sources:
        scan_payload(load_live_payload(base), "live")
    return failures, warnings, report


def evaluate_character_entries(entries: list[dict], label: str) -> tuple[list[str], list[str], dict]:
    failures = []
    warnings = []
    summary = {
        "checked": len(entries),
        "missingSections": {},
        "forbiddenVisibleFields": {},
    }
    if not entries:
        failures.append(f"{label} has no character cards to inspect")
        return failures, warnings, summary

    for entry in entries:
        name = entry.get("name") if has_nonempty_string(entry.get("name")) else "<unnamed>"
        visible_pairs = extract_visible_pairs(entry)
        if not visible_pairs:
            failures.append(f"{label} character {name} has no visible card content")
            continue

        section_hits = {section: False for section in CHARACTER_REQUIRED_SECTIONS}
        section_hits["identity"] = any(key == "description" for key, _value in visible_pairs)
        forbidden_fields = set()

        for key, value in visible_pairs:
            normalized = normalize_key(key)
            if normalized in CHARACTER_FORBIDDEN_VISIBLE_FIELDS:
                forbidden_fields.add(normalized)
            for section, aliases in CHARACTER_REQUIRED_SECTIONS.items():
                if normalized in aliases and has_nonempty_string(value):
                    section_hits[section] = True

        missing = [section for section, hit in section_hits.items() if not hit]
        if missing:
            summary["missingSections"][name] = missing
            failures.append(f"{label} character {name} missing visible sections: {', '.join(missing)}")

        if forbidden_fields:
            ordered_fields = sorted(forbidden_fields)
            summary["forbiddenVisibleFields"][name] = ordered_fields
            failures.append(
                f"{label} character {name} exposes internal visible fields: {', '.join(ordered_fields)}"
            )

    return failures, warnings, summary


def validate_character_cards(base: Path, mode: str = "both") -> tuple[list[str], list[str], dict]:
    failures = []
    warnings = []
    report = {"mode": mode}

    if mode in {"import", "both"}:
        import_entries = []
        atom_updates_path = base / "import/atom_full_updates.json"
        if atom_updates_path.exists():
            atom_updates = read_json(atom_updates_path, expect=None)
            import_entries = collect_character_entries_from_atom_updates(atom_updates)
            report["importSource"] = "import/atom_full_updates.json"
        else:
            world_import = read_json(base / "import/world_import.json")
            import_entries = collect_character_entries_from_world_import(world_import)
            report["importSource"] = "import/world_import.json"
            warnings.append("character import gate using world_import.json only; atom_full_updates.json not found")
        import_failures, import_warnings, import_summary = evaluate_character_entries(import_entries, "import")
        failures.extend(import_failures)
        warnings.extend(import_warnings)
        report["import"] = import_summary

    if mode in {"live", "both"}:
        live_manifest = load_live_payload(base)
        live_entries = collect_character_entries_from_live_manifest(live_manifest)
        live_failures, live_warnings, live_summary = evaluate_character_entries(live_entries, "live")
        failures.extend(live_failures)
        warnings.extend(live_warnings)
        report["live"] = live_summary

    return failures, warnings, report


def build_stage_log() -> dict:
    created_at = utc_now()
    return {
        "createdAt": created_at,
        "updatedAt": created_at,
        "stages": [
            {
                "stageId": stage_id,
                "stageName": stage_name,
                "verdict": "PENDING",
                "owner": "main-builder",
                "verifier": "clean-context adversarial verifier",
                "evidence": [],
                "notes": "",
                "attempts": 0,
                "firstAttemptAt": "",
                "passedAt": "",
                "updatedAt": created_at,
            }
            for stage_id, stage_name in STAGES
        ],
    }


def build_manifest(args: argparse.Namespace, run_dir: Path) -> dict:
    created_at = utc_now()
    return {
        "script": "local_world_workflow.py",
        "scriptMode": "local_orchestrator_strict_v1",
        "createdAt": created_at,
        "updatedAt": created_at,
        "world": {
            "name": args.world_name,
            "slug": args.slug or slugify(args.world_name),
            "wiki": args.wiki,
            "scope": args.scope,
            "canonBoundary": args.canon_boundary or "",
            "primaryFamily": "",
            "secondaryLens": "",
            "worldId": "",
            "spaceId": "",
            "checkpointId": "",
            "studioUrl": "",
            "cohubUrl": "",
        },
        "delivery": {
            "executionDefault": "local_orchestrator_strict",
            "deliveryScale": "full_world",
            "requiresKeyLocationAssets": not args.no_location_assets,
            "requiresWorkflowSync": True,
            "runDir": str(run_dir),
        },
        "requiredFiles": REQUIRED_FILES,
        "requiredDirs": REQUIRED_DIRS,
        "stages": [
            {
                "stageId": stage_id,
                "stageName": stage_name,
                "verdict": "PENDING",
            }
            for stage_id, stage_name in STAGES
        ],
    }


def create_scaffold(run_dir: Path, world_name: str) -> None:
    for relative in REQUIRED_DIRS:
        (run_dir / relative).mkdir(parents=True, exist_ok=True)

    placeholder_json = "{}\n"
    for relative in [
        "coverage/source_inventory.json",
        "coverage/coverage_report.json",
        "checks/execution_plan_check.json",
        "checks/fandom_reference_check.json",
        "checks/character_card_check.json",
        "checks/english_provenance_check.json",
        "checks/import_smoke.json",
        "checks/style_audit.json",
        "checks/visible_leaks_check.json",
        "checks/final_acceptance_audit.json",
        "import/world_import.json",
        "manifests/live_manifest.json",
        "manifests/board_placements.json",
    ]:
        write_if_missing(run_dir / relative, placeholder_json)

    write_if_missing(
        run_dir / "README.md",
        f"# {world_name}\n\nThis run is controlled by `local_world_workflow.py`.\n",
    )
    write_if_missing(
        run_dir / "source_map.md",
        (
            f"# Source Map\n\nWorld: {world_name}\n\n"
            "## Source Surfaces\n[one short paragraph]\n\n"
            "## Canon Boundary\n[one short paragraph]\n\n"
            "## Initial Diagnosis Assumptions\n[one short paragraph]\n"
        ),
    )
    write_if_missing(
        run_dir / "delivery_contract.md",
        (
            f"# Delivery Contract\n\nWorld: {world_name}\n\n"
            "## Target World\n[one short paragraph]\n\n"
            "## Canon Boundary\n[one short paragraph]\n\n"
            "## Primary Family\n[one short paragraph]\n\n"
            "## Board Target Mode\n[one short paragraph]\n\n"
            "## Visual Style Authority\n[one short paragraph]\n\n"
            "## Final Required IDs\n[one short paragraph]\n\n"
            "## Final Required Files\n[one short paragraph]\n\n"
            "## Acceptance Evidence\n[one short paragraph]\n"
        ),
    )
    write_if_missing(
        run_dir / "execution_plan.md",
        (
            f"# Execution Plan\n\nWorld: {world_name}\n\n"
            "## Delegation Decision\n"
            "If a clean-context subagent can make this run faster or produce better quality, use it instead of keeping the whole world serial. Record the first delegated slice here.\n\n"
            "## Parallelizable Slices\n"
            "Name the independent slices that should be delegated in parallel, such as source inventory recovery, world diagnosis drafting, style selection comparison, character-card repair, or adversarial verification.\n\n"
            "## Planned Workers\n"
            "Name the planned subagent or worker roles, what each one owns, and what artifact each worker must return without drifting into later stages.\n\n"
            "## Serial Exceptions\n"
            "Record only the steps that truly must stay serial, such as main-builder synthesis, final acceptance, or a live action that would conflict if two workers touched it at once.\n\n"
            "## Verification Ownership\n"
            "State how the main builder will review worker outputs and which clean-context verifier will try to break the stage result before PASS is recorded.\n"
        ),
    )
    write_if_missing(
        run_dir / "world_diagnosis.md",
        (
            f"# World Diagnosis\n\nWorld: {world_name}\n\n"
            "## Narrative Pressure\n[one short paragraph]\n\n"
            "## Entry Point\n[one short paragraph]\n\n"
            "## Asset Center Of Gravity\n[one short paragraph]\n\n"
            "## Relationship Structure\n[one short paragraph]\n\n"
            "## Scale\n[one short paragraph]\n\n"
            "## Time Structure\n[one short paragraph]\n\n"
            "## Visual Recognition Mechanism\n[one short paragraph]\n\n"
            "## Prose Distance\n[one short paragraph]\n\n"
            "## Board Reading Mode\n[one short paragraph]\n\n"
            "## Diagnosis Implications\n[one short paragraph]\n"
        ),
    )
    write_if_missing(
        run_dir / "style_decision.json",
        json.dumps(style_decision_template(), ensure_ascii=False, indent=2) + "\n",
    )
    manifest = read_json(run_dir / "run_manifest.json") if (run_dir / "run_manifest.json").exists() else None
    if manifest:
        world = manifest.get("world", {})
        fandom_template = fandom_reference_pack_template(
            world.get("name", world_name),
            world.get("wiki", ""),
            world.get("scope", ""),
        )
    else:
        fandom_template = fandom_reference_pack_template(world_name, "", "")
    write_if_missing(
        run_dir / "references/fandom_reference_pack.json",
        json.dumps(fandom_template, ensure_ascii=False, indent=2) + "\n",
    )
    write_if_missing(
        run_dir / "final_report.md",
        f"# Final Report\n\nWorld: {world_name}\n\nWrite after final acceptance.\n",
    )
    write_if_missing(
        run_dir / "assets/key_characters/README.md",
        "# Key Character Assets\n\nPut final exported key character assets here.\n",
    )
    write_if_missing(
        run_dir / "assets/key_locations/README.md",
        "# Key Location Assets\n\nPut final exported key location assets here when required.\n",
    )
    write_if_missing(
        run_dir / "assets/key_visuals/README.md",
        "# Key Visuals\n\nPut world cover, KV and related finals here.\n",
    )
    write_if_missing(
        run_dir / "references/README.md",
        "# References\n\nPut source-side reference documents for this run here.\n",
    )


def init_run(args: argparse.Namespace) -> None:
    slug = args.slug or slugify(args.world_name)
    run_dir = Path(args.base_dir).expanduser().resolve() / slug
    if run_dir.exists():
        fail(f"run dir already exists: {run_dir}")
    run_dir.mkdir(parents=True)

    manifest = build_manifest(args, run_dir)
    create_scaffold(run_dir, args.world_name)
    if CAPABILITY_REGISTRY_PATH.exists():
        (run_dir / "capabilities.json").write_text(
            CAPABILITY_REGISTRY_PATH.read_text(encoding="utf-8"), encoding="utf-8"
        )
    else:
        print(f"WARNING: capability registry missing at {CAPABILITY_REGISTRY_PATH}", file=sys.stderr)
    write_json(run_dir / "run_manifest.json", manifest)
    write_json(run_dir / "stage_gate_log.json", build_stage_log())

    print(
        json.dumps(
            {
                "status": "PASS",
                "runDir": str(run_dir),
                "worldName": args.world_name,
                "slug": manifest["world"]["slug"],
                "next": [
                    "read capabilities.json before choosing any external tool",
                    "fill delivery_contract.md",
                    "fill execution_plan.md against delegation_map.json",
                    "fill world_diagnosis.md after source discovery",
                    "use the next command to see the exact blocking gate at any time",
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def load_run(run_dir: str) -> tuple[Path, dict, dict]:
    base = Path(run_dir).expanduser().resolve()
    manifest = read_json(base / "run_manifest.json")
    stage_log = read_json(base / "stage_gate_log.json")
    return base, manifest, stage_log


def save_run(base: Path, manifest: dict, stage_log: dict) -> None:
    now = utc_now()
    manifest["updatedAt"] = now
    stage_log["updatedAt"] = now
    write_json(base / "run_manifest.json", manifest)
    write_json(base / "stage_gate_log.json", stage_log)


def set_ids(args: argparse.Namespace) -> None:
    base, manifest, stage_log = load_run(args.run_dir)
    world = manifest["world"]
    for key, value in [
        ("worldId", args.world_id),
        ("spaceId", args.space_id),
        ("checkpointId", args.checkpoint_id),
        ("studioUrl", args.studio_url),
        ("cohubUrl", args.cohub_url),
        ("primaryFamily", args.primary_family),
        ("secondaryLens", args.secondary_lens),
    ]:
        if value:
            world[key] = value
    save_run(base, manifest, stage_log)
    print(json.dumps({"status": "PASS", "world": world}, ensure_ascii=False, indent=2))


# --- Declarative gate registry -------------------------------------------------
#
# Each gate: name -> (runner, report_path_or_None).
# A runner takes (base, manifest) and returns (failures, warnings, report_or_None).
# STAGE_GATE_PLAN lists the gates each stage introduces. Marking a stage PASS
# re-runs every gate introduced by that stage and all earlier stages, so a
# later stage cannot pass after an earlier prerequisite silently rots.

GATE_DEFS = {
    "capabilities": (
        lambda base, manifest: (*validate_capabilities(base), None),
        None,
    ),
    "source_map": (
        lambda base, manifest: (*validate_source_map(base, manifest), None),
        None,
    ),
    "delivery_contract": (
        lambda base, manifest: (*validate_delivery_contract(base, manifest), None),
        None,
    ),
    "execution_plan": (
        lambda base, manifest: validate_execution_plan(base, manifest),
        "checks/execution_plan_check.json",
    ),
    "source_inventory": (
        lambda base, manifest: validate_source_inventory(base, manifest),
        "checks/source_inventory_check.json",
    ),
    "target_lock": (
        lambda base, manifest: validate_target_lock(base, manifest),
        "checks/target_lock_check.json",
    ),
    "fandom_reference_pack": (
        lambda base, manifest: validate_fandom_reference_pack(base, manifest["world"].get("wiki", "")),
        "checks/fandom_reference_check.json",
    ),
    "world_diagnosis": (
        lambda base, manifest: (*validate_world_diagnosis(base, manifest), None),
        None,
    ),
    "style_decision": (
        lambda base, manifest: (*validate_style_decision(base), None),
        None,
    ),
    "draft_import_coverage": (
        lambda base, manifest: validate_import_draft_coverage(base),
        "checks/import_draft_coverage_check.json",
    ),
    "character_cards_import": (
        lambda base, manifest: validate_character_cards(base, mode="import"),
        "checks/character_card_check.json",
    ),
    "english_provenance_import": (
        lambda base, manifest: validate_english_provenance(base, sources=("import",)),
        "checks/english_provenance_check.json",
    ),
    "visible_leaks_import": (
        lambda base, manifest: validate_visible_leaks(base, sources=("import",)),
        "checks/visible_leaks_check.json",
    ),
    "bootstrap_ids": (
        lambda base, manifest: validate_bootstrap_ids(base, manifest),
        "checks/bootstrap_ids_check.json",
    ),
    "import_smoke": (
        lambda base, manifest: validate_import_smoke(base),
        None,
    ),
    "import_state": (
        lambda base, manifest: validate_import_state(base),
        "checks/import_state_check.json",
    ),
    "character_cards_live": (
        lambda base, manifest: validate_character_cards(base, mode="both"),
        "checks/character_card_check.json",
    ),
    "english_provenance_live": (
        lambda base, manifest: validate_english_provenance(base, sources=("import", "live")),
        "checks/english_provenance_check.json",
    ),
    "visible_leaks_live": (
        lambda base, manifest: validate_visible_leaks(base, sources=("import", "live")),
        "checks/visible_leaks_check.json",
    ),
    "snapshot_freshness": (
        lambda base, manifest: validate_snapshot_freshness(base),
        None,
    ),
    "final_acceptance_audit": (
        lambda base, manifest: validate_final_acceptance_audit(base),
        None,
    ),
    "cover_assets": (
        lambda base, manifest: validate_cover_assets(base, manifest),
        "checks/cover_assets_check.json",
    ),
    "style_audit": (
        lambda base, manifest: validate_style_audit(base),
        None,
    ),
    "work_media": (
        lambda base, manifest: validate_work_media(base),
        "checks/work_media_check.json",
    ),
    "board_layout": (
        lambda base, manifest: validate_board_layout(base),
        "checks/board_layout_check.json",
    ),
}

STAGE_GATE_PLAN = {
    "world_understanding": ["capabilities", "source_map"],
    "delivery_contract": ["delivery_contract", "execution_plan"],
    "source_inventory": ["source_inventory", "target_lock", "fandom_reference_pack"],
    "world_diagnosis": ["world_diagnosis"],
    "style_decision": ["style_decision"],
    "atom_package": [
        "draft_import_coverage",
        "character_cards_import",
        "english_provenance_import",
        "visible_leaks_import",
    ],
    "studio_world_bootstrap": ["bootstrap_ids"],
    "bound_space_import": [
        "import_smoke",
        "import_state",
        "character_cards_live",
        "english_provenance_live",
        "visible_leaks_live",
    ],
    "cover_quality": ["cover_assets", "style_audit"],
    "work_media": ["work_media", "snapshot_freshness"],
    "board_layout": ["board_layout"],
    "final_acceptance": ["final_acceptance_audit"],
    "workflow_sync": [],
}

# Later gates supersede earlier variants of the same check, so cumulative
# re-validation does not run both the import-only and live version.
GATE_SUPERSEDES = {
    "character_cards_live": {"character_cards_import"},
    "english_provenance_live": {"english_provenance_import"},
    "visible_leaks_live": {"visible_leaks_import"},
}


def gates_for_stage(stage_id: str) -> list[str]:
    """All gate names that must pass when marking stage_id PASS (cumulative)."""
    current = stage_index(stage_id)
    names: list[str] = []
    for index, (candidate_stage_id, _) in enumerate(STAGES):
        if index > current:
            break
        for gate_name in STAGE_GATE_PLAN.get(candidate_stage_id, []):
            if gate_name not in names:
                names.append(gate_name)
    superseded = set()
    for gate_name in names:
        superseded.update(GATE_SUPERSEDES.get(gate_name, set()))
    return [name for name in names if name not in superseded]


def run_gate(gate_name: str, base: Path, manifest: dict) -> tuple[list[str], list[str]]:
    runner, report_relpath = GATE_DEFS[gate_name]
    failures, warnings, report = runner(base, manifest)
    if report_relpath:
        report_path = base / report_relpath
        ensure_parent(report_path)
        write_json(
            report_path,
            {
                "verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS",
                "gate": gate_name,
                "failures": failures,
                "warnings": warnings,
                "report": report if report is not None else {},
            },
        )
    return failures, warnings


def set_stage(args: argparse.Namespace) -> None:
    base, manifest, stage_log = load_run(args.run_dir)
    stage_map = {item["stageId"]: item for item in stage_log["stages"]}
    manifest_stage_map = {item["stageId"]: item for item in manifest["stages"]}
    if args.stage not in stage_map:
        fail(f"unknown stage: {args.stage}")

    record = stage_map[args.stage]
    record["attempts"] = int(record.get("attempts", 0)) + 1
    if not record.get("firstAttemptAt"):
        record["firstAttemptAt"] = utc_now()

    if args.verdict == "PASS":
        current_index = stage_index(args.stage)
        if current_index > 0:
            previous_stage_id = STAGES[current_index - 1][0]
            if stage_map[previous_stage_id].get("verdict") != "PASS":
                # Persist the failed attempt count before refusing.
                save_run(base, manifest, stage_log)
                fail(f"cannot mark {args.stage} PASS before {previous_stage_id} is PASS")

        all_warnings = []
        for gate_name in gates_for_stage(args.stage):
            failures, warnings = run_gate(gate_name, base, manifest)
            if failures:
                save_run(base, manifest, stage_log)
                fail(f"{gate_name} gate failed: " + "; ".join(failures))
            all_warnings.extend(f"{gate_name}: {item}" for item in warnings)
        if all_warnings:
            print("WARNING: " + "; ".join(all_warnings), file=sys.stderr)
        record["passedAt"] = utc_now()

    record["verdict"] = args.verdict
    record["owner"] = args.owner
    record["verifier"] = args.verifier
    record["evidence"] = args.evidence
    record["notes"] = args.notes or ""
    record["updatedAt"] = utc_now()
    manifest_stage_map[args.stage]["verdict"] = args.verdict
    save_run(base, manifest, stage_log)
    print(json.dumps({"status": "PASS", "stage": record}, ensure_ascii=False, indent=2))


def summarize_stage_log(stage_log: dict) -> dict:
    counts = {}
    for stage in stage_log["stages"]:
        verdict = stage["verdict"]
        counts[verdict] = counts.get(verdict, 0) + 1
    return counts


def status(args: argparse.Namespace) -> None:
    base, manifest, stage_log = load_run(args.run_dir)
    world = manifest["world"]
    print(
        json.dumps(
            {
                "runDir": str(base),
                "world": world,
                "executionDefault": manifest["delivery"]["executionDefault"],
                "stageCounts": summarize_stage_log(stage_log),
                "nextOpenStages": [
                    stage["stageId"]
                    for stage in stage_log["stages"]
                    if stage["verdict"] in {"PENDING", "PARTIAL", "FAIL"}
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def run_gates_and_report(base: Path, manifest: dict, gate_names: list[str]) -> dict:
    failures = []
    warnings = []
    per_gate = {}
    for gate_name in gate_names:
        gate_failures, gate_warnings = run_gate(gate_name, base, manifest)
        per_gate[gate_name] = "FAIL" if gate_failures else "PARTIAL" if gate_warnings else "PASS"
        failures.extend(f"{gate_name}: {item}" for item in gate_failures)
        warnings.extend(f"{gate_name}: {item}" for item in gate_warnings)
    verdict = "FAIL" if failures else "PARTIAL" if warnings else "PASS"
    return {
        "verdict": verdict,
        "runDir": str(base),
        "gates": per_gate,
        "failures": failures,
        "warnings": warnings,
    }


def check_stage_gates(args: argparse.Namespace, stage_id: str) -> None:
    base, manifest, _stage_log = load_run(args.run_dir)
    payload = run_gates_and_report(base, manifest, gates_for_stage(stage_id))
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_style_decision(args: argparse.Namespace) -> None:
    check_stage_gates(args, STYLE_DECISION_STAGE_ID)


def check_source_map(args: argparse.Namespace) -> None:
    base, manifest, _stage_log = load_run(args.run_dir)
    failures, warnings = validate_source_map(base, manifest)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings}
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_delivery_contract(args: argparse.Namespace) -> None:
    base, manifest, _stage_log = load_run(args.run_dir)
    failures, warnings = validate_delivery_contract(base, manifest)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings}
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_execution_plan(args: argparse.Namespace) -> None:
    base, manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_execution_plan(base, manifest)
    payload = {
        "verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS",
        "failures": failures,
        "warnings": warnings,
        "report": report,
    }
    ensure_parent(base / "checks/execution_plan_check.json")
    write_json(base / "checks/execution_plan_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_world_diagnosis(args: argparse.Namespace) -> None:
    check_stage_gates(args, WORLD_DIAGNOSIS_STAGE_ID)


def check_source_inventory(args: argparse.Namespace) -> None:
    check_stage_gates(args, SOURCE_INVENTORY_STAGE_ID)


def check_fandom_reference_pack(args: argparse.Namespace) -> None:
    base, manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_fandom_reference_pack(base, manifest["world"].get("wiki", ""))
    verdict = "PASS"
    if failures:
        verdict = "FAIL"
    elif warnings:
        verdict = "PARTIAL"
    payload = {
        "verdict": verdict,
        "failures": failures,
        "warnings": warnings,
        "report": report,
    }
    report_path = base / "checks/fandom_reference_check.json"
    ensure_parent(report_path)
    write_json(report_path, payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if verdict == "FAIL":
        raise SystemExit(1)


def check_bootstrap_ids(args: argparse.Namespace) -> None:
    base, manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_bootstrap_ids(base, manifest)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    ensure_parent(base / "checks/bootstrap_ids_check.json")
    write_json(base / "checks/bootstrap_ids_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_import_state(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_import_state(base)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    ensure_parent(base / "checks/import_state_check.json")
    write_json(base / "checks/import_state_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_import_draft_coverage(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_import_draft_coverage(base)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    ensure_parent(base / "checks/import_draft_coverage_check.json")
    write_json(base / "checks/import_draft_coverage_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_character_cards(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_character_cards(base, mode=args.source)
    verdict = "PASS"
    if failures:
        verdict = "FAIL"
    elif warnings:
        verdict = "PARTIAL"
    report_path = base / "checks/character_card_check.json"
    ensure_parent(report_path)
    payload = {
        "verdict": verdict,
        "source": args.source,
        "failures": failures,
        "warnings": warnings,
        "report": report,
    }
    write_json(report_path, payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if verdict == "FAIL":
        raise SystemExit(1)


def check_cover_assets(args: argparse.Namespace) -> None:
    base, manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_cover_assets(base, manifest)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    ensure_parent(base / "checks/cover_assets_check.json")
    write_json(base / "checks/cover_assets_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_work_media(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_work_media(base)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    ensure_parent(base / "checks/work_media_check.json")
    write_json(base / "checks/work_media_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_board_layout(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_board_layout(base)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    ensure_parent(base / "checks/board_layout_check.json")
    write_json(base / "checks/board_layout_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_english_provenance(args: argparse.Namespace) -> None:
    base, manifest, _stage_log = load_run(args.run_dir)
    sources = ("import",) if args.source == "import" else ("import", "live")
    failures, warnings, report = validate_english_provenance(base, sources=sources)
    payload = {
        "verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS",
        "failures": failures,
        "warnings": warnings,
        "report": report,
    }
    ensure_parent(base / "checks/english_provenance_check.json")
    write_json(base / "checks/english_provenance_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_import_smoke(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_import_smoke(base)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_style_audit(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_style_audit(base)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_capabilities(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings = validate_capabilities(base)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings}
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_target_lock(args: argparse.Namespace) -> None:
    base, manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_target_lock(base, manifest)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    ensure_parent(base / "checks/target_lock_check.json")
    write_json(base / "checks/target_lock_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_visible_leaks(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    sources = ("import",) if args.source == "import" else ("import", "live")
    failures, warnings, report = validate_visible_leaks(base, sources=sources)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    ensure_parent(base / "checks/visible_leaks_check.json")
    write_json(base / "checks/visible_leaks_check.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_snapshot_freshness(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_snapshot_freshness(base)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def check_final_acceptance_audit(args: argparse.Namespace) -> None:
    base, _manifest, _stage_log = load_run(args.run_dir)
    failures, warnings, report = validate_final_acceptance_audit(base)
    payload = {"verdict": "FAIL" if failures else "PARTIAL" if warnings else "PASS", "failures": failures, "warnings": warnings, "report": report}
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["verdict"] == "FAIL":
        raise SystemExit(1)


def next_command(args: argparse.Namespace) -> None:
    """Tell the operator exactly where the run is and what single command comes next."""
    base, manifest, stage_log = load_run(args.run_dir)
    stage_map = {item["stageId"]: item for item in stage_log["stages"]}
    script = f"python3 {Path(__file__).resolve()}"

    current_stage_id = None
    for stage_id, _stage_name in STAGES:
        if stage_map[stage_id].get("verdict") != "PASS":
            current_stage_id = stage_id
            break

    if current_stage_id is None:
        print(json.dumps({
            "state": "ALL_STAGES_PASS",
            "next": f"{script} verify-handoff --run-dir {base} --require-checkpoint",
        }, ensure_ascii=False, indent=2))
        return

    blocking = []
    for gate_name in gates_for_stage(current_stage_id):
        failures, warnings = run_gate(gate_name, base, manifest)
        if failures:
            blocking.append({"gate": gate_name, "failures": failures[:5]})

    payload = {
        "state": "IN_PROGRESS",
        "currentStage": current_stage_id,
        "currentStageVerdict": stage_map[current_stage_id].get("verdict"),
        "blockingGates": blocking,
    }
    if blocking:
        payload["next"] = (
            f"fix the blocking gates above, then run: {script} stage --run-dir {base}"
            f" --stage {current_stage_id} --verdict PASS"
        )
    else:
        payload["next"] = (
            f"all gates green for {current_stage_id}; run: {script} stage --run-dir {base}"
            f" --stage {current_stage_id} --verdict PASS"
        )
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def gates_command(args: argparse.Namespace) -> None:
    """Authoritative machine-readable gate table. Docs should point here, not restate it."""
    table = []
    for stage_id, stage_name in STAGES:
        table.append({
            "stageId": stage_id,
            "stageName": stage_name,
            "gatesIntroduced": STAGE_GATE_PLAN.get(stage_id, []),
            "gatesEnforcedOnPass": gates_for_stage(stage_id),
        })
    print(json.dumps({
        "script": str(Path(__file__).resolve()),
        "gateDefinitions": sorted(GATE_DEFS.keys()),
        "supersedes": {key: sorted(value) for key, value in GATE_SUPERSEDES.items()},
        "stages": table,
    }, ensure_ascii=False, indent=2))


def build_run_metrics(stage_log: dict) -> dict:
    metrics = {"stages": {}, "totalAttempts": 0}
    for stage in stage_log.get("stages", []):
        entry = {
            "verdict": stage.get("verdict"),
            "attempts": int(stage.get("attempts", 0)),
            "firstAttemptAt": stage.get("firstAttemptAt", ""),
            "passedAt": stage.get("passedAt", ""),
        }
        metrics["stages"][stage.get("stageId", "?")] = entry
        metrics["totalAttempts"] += entry["attempts"]
    return metrics


def verify_handoff(args: argparse.Namespace) -> None:
    base, manifest, stage_log = load_run(args.run_dir)
    world = manifest["world"]
    missing = []
    warnings = []

    for field in ["worldId", "spaceId"]:
        if not world.get(field):
            missing.append(f"world.{field}")
    if args.require_checkpoint and not world.get("checkpointId"):
        missing.append("world.checkpointId")

    for relative in manifest.get("requiredFiles", []):
        path = base / relative
        if not path.exists():
            missing.append(relative)
        elif path.is_file() and path.stat().st_size == 0:
            warnings.append(f"empty file: {relative}")

    for relative in manifest.get("requiredDirs", []):
        path = base / relative
        if not path.exists() or not path.is_dir():
            missing.append(relative)

    for stage in stage_log["stages"]:
        if stage["stageId"] == "workflow_sync" and not args.require_workflow_sync:
            continue
        if stage["verdict"] != "PASS":
            missing.append(f"stage not PASS: {stage['stageId']}={stage['verdict']}")

    final_stage_id = STAGES[-1][0]
    for gate_name in gates_for_stage(final_stage_id):
        gate_failures, gate_warnings = run_gate(gate_name, base, manifest)
        missing.extend(f"{gate_name}: {item}" for item in gate_failures)
        warnings.extend(f"{gate_name}: {item}" for item in gate_warnings)

    metrics = build_run_metrics(stage_log)
    write_json(base / "run_metrics.json", metrics)

    verdict = "PASS"
    if missing:
        verdict = "FAIL"
    elif warnings:
        verdict = "PARTIAL"

    print(
        json.dumps(
            {
                "verdict": verdict,
                "runDir": str(base),
                "missing": missing,
                "warnings": warnings,
                "metrics": {"totalAttempts": metrics["totalAttempts"]},
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    if verdict == "FAIL":
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Local control-plane helper for high-standard Neta Studio World runs."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init-run")
    p_init.add_argument("--base-dir", default="deliverables")
    p_init.add_argument("--world-name", required=True)
    p_init.add_argument("--slug")
    p_init.add_argument("--wiki", required=True)
    p_init.add_argument("--scope", required=True)
    p_init.add_argument("--canon-boundary")
    p_init.add_argument("--no-location-assets", action="store_true")
    p_init.set_defaults(func=init_run)

    p_ids = sub.add_parser("set-ids")
    p_ids.add_argument("--run-dir", required=True)
    p_ids.add_argument("--world-id")
    p_ids.add_argument("--space-id")
    p_ids.add_argument("--checkpoint-id")
    p_ids.add_argument("--studio-url")
    p_ids.add_argument("--cohub-url")
    p_ids.add_argument("--primary-family")
    p_ids.add_argument("--secondary-lens")
    p_ids.set_defaults(func=set_ids)

    p_stage = sub.add_parser("stage")
    p_stage.add_argument("--run-dir", required=True)
    p_stage.add_argument("--stage", required=True)
    p_stage.add_argument("--verdict", required=True, choices=["PASS", "FAIL", "PARTIAL", "PENDING"])
    p_stage.add_argument("--owner", default="main-builder")
    p_stage.add_argument("--verifier", default="clean-context adversarial verifier")
    p_stage.add_argument("--evidence", nargs="*", default=[])
    p_stage.add_argument("--notes")
    p_stage.set_defaults(func=set_stage)

    p_status = sub.add_parser("status")
    p_status.add_argument("--run-dir", required=True)
    p_status.set_defaults(func=status)

    p_source_map = sub.add_parser("check-source-map")
    p_source_map.add_argument("--run-dir", required=True)
    p_source_map.set_defaults(func=check_source_map)

    p_contract = sub.add_parser("check-delivery-contract")
    p_contract.add_argument("--run-dir", required=True)
    p_contract.set_defaults(func=check_delivery_contract)

    p_execution = sub.add_parser("check-execution-plan")
    p_execution.add_argument("--run-dir", required=True)
    p_execution.set_defaults(func=check_execution_plan)

    p_source_inventory = sub.add_parser("check-source-inventory")
    p_source_inventory.add_argument("--run-dir", required=True)
    p_source_inventory.set_defaults(func=check_source_inventory)

    p_diagnosis = sub.add_parser("check-world-diagnosis")
    p_diagnosis.add_argument("--run-dir", required=True)
    p_diagnosis.set_defaults(func=check_world_diagnosis)

    p_style = sub.add_parser("check-style-decision")
    p_style.add_argument("--run-dir", required=True)
    p_style.set_defaults(func=check_style_decision)

    p_fandom = sub.add_parser("check-fandom-reference-pack")
    p_fandom.add_argument("--run-dir", required=True)
    p_fandom.set_defaults(func=check_fandom_reference_pack)

    p_bootstrap = sub.add_parser("check-bootstrap-ids")
    p_bootstrap.add_argument("--run-dir", required=True)
    p_bootstrap.set_defaults(func=check_bootstrap_ids)

    p_import_state = sub.add_parser("check-import-state")
    p_import_state.add_argument("--run-dir", required=True)
    p_import_state.set_defaults(func=check_import_state)

    p_import_draft = sub.add_parser("check-import-draft-coverage")
    p_import_draft.add_argument("--run-dir", required=True)
    p_import_draft.set_defaults(func=check_import_draft_coverage)

    p_character = sub.add_parser("check-character-cards")
    p_character.add_argument("--run-dir", required=True)
    p_character.add_argument("--source", choices=["import", "live", "both"], default="both")
    p_character.set_defaults(func=check_character_cards)

    p_cover = sub.add_parser("check-cover-assets")
    p_cover.add_argument("--run-dir", required=True)
    p_cover.set_defaults(func=check_cover_assets)

    p_work_media = sub.add_parser("check-work-media")
    p_work_media.add_argument("--run-dir", required=True)
    p_work_media.set_defaults(func=check_work_media)

    p_board = sub.add_parser("check-board-layout")
    p_board.add_argument("--run-dir", required=True)
    p_board.set_defaults(func=check_board_layout)

    p_verify = sub.add_parser("verify-handoff")
    p_verify.add_argument("--run-dir", required=True)
    p_verify.add_argument("--require-checkpoint", action="store_true")
    p_verify.add_argument("--require-workflow-sync", action="store_true")
    p_verify.set_defaults(func=verify_handoff)

    p_english = sub.add_parser("check-english-provenance")
    p_english.add_argument("--run-dir", required=True)
    p_english.add_argument("--source", choices=["import", "both"], default="both")
    p_english.set_defaults(func=check_english_provenance)

    p_smoke = sub.add_parser("check-import-smoke")
    p_smoke.add_argument("--run-dir", required=True)
    p_smoke.set_defaults(func=check_import_smoke)

    p_style_audit = sub.add_parser("check-style-audit")
    p_style_audit.add_argument("--run-dir", required=True)
    p_style_audit.set_defaults(func=check_style_audit)

    p_capabilities = sub.add_parser("check-capabilities")
    p_capabilities.add_argument("--run-dir", required=True)
    p_capabilities.set_defaults(func=check_capabilities)

    p_next = sub.add_parser("next")
    p_next.add_argument("--run-dir", required=True)
    p_next.set_defaults(func=next_command)

    p_lock = sub.add_parser("lock-targets")
    p_lock.add_argument("--run-dir", required=True)
    p_lock.add_argument("--delivery-scale", required=True, choices=sorted(DELIVERY_SCALES))
    p_lock.add_argument("--observed-characters", type=int)
    p_lock.add_argument("--approved-by", default="")
    p_lock.add_argument("--locked-by", default="planning-subagent")
    p_lock.add_argument("--waive-asset-coverage", action="store_true")
    p_lock.set_defaults(func=lock_targets, relock=False)

    p_relock = sub.add_parser("relock-targets")
    p_relock.add_argument("--run-dir", required=True)
    p_relock.add_argument("--delivery-scale", required=True, choices=sorted(DELIVERY_SCALES))
    p_relock.add_argument("--observed-characters", type=int)
    p_relock.add_argument("--approved-by", default="")
    p_relock.add_argument("--locked-by", default="main-builder")
    p_relock.add_argument("--waive-asset-coverage", action="store_true")
    p_relock.set_defaults(func=lock_targets, relock=True)

    p_check_lock = sub.add_parser("check-target-lock")
    p_check_lock.add_argument("--run-dir", required=True)
    p_check_lock.set_defaults(func=check_target_lock)

    p_leaks = sub.add_parser("check-visible-leaks")
    p_leaks.add_argument("--run-dir", required=True)
    p_leaks.add_argument("--source", choices=["import", "both"], default="both")
    p_leaks.set_defaults(func=check_visible_leaks)

    p_fresh = sub.add_parser("check-snapshot-freshness")
    p_fresh.add_argument("--run-dir", required=True)
    p_fresh.set_defaults(func=check_snapshot_freshness)

    p_final_audit = sub.add_parser("check-final-acceptance-audit")
    p_final_audit.add_argument("--run-dir", required=True)
    p_final_audit.set_defaults(func=check_final_acceptance_audit)

    p_gates = sub.add_parser("gates")
    p_gates.set_defaults(func=gates_command)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
