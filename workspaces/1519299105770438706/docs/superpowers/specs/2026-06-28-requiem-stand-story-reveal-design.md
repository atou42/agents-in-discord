# Requiem Stand Story Reveal Design

Date: 2026-06-28

Status: draft for review

## Purpose

Upgrade the Requiem scene from a clean reset transition into a playable explanation of Gold Experience Requiem.

The current scene already has the correct seed: the user taps `This is / Requiem.`, the scene collapses toward zero, and the theater returns to Giorno. The next version should make the rule legible before the loop happens. Requiem is not a normal final flash. It is a power that prevents action, will, and outcome from arriving at reality.

The design goal is to let new viewers understand why Diavolo's certainty breaks. He can see or pursue a result, but the result never becomes real. Deep fans should feel the specific horror of `return to zero`: not defeat by stronger force, but denial of completion.

## Audience

New viewers should understand that Giorno's Stand has evolved into Gold Experience Requiem, that its core ability is returning actions and willpower to zero, and that Diavolo is punished by being unable to reach the truth of death.

Casual JoJo viewers should recognize the final contrast between King Crimson and Gold Experience Requiem. King Crimson erases time so Diavolo can keep the result he wants. Gold Experience Requiem cancels the route to the result itself.

Giorno and Requiem fans should feel that the scene respects the eerie calm of the climax. The Stand should feel absolute, quiet, and judgmental. It should not feel like a bigger punch, a magic shield, or a generic golden explosion.

## Product Principle

The order is rule first, explanation second, judgment third.

The user should see a result fail before reading about the rule. The first visible idea is not `Requiem is powerful`. The first visible idea is `the result did not happen`.

The scene should create fear through missing completion. Motion begins, causality lines connect, a result label becomes almost readable, and then everything returns to the starting state. Only after the user has witnessed that denial should the Stand Scan explain Gold Experience Requiem.

## Source Facts

Use these as the factual base for the first version.

- Giorno Giovanna is the protagonist of *Vento Aureo* and a natural-born Stand user.
- Giorno's original Stand is Gold Experience, which creates and manipulates life.
- Gold Experience Requiem is the evolved Requiem form created when Gold Experience is pierced by the Stand Arrow during the climax.
- Gold Experience Requiem retains and greatly empowers Gold Experience's life-giving ability.
- Gold Experience Requiem can act and speak in erased time, even where only Diavolo and King Crimson would normally operate.
- Its ultimate ability is Return to Zero: it reverts actions and willpower to zero, nullifying them before they become real.
- This ability directly opposes King Crimson. King Crimson erases the process and leaves the result; Gold Experience Requiem prevents the effect from reaching reality.
- An opponent killed by Gold Experience Requiem never reaches the truth of their death and is forced into an eternal death loop.
- Diavolo is the Boss of Passione, obsessed with secrecy, superiority, and erasing traces of his past.
- Diavolo's King Crimson can erase up to about 10 seconds of time and predict events with Epitaph.
- Diavolo's final punishment is poetic because the man who manipulated reality and results is trapped where no result can arrive.

References checked:

- https://jojo.fandom.com/wiki/Giorno_Giovanna
- https://jojo.fandom.com/wiki/Gold_Experience_Requiem
- https://jojo.fandom.com/wiki/Diavolo

## Current Baseline

The scene key is `requiem`. It shows the quote `This is / Requiem.`, uses the tab label `Requiem`, the class `scene-requiem`, the caption `Return to Zero`, and the art `assets/generated/optimized/requiem-loop.webp`.

The scene currently uses circular zero-loop visuals, speed layers, clock layers, and the classes `is-requiem-reset` and `is-requiem-transition`.

Clicking the quote calls `handleRequiemTap`. It clears the autoplay timer, preloads scene `0`, adds `is-requiem-reset` and `is-requiem-transition`, suppresses clicks briefly, and calls `setScene(0)` after about 1120ms.

`resetRequiemInteraction` only clears one timer and removes the two Requiem classes. The current implementation is clean, but it treats Requiem as a scene exit. The next version should keep the loop-to-Giorno idea while adding a readable Requiem rule sequence before the exit.

