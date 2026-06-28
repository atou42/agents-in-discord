# Abbacchio Moody Blues Stand Story Reveal Design

Date: 2026-06-28

Status: implementation-ready design draft

## Purpose

Upgrade the Abbacchio truth scene from a horizontal scrub into a playable Moody Blues investigation.

The current interaction already has the right hand feel: the user drags across the scene, ghost frames lag behind the artwork, and the quote resolves when the scrub crosses a threshold. The next version should make that gesture legible as Moody Blues itself. The user is not moving a slider. The user is searching a recorded past until the signal becomes stable enough to testify.

This reveal is not a character card, a lore drawer, or a detective dashboard. It is a memorial investigation. The truth is recovered through play, Moody Blues explains why recovery works, and Abbacchio's story gives the recovered truth its weight.

## Audience

The scene must serve three audiences at once.

New viewers should understand that Leone Abbacchio is an ex-police officer in Bucciarati's team, that Moody Blues replays past actions at a chosen time and place, and that `This is the truth.` belongs to a final investigation rather than a generic cool line.

Casual JoJo viewers should recognize the replay mechanic, the tape-like controls, the Sardinia investigation, the risk of leaving Moody Blues exposed, and the final clue without needing a long recap.

Abbacchio fans should feel his bitterness, discipline, guilt, and loyalty to the mission. The scene should not reduce him to a useful tool. It should show why a Stand that forces the past to replay belongs to a man who cannot stop carrying the past.

## Product Principle

The order is search first, replay second, truth third.

The user should not read the answer before working for it. The scrub creates the search. The locked playback creates the proof. Moody Blues appears because the user stabilized a memory. The scan explains the Stand only after the user has felt the Stand's behavior. The character return explains why Abbacchio's final act matters after the ability has already made sense.

The emotional rule is restraint. The site can be dramatic, but Abbacchio should not get a heroic speech. Let the evidence speak first.

## Source Facts

Use these facts as guardrails for the first implementation.

- Leone Abbacchio is an ex-police officer, a member of Passione, and part of Bucciarati's team.
- He originally joined the police to protect citizens, but corruption and bribery broke his faith in justice.
- His partner died saving him after Abbacchio hesitated over a criminal who had bribed him.
- After losing his position and purpose, he joined Passione and found direction under Bruno Bucciarati.
- He is serious, bitter, mission-focused, suspicious of Giorno early on, and willing to sacrifice himself to complete an objective.
- Moody Blues is Abbacchio's humanoid Stand.
- Moody Blues can transform into a target person and replay that person's past actions and speech at a chosen time and place.
- The replay can be paused, rewound, and fast-forwarded like a recording.
- Moody Blues has a forehead timer, cassette-speaker-like eyes and body details, and an active VHS-static effect in the anime.
- Moody Blues is vulnerable while rebroadcasting because it cannot attack during that state.
- On Sardinia, Abbacchio uses Moody Blues to investigate Diavolo's past. Diavolo kills him while disguised, but Abbacchio leaves behind a stone imprint of the Boss's face and fingerprints through Moody Blues.
- His final clue lets the team continue toward the Boss.

References checked with fandom CLI:

- https://jojo.fandom.com/wiki/Leone_Abbacchio
- https://jojo.fandom.com/wiki/Moody_Blues

## Current Baseline

The scene key is `abbacchio`. It uses tab `Truth`, class `scene-memory`, caption `Final Replay`, art `assets/generated/optimized/abbacchio-truth.webp`, and quote text `This is / the truth.`

The code currently adds a `memory-scrub-ghost` layer for this scene. `startMemoryScrub` captures the pointer, stores the start X position, resets `--memory-progress` and `--memory-delta`, and adds `is-memory-scrubbing`. `updateMemoryScrub` maps horizontal distance to progress and moves the delayed ghost layer through `--memory-delta`. `finishMemoryScrub` treats progress at or above `.58` as success, adds `is-memory-found` and `is-memory-transition`, sets progress to `1`, preloads the next scene, then advances to Trish after about `960ms`.

The new work should preserve the horizontal scrub, ghost lag, progress threshold, and failure snapback. The important change is that success no longer calls `setScene(current + 1)` immediately. Success locks the truth and begins a Moody Blues reveal.

## Desired Experience

The active Abbacchio frame begins quiet. The quote is readable, clocks drift in the background, and the image has a faint tape texture. The scene should invite scrubbing without using instructional copy as the main experience.

