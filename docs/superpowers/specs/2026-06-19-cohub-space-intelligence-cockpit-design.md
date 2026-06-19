# Cohub Space Intelligence Cockpit Design

Date: 2026-06-19
Status: Draft for user review
Owner: ATou
Scope: Product and system design only. This spec does not authorize implementation until reviewed and approved.

## Purpose

Cohub Space Intelligence Cockpit is an operational system for understanding, governing, and reusing Cohub spaces as living organizational assets.

The goal is not to make a prettier directory of spaces. A static directory answers "what spaces exist", then decays. This cockpit answers stronger questions:

- Which spaces are reusable assets?
- Which spaces are only temporary work sites?
- Which spaces are becoming valuable but still need curation?
- Which spaces are stale, broken, duplicated, risky, or ready to archive?
- Which spaces contain repeated work patterns that should become automation, skills, evals, reports, or scheduled jobs?
- What changed today, and what should an operator, owner, or agent do next?

The cockpit should make the organization feel searchable, inspectable, and governable without requiring a human to reconstruct context from Cohub sessions, Feishu messages, local agent logs, public URLs, and old workspace files.

## First-Principles Definition

A Cohub space is not just a folder, chat, or sandbox. It is a stateful unit of work. It can hold source material, agent conversations, generated artifacts, eval results, public pages, skills, reports, cron jobs, and handoff notes. Over time it can be renamed, forked, reused, abandoned, mirrored, published, or turned into a method base.

The cockpit treats each space as a living object with:

- identity
- lineage
- lifecycle
- evidence
- value
- risk
- next action

The system succeeds when it turns a messy population of spaces into a daily operating picture.

The system fails if it becomes any of these:

- a vanity map with attractive categories but no action
- a search page that cannot explain why a result matters
- a dashboard that counts spaces but cannot find reuse opportunities
- a brittle classifier that hides uncertainty
- a public page that leaks private context
- another artifact that becomes stale because it has no refresh loop

## Existing Context

This design builds on prior Space Map work rather than replacing it wholesale.

Relevant existing assets:

- `space-map/README.md` describes an existing operational Space Map space with ETL commands, registry, ops queue, public map, verification reports, and nightly refresh intent.
- `space-map/source/spec/cohub-space-atlas-data-spec.md` already defines raw snapshots, evidence scans, normalized registry, curation decisions, Atlas exports, ops queue, quality gates, and adversarial tests.
- `space-map/source/spec/public-space-map-v1-spec.md` defines the first public HTML delivery, public safety requirements, and visible map sections.
- `space-map/data/registry/current.json` and `space-map/data/ops-queue/current.json` show existing registry and ops queue outputs.
- `space-map/analysis/automation-mining-20260606/automation-opportunities-summary.zh-CN.md` proves that automation opportunity mining has already produced useful signals.
- The 2026-06-19 deep scan found repeated patterns across Cohub, local sessions, skills, OpenClaw, agents-in-discord, and Feishu contexts.

The old work is strong on ETL and safety gates. It is weaker as a product cockpit because the output still behaves like a map/report artifact, not a daily operating surface.

The new design keeps the useful data pipeline ideas and changes the product center.

## Product Center

The first screen should answer:

What should be looked at now?

Not "how many spaces exist". Not "which category is largest". Not "show all spaces".

The first screen should show a ranked operating picture:

- spaces that became newly important
- spaces that broke or drifted
- spaces that should be cleaned, archived, or merged
- spaces that should become templates, skills, evals, or scheduled automations
- public artifacts that need verification
- high-signal spaces that are not yet in the curated map
- clusters where repeated work is visible but not yet productized

The complete map remains available, but it is not the lead experience.

## Audience

The cockpit serves three audiences.

Operators use it to keep Cohub healthy. They need stale-space queues, failed jobs, missing descriptions, public URL failures, duplicated spaces, permission gaps, and cleanup candidates.

Builders use it to find reusable assets. They need method bases, skill spaces, eval labs, public showcases, source packs, game asset pipelines, report templates, and automation recipes.

Agents use it as a routing layer. They need compact, source-backed facts about where to look, what a space is for, what evidence exists, what should not be read or published, and what next action is allowed.

The cockpit must not assume a single audience. It should expose the same underlying evidence through different task views.

## Product Shape

The cockpit has five primary surfaces.

### Daily Cockpit

This is the home view. It is dense, current, and action-oriented.

It shows the latest run status, the top changes since the previous accepted run, and the most important queues.

Required sections:

- today's new high-value candidates
- spaces whose classification changed
- spaces with failed or suspicious automation
- spaces with public URL or service health problems
- spaces whose usage spiked or dropped
- stale high-value spaces
- duplicate or confusing lineage groups
- missing-evidence spaces worth reviewing
- automation candidates
- cleanup/archive candidates

