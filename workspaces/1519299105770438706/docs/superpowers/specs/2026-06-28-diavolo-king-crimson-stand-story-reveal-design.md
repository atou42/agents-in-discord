# Diavolo / King Crimson Stand Story Reveal Design

Date: 2026-06-28

Status: design spec

## Purpose

Upgrade the Diavolo scene from a short hold-to-skip transition into a playable explanation of King Crimson.

The current scene already asks the user to hold and release. That is the right gesture, but it only proves that time skipped. The next version should explain why the skip happened, what Diavolo saw before it happened, and why the line `No one escapes fate.` is both his threat and his eventual punishment.

This is not a generic time glitch. The experience must teach a specific rule: Epitaph previews a fated result, then King Crimson removes the process that would have led everyone else to that result. The user should feel the missing middle.

## Audience

New viewers should understand that Diavolo is the hidden Boss of Passione, that Doppio is tied to him through a concealed shared body, and that King Crimson does not simply stop time. It sees a result and deletes the lived path toward it.

Casual JoJo viewers should recognize the Doppio signal chain, the Boss reveal, Epitaph, the erased-time jump, and the move into Requiem without needing a wiki paragraph.

Deep Part 5 fans should feel that the scene respects Diavolo's paranoia, his obsession with erasing his past, his reliance on fate, and the irony that Gold Experience Requiem turns his own faith in results against him.

## Product Principle

The order is forecast first, deletion second, aftermath third, interpretation fourth.

Do not start with a Stand card. The user holds the scene. Epitaph exposes a fragment of the future result. The user releases. The middle is deleted. Only then does King Crimson appear and explain the rule.

The scene should make the ability legible without flattening it. King Crimson is confusing when it is described as teleporting, freezing, or fast-forwarding. The theater should avoid those shortcuts.

## Source Facts

Use these as the factual base for the first version.

- Diavolo is the main antagonist of Vento Aureo and the first Boss of Passione.
- His core obsession is hiding his identity and erasing all traces of his past.
- He tries to eliminate Trish because she can lead enemies to his identity.
- Diavolo and Vinegar Doppio are separate souls inhabiting the same body.
- Doppio believes he is Diavolo's loyal underboss and does not understand the full truth.
- Doppio can use Epitaph and parts of King Crimson when Diavolo grants him power.
- King Crimson is Diavolo's close-range humanoid Stand.
- King Crimson is physically powerful, fast, and lethal at short range.
- King Crimson can erase a frame of time up to about ten seconds.
- During erased time, only Diavolo remains fully conscious and can adjust his own course.
- Other people continue along the actions they would have taken, but they do not experience or remember the erased interval.
- When erased time ends, everyone else perceives only the aftermath.
- Diavolo and King Crimson cannot directly attack during erased time; he uses the deletion to avoid harm, reposition, and strike when time resumes.
- Epitaph is King Crimson's sub-Stand ability.
- Epitaph shows a future image, often as a result rather than a full chain of causes.
- Epitaph's forecast is fated unless another fate-affecting Stand ability changes it.
- Gold Experience Requiem can nullify King Crimson's ability by returning action and will to zero.

References checked:

- https://jojo.fandom.com/wiki/Diavolo
- https://jojo.fandom.com/wiki/King_Crimson
- https://jojo.fandom.com/wiki/Epitaph redirects to King Crimson
- https://jojo.fandom.com/wiki/Vinegar_Doppio

## Current Baseline

The scene key is `diavolo`. It shows the quote `No one escapes / fate.` with the caption `King Crimson`.

The current scene uses a hold interaction. `startDiavoloHold` starts when the active Diavolo stage receives a valid pointer press. It clears the auto timer, preloads the next scene, records the pointer and start time, adds `is-fate-holding`, then adds `is-fate-armed` after 520ms.

`finishDiavoloHold` checks whether the hold lasted at least 520ms. On success, it removes the holding classes, adds `is-fate-skip`, and advances to the next scene after 720ms. On failure or cancellation, it adds a short `is-fate-flicker`, then returns to the normal schedule.

This baseline has the right interaction seed but the wrong explanatory surface. It tells the user a skip happened, but it does not show that Diavolo predicted a result first or that the process was removed from everyone else's perception.

## Ability Reading

The scene must separate three ideas.

Epitaph is the result preview. It should feel like a fragment from a few seconds ahead has leaked into the current frame. The preview should be sharp enough to read, but incomplete enough to feel dangerous. It is not a full video of the future. It is a fated outcome image that can be misunderstood.

