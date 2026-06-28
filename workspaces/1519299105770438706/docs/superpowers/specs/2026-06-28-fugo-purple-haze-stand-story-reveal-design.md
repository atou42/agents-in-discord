# Fugo Purple Haze Stand Story Reveal Design

Date: 2026-06-28

Status: draft for review

## Purpose

Upgrade the Fugo refusal scene from a hold-and-release haze effect into a playable Purple Haze pressure chamber.

The current scene asks the user to hold. That is already the right starting point. Fugo is not a clean action burst. His scene should make the user feel containment, danger, intelligence, fear, and separation. The next version should turn the hold into a controlled exposure to Purple Haze: the longer the user holds, the more the virus pressure rises. On release, the scene does not celebrate escape. It cuts away with the pain of someone choosing not to continue.

The reveal should explain Purple Haze as an ability and Fugo as a person. New viewers should understand why this Stand is terrifying. Fans should feel the wound of the boat scene without the site flattening Fugo into cowardice.

## Audience

First-time viewers should understand that Fugo is a brilliant but volatile member of Bucciarati's team, that Purple Haze releases a lethal virus from capsules on its fists, and that `I can't go with you.` is a character rupture rather than a simple exit line.

Casual JoJo viewers should recognize the danger of Purple Haze, Fugo's temper, and the decision not to join Bucciarati's rebellion.

Fugo fans should feel the difficult balance: he is intelligent and grateful to Bucciarati, but also unable to follow a suicide path on ideals alone. The scene should respect his refusal as painful and human, not as a cheap failure.

## Product Principle

The order is containment first, exposure second, refusal third.

The user should feel the scene becoming unsafe before reading about the virus. Purple Haze should appear as something Fugo cannot casually unleash. The Stand Scan should explain why the hold feels dangerous. The character return should make the line land as a limit, not a punchline.

## Source Facts

Use these facts as guardrails for the first version.

- Pannacotta Fugo is a member of Bucciarati's team and Passione.
- He is young, intelligent, tactical, and quick-tempered.
- He has violent outbursts but is not only rage; he is also analytical and capable of friendship.
- He is grateful to Bucciarati, who brought him into the gang.
- When Bucciarati decides to betray the Boss, Fugo refuses to follow, arguing that nobody can survive on ideals alone.
- Purple Haze is Fugo's Stand.
- Purple Haze is extremely dangerous and reflects Fugo's volatility.
- Its fists contain capsules. When they break, they release a lethal virus.
- The virus kills quickly, is dangerous to allies and enemies, and weakens in sunlight.
- Purple Haze is difficult to use safely because its infection can spread beyond Fugo's intention.
- Fugo later receives expanded treatment in *Purple Haze Feedback*, but this first site version should focus on the Part 5 scene.

References checked:

- https://jojo.fandom.com/wiki/Pannacotta_Fugo
- https://jojo.fandom.com/wiki/Purple_Haze

## Current Baseline

The scene key is `fugo`. It shows the quote `I can't go / with you.`, uses tab `Fugo`, class `scene-haze`, and caption `Purple Haze`.

The current pointer interaction starts in `startFugoHold`. It stores the pointer and start time, adds `is-haze-pressing`, then after about 180ms adds `is-haze-holding`. `finishFugoHold` checks the hold duration. If the user held long enough, it adds `is-haze-release` and `is-haze-transition`, then advances to Abbacchio after about 760ms. Short or cancelled holds return to idle.

The current design correctly treats Fugo as pressure rather than spectacle. The next version should preserve that restraint and add the Stand reveal after the hold is earned.

## Desired Experience

The user presses and holds the Fugo scene. The haze thickens. Purple particles do not sparkle; they behave like contaminated air. The typography compresses. The frame feels less breathable.

At the first threshold, Purple Haze's capsules appear as close-up fragments. At the second threshold, a fist, visor, or stitched mouth enters through the haze. The user should understand that continuing to hold is not charging power; it is increasing danger.