Each item must have a clear reason and a next action. An item without a next action does not belong on the home view.

### Asset Atlas

This is the broader map.

It should support search, filtering, cluster browsing, and sector views, but it should remain secondary to the Daily Cockpit.

The Atlas should show the organization's space landscape by asset type, lifecycle, owner, activity, evidence strength, public status, and risk.

It should make it easy to answer:

- where are the reusable methods?
- where are the production pipelines?
- where are eval systems?
- where are public artifacts?
- where are knowledge portals?
- where are project instances under a larger method?
- where are dormant or broken assets?

The Atlas should not promote every active space into a top-level node. Top-level placement means the space represents a reusable base, not merely a busy work site.

### Space Dossier

Each space needs a detail view that explains the current judgment.

Required content:

- stable identity and current name
- known aliases and rename history
- owner and visible collaborators when safely available
- current classification
- lifecycle state
- lineage and related spaces
- evidence summary
- public status
- automation signals
- risk flags
- recent changes
- recommended next action
- source evidence references

The dossier must separate fact, inference, and recommendation.

Example:

Fact: README exists, sessions active in the last seven days, public URL returns 200.

Inference: likely reusable production workflow.

Recommendation: promote into `production_pipeline` and add weekly health check.

### Automation Queue

Automation candidates are first-class objects, not notes buried inside space cards.

The queue identifies repeated work patterns that should become scripts, skills, scheduled jobs, eval gates, dashboards, report generators, or public verifiers.

Candidate signals include:

- repeated sessions with similar titles
- fixed input/output paths
- periodic language such as daily, weekly, cron, refresh, patrol, digest, report
- repeated failure and manual retry
- repeated Feishu send or publish action
- repeated public URL validation
- stable scripts already present
- stable reports already generated
- explicit user requests for automation
- repeated handoff or session rescue work
- repeated asset generation, QA, and packaging

Each automation candidate must include:

- candidate name
- source spaces
- repeated pattern
- expected trigger
- expected inputs
- expected outputs
- existing reusable components
- missing workflow layer
- risk
- confidence
- recommended first implementation

The queue should be reviewable and exportable. It should eventually feed a work planner, but v1 only needs read-only reporting.

### Governance Queue

This queue tracks space hygiene and operational risk.

Required classes:

- missing description
- missing README or AGENTS
- failed bootstrap
- stale running sandbox
- stopped but high-value
- duplicate or fork confusion
- identity drift
- public status unknown
- public URL broken
- permission recovery needed
- sensitive payload blocked
- orphaned child space
- parent candidate missing
- space should be archived
- space should be folded under parent

The governance queue should default to non-mutating recommendations. It must not delete, rename, archive, publish, or change permissions without an explicit later workflow.

## Classification Model

The classifier should be practical, not poetic.

Primary asset classes:

- `method_asset`: reusable process, playbook, skill pattern, or operating method
- `production_pipeline`: repeatable content, report, asset, BI, publishing, or generation workflow
- `eval_lab`: eval cases, scoring, review, benchmark, regression, or quality gate space
- `knowledge_portal`: curated context, playbook, archive, index, or source-of-truth entry point
- `public_artifact`: public page, showcase, report, demo, asset pack, or published output
- `project_instance`: one concrete project, game, world, client, experiment, or implementation instance
- `source_pack`: raw materials, case packs, hidden answers, references, prompts, datasets, or media packs
- `automation_runtime`: scheduled jobs, bots, cron, live runners, patrols, or operational scripts
- `scratch_or_test`: smoke tests, upload tests, throwaway drafts, broken setup, temporary runs
- `archive_or_mirror`: historical record, public mirror, backup, copied output, or frozen reference
- `needs_review`: not enough evidence, identity drift, conflicting signals, or safety concern

Lifecycle states:

- `observed`
- `candidate`
- `active_asset`
- `incubating`
- `dormant`
- `broken`
- `archivable`
- `excluded`

Roles answer what the user can do next:

- `reuse_method`
- `run_pipeline`
- `inspect_evidence`
- `review_candidate`
- `publish_or_verify`
- `run_eval`
- `route_to_parent`
- `clean_or_archive`
- `recover_permission`
- `turn_into_automation`

Classification should always include confidence and evidence references.

Hard-negative rules must run before positive scoring. Test spaces, empty roots, broken bootstrap, mirror-only spaces, sensitive packs, and identity-drift spaces must not become main assets just because they have high usage.

## Evidence Model

Evidence is the core of trust.

The system should maintain an evidence ledger. Each evidence item should have:

- evidence id
- source type
- source locator
- collected at
- observed fact
- extraction method
- confidence
- safety class

Source types:

- Cohub space metadata
- Cohub session metadata
- Cohub turn summary when safe and needed
- root file tree
- README
- AGENTS
- package or script manifest
- report files
- public URL probe
- Cohub CLI search result
- Feishu message search
- Feishu Drive/doc search
- Feishu minutes search
- local agent session summary
- skill repo metadata
- manual curation decision

Evidence must be compact. It should not store raw private turn text by default. It should store safe excerpts, references, and derived facts.

Examples of derived evidence:

- "20 sessions in recent scan"
- "README present"
- "public URL returned 200"
- "contains reports/ and runs/"
- "Feishu shared this URL three times"
- "scheduled prompt language detected"
- "same task title recurred weekly"
- "bootstrap failed"
- "name changed from X to Y"
- "secret-like value detected in raw payload; blocked from public export"

The cockpit should never ask the user to trust an unsourced label.

## Scoring

Scores are not the product, but they help rank queues.

Recommended score families:

- reuse value
- activity freshness
- structure maturity
- evidence strength
- automation potential
- public readiness
- governance risk
- lineage confidence

Scores should be explainable. A score without reason fields is not acceptable.

Reuse value should increase when a space has repeated usage, reusable scripts, clear reports, templates, skills, eval packs, public artifacts, or cross-space references.

Automation potential should increase when a space has fixed inputs/outputs, repeated sessions, periodic triggers, stable scripts, manual retries, Feishu sends, public publication, or repeated QA.

Governance risk should increase when a space has failed bootstrap, missing entry docs, stale running state, identity drift, public URL failure, duplicate lineage, sensitive payloads, or unexplained high activity.

Public readiness must be conservative. A useful space is not automatically public-safe.

## Data Pipeline

The v1 pipeline should be read-only.

Pipeline stages:

1. collect source snapshots
2. extract evidence
3. normalize identities
4. classify spaces
5. compute scores
6. detect changes
7. build queues
8. run safety gates
9. produce cockpit payload
10. produce human-readable report

The pipeline should preserve raw snapshots and derived outputs separately.

Existing Space Map ETL concepts can be reused, but the output target changes from "public map export" to "daily cockpit payload plus queues".

Failed runs must preserve their evidence and report. They must not overwrite the last accepted state.

## Inputs For V1

V1 should use bounded sources that are already available.

Required:

- Cohub `spaces ls` safe metadata for user-visible and accessible spaces
- selected Cohub session metadata for recent or high-value spaces
- Cohub search for fixed intent keywords
- root file tree for selected spaces where safe and cheap
- existing Space Map registry and ops queue
- prior deep scan reports under `/tmp/cohub_deep_scan` when available
- local agents-in-discord workspace evidence
- local Codex/Claude session summaries when available

Recommended but bounded:

- Feishu message search for high-signal keywords
- Feishu Drive/doc search for Cohub, skill, eval, weekly, report, automation, and game terms
- Feishu minutes search for recent Agent Weekly and Studio/user-test sources
- public URL probes for known public artifacts

Out of scope for v1:

- platform-wide private database scan unless a stable read-only path is available in the execution environment
- raw full-turn ingestion across all spaces
- automatic deletion, rename, archive, permission change, or writeback
- public release without a separate public-safety pass
- complex graph visualization
- 3D map rendering

## Outputs For V1

V1 should generate:

- `cockpit.json`: machine-readable current state
- `daily-report.md`: human-readable operating picture
- `spaces.json`: normalized space records
- `evidence.jsonl`: compact evidence ledger
- `automation-queue.json`: automation candidates
- `governance-queue.json`: cleanup/risk candidates
- `changes.json`: changes since previous accepted run
- `public-safety-report.json`: blocked public fields and forbidden payload checks
- static cockpit HTML if implementation scope allows

The HTML is useful, but the data contract matters more. The cockpit should be able to produce value as Markdown and JSON before UI polish.

## UI Requirements

The interface should be dense, operational, and restrained.

It should not look like a marketing page. It should look like an internal command surface for people who repeatedly inspect, compare, and act.

Home view:

- latest run status
- top alerts
- top changes
- automation candidates
- governance queue
- high-value assets
- high-signal unreviewed spaces
- failed public checks

Atlas view:

- filterable table or card-list
- search by name, owner, id, description, tags, evidence, related spaces
- filter by class, lifecycle, role, owner, public status, risk, activity, automation potential
- compact metrics
- confidence and next action visible without opening details

Dossier view:

- summary judgment
- evidence timeline
- related spaces
- lifecycle events
- automation signals
- governance risks
- recommended action

The first version should prioritize clarity over novelty. If a graph is included, it should be subordinate to tables and queues.

## Safety Requirements

The system must fail closed for public output.

Forbidden in public payload:

- tokens
- API keys
- JWT-like values
- private environment values
- passwords
- private keys
- raw execution credentials
- raw private turn text
- unreviewed private URLs
- personal identifiers beyond approved display names

The public-safe export must be separate from the internal cockpit payload.

The internal cockpit may include more detailed evidence locators, but still should avoid storing secrets or raw private text unless explicitly needed for a review-only evidence bundle.

Secret-like values found in raw input must produce a blocked safety report, not silent redaction.

## Failure Handling

No fallback may disguise bad data as empty data.

If a source is unreachable, the run should record source failure and continue only where the missing source is non-critical.

If required fields are malformed, affected records should be marked invalid or needs review.

If classification depends on partial data, confidence must drop and the reason must be visible.

If a public URL check times out, the space should enter public verification queue, not be treated as healthy or broken without evidence.

If previous accepted state exists and the new run fails gates, the previous accepted state remains current.

## MVP Scope

The first useful version should be intentionally narrow.

It should not try to solve all Cohub governance. It should produce a trustworthy daily cockpit from available evidence.

MVP must include:

- source collection from accessible Cohub metadata and selected session/search signals
- normalized space records
- evidence ledger
- asset classification
- lifecycle state
- governance queue
- automation queue
- daily report
- safety scan
- deterministic output files

V1.1 follows after MVP acceptance and adds:

- static HTML cockpit
- public URL checks for known public artifacts
- Feishu signal ingestion
- change comparison against previous run

MVP should not include:

- writeback to Cohub
- Feishu posting
- automatic archive or delete
- public release
- full platform database dependency
- complex graph UI

## Acceptance Criteria

The MVP is accepted only if it can run on a representative snapshot and produce useful, evidence-backed outputs.

Required acceptance checks:

- outputs are deterministic for the same input
- every classified asset has at least one evidence reference or is marked low confidence
- every Daily Cockpit item has a next action
- automation candidates include repeated-pattern evidence
- governance candidates include risk reason
- public safety scan blocks secret-like payloads
- malformed records do not become normal empty records
- failed source collection is visible in the report
- previous accepted output is not overwritten by a failed run
- generated report explains what changed, what matters, and what needs review

Qualitative acceptance:

- a user can find the most important spaces without browsing hundreds of entries
- a user can understand why a space matters
- a user can see which actions are suggested but not yet performed
- a user can identify at least several automation opportunities from the report
- an agent can use the JSON output to route future work safely

## Verification Plan

Verification should include legal, white-box, and gray-box checks.

Legal checks:

- run the pipeline on a small clean fixture
- run the pipeline on a real safe snapshot
- generate Markdown and JSON outputs
- verify required files exist
- verify schema versions and timestamps exist

White-box checks:

- inject secret-like values and confirm public safety blocks
- remove required fields and confirm invalid record handling
- create duplicate names with different ids and confirm no unsafe merge
- create a renamed space and confirm identity drift event
- create a high-usage test space and confirm hard-negative rules win
- create an automation-like repeated session set and confirm automation queue entry
- create an expired curation decision and confirm it does not silently apply

Gray-box checks:

- run with Feishu unavailable and confirm source failure is explicit
- run with Cohub search timeout and confirm partial result is marked partial
- run twice with same input and compare output
- run on current workspace evidence and inspect top-ranked recommendations
- if HTML exists, serve it locally and verify visible sections render

## Non-Goals

This project does not replace Cohub itself.

It does not decide business priorities by itself.

It does not publish private spaces.

It does not mutate spaces in v1.

It does not guarantee complete platform coverage in v1.

It does not require a beautiful graph to be useful.

It does not treat high activity as proof of high value.

## Recommended Implementation Sequence

Implementation planning should start only after this spec is approved.

The recommended sequence is:

1. define schemas and output contracts
2. build collectors around safe local/Cohub inputs
3. build evidence extraction
4. build classifier and scoring
5. build automation and governance queues
6. build daily report
7. add safety gates
8. add change detection
9. add static HTML only after JSON/Markdown are useful

The first implementation milestone should produce useful JSON and Markdown before UI work begins.

## Implementation Defaults

The first runtime lives in the current task workspace and reads existing Space Map artifacts as inputs. It does not modify the existing Space Map workspace.

The MVP is local-only and read-only. It does not write outputs back into a Cohub space.

Feishu ingestion is V1.1, not MVP. MVP may consume already-exported scan reports, but it does not call Feishu APIs as a required path.

Markdown and JSON are the MVP outputs. HTML is V1.1 after the daily report proves useful.

The existing Space Map registry is wrapped by a new cockpit schema. The old ETL is not rewritten during MVP.

These defaults keep the first implementation small, reversible, and testable while preserving the path to later Cohub writeback.