King Crimson is the process deletion. It should not show a slow-motion tunnel where Diavolo acts freely like a time-stop user. It should remove the middle frames. The user's hand releases, the scene drops events, and the stage resumes after the result has already landed.

Fate is the theme. Diavolo uses fate as proof that he deserves to remain at the apex, but his confidence becomes the trap that Requiem later breaks. The line `No one escapes fate.` should feel frightening in this scene and bitterly ironic as the theater moves into Requiem.

## Desired Experience

The user arrives from Doppio. The scene still carries a faint signal residue: a broken call tone, a small false phone glyph, or a half-visible Doppio silhouette in the background. This should not steal focus from Diavolo. It exists to show that the Boss has been hiding inside the previous scene.

The user presses and holds.

The current frame does not slow down. Instead, it starts losing trust. The artwork develops missing slices, clock hands jump without rotating, and a red forecast plate appears inside Diavolo's hairline or over King Crimson's forehead. This plate shows the result after the next few seconds, not the steps: a hand already through the frame, a character already displaced, or the next scene already cracked open by Requiem.

At the hold threshold, the scene becomes armed. The forecast locks. A countdown should feel implied but not literal. The user understands that a result has been selected.

When the user releases, the middle vanishes. The screen should not animate from start to finish. It should cut through several missing states: current pose, blank red void, aftermath pose. The quote fractures so that `No one escapes` remains before the release, while `fate.` lands after the skip.

King Crimson then appears in the aftermath, not during the deleted process. The Stand should feel like it was always behind the result. It should not fly in like a normal summoned hero. It should already be there when time resumes.

After the impact, the Stand Scan appears and explains the relationship between Epitaph and King Crimson in short lines. Then the character return layer reframes Diavolo: he deletes time because he cannot tolerate being seen, remembered, or exposed. The final beat points toward Requiem as the one result he cannot keep.

## Interaction Flow

The default flow has five states.

`idle`: the normal Diavolo scene. The quote is readable. Doppio residue may be present only if the user arrived from Doppio or replayed the Doppio-to-Diavolo chain.

`epitaph_hold`: the user is holding. The scene begins to show forecast fragments. Time is not slowed. Frames are missing. The user is being shown a result before the process.

`fate_armed`: the hold threshold is reached. The forecast locks and King Crimson's presence becomes undeniable. Releasing now will delete the middle.

`time_erased`: release succeeds. The visible process is removed. The scene jumps through a red void into an aftermath frame. This state should be short and hard.

`stand_scan`: King Crimson is visible and the ability explanation appears. The user can continue when ready.

`character_return`: the explanation turns from ability to character meaning, then offers the transition into Requiem.

A failed hold should not show a fake time erase. It should show an unstable Epitaph flicker that collapses before the result is locked.

Manual exit should be available in `stand_scan` and `character_return`. A click, tap, Enter key, or Next button should continue. Since autoplay is currently off by default, the default experience should wait for user action after the reveal. If autoplay is on, it may continue after the readable character-return beat.

Replay must restart from the original Diavolo scene. Previous, Next, and scene tabs must clear forecast fragments, timers, aftermath states, and any Doppio residue.

## Motion Direction

The motion should feel like editorial violence. The stage is not moving faster. The editor removed the evidence.

Suggested beat timing:

- 0.00s: pointer down, auto timer clears, Doppio residue dims.
- 0.12s: clock effects begin skipping discrete positions.
- 0.24s: first Epitaph image appears as a red forecast plate.
- 0.42s: forecast image becomes clearer, but still incomplete.
- 0.52s: hold threshold, `fate_armed`; the result locks.
- Release: current frame is cut out.
- Release + 0.05s: red void and stacked future silhouettes.
- Release + 0.16s: all middle silhouettes disappear.
- Release + 0.28s: aftermath frame lands.
- Release + 0.42s: King Crimson is already behind Diavolo.
- Release + 0.78s: Stand Scan becomes readable.
- Release + 2.60s: character return line becomes available.

The key is the missing transition. Do not tween Diavolo from one pose to another. Do not show him calmly walking through frozen time. Show traces of what would have happened, then remove those traces.

For reduced motion, use a shortened version: hold reveals one forecast image, release performs one hard cut to the aftermath, Stand Scan appears without layered flicker.

## Visual Design