When the user presses and drags left or right, the artwork starts behaving like damaged evidence. Abbacchio's image creates delayed frames. Clock ticks step instead of flow. Tape noise, frame numbers, and partial words skim across the surface. At low progress, nothing is certain. At mid progress, the scene feels close to a preserved memory but still unstable.

Near the success zone, Moody Blues should begin to appear as a pale replay body inside the ghost layer. The viewer should sense that the Stand is not arriving from outside the scene. It is being rewound into the present by the user's scrub.

On successful release, the playback freezes. The quote locks into a stronger arrangement: `THIS IS THE TRUTH`. The clocks stop. The ghost frames align. A timer flashes first, then speaker-eye details, then the humanoid Moody Blues body resolves from static. For one short beat, the Stand transforms into an anonymous replay target, then returns to its own body. This is the playable explanation: Moody Blues becomes the past, then returns as proof.

After the entrance, the scene shifts into a compact Stand Scan. The scan names Moody Blues, names Abbacchio, explains replay, control, and vulnerability, then connects the user's scrub to the ability. The final character layer returns to Abbacchio and the stone clue. It should leave the user with the idea that he still reached truth, even after believing he had lost justice.

## Interaction Flow

The default flow has eight states.

`idle`: Abbacchio scene is active. Quote, clocks, and subtle tape texture are visible. No Stand Scan is present.

`memory_scrubbing`: The user drags horizontally. The image shows delayed ghost frames, frame ticks, and a moving memory band. Progress is visible through the art, not through a normal UI slider.

`unstable_replay`: At partial progress, fragments appear but do not resolve. Moody Blues can be hinted as a pale overlay, but no readable scan text appears.

`truth_locked`: On release past the success threshold, scrub input ends, playback freezes, the quote locks, and the scene stays on Abbacchio.

`stand_entering`: Moody Blues rewinds into view through timer, speaker detail, body, static, and transformation beats.

`stand_scan`: Stand name, user name, ability lines, evidence recorder, and radar become readable.

`character_return`: The scan recedes enough for Abbacchio and the final clue to own the frame. The line connects his lost justice to the truth he leaves behind.

`continue_ready`: Click, tap, Enter, Space, Next, or the Trish tab continues to the next scene. If autoplay is enabled, auto-advance may happen only after the scan and character return have both been readable.

Replay restarts from the untouched Abbacchio scene. Previous, Next, tab selection, resize, and scene rebuild clear scrub state, timers, temporary fragments, reveal classes, and inline memory properties.

## Motion Direction

The motion language is analog evidence, not magic time travel.

Use tape scanlines, clock-step cuts, frame duplication, timestamp jumps, hard pause locks, VHS-like static, and brief transform silhouettes. Avoid soft glow, floating particles, mystery fog, neon detective-board lines, or generic sci-fi HUD animation.

Suggested timing after successful release:

- `0.00s`: scrub accepted, input releases, playback freezes.
- `0.12s`: clocks stop and tape noise spikes.
- `0.28s`: foreground quote snaps into `THIS IS THE TRUTH`.
- `0.42s`: Moody Blues forehead timer appears inside the ghost layer.
- `0.70s`: speaker-eye and hand details flicker in.
- `1.02s`: body silhouette resolves from static.
- `1.28s`: silhouette briefly transforms into the replay target.
- `1.52s`: evidence imprint flashes as a stone stamp.
- `1.85s`: Moody Blues returns to its body and locks beside or behind Abbacchio.
- `2.20s`: Stand Scan becomes readable.
- `4.20s` or user action: character return line becomes available.

The reveal should feel patient, but not slow. A user who scrubs successfully should have readable scan text within about `2.2s` to `2.8s`.

## Visual Design

Moody Blues should be a purpose-built asset, not a generic ghost, silhouette, or copied screenshot. It needs the visual facts that make the Stand instantly understandable: forehead timer, speaker-eye motif, speaker details on shoulders or hands, pale body surface, purple-gray static, and a height close to Abbacchio.

The palette can use violet, ash, cream, black ink, cold teal, and small red timestamp accents. It should not become a blue police dashboard. The scene still belongs to the current manga-theater site: paper texture, ink mass, hard masks, dramatic typography, and controlled color.

The evidence layer can include stamped time codes, frame numbers, an uneven replay rail, and a stone imprint. These elements should read as memory playback and forensic proof, not as a normal video player.

The stone clue should be clear enough to explain the story, but not so literal that it becomes a spoiler image dominating the page. The right form is an abstract stone impression with a face/fingerprint trace and one short scan line: `He left the Boss's face behind.`

## Stand Scan

All in-page text must be English or Japanese only. No Chinese appears in final UI.

Primary labels:

`MOODY BLUES`

