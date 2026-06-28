# Bucciarati Farewell Stand Story Reveal Design

Date: 2026-06-28

Status: draft for review

## Purpose

Design the second Bucciarati Stand reveal around `Arrivederci.` as a battle-ending theater beat.

The existing Bucciarati Betrayal spec uses Sticky Fingers to reveal the moral turn: Bucciarati opens a path away from the Boss. This Farewell scene must not repeat that structure. It should use the same Stand and zipper language for a different feeling: a close-range rush, a zipper finish, and a calm goodbye that lands like judgment.

The purpose is to make the user feel why `Arrivederci.` is not only a catchphrase. It is the last word after Bucciarati has already measured the opponent, chosen the necessary violence, and ended the fight with precision.

## Audience

First-time viewers should understand three things without reading a wiki card: Sticky Fingers fights up close, its zippers can split and close bodies or surfaces, and `Arrivederci.` means the fight is over.

Casual JoJo viewers should recognize the ARI ARI rush into the final line, understand why the zipper cut is the correct gesture, and feel that this is not the same emotional beat as `I will betray the Boss.`

Deep fans should feel the Pesci finish in the rhythm and staging: Bucciarati has already survived a brutal tactical fight, sees the threat turn toward Trish and the team, and answers with clean, ruthless certainty.

## Source Facts With Links Checked

Use these facts as guardrails, not as visible lore blocks.