## Desired Experience

The user reaches Diavolo, holds through the time-skip scene, and arrives at Requiem.

The Requiem scene looks almost still at first. The quote is readable. The clocks and circular marks move, but they feel restrained.

The user taps the quote. A result begins to form.

Diavolo's action is represented without showing a full spoiler recap: a crimson future line, a hand-shaped strike trace, a broken clock wedge, and a small label like `RESULT`. The line advances toward completion. The stage shows cause, path, and effect aligning.

Just before the result completes, Gold Experience Requiem appears and the path is returned to zero. The progress does not reverse like a rewind tape. It is denied. The cause remains visible for a moment, but the effect vanishes as if it never gained permission to exist.

The scene repeats this denial three times, each time with less drama and more dread:

First denial: the visible attack does not land.

Second denial: Diavolo's prediction cannot lock.

Third denial: the word `truth` nearly appears, then breaks back to `zero`.

After the third denial, the scene shifts into Gold Experience Requiem Scan. The scan explains the rule in short lines. Then the final judgment layer appears: Diavolo does not simply lose. He is placed in a loop where he never reaches the truth of death.

The scene then offers a clean return to Giorno's opening dream. This should feel like the theater itself has been returned to its origin.

## Interaction Flow

The default flow has seven states.

`zero_idle`: the existing Requiem scene idles with restrained circular motion. No explanatory copy is visible.

`cause_started`: triggered by tapping the quote. A crimson Diavolo/King Crimson action trace begins and moves toward `RESULT`.

`zero_denial_1`: Gold Experience Requiem cancels the first action. The path collapses to a small `0` mark.

`zero_denial_2`: Epitaph-like prediction marks try to form a future frame. They fail before locking.

`zero_denial_3`: the word `truth` or a result seal approaches completion, then returns to zero.

`stand_scan`: the Stand name, user, ability summary, and rule diagram become readable.

`judgment_loop`: the scene shows the eternal punishment in symbolic form, then allows or triggers the return to Giorno.

Manual continue should be available in `stand_scan` and `judgment_loop`. A click, tap, Enter key, or Next button should continue. If autoplay is off, the default should wait after `judgment_loop` until the user advances. If autoplay is on, the scene may return to Giorno only after the scan and judgment line have both been readable.

Replay must restart from `zero_idle`, not from the scan or judgment state.

Previous, Next, and scene tabs must always work and must clear all Requiem reveal states, timers, temporary result marks, and inline styles.

## Rule Demonstration

The rule should be shown as a causality diagram, not a lore card.

A simple visual model is enough:

`CAUSE -> PATH -> RESULT`

When Requiem acts, the diagram becomes:

`CAUSE -> 0`

The `RESULT` node should not explode. It should fail to become solid. This is the important feeling: the result is not destroyed after arrival; it is prevented from arriving.

The scene should avoid showing Requiem as simply faster than King Crimson. The point is not `GER dodged the hit`. The point is `the hit never reached reality`.

The first implementation can use three concrete denials:

- A strike line reaches Giorno, then is unmade before contact.
- A future-frame rectangle tries to close, then opens back to empty paper.
- A result counter reaches `99%`, then snaps to `0%` without ever showing `100%`.

The counter should be used sparingly. It is a teaching device for new viewers, not a sci-fi HUD. The manga-theater look should stay dominant.

## Motion Direction

The motion should feel absolute, quiet, and wrong.

Use interrupted completion, missing frames, hard cuts to stillness, clock wedges collapsing inward, ink paths losing their end point, and small text that fails to finish. Avoid victory flashes, long golden beams, soft glow, floating orbs, and generic divine light.

Suggested timing from quote tap to readable scan:

