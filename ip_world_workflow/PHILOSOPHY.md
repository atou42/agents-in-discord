# Why This Workflow Exists

Read this first. The rest of the package tells you *what* to do and *how* to check it. This file tells you *why*, and what "good" means. An agent who only knows the rules can pass every gate and still ship something bad in a way no rule anticipated. An agent who understands the intent makes the right call in situations we never wrote a rule for.

Everything below is grounded in real deliveries. The failure examples are not hypothetical — they happened, and most of the gates you will meet exist because of them.

## What Neta Studio is

Neta Studio (`neta.art`) is a platform where a **world** is a live, browsable space built from an IP. Each world is created in Studio, then bound to a Cohub execution space (`cohub.run`) where its content is imported and its images are generated. The visible surface a creator sees is a **board**: a large canvas of **atoms** (characters, locations, factions, events, systems, objects…) laid out in readable zones, plus generated **works/media** that prove the world is a creation surface, not just stored data.

Creators use a world to browse an IP, generate new images in its established style, remix its elements, and build downstream creations from it. The world is the raw material and the sample room for that work.

You are not "importing data into a database." You are building the room a creator walks into.

## What we are building, and for whom

**The deliverable is a reusable IP sample room. The reader is a creator.**

Not a scraper, not a validator, not yourself. A person who knows and cares about this IP, who opens the world to *make something* with it.

The single question behind every judgment call: **would a creator who knows this IP feel understood, or feel fobbed off?** A world that technically passes but makes that creator close the tab has failed, no matter how green the checks are.

This is why the workflow is delivery-led, not activity-led. You do not start by importing atoms or generating images. You start by understanding the world and defining what a complete, creator-facing delivery looks like — then you derive the stages from that. Import shape, cover generation, board layout are implementation mechanics in service of the room. They are never the point.

## Research before building

Every IP deserves real research before a single atom is written. Not just counting Fandom category pages — understanding what the fandom actually cares about: which characters fans rank far above their screen time, which design details are identity-defining, which facts are sacred. A world built from surface data gets the shape right and the soul wrong, and IP fans detect that instantly.

Reference images are facts, not decoration. Same-name characters, mid-series redesigns, film-versus-source divergence and AU versions are all real traps; a reference is only trustworthy when a second source confirms it. One wrong protagonist reference poisons every generated asset downstream.

This is why phase one ends with a human review, not a green checkmark. Before execution, the builder presents a proposal — main cast and count, cross-verified references for protagonists and key locations, the fan red lines that must not be gotten wrong, a plan to delight fans by showing we know the IP, and 3-5 style candidates with exemplar images. The user confirms or corrects it. Execution before that approval wastes the most expensive part of the run on unvalidated assumptions; every hour of research and review in phase one saves many in the execution phase.

## What "good" looks like

A good world:

- **Reads like a world bible, not an import log.** Every atom's visible card is natural prose a creator can use — identity, personality, history, relationships, abilities, limits — not a dump of `source_url`, `reference_images`, and fetch-failure logs. Provenance is real and preserved, but it lives in metadata, behind the card, not on its face.
- **Is recognizably this IP — visually and factually.** One world-level art style, chosen to make *this* IP identifiable, applied across every atom type. A character card whose facts put someone in the wrong clan is worse than a missing card; it is confidently wrong.
- **Covers the world in proportion to the source.** A big Fandom IP is a big world. Coverage is discovered from the category tree and tiered honestly (Tier 1 must-haves, Tier 2 supporting, Tier 3 long-tail grouped or excluded with reasons), not hand-picked down to a comfortable size. A 20–30 atom import of a major IP is a smoke test, not a world.
- **Is inspectable without you.** The handoff package stands on its own — a stranger can open the run folder and see what was built, at what scale, with what evidence, and what was deferred. Nothing important lives only in chat history.

"Good" is not "the script said PASS." Technical validation (real world ID, bound space, clean import, ready covers, live board) is necessary but not sufficient. A world can pass every technical check and still be shallow, off-model, or unpleasant to browse. That gap — technical-PASS but product-FAIL — is the exact mistake this whole workflow was built to correct.

## Why the gates exist

**A gate is not a tax on your progress. It is a user promise about quality, made executable.** Behind almost every gate is a real delivery that went wrong in a way that looked fine at the time.

- The **style gate** and **user-approval on style** exist because a Cyberpunk 2077 run argued itself out of the library's own Cyberpunk style into a generic hero-splash look, with a rationale that sounded reasonable and was wrong. Machines can check that a style choice has evidence; they cannot check that it is *right for the IP*. That judgment is the user's.
- The **target lock** exists because a Frieren run quietly edited its own delivery target down from 18 characters to 5 mid-run, so a thin delivery could measure as complete. Goals are set from evidence up front and frozen; if reality breaks a target, you record FAIL or PARTIAL with the gap documented — you do not move the goalposts.
- The **per-character asset gate** exists because a Cyberpunk run shipped 30 character cards but only 18 images, leaving 12 of the core cast card-only — each number green on its own, the gap hidden between them.
- The **atom-type whitelist** and **factuality audit** exist because a Naruto run represented overflow characters as `people`/`place` atoms that slipped past the character-quality gate entirely, and because no structural check can catch a card that states a false fact.
- The **script integrity lock** exists because a run agent silently patched an escape hatch into the gate script itself. Gates are the user's quality contract; a consumer of the gates does not get to rewrite them.

The right move when a gate blocks you is almost never to route around it. If a gate is genuinely wrong or a platform hard-cap makes a target impossible, **stop and tell the user with evidence** — do not quietly downgrade, reclassify, or edit the rule. Unilaterally weakening a gate to make a delivery measure as complete is treated as delivery fraud, regardless of intent.

## The default direction of judgment

When you are unsure and no rule decides it for you, lean these ways:

- **Scale in doubt → toward the observed surface.** If the source shows a big cast, plan big. Understating the world to make it easier is the failure mode; the source material is the floor, not your convenience.
- **Style in doubt → toward IP recognizability.** The test is whether a fan recognizes the IP, not whether the render is technically impressive.
- **Scope in doubt → ask the user.** Declaring a run a reduced "core sample," picking the art direction for a full world, resolving a platform cap by degrading the cast — these are the user's calls, not yours.
- **Any discretionary number → escalate, never self-lower.** Targets ratchet up, never down. When tempted to shrink a goal to fit what you delivered, that is exactly the moment the workflow is designed to stop you.

Hold the intent, and the specific rules will make sense as instances of it — not as obstacles, but as the accumulated memory of what "good" costs.
