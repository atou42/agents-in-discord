# Confirmed Decisions

## World creation path

The standard chain starts in Studio, not in a plain Cohub space.

The required sequence is:

`create Studio world -> wait for bound Cohub space -> import structured world assets into the bound space -> finish covers -> create or repair works/media -> read back Studio placements -> checkpoint`

A normal Cohub space with the Neta mod attached is useful for experimentation, but it is not a substitute for a real Studio world because it does not own the Studio world record or the world-space binding.

## Delivery-led workflow policy

The workflow must start by understanding the world, then defining the final delivery, then deriving intermediate stages from that delivery.

World builders should not begin from import, generation or board placement mechanics. Those are implementation steps. The stable top-level logic is:

`understand world -> define delivery -> derive stages -> build and verify each stage -> final acceptance -> handoff`

Every stage needs an output and a verification plan before work begins.

The agent may do the work itself or delegate work to sub-agents, but delegation does not remove ownership. The main builder must review or reproduce decisive checks before accepting a stage.

If a sub-agent can make the run faster or improve quality, it should be used proactively. Whole-world serial execution is not the default when clean independent slices or clean-context verification can be delegated.

Stage completion requires recorded evidence and a PASS verdict. A stage is not complete merely because a command succeeded, a sub-agent reported success, or the result looks plausible.

The final delivery must include world ID, bound Cohub space ID, final checkpoint ID, final report, coverage evidence, world diagnosis, style decision, live manifest snapshot, board placement snapshot, final board screenshot, world cover or key visual screenshot, key character asset folder, key location asset folder when applicable, generated work or media links, and a stage-gate verification log.

The handoff artifacts should be easy to inspect without reconstructing the run from chat history.

## Execution-boundary policy

The workflow is Studio-first, but it is not sandbox-only.

The Chainsaw Man run proved that a workflow-hub Cohub space agent is not a sufficient executor for the whole chain. Some stages depend on the local owner-authenticated environment and some stages belong inside the bound Studio space after provisioning.

The confirmed split is:

- local orchestrator for Fandom CLI, local wiki recovery, style discovery when auth is required, Studio world creation and Studio provisioning
- workflow-hub space for process docs, run artifacts, supervision and history
- bound Studio space for import, manifest checks, cover generation, works, placements and board repair

Current production default is to keep the control plane local even if a Cohub-closed-loop branch is technically available. The closed-loop branch should be treated as explicit branch testing unless it has been chosen deliberately for the run.

Do not assign the full chain to a workflow-hub sandbox agent unless the run has first proven two bootstrap conditions:

- Cohub has a valid Studio session path for create and provision
- Cohub has a working source-discovery transport for Fandom or local wiki data

Without those two conditions, pretending the hub-space agent can do everything is a workflow-design error.

## Source and coverage policy

Every serious IP run must start with source discovery and coverage inventory.

The builder must discover categories from Fandom and the richest available local wiki source first, then deduplicate pages, classify them by tier, and assign every candidate one explicit status.

Fandom CLI or equivalent wiki-query tooling is not optional. It is a first-step requirement because the workflow depends on source-grounded coverage, character truth, location truth, relationship truth and story detail rather than memory or summary writing.

That early Fandom pass is not only for coverage math. It must also produce the reference pack that the style phase and later asset generation will use. If style is chosen before a Fandom-grounded reference set exists, the workflow has already drifted.

If there is a local rich wiki space, it should be treated as a co-primary research surface beside Fandom. The builder should prefer the combination of Fandom coverage discovery plus local-wiki detail recovery over either source alone.

If the workflow-hub sandbox cannot reach Fandom directly, the next preferred path is a sanctioned transport such as `r.jina.ai` over `api.php` or a configured Fandom proxy. Only if those are unavailable should the run switch source discovery to the local orchestrator profile. Do not replace the missing source path with memory or a hand-written cast list.

Allowed candidate outcomes are:

- imported as an atom
- merged into another atom
- represented by a group atom
- excluded with a reason
- deferred with a reason

Coverage cannot be claimed from a hand-written shortlist.

## Tiering policy

Tier 1 means must-have entities without which the world would be misread or feel structurally incomplete.

Tier 2 means important supporting entities that make the world browseable, generative and reusable.

Tier 3 means long-tail or lower-signal entities that may be grouped, deferred or excluded, but still must be accounted for.

The current acceptance target is:

- at least 95 percent of Tier 1
- at least 80 percent of Tier 1 plus Tier 2
- 100 percent explicit accounting for discovered candidates

For target worlds in this workflow, the operating intent is full-world coverage rather than curated-core coverage. Tiering still matters for planning, cap handling and board organization, but the target is to do the world fully, not stop at a small representative sample.

