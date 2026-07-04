# IP World Workflow Entry

This folder is the stable local entry for IP world planning work across all `agents-in-discord` workspaces.

Use it when the user asks for a new world planning run, not when they are already in later Studio execution stages.

The default trigger sentence is:

`启动 <IP> world planning`

The minimal reading order is:

1. `start_new_planning_run.md`
2. `planning_opening_workflow.md`
3. `delivery_contract_and_stage_gates.md`
4. `confirmed_decisions.md`
5. `acceptance_and_open_questions.md`

Run artifacts should be created in the current workspace under `deliverables/`, but the workflow package itself stays here:

`/Users/atou/agents-in-discord/ip_world_workflow`

Do not start by creating a Studio world. First create a planning package with one clean-context subagent and verify the package from artifacts.

If using subagents can make the run faster or improve quality, use them proactively. Do not keep a whole world serial by default when the work can be split into clean independent slices or clean-context verification. The default delegation table is `delegation_map.json`; the execution-plan gate enforces it.

Before choosing any external tool in a run, read the run's `capabilities.json` (snapshotted from `capability_registry.json` by init-run). The English space, style space, Fandom transport and known-good import samples are all named there; gates check against it.

At any point in a run, `python3 scripts/local_world_workflow.py next --run-dir <run>` tells you the current stage, the blocking gates and the exact next command. `python3 scripts/local_world_workflow.py gates` prints the authoritative gate table.

Delivery targets are not yours to shrink. The planning subagent sets `numericTargets`, `lock-targets` freezes them outside the run dir before source_inventory can PASS, and the `target_lock` gate re-checks them at every later stage. If mid-run reality breaks the target, record FAIL or PARTIAL with the gap documented — do not edit the goal to match the delivery. Declaring a run `core_sample` requires explicit user approval at lock time.

Gate scripts are read-only for run agents. `local_world_workflow.py` verifies its own hash against `script_integrity.json` on every invocation and refuses to run if modified. If a gate genuinely blocks legitimate work (e.g. a platform hard cap), do not patch the script — stop, report the blocker to the user with evidence, and let the user decide. Any approved change is re-recorded with `accept-script-hash --approved-by user`. Unilateral gate edits are treated as delivery fraud regardless of intent.
