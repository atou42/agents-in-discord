# Bucciarati Stand Story Reveal Design

Date: 2026-06-28

Status: draft for review

## Purpose

Upgrade the Bucciarati betrayal scene from a strong transition into a small character theater.

The current scene lets the user pull a zipper through the image and move to the next quote. That already matches Sticky Fingers at a surface level. The next version should make the connection explicit and emotionally useful: the user performs the zipper action, Sticky Fingers appears from the opened image, then the site explains why this ability, this line, and Bucciarati's personality belong together.

This is not a Wiki page and not a pure fan-service cutscene. It is a playable explanation of Bucciarati as a character.

## Audience

The design must serve three audiences at once.

New viewers should understand that Bucciarati is a mafia leader with a moral line, that his Stand creates zippers, and that betraying the Boss is the moment the escort mission becomes a rebellion.

Casual JoJo viewers should recognize the famous line, Sticky Fingers, and the logic of the scene without feeling slowed down by explanation.

Bucciarati fans should feel that the scene respects his elegance, resolve, restraint, and brutality. The experience should feel like a tribute, not a database entry.

## Product Principle

The order is experience first, explanation second, character meaning third.

The user should never be asked to read before they understand why they are reading. The reveal is earned by the zipper interaction. The Stand appears because the user opened the image. The explanation appears because the Stand has appeared. Bucciarati's character meaning appears after the ability is understood.

## Source Facts

Use these as the factual base for the first version.

- Bucciarati is a capo in Passione and leader of his squad.
- He begins as Giorno's opponent, then becomes the first major ally who supports Giorno's rise inside Passione.
- His defining traits are resolve, righteousness, kindness toward civilians and his team, and willingness to risk himself for a just cause.
- He despises the drug trade and is conflicted by Passione's corruption.
- His rebellion against Diavolo begins when the Boss tries to kill Trish.
- Sticky Fingers is Bucciarati's close-range humanoid Stand.
- Sticky Fingers can create zippers on surfaces it touches.
- The zippers can open paths, split objects, detach body parts, attach things, hide objects, and reposition Bucciarati.
- Sticky Fingers' attack cry builds through ARI ARI ARI and resolves into Arrivederci.

References checked:

- https://jojo.fandom.com/wiki/Bruno_Bucciarati
- https://jojo.fandom.com/wiki/Sticky_Fingers

## Current Baseline

The scene key is `betray`. It shows the quote `I will betray / the boss.` and currently uses a pointer-driven zipper path.

On drag, the image separates along the zipper path. On success, the current image exits, the next image is revealed, and the scene advances after the transition. The implementation already has tear layers, zipper SVG paths, mobile vertical handling, and release-gated completion.

The new work should preserve the tactile zipper behavior. The change is what happens after a successful tear.

## Desired Experience

The user pulls the zipper across the scene. The image opens.

Instead of immediately leaving, the scene holds in the torn-open state. The visible gap becomes a dark pocket space. Sticky Fingers enters from that pocket.

The Stand entrance should be sharp and staged in beats:

1. A zipper hand or forearm cuts into view.
2. The zipper teeth snap into alignment.
3. The helmet and shoulders appear through the opening.
4. The full Stand silhouette lands behind or beside Bucciarati.
5. ARI ARI ARI typography hits in short bursts.
6. Arrivederci closes the entrance beat.

After the entrance, the scene shifts into Stand Scan.

The Stand Scan explains Sticky Fingers in a compact, visual way. It should show the Stand name, the user name, a small ability radar, and two or three ability lines. It should also include one bridge line that connects the mechanic to the user's action.

Then the character layer appears. It should bring the focus back from the Stand to Bucciarati. The point is not only that he has a zipper ability. The point is that he is a person who opens a path out of a rotten system.

The reveal then offers a clear exit into the next scene.

## Interaction Flow

The default flow has four states.

`zip_drag`: the current behavior. The user pulls the zipper and the photo tears open.

`stand_entrance`: triggered only after successful release. The torn photo freezes, the next scene is not yet active, and Sticky Fingers appears from the tear.

`stand_scan`: the Stand name, ability summary, and radar appear. This state is readable but short. It should not trap the user.

`character_return`: the scene connects the ability back to Bucciarati's choice, then allows or triggers transition to the next quote.

Manual exit should be available in `stand_scan` and `character_return`. A click, tap, Enter key, or Next button should continue. If the user does nothing, auto-advance can happen after the reveal finishes, but only if autoplay is enabled. Since autoplay is currently off by default, the default experience should wait for user action.

Replay must restart from the original Bucciarati image, not from the Stand Scan.

Previous and scene tabs must always work and must clear the reveal state.

## Motion Direction

The entrance should feel like a Stand entering from a torn-open space, not like a modal appearing.

Use fast cuts, hard masks, zipper snaps, and layered ink shadows. Avoid glowing orbs, generic radial light, soft blur bloom, and long fade-ins.