When the user releases after the threshold, the Stand appears fully for a short, severe entrance. The scene should not show a victorious attack. Instead, Purple Haze is restrained just as it becomes visible. The Stand Scan explains the virus ability and why it cannot be freely used around allies.

The character return then focuses on the boat decision. Fugo cannot step into Bucciarati's rebellion. The scene moves on, but it should feel like a person has been left behind.

## Interaction Flow

`idle`: Fugo is active. The quote sits heavy. The haze is present but contained.

`pressure_hold`: Pointer or keyboard press begins. The scene darkens at the edges and the haze becomes denser.

`capsule_warning`: After the short hold threshold, capsule symbols, cracked glass, or infection markers appear. The user should know the scene is becoming unsafe.

`stand_contained`: Purple Haze is partially visible. The frame feels tense, not triumphant.

`release_accepted`: The user releases after the required duration. The hold resolves. The scene does not instantly change.

`stand_entrance`: Purple Haze appears through the haze with a short impact and then immediately hits a restraint beat.

`stand_scan`: The scan explains lethal virus capsules, ally risk, short-range ferocity, and sunlight decay.

`character_return`: Fugo's refusal is framed as a painful limit.

`continue_ready`: Click, tap, Enter, Space, Next, or the Abbacchio tab continues.

Replay restarts the original Fugo scene. Any navigation clears timers, generated haze fragments, and reveal classes.

## Motion Direction

The scene should feel dangerous and controlled.

Use thickening haze, capsule cracking, hard infection stamps, reduced contrast, and sudden restraint. Avoid heroic explosion, generic poison clouds, soft bloom, or celebratory power-up motion.

Suggested timing after accepted release:

- 0.00s: release accepted, haze stops expanding.
- 0.12s: capsule crack appears.
- 0.35s: Purple Haze fist or visor pushes through.
- 0.70s: full Stand silhouette arrives.
- 0.95s: infection warning stamps the scene.
- 1.20s: restraint beat cuts the haze back.
- 1.70s: Stand Scan becomes readable.
- 3.80s or user action: character return appears.

On mobile, the hold target should be the whole active stage. The pressure feedback must be obvious without requiring fine movement. The scan should appear in a lower or center band above carousel controls.

## Visual Design

Purple Haze needs a purpose-built asset. It should include the helmet/visor feeling, capsule fists, stitched or constrained mouth language, and aggressive posture. It must not look like a generic purple monster.

The scene palette can use sickly violet, bruised green, cream paper, black ink, and warning red in small amounts. Do not let the site become a full purple wash. The user should still see the current theater identity.

The infection visuals should be graphic and readable: capsule rings, hazard stamps, speckled air, impact blotches. Avoid realistic disease gore.

## Stand Scan

Primary labels:

`PURPLE HAZE`

`Stand User: Pannacotta Fugo`

Ability lines:

`Breaks capsules on its fists to release a lethal virus.`

`The virus can endanger allies as easily as enemies.`

`Sunlight weakens the infection.`

Bridge line:

`That is why holding the scene makes it unsafe.`

Radar axes:

- Virus Lethality
- Close-Range Burst
- Control Risk
- Ally Danger
- Refusal Pressure

The last axis is a theater reading. It exists to connect Stand danger to Fugo's decision.

## Character Reading

Fugo should not be framed as simply weak. He is the character who sees the cost clearly and cannot cross the line.

His ability is an emotional mirror. Purple Haze is devastating, but unsafe. Fugo can understand the mission and still be unable to release himself into it. The better reading is not cowardice. It is a person whose intelligence and trauma make the ideal path feel impossible.

Proposed character return copy:

`He knows the danger too well.`

`His Stand can destroy a room before anyone is safe.`

`Fugo's refusal leaves a wound in the team.`

Quote echo:

`I can't go with you.`

## Key Event Fragments

Use fragments as quick cuts during the character return:

- `Brilliant`
- `Volatile`
- `Capsules`
- `Ally risk`
- `Left behind`

