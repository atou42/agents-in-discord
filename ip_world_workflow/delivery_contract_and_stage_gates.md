# Delivery Contract And Stage Gates

This document defines the long-task operating model for high-standard Neta Studio World creation.

The workflow must be delivery-led, not activity-led. The builder should not start by importing atoms or generating images. The correct order is:

```text
understand the world
-> define the final delivery
-> derive the intermediate stages
-> complete and verify each stage
-> run final acceptance
-> publish a clear handoff package
```

## Core rule

Every stage must have a defined output and a verification plan before work begins.

The agent may perform the work itself or delegate parts to sub-agents, but ownership stays with the main builder. Sub-agent reports are not acceptance evidence unless the main builder reviews or re-runs the decisive checks.

If a clean-context sub-agent can make the run faster or improve quality, the workflow should use it proactively. Do not treat whole-world serial execution as the default when independent research, drafting, comparison or verification slices can be delegated safely.

The workflow should advance through gates. A stage is not complete when the agent believes the work is done. It is complete only when the expected artifact exists, the verification evidence has been recorded, and the stage verdict is PASS.

## Stage-gate contract

Each stage must record:

- stage name
- intent
- required inputs
- required outputs
- owner or delegated workers
- verifier role
- verification method
- evidence location
- verdict
- known gaps or follow-up repairs

If the stage verdict is FAIL, the next stage should not begin until the failure is repaired or explicitly scoped out.

If the stage verdict is PARTIAL, the final handoff must say exactly which evidence is missing and why the run should not be treated as fully accepted.

## Clean-context adversarial verification

This workflow uses clean-context adversarial verification for staged acceptance.

For non-trivial stages, verification should be assigned to a clean-context verifier sub-agent whenever the environment allows it. The verifier should receive the delivery definition, expected artifacts, artifact locations and acceptance criteria, but not the builder's internal reasoning or self-justification.

The verifier's job is not to agree with the builder's explanation. The verifier's job is to try to break the stage result against the delivery contract.

Verification must be based on defined deliverables, not open-ended analysis. A verifier should start from the promised output and ask whether it really exists, whether it has the right structure, whether it is accessible, whether it is grounded in source or live state, and whether obvious failure modes have been probed.

The verifier should check each stage with:

- a normal-path check that proves the intended output exists
- a structure check that proves the output has the right shape and IDs
- a source or state check that proves the result is grounded in the chosen inputs or live product state
- at least one adversarial or non-happy-path probe when the stage has real behavior, schema, import, generation, placement, publication or handoff risk

Verification cannot be only visual confidence, another agent's claim, or a successful command without checking the resulting state.

Each verification should end with PASS, FAIL or PARTIAL.

The main builder may repair failures after verification, but repair and verification should remain conceptually separate. After repair, the affected stage should be verified again.

## Delivery-first planning

After world diagnosis, the builder must define the final delivery contract before implementation planning.

The final delivery contract should include:

- target world name
- canon or scope boundary
- primary family and secondary family or lens
- expected coverage shape by atom type
- board target mode
- visual style authority
- final required IDs
- final required files
- final screenshots and asset folders
- final report shape
- acceptance evidence required for sign-off

Only after the final delivery is defined should the builder derive intermediate tasks.

## Required final handoff

A complete run must hand off a package that is easy to inspect without reconstructing the workflow from chat history.

The package should include:

- final report
- world ID
- bound Cohub space ID
- final checkpoint ID
- Studio world URL
- Cohub space URL
- coverage inventory and coverage report
- world diagnosis
- style decision
- import package
- live manifest snapshot
- board placement snapshot
- final board screenshot
- world cover or key visual screenshot
- key character asset folder
- key location asset folder when location visuals are important
- generated work or media artifact links
- stage-gate verification log
- execution plan
- known limitations and deferred candidates

The board screenshot should show the large board state, not only a cropped card. The world cover screenshot should prove the world presents correctly in the world list or Studio entry surface.

Key character assets should include the core cast or the top-tier independent character covers chosen by the coverage plan. They should be stored in a predictable folder and referenced from the final report.

