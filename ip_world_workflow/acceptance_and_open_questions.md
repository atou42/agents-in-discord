# Acceptance And Open Questions

## Acceptance layers

### Chain layer

The world has a real `world_...` ID.

The world record has a real bound `spaceId`.

The bound space has the expected Neta capability available.

Import completed and the live manifest reflects the intended atoms.

Cover files are fully ready and have usable URLs.

At least one meaningful work or media artifact is live in the world.

Studio placements read back successfully.

The space is clean of lock residue and temp-file junk.

Each stage has a recorded stage-gate verdict.

The final checkpoint ID exists and is recorded in the final report.

The execution profile used for each stage matches the stage's auth and tooling needs.

### Content layer

Coverage inventory exists and is tied to the final import.

World diagnosis exists and is tied to the final build.

The diagnosis changes coverage priority, card emphasis, style selection and board layout.

Tier 1 is independently covered.

The meaningful bulk of Tier 2 is independently covered.

Every discovered candidate has an explicit status.

No major known entity is stranded outside imported, grouped, merged, deferred or excluded status.

Visible cards read like world material in natural English.

Visible cards are free of source dumps, prompt scaffolds and reference-image lists.

The world density is appropriate for the source IP rather than a toy-count import.

The final delivery contract exists and the final report proves that the run delivered what was promised.

### Visual layer

One selected world style is applied across the whole world.

Character, location, object and event assets still look like they belong to one product family.

Key visual quality is high enough to feel premium and world-defining.

Board presentation is legible and not crowded into overlapping piles.

Final board screenshot is archived in a known location.

World cover or key visual screenshot is archived in a known location.

Key character assets are archived in a known location.

Key location assets are archived when location visuals are part of the promised delivery.

### Handoff layer

The final handoff includes the world ID.

The final handoff includes the bound Cohub space ID.

The final handoff includes the final checkpoint ID.

The final handoff includes Studio and Cohub links.

The final handoff links to coverage evidence, world diagnosis, style decision, manifest snapshot, board placement snapshot, board screenshot, cover screenshot, key assets, generated work or media and known limitations.

The handoff can be inspected without reading the chat transcript.

## Open questions still not fully settled

### Platform caps

The observed independent character cap around fifty needs a stable product decision.

The workflow already handles it honestly with group atoms and accounting, but the platform limit itself is still a constraint rather than a solved design.

### Canonical live schema

Different runs have exposed slightly different live atom-type sets.

The workflow needs one canonical mapping table for what types are allowed in the final live world and how adjacent semantic types should collapse into that set.

### Board spacing and overflow

The board hierarchy is now mostly settled, but it still needs exact spacing targets, viewport assumptions and overflow rules tied to real large boards.

The current external-design read suggests a layered board with a strong top hook, explicit section hierarchy, large-zone navigation and a late grouped-coverage band. The remaining work is to turn that into exact placement rules.

### Automation boundary

The workflow now has a clearer default split.

The local control script should always own run-folder setup, stage logging, ID recording and handoff completeness checks.

Source discovery, coverage inventory, world bootstrap and final artifact collection should also default to the local control plane.

Manual or agent judgment is still required for world diagnosis, style choice, card writing, board reading quality and KV taste judgment.

The bigger execution split is no longer open. The Chainsaw Man run settled that world provisioning and source discovery belong to the local orchestrator profile when the workflow-hub sandbox lacks owner auth or hits source blocking.

### Adversarial verifier protocol

The workflow now uses clean-context adversarial verification as the operating stance for staged acceptance.

The verifier should work from the delivery contract and try to break the promised artifacts. It should not merely analyze the builder's explanation or summarize whether the delivery looks reasonable.

The remaining open product question is how formal this verifier handoff should become: a fixed prompt template, a required report schema, or a small validation CLI that prepares artifact paths and acceptance criteria for the verifier.

### Cross-genre metadata voice

The metadata schema is directionally settled, but it still needs cross-genre proof that restrained franchise-bible prose can stay distinct across fantasy, sci-fi and modern or gothic worlds without turning into one reusable house voice.

### Card-body exact field pressure

Character and location cards now have strong directional schemas, but a few choices still deserve pressure-testing in real runs, especially how much living-detail material should surface by default and how much remains optional.

### Variant system versus rigid templates

The workflow direction is now to prefer guided variation over hard template locking.

The first version of the dimension system is now defined in `world_diagnosis_dimensions.md`. The remaining design task is to test whether these dimensions are enough across several large IPs and whether any dimension creates vague or overlapping decisions in real runs.
