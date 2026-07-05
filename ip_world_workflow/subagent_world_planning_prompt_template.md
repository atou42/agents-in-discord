# Subagent Planning Prompt Template

Use this prompt when the main agent wants one clean-context subagent to create the whole planning package for a fresh IP world run.

This is the current recommended one-shot pattern because it produced passing runs on 2026-07-03.

Replace the placeholders before use.

```text
You are creating one planning-only package for a Neta Studio World run.

Why this matters: a Neta Studio World is a browsable IP sample room on neta.art. Its reader is a creator who knows this IP and wants to make things with it — browse the cast, generate images in the world's style, remix its elements. Your planning package sets the delivery bar for the whole run: the coverage you scope and the numeric targets you write become a frozen contract that later stages are measured against and that nobody may quietly lower. Plan the world the source material deserves, not the world that is convenient to build. When the source shows a large cast, the plan must say so. The test for every choice: would a creator who knows this IP feel understood, or feel fobbed off? Your research should surface what the fandom actually cares about — the characters fans love beyond their screen time, the design details that define identity, the facts that must not be wrong — because after planning, the builder must present an IP proposal to the user for approval before any execution begins, and your planning package is its foundation.

Run dir:
<RUN_DIR>

Only edit these files:
- source_map.md
- delivery_contract.md
- execution_plan.md
- world_diagnosis.md
- coverage/source_inventory.json
- coverage/coverage_report.json
- final_report.md
- stage_gate_log.json
- run_manifest.json

Do not create a Studio world. Do not generate images. Do not import atoms. Do not edit anything outside the run dir.

Use apply_patch for file edits.

Run only these source commands:
- fandom category <WIKI_SLUG> Characters
- fandom category <WIKI_SLUG> Locations
<EXTRA_SOURCE_COMMANDS>

The two category commands are fixed. Replace <EXTRA_SOURCE_COMMANDS> with two to four `fandom search <WIKI_SLUG> "<term>"` lines whose terms come from the run's source_map.md (Phase 0 output). Do not reuse another IP's search terms.

Use best-effort grounded planning from those outputs. If one command is noisy, still continue.

Canon boundary to use:
<CANON_BOUNDARY_DEFAULT>

Write concise natural English. No placeholders.

Overwrite source_map.md with this shape:
# <WORLD_NAME> Source Map

## Source Surfaces
[one short paragraph naming the wiki, the category surfaces you actually queried, and any local source]

## Canon Boundary
[one short paragraph restating the canon boundary in concrete terms]

## Initial Diagnosis Assumptions
[one short paragraph recording what kind of world this appears to be before deep diagnosis]

Overwrite delivery_contract.md with this shape:
# <WORLD_NAME> Delivery Contract

## Scope Boundary
[one short paragraph]

## Source Surfaces
[one short paragraph]

## Expected Coverage Shape
[one short paragraph covering characters, locations, organizations, events, systems and objects]

## Grouping Policy
[one short paragraph]

## Style-Direction Policy
[one short paragraph, words only, no fake style id]

## Final Handoff Package
[one short paragraph]

## Stage Gates For The Full Run
[one short paragraph]

Overwrite world_diagnosis.md with this shape:
# <WORLD_NAME> World Diagnosis

## Primary Family
[one short paragraph]

## Secondary Lens
[one short paragraph]

## Narrative Pressure
[one short paragraph]

## Entry Point
[one short paragraph]

## Asset Center Of Gravity
[one short paragraph]

## Relationship Structure
[one short paragraph]

## Scale And Time Structure
[one short paragraph]

## Visual Recognition Mechanism
[one short paragraph]

## Prose Distance
[one short paragraph]

## Board Reading Mode
[one short paragraph]

## Diagnosis Implications
[one short paragraph]

Overwrite execution_plan.md with this shape:
# <WORLD_NAME> Execution Plan

## Delegation Decision
[one short paragraph explaining that if subagents can improve speed or quality they should be used proactively]

## Parallelizable Slices
[one short paragraph naming the planning slices that can be delegated safely]

## Planned Workers
[one short paragraph naming worker roles and artifact ownership]

## Serial Exceptions
[one short paragraph naming only the parts that must stay serial]

## Verification Ownership
[one short paragraph naming the main builder as final acceptance owner]

Overwrite coverage/source_inventory.json with valid JSON using this exact top-level shape:
{
  "world": "<WORLD_NAME>",
  "scope": "<REQUESTED_SCOPE>",
  "sources": [
    {
      "type": "fandom",
      "wiki": "<WIKI_SLUG>",
      "notes": "..."
    }
  ],
  "commands": [
    "...",
    "...",
    "..."
  ],
  "candidateSummary": {
    "characters": {"observedSurface": "...", "planningNote": "..."},
    "locations": {"observedSurface": "...", "planningNote": "..."},
    "organizations": {"observedSurface": "...", "planningNote": "..."},
    "events": {"observedSurface": "...", "planningNote": "..."},
    "systems": {"observedSurface": "...", "planningNote": "..."},
    "objects": {"observedSurface": "...", "planningNote": "..."}
  },
  "groupingPressure": "...",
  "exclusions": [
    "production and merchandise surfaces",
    "game-only material unless later scoped in"
  ]
}

Overwrite coverage/coverage_report.json with valid JSON using this exact top-level shape:
{
  "planningVerdict": "PASS",
  "limitations": ["..."],
  "coverageShape": "...",
  "numericTargets": {
    "tier1Characters": 0,
    "totalAtoms": 0,
    "keyCharacterAssets": 0,
    "nonCharacterAtoms": 0
  },
  "nextStepRisks": ["...", "..."],
  "acceptanceReadiness": "..."
}

numericTargets values must be real positive planning numbers derived from the observed source surface, not zeros. For a full-world run, tier1Characters must be at least max(12, 15% of the character pages you actually observed). nonCharacterAtoms is the floor for locations, lore, events, factions and objects combined — set it so the world cannot degrade into a character-only wall. keyCharacterAssets must be at least tier1Characters, because every tier-1 character needs an archived asset; only drop below with an explicit waiver. These numbers become the frozen delivery bar for the whole run: after planning they are locked outside the run directory and every later stage is measured against them, so set them from evidence, not optimism, and know that nobody can quietly lower them later. Save the raw fandom command outputs you used to size the character surface into coverage/observed_surface_evidence/ — the full_world lock now requires them.

Visible copy rules for everything you write: no pipeline vocabulary on visible tags (tier1/tier2/tier3 are internal), no internal style or library codes (PT-01, SP-03 style identifiers stay in style_decision.json, never in visible fields), no prompt-scaffold phrasing (masterpiece, best quality, 8k) in any description. The visible-leaks gate scans every atom type, world-level fields and works.

Overwrite final_report.md with this shape:
# <WORLD_NAME> Planning Report

Planning verdict: PASS

## Canon Boundary
[short paragraph]

## Source Surfaces Used
[short paragraph]

## Main Planning Risks
[short paragraph]

## Next Executor Step
[short paragraph]

Update run_manifest.json so world.canonBoundary, world.primaryFamily, and world.secondaryLens are non-empty strings.

Update stage_gate_log.json so these stages are PASS with evidence paths:
- world_understanding
- delivery_contract
- source_inventory
- world_diagnosis
Leave all later stages PENDING.

After writing everything, run:
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/verify_planning_package.py --run-dir <RUN_DIR>

If verifier fails, fix your files and rerun it until it passes.

Then reply with:
- planning verdict
- whether verifier passed
```

Recommended Chainsaw Man canon default:

```text
Manga-led main canon across Part 1 and Part 2, with anime-aligned story material only where it follows the same canon line. Exclude production pages, merchandise, game-only material, episode logistics, and low-signal one-line entities unless grouped as support.
```
