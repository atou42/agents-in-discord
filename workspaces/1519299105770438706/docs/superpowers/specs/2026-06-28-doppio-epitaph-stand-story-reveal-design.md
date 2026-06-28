# Doppio / Epitaph / King Crimson Partial Manifestation Design

Date: 2026-06-28

Status: design spec

## Purpose

Upgrade the Doppio scene from a three-tap signal gag into a playable identity fracture.

The current scene already asks the user to tap `Boss... / it's me.` until the frame becomes unstable and moves into Diavolo. That is the correct seed. The next version should make each tap feel like answering a phone that should not exist. Doppio is not simply calling a villain offscreen. He is opening an unstable line to the Boss from inside the same body.

This reveal is not a full Diavolo reveal and not a normal Stand introduction. Doppio can use Epitaph and King Crimson's arms only as borrowed power granted by Diavolo. The scene should keep Doppio in front, show Epitaph as a forecast fragment, let one piece of King Crimson break through, and then hand the user into the full Diavolo scene.

## Audience

New viewers should understand four things without reading a wiki page: Doppio believes he is the Boss's loyal underboss, the call is not coming from a normal phone, Epitaph shows a near-future result, and King Crimson belongs fully to the Boss rather than to Doppio alone.

Casual JoJo viewers should recognize the object-phone behavior, the Risotto fight logic, the Epitaph forehead/forecast imagery, and the partial King Crimson arms without feeling that the scene has become a lore lecture.

Deep Part 5 fans should feel the tenderness and horror of Doppio. He is funny and frightened, but he is also the doorway through which Diavolo moves unseen. The reveal should respect that he is loyal, dangerous, unaware, and lonely.

## Product Principle

The order is signal first, forecast second, fracture third, explanation fourth.

Do not begin with a Stand card. The user taps. The signal forms through an impossible phone. The second tap leaks a future result through Epitaph. The third tap cracks the identity boundary and lets King Crimson partially manifest. Only after that should the scan explain what happened.

The scene should not flatten Doppio into Diavolo. The full Boss reveal belongs to the next scene. Doppio's scene is about unstable connection and borrowed power.

## Source Facts

Use these facts as the factual base for implementation.

- Vinegar Doppio is Diavolo's younger, more innocent and eccentric underboss.
- Doppio believes he is Diavolo's loyal subordinate and does not know the full truth of their relationship.
- Doppio and Diavolo are separate souls inhabiting the same body.
- Doppio hallucinates random objects as phones when speaking with Diavolo.
- Doppio is friendly, frightened, childlike, resourceful, and capable of sudden violence.
- Doppio can partially wield King Crimson when Diavolo grants him power.
- The Doppio page describes his combat use as Epitaph plus King Crimson's arms.
- King Crimson is Diavolo's Stand and is only partially shared with Doppio.
- King Crimson is a close-range humanoid Stand with high physical power and speed.
- Epitaph is King Crimson's sub-Stand ability.
- Epitaph appears as a smaller face on King Crimson's forehead and can also appear on Doppio's forehead when granted power.
- Epitaph shows a future image, often a result without the complete chain of causes.
- Epitaph's forecast can be misread by the viewer or user, as Doppio misreads future fragments during the Risotto fight.
- King Crimson's full time-erasure explanation belongs primarily to the Diavolo scene.
- Doppio dies later while waiting for the Boss to call him, still loyal and lonely.

References checked with fandom CLI:

- https://jojo.fandom.com/wiki/Vinegar_Doppio
- https://jojo.fandom.com/wiki/King_Crimson
- https://jojo.fandom.com/wiki/Epitaph redirects to King Crimson

Source caution: the King Crimson page's auto-generated quick-answer block contains claims that do not match the body text. Use the main article body for Epitaph and time-erasure facts.

## Current Baseline

The scene key is `doppio`. It uses tab `Doppio`, class `scene-disguise`, label `Doppio disguise scene`, caption `Disguise Signal`, and quote `Boss... / it's me.`

