# Mista Sex Pistols Stand Story Reveal Design

Date: 2026-06-28

Status: draft for review

## Purpose

Upgrade the Mista unlucky number scene from four gunshot beats into a small Stand-and-character reveal.

The current scene already has the correct playable shape: the user taps four times, each shot leaves visible damage, and the fourth shot turns into a bad-luck transition. The next version should keep that rhythm but change the meaning of the fourth beat. After four visible shots, the scene should stop behaving like a generic gun effect. Sex Pistols should enter as small, loud, mischievous bullet riders who explain why Mista's bullets do impossible things and why the number 4 makes him panic.

This reveal must explain the superstition, the Stand's personality, and the bullet-redirection ability through the experience first. It should not become a character card pasted on top of the scene.

## Audience

New viewers should understand that Mista is a gunslinger, that Sex Pistols are six tiny Stand entities, that they ride and kick bullets to change their path, and that the missing No. 4 is tied to Mista's fear of the number 4.

Casual JoJo viewers should immediately recognize the joke and the tactical idea: the fourth shot is funny because Mista hates 4, but dangerous because the Pistols can turn a straight bullet into an ambush.

Mista fans should feel that the scene respects the full character. He is easy-going and comic, but he is also a calm, brutal, loyal fighter who keeps moving even when a plan hurts him. The reveal can be playful, but it must not reduce him to only a superstition gag.

## Product Principle

The order is experience first, explanation second, character meaning third.

The user should count the shots before reading about the count. The Pistols should appear by riding the bullets the user fired. The scan should explain the Stand only after the user has seen the bullets curve, argue, and refuse the number 4. The character reading should land after the ability is understood.

The scene should feel like a noisy interruption inside the quote theater: Mista fires, the number 4 appears, the Pistols burst into the frame, and the bad-luck pause becomes a reveal instead of an immediate exit.

## Source Facts

Use these as the factual base for the first version.

- Guido Mista is a core ally in Vento Aureo, a member of Passione and Bucciarati's team, and a Stand user who fights with a revolver.
- Mista is laid-back and sociable outside battle, but serious, proactive, and tactically direct during combat.
- Mista has tetraphobia, a fear of the number 4. When the number is visible or mentioned, he becomes anxious and paranoid.
- Sex Pistols is Mista's Stand.
- Sex Pistols is composed of six tiny bullet-like entities that live in Mista's revolver.
- The Pistols are numbered 1, 2, 3, 5, 6, and 7. No. 4 is omitted because of Mista's superstition.
- The Pistols have distinct personalities. They are childish, irreverent, noisy, prone to arguing, and need to be fed.
- The Pistols ride bullets Mista fires and kick them to redirect their paths.
- They can help with ricochets, bullet deflection, scouting, and reloading.
- Mista's Stand requires a gun and ammunition for offense. It is not a Stand-generated gun.
- No. 5 is timid and often bullied, but can become crucial because it survives when others are in danger.

References checked:

- https://jojo.fandom.com/wiki/Guido_Mista
- https://jojo.fandom.com/wiki/Sex_Pistols

## Current Baseline

The scene key is `mista`. It shows the quote `Four is / bad luck.` with the caption `Bullet Superstition`.

The scene uses `scene-gun` styling, a `mista-shot-layer`, and tap handling through `handleMistaTap`. Each tap increments `sceneInteraction.mistaShots` up to 4. Every shot creates a `mista-impact` mark at the tap position, kicks the quote, flashes a shot line, and marks the scene as damaged.

On the fourth shot, the current implementation adds `is-mista-bad-luck` and `is-mista-transition`, then advances to the next scene after about 960ms. Reset clears the shot count, timers, Mista classes, shot variables, and shot layer children.

The new work should preserve the four visible shots and the tactile tap rhythm. The change is what happens after the fourth shot lands.

## Desired Experience

The user taps the scene once. A bullet hole appears. A tiny yellow-orange figure flickers at the bullet line for a few frames, too fast to understand.

The second tap makes the shot line bend slightly. A Pistol rides the bullet and kicks it off-axis. The scene still mostly reads as Mista firing.

The third tap makes the Pistols harder to miss. Two or three tiny figures crowd the bullet trail, shout over each other, and leave small numbered flashes: 1, 2, 3.

The fourth tap does not instantly exit. The scene hits a short silence. The bullet impact enlarges, the quote compresses, and the number `4` starts to appear as a bad omen.

Before the bad-luck frame can take over, Sex Pistols swarm the screen and physically reject the number. No. 1, No. 2, No. 3, No. 5, No. 6, and No. 7 ride in on curved bullet paths. There is a visible gap where No. 4 should be. No. 5 can lag behind or wobble in, making the group feel alive.