Do not over-focus on novel material in the first version. *Purple Haze Feedback* can be referenced later through an optional inspect layer.

## Asset Requirements

First version needs at least three new assets:

- Purple Haze full or three-quarter body, transparent WebP.
- Capsule fist close-up or cracked capsule detail.
- Infection warning texture or haze mask that can be composited with CSS.

Optional later assets:

- Fugo portrait in restraint/choice pose.
- Purple Haze mouth/visor close-up.
- Sunlight burnback texture for reduced haze.

Generated assets must be original redraws compatible with the site. Do not use anime screenshots.

## Information Architecture

Add structured scene data when implemented:

- `standName`
- `standUser`
- `standArt`
- `standDetailArt`
- `standAbilityLines`
- `riskFragments`
- `radarValues`
- `storyReveal`
- `continueLabel`

The scan text must be real DOM text.

## State Model

Suggested states:

- `idle`
- `pressure_hold`
- `capsule_warning`
- `stand_contained`
- `release_accepted`
- `stand_entering`
- `stand_scan`
- `character_return`
- `continuing`

The existing `is-haze-transition` should not be the whole success state. It should become the handoff into reveal states.

## Transition Rules

Short holds should release safely and remain on Fugo.

Long holds should unlock the reveal, then allow continuation to Abbacchio.

The transition to Abbacchio should feel like the haze thinning into a memory field, not like an explosion. This connects Fugo's emotional stop to Abbacchio's truth search.

## Mobile Requirements

Mobile users should be able to hold anywhere on the stage. The hold duration should be forgiving, and accidental scroll should not ruin the sequence.

The scan must not cover bottom tabs permanently. The continue target must be at least 44px tall.

Reduced-motion users get pressure, Purple Haze snap-in, scan, continue.

## Performance Requirements

Preload Purple Haze assets when the user is near Fugo, not on first page load.

Use optimized WebP for large assets. Haze should be CSS/SVG or small textures. Avoid heavy video.

Prefer opacity and transform. Avoid expensive blur stacks on mobile.

## Accessibility

The hold should have keyboard support through press-and-hold on Space or Enter where practical, with an alternative activate command if hold is unreliable.

The scene should announce `Purple Haze Stand Scan unlocked` when the scan appears.

The reveal should be understandable with reduced motion and without color alone.

## Acceptance Criteria

Long hold and release on Fugo enters the Purple Haze reveal before advancing to Abbacchio.

Short hold returns safely to the current scene.

Purple Haze appears as a purpose-built asset through containment and haze, not as a generic fade.

Stand Scan explains capsules, lethal virus, ally danger, and sunlight decay with English or Japanese UI text only.

Character return frames Fugo's refusal as painful, rational, and unresolved.

Replay, Previous, Next, tabs, and resize clear all reveal state.

Desktop and mobile both make the hold target obvious.

Reduced-motion mode remains usable.

## Validation Plan

Manual validation should capture idle, hold pressure, capsule warning, release, Purple Haze entrance, Stand Scan, character return, mobile layout, and reduced-motion.

Automated validation should confirm long hold creates reveal state before scene change, short hold does not transition, continue moves to Abbacchio, replay clears reveal classes, and mobile scan does not overlap the carousel.

## Rollout Note

Fugo should not be made louder just because other scenes are loud. His quality bar is discomfort, restraint, and the ache of non-participation.

## Implementation Decisions

Autoplay off means the reveal waits for the user after the character-return beat. Fugo should not advance only because the hold animation completed.

The hold is the core metaphor. Do not replace it with a tap explosion or a generic poison burst.

Purple Haze's danger must include ally risk and virus decay, not only visual smoke. The reveal should make the user understand why this Stand is frightening to everyone nearby.

The first implementation should keep Fugo restrained. If a motion idea makes the scene feel triumphant, reject it.

All runtime explanation remains English or Japanese only, and all scan copy must exist as real DOM text.