`Stand User: Leone Abbacchio`

Ability lines:

`Replays a person's past actions at a chosen time and place.`

`Can pause, rewind, and fast-forward the recovered movement.`

`While replaying, the Stand is exposed.`

Bridge line:

`That is why you scrubbed the scene for the truth.`

Evidence line:

`He left the Boss's face behind.`

Character return line:

`He thought he had lost justice. His final replay still reached it.`

Quote echo:

`This is the truth.`

Keep the first version under about 65 visible English words during the reveal. Longer lore belongs in a later optional inspect mode, not in the default flow.

## Ability Radar

The radar should look like an evidence recorder, not a combat stat screen. It can use five axes:

- Replay Precision
- Time Reach
- Investigation Value
- Exposure Risk
- Truth Resolve

`Truth Resolve` is a theater-reading axis, not an official Stand stat. If the shared Stand Scan component needs a label, use `Theater Reading` near the radar group rather than pretending these are canon parameters.

The radar must not imply Moody Blues is a strong direct attacker while rebroadcasting. The scan should communicate the tradeoff clearly: the replay is powerful because it is precise, and dangerous because the Stand is exposed.

## Character Reading

Abbacchio is not simply the detective of the team. He is a man who once wanted justice, compromised, watched his partner die, and decided that only mission discipline still had value.

The reveal should hold that contradiction without smoothing it out. He is severe because failed ideals cost him everything. He distrusts Giorno because faith in a new dream feels cheap to him. He follows Bucciarati because Bucciarati gives him a way to act with purpose again. Moody Blues does not create a future. It forces the past to testify.

The final emotional turn should be quiet: Abbacchio does not need to say he is redeemed. The recovered truth does the speaking.

## Key Event Fragments

Fragments may appear during scrubbing as replay slices. They should feel like evidence flashes, not biography cards.

- `Former officer`
- `Partner lost`
- `Mission first`
- `Sardinia replay`
- `Final imprint`

Avoid a full death recap in the first version. New viewers need the meaning of the scene, not every plot detail. Fans will recognize the clues.

## Asset Requirements

The first implementation needs these assets:

- Moody Blues full or three-quarter body, transparent WebP, readable at mobile size, with timer and speaker motifs visible.
- Moody Blues timer or speaker detail, transparent WebP or SVG-like raster, used for the first entrance beat.
- Evidence imprint asset, stone texture with abstract face and fingerprint trace.
- Tape replay overlay, CSS/SVG or small optimized texture, usable as repeated scanline and frame noise.
- Replay target silhouette, simple transform-compatible shape or raster, used briefly during the rebroadcast beat.

Optional later assets:

- Abbacchio police flashback silhouette.
- Empty tape strip with frame windows.
- Moody Blues transformation overlay variants.
- Stone imprint close-up for inspect mode.

Generated assets must be original redraws compatible with the current site. Do not use anime screenshots. Do not imitate one artist exactly. The goal is coherent manga-theater redraw with the right motifs.

## Information Architecture

Add scene-local structured data before building the reveal UI. The Abbacchio scene should be able to describe its reveal without hardcoding text inside animation functions.

Suggested fields:

- `standName`
- `standUser`
- `standArt`
- `standDetailArt`
- `evidenceArt`
- `abilityLines`
- `bridgeLine`
- `evidenceLine`
- `storyReveal`
- `eventFragments`
- `radarValues`
- `continueLabel`
- `reducedMotionSummary`

The reveal text should be real DOM text. Do not bake important explanation into image assets.

## Implementation Decisions

Keep the existing horizontal scrub as the primary gesture. Do not replace it with a visible slider, normal video control, or tap-only reveal.

Use the current `.58` success threshold on desktop for the first version. On coarse pointer screens, widen effective success by lowering the threshold to about `.48` or by increasing progress gain. The user should not need precision scrubbing on mobile.

Change `finishMemoryScrub` so a found memory enters `truth_locked` instead of calling `setScene(current + 1)`. Trish can still preload, but it must not visually take over before Abbacchio's reveal completes.

Keep `is-memory-found` as the class that means the truth has locked. Add separate classes for the reveal states, such as `is-memory-truth-locked`, `is-moody-entering`, `is-moody-scan`, `is-moody-character`, and `is-memory-continue-ready`. Do not make `is-memory-found` carry the entire reveal.

Render the Moody Blues scan from structured scene data. The same renderer can later support Mista, Doppio, Trish, and others, but the Abbacchio implementation should stay scene-local until the interaction feels right.

