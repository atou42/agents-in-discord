# Trish Spice Girl Stand Story Reveal Design

Date: 2026-06-28

Status: draft for review

## Purpose

Upgrade the Trish awakening scene from a tap-to-distort beat into a playable Spice Girl self-declaration.

The current scene already bends and snaps back when the user taps the quote. The next version should make that bend meaningful. Spice Girl's ability does not simply make things soft. It turns softness into resilience. Trish's scene should use that idea to explain her transformation: she begins the story as a protected target, then becomes someone who can declare herself and fight.

The reveal should not turn Trish into a passive lore card. It should stage her awakening as a material change. The user touches the quote, the scene softens, absorbs impact, and returns stronger.

## Audience

First-time viewers should understand that Trish is Diavolo's daughter, initially protected by Bucciarati's team, and that her Stand Spice Girl can soften materials into rubber-like resilience.

Casual JoJo viewers should recognize the Notorious B.I.G plane awakening, the `I am me!` self-claim, and Spice Girl's confident voice.

Trish fans should feel that the scene respects her growth. She is not only the person being escorted. She becomes a person with her own Stand, her own name, and her own refusal to be defined by the Boss.

## Product Principle

The order is pressure first, material change second, identity third.

The user should feel the scene bend before reading about the power. Spice Girl should appear as the voice and body of Trish's awakening. The Stand Scan should explain softening only after the user has seen the image absorb impact. The character return should bring the focus back to Trish's selfhood.

## Source Facts

Use these facts as guardrails for the first version.

- Trish Una is the daughter of Diavolo and Donatella Una.
- She is escorted by Bucciarati's team because enemies want to use her to discover the Boss's identity.
- The Boss intends to kill her to erase evidence of his identity.
- Trish initially appears sheltered and demanding, but develops courage through the journey.
- Spice Girl is Trish's Stand.
- Spice Girl awakens during the Notorious B.I.G crisis on the plane.
- Spice Girl can soften objects into an elastic, rubber-like state while preserving strength and allowing them to absorb impacts.
- Spice Girl is sentient, speaks to Trish, names herself, and guides Trish under pressure.
- Spice Girl is first signaled by a deep sharp-nailed handprint under Trish's hand before the full Stand reveal.
- Softened objects can store deformation energy and rebound with force when released.
- Softened projectiles can keep their motion and become dangerous again when the softening is undone.
- Spice Girl's battle cry is associated with `WANNABEEE`.
- Trish's declaration of self is a break from being treated as the Boss's evidence, daughter, or target.

References checked:

- https://jojo.fandom.com/wiki/Trish_Una
- https://jojo.fandom.com/wiki/Spice_Girl

## Current Baseline

The scene key is `trish`. It shows the quote `I am / me!`, uses tab `Trish`, class `scene-self`, and caption `Spice Awakens`.

The current interaction is `handleTrishTap`. Tapping the quote preloads the next scene, removes and re-adds `is-self-awake`, adds `is-self-transition`, and advances to Doppio after about 980ms. The visual idea is soft distortion snapping back with the quote pushed forward.

The new version should keep the tap and the material distortion, but the success should unlock Spice Girl and the selfhood reveal before continuing.

## Desired Experience

The user taps `I am me!`. The image yields. It should not look weak. It should look like a surface absorbing a blow.

The quote dents the scene, the panel stretches, and then the impact rebounds. In the rebound, Spice Girl's handprint appears first. Then the Stand's feminine silhouette forms from the softened material. The Stand should feel like it was already beside Trish, finally speaking clearly.

The Stand entrance should include a short voice-like typography beat. `WANNABEEE` can appear as a sharp impact phrase, but it should not overpower `I AM ME`. The focus is Trish's identity, not a catchphrase barrage.

The Stand Scan explains material softening, resilience, stored force, and Stand voice. The bridge line should connect the mechanic to the user's action: the scene bent because Spice Girl made impact survivable.

The character return shows Trish no longer as cargo in an escort mission. She is a person who can name herself and act.

## Interaction Flow

`idle`: Trish scene is active. The quote invites a tap.

`soft_impact`: The tap dents the image and quote. The panel stretches like resilient material.

`rebound`: The scene snaps back with controlled force. The quote moves forward.

`handprint`: A Spice Girl handprint or clawed palm mark appears on the surface.

`stand_entrance`: Spice Girl emerges from the softened image, calm and confident.