The scene currently appends one `doppio-signal-layer`. The active interaction is `handleDoppioTap`. It only fires when the user taps the quote. Each valid tap clears the carousel timer, increments `sceneInteraction.doppioTaps` up to 3, writes `--doppio-tap`, restarts `is-doppio-signal`, and toggles `is-doppio-ready` from tap two onward. On tap three it adds `is-doppio-transition` and advances to Diavolo after about 760ms.

The existing CSS already gives Doppio a signal band, quote stutter, red readiness overlay, and exit animation. This is a good skeleton, but it currently jumps from signal stutter to Diavolo before the user understands the call, Epitaph, or borrowed King Crimson power.

## Desired Experience

The first tap should make the impossible phone ring. A non-phone object becomes the receiver: a frog, cigarette, toy phone, ice cream, or abstract receiver shape. It should be absurd before it is terrifying. Doppio still feels like Doppio.

The second tap should make the signal pass through his body. The frame drops a few beats, the quote duplicates like a mouth out of sync, and Epitaph leaks a future result. This forecast should be incomplete: a red future plate, a severed action fragment, a hand already in the wrong place, or a short `Ten seconds` shard. It should not show Diavolo fully.

The third tap should connect the line too strongly. Doppio's face or shadow splits. Epitaph appears clearly. One King Crimson arm breaks into the scene as a borrowed limb, not a full Stand pose. The scene should feel like the Boss has reached through Doppio rather than entered from outside.

After the fracture, the Stand Scan explains the relationship in compact language. The character return then reframes the comedy of the phone as tragedy: Doppio thinks the Boss is elsewhere, but the call is inside him. Only after that should the scene move into Diavolo with missing-frame timing.

## Interaction Flow

The default flow has eight states.

`idle`: Doppio scene is active. The quote invites a tap. No extra lore is visible.

`call_one`: first tap. A ring pulse and object-phone flash appear. The scene stutters and returns to an unstable idle.

`call_two`: second tap. The signal strengthens. Doppio is marked as ready, but still not revealed. Epitaph starts to form.

`forecast_fragment`: a future result appears for a fraction of a second. It is large enough to read, short enough to feel like intrusion, and incomplete enough to be interpretable.

`call_three`: third tap. The call connects. Doppio's identity boundary snaps. Epitaph is visible, and a King Crimson arm or shoulder fragment manifests.

`stand_scan`: the Epitaph/borrowed-power scan becomes readable. The user can continue, but the scene does not immediately leave.

`character_return`: the scan gives way to a short character reading and quote echo.

`continuing`: the final transition removes the middle frames and lands in Diavolo.

Manual continuation should be available from `stand_scan` and `character_return` by click, tap, Enter, Space, Next, or the Diavolo tab. If autoplay is off, the default experience waits for user action after the scan is readable. If autoplay is on, it may continue after the character-return beat has been visible long enough to read.

Replay resets all Doppio states and returns to `idle`. Previous, Next, tab selection, resize cleanup, and scene change must clear tap count, timers, forecast fragments, partial Stand layers, and temporary inline styles.

## Tap Beat Timing

The target from first tap to readable scan is about 3.0 to 4.2 seconds if the user taps at a natural pace. The experience should not require precise rhythm.

Suggested timing:

- Tap 1 + 0.00s: quote tap accepted; carousel timer clears.
- Tap 1 + 0.08s: ring pulse begins.
- Tap 1 + 0.18s: object-phone flashes near Doppio or the quote.
- Tap 1 + 0.36s: signal band collapses, leaving a small residue.
- Tap 2 + 0.00s: second ring starts harsher and lower.
- Tap 2 + 0.16s: Epitaph face or forehead mark flickers.
- Tap 2 + 0.34s: future-result plate interrupts the art.
- Tap 2 + 0.62s: `is-doppio-ready` visual state settles.
- Tap 3 + 0.00s: call connects.
- Tap 3 + 0.12s: identity split snap.
- Tap 3 + 0.36s: King Crimson arm fragment appears.
- Tap 3 + 0.82s: Stand Scan becomes readable.
- Scan + 2.20s or user action: character-return line becomes available.
- Continue: missing-frame transition into Diavolo.

Reduced motion uses the same state order with fewer visual layers: tap count feedback, object-phone snap, one Epitaph snap, one King Crimson arm snap, scan, continue.