King Crimson should be a purpose-built visual asset, not a generic red humanoid. It needs the recognizable flat crown, second face or Epitaph presence, slanted eyes, bared teeth, grid pattern, red body, pale facial areas, and close-range menace.

The Stand should feel too close to the viewer. It should occupy the same shallow space as Diavolo and the quote. A good pose is King Crimson half-behind Diavolo, one arm already past the foreground plane, as if the strike happened while the user was not allowed to see it.

The Epitaph forecast should look like a small image inside the scene, not a normal UI modal. It can appear on a hair-shaped mask, a forehead plate, or a jagged red prediction frame tied to King Crimson's smaller face.

Use deep crimson, black ink, pale yellow or bone-white facial marks, and small lime-green eye accents. Avoid making the whole scene a flat red filter. The red void should be brief. The readable scan should bring back contrast.

Avoid blue sci-fi HUD language. King Crimson should not look like a technology interface. The graphic system can be precise, but it should still feel like manga fate, blood, and missing film.

## Stand Entrance

King Crimson should not enter like Sticky Fingers. There is no door to open. The entrance is an aftermath reveal.

The recommended entrance:

- The hold shows only Epitaph and forecast fragments.
- The release deletes the process.
- The aftermath lands with Diavolo now repositioned or more dominant in the frame.
- King Crimson is already present behind him.
- A delayed punch scar, split quote, or displaced shadow tells the user something happened during the missing interval.

This preserves the rule that Diavolo cannot attack during erased time. The contact is staged as happening exactly when time resumes, while the preparation and repositioning were hidden inside the erased interval.

## Stand Scan

The Stand Scan should explain the two-part ability in a compact sequence.

Primary scan text:

`KING CRIMSON`

`Stand User: Diavolo`

`Sub-Stand: Epitaph`

Ability lines:

`Epitaph shows the result.`

`King Crimson erases the process.`

`Everyone else wakes up in the aftermath.`

Bridge line:

`That is why the scene skipped after your release.`

Canon guardrail line:

`Diavolo moves during the erased interval, then strikes when time resumes.`

The guardrail line can appear in a smaller inspect layer or second scan beat if the first scan feels crowded. It should exist somewhere in the reveal because it prevents the common misunderstanding that King Crimson is simply time stop.

## Ability Radar

The radar is a theater reading, not a canon Stand-stat reproduction. Label it as `Theater Reading` if needed.

Suggested axes:

- Future Result
- Process Deletion
- Close-Range Kill
- Identity Concealment
- Fate Backfire

The values should make a point. Future Result, Process Deletion, and Close-Range Kill are high. Identity Concealment is high because the ability and the character share the same obsession: remove the trace, leave only the result. Fate Backfire should be visible but unstable, because the next scene turns Diavolo's certainty against him.

Do not use a normal pentagon radar that implies all axes are neutral statistics. This should feel like an analysis sheet created by the theater.

## Key Event Fragments

The reveal can include short event shards after the scan, but they must be optional or very compact. They are there to help fans feel the story spine without burying new viewers.

Recommended shards:

- `Elevator: Trish is already gone.`
- `Sardinia: the face must not be found.`
- `Doppio: the Boss hides in the call.`
- `Polnareff: the stairs lose their steps.`
- `Requiem: the result stops arriving.`

The shards should appear like missing case files or torn forecast frames. They should not become a timeline lecture. Each shard should be clickable or tap-revealed only after the main Stand Scan is readable, or it should cycle slowly as background texture.

## Character Reading

The reveal should frame Diavolo through four ideas.

First, Diavolo does not merely want to win. He wants to exist without being known. His Stand's grammar mirrors that: remove the process, erase the witness, leave only the result.

Second, his idea of fate is authoritarian. `No one escapes fate.` means `No one escapes the result I have already seen.` It is a threat because he believes the forecast confirms his right to rule.

Third, Doppio is the human disguise that lets the Boss move through the world. The scene should show Doppio as residue, not as comic relief. His phone signal is tragic because he is both trusted and disposable.

Fourth, the line becomes ironic because Diavolo is eventually trapped by the very concept he worships. Requiem does not beat him by punching harder. It denies him the final result.

The scene should not present Diavolo as merely cool, mysterious, or red. The better reading is paranoid king, hidden criminal, perfect ambusher, and a man whose control fails at the level of fate.

## Content Design

All in-page UI text must be English or Japanese only. No Chinese appears in the final site UI.

Keep visible text short. The main reveal should stay under about 70 visible English words before optional inspect content.