Full-world coverage does not mean turning every named wiki page into an independent card. It means the coverage ledger closes honestly.

The practical stop condition is:

- Tier 1 is independently covered
- the meaningful bulk of Tier 2 is independently covered
- all remaining discovered candidates are explicitly imported, grouped, merged, deferred or excluded
- no major known entity is left in an unaccounted gray zone

Typical large-IP benchmarks from Fandom-driven sampling are now part of planning guidance rather than hard quotas.

The key lesson from Fandom is that root-category page counts are often misleading because the real character pool lives in subcategories. Planning should therefore use coverage inventory and category-tree inspection rather than one visible number from the top page.

Current benchmark guidance:

- Star Wars is a true two-hundred-plus character world. Wookieepedia-linked reference material such as `Star Wars: Character Encyclopedia, Updated and Expanded Edition` already frames the canon cast at more than 275 meaningful figures. A serious Studio World should therefore expect roughly 180 to 280 independent character cards before long-tail grouping becomes necessary.
- Harry Potter should be planned as a hundred-scale character world, not a few-dozen-card import. Its Fandom structure is fragmented across allegiance, school, family and ability subcategories, so apparent small category counts are not trustworthy.
- The Lord of the Rings should be planned as a medium-to-large character world that typically lands around 60 to 120 independent cards when books, films and major supporting figures are covered honestly.

Major characters should always be prioritized as independent cards whenever the platform allows it. Group atoms are a fallback for constraint handling, not a preferred authoring mode.

If a world uses group atoms for characters, the report should make clear that grouping happened because of platform cap, board overload risk, or long-tail density, not because major figures were treated casually.

The default priority rule is simple:

- main characters are always independent cards
- major antagonists are always independent cards
- major mentors, dynastic nodes and faction faces are always independent cards
- grouping is only for long-tail density, thin pages, repeated function or hard platform limits

Group atoms are valid only when at least one of these is true:

- the platform cap blocks honest independent coverage
- independent cards would overload the board and bury the core reading path
- the candidates are long-tail entities whose value is collective rather than individual
- the candidates are thin pages with repetitive function and low stand-alone reuse value

Group atoms must never replace lead characters, central antagonists, major relationship nodes or world-defining figures.

As an operating threshold, grouping should be considered when a coherent long-tail cluster would otherwise add more than roughly 8 to 12 low-distinction independent cards in the same semantic band. That threshold is not permission to compress major figures. It exists to stop the board and card quality from collapsing under repetitive long-tail imports.

## Content-writing contract

Visible atom content must be reader-facing world material written in natural English.

Character cards should behave like franchise-bible dossiers rather than metadata sheets. The workflow should offer a strong default shape, not one frozen mold. The recommended visible order is:

- one-line hook
- profile
- character
- history
- relationships
- abilities and limits

High-signal humanizing details such as creed, principle, ritual habit, recurring phrase, social posture, contradiction, voice tell or stress tell may appear when the source supports them, but they should strengthen the portrait rather than turn the card into a trivia list.

Agents should be guided by this structure, but they are allowed to vary emphasis, ordering and prose rhythm when that produces a better card for the actual character. The point is consistent quality, not identical cards.

Location cards should foreground place identity, physical character, world function, history, controlling forces and current tension. A useful visible order is:

- one-line identity
- profile
- function in the world
- historical layers
- factions and inhabitants
- current pressure

The visible card should read like a place that can host scenes, not like a travel entry or a source scrape.

Agents may shift the center of gravity between atmosphere, political role, sacred meaning, danger, memory or utility depending on what actually makes the place vivid and usable.

For both character and location cards, visible prose should borrow the discipline of official databank or franchise-bible copy, while Fandom and wiki material should be treated as fact buckets rather than display format. The card must explain the world object itself, not the extraction machinery.

Organization and system cards should explain what power they hold, what they believe, how they operate, who they shape, and what tensions or contradictions define them.

Event cards should explain what happened, why it mattered, which forces collided, what changed afterward, and why the event still casts a shadow on the present world.

Organization, object, event, system, secret and perspective cards all follow the same rule. The front of the card explains the world object itself, not the extraction machinery behind it.

Across all atom types, the workflow should define target questions and quality signals, then allow the agent to choose the most natural arrangement for the material in front of it.

## World diagnosis policy

Before writing atoms or laying out a board, the builder should diagnose the target world by dimensions rather than only by genre label.

The first accepted dimension set is:

- narrative pressure
- entry point
- asset center of gravity
- relationship structure
- scale
- time structure
- visual recognition mechanism
- prose distance
- board reading mode