- 0.00s: quote tap accepted, autoplay timer clears.
- 0.10s: crimson cause line appears from the Diavolo side of the frame.
- 0.38s: `RESULT` begins to form at the endpoint.
- 0.62s: Gold Experience Requiem silhouette appears behind the result, not in front of it.
- 0.78s: first denial returns the endpoint to `0`.
- 1.08s: prediction frame tries to close around Giorno and the quote.
- 1.34s: second denial empties the prediction frame.
- 1.70s: `truth` begins to appear in broken typography.
- 2.05s: third denial collapses it to `zero`.
- 2.42s: GER locks into a calm readable pose.
- 2.80s: Gold Experience Requiem Scan becomes readable.
- 5.20s or later: judgment line appears.
- 7.20s or later: return-to-Giorno can happen if autoplay is on.

On mobile, reduce the sequence to one full denial and two short echo denials if the full three-part version feels crowded. The rule still needs to be clear: an action starts, a result almost arrives, zero prevents arrival.

Reduced motion should replace repeated collapses with static step frames: `Action`, `Denied`, `Zero`, `Scan`, `Loop`.

## Visual Design

Gold Experience Requiem should be a new or upgraded purpose-built asset. It should be readable as an evolved Gold Experience without relying on direct anime screenshots. The asset should emphasize the crown-like head, hollow/halo-like back shape, cross-structured eyes, chest heart shape, ladybug motifs, and ivory-gold body language.

The Stand should not be lit like a superhero. It should feel like a verdict appearing inside the scene. It can be pale ivory, muted gold, black ink, controlled green, and small red accents from Diavolo's failed path.

Diavolo should be present mostly as traces, not as a full explanatory villain cutscene. Crimson lines, a King Crimson silhouette fragment, a predicted frame, or a hand-shaped attack path are enough. The viewer should understand that an enemy result is being denied without needing the whole finale explained.

The existing circular zero-loop motif can stay, but it should become functional. Rings should mark failed completion, not decorate the background.

The judgment loop should be symbolic and restrained. Use repeated doors, broken street frames, hospital/river/stair silhouettes, or falling panels as abstract death-loop icons. Avoid gore. Avoid showing too many specific deaths. The point is eternal non-arrival, not shock imagery.

## Content Design

All in-page text must be English or Japanese only. No Chinese appears in the final site UI.

The first version should use short text.

Stand entrance text:

`GOLD EXPERIENCE REQUIEM`

`Stand User: Giorno Giovanna`

Rule lines:

`Actions and will return to zero.`

`The result never becomes real.`

`Even King Crimson cannot reach the truth.`

Bridge line:

`That is why the scene refuses to complete.`

Judgment line:

`Diavolo dies, but never arrives at death.`

Optional softer line for lower-spoiler mode:

`The Boss is trapped before the ending can arrive.`

Quote echo:

`This is Requiem.`

`You will never reach the truth.`

Do not overload the first version with more than about 60 visible English words in the reveal. Longer lore can come later through an optional inspect mode.

## Spoiler Discipline

This scene is inherently close to the ending, but the design should still avoid turning into a full plot summary.

The primary reveal may say that Gold Experience Requiem returns actions and will to zero. It may say that Diavolo cannot reach the truth. It may imply the death loop through symbolic repeated endings.

The primary reveal should not explain every step of the Arrow chase, Chariot Requiem, the soul swap, Polnareff's role, or the full sequence of Diavolo's deaths. Those belong in a later inspect mode if the project adds one.

For new viewers, the scene should answer one question: why is Requiem terrifying? The answer is that it does not let the enemy's result happen.

## Character Reading

The reveal should frame Giorno through three ideas.

First, Giorno's dream is not only ambition. He wants to take over Passione to stop the damage caused by its drug trade and corruption.

Second, Giorno wins through resolve and moral direction, not only through raw force. Gold Experience Requiem should feel like his will reaching a form that can protect the dream from Diavolo's manipulation of reality.

Third, the judgment is severe because Diavolo's life is built around erasing traces, controlling outcomes, and staying at the apex. Requiem gives him the exact opposite: endless attempts with no arrival.

The scene should not present Giorno as a shining savior or Diavolo as a simple monster target. The better reading is cold justice. Giorno's dream closes the story by making the Boss's result impossible.

