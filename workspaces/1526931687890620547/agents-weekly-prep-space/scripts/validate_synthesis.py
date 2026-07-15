#!/usr/bin/env python3
import json
import sys
from pathlib import Path


ROOT_FIELDS = {
    "course_id",
    "status",
    "current_main_line",
    "what_works",
    "blocking_changes",
    "revised_schedule",
}
BLOCKER_FIELDS = {"title", "why", "replacement", "speaker_action"}
SCHEDULE_FIELDS = {"title", "minutes"}


def non_empty_string(value):
    return isinstance(value, str) and bool(value.strip())


def validate(data):
    errors = []
    if not isinstance(data, dict):
        return ["synthesis root must be an object"]

    for field in data:
        if field not in ROOT_FIELDS:
            errors.append(f"unexpected root field {field}")
    for field in ("course_id", "current_main_line"):
        if not non_empty_string(data.get(field)):
            errors.append(f"{field} must be a non-empty string")
    if data.get("status") not in {"needs_revision", "ready_for_acceptance"}:
        errors.append("status must be needs_revision or ready_for_acceptance")

    what_works = data.get("what_works")
    if not isinstance(what_works, list) or any(
        not non_empty_string(item) for item in what_works
    ):
        errors.append("what_works must be a list of non-empty strings")

    blockers = data.get("blocking_changes")
    if not isinstance(blockers, list) or len(blockers) > 3:
        errors.append("blocking_changes must contain 0 to 3 items")
        blockers = blockers if isinstance(blockers, list) else []
    for index, blocker in enumerate(blockers, start=1):
        path = f"blocking_changes[{index}]"
        if not isinstance(blocker, dict):
            errors.append(f"{path} must be an object")
            continue
        for field in blocker:
            if field not in BLOCKER_FIELDS:
                errors.append(f"{path} has unexpected field {field}")
        for field in BLOCKER_FIELDS:
            if not non_empty_string(blocker.get(field)):
                errors.append(f"{path}.{field} must be a non-empty string")

    schedule = data.get("revised_schedule")
    if not isinstance(schedule, list) or not schedule:
        errors.append("revised_schedule must be a non-empty list")
        schedule = schedule if isinstance(schedule, list) else []
    minutes_total = 0
    for index, segment in enumerate(schedule, start=1):
        path = f"revised_schedule[{index}]"
        if not isinstance(segment, dict):
            errors.append(f"{path} must be an object")
            continue
        for field in segment:
            if field not in SCHEDULE_FIELDS:
                errors.append(f"{path} has unexpected field {field}")
        if not non_empty_string(segment.get("title")):
            errors.append(f"{path}.title must be a non-empty string")
        minutes = segment.get("minutes")
        if not isinstance(minutes, int) or isinstance(minutes, bool) or minutes <= 0:
            errors.append(f"{path}.minutes must be a positive integer")
        else:
            minutes_total += minutes
    if schedule and not 30 <= minutes_total <= 60:
        errors.append("revised_schedule minutes must total between 30 and 60")

    if data.get("status") == "ready_for_acceptance" and blockers:
        errors.append("ready_for_acceptance synthesis cannot contain blockers")
    return errors


def main():
    if len(sys.argv) != 2:
        print("usage: validate_synthesis.py <synthesis.json>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as error:
        print(f"cannot read synthesis: {error}", file=sys.stderr)
        return 2
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        print(f"invalid JSON: {error}", file=sys.stderr)
        return 1
    errors = validate(data)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("PASS: synthesis keeps speaker work to three or fewer changes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
