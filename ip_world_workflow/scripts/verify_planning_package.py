#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


PLACEHOLDER_SNIPPETS = {
    "delivery_contract.md": [
        "Fill this before production starts.",
    ],
    "world_diagnosis.md": [
        "Record diagnosis before atom writing.",
    ],
    "final_report.md": [
        "Write after final acceptance.",
    ],
}

REQUIRED_STAGE_PASS = [
    "world_understanding",
    "delivery_contract",
    "source_inventory",
    "world_diagnosis",
]

REQUIRED_SOURCE_KEYS = [
    "world",
    "sources",
    "commands",
    "candidateSummary",
]

REQUIRED_COVERAGE_KEYS = [
    "planningVerdict",
    "limitations",
    "coverageShape",
    "nextStepRisks",
]

REQUIRED_EXECUTION_PLAN_HEADINGS = [
    "Delegation Decision",
    "Parallelizable Slices",
    "Planned Workers",
    "Serial Exceptions",
    "Verification Ownership",
]

REQUIRED_SOURCE_MAP_HEADINGS = [
    "Source Surfaces",
    "Canon Boundary",
    "Initial Diagnosis Assumptions",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_json(path: Path):
    return json.loads(read_text(path))


def has_nonempty_string(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def verdict_rank(verdict: str) -> int:
    return {"PASS": 0, "PARTIAL": 1, "FAIL": 2}.get(verdict, 2)


def merge_verdict(current: str, new: str) -> str:
    return current if verdict_rank(current) >= verdict_rank(new) else new


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify a planning-only run package.")
    parser.add_argument("--run-dir", required=True)
    args = parser.parse_args()

    base = Path(args.run_dir).expanduser().resolve()
    missing = []
    failures = []
    warnings = []

    required_files = [
        "source_map.md",
        "delivery_contract.md",
        "execution_plan.md",
        "world_diagnosis.md",
        "final_report.md",
        "coverage/source_inventory.json",
        "coverage/coverage_report.json",
        "run_manifest.json",
        "stage_gate_log.json",
    ]
    for rel in required_files:
        if not (base / rel).exists():
            missing.append(rel)

    if missing:
        print(
            json.dumps(
                {
                    "verdict": "FAIL",
                    "missing": missing,
                    "failures": [],
                    "warnings": [],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        raise SystemExit(1)

    for rel, snippets in PLACEHOLDER_SNIPPETS.items():
        text = read_text(base / rel)
        if len(text.strip()) < 120:
            failures.append(f"{rel} too short")
        for snippet in snippets:
            if snippet in text:
                failures.append(f"{rel} still contains scaffold placeholder")

    source_map = read_text(base / "source_map.md")
    if len(source_map.strip()) < 250:
        failures.append("source_map.md too short")
    lowered_source_map = source_map.lower()
    for heading in REQUIRED_SOURCE_MAP_HEADINGS:
        if f"## {heading}".lower() not in lowered_source_map:
            failures.append(f"source_map.md missing section {heading}")

    execution_plan = read_text(base / "execution_plan.md")
    if len(execution_plan.strip()) < 200:
        failures.append("execution_plan.md too short")
    lowered_execution_plan = execution_plan.lower()
    if "record the first delegated slice here." in lowered_execution_plan:
        failures.append("execution_plan.md still contains scaffold instruction text")
    if "subagent" not in lowered_execution_plan and "worker" not in lowered_execution_plan and "verifier" not in lowered_execution_plan:
        failures.append("execution_plan.md does not name any subagent, worker or verifier")
    for heading in REQUIRED_EXECUTION_PLAN_HEADINGS:
        if f"## {heading}".lower() not in lowered_execution_plan:
            failures.append(f"execution_plan.md missing section {heading}")

    run_manifest = read_json(base / "run_manifest.json")
    world = run_manifest.get("world", {})
    if not has_nonempty_string(world.get("canonBoundary")):
        failures.append("run_manifest.json missing world.canonBoundary")
    if not has_nonempty_string(world.get("primaryFamily")):
        warnings.append("run_manifest.json missing world.primaryFamily")
    if not has_nonempty_string(world.get("secondaryLens")):
        warnings.append("run_manifest.json missing world.secondaryLens")

    source_inventory = read_json(base / "coverage/source_inventory.json")
    for key in REQUIRED_SOURCE_KEYS:
        if key not in source_inventory:
            failures.append(f"coverage/source_inventory.json missing {key}")
    commands = source_inventory.get("commands", [])
    if not isinstance(commands, list) or not commands:
        failures.append("coverage/source_inventory.json has no recorded commands")
    else:
        joined = "\n".join(str(item) for item in commands)
        if "fandom " not in joined:
            warnings.append("coverage/source_inventory.json recorded commands but none mention fandom")
    sources = source_inventory.get("sources", [])
    if not isinstance(sources, list) or not sources:
        failures.append("coverage/source_inventory.json has no recorded sources")

    coverage_report = read_json(base / "coverage/coverage_report.json")
    for key in REQUIRED_COVERAGE_KEYS:
        if key not in coverage_report:
            failures.append(f"coverage/coverage_report.json missing {key}")
    if coverage_report.get("planningVerdict") not in {"PASS", "PARTIAL", "FAIL"}:
        failures.append("coverage/coverage_report.json has invalid planningVerdict")
    numeric_targets = coverage_report.get("numericTargets")
    if not isinstance(numeric_targets, dict):
        failures.append("coverage/coverage_report.json missing numericTargets object")
    else:
        tier1 = numeric_targets.get("tier1Characters")
        if not isinstance(tier1, int) or tier1 <= 0:
            failures.append("coverage/coverage_report.json numericTargets.tier1Characters must be a positive integer")

    final_report = read_text(base / "final_report.md")
    lowered = final_report.lower()
    if "planning" not in lowered:
        failures.append("final_report.md does not state planning context")
    if not any(word in lowered for word in ["pass", "partial", "fail"]):
        failures.append("final_report.md does not record planning verdict")

    stage_gate = read_json(base / "stage_gate_log.json")
    stage_map = {stage.get("stageId"): stage for stage in stage_gate.get("stages", [])}
    for stage_id in REQUIRED_STAGE_PASS:
        stage = stage_map.get(stage_id)
        if not stage:
            failures.append(f"stage_gate_log.json missing stage {stage_id}")
            continue
        if stage.get("verdict") != "PASS":
            failures.append(f"stage {stage_id} is not PASS")
        evidence = stage.get("evidence", [])
        if not isinstance(evidence, list) or not evidence:
            failures.append(f"stage {stage_id} has no evidence")

    verdict = "PASS"
    if failures:
        verdict = "FAIL"
    elif warnings:
        verdict = "PARTIAL"

    print(
        json.dumps(
            {
                "verdict": verdict,
                "missing": missing,
                "failures": failures,
                "warnings": warnings,
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    if verdict == "FAIL":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