## Recommended handoff folder shape

Use a stable run folder for each world:

```text
deliverables/<world-slug>/
  README.md
  final_report.md
  stage_gate_log.md
  world_diagnosis.md
  delivery_contract.md
  execution_plan.md
  coverage/
  import/
  manifests/
  screenshots/
    board/
    cover/
    studio/
  assets/
    key_characters/
    key_locations/
    key_visuals/
  references/
```

The exact storage location can vary by run, but the final report must link to every important artifact.

## Stage model

The default stages are:

### World understanding

Intent: understand the IP before deciding what to build.

Outputs: source map, world diagnosis, scope boundary.

Verification: a clean-context verifier checks the promised source map, diagnosis and scope boundary, then tries to find missing source surfaces, vague canon boundaries or diagnosis claims that do not affect later delivery.

### Delivery definition

Intent: define what complete means before doing the build.

Outputs: delivery contract, expected artifact list, acceptance plan, execution plan.

Verification: a clean-context verifier checks the contract itself as the artifact, then tries to find missing required IDs, reports, screenshots, key asset folders, checkpoint requirement, stage-gate requirements, undefined acceptance criteria, or no explicit delegation plan for parallelizable slices.

### Source inventory and coverage plan

Intent: turn source material into a closed candidate ledger.

Outputs: coverage inventory, tiering, candidate statuses, omission rules, and a Fandom-grounded reference pack for style and asset truth.

Verification: a clean-context verifier checks the coverage inventory against the source surfaces, then tries to find unaccounted candidates, fuzzy Tier 1 or Tier 2 targets, over-trusted root category counts, or candidates with no final status.

The same stage must also prove a usable `references/fandom_reference_pack.json` exists before style work. The pack must cover multiple canon subjects, include concrete Fandom-grounded image references, and explicitly name the subjects the style phase will judge against.

### Content architecture and import package

Intent: produce creator-facing atoms that can be imported cleanly.

Outputs: structured import JSON, visible card samples, provenance sidecars if needed.

Verification: a clean-context verifier inspects representative and risky cards against the delivery contract, then tries to find prompt leakage, source metadata dumps, weak English, unsupported claims, wrong atom types, schema drift or cards that do not serve creators.

Visible world and atom copy must land as final English. The preferred path is direct English authoring. If translation or polishing is required, the run must record a Cohub English-space pass instead of using browser translation or generic web-translation APIs.

### Visual style and asset generation

Intent: choose one world-level style and generate usable visual assets.

Outputs: style decision, covers, key visual, key character assets, key location assets where needed.

Verification: a clean-context verifier checks the style source and generated assets, then tries to find cross-style contamination, actor-copying, film-still imitation, weak identity fidelity, missing files or assets not archived in the handoff folder.

### Studio world creation and import

Intent: create the real Studio world and bind the Cohub execution space.

Outputs: world ID, space ID, import result, live manifest snapshot.

Verification: a clean-context verifier checks the live Studio and Cohub state, then tries to find missing world binding, wrong IDs, live manifest mismatch, broken schema or lock residue.

### Board composition

Intent: make the world readable and usable as a Studio board.

Outputs: board placement snapshot, final board screenshot, section layout.

Verification: a clean-context verifier checks read-back placements and screenshots, then tries to find missing zones, unreadable overlap, card piles, mismatch with diagnosis, or screenshots that do not prove the final board state.

### Work or media proof

Intent: prove the world is a creation surface, not only stored data.

Outputs: at least one meaningful work or media artifact linked to the world.

Verification: a clean-context verifier checks the live product state and final report reference, then tries to find missing links, orphan media, inaccessible artifacts or proof that the work is not connected to the world.

### Final acceptance and handoff

Intent: prove the complete delivery can be inspected and reused.

Outputs: final report, final checkpoint, complete handoff folder.

Verification: a clean-context verifier runs chain, content, visual and handoff acceptance together from the final delivery contract. The verifier tries to break the handoff by checking world ID, space ID, checkpoint ID, links, screenshots, key assets, coverage, manifest, board state, known limitations and access paths.

## Failure conditions