## Motion Direction

The motion should feel like bad reception inside a body. Use ring pulses, dropped frames, duplicate mouths, eye flashes, hairline forecast cuts, object-phone overlays, and abrupt missing-frame jumps.

Avoid generic cyberpunk glitch rain, neon terminal effects, smoke monster reveals, full-screen red filters that hide the art, and slow villain fades. Doppio's signal is intimate and strange, not technological.

The third tap should not be a clean transformation. It should feel like a call line pulling the body into two incompatible readings. The strongest image is not `Doppio becomes Diavolo`; it is `Doppio is still here while the Boss acts through him.`

## Visual Design

Doppio's softness must remain visible until the handoff to Diavolo. Keep his palette closer to pink, pale cream, black ink, and sickly red cuts. Use small teal accents only if they match the existing site language.

Epitaph should be small, sharp, and unsettling. It can appear as a forehead face, a hair-window forecast plate, or a small face embedded in the future fragment. It should not be treated like a floating sci-fi monitor.

King Crimson's partial manifestation should be unmistakable but incomplete. Use a red arm, fist, shoulder, or Epitaph-marked face fragment. Do not show a full heroic body pose in the Doppio scene. The full red presence belongs to Diavolo.

Object-phone visuals should be absurd and hand-drawn. One object is enough for the first version. More than two will look like a collage and weaken the call.

The forecast fragment should be graphic, not explanatory. It should make new viewers ask what just happened, and the scan should answer immediately afterward.

## Stand Scan

The main scan text should stay short and should fit under about 65 visible English words before optional inspect content.

Primary labels:

`EPITAPH`

`Borrowed from King Crimson`

`User State: Vinegar Doppio`

Ability lines:

`Shows a near-future result.`

`Doppio can borrow King Crimson's arms when the Boss allows it.`

`The call is not outside him.`

Bridge line:

`That is why each tap sounds like someone else answering from within.`

Character return:

`He thinks the Boss is calling from elsewhere.`

`The signal is inside the same body.`

Quote echo:

`Boss... it's me.`

Optional final line:

`Still waiting for the call.`

Do not use Chinese in runtime UI. English and Japanese are acceptable.

## Ability Reading

The scene should separate three abilities or conditions.

Boss communication is the trigger. Doppio hallucinates random objects as phones and believes he is speaking with a separate superior. In theater terms, the tap is the user strengthening a call line that already lives inside the scene.

Epitaph is the forecast. It shows a near-future image, but it does not explain the full chain of causes. The user should see a result before they understand how it will happen.

King Crimson partial manifestation is the borrowed force. Doppio can use Epitaph and King Crimson's arms when Diavolo grants him power, but the scene must not imply that Doppio fully commands King Crimson or has Diavolo's complete time-erasure authority.

This distinction matters. If the scene shows a full King Crimson reveal and a full time-erasure explanation too early, it steals the Diavolo scene's job and makes Doppio less tragic.

## Character Reading

Doppio is not only comic relief. The phone behavior is funny because the objects are absurd; it becomes disturbing because the call is real in effect and false in premise.

He is loyal because he thinks the Boss is separate, protective, and guiding him. He is dangerous because that loyalty gives Diavolo a way to act through him. He is tragic because his trust is not rewarded. Later, even at death, he waits for a call.

The reveal should not present him as simply weak, cute, or secretly evil. The better reading is innocent carrier, borrowed weapon, unstable connection, and abandoned subordinate.

## Key Event Fragments

Use short fragments as signal interruptions. They should be optional texture or fast flashes, not a timeline lecture.

Recommended fragments:

- `Turururururu`
- `Ten seconds`
- `Borrowed arm`
- `Risotto`
- `Inside the same body`
- `Still waiting`

`Risotto` should stay subtle. The site does not need to explain the full Metallica fight in this reveal.

## Asset Requirements

The first version needs four purpose-built assets.

Doppio expression accent:

- Transparent WebP or PNG.
- Upper body, face, or hand detail compatible with the existing scene art.
- Soft enough to preserve Doppio's innocence.
- No embedded text.

Object-phone signal asset:

- One absurd receiver object such as frog, cigarette, toy phone, or ice cream.
- Hand-drawn manga-theater style.
- Clear silhouette at mobile size.
- Can be WebP, PNG, or CSS-composed SVG if it remains visually compatible.

Epitaph forecast detail:

- Small face, forehead mark, or forecast plate.
- Red/cream/black palette with strong contrast.
- Must read as a future fragment, not a normal HUD.

King Crimson arm fragment:

- Red arm, fist, forearm, or shoulder only.
- Recognizable grid/body language and close-range menace.
- Must not reveal the full Stand body.

Optional later assets:

- Doppio/Diavolo split-face mask.
- Future-result strip.
- Ring waveform texture.
- Small phone glyphs for tap-count feedback.

Generated assets must be original redraws and must not use anime screenshots. The style target is coherent manga-theater illustration that matches the existing generated art direction, not exact imitation of a single source artist.

## Information Architecture

Implementation should extend scene-local structured data instead of hardcoding reveal copy inside event handlers.

Suggested Doppio reveal fields:

- `revealType`
- `standName`
- `standQualifier`
- `userState`
- `signalObjectArt`
- `epitaphArt`
- `partialStandArt`
- `abilityLines`
- `bridgeLine`
- `characterLines`
- `signalFragments`
- `radarValues`
- `continueLabel`

The data model should allow `standQualifier` because Doppio is not a normal full Stand owner in this scene. A good first value is `Borrowed from King Crimson`.

## State Model

Do not let `is-doppio-ready` carry the whole feature. It can remain as the tap-two visual marker, but the reveal needs explicit state classes and data state values.

Suggested classes or states:

- `doppio_idle`
- `doppio_call_one`
- `doppio_call_two`
- `doppio_forecast_fragment`
- `doppio_call_three`
- `doppio_stand_scan`
- `doppio_character_return`
- `doppio_continuing`

Runtime cleanup must remove all Doppio reveal classes, clear all Doppio timers, reset tap count, clear live-region text for the scene, remove temporary forecast DOM, and restore any CSS variables set during the call.

## Transition Rules

First tap stays on Doppio.

Second tap stays on Doppio and may mark the scene as ready.

Third tap no longer advances directly to Diavolo. It unlocks the Epitaph and partial King Crimson reveal first.

The final transition into Diavolo should use missing frames. It should feel like the site lost the middle of an action, preparing the user for King Crimson's full time-erasure grammar in the Diavolo scene.

If the user presses Next before the scan is complete, navigation should still work. It should clear the reveal cleanly and move forward. It should not leave a partial arm, forecast plate, or `is-doppio-transition` class on the next scene.

## Relationship To Diavolo Scene

Doppio's scene explains the call, Epitaph, and borrowed arms. Diavolo's scene explains full King Crimson and time erasure.

The handoff should preserve suspense. At the end of Doppio, the user should understand that the Boss has been inside the signal, but the full face and full rule should still feel like they are arriving next.

The Diavolo scene may receive a faint residue from Doppio only if the user enters through the Doppio reveal path. This can be a broken call tone glyph, a false phone shadow, or a short `Call connected` trace. It should never dominate Diavolo's scene.

## Mobile Requirements

Mobile is a first-class layout.

The tap target can include the quote and active stage. The user should not need precise timing or exact tap placement.

The object-phone flash should appear near Doppio's hand, face, or quote area, but not directly under the finger if it would hide the effect.

The forecast fragment should be large and short. Avoid tiny subtitles, dense scan text, and narrow forecast strips that cannot be read on a 390px-wide viewport.

The scan should fit above the bottom tabs and controls. It can occupy the lower third or a centered band, but it must not cover the bottom carousel permanently.

The continue target must be at least 44px tall. Keyboard and touch continuation should behave the same.

## Performance Requirements

Do not increase first-scene load cost. Doppio reveal assets should preload when the user is on or near the Doppio scene, not at initial page load.

Keep large raster assets as optimized WebP. Small line assets may be SVG or CSS if they match the art direction.

Use class-based animation with transform, opacity, clip-path, and CSS variables. Avoid layout-heavy animation, large video files, and expensive filters across the full viewport.

