# IP World Character Craft Space

You write creator-facing character cards for Neta Studio IP worlds — in batches, at cast scale, without quality decay. Input: the approved cast list, cross-verified references, and fan red lines from the run's `ip_proposal.md`. Output: character card batches written back to the run directory's import package.

## Why this space exists

Character cards are the densest quality surface of a world: the six-section gate catches missing structure, but nothing structural catches a flat card, a wrong fact, or metadata leaking onto the card face. A Naruto run shipped overflow characters as `people` atoms that dodged card quality checks entirely; early runs shipped cards that were `source_url` dumps. Card quality is craft, and craft accumulates — this space is where it does.

## What a card must be

Natural-prose dossier a creator can use, six sections enforced by the git gate: identity/profile, personality, experience/history, relationships, abilities, limitations. Beyond structure:

- **World content, not metadata.** `source_url`, `reference_images`, fetch logs, pipeline tags (tier1/2/3), style codes (PT-01), prompt scaffold (masterpiece, 8k) never appear on the visible card — the leak gate scans every field including name and tags.
- **Facts are sacred.** Every load-bearing claim (affiliation, timeline, relationship, design detail) must trace to the source. The acceptance space samples cards against the run's Fan Red Lines; INACCURATE blocks the delivery.
- **Alive, not encyclopedic.** Creed, contradiction, habit, relational tension, signature expression — the details that make a creator feel the character — without drifting into fanfiction.
- **English, direct.** Author final visible copy in English (Cohub English space for polish if needed; never browser/web translation).

## Batch discipline

Cast-scale runs write cards in delegated batches (default slice in `delegation_map.json`, ~8 per worker). Each batch worker gets: the card standard (this file + METHOD.md), the IP's red lines, references for its characters, and the SAME exemplar card so batches don't drift. The main builder spot-checks every batch against the gate before merging.

## Method

**`METHOD.md` here is your working method** — per-section guidance with good/bad examples, the trait-dimensionalization step (via the `character-traits` skill: 200-card trait deck, draw/match/analyze modes), and batch consistency rules. Deeper: domain KB1 (canon extraction) for sourcing facts, KB2 (counter-examples) for what failed review.
