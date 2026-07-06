# Workflow Runbook

The authoritative gate table lives in the control script, not in this file. To see every stage, the gates it introduces, and the full cumulative set enforced on PASS, run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py gates
```

At any point in a run, ask the script what is blocking and what to do next:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py next \
  --run-dir deliverables/<world-slug>
```

This file explains the reasoning behind each phase. When this prose and the `gates` output disagree, the script wins and this file should be fixed.

## Phase 0

Pick the target IP and define scope before any world is created.

Scope needs to say which canon line is in and which line is out. If that is vague, coverage work becomes meaningless later.

Before choosing any external tool, read the run's `capabilities.json`. `init-run` snapshots it from the hub's `capability_registry.json`. It names the Cohub English space for translation and polish, the style space for style selection, the Fandom CLI transport rules, known-good import samples, and the external-batch-task policy. Tools outside this registry (browser translation, generic web translation APIs, ad hoc style strings, guessed import schemas) are what past runs got burned by — the gates now check against the registry.

This phase begins world understanding, not production. The builder should collect enough source evidence to understand what kind of world this is before deciding what the delivery should contain.

Default execution profile: local orchestrator. Cohub-closed-loop is a deliberate experiment branch, not the default production path.

Run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-source-map \
  --run-dir deliverables/<world-slug>
```

Stage gate: scope boundary, source surfaces and initial diagnosis assumptions are recorded. The run should not proceed if canon scope or source surfaces are vague.

## Phase 0.5

Define the final delivery contract before deriving the production plan.

The contract should name the target world, expected world ID and bound space ID once created, checkpoint requirement, required reports, screenshots, key asset folders, coverage evidence, board evidence, style evidence and final acceptance package.

This phase outputs a delivery contract, a stage-gate acceptance plan and an execution plan.

Default execution profile: local orchestrator plus proactive delegation planning. If a clean-context subagent can make the run faster or improve quality, use it instead of keeping the whole world serial.

Run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-delivery-contract \
  --run-dir deliverables/<world-slug>

python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-execution-plan \
  --run-dir deliverables/<world-slug>
```

Stage gate: the delivery contract lists the final handoff artifacts, the verification expected for each stage, and an execution plan names where subagents should be used for speed or quality. The run should not proceed if complete cannot be inspected from the final package or if delegation stays undefined.

The execution plan is checked against the hub's `delegation_map.json`. Every slice marked `default: delegate` there must either be adopted in the plan or explicitly justified as serial under Serial Exceptions. Editing `delegation_map.json` changes what every future run must plan for — that file, not chat memory, is where delegation lessons accumulate.

The coverage report must also declare `numericTargets` (at least `tier1Characters`, ideally `totalAtoms` and `keyCharacterAssets`). These are written by the planning subagent and then frozen by `lock-targets` at the source-inventory gate (see Phase 1). Later gates measure the live world against the locked numbers, and the `target_lock` gate blocks any attempt to edit them down mid-run, so a soft contract can no longer hide a thin delivery and the main builder cannot quietly shrink the goal.

## Phase 1

Create a source inventory from Fandom or the chosen source set.

Discover categories first through Fandom CLI and the richest available local wiki source. Build candidate lists for characters, locations, organizations, objects, systems, events, secrets and perspectives. Deduplicate them. Classify them into Tier 1, Tier 2 and Tier 3. Record exclusions and deferrals explicitly.

Default execution profile: local orchestrator plus delegated source discovery or verification workers when they can safely split the category tree, evidence recovery or audit work. Cohub-closed-loop is allowed only when the run explicitly intends to test or use that branch.

Do not trust top-level Fandom category counts as coverage truth. Large IPs often hide the real character pool inside many subcategories. The builder must inspect the category tree and close the ledger at the candidate level.

This phase outputs a coverage inventory, not atoms yet.

Before style selection can begin, the run must also produce a Fandom-grounded reference pack at `references/fandom_reference_pack.json`. This pack is not for visible card display. It is the early visual-truth set used to keep style choice and later asset generation anchored to real canon subjects rather than memory.

The reference pack must include at least three distinct subjects, at least one character and at least one non-character subject, at least three reference images in total, and an explicit `styleSelectionSet` naming the subjects that the style phase must look at. For locked `full_world` runs with `tier1Characters` of 20 or more, the floor scales up (roughly tier1/3 subjects and tier1/2 images, capped at 12/20) — judging a 30-character world's style from 5 subjects is exactly how the Cyberpunk 2077 run picked the wrong art direction.

