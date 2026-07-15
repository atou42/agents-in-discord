Entry: calibrate complete material
Title: Make Agent Failures Visible
Audience: colleagues who already use Agents at work
Talk: 30 minutes
Q&A: 5 minutes
Promise: After the talk, listeners can add one explicit validation boundary to an Agent workflow and route a failure to action.

This is a synthetic acceptance fixture. Its claims concern only the supplied local demo and can be verified by running it. It is not a production case or an industry benchmark.

Takeaway 1: Define success as a checkable result, not the absence of an exception.
Support: run `python3 tests/fixtures/reliability-demo.py tests/fixtures/reliability-demo-valid.json`; it exits zero and prints `PASS: 2 records verified`.

Takeaway 2: Invalid output must stop with a specific error.
Support: run `python3 tests/fixtures/reliability-demo.py tests/fixtures/reliability-demo-invalid.json`; it exits nonzero and prints `ERROR: records[1].result is missing`.

Takeaway 3: The failure message must identify the next repair location.
Support: the invalid demo identifies `records[1].result`, so the operator knows which record and field to repair.

Schedule: opening and promise 3 minutes; valid-path demo 7 minutes; invalid-path demo 8 minutes; explain the validation boundary 7 minutes; audience application prompt 3 minutes; summary 2 minutes. Q&A starts after the 30-minute talk and lasts 5 minutes.

Transitions: from promise to valid demo, show what success looks like; from valid to invalid demo, change only one record; from invalid demo to method, extract the reusable validation boundary; from application to summary, ask listeners to name the boundary they will add.

Likely Q&A: Should every warning stop the workflow? Answer direction: no, only a failed required invariant stops it; optional observations remain labeled warnings. Where should the validation live? Answer direction: at the boundary before the result is accepted or persisted.

Recall questions: What makes success checkable? Expected answer: a required invariant is verified. What should invalid output do? Expected answer: stop with a specific error. What makes the error actionable? Expected answer: it identifies the failed location or field.
