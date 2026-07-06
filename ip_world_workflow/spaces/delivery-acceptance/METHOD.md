# Acceptance Method — How to Break a Delivery Honestly

Self-contained method for adversarial verification. Your posture: assume the builder cut a corner somewhere, and find it. Every audit type below exists because a real delivery went wrong in exactly that way while looking fine.

## Ground rules

1. **Hard verdicts live in git.** Run the gate script read-only (`python3 ip_world_workflow/scripts/local_world_workflow.py <check> --run-dir <run>`); never reimplement or reinterpret its output. If a gate FAIL seems wrong, report it to the user — a run agent once patched the script itself, and that is now treated as delivery fraud.
2. **Fresh state only.** Pull live manifests/placements at audit time. The snapshot-freshness gate exists because stale local snapshots let work/board checks pass against a world that had already changed.
3. **Repair and verification stay separate.** After any fix, redo the affected audit — timestamps are checked, and an audit older than the artifact it judges is void.
4. **An audit that leaves no findings and no fingerprint is indistinguishable from no audit.** Your summary must say what you actually looked at and what you found (≥80 chars of substance); `verifierSessionId` must be your real session id in this space.

## Audit 1: style_audit.json

*Why it exists: a Cyberpunk run shipped assets in a generic hero-splash style with an empty audit summary — nobody could tell whether anyone had actually looked.*

Review EVERY exported asset (`assets/key_characters`, `key_locations`, `key_visuals`, world cover) against `style_decision.json`:

- one visual system across all subject types — same rendering language, palette logic, lighting logic
- negative constraints hold: no actor-face likeness, no film-still imitation, no reference-board leakage, no white card borders, no cross-style contamination
- identity fidelity: silhouettes, costumes, signature details match the (cross-verified) references
- `assetsReviewed` must cover the full disk set — the gate diffs your list against the folder, so a partial audit fails structurally

Verdict fields: verdict / executor (clean-context) / verifierSessionId / assetsReviewed / styleDecisionRef / auditedAt (must postdate newest asset) / summary.

## Audit 2: factuality_audit.json

*Why it exists: no structural check can catch a card that puts a character in the wrong clan — confidently wrong is worse than missing.*

- Sample ≥ max(8, 5% of live atoms). Cover characters AND non-character types; bias toward tier-1 and toward atoms touching the run's Fan Red Lines (`ip_proposal.md`) — that section is your priority checklist.
- For each sampled atom, verify the load-bearing claims against the source wiki: names, affiliations, timelines, relationships, geography, design facts. Count the claims you checked.
- Record per sample: atomName / atomType / claimsChecked / sourceRef / finding ∈ {ACCURATE, MINOR_DEVIATION, INACCURATE}.
- Any INACCURATE blocks acceptance until fixed and re-audited. MINOR_DEVIATION needs a note (what deviates, why it's tolerable).

## Audit 3: final_acceptance_audit.json

*Why it exists: a run once marked final acceptance PASS one second after board layout — "final review" had literally not happened.*

Whole-delivery review, minimum probes:

- **live**: world id and bound space are real; atoms and works exist live, not just in local files
- **board**: readable at far view (zones, hierarchy, world promise visible) and close view (cards browsable); screenshot proves the CURRENT state
- **package**: a stranger can open the run folder and reconstruct what was built, at what scale, with what evidence, what was deferred — without chat history
- **numbers**: locked targets vs delivered counts; any gap must be documented as FAIL/PARTIAL in the report, never papered over
- at least one adversarial probe of your choice (e.g. pick the least-featured tier-1 character and trace them through card → asset → board)

## Verification pattern (per stage, when asked to verify mid-run)

normal-path (does the promised output exist?) → structure (right shape/IDs?) → source/state (grounded in inputs or live state?) → adversarial (one non-happy-path probe minimum).

## Feeding the counter-example library

When you find a failure mode not already in the domain KB's counter-example library (KB2, CE-XXX numbered), write it up in your session log and propose the addition: what happened, how it looked green, how it was caught. This is how acceptance experience compounds across runs — the library is the accumulated memory of what "good" costs.