Run the gate here, not after style work:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-source-inventory \
  --run-dir deliverables/<world-slug>

python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-fandom-reference-pack \
  --run-dir deliverables/<world-slug>
```

Before `source_inventory` can PASS, the delivery targets must also be locked. The planning subagent (not the main builder) writes `numericTargets` into the coverage report, and then the targets are frozen with:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py lock-targets \
  --run-dir deliverables/<world-slug> \
  --delivery-scale full_world \
  --observed-characters <count actually seen on the source surface>
```

The lock is stored outside the run dir in the workflow hub's `target_locks/`, fingerprinted, read-only, and git-committed. From this point every stage PASS re-checks that the coverage report still equals the lock exactly. Editing targets down mid-run — what the 2026-07-03 Frieren run did to make a 5-atom delivery measure as complete — now fails the `target_lock` gate at every subsequent stage.

Rules the lock enforces:

- `full_world` runs must set `tier1Characters` to at least max(12, 15% of observed character pages). A big IP cannot be locked with a token target.
- `keyCharacterAssets` must be at least `tier1Characters`: every tier-1 character needs an archived asset. A lower asset target requires `--waive-asset-coverage`, and the waiver is recorded in the lock, so a cast of card-only characters can no longer hide between two individually-green numbers.
- `full_world` locks require raw source outputs in `coverage/observed_surface_evidence/` — the observed character surface must be verifiable from files, not self-reported.
- `core_sample` scale requires `--approved-by user`. An agent may not unilaterally decide a run is a reduced sample; that decision belongs to the user.
- `relock-targets` only accepts equal-or-higher numbers. The ratchet turns one way. A `full_world` run can never be relocked as `core_sample`.
- If mid-run reality genuinely breaks the target (source collapsed, product limits), the run records FAIL or PARTIAL with the gap documented — it does not quietly move the goalposts.

Stage gate: candidate ledger exists, each discovered candidate has a status or planned status, Tier 1 and Tier 2 targets are measurable, category-tree discovery is evidenced, and the Fandom reference pack passes. No style work should be marked `PASS` before this gate passes.

## Phase 1.5

Diagnose the world by dimensions before writing atoms.

Use the source inventory, Fandom structure, official material and local wiki evidence to decide the world's primary family, secondary family or lens, narrative pressure, entry point, asset center of gravity, relationship structure, scale, time structure, visual recognition mechanism, prose distance and board reading mode.

This diagnosis must change the build. It should affect coverage priorities, card-writing emphasis, style-space selection and the board's first reading path.

Do not treat genre words as diagnosis. A world with spaceships is not automatically science fiction-first. A world with armies is not automatically military-first. A dark-looking world is not automatically gothic.

This phase outputs a short world diagnosis that explains why this world should not be built like a generic IP board.

Default execution profile: local orchestrator plus delegated drafting or verifier workers when diagnosis quality benefits from a clean-context read.

Run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-world-diagnosis \
  --run-dir deliverables/<world-slug>
```

Stage gate: diagnosis changes at least coverage priority, card-writing emphasis, style evaluation and board reading mode.

## Phase 1.75

Present the IP proposal and stop for human review.

This is the phase-one exit door, and it is human-shaped. The research and drafting belong in the dedicated proposal space (`IP World Proposal`, see `capabilities.json` proposalSpace) with the domain KB (KB1/KB2) as method source; the finished proposal lands back in the run directory. Using the research from Phases 0-1.5, write `ip_proposal.md` (shape and guidance in `ip_proposal_template.md`) covering: why this IP and what its fandom cares about; the proposed main cast with counts against the observed surface; cross-source-verified reference images for protagonists and key locations; the fan red lines that must not be gotten wrong; a delight plan that proves we know the IP; and 3-5 style candidates from the library, each with its exemplar image (style space `style_index/thumbs/<ID>.png`), an IP-grounded reason, and a risk.

Present it to the user and wait. Record the user's actual decisions in `checks/ip_proposal_approval.json`. The `ip_proposal` gate (enforced from `world_diagnosis` onward) fails without an approved, un-tampered proposal — and every execution stage inherits it, so there is no path into import, generation or board work around the user.

Run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-ip-proposal \
  --run-dir deliverables/<world-slug>
```

