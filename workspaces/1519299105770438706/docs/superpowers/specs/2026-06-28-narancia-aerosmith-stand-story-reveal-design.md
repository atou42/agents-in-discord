# Narancia Aerosmith Stand Story Reveal Design

Date: 2026-06-28

Status: draft for review

## Purpose

Upgrade the current Narancia scene from a three-hit target interaction into a playable reveal of Aerosmith and Narancia's decision to follow Bucciarati.

The existing lock-on mechanic already has the right bones: the user searches the image, moves toward a target, confirms the lock, and repeats until the scene launches into Mista. The next version should make those three locks feel like Aerosmith's carbon dioxide radar reading breath under pressure. After the third lock, the scene should not leave immediately. It should let Aerosmith fully enter, show a compact Stand Scan, then connect the scan back to Narancia's line: `I'm going with / Bucciarati!`

The design goal is not to add a lore popup. The goal is to make the user feel that Narancia is not simply aiming at targets. He is finding a signal, confirming what matters, and choosing the people who gave him a place to belong.

## Audience

First-time viewers should understand that Narancia has a small airplane Stand named Aerosmith, that Aerosmith tracks breathing through carbon dioxide, and that Narancia's quote is a choice to follow Bucciarati after the gang becomes traitors.

Casual JoJo viewers should recognize the radar, the machine-gun violence, the fast aircraft movement, and the church-boat choice without needing a long recap.

Narancia fans should feel that the scene respects his contradiction: loud, rough, reckless, and childish on the surface, but deeply loyal because abandonment and betrayal shaped him. The reveal should make him feel emotional without sanding off his violent energy.

## Factual Base

Narancia Ghirga is a major ally in *Vento Aureo*. He is a member of Team Bucciarati and a Passione member before Bucciarati's betrayal. He fights with Aerosmith, a miniature fighter plane Stand.

Aerosmith is a small aircraft Stand with two underwing machine guns and a bomb. It is nimble, aggressive, and battle-oriented. Its key scouting ability is a carbon dioxide radar that lets Narancia detect life forms by the breath they exhale. The radar appears near Narancia's right eye and shows sources as circular blips. Larger carbon dioxide emissions create larger blips. The ability can be confused by crowds or large fires, but Narancia can still deduce meaning from blip behavior.

Narancia's backstory matters to this scene. His mother died, his father neglected him, and an older friend framed and abandoned him. After release from detention, he was shunned and had nowhere to go. Bucciarati was one of the first people to treat him as human, helped get him medical care, and tried to keep him away from the gang life. Narancia valued friendship intensely and became loyal to Bucciarati.

At San Giorgio Maggiore, Bucciarati reveals that the Boss intended to kill Trish and that anyone following him will be branded a traitor. Narancia wants Bucciarati to order him to come, but Bucciarati leaves the choice to him. Narancia sees Trish's injuries, remembers being abandoned by people he trusted, and decides to swim after the boat. His choice is not tactical confidence. It is recognition: Trish is like him, and Bucciarati's group is the place where he refuses to abandon someone else.

References checked:

- https://jojo.fandom.com/wiki/Narancia_Ghirga
- https://jojo.fandom.com/wiki/Aerosmith

## Current Baseline

The scene key is `narancia`. It shows the quote `I'm going with / Bucciarati!`, uses the tab label `Narancia`, the class `scene-flight`, and the caption `Aerosmith Takes Off`.

The current scene preloads `NARANCIA_ASSETS`, including Aerosmith side, dive, and close aircraft art, radar lock-on art, CO2 blips, lock path, bullet holes, impact streaks, and sparks.

On pointer down, `startNaranciaLock` chooses a target from `getNaranciaTargetPool`, stores the pointer, starts the radar state, and places Aerosmith and the reticle. During movement, `updateNaranciaLock` calls `setNaranciaPointer`, which updates aircraft position, target distance, path angle, path width, impact coordinates, lock progress, and the `is-flight-locked` class. On release, `finishNaranciaLock` treats progress above `.98` as success.

Each success increments `naranciaLocks`. The first two successes show hit feedback, then pick a new target after about 520ms. The third success adds `is-flight-launch` and switches to the next scene, Mista, after 1500ms. Failure plays a weak flyby and returns to the scene.

The current visual language is already close: cream paper, teal shadow, black ink, gold accents, speed lines, radar blips, crosshair cursor, aircraft overlays, bullet damage, and hard stepped animation. The new work should extend this language instead of replacing it.

## Desired Experience

The scene begins as it does now: a fast Narancia image with Aerosmith already present as a playable aircraft/radar layer.