The timing target is about 2.4 to 3.2 seconds from successful zipper release to readable Stand Scan. That is long enough to feel like an entrance and short enough to keep the site moving.

Suggested beat timing:

- 0.00s: release accepted, current image freezes torn open.
- 0.10s: dark pocket appears inside the tear.
- 0.35s: zipper hand/forearm flashes in.
- 0.70s: helmet/shoulder silhouette appears.
- 1.05s: full Sticky Fingers pose locks.
- 1.25s to 1.75s: ARI ARI ARI typography impacts.
- 1.95s: Arrivederci hit.
- 2.35s: Stand Scan becomes readable.
- 4.80s or later: character return line becomes available or starts.

On mobile, the same sequence should use fewer simultaneous layers. The Stand can occupy the center and lower half of the torn image. The scan should slide from the lower edge or emerge inside the tear, not cover the whole viewport.

## Visual Design

The page already has a manga-theater style. The reveal should extend it.

Sticky Fingers should be drawn as a new image asset, not assembled from generic shapes. It should match the existing generated art direction: hand-drawn ink, fashion illustration energy, textured paper, controlled color, and sharp comic impact. Do not use a plastic 3D toy look, superhero poster lighting, or generic anime screenshot imitation.

The palette should not copy the current gold-green interface too literally. Sticky Fingers can introduce cooler blue-gray, pale cream, black ink, and zipper brass. The scan UI can use teal accents already present in the site, but should be restrained.

The Stand should feel physical and close-range. Avoid making it a distant ghost. It should enter like a body in the same space as the torn photo.

The ability radar should be graphic, not decorative. It can use five axes:

- Close-Range Power
- Speed
- Zipper Utility
- Spatial Control
- Resolve Link

The last axis is intentionally not a canon stat. It exists to connect the Stand to Bucciarati's role in this site. If this feels too non-canon in implementation, label it as Theater Reading instead of Stand Stat.

## Content Design

All in-page text must be English or Japanese only. No Chinese appears in the final site UI.

The first version should use short text.

Stand entrance text:

`STICKY FINGERS`

`Stand User: Bruno Bucciarati`

Ability lines:

`Creates zippers on touched surfaces.`

`Opens paths, splits objects, and closes the gap at will.`

Bridge line:

`That is why you pulled the scene open.`

Character return line:

`Bucciarati does not only open walls. He opens a path away from the Boss.`

Optional short story line:

`The escort mission becomes a rebellion.`

Quote echo:

`I will betray the Boss.`

`Arrivederci.`

Do not overload the first version with more than about 55 visible English words in the reveal. Longer lore can come later through an optional inspect mode.

## Character Reading

The reveal should frame Bucciarati through three ideas.

First, he is elegant and calm, but not soft. His visual language should be clean, precise, and cutting.

Second, he is a leader because he gives people a path. Giorno, Trish, Narancia, Mista, Abbacchio, and Fugo all relate to him through the question of whether they can follow that path.

Third, his betrayal is not random rebellion. It is a moral decision. He chooses Trish and his team over the Boss's order.

The scene should not present Bucciarati as simply cool, tragic, or saintly. The better reading is principled gangster, precise fighter, and chosen leader.

## Asset Requirements

The first version needs at least three new assets.

Sticky Fingers entrance asset:

- Transparent WebP or PNG source.
- Full or three-quarter body.
- Strong readable silhouette.
- Pose suitable for entering from a zipper tear.
- No embedded text.

Sticky Fingers detail asset:

- Cropped hand/forearm or zipper detail.
- Used for the first entrance beat.
- Must read clearly on mobile.

Stand Scan background asset:

- A textured radar/ability sheet or frame element.
- Transparent or CSS-composable if possible.
- Should not look like a sci-fi HUD pasted over a manga scene.

Optional later assets:

- Bucciarati portrait accent.
- Sticky Fingers helmet close-up.
- Small zipper brass pieces for particle accents.

If generated assets are used, keep prompts focused on original redraws and style compatibility. Do not use direct anime screenshots. Do not imitate a single supplied artist's exact style. The asset goal is coherent manga-theater redraw, not copyright mimicry.

## Information Architecture

The reveal is not a global page mode yet. It is local to the Bucciarati scene.

Implementation can start with scene-local data on the `betray` scene object:

- `standName`
- `standUser`
- `standArt`
- `standDetailArt`
- `standAbilityLines`
- `storyReveal`
- `radarValues`
- `continueLabel`

The markup should be generated from structured data. Avoid hardcoding all reveal text inside animation functions.

Once Bucciarati is good, the same shape can support Narancia, Mista, Abbacchio, Trish, and others.

## State Model

Add a separate reveal state from zipper drag state.

Suggested states:

- `idle`
- `zip_dragging`
- `zip_snapback`
- `zip_complete`
- `stand_entering`
- `stand_scan`
- `character_return`
- `continuing`