Stage gate: proposal exists with all six sections at real substance, references show cross-source verification, style candidates carry exemplar images, and the user's approval (with their decisions) is recorded and postdates the final proposal text.

## Phase 2

Choose one world-level visual style.

The style must be good enough to carry character portraits, environment scenes, objects, event scenes and KV inside one modern visual language. Do not pick a style separately per object type.

Default execution profile: the dedicated style-selection space (`IP World Style Selection`, see `capabilities.json` styleSelectionSpace) runs the audition against the run's reference pack. It reads the colleague-maintained Studio_ArtStyle library (`capabilities.json` styleSpace) upstream, strictly read-only — reference by id, never copy or modify.

This phase outputs a style decision with rationale and negative constraints.

The run should store the decision in `style_decision.json`. The selected style must come from `style_space` or `approved_style_library`. Freehand ad hoc style strings do not pass this gate.

Style selection must consume the earlier Fandom reference pack. If the run cannot show which Fandom-grounded subjects were used to judge character identity, location language and world-range fit, the style gate fails.

For `full_world` runs the style decision is not the agent's to finalize. Style is an aesthetic judgment: gates can verify that a decision has evidence and rationale, but not that the rationale is right — the Cyberpunk 2077 run passed every check while arguing itself out of the library's own Cyberpunk style into a generic hero-splash look. The builder must present the compared candidates and its recommendation to the user, wait for confirmation, and record it in `style_decision.json` as `userApproval` with `approvedBy: "user"`, an ISO `approvedAt` timestamp, and the `candidatesPresented` list (at least two — a single-option confirmation is not a choice). The gate fails without it.

Run the gate before any atom packaging, cover generation or KV work:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-style-decision \
  --run-dir deliverables/<world-slug>
```

Stage gate: selected style is tied to a real style-space candidate or approved style-library source, the decision records explicit selection rationale and evidence, and it can cover characters, places, objects, events and KV without splitting the world into unrelated looks. No later stage should be marked `PASS` before this gate passes.

## Phase 3

Transform source material into creator-facing atom content.

Write natural English cards in a restrained franchise-bible tone. Preserve one-liners when they are strong. Remove prompt-like scaffolding from visible content. Keep provenance in hidden or sidecar metadata. Use source-grounded details such as creed, principle, fear, habit, contradiction, relational tension or signature expression when they help a character feel alive without turning the card into fanfiction.

Do not treat browser translation or generic web translation as an acceptable production step. The default is to author final visible copy in English directly. If any visible source text must be translated or polished, route it through the Cohub English space named in `capabilities.json` and leave the cache file (`import/cohub_translation_cache.json`) in the run dir as evidence. This is now a hard gate, not prose: `check-english-provenance` scans every visible field in the import package and live manifest and fails on any CJK text, and it fails if a recorded translation pass used a space other than the registry one.

Treat the schema as guide rails rather than a rigid stencil. The agent should answer the core questions for each atom type, but it may vary emphasis, sequencing and sentence shape to fit the IP, the entity and the actual source depth.

Default execution profile: local orchestrator for synthesis plus delegated narrow workers whenever they improve speed or quality. Character-card batches belong in the character-craft space (`capabilities.json` characterCraftSpace — six-section dossiers, trait dimensionalization via its bundled character-traits skill, shared-exemplar batch discipline); location cards and spatial anchoring belong in the geography space (`capabilities.json` worldGeographySpace). Both write their outputs back into the run directory.

This phase outputs a structured import JSON that is fit for `narrating import`, not a raw metadata wrapper.

Before `atom_package` can pass, run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-character-cards \
  --run-dir deliverables/<world-slug> \
  --source import
```

The character-card gate fails when visible character cards stay description-only, miss identity, personality, experience, relationships, abilities or limitations, or leak internal-only visible keys such as `story_use`, `generation_prompt` or `reference_images`.

Beyond character cards, the visible-leaks gate scans every atom type, world-level fields (description, prologue, core conflict, visual style, seed prompt) and works — on both the import package and the live manifest. It fails on internal fields, pipeline tags leaking onto visible cards (`tier1`/`tier2`/`tier3`), internal style-library codes in visible copy (`PT-01`-style identifiers belong in `style_decision.json`, never on the product surface), and prompt-scaffold phrasing (masterpiece, best quality, 8k). System-facing vocabulary must never reach the user-facing surface.