Entrance and scan text:

`EPITAPH`

`A result appears first.`

`KING CRIMSON`

`Stand User: Diavolo`

`Epitaph shows the result.`

`King Crimson erases the process.`

`You remember only the aftermath.`

Character return text:

`Diavolo hides by cutting the path that would expose him.`

`No one escapes fate.`

`Not even the man who skips it.`

Continue text:

`Enter Requiem`

Optional Japanese accent text:

`時間は吹っ飛んだ`

`時は再び動き出す`

Do not use explanatory paragraphs in the main scene. Save longer explanation for an optional inspect mode or future lore layer.

## Asset Requirements

The first version needs at least five new visual assets.

King Crimson aftermath asset:

- Transparent WebP or PNG source.
- Half-body or three-quarter body.
- Strong silhouette behind or beside Diavolo.
- One arm or shoulder can cross the foreground plane.
- No embedded text.

Epitaph forecast asset:

- Small face or prediction plate tied to King Crimson's forehead or Diavolo's hairline.
- Must read at mobile size.
- Should support masked forecast imagery.

Forecast shard set:

- Three to five compact images or composable frames.
- Each frame shows a result without showing the full path.
- Should work as layered masks, not full-screen illustrations.

Aftermath scar asset:

- Punch tear, quote fracture, displaced shadow, or blood-red cut mark.
- Used to prove that contact occurred after time resumed.
- Must avoid excessive gore.

Stand Scan sheet:

- Textured analysis frame.
- Manga-paper and film-cut language, not sci-fi HUD.
- Supports radar and short text in real DOM.

Optional later assets:

- Doppio signal residue.
- Broken phone glyphs made from ordinary objects.
- Diavolo hidden-face silhouette.
- Requiem denial frame for the final transition.

If generated assets are used, keep prompts focused on original redraws and style compatibility. Do not use direct anime screenshots. Do not imitate a single supplied artist's exact style. The asset goal is coherent manga-theater redraw, not copyright mimicry.

## Information Architecture

The reveal should stay local to the Diavolo scene in the first implementation.

Add scene-local structured data rather than embedding all copy inside animation functions:

- `standName`
- `standUser`
- `subStandName`
- `standArt`
- `epitaphArt`
- `forecastShards`
- `aftermathArt`
- `abilityLines`
- `guardrailLine`
- `storyFragments`
- `storyReveal`
- `radarValues`
- `continueLabel`

The same structure should later support Requiem, but Diavolo needs one extra concept: a forecast phase before the reveal phase.

## State Model

Add explicit reveal states. Do not use `is-fate-skip` alone to mean every Diavolo state.

Suggested states:

- `idle`
- `epitaph_holding`
- `epitaph_flicker`
- `fate_armed`
- `time_erasing`
- `aftermath_landed`
- `stand_scan`
- `character_return`
- `continuing`

Cleanup is a quality requirement. Leaving the scene, replaying, pressing Previous, pressing Next, selecting a tab, losing pointer capture, or cancelling the pointer must remove all reveal classes, forecast images, timers, suppressed-click windows, temporary inline styles, and pending auto-advance callbacks.

## Transition Rules

Before the user holds long enough, do not show King Crimson fully. Epitaph can leak early, but the Stand reveal is earned by a successful release.

On successful release, do not immediately call `setScene(current + 1)`. Hold the Diavolo scene in the aftermath state, show King Crimson, then show the scan and character return.

The final transition into Requiem should feel like Diavolo's control breaking. The next scene can begin by denying the expected result: the `Enter Requiem` action starts a normal forward transition, but a zeroing pulse interrupts the clean King Crimson exit.

Do not let the time-erased void become the main visual. It is a cut, not a room.

## Mobile Requirements

Mobile must use the same conceptual sequence with fewer simultaneous layers.

The hold target should remain the whole active scene, excluding controls. The hold threshold can stay near the current 520ms if testing shows it feels intentional on touch.

Epitaph should appear near the upper third or attached to Diavolo/King Crimson, not beneath the bottom tabs. The forecast image must be readable on a 390px wide viewport.

The Stand Scan should occupy a lower or center band with a fixed maximum height. It must not cover the bottom navigation permanently. Touch targets for continue must be at least 44px high.

On mobile, use one forecast shard at a time. Avoid stacking several translucent future poses over small text.

The time-erased cut should be short enough that it feels deliberate and not like a rendering failure.

