#!/usr/bin/env python3
import json
import sys
from pathlib import Path


if len(sys.argv) != 2:
    print("ERROR: provide one JSON file", file=sys.stderr)
    raise SystemExit(2)

try:
    payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as error:
    print(f"ERROR: unreadable input: {error}", file=sys.stderr)
    raise SystemExit(1)

records = payload.get("records") if isinstance(payload, dict) else None
if not isinstance(records, list):
    print("ERROR: records must be a list", file=sys.stderr)
    raise SystemExit(1)

for index, record in enumerate(records):
    if not isinstance(record, dict) or not record.get("result"):
        print(f"ERROR: records[{index}].result is missing", file=sys.stderr)
        raise SystemExit(1)

print(f"PASS: {len(records)} records verified")