The machine-enforced gate list is produced by `local_world_workflow.py gates`. The conditions below are the contract-level rules; each one is either enforced by a named gate or explicitly marked as judgment-level.

The workflow fails if stages are executed without a delivery contract.

The workflow fails if a stage completes without recorded verification.

The workflow fails if a run starts external tool work without `capabilities.json` in the run dir (gate: `capabilities`).

The workflow fails if `world_understanding` reaches PASS without a valid `source_map.md` (gate: `source_map`).

The workflow fails if `delivery_contract` reaches PASS without a valid `delivery_contract.md` (gate: `delivery_contract`).

The workflow fails if `delivery_contract` or any later stage reaches PASS without a valid `execution_plan.md` that names where subagents will be used, addresses every default-delegate slice in `delegation_map.json`, and names verification ownership (gate: `execution_plan`).

The workflow fails if the coverage report does not declare positive `numericTargets` including `tier1Characters` (gate: `source_inventory`).

The workflow fails if `source_inventory` or any later stage reaches PASS without a target lock in the workflow hub's `target_locks/`, or while the coverage report's `numericTargets` differ from the locked values in any direction (gate: `target_lock`). Delivery targets are written by the planning subagent and frozen by `lock-targets`; downgrading them mid-run is forbidden. `core_sample` scale requires explicit user approval at lock time, `full_world` locks enforce a tier-1 floor of max(12, 15% of observed characters), and `relock-targets` only accepts equal-or-higher numbers.

The workflow fails if `style_decision` reaches PASS without a valid `style_decision.json` that proves the selected style came from `style_space` or `approved_style_library`, includes evidence, rationale, `selectionExecutor` and `verifiedBy`, and explicitly consumes the Fandom reference pack (gate: `style_decision`).

The workflow fails if `source_inventory` reaches PASS without a valid `references/fandom_reference_pack.json` (gate: `fandom_reference_pack`) or valid coverage files (gate: `source_inventory`).

The workflow fails if `world_diagnosis` reaches PASS without a valid `world_diagnosis.md` (gate: `world_diagnosis`).

The workflow fails if any stage is marked PASS while a gate from any earlier stage no longer passes; marking a stage PASS re-runs the full cumulative gate set (mechanism: `gates_for_stage`).

The workflow fails if `atom_package` reaches PASS while character cards are description-only, miss required sections, or leak internal fields (gate: `character_cards_import`), or while visible copy still carries CJK text without an evidenced Cohub English-space pass (gate: `english_provenance_import`).

The workflow fails if `studio_world_bootstrap` reaches PASS without a valid `world_...` ID, bound `spaceId`, and matching URLs (gate: `bootstrap_ids`).

The workflow fails if `bound_space_import` reaches PASS without an evidenced small-batch smoke import whose `atomsAdded > 0` (gate: `import_smoke`), a live manifest matching the import package and any declared `numericTargets.totalAtoms` (gate: `import_state`), clean live character cards (gate: `character_cards_live`), and English-clean live copy (gate: `english_provenance_live`).

The workflow fails if `cover_quality` reaches PASS without archived cover evidence and key assets meeting any declared `numericTargets.keyCharacterAssets` (gate: `cover_assets`), or without a clean-context style sign-off in `checks/style_audit.json` dated after the newest asset change (gate: `style_audit`).

The workflow fails if `work_media` reaches PASS without at least one world-linked work in the live manifest (gate: `work_media`).

The workflow fails if `board_layout` reaches PASS without a non-empty board placement snapshot and an archived final board screenshot (gate: `board_layout`).

The workflow fails if the final report does not include world ID, space ID and checkpoint ID (enforced by `verify-handoff`).

The workflow fails if screenshots and key assets exist only inside the board and are not archived in an inspectable location (enforced by `verify-handoff` required files).

Judgment-level conditions that no script can fully enforce, and that clean-context verification must still cover: whether the board screenshot honestly proves the final board state, whether prose quality serves creators, and whether sub-agent claims were reviewed rather than pasted. Sub-agent claims are never final evidence without main-agent review or reproduction of the decisive checks.