`stand_scan`: The scan explains softening, elasticity, impact absorption, rebound force, and sentience.

`character_return`: Trish's declaration appears as identity, not just motivation.

`continue_ready`: Click, tap, Enter, Space, Next, or Doppio tab continues.

Replay restarts the original Trish scene. Navigation clears all temporary material distortion, timers, and reveal state.

## Motion Direction

The motion should be confident and elastic.

Use material denting, rebound, handprint reveal, hard snapback, and clean silhouette entrance. Avoid explosions, generic sparkle, weak jelly wobble, or romantic magical-girl transformation.

Suggested timing after tap:

- 0.00s: tap accepted, quote presses into the image.
- 0.15s: surface dents and stretches.
- 0.35s: rebound begins.
- 0.55s: Spice Girl handprint appears.
- 0.85s: Stand silhouette forms from the softened surface.
- 1.25s: full Stand locks into pose.
- 1.65s: `WANNABEEE` or short Japanese typography hit.
- 2.05s: Stand Scan becomes readable.
- 4.00s or user action: character return appears.

On mobile, the handprint and Stand silhouette must stay clear of the bottom carousel. Avoid small text near the lowest third.

## Visual Design

Spice Girl needs a purpose-built asset. It should feel feminine, sharp, poised, and resilient. It should include recognizable symbolic language such as mathematical signs, sleek facial marks, and a fashion-forward silhouette without copying a screenshot.

The color direction can introduce pink, rose, cream, black ink, and restrained lime or gold accents. Do not let the scene become a one-note pink wash. Trish should feel vivid, not sugary.

The material effect should be graphic. The frame can bend, show tension lines, and rebound with paper texture. It should not use glossy rubber realism.

## Stand Scan

Primary labels:

`SPICE GIRL`

`Stand User: Trish Una`

Ability lines:

`Softens materials into resilient, rubber-like surfaces.`

`Absorbs impact without surrendering strength.`

`Stores force, then returns it.`

`Speaks to Trish and pushes her to act.`

Bridge line:

`That is why the scene bent instead of breaking.`

Radar axes:

- Material Softening
- Impact Absorption
- Rebound Force
- Stand Voice
- Selfhood Rise

The last axis is a theater reading. It connects ability to identity.

## Character Reading

Trish's scene should not explain her as only Diavolo's daughter. That is the trap she escapes.

Her reveal should start with the situation: she is protected because her existence threatens the Boss's secrecy. Then it should pivot quickly: the important thing is that she refuses to remain an object in someone else's plan.

Spice Girl fits because softness is not weakness. The ability turns yielding into survival. That is the character reading.

First-version character return:

`She was treated as evidence.`

`Spice Girl turns softness into resistance.`

Quote echo:

`I am me!`

First-version visible copy should use these lines in this order:

- `SPICE GIRL`
- `Stand User: Trish Una`
- `Softens materials into resilient, rubber-like surfaces.`
- `Absorbs impact without surrendering strength.`
- `Stores force, then returns it.`
- `That is why the scene bent instead of breaking.`
- `She was treated as evidence.`
- `Spice Girl turns softness into resistance.`
- `I am me!`

Keep `WANNABEEE` as impact typography only. Do not place it above the identity line in visual hierarchy.

## Key Event Fragments

Use fragments during the reveal as quick material labels:

- `Boss's daughter`
- `Protected target`
- `Plane crisis`
- `Stand voice`
- `Self named`

Do not spend the first version on full Diavolo family exposition. That belongs in optional deeper reading.

## Asset Requirements

First version needs at least three assets:

- Spice Girl full or three-quarter body, transparent WebP.
- Spice Girl handprint or palm-impact detail.
- Elastic material distortion mask or texture.

Optional later assets:

- Trish portrait accent in self-declaration pose.
- Spice Girl face close-up.
- Plane-cabin fragment for Notorious B.I.G context.

Generated assets must be original redraws matching the current manga-theater style. Do not use screenshots.

## Information Architecture

Add structured scene data when implemented:

- `standName`
- `standUser`
- `standArt`
- `standDetailArt`
- `standAbilityLines`
- `identityFragments`
- `radarValues`
- `storyReveal`
- `continueLabel`

The reveal text must remain DOM text, not embedded in images.

## Implementation Decisions

Keep Trish as a tap interaction. Do not change it into drag, hold, or multi-tap. The scene is about self-recognition arriving in one decisive touch.