Stage gate: representative cards are inspected for natural English, source grounding, no visible prompts, no source metadata dump, correct atom types and usable creator-facing shape, and the character-card check passes. No later stage should be marked `PASS` before this gate passes.

## Phase 4

Provision the real Studio world in `neta.art` — by default, claim one from the pre-created pool.

World creation is the only step that requires the local browser session, and it needs nothing from the run (the import package carries `worldName`/`description`, so a placeholder world takes on its real identity at import time). So worlds are batch-created ahead of time and recorded in `world_pool.json` (repo root of the workflow package) with their bound `spaceId`. Phase 4 then means: claim the oldest `available` pool entry (set `status: assigned`, `assignedRun`, `assignedAt`), instead of blocking the run on a local creation session. Pool disciplines (one world one run, placeholder hygiene, refill at ≤1 available) live in the pool file itself. Only when the pool is empty does this phase fall back to live creation.

Wait until the world has a real `world_...` ID and a bound Cohub `spaceId`. Do not continue until the world is actually provisioned.

Default execution profile: claim from `world_pool.json`; fall back to local orchestrator with shared Chrome owner session when the pool is empty.

The hard rule is not that everything must happen in one machine context. The hard rule is that a provisional `worldId` is not enough. The stage passes only when the execution path actually produces the real bound `spaceId`.

This phase outputs the real identifiers for the run.

Run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-bootstrap-ids \
  --run-dir deliverables/<world-slug>
```

Stage gate: real `world_...` ID and bound `spaceId` are recorded in the run report and delivery contract.

Before moving on, record them into the local control script state so the handoff package does not depend on chat memory:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py set-ids \
  --run-dir deliverables/<world-slug> \
  --world-id <worldId> \
  --space-id <spaceId> \
  --studio-url https://neta.art/world/<worldId>/studio \
  --cohub-url https://cohub.run/spaces/<spaceId>
```

## Phase 5

Upload the import package into the bound Cohub space and run the import.

Default execution profile: bound Studio space.

Never run the full import on a guessed schema. First consult the known-good samples listed in `capabilities.json`, then run a small dry-run (five to ten atoms) and record the result in `checks/import_smoke.json` with `sampleSize`, `atomsAdded`, `samplePath` and `importedAt`. The smoke gate fails unless `atomsAdded > 0`, which is exactly the silent failure (`atomsAdded: 0`) that cost the 2026-07-03 run half an hour.

After the full import, inspect the live manifest, atom counts and initial board state. If the import shape is wrong here, fix it before proceeding into expensive cover and work generation.

Run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-import-smoke \
  --run-dir deliverables/<world-slug>

python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-import-state \
  --run-dir deliverables/<world-slug>
```

Stage gate: live manifest reads back, atom counts match the intended import within documented constraints, schema is clean, and no lock or temp residue blocks later steps.

After live import, rerun the character-card gate against the live manifest before `bound_space_import` can pass:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-character-cards \
  --run-dir deliverables/<world-slug> \
  --source live
```

This second pass exists to catch visible-content regressions such as emptied character bodies or internal fields leaking onto the card after import mapping.

## Phase 6

Generate or repair covers until all expected covers are ready.

Default execution profile: bound Studio space, with local review for quality acceptance when needed.

Use source references for identity fidelity. Use the world-level style for art direction. Do not accept actor-like faces, raw film still imitation, reference board leakage, white card borders or cross-style contamination.

If provider failures block progress, repair the failed set instead of pretending partial success is acceptable.

External generation batches follow the external-task policy in `capabilities.json`: per-item timeout with skip-and-record, background polling instead of foreground waiting, and a repair list that must be closed or documented before the gate.

Aesthetic consistency cannot be judged by a local script, so it is locked with a sign-off artifact instead: a clean-context verifier reviews the final assets against `style_decision.json` and writes `checks/style_audit.json` with `verdict`, `executor`, `assetsReviewed`, `styleDecisionRef`, `auditedAt`, a substantive `summary` (at least 80 characters of actual findings) and a `verifierSessionId` naming the subagent session that did the work. The gate fails if the verdict is not PASS, if `auditedAt` predates the newest asset change, if the summary is empty or token, or if the session is untraceable — an audit that leaves no findings and no fingerprint is indistinguishable from no audit. The same substance rules apply to `checks/final_acceptance_audit.json`.