## Performance Requirements

The reveal adds assets, but it must not slow the first page load.

Preload Diavolo reveal assets only when the user is on or near Doppio or Diavolo. Doppio is the right time to warm King Crimson because the story already points at the Boss.

Use WebP for large raster assets. Keep large reveal images optimized before runtime.

Prefer transform, opacity, clip-path, mask-image, and CSS variables. Avoid layout-heavy animation during hold and release.

Do not add video for the first version unless the file size remains practical and the timing can still be controlled by the hold/release state.

## Accessibility

The reveal must be understandable without relying only on motion.

The Stand Scan text must be real DOM text. The forecast and aftermath can be visual, but the ability explanation cannot be trapped in an image.

A live region can announce `King Crimson Stand Scan unlocked` after the aftermath lands.

Keyboard users should be able to trigger the hold equivalent with Space or Enter on the active stage, release to erase time, then continue from the scan.

Reduced-motion users should receive the same story beats with hard cuts and static states.

Failure state should not be conveyed only through a red flash. It should also collapse the forecast plate or change the text state so the user can tell the hold did not arm.

## Quality Bar

The feature is not complete if it only adds red filters, clock glitches, or a text card.

It is complete when a new viewer can explain the difference between Epitaph and King Crimson after playing the interaction once: first the result is shown, then the process is removed, then everyone wakes up after the missing interval.

A good version should make the hold/release gesture feel like choosing the moment to cut time. A great version should make the move into Requiem feel inevitable and cruel: Diavolo believes only results matter, then loses the ability to reach any result at all.

## Acceptance Criteria

Successful hold and release on Diavolo no longer advances immediately to Requiem.

Holding first reveals an Epitaph forecast, not the full King Crimson reveal.

The forecast shows a result or aftermath image, not a full future animation.

Releasing after the threshold creates a visible missing-middle cut.

The scene lands in an aftermath state before the Stand Scan appears.

King Crimson appears as a purpose-built visual asset after the erased interval.

Stand Scan displays the Stand name, user, Epitaph relationship, ability summary, and Theater Reading radar without Chinese text.

The reveal includes a short character return line connecting time deletion to Diavolo's hidden identity and fear of exposure.

The reveal makes `No one escapes fate.` read as both threat and irony.

The user can continue to Requiem after the reveal.

Replay resets the scene to the original Diavolo state.

Previous, Next, scene tabs, pointer cancel, and failed hold clear the reveal state cleanly.

Desktop and mobile both keep forecast, scan, controls, and quote readable.

Reduced-motion mode remains usable.

No new reveal asset causes obvious loading stutter.

## Validation Plan

Manual visual validation:

- Desktop Diavolo failed short hold.
- Desktop Diavolo successful hold and release.
- Desktop forecast readability before release.
- Desktop missing-middle cut on release.
- Desktop King Crimson aftermath reveal.
- Desktop Stand Scan readability.
- Desktop character return into Requiem.
- Mobile failed short hold.
- Mobile successful hold and release.
- Mobile scan readability above controls.
- Replay during each reveal state.
- Previous during each reveal state.
- Next during each reveal state.
- Tab switch during each reveal state.
- Reduced-motion pass.

Automated validation:

- No JavaScript syntax errors after implementation.
- Successful hold produces an Epitaph state before any time-erased state.
- Successful release produces an aftermath state before any scene change.
- Continue action moves from Diavolo to Requiem.
- Failed hold never unlocks Stand Scan.
- Replay clears all Diavolo reveal classes and returns to idle.
- Mobile viewport has no horizontal overflow.

Visual screenshots should be captured at these points:

- Original Diavolo scene.
- Epitaph forecast during hold.
- Fate armed state.
- Time-erased cut.
- Aftermath with King Crimson visible.
- Stand Scan readable state.
- Character return state.
- Mobile Stand Scan state.

## Implementation Decisions

Autoplay off means the reveal waits for the user. Do not auto-advance after a timeout when autoplay is off.

The next scene should be preloaded but not visually dominant during the Diavolo reveal. Requiem can be hinted only at the character-return beat.

The time erase should be represented as removed evidence, not as a place Diavolo walks through.

The radar uses theater-specific axes with clear labels. The purpose is explanation, not canon stat reproduction.

Build this reveal after the Bucciarati Stand reveal pattern is stable, but keep Diavolo's forecast phase separate. King Crimson needs the extra step because Epitaph is part of the user's understanding.
