# Neta Studio World Workflow Hub

This package is the seed for a dedicated Cohub space that owns the workflow for building high-standard Neta Studio Worlds from Fandom and adjacent source material.

The purpose is not to store one more IP delivery. The purpose is to keep the operating standard, the historical lessons, the known constraints, and the unresolved product questions in one place so future world builders stop repeating the same mistakes.

## What is already decided

The chain is Studio-first. A real Studio world must be created in `neta.art` first, then its bound Cohub space becomes the execution space.

Coverage must be driven by source inventory, not a hand-picked cast list.

Visible cards must read like world bible material for creators, not like source metadata dumps or prompt scaffolds.

Each world uses one world-level visual style across characters, locations, objects, events, works and key visuals.

Acceptance must pass three layers at the same time: chain health, content quality and visual consistency.

## What this folder contains

- `AGENTS.md`
  First reading file for agents entering the workflow package.
- `capability_registry.json`
  Single source of truth for external capabilities (English space, style space, Fandom transport, known-good import samples, external-batch policy). `init-run` snapshots it into each run as `capabilities.json` and gates check decisions against it.
- `delegation_map.json`
  Default delegation table. The execution-plan gate requires every default-delegate slice to be adopted or explicitly justified as serial.
- `target_locks/`
  Frozen delivery-target snapshots, one per run, written by `lock-targets`. Stored outside run directories, fingerprinted, read-only and git-committed so a run's main agent cannot edit its own delivery bar down mid-run. The `target_lock` gate re-checks every stage PASS against the lock; `relock-targets` only accepts higher numbers, and `core_sample` scale requires explicit user approval.
- `confirmed_decisions.md`
  The operating rules already locked in.
- `execution_profiles_and_environment_boundaries.md`
  The now-proven split between local owner-authenticated stages, workflow-hub process work and bound-space execution work, plus the current default of strict local-dependent orchestration.
- `workflow_runbook.md`
  The current end-to-end workflow, written for reuse.
- `planning_opening_workflow.md`
  The standard opening-stage workflow for planning before any Studio world is created.
- `start_new_planning_run.md`
  The literal operator entrypoint for kicking off the next planning run.
- `world_diagnosis_dimensions.md`
  First-version dimension system for diagnosing an IP before coverage, writing, style and board decisions.
- `delivery_contract_and_stage_gates.md`
  Delivery-led long-task workflow: define final handoff first, derive stages, verify each stage, then run final acceptance.
- `board_template_draft.md`
  Draft default layout rules for a readable Studio board.
- `world_metadata_schema_draft.md`
  Draft default schema for world name, overview, prologue and section copy.
- `acceptance_and_open_questions.md`
  Acceptance gates plus unresolved questions that still need product decisions.
- `history_and_findings.md`
  The short history of what was tried, what failed and what was learned.
- `subagent_world_planning_prompt_template.md`
  The current recommended self-contained one-shot prompt template for planning-stage subagent delegation.
- `prompt_evolution_principles.md`
  How to revise the subagent prompt after a failed or weak planning run without patching the run output itself.
- `subagent_planning_eval_2026-07-03.md`
  Recorded evaluation of prompt evolution, including failed early attempts and later passing one-shot runs.
- `planning_pass_samples.md`
  Index of verified passing planning runs and fallback slice samples.
- `scripts/verify_planning_package.py`
  Artifact-based verifier for planning packages. This is the standard acceptance gate for the opening-stage workflow.
- `skills/neta-studio-world-factory.SKILL.snapshot.md`
  Snapshot of the current runtime skill that encodes the strongest known process.
- `scripts/local_world_workflow.py`
  Local control-plane helper that creates the run folder, records stage-gate verdicts, stores IDs, checks the execution-plan gate, checks the Fandom reference-pack gate, checks style-decision evidence, checks character-card completeness and checks final handoff completeness.
- `scripts/check_character_cards.py`
  Character-card audit that hard-fails description-only or under-structured character packages.
- `scripts/cohub_studio_via_cookie.py`
  Experimental helper for Cohub-side Studio create and provision when cookie bootstrap is intentionally supplied.
- `scripts/cohub_fandom_via_jina.py`
  Experimental helper for Cohub-side Fandom discovery through `r.jina.ai`.
- `references/`
  Key reports and specs copied from prior delivery workspaces.

## Current intent for the Cohub space

The Cohub space seeded by this package should become the source of truth for:

- workflow policy
- acceptance bar
- historical reports
- reusable import and coverage conventions
- pending decisions before automation is hardened

Do not treat this space as a delivery world. Treat it as the operating system for future worlds.

Current production default is still the strict local-dependent workflow. The Cohub-closed-loop bootstrap path is preserved here as a proved branch, but it is not the default operating mode.

## How to trigger it next time

If the user wants to start planning for a new IP world, the agent should treat that as a direct trigger for the planning opening workflow.

The trigger intent is any request that effectively means:

- start a new IP world run
- create a planning package before world creation
- test or run the planning stage with a clean-context subagent

The opening stack is:

- `planning_opening_workflow.md`
- `python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py init-run ...`
- `subagent_world_planning_prompt_template.md`
- `python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/verify_planning_package.py ...`

The correct first move is to initialize a fresh run directory. The correct second move is to send the planning prompt to one clean-context subagent. If extra clean-context workers would improve speed or quality, add them instead of keeping the whole world serial. The correct third move is to verify the resulting run directory artifacts.

For full build runs after planning, the same control script hard-gates the whole chain. The authoritative gate table is machine-readable: run `local_world_workflow.py gates` to see every stage and the cumulative gate set enforced on PASS, and run `local_world_workflow.py next --run-dir <run>` at any point to see the current blocking gates and the exact next command. Marking a stage PASS re-runs all earlier gates, so a run cannot advance past a prerequisite that has silently rotted. `verify-handoff` additionally writes `run_metrics.json` with per-stage attempts and timing so workflow speed and quality stay measurable across runs.
