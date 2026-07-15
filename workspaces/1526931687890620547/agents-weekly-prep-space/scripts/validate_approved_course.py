#!/usr/bin/env python3
import sys
from pathlib import Path


ALLOWED = {"course-package.json", "acceptance.md", "recall-questions.md"}


def main():
    if len(sys.argv) != 2:
        print("usage: validate_approved_course.py <approved-course-dir>", file=sys.stderr)
        return 2

    course_dir = Path(sys.argv[1])
    if not course_dir.is_dir():
        print(f"approved course directory not found: {course_dir}", file=sys.stderr)
        return 2

    entries = {path.name for path in course_dir.iterdir()}
    errors = []
    for name in sorted(ALLOWED - entries):
        errors.append(f"missing approved entry: {name}")
    for name in sorted(entries - ALLOWED):
        errors.append(f"unexpected approved entry: {name}")
    for name in sorted(ALLOWED & entries):
        path = course_dir / name
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"approved entry must be a non-empty file: {name}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("PASS: approved course contains only curated speaker-facing files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