The bullet path then becomes the explanation. The shot the user fired bends through the Pistols' kicks and lands on a new mark that could not have come from a straight line. The user sees the ability before reading it.

After this entrance, the scene shifts into Sex Pistols Scan.

The scan should show the Stand name, user name, a compact ability radar, and short ability lines. It should also include one bridge line that connects the four taps to Mista's superstition and one character line that returns the scene to Mista's courage under pressure.

Then the user can continue to the next scene.

## Interaction Flow

The default flow has five states.

`shot_counting`: the current first three taps. Each tap creates a bullet hole and a small Pistol tease.

`fourth_bad_luck_hold`: triggered after the fourth visible shot. The scene pauses instead of advancing. The quote and bullet damage tighten around the idea of 4.

`pistols_entrance`: Sex Pistols interrupt the bad-luck hold, ride in on curved bullet paths, and expose the missing No. 4.

`stand_scan`: the Stand name, user name, ability summary, numbered Pistols, and radar become readable.

`character_return`: the scene connects the comedy of the superstition to Mista's fighting style, then allows or triggers transition to the next quote.

Manual exit should be available in `stand_scan` and `character_return`. A click, tap, Enter key, or Next button should continue. If autoplay is off, the default should wait for user action. If autoplay is on, auto-advance may happen only after the scan and character return have both been readable.

Replay must restart from zero shots, with no Pistols visible.

Previous, Next, and scene tabs must always work and must clear the reveal state.

## Motion Direction

The motion should feel fast, noisy, and tactical. It should not feel like a military HUD or a clean sci-fi targeting effect.

The Pistols should move like tiny riders with individual timing. They can skid, kick, cling to bullet trails, shove each other, and pop into the frame with short squash-and-stretch. Use quick motion holds so the user can actually see their silhouettes.

The fourth-shot timing target is about 3.0 to 4.0 seconds from the fourth tap to readable Stand Scan. The full reveal can be slightly longer than Bucciarati because the count and group entrance need comedy timing.

Suggested fourth-shot beat timing:

- 0.00s: fourth impact lands and `FOUR IS BAD LUCK` compresses.
- 0.16s: sound and motion drop into a short bad-luck silence.
- 0.36s: a large `4` ghost appears and immediately cracks or gets shoved off by the Pistols.
- 0.58s: No. 1 rides across the main bullet line and calls the group in.
- 0.76s: No. 2 and No. 3 kick the bullet path into a visible curve.
- 1.02s: No. 5 appears late, panicked, then accidentally saves the curve from breaking.
- 1.28s: No. 6 and No. 7 arrive hard and complete the redirection.
- 1.62s: six numbered Pistols line up for a split second: 1, 2, 3, 5, 6, 7.
- 1.88s: the missing 4 gap is highlighted by absence, not by a lecture.
- 2.20s: the redirected bullet lands on a new impossible impact.
- 2.70s: Sex Pistols Scan begins to form.
- 3.30s: scan text is readable.
- 5.60s or later: character return line becomes available or starts.

Use hard cuts, comic impact frames, short typography bursts, and curved bullet trails. Avoid long fade-ins, glowing orbs, generic smoke, and photoreal muzzle-flash spectacle.

## Visual Design

Sex Pistols should be purpose-built visual assets, not simple dots, generic bullets, or tiny copies of one symbol.

They should read as six distinct small bodies at a glance: teardrop heads, bold eyes, crooked teeth, pointed shoulder shapes, small limbs, and visible number markings. The design should be original redraw in the site's manga-theater language, not direct anime screenshots.

The palette can introduce hot yellow, orange, black ink, cream, and sharp teal accents. The existing Mista scene already uses black, cream, and teal damage marks. Sex Pistols can add the hotter layer so they feel like living sparks around the bullets.

The missing No. 4 should be visualized with an empty slot, skipped count, or snapped number track. Do not show a full No. 4 Pistol character. The absence is the point.

Mista's quote should remain dominant at first. During the entrance, it can be squeezed, shoved, and partially covered by the Pistols. During the scan, the quote can echo as a smaller line so the Stand and ability are readable.

The reveal should keep the stage messy in a controlled way. Bullet holes, curved trails, and tiny character silhouettes can overlap, but the Stand Scan text must stay clear.

## Content Design

All in-page text must be English or Japanese only. No Chinese appears in the final site UI.

The first version should use short text and let the animation carry the joke.

Stand entrance text:

`SEX PISTOLS`

`Stand User: Guido Mista`

Number line:

`No. 1 / 2 / 3 / 5 / 6 / 7`

Ability lines:

`Six tiny Stands ride Mista's bullets.`

`They kick shots off-course and turn straight fire into angles.`

`There is no No. 4. Mista refuses that number.`