Replace the current immediate `setScene(current + 1)` timer with a reveal controller. The tap should enter `soft_impact`, schedule the material and Stand beats, then stop at `stand_scan` until the user continues. If autoplay is enabled, auto-advance may happen after `character_return`; if autoplay is disabled, the scene waits.

Use scene-local structured data on the `trish` scene object, matching the Bucciarati reveal pattern where possible. The controller should read copy, assets, radar values, and continue label from data instead of hardcoding them inside `handleTrishTap`.

Add new classes for each reveal state. Preserve `is-self-awake` for the existing material distortion beat, but stop using `is-self-transition` as the full interaction state. `is-self-transition` should only describe the final exit into Doppio.

Render the reveal inside the active `.stage`, not as a global modal. The Stand belongs to the image space and should not cover the carousel controls.

Use a single live region shared by Stand Scan reveals. When Trish scan becomes readable, announce `Spice Girl Stand Scan unlocked`.

Continue behavior is explicit. Click or tap on the active stage after `continue_ready`, Enter, Space, Next, or selecting the Doppio tab moves forward. Replay always resets to the idle Trish image before any deformation.

Cleanup must clear Trish timers, reveal classes, custom properties, injected scan DOM, and live-region pending messages when replaying, leaving Trish, resizing across layout breakpoints, or navigating with tabs.

## State Model

Suggested states:

- `idle`
- `soft_impact`
- `rebound`
- `handprint`
- `stand_entering`
- `stand_scan`
- `character_return`
- `continuing`

The current `is-self-awake` should describe the material awakening, not the whole reveal sequence.

State classes should map one-to-one with readable states:

- `is-self-impact`
- `is-self-rebound`
- `is-self-handprint`
- `is-spice-entering`
- `is-spice-scan`
- `is-self-return`
- `is-self-ready`
- `is-self-transition`

These classes are animation hooks and cleanup hooks. They should not be inferred from elapsed time alone.

## Transition Rules

The tap should not immediately call `setScene(current + 1)`.

After character return, continuation to Doppio can use a tonal inversion: Trish's self-declaration collapses into Doppio's unstable identity signal. This contrast is useful and should be intentional.

## Mobile Requirements

Mobile tap target is the quote and active stage. The deformation must be visible even on cropped art.

The scan text should be short and readable above bottom tabs. Continue target must be at least 44px tall.

Reduced-motion users get tap, handprint, Spice Girl snap-in, scan, continue.

## Performance Requirements

Preload Spice Girl assets when near Trish.

Use optimized WebP. Material effects should rely on transform, clip-path, CSS masks, or SVG filters kept within mobile performance limits.

Avoid heavy blur and repeated large filter animation.

## Accessibility

The reveal should announce `Spice Girl Stand Scan unlocked` when the scan becomes readable.

Keyboard activation should work through Enter or Space on the active quote/stage.

The selfhood message must not depend on pink/green color contrast alone.

## Acceptance Criteria

Tapping Trish enters the Spice Girl reveal before advancing to Doppio.

The image bends and rebounds as a material explanation, not a generic wobble.

Spice Girl appears through a handprint/material emergence.

Stand Scan explains softening, resilience, impact absorption, and sentience with English or Japanese UI text only.

Character return frames Trish as self-declaring, not merely protected.

Replay, Previous, Next, tabs, and resize clear all reveal state.

Desktop and mobile layouts keep scan text readable.

Reduced-motion mode remains usable.

The visible first-version copy matches the copy section and stays under 65 English words during the scan and character return.

`WANNABEEE` appears only as a short impact beat and never replaces `I am me!` as the scene's emotional center.

Spice Girl's handprint appears before the full Stand body.

The implementation does not add Chinese UI text.

## Validation Plan

Manual validation should capture idle, soft impact, rebound, handprint, Spice Girl entrance, Stand Scan, character return, mobile layout, and reduced-motion.

Automated validation should confirm tap creates reveal state before scene change, continue moves to Doppio, replay clears reveal classes, and mobile scan does not overlap controls.

Implementation validation should include a keyboard pass, a reduced-motion pass, and a resize pass from desktop to mobile while the scan is open.

## Rollout Note

Trish should be built after the louder combat scenes have established the scan grammar. Her quality bar is elegance and identity. The scene succeeds if the user understands that softness can be power.
