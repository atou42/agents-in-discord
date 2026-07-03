# World Metadata Schema Draft

This draft defines how a Studio World should describe itself at the world level.

The immediate problem it solves is drift. Without guide rails, world names turn into marketing lines and overviews turn into prompts. The answer is not one frozen voice. The answer is a controlled family of voices.

## Name

The world name should be the franchise or world name itself.

Examples:

- Star Wars
- The Lord of the Rings
- Harry Potter

Do not stuff the name field with delivery-stage labels like canon studio world, premium package, fandom sample room or build instructions.

## Overview

The overview is one clean sentence that tells a human what kind of world this is.

It should sound like restrained franchise-bible copy, not a request to a model.

Different worlds can still lean more mythic, political, intimate, gothic, adventurous or tragic as long as they stay world-facing and do not collapse into prompt language.

The target tone is closer to an official databank or franchise-bible opening than to marketing copy. It should establish scale, pressure and identity without sounding like a slogan.

Good overview shape:

`A galaxy bound together and torn apart by the Force, where republics, empires, rebels, smugglers, Jedi and Sith turn family history into civilizational fate.`

Bad overview shape:

`Build a premium Star Wars canon studio world with unified modern cinematic galactic myth visual direction...`

## Prologue

The prologue is a short paragraph that frames the lived condition of the world.

It should answer what kinds of places, powers and tensions dominate life in this setting.

It should not become a production note, lore dump or long encyclopedia paragraph.

## Core conflict

Core conflict states the deepest pressure that keeps stories alive in this world.

It should connect public-scale conflict with intimate stakes where possible.

## Visual style

Visual style should store the chosen world-level style authority in plain language.

It should identify the style and explain what visual family it governs.

It should not read like a raw prompt string.

## Section labels

Section labels should be short and browseable.

They should feel like section headers in a premium world bible.

Good labels:

- Galactic Figures
- Worlds And Strongholds
- Powers And Orders
- Artifacts And World Rules
- Wars And Turning Points

## Section bodies

Each section body is one short paragraph that explains what the viewer will find there.

These bodies are not atom content. They are navigation copy for the board.

## Default field contract

The minimum world-level fields that should be deliberately written are:

- name
- overview
- prologue
- coreConflict
- visualStyle
- sections
- sectionBodies

## Writing rules

Everything should be in natural English.

Avoid prompt verbs like build, create, generate, make or use.

Avoid production jargon unless the field is explicitly backstage.

Prefer disciplined, world-facing prose over hype. The copy should leave imaginative room for the creator instead of exhausting the world in one paragraph.

Avoid repeating the same sentence structure across worlds. The schema should stabilize meaning, not flatten voice.

Do not write world metadata as instructions to create content. Metadata should describe the world itself, not tell a system what to generate.

## Variants

The metadata system should support a small family of tonal variants, chosen by the agent from the world diagnosis.

A mythic world may sound more elevated.

A political or military world may sound sharper and more institutional.

A gothic world may sound more haunted and intimate.

A youth-adventure world may sound more lucid and wonder-driven.

A modern heroic world may sound more like a premium character bible or official hero databank, with emphasis on identity, power expression, public image, team pressure and contemporary franchise energy.

These are not separate hard templates. They are controlled variations inside the same franchise-bible standard.

The diagnosis layer should decide the variant through dimensions such as narrative pressure, entry point, asset center of gravity, scale, visual recognition mechanism, prose distance and board reading mode. The chosen variant must affect the overview, prologue and section emphasis, not just the adjectives used.

## Failure conditions

The metadata fails if the world name reads like a work order.

The metadata fails if the overview reads like a prompt.

The metadata fails if section labels are generic placeholders.

The metadata fails if the prologue is so long that it behaves like an article instead of framing copy.

The metadata fails if it ignores the diagnosed primary family and reads like a generic house style.

## Next hardening step

This draft should be tested by rewriting the visible metadata for at least three different IP families. A fantasy world, a sci-fi world and a modern or gothic world should all pass the schema without sounding copied from one another.