The three-tap sequence should remain responsive on mobile. Tap feedback must appear immediately even if a reveal asset is still decoding. If a required asset is missing, the implementation should expose the broken state during development rather than silently falling back to an unrelated generic graphic.

## Accessibility

The three-tap requirement should have visible and accessible state text. Good labels are `Call 1 of 3`, `Call 2 of 3`, and `Call connected`.

The Stand Scan text must exist as real DOM text, not only inside an image.

When the scan appears, a live region should announce `Epitaph Stand Scan unlocked`.

The reveal should be understandable without audio. Ring effects can be visual only.

Keyboard users should be able to activate the Doppio quote or stage, continue from the scan, use Replay, use Previous and Next, and switch tabs.

Reduced-motion users should receive the same information with fewer jumps: tap count, object-phone snap, Epitaph snap, partial arm snap, scan, continue.

## Content Limits

The first version should keep the main reveal short. A good visible copy budget is about 55 to 75 English words before optional inspect content.

Do not explain Doppio's entire death scene in the main scan. `Still waiting for the call` is enough as a fan-facing echo.

Do not name Diavolo too early in large headline text. `the Boss` is more appropriate until the final handoff.

Do not describe King Crimson as Doppio's full Stand. Use `borrowed`, `partial`, `from King Crimson`, or `when the Boss allows it`.

## Acceptance Criteria

First and second taps show escalating signal states and keep the user on Doppio.

Second tap produces a readable Epitaph or forecast-fragment tease before the third tap.

Third tap unlocks an Epitaph and partial King Crimson reveal before any scene change.

The scan explains future glimpse, borrowed arms, and the internal Boss relationship with English or Japanese UI text only.

King Crimson appears only as a partial manifestation in Doppio's reveal.

The full Diavolo/King Crimson reveal remains reserved for the Diavolo scene.

Character return frames Doppio as loyal, unaware, dangerous, and lonely.

The final transition into Diavolo uses missing-frame or time-skip language.

Replay resets the Doppio scene to the original idle state.

Previous, Next, tabs, and resize cleanup remove all signal and reveal state.

Desktop and mobile both keep tap progress, forecast, scan, and continue controls readable.

Reduced-motion mode remains usable and information-complete.

No reveal asset causes obvious tap delay or loading stutter.

## Validation Plan

Manual validation should capture and inspect these moments:

- Doppio idle.
- Tap one object-phone flash.
- Tap two Epitaph tease.
- Forecast fragment readability.
- Tap three identity fracture.
- Partial King Crimson arm reveal.
- Stand Scan readable state.
- Character return state.
- Continue into Diavolo.
- Replay during scan.
- Next during scan.
- Previous during reveal.
- Tab switch during reveal.
- Mobile 390px layout.
- Reduced-motion path.

Automated validation should confirm that tap count advances from 0 to 3, first and second taps do not change scenes, third tap enters reveal state before scene change, continue moves to Diavolo, Replay clears all Doppio classes and tap state, and mobile scan layout does not overlap controls.

Use screenshot validation for idle, forecast fragment, partial manifestation, scan, character return, and mobile scan. The screenshot set should prove that Doppio remains visually present until the handoff.

## Implementation Decisions

Keep the three-tap structure. It already matches the current site and the user's mental model.

Change tap three from immediate transition to reveal unlock. Scene change happens only after scan continuation or autoplay's readable delay.

Treat Epitaph as the headline of Doppio's reveal. Treat King Crimson as a partial borrowed manifestation. Treat full King Crimson as Diavolo's reveal.

Use one object-phone asset in the first version. A single clear absurd object is stronger than a pile of references.

Use structured scene data for reveal copy and assets so later Stand reveals can reuse the pattern without hardcoding Doppio-specific text into gesture handlers.

Keep all runtime UI copy in English or Japanese.

Do not use a generic fallback graphic for missing reveal assets. Development should fail visibly enough to catch the missing asset.

The quality bar is not a text panel. The feature is complete when the user taps into a signal, sees a future result leak through Epitaph, watches King Crimson partially act through Doppio, and understands why the next scene belongs to the Boss.