Do not reuse `is-zip-complete` alone to mean all reveal states. That class should only describe the photo tear completion. Stand reveal needs explicit state classes so timing and cleanup stay controllable.

State cleanup is a quality requirement. Leaving the scene, replaying, pressing Previous, pressing Next, or selecting a tab must remove all reveal classes, timers, and temporary inline styles.

## Transition Rules

Before release, never show the next story layer. The user must release a successful zipper first.

After successful release, hold the current scene. Do not immediately call `setScene(current + 1)`.

During Stand entrance, the next scene may be preloaded but should not visually dominate. The tear can expose darkness or a hint of the next image, but Sticky Fingers is the focus.

After character return, the user can continue to the next scene. The final transition can reuse the torn photo exit, but it should feel like Bucciarati has chosen to move the story forward, not like the site timed out.

## Mobile Requirements

Mobile must be designed as a first-class layout.

The zipper path may become vertical or diagonal as it does today, but the Stand entrance must align with the actual tear. If the tear is vertical, Sticky Fingers should emerge from that vertical opening. Do not reuse desktop coordinates.

The scan must fit above the bottom tabs. It must not cover the scene controls permanently. It can occupy the lower third or center band, but all text must remain readable on a 390px wide viewport.

Touch targets for continue must be at least 44px high.

The reveal should not require hover, keyboard-only timing, or precise secondary gestures.

## Performance Requirements

The reveal adds assets and animation. It must not make the first scene slower.

Preload Bucciarati Stand assets only when the user is on or near the Bucciarati scene. The first page load should not eagerly pull every future Stand asset.

Use WebP for large raster assets. Keep each large reveal asset under a practical web size target. If an asset is visually large, optimize it before upload.

Prefer transform and opacity animations. Avoid animating layout-heavy properties during the reveal.

Do not add video for the first version unless the generated asset quality is clearly better and the file size remains acceptable.

## Accessibility

The reveal should be understandable without relying only on motion.

When Stand Scan appears, the text should exist in real DOM text, not only inside an image.

The continue control should be reachable by keyboard.

Reduced-motion users should get a shortened reveal: zipper completes, Sticky Fingers appears with a single snap, Stand Scan appears, user continues.

The scene label should remain useful for screen readers. A live region can announce `Sticky Fingers Stand Scan unlocked` after the reveal begins.

## Quality Bar

The feature is not complete if it only adds a panel of text.

It is complete when the zipper interaction, Sticky Fingers entrance, ability explanation, and Bucciarati character meaning feel like one sequence.

A good version should make a new viewer understand why the zipper interaction exists. A great version should make a Bucciarati fan feel that the site understands the character.

## Acceptance Criteria

Successful zipper release on Bucciarati no longer advances immediately to Farewell. It enters the Stand reveal sequence.

Sticky Fingers appears as a purpose-built visual asset from the opened zipper space.

Stand Scan displays the Stand name, user, ability summary, and radar without Chinese text.

The reveal includes a short story/character return line connecting the ability to Bucciarati's rebellion.

The user can continue to the next scene after the reveal.

Replay resets the scene to the original Bucciarati state.

Previous, Next, and scene tabs clear the reveal state cleanly.

Desktop and mobile both align the Stand entrance with the tear direction.

Reduced-motion mode remains usable.

No new image asset causes obvious loading stutter during the reveal.

## Validation Plan

Manual visual validation:

- Desktop Bucciarati drag success.
- Mobile Bucciarati drag success.
- Desktop reveal readability.
- Mobile reveal readability.
- Replay during reveal.
- Next during reveal.
- Tab switch during reveal.
- Reduced-motion pass.

Automated validation:

- No JavaScript syntax errors.
- Successful zipper release produces a Stand reveal class before any scene change.
- Continue action moves from Bucciarati to Farewell.
- Replay clears reveal classes and returns to idle.
- Mobile viewport uses a reveal layout that does not overlap bottom tabs.

Visual screenshots should be captured at these points:

- Zipper drag before release.
- Stand entrance first beat.
- Full Sticky Fingers entrance.
- Stand Scan readable state.
- Character return state.
- Mobile Stand Scan state.

## Rollout Plan

Build only Bucciarati first.

Do not add Stand reveals to every character until Bucciarati passes quality review. This feature defines the grammar for the whole site, so the first scene must be strong enough to become the template.

After approval, the next candidates are Narancia and Mista because their interactions already map clearly to Stand mechanics.

Narancia can unlock Aerosmith Scan after three successful radar locks.

Mista can unlock Sex Pistols Scan after four bullet hits.

Abbacchio and Trish should come after the template is stable, because their reveals need more subtle character reading.

## Implementation Decisions

Autoplay off means the reveal waits for the user. Do not auto-advance after a timeout when autoplay is off.

The next scene should be minimally visible during the Stand entrance. Bucciarati and Sticky Fingers own the reveal moment.

The radar uses theater-specific axes with clear labels. The purpose is explanation, not stat reproduction.
