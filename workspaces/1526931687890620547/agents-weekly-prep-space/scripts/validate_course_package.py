#!/usr/bin/env python3
import json
import sys
from pathlib import Path


ALLOWED_SUPPORT_TYPES = {"case", "demo", "evidence"}
ALLOWED_SEGMENT_KINDS = {"opening", "content", "demo", "summary"}


def non_empty_string(value):
    return isinstance(value, str) and bool(value.strip())


def validate_item_text(item, fields, path, errors):
    if not isinstance(item, dict):
        errors.append(f"{path} must be an object")
        return
    for field in fields:
        if not non_empty_string(item.get(field)):
            errors.append(f"{path}.{field} must be a non-empty string")


def validate_package(data):
    errors = []
    if not isinstance(data, dict):
        return ["package root must be an object"]

    course = data.get("course")
    if not isinstance(course, dict):
        errors.append("course must be an object")
        course = {}
    for field in ("title", "promise", "audience"):
        if not non_empty_string(course.get(field)):
            errors.append(f"course.{field} must be a non-empty string")

    talk_minutes = course.get("talk_minutes")
    qa_minutes = course.get("qa_minutes")
    if not isinstance(talk_minutes, int) or isinstance(talk_minutes, bool):
        errors.append("course.talk_minutes must be an integer")
    elif not 30 <= talk_minutes <= 60:
        errors.append("course.talk_minutes must be between 30 and 60")
    if not isinstance(qa_minutes, int) or isinstance(qa_minutes, bool):
        errors.append("course.qa_minutes must be an integer")
    elif not 5 <= qa_minutes <= 10:
        errors.append("course.qa_minutes must be between 5 and 10")

    takeaways = data.get("takeaways")
    if not isinstance(takeaways, list) or not 1 <= len(takeaways) <= 3:
        errors.append("takeaways must contain 1 to 3 items")
        takeaways = takeaways if isinstance(takeaways, list) else []
    for index, takeaway in enumerate(takeaways, start=1):
        path = f"takeaways[{index}]"
        validate_item_text(takeaway, ("title",), path, errors)
        if not isinstance(takeaway, dict):
            continue
        support = takeaway.get("support")
        if not isinstance(support, dict):
            errors.append(f"{path}.support must be an object")
            continue
        if support.get("type") not in ALLOWED_SUPPORT_TYPES:
            errors.append(
                f"{path}.support.type must be one of case, demo, evidence"
            )
        if not non_empty_string(support.get("description")):
            errors.append(f"{path}.support.description must be a non-empty string")

    segments = data.get("segments")
    if not isinstance(segments, list) or not segments:
        errors.append("segments must be a non-empty list")
        segments = segments if isinstance(segments, list) else []
    segment_total = 0
    referenced_takeaways = set()
    for index, segment in enumerate(segments, start=1):
        path = f"segments[{index}]"
        validate_item_text(segment, ("title", "purpose"), path, errors)
        if not isinstance(segment, dict):
            continue
        kind = segment.get("kind")
        if kind not in ALLOWED_SEGMENT_KINDS:
            errors.append(
                f"{path}.kind must be one of opening, content, demo, summary"
            )
        minutes = segment.get("minutes")
        if not isinstance(minutes, int) or isinstance(minutes, bool) or minutes <= 0:
            errors.append(f"{path}.minutes must be a positive integer")
        else:
            segment_total += minutes
        takeaway_index = segment.get("takeaway_index")
        if takeaway_index is not None:
            if (
                not isinstance(takeaway_index, int)
                or isinstance(takeaway_index, bool)
                or not 1 <= takeaway_index <= len(takeaways)
            ):
                errors.append(f"{path}.takeaway_index does not reference a takeaway")
            else:
                referenced_takeaways.add(takeaway_index)

    if segments:
        first = segments[0] if isinstance(segments[0], dict) else {}
        last = segments[-1] if isinstance(segments[-1], dict) else {}
        if first.get("kind") != "opening":
            errors.append("the first segment must have kind opening")
        elif isinstance(first.get("minutes"), int) and first["minutes"] > 3:
            errors.append("the opening segment must not exceed 3 minutes")
        if last.get("kind") != "summary":
            errors.append("the last segment must have kind summary")
    if isinstance(talk_minutes, int) and not isinstance(talk_minutes, bool):
        if segment_total > talk_minutes:
            errors.append(
                f"segment minutes total {segment_total} exceeds talk_minutes {talk_minutes}"
            )
        elif segment_total < talk_minutes:
            errors.append(
                f"segment minutes total {segment_total} does not fill talk_minutes {talk_minutes}"
            )
    missing_takeaways = set(range(1, len(takeaways) + 1)) - referenced_takeaways
    if missing_takeaways:
        indexes = ", ".join(str(index) for index in sorted(missing_takeaways))
        errors.append(f"segments do not cover takeaway indexes: {indexes}")

    qa = data.get("qa")
    if not isinstance(qa, list) or not qa:
        errors.append("qa must be a non-empty list")
        qa = qa if isinstance(qa, list) else []
    for index, item in enumerate(qa, start=1):
        validate_item_text(
            item, ("question", "answer_direction"), f"qa[{index}]", errors
        )

    recall_questions = data.get("recall_questions")
    if not isinstance(recall_questions, list) or len(recall_questions) != 3:
        errors.append("recall_questions must contain exactly 3 items")
        recall_questions = (
            recall_questions if isinstance(recall_questions, list) else []
        )
    for index, item in enumerate(recall_questions, start=1):
        validate_item_text(
            item,
            ("question", "expected_answer"),
            f"recall_questions[{index}]",
            errors,
        )

    if data.get("status") != "ready":
        errors.append("status must be ready before validation")
    return errors


def main():
    if len(sys.argv) != 2:
        print("usage: validate_course_package.py <course-package.json>", file=sys.stderr)
        return 2

    package_path = Path(sys.argv[1])
    try:
        raw = package_path.read_text(encoding="utf-8")
    except OSError as error:
        print(f"cannot read package: {error}", file=sys.stderr)
        return 2
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        print(f"invalid JSON: {error}", file=sys.stderr)
        return 1

    errors = validate_package(data)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("PASS: course package satisfies structural readiness checks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