This diagnosis is now the bridge between source inventory and actual world construction. It determines what coverage should prioritize, how visible card prose should feel, how the style-space choice should be evaluated, and what the board's first reading path should be.

Families such as mythic, political, gothic, youth-adventure and modern heroic are presets built from these dimensions. They are not rigid templates.

Modern Heroic is a primary family in its own right. It is not merely a modern expression of mythic. It covers hero-roster and superhero-like worlds where public identity, private self, power expression, team chemistry, city or institutional crisis and contemporary commercial visual recognition organize the IP.

Military-Industrial remains a secondary lens by default. It becomes primary only when the world is organized first by command, logistics, mobilization, industrial production, attrition and the war machine itself.

Primary family controls structure. Secondary family or lens adjusts emphasis. They should not be treated as equal tags, because equal weighting makes the world read as mixed signals.

The following belong in metadata, provenance or backstage fields rather than visible card copy:

- source URLs
- raw category dumps
- reference image arrays
- fetch failures
- style prompts
- generation prompts
- story-use scaffolds
- keyword strings

## Visual style policy

Each world gets one world-level visual authority.

Characters and locations cannot split into unrelated styles. Objects, events, covers, works and KV must still belong to the same visual language.

The workflow depends on pre-existing style-space candidates. The selected world style should come from the style space rather than being invented ad hoc for a single run.

The chosen style must be documented with:

- stable style name
- selection reason
- unified style statement
- prohibited outputs
- subject-specific notes that stay inside the same style family

## Board policy

The Studio board is a browsing surface, not an import log.

Cards, titles, body panels and works need deliberate zoning. A good board makes the world legible at a glance, maintains enough information density for creator work, and still opens imaginative space rather than reading like a dry archive.

The board target is now explicit. It should behave like a hybrid of franchise bible, exhibition wall and creator workboard.

The top reading path should be:

world promise -> hero visual -> core cast -> major locations -> powers and institutions -> conflicts and historical motion -> grouped long-tail coverage

Overview and section panels should do the work of orientation labels. They explain what the reader is entering and why the band matters. They are not there to repeat metadata or write prompts.

The board should stay readable both at far view and at close browse distance. At a distance, the world title, hero and major section names should already reveal the hierarchy. Up close, the user should be able to enter dense cards without losing the sense of zones.

Grouped coverage should appear in its own late reading zone or side zone near the relevant band. It should not sit in the premium hero path as if it were the same granularity as the core cast.

The opening frame should stay overview-first. Dense support coverage can continue deeper in the board, but the first viewport must remain structured enough to scan.

Repeated incremental imports are allowed for recovery and supplementation, but if the board becomes unreadable, the standard answer is cleanup or rebuild, not endless patching.

## Acceptance policy

A world only passes if all three layers pass together.

Chain layer means the real world and its bound space are healthy.

Content layer means coverage, writing quality, card readability and schema cleanliness are good enough.

Visual layer means the world is stylistically unified and the generated assets are actually usable.

Technical success alone is not acceptance.

Subjective acceptance is still agent-owned. The agent should combine hard validation with source-based review against Fandom and local wiki evidence rather than asking the user to define every qualitative threshold manually.

Acceptance is not only a final phase. Every stage must have its own acceptance gate. Final acceptance verifies the whole chain and the handoff package together.

Environment-boundary correctness is now part of acceptance. A run fails workflow acceptance if it relies on a sandbox profile for owner-authenticated Studio provisioning or for source-discovery steps that have already been proven to require the local orchestrator profile.

Clean-context adversarial verification is the default verification stance for this workflow.

For non-trivial stages, verification should be performed by a clean-context verifier sub-agent. The verifier receives the delivery definition, expected artifacts, artifact locations and acceptance criteria, not the builder's reasoning. The verifier works from a break-the-delivery perspective and tries to invalidate the stage result against the promised artifacts.

Verification is based on the delivery contract, not open-ended analysis. The question is not whether the result sounds plausible. The question is whether the promised artifact exists, is accessible, has the right structure, is grounded in source or live state, and survives at least one relevant adversarial probe.

Every stage verdict should be PASS, FAIL or PARTIAL. If repair happens after a FAIL or PARTIAL, the affected stage must be verified again.

## Supplement versus rebuild

Supplement is allowed when the base world is real, healthy and worth preserving.

Rebuild is preferred when the existing world is structurally wrong, the board is beyond repair, the schema is polluted, or early shortcuts make honest acceptance impossible.

## Checkpoint policy

Every meaningful state change should be checkpointed after verification.

Checkpoint names should describe what changed and why the state is worth keeping, for example coverage supplement complete, cover regeneration accepted, or metadata cleanup after rename.
