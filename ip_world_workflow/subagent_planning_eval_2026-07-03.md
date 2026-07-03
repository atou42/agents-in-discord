# Subagent Planning Eval 2026-07-03

This note records a direct test of whether a clean-context subagent can complete the planning stage of a new world run from a self-contained prompt.

## Test setup

The first five one-shot runs targeted the same world:

- `deliverables_sub_eval/chainsaw-man`
- `deliverables_sub_eval_v2/chainsaw-man`
- `deliverables_sub_eval_v3/chainsaw-man`
- `deliverables_sub_eval_v4/chainsaw-man`
- `deliverables_sub_eval_v5/chainsaw-man`

All five asked a spawned subagent to complete planning only for Chainsaw Man without creating a Studio world.

The prompt was tightened across five rounds:

- round 1 asked for the full planning package with source grounding and stage logging
- round 2 added earlier write pressure, preferred source commands and a blocker rule
- round 3 narrowed reading, supplied exact Fandom commands and reduced research freedom
- round 4 added a forced first file write, explicit canon default, explicit file-level requirements, and self-verification with the planning verifier
- round 5 reduced the prompt even further and hard-coded exact file shapes

## What actually happened

The first three planning workers failed to produce planning artifacts by the time they were inspected.

Observed state at verification time:

- `delivery_contract.md` stayed on the scaffold placeholder
- `world_diagnosis.md` stayed on the scaffold placeholder
- `final_report.md` stayed on the scaffold placeholder
- `coverage/source_inventory.json` remained `{}`
- `coverage/coverage_report.json` remained `{}`
- `stage_gate_log.json` stayed fully `PENDING`
- `run_manifest.json` did not gain canon boundary or family updates

Subagent infrastructure itself was not broken. A separate smoke worker successfully wrote a simple file and returned.

That isolates the issue to delegated planning-task shape rather than spawn capability itself.

Those early inspections turned out to be incomplete. Round 4 eventually produced a usable planning package and passed `verify_planning_package.py`. Round 5 also produced a usable planning package and passed the same verifier.

## Conclusion

Raw self-contained prompt delegation can work for the planning stage, but only after the prompt removes most file-shape ambiguity and includes a self-verification loop.

The more important lesson is operational. A mid-run manual file check is not enough to declare failure. Round 4 looked dead at first and later completed successfully.

## What needs optimization

The workflow should not use loose planning prompts.

The currently strongest successful traits are:

- explicit file list
- small source command budget
- explicit canon default
- explicit output shapes for markdown and JSON artifacts
- explicit stage-gate update rule
- mandatory local self-verification with `verify_planning_package.py`
- patience from the supervising main agent until the subagent either finishes or clearly stalls

The slice test still has value. A separate narrow source-inventory slice in `deliverables_sub_eval_slice1/chainsaw-man` also completed successfully, which means subagent slicing remains a good fallback when one-shot planning quality needs to be isolated.

The workflow could still benefit from a richer planning form in the future, but prompt-only one-shot creation is no longer disproven.

## Decision

The standard workflow should now use the successful one-shot pattern as the default and keep sliced subtasks as a fallback for diagnosis or recovery.