Bridge line:

`That is why the fourth shot does not leave cleanly.`

Character return line:

`Mista panics at 4, but he does not run from the fight.`

Optional short story line:

`The joke is real. So is the aim.`

Quote echo:

`Four is bad luck.`

Do not overload the first version with more than about 65 visible English words in the reveal. Longer lore can come later through an optional inspect mode.

The tone should be punchy and slightly mischievous. Avoid encyclopedia phrasing such as `tetraphobia is defined as...` in the primary reveal. The word can appear in hidden metadata or a later inspect mode, but the visible scene should say what the viewer needs: Mista fears 4, so his Stand skips it.

## Character Reading

The reveal should frame Mista through three ideas.

First, he is funny because his superstition is extreme and specific. The site should let that comedy breathe. The fourth shot should have a real pause, not a throwaway caption.

Second, he is dangerous because the superstition does not make him weak. He is a gunslinger who stays calm under fire, takes initiative, and turns risky angles into wins.

Third, Sex Pistols externalize his personality. They are loud, hungry, argumentative, loyal, and strangely effective. They make Mista's fighting style feel social: one man with a revolver, but six tiny voices turning every shot into a group decision.

The scene should not present Mista as stupid, cowardly, or only comic relief. The better reading is relaxed fighter, superstitious survivor, loyal teammate, and tactical shooter.

## Stand Scan / Ability Radar

The Stand Scan should be compact and graphic. It should feel like the bullet trails have snapped into a readable diagram.

Required scan elements:

- Stand name: `Sex Pistols`
- User: `Guido Mista`
- Entity count: `Six Pistols`
- Numbers: `1 2 3 5 6 7`
- Missing number note: `No. 4 skipped`
- Ability summary: bullet riding and redirection
- One short character line

The ability radar can use five axes:

- Bullet Redirection
- Team Autonomy
- Reaction Speed
- Reload Support
- Bad-Luck Pressure

`Bad-Luck Pressure` is a theater-reading axis, not a canon Stand stat. It should be labeled as part of this site's scan language if there is any risk of confusion.

The radar should not imply Sex Pistols creates bullets from nothing. It should make clear that Mista supplies the revolver and ammunition, while the Pistols steer, kick, scout, and reload.

## Asset Requirements

The first version needs at least these assets.

Sex Pistols group entrance asset:

- Six separate transparent WebP or PNG sprites, or one sprite sheet with clean individual frames.
- Clear number markings for 1, 2, 3, 5, 6, and 7.
- No No. 4 character.
- Readable silhouette at mobile size.
- No embedded long text.

Bullet rider poses:

- At least three pose variants: riding, kicking, shouting.
- No. 5 should have one timid or panicked pose.
- No. 1 or No. 7 should have one leader/initiator pose.

Bullet trail assets:

- Curved comic trail that can be transformed without blur.
- Small kick impact burst.
- Redirected impact mark distinct from the original four bullet holes.

Stand Scan frame:

- A compact manga diagram frame or CSS-composable scan layer.
- Number track with the skipped No. 4 position.
- Ability radar background that does not look like a sci-fi HUD pasted over the scene.

Optional later assets:

- Tiny salami/feed gag for an inspect mode only.
- Close-up Mista revolver chamber.
- Individual Pistol expression sprites for idle chatter.

If generated assets are used, prompts should ask for original small manga-theater creatures compatible with the current site. Do not use direct anime screenshots. Do not imitate a single supplied artist's exact style.

## Mobile Requirements

Mobile must preserve the count and the reveal without demanding precise taps.

Every tap anywhere on the active Mista stage should count unless the target is a control. Bullet holes should appear near the tap point but clamp away from the bottom controls and extreme edges.

During the first three shots, the tiny Pistol teases can be larger than desktop so the user notices them. During the fourth reveal, use fewer simultaneous trails and larger silhouettes. Six Pistols can line up in an arc or number row across the middle rather than swarm the whole viewport.

The Stand Scan should sit above the bottom tabs. It can occupy the lower third or center band, but text must remain readable on a 390px wide viewport.

Touch targets for continue must be at least 44px high.

The reveal should not require hover, precise drag, or double-tap timing.

## Performance / Accessibility Constraints

Preload Mista reveal assets only when the user is on or near the Mista scene. The first page load should not eagerly fetch every future Stand reveal asset.

Use optimized WebP for larger sprites and SVG or CSS for simple bullet trails where possible. Keep the group readable with a small number of composited layers.

Prefer transform and opacity animation. Avoid animating layout-heavy properties during the reveal.

The reveal must be understandable without relying only on motion. The Stand Scan text should exist in real DOM text, not inside a raster image.