- Bruno Bucciarati is the deuteragonist of *Vento Aureo*, a Passione mobster, and the leader of his own squad. Source checked: [Bruno Bucciarati](https://jojo.fandom.com/wiki/Bruno_Bucciarati).
- Bucciarati is righteous and protective, but also brutal and willing to use lethal force in combat. Source checked: [Bruno Bucciarati](https://jojo.fandom.com/wiki/Bruno_Bucciarati).
- Sticky Fingers is Bucciarati's humanoid close-range Stand. It has strong speed and strength for direct combat. Source checked: [Sticky Fingers](https://jojo.fandom.com/wiki/Sticky_Fingers).
- Sticky Fingers creates zippers on touched surfaces. Those zippers can open paths, split objects, attach things, hide objects in dark spaces, and reposition Bucciarati. Source checked: [Sticky Fingers](https://jojo.fandom.com/wiki/Sticky_Fingers).
- Sticky Fingers' attack cry strings `ARI` through rapid punches and resolves into `Arrivederci`, Italian for goodbye. Source checked: [Sticky Fingers](https://jojo.fandom.com/wiki/Sticky_Fingers).
- In the train fight's ending, Bucciarati finishes Pesci after Pesci threatens Trish and the team, using Sticky Fingers' rush and zipper dismemberment before the remains fall into the river. Source checked: [The Grateful Dead, Part 2](https://jojo.fandom.com/wiki/Thankful_Death_Part_2_(Episode)).

## Current Baseline

The scene key is `farewell`. It uses class `scene-zip`, tab `Farewell`, caption `Farewell Cut`, quote `Arrivederci.`, and art `assets/generated/optimized/arrivederci-zipper.webp`.

The current interaction is a tap anywhere on the active Farewell stage. `handleFarewellTap` seeds a fixed zipper path, plays an automatic zipper cut, marks the stage as `is-farewell-zipping`, then `is-farewell-cut`, `is-farewell-transition`, and `is-zip-complete`, and advances to the next scene after about 1320ms.

This already reads as a sharp cut. It does not yet read as Sticky Fingers entering close range, throwing the ARI ARI rush, and turning the farewell into a Stand execution.

The Betrayal scene is separate. It uses `scene-betray`, pointer-driven zipper drag, thresholded success, snapback on failure, and transition into Farewell. Betrayal should remain the user's performed opening. Farewell can be tap-triggered or later upgraded to a shorter zipper-cut gesture, but its meaning must be closure.

## Desired Experience

The user taps the quote, taps the stage, or completes a short zipper cut. The current image does not simply wipe away. It tightens.

The camera pulls the fight into close range. The zipper line snaps across the frame like a blade. Sticky Fingers appears beside or behind Bucciarati with no slow reveal. A short rush begins: `ARI`, `ARI`, `ARI` hits in compact panels or impact slashes. Each hit adds a zipper mark across the target space. The final zipper closes.

Then `Arrivederci.` appears alone, quieter than the rush and heavier than the effects.

The Stand Scan follows only after the finish has landed. It explains the mechanic in a few seconds: close-range Stand, zipper rush, split-and-close finishing move. After that, the character reading brings the focus back to Bucciarati: the line is brutal, elegant, and protective at the same time.

The user should leave the scene understanding that Betrayal opens the story, while Farewell closes the fight.

## Interaction Flow

The first version can keep the existing tap trigger. A later version may support a short zipper-cut gesture, but it should not require the long thresholded drag used by Betrayal.

`idle`: Farewell stage is active. The quote sits large and still enough to invite a tap. Existing carousel controls remain available.

`cut_armed`: triggered by tapping the quote, tapping the stage, pressing Enter when the active stage is focused, or completing a short zipper cut. The stage freezes the idle art and suppresses accidental double taps.

`rush_start`: Sticky Fingers snaps into close range. The zipper path becomes a combat line rather than a transition path.

`ari_rush`: three to six compact impact beats. The typography should read as speed and pressure, not as a paragraph of manga text.

`zipper_finish`: the hit line closes. The target space is segmented by zipper seams, then pulled shut or thrown away in one clean direction.

`farewell_hold`: `Arrivederci.` holds alone. This is the emotional punctuation. Do not cover it with explanatory UI yet.

`stand_scan`: the scan appears with Stand name, user, ability summary, and a compact radar.

`character_return`: the scan recedes. Bucciarati's meaning returns in one or two lines.

`continue_ready`: click, tap, Enter, Space, Next, or the scene tab can continue to Narancia. Autoplay may continue only if autoplay is active.

Replay must return to the untouched Farewell scene. Previous, Next, tab change, and resize during the sequence must clear temporary classes, timers, inline zipper positions, and any generated text layers.

## Motion Direction

The scene should feel like a near-range execution, not a broad magical cut.

Timing target from trigger to readable Stand Scan is about 3.0 to 3.8 seconds. The finish itself should land sooner, around 1.8 to 2.2 seconds. The scan is explanation after impact, not the impact.

Suggested beat timing:

- 0.00s: trigger accepted, idle art freezes.
- 0.08s: camera or art scales in 3-5%, as if Bucciarati has closed the distance.
- 0.18s: zipper line snaps across the frame.
- 0.32s: Sticky Fingers shoulder, helmet, and striking arm enter as one hard cut.
- 0.46s to 1.24s: ARI typography and punch slashes fire in uneven rapid beats.
- 1.34s: zipper seams appear across the target space.
- 1.55s: zipper pull closes or yanks the seams.
- 1.82s: all motion drops out for `Arrivederci.`
- 2.55s: Stand Scan unlocks.
- 3.60s: character return line becomes available.

Use hard masks, impact smears, stepped timing, zipper teeth, and short camera punches. Avoid glow clouds, soft radial bloom, long fades, or a generic anime power-up. Sticky Fingers should feel already inside punching range.

Reduced-motion users should get a short snap: close-range pose, one zipper seam, `ARI ARI`, `Arrivederci.`, then scan.

## Visual Design

The Farewell visual language should be sharper and colder than Betrayal.

Betrayal can use opened space, moral rupture, and the sense of a path appearing. Farewell should use compression, close crops, diagonal cuts, teeth, seams, and sudden negative space. The frame should feel cut to pieces and then deliberately closed.

Sticky Fingers should be a purpose-built asset, not a UI silhouette. The pose should show forward pressure: one arm punching or retracting, shoulders squared, helmet readable, zippers visible on hands or torso. It should be close to the viewer, partly cropped if needed.

The palette can use pale cream, blue-gray, black ink, zipper brass, and a small blood-red accent. Keep the teal from the existing interface only as a restrained scan accent. The scene must not become a generic HUD or a soft blue sci-fi panel.

The `Arrivederci.` text should be clean, elegant, and final. It can be very large, but it should not shake after the finish. The line works because Bucciarati is calm after the violence.

## Content Design

Visible UI copy should stay short. Experience comes first, explanation second, character meaning third.

Entrance and finish text:

`ARI`

`ARI`

`ARI`

`Arrivederci.`

Stand Scan text:

`STICKY FINGERS`

`Stand User: Bruno Bucciarati`

`Close-range rush Stand.`

`Creates zippers on touched surfaces.`

`Splits, opens, closes, and finishes at point-blank range.`

Bridge line:

`The rush says ARI. The finish says goodbye.`

Character return line:

`Bucciarati is merciful to the innocent, not to a threat still reaching for his team.`

Optional shorter mobile character line:

`Calm voice. Clean finish. No wasted cruelty.`

Do not put long episode summaries in the scene. Do not explain every use of Sticky Fingers. Do not display Chinese in the final UI. If Japanese is used, keep it as visual flavor and do not require it to understand the scene.

## Character Reading

`Arrivederci.` is not loud because Bucciarati does not need it to be loud. The violence has already spoken.

The line should read as execution, mercy, and precision at once. It is execution because the fight is ended with lethal certainty. It is mercy because the decision protects Trish and the team from a threat that keeps reaching after defeat. It is precision because Bucciarati does not posture or rage. He applies exactly enough force, then stops.

This is where the second Bucciarati scene differs from Betrayal.

In Betrayal, the zipper opens a route out of a corrupt order. The emotional center is moral resolve.

In Farewell, the zipper closes the distance and closes the fight. The emotional center is controlled brutality.

The design should let both truths coexist. Bucciarati is not softened into a saint, and he is not flattened into a stylish killer. He is a principled gangster whose elegance includes the ability to end a threat without hesitation.

## Stand Scan And Ability Radar

The Stand Scan should feel like a post-impact readout, not a pause menu.

Required scan fields:

- Stand: Sticky Fingers
- User: Bruno Bucciarati
- Type: Close-range rush
- Ability: Zippers
- Theater reading: Farewell finish

Radar axes:

- Rush Speed: high
- Close-Range Power: high
- Zipper Control: very high
- Range: low to medium
- Mercy / Precision: high

If the radar needs to avoid non-canon phrasing, label it `Theater Radar`, not `Canon Stand Stats`. The goal is to explain this scene's reading, not reproduce official stat charts.

The radar should animate in after `Arrivederci.`, with the zipper axis drawing first. On reduced motion, show the completed radar immediately.

## Asset Requirements

Required assets for a strong first implementation:

- Sticky Fingers close-range finisher asset, transparent WebP or PNG, three-quarter or cropped torso with striking arm.
- Sticky Fingers rush arm asset, transparent, readable at mobile size.
- Zipper seam overlay, preferably SVG or CSS-composable, with teeth and pull detail.
- ARI impact typography layers, either DOM text with CSS treatment or transparent assets if the lettering needs custom distortion.
- Stand Scan frame texture, lightweight and compatible with the existing manga-theater look.

Optional assets:

- Bucciarati calm face crop after the finish.
- Zipper pull close-up for the final seam closure.
- Small segmented debris or paper strips for the defeated target space.

Generated art should be an original manga-theater redraw. Do not use anime screenshots. Do not create a direct copy of a single copyrighted frame. The asset must serve the site's style: ink, fashion-sharp shape, readable silhouettes, textured paper, and controlled color.

## Mobile Requirements

Mobile should keep the scene legible at 390px width.

The rush should use fewer layers than desktop. Sticky Fingers can be cropped from the right or lower edge, with the striking arm crossing the center. Avoid tiny full-body staging.

The ARI beats can stack vertically or hit along the zipper seam. `Arrivederci.` should remain readable without splitting across awkward line breaks. If it must scale down, scale the whole word, not each letter independently.

The Stand Scan should occupy the lower third or center band and stay above the bottom tabs. It must not hide the carousel controls permanently. Continue should be at least 44px high if shown as a visible control.

Do not require hover. Do not require precise drag for the first version. A tap should be enough.

## Performance And Accessibility Constraints

Do not load the Farewell reveal assets on the first page view unless Farewell is near the active scene. Preload when the user reaches Betrayal or Farewell.

Use optimized WebP for large raster assets. Keep the finisher asset lightweight enough that the first tap does not stall. Prefer transform, opacity, masks, and SVG stroke animation over layout-heavy animation.

All explanatory text must exist as real DOM text. Do not bake Stand Scan copy into an image.

Keyboard users must be able to trigger the sequence and continue after the scan. Screen reader labels should announce the unlock in plain language, such as `Sticky Fingers finish revealed`.

The sequence must be understandable without motion. The reduced-motion path should preserve the order: trigger, Sticky Fingers, zipper finish, `Arrivederci.`, scan.

## State Cleanup

Farewell needs explicit reveal states. Do not rely on `is-zip-complete` alone.

Suggested state classes:

- `is-farewell-armed`
- `is-farewell-rush`
- `is-farewell-ari`
- `is-farewell-finished`
- `is-farewell-scan`
- `is-farewell-character`
- `is-farewell-continuing`

Reset must clear all Farewell timers, generated ARI nodes, scan nodes, zipper inline styles, pointer suppression flags, and temporary animation classes. Cleanup should run on Replay, Previous, Next, tab change, scene rerender, and reduced-motion mode change if that is handled live.

Leaving Farewell during the rush should not leave `zipperDrag.stage` pointing at the old stage. Existing `resetFarewellInteraction` already clears timers and a few classes; it must be expanded if this reveal is implemented.

## Acceptance Criteria

The Farewell scene no longer advances to Narancia immediately after the first zipper cut unless the user is in an autoplay path designed for that behavior.

Tap or keyboard activation starts a close-range Sticky Fingers finisher sequence.

The sequence clearly shows ARI ARI leading into `Arrivederci.`

The zipper motion reads as a finishing move, not only a transition wipe.

The scene explains Sticky Fingers after the impact with a compact Stand Scan containing Stand name, user, zipper ability, and a Theater Radar.

The character return line makes Bucciarati's calm brutality, elegance, and moral resolve legible without retelling the whole train fight.

The scene is visibly different from the Betrayal reveal: Betrayal opens a path; Farewell closes a fight.

Replay returns to the untouched Farewell scene.

Previous, Next, and scene tabs clear the reveal state cleanly.

Mobile keeps `Arrivederci.`, the Stand Scan, and controls readable without overlap.

Reduced-motion mode preserves the same story order with fewer moving layers.

No Chinese appears in final in-page UI text.

No new asset causes obvious loading stutter when the user triggers the scene.

## Validation Plan

Review the finished implementation through these checkpoints:

- Desktop Farewell idle.
- Desktop tap trigger.
- Sticky Fingers first close-range pose.
- ARI rush midpoint.
- Final `Arrivederci.` hold.
- Stand Scan readable state.
- Character return state.
- Mobile trigger and scan.
- Replay during scan.
- Next during rush.
- Tab switch during `Arrivederci.`
- Keyboard trigger and continue.
- Reduced-motion path.

The quality bar is not met if the feature is only a text panel after the cut. It is met when the user can feel Bucciarati step into range, Sticky Fingers finish the opponent, and `Arrivederci.` land as the only word left.

## Implementation Decisions

Autoplay off means the reveal waits for the user after the Farewell character beat. The scene should not advance only because the zipper animation finished.

The Arrivederci reveal is separate from the Betrayal reveal. Betrayal explains Bucciarati's moral break from the Boss; Farewell explains Sticky Fingers as close-range execution, goodbye, and battle punctuation.

The Stand entrance should be tied to the completed zipper cut and ARI ARI rhythm. Do not reuse the full Betrayal dark-pocket staging without changing its emotional meaning.

The scan text remains short and in English or Japanese only. Longer Bucciarati biography belongs outside the first implementation.

The first implementation should stay scene-local and reuse shared reveal grammar only where it helps cleanup, accessibility, and continuation behavior.
