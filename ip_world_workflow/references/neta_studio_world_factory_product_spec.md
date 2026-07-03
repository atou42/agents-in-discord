# Neta Studio World Factory Product Spec

Date: 2026-06-28

This spec records the product bar for IP Studio Worlds built from Fandom and Neta. It corrects the earlier mistake where a world could pass technical validation while still being too shallow, visually inconsistent, and unpleasant for a creator to inspect.

## Product Goal

A Studio World is a reusable IP sample room for creation and mass production. It must feel like a structured world bible inside Studio, not like a technical import log.

The world must support browsing, generation, remixing, and downstream IP-space creation. Every atom should help a creator understand and use the IP.

## Non-Negotiable Requirements

Content density must follow the target IP, not a fixed toy count. Large Fandom worlds need broad coverage of characters, places, factions, races, objects, rules, historical events, relationships, secrets, and creator perspectives. A 20 to 30 atom import is only a smoke test.

Atom content must be written as world content. A character atom should show identity, appearance, personality, background, faction, relationships, abilities, weaknesses, key events, visual generation notes, and story use. A location atom should show geography, visual design, history, controlling factions, related characters, key events, scene uses, and recognizable details. Other atom types need the same level of world-facing structure.

Fandom data is source material and provenance. `source_url`, categories, images, infobox fields, and fetch failures belong in metadata. They must not dominate the visible card content.

Each world uses one selected world-level visual style. The style must be chosen from the existing style space or approved style library before generation. All characters, locations, objects, events, covers, works, and key visuals share that style. Prompts may vary by subject, composition, or material, but not by art direction.

Reference images are fidelity anchors. They are used to preserve silhouettes, clothing, location materials, symbols, and atmosphere. Final generated assets must be original images, not copied film frames or actor likenesses.

## Required World Structure

For a full Fandom-scale IP world, create a content inventory before import. The inventory should include enough atoms to make the world browsable without constantly returning to Fandom.

Minimum target for major IPs is 80 atoms. Strong worlds should go higher when the source supports it. The number is only a floor, not a coverage claim. A world can fail even with 80 atoms if it skipped major Fandom categories or silently hand-picked a small cast.

The structure should include major characters, supporting characters, key locations, organizations and factions, peoples or races, artifacts and objects, rules and systems, historical events, relationships, secrets, and playable perspectives.

## Fandom Coverage Standard

Before creating atoms, the builder must produce a source inventory from Fandom or the chosen source wiki. The inventory is part of the deliverable and must record the queried wiki, category names, page counts, duplicate handling, inclusion tier, exclusion reason, and final atom mapping.

The builder must not infer coverage from a hand-authored list. For every major entity type, discover source categories first, then merge and deduplicate pages. For characters, this usually means checking broad character categories, work-specific character categories, major-character categories, film/book/game subcategories when relevant, and adjacent canon categories when the world scope includes them. The same rule applies to locations, factions, objects, events, species, powers, and lore systems.

Coverage should be tiered instead of blindly importing everything. Tier 1 contains must-have entities required to understand the world. Tier 2 contains important supporting entities that make the world browsable and useful for generation. Tier 3 contains long-tail or low-signal pages that may be summarized, grouped, or excluded. Exclusions are allowed only when they are explicit and justified, for example duplicate page, cast-list page, unnamed minor entry, non-canon adaptation-only entity outside scope, maintenance page, or insufficient source content.

For a full Fandom-scale world, the acceptance target is at least 95% of Tier 1, at least 80% of Tier 1 plus Tier 2, and 100% explicit accounting for discovered candidates. If a category has hundreds of long-tail pages, the report must say which tiers were imported now and which were deferred. A run that imports only a curated core set must be labelled core sample, not full world.

For characters in particular, a major IP world must not pass if the imported character count is lower than the directly discovered character set for the declared scope, unless the report lists every excluded character and why. For example, if the selected scope includes `The Lord of the Rings characters` and Fandom directly lists 44 pages, importing 31 characters without an exclusion table is a coverage failure.

The inventory must drive atom generation. Each imported atom should trace back to a source candidate ID or source title. Each source candidate should have one of these statuses: imported as atom, merged into another atom, represented by a group atom, excluded with reason, or deferred with reason.

## Visual Style Standard

The builder must select one style per world. The report must state the selected style, why it was selected, and how it applies across all atom types.

The selected style needs a stable name, a unified prompt, negative constraints, and subject-specific guidance. For example, a character prompt and a location prompt may differ in framing, but both must clearly belong to the same visual system.

If the style space cannot be queried, the run is partial unless a temporary fallback style is explicitly documented and approved.

## Card Display Standard

Visible card fields should be creator-facing. Use plain world content. Do not expose raw JSON blobs, giant reference image arrays, Fandom category dumps, or fetch failure logs on the front of the card.

Provenance should still be preserved, but it belongs behind the scenes in metadata or a separate source report.

## Validation Standard

A world passes only if both product validation and technical validation pass.

Product validation checks source inventory completeness, candidate accounting, atom count, content coverage, card readability, unified style, reference-image usage, board organization, and sample generation quality.

Technical validation checks real `world_...` ID, bound `spaceId`, Neta mod availability, import success, cover readiness, media readiness, public URL 200 responses, Studio board placements, and no lock or temporary-file residue.

## Failure Examples

A world with 24 atoms for a major IP is not a full world.

A world with 31 hand-picked characters is not a full world when the declared source category contains 44 directly listed characters and the report does not account for omissions.

A card that mainly displays `source_url`, `reference_images`, and `source_fetch_failures` is not creator-facing content.

A world where characters, locations, objects, and events use unrelated art styles fails the unified-style requirement.

Technical PASS does not equal product PASS.
