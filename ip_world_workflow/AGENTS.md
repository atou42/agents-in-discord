# IP World Workflow Entry

This folder is the stable local entry for IP world planning work across all `agents-in-discord` workspaces.

Use it when the user asks for a new world planning run, not when they are already in later Studio execution stages.

The default trigger sentence is:

`启动 <IP> world planning`

The minimal reading order is:

0. `PHILOSOPHY.md` — why this workflow exists, what Neta Studio is, and what "good" means. Read it before anything else; the rest of the package is instances of it.
1. `start_new_planning_run.md`
2. `planning_opening_workflow.md`
3. `delivery_contract_and_stage_gates.md`
4. `confirmed_decisions.md`
5. `acceptance_and_open_questions.md`
6. `references/neta_studio_world_factory_product_spec.md` — the product bar: coverage standards, card display standards, style standards, and what fails product validation even when technical validation passes.

Run artifacts should be created in the current workspace under `deliverables/`, but the workflow package itself stays here:

`/Users/atou/agents-in-discord/ip_world_workflow`

Do not start by creating a Studio world. First create a planning package with one clean-context subagent and verify the package from artifacts.

If using subagents can make the run faster or improve quality, use them proactively. Do not keep a whole world serial by default when the work can be split into clean independent slices or clean-context verification. The default delegation table is `delegation_map.json`; the execution-plan gate enforces it.

Before choosing any external tool in a run, read the run's `capabilities.json` (snapshotted from `capability_registry.json` by init-run). The English space, style space, Fandom transport and known-good import samples are all named there; gates check against it.

At any point in a run, `python3 scripts/local_world_workflow.py next --run-dir <run>` tells you the current stage, the blocking gates and the exact next command. `python3 scripts/local_world_workflow.py gates` prints the authoritative gate table.

Delivery targets are not yours to shrink. The planning subagent sets `numericTargets`, `lock-targets` freezes them outside the run dir before source_inventory can PASS, and the `target_lock` gate re-checks them at every later stage. If mid-run reality breaks the target, record FAIL or PARTIAL with the gap documented — do not edit the goal to match the delivery. Declaring a run `core_sample` requires explicit user approval at lock time.

Gate scripts are read-only for run agents. `local_world_workflow.py` verifies its own hash against `script_integrity.json` on every invocation and refuses to run if modified. If a gate genuinely blocks legitimate work (e.g. a platform hard cap), do not patch the script — stop, report the blocker to the user with evidence, and let the user decide. Any approved change is re-recorded with `accept-script-hash --approved-by user`. Unilateral gate edits are treated as delivery fraud regardless of intent.

Phase one ends with the user, not with a script. Before any execution (import, generation, board), present `ip_proposal.md` — cast scope, cross-verified references, fan red lines, delight plan, 3-5 style candidates with exemplar images — and wait for explicit approval, recorded in `checks/ip_proposal_approval.json`. The `ip_proposal` gate blocks every execution stage until it exists. Silence is not approval.

The workflow is modularized into dedicated Cohub spaces, each independently runnable and accumulating its own methodology across runs. All IDs live in `capability_registry.json`; canonical charters/methods live in `spaces/` here in git (space copies are mirrors):

- **proposal** — phase-one research producing `ip_proposal.md`; ends with user confirmation
- **style selection** — audition 3-5 candidates against the reference pack; reads the colleague-maintained Studio_ArtStyle asset library upstream (read-only); ends with user confirmation
- **character craft** — six-section card batches with trait dimensionalization (bundled character-traits skill); shared-exemplar batch discipline
- **world geography** — location cards with relative-position anchors; board zoning proposals that mirror canonical geography
- **acceptance** — clean-context adversarial audits (style/factuality/final); `verifierSessionId` in audit files should come from its sessions
- **domain knowledge** (user-maintained) — KB1-KB4 method layer all of the above consume; new failure modes feed back into KB2

Modules exchange work only through run-directory artifacts; hard verdicts remain with the git gate script.