Continuation is explicit. In `stand_scan`, `character_return`, and `continue_ready`, click, tap, Enter, Space, Next, and the Trish tab may continue. Scrub gestures should be ignored after `truth_locked` until Replay resets the scene.

Cleanup must be centralized in `resetMemoryInteraction`. It should clear all memory and Moody Blues classes, all timers, all temporary evidence fragments, all generated replay DOM, `--memory-progress`, and `--memory-delta`.

## Transition Rules

Before successful release, do not show the Stand Scan.

After successful release, do not immediately advance to Trish.

During Stand Scan, Abbacchio and Moody Blues own the scene. Trish may be preloaded offscreen only.

The final continuation can use a replay wipe: the evidence strip closes, the clock restarts, the frame steps forward, and Trish enters as the next living voice after the recorded truth.

## Mobile Requirements

Mobile keeps horizontal scrubbing because the gesture already matches replay search. The target band must be forgiving, and the feedback must strengthen earlier than desktop.

The reveal layout should use a central vertical stack: quote lock, Moody Blues body, compact scan strip, continue control. Avoid tiny evidence labels near the bottom carousel.

The continue target must be at least `44px` tall. Bottom navigation remains usable. Text must fit on a `390px` wide viewport without overlapping the art or tabs.

Reduced-motion users get a shortened sequence: scrub success, truth lock, Moody Blues snap-in, Stand Scan, continue. The meaning must remain complete without frame stepping or static animation.

## Performance Requirements

Do not eagerly load all future Stand assets. Preload Abbacchio reveal assets when the user is on Fugo or when the Abbacchio scene first becomes adjacent.

Prefer WebP for raster assets. Use transforms, opacity, clipping, and sprite-frame swaps for motion. Tape noise should be CSS/SVG or a small optimized texture, not a heavy video.

Avoid filter-heavy blur stacks during scrubbing. The scrub must stay responsive because the user's hand is driving the meaning of the scene.

Generated replay fragments should be bounded and reusable. Do not append unbounded DOM nodes on every pointer move.

## Accessibility

The reveal must be understandable without audio or motion.

The active Abbacchio stage should expose a concise action label such as `Scrub to replay the memory`. When scrub progress locks, announce `Truth found`. When the scan appears, announce `Moody Blues Stand Scan unlocked`.

Keyboard users need a path to trigger the reveal. A focused quote or stage action can use ArrowLeft and ArrowRight to build memory progress, then Enter or Space to lock when the threshold is reached. Enter or Space also continues after the scan.

Screen-reader text should summarize the scan in normal language: `Moody Blues replays a person's past actions at a chosen time and place. While replaying, it is exposed.`

Reduced-motion mode should not hide essential story beats. It should compress animation, not remove explanation.

## Acceptance Criteria

The Abbacchio scene still starts from the current quote and art, and the user can still scrub horizontally with visible ghost-frame feedback.

A failed scrub snaps back cleanly, clears temporary playback effects, and does not reveal Moody Blues.

A successful scrub locks `This is the truth.` and does not advance to Trish within the old `960ms` transition.

Moody Blues appears only after the successful scrub, with timer/speaker/static visual motifs visible.

The Stand Scan explains replay, time/place targeting, playback controls, and exposure risk in short English or Japanese text.

The final character line connects Abbacchio's lost justice to the final clue without becoming a biography panel.

Replay, Previous, Next, tab selection, resize, and scene rebuild clear all reveal state and return the scene to a consistent starting point.

Mobile users can complete the scrub without precise targeting, can read the scan above the bottom navigation, and can continue through a `44px` or larger target.

Reduced-motion users receive the same information and continuation controls with shortened animation.

No important explanation is embedded only in images. Real DOM text is used for scan labels, ability lines, announcements, and controls.

## Validation Plan

Verify the normal path on desktop: open Abbacchio, scrub below threshold, confirm snapback, scrub above threshold, confirm truth lock, Moody Blues entrance, Stand Scan, character return, then continue to Trish.

Verify navigation cleanup: unlock the reveal, then use Replay, Previous, Next, and a scene tab. Each route must remove reveal state and prevent stale timers from advancing later.

Verify mobile behavior at a narrow viewport around `390px`: scrub success should not require precision, scan text must not overlap bottom navigation, and continue must be easy to tap.

Verify keyboard behavior: focus the stage or quote, build progress, lock truth, read scan, continue with Enter or Space.

Verify reduced-motion behavior: the scene still communicates search, replay, truth, Stand ability, exposure risk, and continuation without relying on long motion.

Verify performance during scrubbing: pointer movement stays responsive, no unbounded replay fragments are appended, and no heavy video or filter stack is introduced.