Keyboard users should be able to trigger shots with Enter or Space when the active stage has focus, and continue from the scan with Enter.

Reduced-motion users should get a shortened version: four shot states, one curved-bullet snap, Pistols lineup, scan appears. Do not use rapid flicker in reduced-motion mode.

The scene label should remain useful for screen readers. A live region can announce `Sex Pistols Stand Scan unlocked` after the fourth shot reveal begins.

Do not use flashing patterns that create seizure risk. The fourth-shot bad-luck frame should use a short contrast hit, not repeated strobing.

## State Cleanup

The reveal needs state that is separate from the existing shot count.

Suggested states:

- `idle`
- `shot_counting`
- `fourth_bad_luck_hold`
- `pistols_entering`
- `stand_scan`
- `character_return`
- `continuing`

Do not reuse `is-mista-transition` to mean the full reveal. That class currently means the fourth shot is exiting to the next scene. The reveal needs explicit classes so the fourth shot can hold, show Pistols, enter scan, and only then continue.

State cleanup is a quality requirement. Leaving the scene, replaying, pressing Previous, pressing Next, selecting a tab, or toggling replay during the scan must remove all reveal classes, timers, temporary inline shot variables, temporary Pistol nodes, and live-region messages.

Shot count must reset when leaving Mista. Replay must clear all four bullet holes and all Pistols, not only the transition class.

If the user triggers Next during `pistols_entrance`, the scene should leave cleanly without waiting for delayed timers to fire. No delayed timer from Mista may advance a later scene after the user has already navigated away.

## Acceptance Criteria

Four visible shot interactions still occur before any reveal.

The fourth shot no longer advances immediately to Fugo. It enters a Sex Pistols reveal sequence.

Sex Pistols appear as six small, distinct bullet-rider entities, numbered 1, 2, 3, 5, 6, and 7.

No No. 4 Pistol appears. The skipped number is legible through staging.

The reveal demonstrates bullet redirection visually before explaining it in text.

Stand Scan displays the Stand name, user, entity count, number skip, ability summary, and radar without Chinese text.

The character return line connects Mista's fear of 4 to his courage and fighting style without making him only a joke.

The user can continue to the next scene after the reveal.

Replay resets Mista to zero shots.

Previous, Next, and scene tabs clear the reveal state cleanly.

Desktop and mobile both keep the Pistols, scan text, quote, and bottom controls readable.

Reduced-motion mode remains usable and avoids rapid flicker.

No new asset causes obvious loading stutter during the reveal.

## Validation Plan

Manual visual validation:

- Desktop first shot.
- Desktop second shot with slight redirection tease.
- Desktop third shot with visible Pistol presence.
- Desktop fourth shot bad-luck hold.
- Desktop Pistols lineup with missing No. 4.
- Desktop Stand Scan readability.
- Desktop character return readability.
- Mobile four-tap flow at 390px width.
- Replay during Stand Scan.
- Next during Pistols entrance.
- Tab switch during Pistols entrance.
- Reduced-motion pass.

Automated validation:

- No JavaScript syntax errors.
- Fourth Mista tap produces a reveal state before any scene change.
- Continue action moves from Mista to Fugo.
- Replay clears shot count, bullet holes, Pistols nodes, reveal classes, and timers.
- Scene navigation from Mista cancels delayed Mista timers.
- Mobile viewport layout does not overlap bottom tabs.

Visual screenshots should be captured at these points:

- One shot visible.
- Three shots visible.
- Fourth bad-luck hold.
- Pistols riding the curved bullet.
- Number lineup showing 1, 2, 3, 5, 6, 7.
- Stand Scan readable state.
- Character return state.
- Mobile Stand Scan state.

## Implementation Boundary

This spec does not require code changes yet.

The first implementation should be scene-local to Mista, but the data shape should stay compatible with the Bucciarati Stand reveal grammar. The goal is not to build a global lore system. The goal is to prove that a quote interaction can unlock a Stand story reveal without turning the theater into a wiki page.

Do not add Stand reveals to every scene until Bucciarati and Mista both pass quality review. Mista is the noisy, comic, tactical version of the reveal pattern. Bucciarati is the elegant, moral, spatial version. Together they define the range.

## Implementation Decisions

Autoplay off means the reveal waits for the user after the character-return beat. The fourth shot should not immediately advance to Fugo.

The fourth shot is the hinge. It must be funny, tense, and legible as Mista's superstition, not just a bigger bullet effect.

Sex Pistols must appear as six distinct entities with no No. 4. If the number skip is not readable, the reveal misses the point.

Bullet redirection should be demonstrated before the scan text explains it. The user's four taps should feel like commanding a team, not clicking a counter.

All scan copy remains English or Japanese only, and all explanation text must be real DOM text.
