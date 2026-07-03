# Planning Pass Samples

This file indexes planning-stage runs that passed the planning verifier available at the time they were recorded.

Older samples may predate newer gates such as `execution_plan.md`, `source_map.md` and `numericTargets` in the coverage report (added 2026-07-03). Treat them as prompt and artifact references unless they have been refreshed against the latest verifier. None of the samples below pass the current `verify_planning_package.py` as-is.

## Full-package pass samples

### Chainsaw Man v4

Run directory:

- `/Users/atou/agents-in-discord/workspaces/1522171285818445935/deliverables_sub_eval_v4/chainsaw-man`

What it proves:

- one clean-context subagent can produce a complete planning package
- the planning package could pass the then-current `verify_planning_package.py`
- the package may still carry a planning verdict of `PARTIAL` when its source pass is intentionally shallow but honest

Why keep it:

- good example of a usable package that still records limitations
- useful when teaching the difference between package acceptance and internal planning verdict

### Chainsaw Man v5

Run directory:

- `/Users/atou/agents-in-discord/workspaces/1522171285818445935/deliverables_sub_eval_v5/chainsaw-man`

What it proves:

- a more tightly shaped one-shot prompt can also produce a complete planning package
- the package could pass the then-current `verify_planning_package.py`
- the package can carry an internal planning verdict of `PASS`

Why keep it:

- strongest current sample for the recommended standard prompt shape
- cleaner minimal source budget than v4

## Slice sample

### Chainsaw Man source inventory slice

Run directory:

- `/Users/atou/agents-in-discord/workspaces/1522171285818445935/deliverables_sub_eval_slice1/chainsaw-man`

What it proves:

- a clean-context subagent can reliably complete a narrow planning slice
- sliced delegation remains a useful fallback for diagnosis and recovery

Why keep it:

- good fallback example when a future one-shot planning run fails and the main agent needs to isolate the problem