Run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-cover-assets \
  --run-dir deliverables/<world-slug>

python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-style-audit \
  --run-dir deliverables/<world-slug>
```

Stage gate: expected covers and key assets are ready, archived in the handoff folder, and visually consistent with the selected style.

## Phase 7

Create at least one meaningful work or media artifact and ensure it is connected to the world.

Default execution profile: bound Studio space.

The work is part of proving the world is not just stored content but a generative creation surface.

Run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-work-media \
  --run-dir deliverables/<world-slug>
```

Stage gate: at least one meaningful work or media artifact exists in product state, is linked to the world, and is referenced from the final report.

## Phase 8

Lay out or repair the Studio board so the world reads clearly.

Default execution profile: bound Studio space, with local screenshot review or browser-backed verification. The zoning plan itself comes from the geography space (`capabilities.json` worldGeographySpace), which writes `manifests/board_zoning_proposal.md` into the run dir — zones should mirror canonical geography and the fandom's reading path, not just card types.

The board should have a visible world title and prologue plus distinct zones for character, location, organization or lore, and event material. The work cards should also be placed deliberately rather than left floating.

The current default is a layered hybrid board rather than a flat wall of cards:

- a top hook with world promise and hero visual
- a core zone for major characters
- a major-location and power-structure zone
- a conflict and historical-motion zone
- a late grouped-coverage zone for honest long-tail handling

Run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-board-layout \
  --run-dir deliverables/<world-slug>
```

Stage gate: placements read back, zones match the diagnosis and delivery contract, the board is not an unreadable pile, and the final board screenshot is archived.

## Phase 9

Run acceptance.

Default execution profile: split. Live state checks may happen in the bound space, while owner-facing Studio checks and final artifact review may happen from the local orchestrator or a clean-context verifier. Audits (style, factuality, final acceptance) belong in the dedicated acceptance space (`IP World Acceptance`, see `capabilities.json` acceptanceSpace): builder and verifier in separate spaces makes clean-context adversarial review structural rather than disciplinary, and the audit files' `verifierSessionId` should come from that space's sessions.

Check chain health, coverage gate, content quality, visible-card cleanliness, visual consistency, ready covers, ready media, board placements, public URLs, artifact archive completeness and lock cleanliness.

When the state passes, write a report and create a checkpoint.

Before final acceptance, a clean-context verifier must also fact-check the delivery: sample at least max(8, 5% of live atoms) covering characters and non-character types, verify each card's load-bearing claims against the Fandom source, and write `checks/factuality_audit.json` (verdict, executor, verifierSessionId, auditedAt, per-sample findings of ACCURATE / MINOR_DEVIATION / INACCURATE, and a substantive summary). Any INACCURATE finding fails the gate until fixed and re-audited. Structure gates cannot catch a card that puts a character in the wrong clan; this one exists to.

Final acceptance is not self-approved. Before `final_acceptance` can PASS, a clean-context verifier — not the main builder — must write `checks/final_acceptance_audit.json` with a PASS verdict, the list of artifacts it actually checked, and a timestamp later than the newest delivery artifact. This mirrors the style-audit mechanism and closes the hole where the 2026-07-03 Frieren run marked final acceptance PASS one second after board layout with no independent review.

Stage gate: final report includes world ID, space ID, checkpoint ID, Studio URL, Cohub URL, coverage report, diagnosis, style decision, manifest snapshot, board screenshot, cover screenshot, key asset folders, media links, stage-gate log, known limitations and deferred candidates; and a clean-context `final_acceptance_audit.json` signs off the delivery.

The local control script should be used throughout the run to keep stage verdicts and handoff completeness honest:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py stage \
  --run-dir deliverables/<world-slug> \
  --stage final_acceptance \
  --verdict PASS \
  --evidence final_report.md screenshots/board/board-final.png screenshots/cover/world-cover.png

python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py verify-handoff \
  --run-dir deliverables/<world-slug> \
  --require-checkpoint
```

## Phase 10

If the world is intended as a reusable standard, fold the run back into this workflow hub.

Default execution profile: workflow hub.

Add what was learned, what changed in the process, what broke, and what should become the new default.

If this run produced a new failure mode — or a new gate — add its story to `PHILOSOPHY.md` in one or two sentences: what happened, and what the gate now protects. The philosophy file is the accumulated memory of what "good" costs; a gate without its story degrades into a rule agents route around.