## Stand Scan / Ability Diagram

The Stand Scan should be compact and graphic. It should feel like the failed causality path has resolved into a readable diagram.

Required scan elements:

- Stand name: `Gold Experience Requiem`
- User: `Giorno Giovanna`
- Type: `Evolved Requiem Stand`
- Rule: `Return to Zero`
- Diagram: `Cause -> Zero`, with `Result` visibly unreachable
- One short judgment line

The ability radar can use five axes:

- Return to Zero
- Causality Denial
- Life Creation
- Independent Action
- Judgment Pressure

`Judgment Pressure` is a theater-reading axis, not a canon Stand stat. It should be labeled as part of this site's scan language if there is any risk of confusion.

The diagram is more important than the radar. If space is tight, keep the diagram and remove the radar.

## Asset Requirements

Existing assets that should be reused:

- `assets/generated/optimized/requiem-loop.webp` as the scene base.
- Existing speed, clock, glyph, and circular zero-loop CSS layers.
- Existing Requiem reset keyframes as a starting point for zero collapse.

New or upgraded assets needed for a strong version:

- Gold Experience Requiem full or three-quarter transparent asset, readable on desktop and mobile.
- Gold Experience Requiem face or crown close-up for the first appearance beat.
- Crimson Diavolo/King Crimson action trace asset or CSS-composable silhouette fragments.
- Causality diagram frame that matches paper, ink, ivory, gold, and restrained crimson.
- Judgment-loop icon strip with repeated symbolic endings and no gore.

Asset style should match the current manga-theater art: textured paper, sharp ink, controlled color, bold silhouettes, and hard impact shapes. Avoid screenshot imitation, plastic 3D, photoreal divine light, and generic cosmic backgrounds.

## Information Architecture

The reveal should be scene-local for the first pass.

Implementation can extend the `requiem` scene object with structured reveal data:

- `standName`
- `standUser`
- `standType`
- `standArt`
- `standDetailArt`
- `ruleName`
- `ruleLines`
- `causeDiagram`
- `judgmentLine`
- `softSpoilerLine`
- `radarValues`
- `continueLabel`

The markup should be generated from data, not hardcoded inside `handleRequiemTap`. This keeps Requiem compatible with the Stand reveal pattern used by Bucciarati, Narancia, and Mista.

The first version does not need a global inspect mode. It should leave the data shape ready for one.

## State Model

Add explicit Requiem reveal states instead of using only `is-requiem-reset` and `is-requiem-transition`.

Suggested states:

- `idle`
- `cause_started`
- `zero_denial_1`
- `zero_denial_2`
- `zero_denial_3`
- `stand_scan`
- `judgment_loop`
- `returning_to_origin`

Suggested classes:

- `is-requiem-cause`
- `is-requiem-zero-1`
- `is-requiem-zero-2`
- `is-requiem-zero-3`
- `is-requiem-scan`
- `is-requiem-judgment`
- `is-requiem-returning`

`is-requiem-reset` can remain as a low-level animation class, but it should not mean the whole reveal is complete.

State cleanup is a quality requirement. Leaving the scene, replaying, pressing Previous, pressing Next, selecting a tab, or toggling autoplay must remove all Requiem reveal classes, timers, temporary DOM nodes, and inline styles.

## Control Behavior

Scene-specific Requiem effects must never trap navigation.

The scene may briefly suppress duplicate quote taps while a denial beat is running. It must not suppress global Previous, Next, Replay, Pause, or scene tabs.

The in-scene click behavior should be:

- In `zero_idle`, tapping the quote starts the reveal.
- During denial beats, quote taps are ignored or restart only after the current beat finishes.
- In `stand_scan`, tapping the scene advances to `judgment_loop`.
- In `judgment_loop`, tapping the scene returns to Giorno.
- Controls always perform their visible action immediately.

Keyboard behavior should match pointer behavior:

- Enter or Space on the active quote starts the reveal.
- Enter or Space during scan advances the reveal.
- Enter or Space during judgment returns to Giorno.
- Escape exits reveal state and leaves the user on Requiem idle.