When the user presses, the photo should feel like it has become a radar screen. CO2 blips breathe across the image. The lock target should not read as a random UI marker; it should read as a signal source. The user moves Aerosmith toward a breathing trace, and the reticle tightens as the plane commits to the target.

The first successful lock confirms the mechanic. The second successful lock confirms that Aerosmith is not merely shooting; it is reading breath and movement. The third successful lock becomes the story trigger. Instead of leaving immediately, the final lock makes Aerosmith dive through the scene, circle back into a hero read, and unlock the Stand Scan.

After the Stand Scan, the experience narrows from ability to character. Narancia's line returns. The text should make one clean point: he follows Bucciarati because Bucciarati gave him belonging, and because Trish's abandonment mirrors his own.

The reveal then lets the user continue to Mista. The transition to Mista can still use the current launch energy, but only after the story reveal has been seen or skipped.

## Interaction Flow

The default flow has six states.

`radar_idle`: Aerosmith idles over the scene and faint CO2 blips pulse. The quote remains readable. No explanatory copy is visible.

`radar_tracking`: pointer is active. The reticle follows the user position and tightens as it nears the current target. The target is framed as a CO2 source.

`radar_hit_1` and `radar_hit_2`: successful locks create impact feedback and leave a small persistent damage/signal memory. The scene quickly assigns a fresh target.

`radar_hit_3`: the third lock hits harder, but it does not call `setScene(current + 1)` immediately. It transitions into Aerosmith entrance.

`aerosmith_entrance`: Aerosmith exits the target path, whips close to camera, and resolves into a readable Stand reveal.

`stand_scan`: the scan displays the Stand name, user, radar ability, weapons, and a short bridge line connecting the user's locks to Aerosmith's ability.

`character_reveal`: the scan yields to Narancia's choice. The quote returns with a short story line about following Bucciarati and refusing to abandon Trish.

Manual continue should be available in `stand_scan` and `character_reveal`. Click, tap, Enter, or a visible Next control can continue. If autoplay is off, the default should wait. If autoplay is on, continue can happen only after the character reveal has been readable long enough.

Replay must return to `radar_idle` with zero locks. Previous, Next, and scene tabs must clear all Narancia reveal classes, timers, lock counters, target history, and inline positioning values.

## Three-Lock Progression

The three locks should have meaning. They are not three arbitrary hits.

Lock one is detection. The user learns that the bright point is a breathing source. Visual emphasis should be on CO2 blips, radar tightening, and a clean first hit.

Suggested beat text: `BREATH FOUND`

Lock two is interpretation. Aerosmith should reposition to a different part of the frame, and the target should feel less obvious. This suggests Narancia reading radar behavior, not just following a marker.

Suggested beat text: `SIGNAL CONFIRMED`

Lock three is decision. The final target should feel like the point where tracking becomes commitment. The image should briefly align the target, Aerosmith, and Narancia's quote. The hit should not only damage the photo; it should open the reveal.

Suggested beat text: `COURSE CHOSEN`

The lock counter can remain, but it should become secondary. `LOCK 1/3` is useful system feedback. The emotional labels above are better as short manga typography near the impact, timed after the hit. If visual density becomes too high, keep the counter and use only `COURSE CHOSEN` on the third lock.

The third hit should feel like a threshold because the user has completed a scan pattern: detect breath, confirm signal, choose course. This is why Aerosmith appears fully after three successes. The user has proven the Stand's method before the site explains it.

## Aerosmith Entrance

Aerosmith should not appear as a static sticker. It should enter as a Stand with aircraft logic.

The entrance starts at the third impact point. The current `aerosmith-dive` can be used for the first dive. It should rush through the impact, disappear for a beat, then return in a close pass using `aerosmith-close` or a stronger new close asset. The side view can then settle into a composed Stand reveal.

Suggested timing:

- 0.00s: third lock confirmed, `COURSE CHOSEN` appears for a hard beat.
- 0.12s: the target blip blooms into a dense CO2 ring.
- 0.24s: Aerosmith dives through the target and impact streaks tear across the image.
- 0.48s: the scene briefly drops most color except ink, cream, teal, and gold.
- 0.68s: near-camera Aerosmith crosses the quote, large enough to be unmistakable.
- 0.92s: radar blips snap into a circular scan frame around the aircraft.
- 1.18s: the aircraft settles into a readable three-quarter or side pose.
- 1.45s: `AEROSMITH` title locks in.
- 1.85s: Stand Scan becomes readable.

The entrance should feel fast and mechanical, not mystical. Use propeller vibration, reticle snapping, tracer cuts, and paper damage. Avoid soft glow, floating modal cards, blurry bloom, or a detached sci-fi HUD.

