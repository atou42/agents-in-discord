# Planning Opening Workflow

This workflow is the standard opening path for a new IP world run before any Studio world is created.

Its job is to produce a planning package that can survive artifact-based acceptance without the main agent rewriting the subagent's content.

## Outcome

The planning package must leave the next executor ready to begin atom authoring and later world build work.

The minimum package is:

- `delivery_contract.md`
- `execution_plan.md`
- `world_diagnosis.md`
- `coverage/source_inventory.json`
- `coverage/coverage_report.json`
- `final_report.md`
- `stage_gate_log.json`
- `run_manifest.json`

## Run directory norm

Each attempt uses a fresh run directory under `deliverables/` or another explicit base dir.

Do not reuse a failed run directory for the next attempt.

The run directory is both the working surface and the acceptance surface. The main agent should be able to accept or reject the planning package by reading only the files in that directory plus the verifier output.

## Standard entry

Start every run with the local control script:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py init-run \
  --base-dir deliverables \
  --world-name "<WORLD_NAME>" \
  --wiki <WIKI_SLUG> \
  --scope "<REQUESTED_SCOPE>"
```

This creates the run folder and the planning-stage artifact targets.

## Standard execution model

Use one clean-context subagent to create the whole planning package as the default first attempt.

If sliced delegation is clearly faster or safer for the target IP, use multiple clean-context subagents with narrow scopes instead of keeping the whole world serial. Good slices include source inventory recovery, delivery-contract shaping, world-diagnosis drafting and clean-context verification.

The main agent does not patch the subagent's outputs. It only:

- initializes the run
- sends the planning prompt
- adds extra clean-context workers when narrow parallel slices improve speed or quality
- waits for the subagent to finish
- verifies the run directory artifacts
- if needed, starts a fresh new run with a revised prompt

## Standard prompt

The current recommended one-shot prompt is stored in:

- `subagent_world_planning_prompt_template.md`
- `prompt_evolution_principles.md`

The prompt should be self-contained. The successful pattern on 2026-07-03 had these traits:

- no broad doc-reading requirement
- explicit file list
- explicit forbidden actions
- small source command set
- explicit canon default
- explicit file shapes
- self-verification with `verify_planning_package.py`

## Standard source rule

Planning must be source-grounded.

Default source preference:

- Fandom CLI first
- local wiki second if quickly available

Do not stall the planning run by spending a long time trying to locate a local wiki source. If it is not immediately available, the planning package should record that limitation and continue from Fandom-grounded planning.

## Standard acceptance

Use the planning verifier:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/verify_planning_package.py \
  --run-dir deliverables/<world-slug>
```

The verifier is the first gate, not the final judgment. The main agent should still read the files to catch shallow but technically passing content.

The planning package passes only when:

- scaffold text is gone
- required files are non-empty and structured
- source inventory records real commands and real source surfaces
- canon boundary is explicit
- the first four stages are `PASS` with evidence
- the package is concrete enough that the next executor can start atom authoring and later world build work

## Waiting rule

Do not call the run failed only because the first check after spawn shows placeholders.

The 2026-07-03 evaluation proved that a subagent may update files late in the run. Early manual checks on the same run falsely looked like failure before the agent completed the package.

Operational rule:

- wait for the subagent final answer when possible
- if you need to inspect mid-run, treat that only as progress observation
- do not mark the run failed until the subagent has either finished or clearly stalled beyond the allowed supervision window

## Failure rules

A planning run is `FAIL` if any core artifact still contains scaffold placeholders, empty JSON, fake `PASS` stage gates, missing canon boundary, or no recorded source commands.

A planning run is `PARTIAL` if it is artifact-complete but still records honest source or coverage limitations that leave the next executor with bounded follow-up work.

The planning verdict inside the package may be `PARTIAL` while the package itself still passes acceptance, as long as the limitations are explicit and the package remains usable.

## Iteration rule

If the run fails, keep the run folder unchanged as evidence.

Create a fresh run for the next attempt.

Between attempts, change only the subagent prompt surface:

- task framing
- reading order
- explicit constraints
- output shape
- source command budget
- blocker rule
- self-verification rule

Do not repair the failed subagent output by hand.

## Known-good sample

The current strongest sample is:

- `deliverables_sub_eval_v5/chainsaw-man`

This run passed the earlier planning verifier and remains the strongest prompt-shape sample, but it predates the newer `execution_plan.md` gate.

An additional useful sample is:

- `deliverables_sub_eval_v4/chainsaw-man`

That run also passed the earlier verifier, but recorded a planning verdict of `PARTIAL` because the source pass stayed intentionally shallow.

## Current boundary

This workflow is proven for the planning opening stage only.

It does not yet prove that the same prompt discipline is enough for atom authoring, Studio world bootstrap, cover generation, or board finalization. Those remain later stages with separate gates.