## Mobile Requirements

Mobile should keep the rule readable with fewer layers.

The cause path should run vertically or diagonally through the artwork, not require horizontal width. The `RESULT` node should sit above the controls and away from tabs. The Stand asset can occupy the center and upper half of the stage, with the scan in the lower third.

The causality diagram should use large text and simple geometry:

`Action`

`0`

`No result`

If `Gold Experience Requiem` is too long for one line, stack it as:

`GOLD EXPERIENCE`

`REQUIEM`

Touch targets for continue should be at least 44px high. The reveal must not require hover, precise tapping, rapid repeated taps, or multi-finger gestures.

## Performance Rules

Keep the WebP pipeline for scene artwork.

Do not add video for the first version. The Requiem rule can be built from layered images, CSS masks, transforms, opacity, clip-path, and generated DOM text.

Preload the GER reveal asset when the Diavolo scene becomes active, because the user can transition into Requiem quickly after the hold interaction.

Avoid continuous heavy filters during the denial sequence. Short contrast or color-invert hits are acceptable, but the main motion should use transforms and opacity.

The judgment-loop strip should be a compact image or CSS-composable layer, not a large animated sprite sheet.

## Accessibility

All reveal copy should be real DOM text.

The scene should announce the scan as a new region only when it becomes readable. It should not announce every denial beat as separate text.

Suggested accessible summary for the reveal:

`Gold Experience Requiem returns actions and will to zero, preventing the result from becoming real.`

Reduced-motion users should receive the same semantic steps without repeated collapse animation.

The denial sequence should not rely on red and green alone. Use shape, position, text, and completion failure so colorblind users can understand the rule.

## Acceptance Criteria

Requiem rule:

- Tapping the Requiem quote starts an in-scene causality sequence before returning to Giorno.
- The user sees an action or result attempt fail before the rule text appears.
- The scan clearly states `Return to Zero` and explains that the result never becomes real.
- The scene communicates the contrast with King Crimson without requiring a long lore paragraph.

Story and spoilers:

- The primary visible text stays under about 60 English words.
- The scene implies Diavolo's eternal punishment without showing graphic deaths.
- The reveal does not explain unrelated finale mechanics such as Chariot Requiem or the soul swap.

Controls:

- Previous, Next, Replay, Pause, and scene tabs work during every reveal state.
- Replay returns to Requiem idle with no scan, judgment loop, or result marks visible.
- Returning to Giorno happens only after the rule and judgment have been readable, unless the user manually navigates.

Visual:

- Gold Experience Requiem reads as a purpose-built Stand asset, not a generic glow.
- The circular zero-loop motif functions as failed completion, not decoration.
- Mobile has no horizontal overflow and no text covering the controls.

Performance:

- Runtime scene images remain local.
- No large video files are introduced.
- The Diavolo-to-Requiem path preloads needed Requiem reveal assets.

## Content Copy Candidates

Entrance:

`GOLD EXPERIENCE REQUIEM`

`Stand User: Giorno Giovanna`

Rule scan:

`Return to Zero`

`Actions and will return to zero.`

`The result never becomes real.`

`Even King Crimson cannot reach the truth.`

Diagram labels:

`CAUSE`

`PATH`

`RESULT`

`ZERO`

Bridge:

`That is why the scene refuses to complete.`

Judgment:

`Diavolo dies, but never arrives at death.`

Lower-spoiler judgment:

`The Boss is trapped before the ending can arrive.`

Exit:

`Return to the dream.`

Japanese typography accents can use:

`無駄`

`真実`

`ゼロ`

These accents should stay decorative or secondary. The core explanation should be English for consistency with the current site.

## Validation Plan

Validate the finished implementation in a real browser before accepting the work.

Desktop viewport:

- Open the page at a desktop width around 1440px.
- Navigate to Requiem through tabs and through the normal scene flow.
- Tap the Requiem quote and confirm the causality sequence starts before any return to Giorno.
- Confirm the user sees an attempted result fail, then sees the `Return to Zero` scan, then sees the judgment layer.
- Confirm the scene returns to Giorno only after the rule and judgment have been readable or after the user chooses to continue.
- Confirm there are no console errors during the full sequence.