Do not use a humanoid Stand entrance grammar here. Bucciarati's reveal can stage a body stepping from a zipper. Narancia's reveal should stage a machine becoming legible through speed, scan, and trajectory.

## Stand Scan

The Stand Scan is a compact scan sheet integrated into the scene. It should feel like the radar has resolved into readable information, not like an encyclopedia panel.

Recommended scan contents:

- `AEROSMITH`
- `Stand User: Narancia Ghirga`
- `Type: Miniature fighter aircraft`
- `Tracks breath through CO2 radar.`
- `Carries machine guns and a bomb.`
- `Fast, loud, and dangerous at range.`
- `You locked onto breath, not a target marker.`

The scan can show a simple radar or stat graphic with axes that mix fact and theater reading:

- CO2 Tracking
- Firepower
- Speed
- Precision Risk
- Loyalty Signal

`Loyalty Signal` is intentionally not a canon Stand stat. It should be visually separated as a theater reading, or labeled `Story Link`, so fans do not read it as official canon.

The Stand Scan should stay under about 55 visible English words. The point is fast comprehension. Longer backstory belongs in the character reveal or a future inspect mode.

The scan should use real DOM text, not text baked into images. It should be readable at mobile sizes and available to assistive technology.

## Character Reveal

After the scan, the aircraft should stop being the whole point. The scene should return to Narancia.

The character reveal should connect three facts. Bucciarati once treated Narancia like a person when others discarded him. Trish has just been discarded by her father. Narancia chooses to follow because he recognizes that wound and refuses to leave her behind.

This should not over-explain his whole childhood. One or two short lines are enough. The emotional center is belonging, not biography.

The current quote should return with stronger staging:

`I'm going with`

`Bucciarati!`

The supporting line should be short:

`He follows the man who gave him a place to belong.`

Optional second line:

`Trish was abandoned too. This time, Narancia will not stay behind.`

This reveal should make deep fans feel the San Giorgio Maggiore choice. It should make first-time viewers understand that the line is not only team loyalty. It is Narancia deciding what kind of person he will be when someone else is abandoned in front of him.

## Asset Requirements

Existing assets that should be reused:

- `aerosmith-side.webp` for idle, search, and settled reveal if it remains sharp enough.
- `aerosmith-dive.webp` for the third-lock dive.
- `aerosmith-close.webp` for the near-camera entrance beat.
- `co2-blip-field.svg` for search and scan texture.
- `radar-lock-on.svg` and `radar-blip.svg` for target and scan framing.
- `aerosmith-lock-path.svg` for tracking trajectory.
- `impact-streak-burst.svg`, `impact-sparks.svg`, and `bullet-hole-cluster.svg` for hit confirmation.

New or upgraded assets needed for a strong version:

- A large transparent Aerosmith reveal asset, preferably side or three-quarter view, clean enough to hold for the Stand Scan.
- A radar scan frame that uses the existing cream, teal, black, and gold palette without looking like a generic sci-fi overlay.
- A small Narancia emotional accent, such as a shadowed eye/radar crop or a restrained silhouette treatment, used only during character reveal.
- Optional tracer typography plates for `BREATH FOUND`, `SIGNAL CONFIRMED`, `COURSE CHOSEN`, and `VOLARE VIA`.

Asset style should stay consistent with the current manga-theater art: textured paper, sharp ink, controlled color, hard impact shapes, and legible silhouettes. Avoid toy-like 3D, screenshot imitation, plastic shine, and generic aircraft stock art.

## Mobile Requirements

Mobile should keep the same three-lock structure, but reduce simultaneous layers.

Targets should stay inside comfortable thumb reach and avoid the bottom controls. The current mobile target pool already clusters targets in the upper and middle image area; the reveal should preserve that discipline.

During tracking, the reticle and aircraft can be larger than desktop relative to the viewport. The target must remain readable under a finger. The lock radius should not demand tiny precision.

During Aerosmith entrance, the aircraft should cross diagonally through the image and settle in the upper or central band. The Stand Scan should occupy the lower third or a centered band above the tabs. It must not permanently cover controls.

The character reveal should prioritize the quote and one supporting line. If both optional story lines do not fit, show only the stronger belonging line.

Touch targets for continue should be at least 44px high. The reveal must not require hover, multi-finger gestures, or rapid repeated taps.

Reduced-motion mobile should compress the entrance into a single dive snap, a stable Aerosmith reveal, and the scan.

## Performance Requirements

Preload Aerosmith reveal assets when the user is on or near the Narancia scene, not on the first page view.

The radar layer must stay responsive during pointer movement. Avoid filter-heavy effects and unbounded DOM creation while the user is steering the aircraft.

Use optimized WebP for large aircraft or character assets. Radar rings, scan lines, and CO2 marks should be CSS, SVG, or small reusable textures.

The third-lock reveal should not request heavy assets after the user has already completed the interaction. Any large Stand asset should be warmed before the third success.

## Accessibility

The reveal must be understandable without motion or audio.

Stand Scan copy should be real DOM text. The stage can expose an action label such as `Lock onto the CO2 signal`.

When the third lock succeeds, a live region can announce `Aerosmith Stand Scan unlocked`.

Keyboard users need an alternate path to build locks through focus and Enter or Space, or through clearly reachable scene controls if precise pointer steering is unavailable.

Reduced-motion mode should compress the reveal into static steps: signal found, Aerosmith appears, Stand Scan, Narancia's choice, continue.

## Content Copy Candidates

Lock feedback:

`BREATH FOUND`

`SIGNAL CONFIRMED`

`COURSE CHOSEN`

Stand entrance:

`AEROSMITH`

`VOLARE VIA`

Stand Scan:

`AEROSMITH`

`Stand User: Narancia Ghirga`

`Tracks breath through CO2 radar.`

`Machine guns. One bomb. No hesitation.`

`You locked onto breath, not a marker.`

Character reveal:

`I'm going with`

`Bucciarati!`

`He follows the man who gave him a place to belong.`

`Trish was abandoned too. This time, Narancia will not stay behind.`

Continue labels:

`Follow the boat`

`Next`

Japanese options:

`エアロスミス`

`ナランチャ・ギルガ`

`ブチャラティについて行く！`

The first implementation should choose English or Japanese per visible group. Do not mix too many languages in the same scan. No Chinese copy should appear in the UI.

## Acceptance Criteria

Completing the third successful Narancia lock no longer switches directly to Mista. It enters the Aerosmith reveal sequence first.

The three successful locks read as a CO2 radar progression, not as arbitrary target clicks.

Aerosmith appears through aircraft motion, scan effects, and a readable reveal pose.

Stand Scan displays the Stand name, user, CO2 radar ability, weapons summary, and a bridge line tying the user's action to the ability.

The character reveal connects Narancia's quote to Bucciarati, Trish, abandonment, and belonging without becoming a generic lore card.

All proposed UI text is English or Japanese only.

The user can continue to Mista from the scan or character reveal.

Replay resets to the original Narancia scene with zero locks.

Previous, Next, and scene tabs clear Narancia reveal state cleanly.

Desktop and mobile layouts keep the quote, scan, and controls readable with no incoherent overlap.

Reduced-motion mode remains usable and still communicates the reveal order: lock completion, Aerosmith, Stand Scan, Narancia's choice.

No large Narancia reveal asset is eagerly loaded on the first page view unless the user is on or near the Narancia scene.

## Validation Plan

Manual validation should capture the idle Narancia scene, first lock, second lock, third lock, Aerosmith entrance, Stand Scan, character reveal, mobile three-lock flow, replay during scan, tab switch during reveal, and reduced-motion path.

Automated validation should confirm that three successful locks are required, the third lock creates a reveal state before scene change, continue moves to Mista, replay resets lock count and target history, navigation clears reveal timers, and mobile layout keeps scan text above the carousel controls.

Screenshots should be captured at these points:

- First breath target.
- Second confirmed signal.
- Third lock launch.
- Aerosmith full reveal.
- Stand Scan readable state.
- Character return line.
- Mobile Stand Scan state.

## Self-Review Notes

This spec follows the Bucciarati reveal grammar but does not copy Bucciarati's body-from-tear staging. Aerosmith is treated as a fast machine Stand whose reveal is earned through radar use.

The three locks have a story shape: detect breath, confirm signal, choose course. That gives the current interaction a reason to exist and explains why the third success unlocks the Stand Scan.

The factual base is grounded in JoJo Fandom pages for Narancia Ghirga and Aerosmith. The character read avoids claiming non-canon Stand stats as official by labeling `Loyalty Signal` as a theater/story axis.

The proposed copy is short, English/Japanese only, and avoids Chinese UI text. The reveal avoids low-quality popup language by requiring integrated scan staging, real motion, and a return to Narancia's emotional decision.

## Implementation Decisions

Autoplay off means the reveal waits for the user after Narancia's character-return beat. The third lock should not immediately advance to Mista.

The three random lock positions remain part of the experience. The reveal should preserve the feeling of searching the sky, not replace it with a scripted cutscene.

The user's locks represent CO2 radar confirmation. The scan must make clear that the target is breath and presence, not an arbitrary marker.

Narancia's emotional reveal should connect belonging, Bucciarati, and Trish without turning into a long biography.

All runtime explanation remains English or Japanese only, and all scan copy must exist as real DOM text.