Mobile viewport:

- Test around 390px by 844px and around 430px by 932px.
- Confirm the `Gold Experience Requiem` title fits without clipping.
- Confirm the causality diagram, scan text, and judgment line do not cover the bottom controls.
- Confirm touch continue targets are easy to tap and do not require precision.
- Confirm there is no horizontal overflow at any reveal state.
- Confirm the mobile sequence still teaches the rule even if it uses fewer denial beats than desktop.

Replay:

- Start the Requiem reveal, reach `stand_scan`, then press Replay.
- Confirm the scene returns to Requiem idle.
- Confirm no scan, judgment loop, result marks, inline diagram state, or temporary DOM nodes remain visible.
- Start the reveal again and confirm timing is clean on the second run.

Next and Previous:

- Start the Requiem reveal and press Next during each state.
- Confirm navigation works immediately and no Requiem classes or timers leak into the next scene.
- Repeat with Previous and confirm the destination scene is clean.
- Return to Requiem afterward and confirm the reveal can start normally.

Scene tabs:

- Start the Requiem reveal, switch to at least three different scene tabs, then return to Requiem.
- Confirm tabs always work.
- Confirm the old reveal state does not persist after tab navigation.
- Confirm returning to Requiem starts from idle, not from scan or judgment.

Reduced motion:

- Enable reduced motion in the test environment.
- Confirm repeated collapse animation is replaced by stable step frames.
- Confirm the semantic sequence still reads as `Action`, `Denied`, `Zero`, `Scan`, and `Loop`.
- Confirm reduced motion does not remove the rule explanation or judgment layer.

Diavolo-to-Requiem preload:

- Start from the Diavolo scene.
- Trigger the Diavolo hold transition into Requiem.
- Confirm the Requiem reveal assets are already loaded or load without visible blank frames.
- Confirm the Diavolo-to-Requiem path does not request PNG scene images during normal runtime if WebP equivalents exist.

Overflow and errors:

- Inspect the page after each reveal state on desktop and mobile.
- Confirm `document.documentElement.scrollWidth` does not exceed `window.innerWidth` on mobile.
- Confirm there are no uncaught JavaScript errors, failed local asset requests, or repeated timer callbacks after navigation.

## Implementation Decisions

Autoplay off is the default behavior. With autoplay off, Requiem must wait for the user after the judgment layer is readable. It should not automatically return to Giorno just because the animation finished.

Autoplay on may return to Giorno, but only after the user has had time to read the rule scan and judgment line. The auto return is part of the loop concept, not a skip over the explanation.

The rule must appear before the return to Giorno. The accepted sequence is attempted result, return to zero, Stand Scan, judgment loop, then return to Giorno. Any implementation that jumps from quote tap to Giorno before explaining the rule misses the design.

Do not introduce video for the first version. Use local images, CSS masks, transforms, opacity, clip-path, and DOM text.

The primary explanation language is English. Japanese text can appear as secondary typography accents only. No Chinese text appears in the runtime UI.

Gold Experience Requiem must not become a generic divine glow. The visual read should come from a purpose-built GER asset, failed causality marks, restrained zero-loop geometry, and the contrast with Diavolo's crimson result traces.

The central horror is non-arrival. Do not solve the scene with a larger explosion, a brighter flash, or a stronger punch. The result should fail to become real.

The implementation should extend the existing Requiem scene data and state model. It should not create a separate page mode or hardcode all reveal copy inside one click handler.

Global controls remain authoritative. Scene-specific duplicate-tap suppression may exist during denial beats, but Previous, Next, Replay, Pause, and scene tabs must always work.

The first implementation should keep spoiler exposure focused. It can name Return to Zero, King Crimson, Diavolo, and the death-loop judgment, but it should not recap Chariot Requiem, the soul swap, the full Arrow chase, or every death-loop vignette.
