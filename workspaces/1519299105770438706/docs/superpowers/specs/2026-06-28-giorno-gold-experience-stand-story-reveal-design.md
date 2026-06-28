# Giorno Gold Experience Stand Story Reveal Design

Date: 2026-06-28

Status: draft for review

## Purpose

Upgrade the opening Giorno scene from a quote activation into the first complete invitation into *Golden Wind*.

The current scene lets the user tap the quote twice. The first beat locks `I, Giorno Giovanna,` and the second beat expands `HAVE A DREAM`, then the site advances to Bucciarati. That establishes that quotes are touchable, but it does not yet explain why Giorno's dream matters or why his Stand is the correct first gateway into Part 5.

The next version should make the opening feel like this:

The user touches Giorno's declaration. The image answers with life. Gold Experience enters through a controlled bloom of living forms, not a generic gold flash. The site then explains, briefly and visually, that Giorno's Stand gives life to objects and that his dream is not soft optimism. It is a cold, deliberate plan to enter the mafia and change it from inside.

This is the first lesson in the theater. It should make a new viewer understand the premise and make a fan feel that Giorno's elegance, danger, and resolve have been respected.

## Audience

New viewers should leave the scene understanding four things:

- Giorno is the protagonist of Part 5.
- His dream is to become a Gang-Star, not simply to be famous or powerful.
- Gold Experience can give life to objects.
- Giorno's morality is unusual: he can be kind, criminal, calm, and lethal at the same time.

Casual JoJo viewers should recognize the opening declaration, Gold Experience's life-giving ability, the ladybug and bloom language, and the early Passione premise without being asked to read a lore dump.

Giorno fans should feel the tension between grace and threat: the quiet voice, the divine visual language, the DIO shadow, the Jonathan moral thread, the willingness to use violence with surgical calm, and the theme of resolve.

## Product Principle

The order is declaration first, life second, explanation third, destiny fourth.

The user should not be shown a profile card before the scene earns it. Giorno says he has a dream. The user confirms that declaration through a second tap. The world around him starts becoming alive. Gold Experience appears because the user's touch has turned the quote into life. Only after that does the Stand Scan explain the ability and the story layer explain the dream.

This scene is the doorway into the whole site. It must be simpler than later scenes, but not shallow.

## Source Facts

Use these as the factual base for the first implementation.

- Giorno Giovanna is the protagonist of Part 5 and the fifth JoJo.
- He was born Haruno Shiobana and is DIO's son, conceived with Jonathan Joestar's body.
- His childhood was marked by neglect, abuse, bullying, and isolation.
- As a child, he saved an injured gangster by making grass grow around him; that gangster later protected him and taught him that trust and respect could exist.
- This experience shaped Giorno's dream to become a Gang-Star and reform the corrupt Italian mafia.
- Giorno wants to stop the drug trafficking that harms innocent lives.
- He is polite, observant, introverted, ambitious, calm under pressure, and capable of ruthless violence against enemies.
- His defining trait is resolve, or `kakugo`: making a decision and seeing it through.
- Giorno does not treat self-sacrifice as true resolve. His ideal is to carve out a path through danger and survive.
- Gold Experience is Giorno's close-range humanoid Stand.
- Gold Experience can give life energy to objects, transforming them into plants, animals, or body parts.
- Created animals act with their own life and instinct.
- Living things created from part of a whole can instinctively return to that origin, allowing tracking.
- Damage to a lifeform created by Gold Experience can be reflected back to the attacker.
- Gold Experience can infuse living targets with life energy, accelerating their senses and causing an out-of-body perception effect.
- Gold Experience can create flesh and organs from objects. This is replacement, not painless healing.
- Gold Experience has ladybug, scarab, and wing visual associations tied to regeneration, creation, and peace.
- Gold Experience Requiem is the later evolved form created by the Arrow. It should only be foreshadowed in this opener, not explained in full.

References checked:

- https://jojo.fandom.com/wiki/Giorno_Giovanna
- https://jojo.fandom.com/wiki/Gold_Experience
- https://jojo.fandom.com/wiki/Gold_Experience_Requiem

## Current Baseline

The scene key is `dream`.

Current scene data:

- Tab: `Dream`
- Caption: `Dream Declaration`
- Quote: `I, Giorno Giovanna, / have a dream.`
- Number: `Vento Aureo 01`
- Glyphs: `ゴ`, `ゴ`
- Art: `assets/generated/optimized/giorno-dream.webp`

Current interaction:

- `handleGiornoTap` counts up to two taps.
- First tap adds `is-dream-locked` and sets `--dream-beat: 1`.
- Second tap adds `is-dream-vow` and `is-dream-transition`.
- After about 1320ms, the scene advances to Bucciarati's betrayal scene.
- Replay resets `is-dream-locked`, `is-dream-vow`, `is-dream-transition`, and `--dream-beat`.

The next version should preserve the two-tap clarity, but the second tap should not immediately hand off to Bucciarati. It should unlock Gold Experience first.

## Desired Experience

The first tap confirms the speaker.

`I, Giorno Giovanna,` becomes fixed and precise. The frame should feel calmer, not louder. Small life cues begin near Giorno: a brooch pulse, a leaf vein, a tiny insect path, a flower bud forming out of ink.

The second tap confirms the dream.

`HAVE A DREAM` expands, but instead of a simple burst, the typography becomes a living object. Letter edges briefly turn into stems, wings, beetle shells, or small flowers. Gold Experience enters from behind or beside Giorno as if the declaration has given it form.

The entrance should be staged in readable beats:

1. The ladybug emblems on Giorno and Gold Experience echo each other.
2. A small object in the artwork transforms into a living creature.
3. Gold Experience's hand lands in frame, touching the scene surface.
4. A bloom wave travels from the contact point.
5. Gold Experience appears in a full or three-quarter pose behind Giorno.
6. `MUDA MUDA` typography hits once, restrained and sharp.
7. The frame settles into Stand Scan.

The Stand Scan explains Gold Experience with compact visual language.

After the scan, the character return explains the dream. The point is not that Giorno is a pure hero. The point is that he enters a criminal system with a moral target and enough resolve to change it.

Then the user can continue to Bucciarati. The transition should feel like Giorno's dream has opened the road to the first ally, not like a timer moved to the next slide.

## Interaction Flow

Use five local states.

`declaration_idle`: the default scene.

`name_locked`: first tap. Giorno's name locks, the frame quiets, life cues begin.

`dream_ignited`: second tap. The quote becomes active, the life-giving transformation starts, and Gold Experience entrance begins.

`stand_scan`: Gold Experience is readable and the ability scan appears.

`dream_return`: the scene connects the Stand ability back to Giorno's dream and offers continuation to Bucciarati.

The user should be able to continue from `stand_scan` or `dream_return` with click, tap, Enter, Space, or the existing Next control.

Default autoplay is off, so the reveal should wait for the user after the character return. If autoplay is on, the scene may continue after the reveal has been readable long enough, but not before the user has had time to understand the scan.

Replay must return to `declaration_idle`.

Changing tabs, pressing Previous, or pressing Next must clear all Giorno reveal states, timers, and temporary inline styles.

## Motion Direction

Giorno should not explode into the page. He should make the page obey.

Use controlled growth, quick transformation, sharp contact frames, and elegant typography. Avoid a generic golden shockwave, radial light burst, magical sparkle cloud, or soft hero-glow treatment.

The entrance timing target is about 2.6 to 3.4 seconds from second tap to readable Stand Scan.

Suggested beat timing:

- 0.00s: second tap accepted, quote locks into dream state.
- 0.12s: small life cue appears at the contact point or ladybug emblem.
- 0.35s: object-to-life transformation begins.
- 0.62s: Gold Experience hand enters and touches the frame.
- 0.90s: bloom wave crosses the artwork.
- 1.20s: Gold Experience silhouette appears behind Giorno.
- 1.55s: full Stand pose locks.
- 1.70s to 2.05s: one restrained `MUDA MUDA` impact burst.
- 2.35s: Stand Scan becomes readable.
- 4.60s or later: dream return line appears.

Reduced motion should collapse this to three beats: name lock, Gold Experience snap-in, Stand Scan.

## Stand Entrance

Gold Experience should appear as a close companion to Giorno, not as a distant deity.

The best staging is a body emerging from life transformation:

- A flower or beetle-like shell opens in the foreground.
- The Stand hand presses through the living shape.
- The full Stand locks behind Giorno, slightly offset, like a will becoming visible.

The Stand pose should be elegant but ready to strike. It should not look passive, saintly, or purely decorative. Gold Experience is graceful, but it is used with lethal intent.

The entrance should include at least one concrete ability demonstration. Good candidates:

- A brooch turns into a ladybug, then tracks a path across the scene.
- A torn paper shard turns into a vine and anchors the scan frame.
- A coin or luggage fragment becomes a frog for a brief early-Part-5 reference.
- A small impact on a created lifeform rebounds as a graphic counter-hit.

Do not show all of these in the first version. Choose one primary transformation and one tiny supporting cue. The opener should stay clean.

## Stand Scan

The scan should feel like a living anatomy sheet rather than a sci-fi HUD.

It can use parchment, ink contours, botanical veins, ladybug spots, and thin radial measurement lines. It should not look like a medical monitor or a generic RPG stat card.

Core scan content:

`GOLD EXPERIENCE`

`Stand User: Giorno Giovanna`

Ability lines:

`Gives life to objects it touches.`

`Creates plants, animals, and replacement flesh.`

`Life can track, protect, or strike back.`

Bridge line:

`That is why the quote began to bloom.`

The ability radar should be explanatory, not purely canonical. Suggested axes:

- Life Creation
- Adaptability
- Tracking Instinct
- Close-Range Speed
- Resolve Link

If `Resolve Link` feels too interpretive in the final UI, label the radar as `Theater Reading` rather than `Stand Stats`.

Do not include Gold Experience Requiem as a scan mode here. The opener can foreshadow it with a locked final node labeled `Requiem remains ahead`, but the user should not be asked to understand Return to Zero before meeting the team.

## Character Return

After the Stand Scan, bring the focus back from ability to person.

The character reading should frame Giorno through three ideas.

First, he is not an innocent dreamer. He begins the story as a thief, enters Passione deliberately, and accepts criminal methods.

Second, his dream is moral, not naive. He wants to stop a mafia system from destroying children through drugs.

Third, his Stand's life-giving ability matches his role in the team. Giorno repeatedly turns dead ends into paths: tracking enemies, healing allies through replacement, and using life itself as strategy.

Suggested character return copy:

`A dream, not a wish.`

`Giorno enters Passione to change what it does to the innocent.`

`Gold Experience turns objects into life. Giorno turns a criminal path into a chosen one.`

Optional short bridge into Bucciarati:

`The first person who hears the dream clearly is Bucciarati.`

This bridge matters because the next scene is Bucciarati. The opener should make that transition feel like story causality.

## Content Design

All final in-page text must be English or Japanese only. No Chinese appears in the runtime UI.

Keep visible copy short. The first implementation should use no more than about 60 visible English words across Stand Scan and character return at one time.

Candidate entrance text:

`GOLD EXPERIENCE`

`MUDA MUDA`

Candidate scan copy:

`Stand User: Giorno Giovanna`

`Gives life to objects it touches.`

`Life can track, protect, or strike back.`

`That is why the quote began to bloom.`

Candidate character copy:

`A dream, not a wish.`

`He enters Passione to change what it does to the innocent.`

`The road to Bucciarati begins here.`

Candidate optional Japanese accents:

`黄金体験`

`覚悟`

`無駄`

Japanese accents should be decorative or short labels. The explanatory burden should stay in English for first-time viewers.

## Visual Design

The opener should be luminous without becoming soft.

Gold Experience can introduce warm ivory, sharp yellow-gold, ink black, beetle-shell green, and small red ladybug accents. Avoid a one-note gold wash. The current site already uses gold heavily, so Gold Experience needs controlled contrast rather than more yellow.

The living transformation should feel drawn, tactile, and slightly uncanny. It should not become cute nature magic. Flowers, frogs, insects, vines, and flesh replacement are beautiful because they are also tactical and strange.

The Gold Experience asset must match the existing manga-theater direction: hand-drawn ink, textured paper, fashion pose, sharp comic impact, and strong silhouette. Avoid plastic 3D, glossy game render, generic anime screenshot imitation, and angelic fantasy illustration.

The scan frame should grow from the living transformation. It should not slide in as an unrelated interface panel.

## Asset Requirements

The first version needs at least four new assets.

Gold Experience entrance asset:

- Transparent WebP or PNG source.
- Full or three-quarter body.
- Strong readable silhouette at desktop and mobile sizes.
- Pose suitable for appearing behind Giorno.
- No embedded text.

Gold Experience hand/detail asset:

- Cropped hand, ladybug detail, or forearm.
- Used for the contact beat.
- Must read clearly at 390px mobile width.

Life transformation asset:

- A small object becoming a plant, insect, frog, or vine.
- Can be a sprite strip, layered transparent WebP, or CSS-composable image pieces.
- Must feel like Gold Experience's ability, not generic flowers.

Stand Scan frame asset:

- Botanical/radar hybrid sheet.
- Transparent or CSS-composable.
- Should have room for real DOM text.

Optional later assets:

- Giorno childhood grass/bloom fragment.
- Living brooch tracking motif.
- Small `Requiem locked` symbol for late-site foreshadowing.

Generated assets should be original redraws inspired by the current site direction. Do not use direct anime screenshots. Do not imitate one living artist's exact style.

## Information Architecture

The Giorno scene should use the same reveal grammar being defined by Bucciarati, but tuned for opener simplicity.

Recommended scene-local data:

- `standName`
- `standUser`
- `standArt`
- `standDetailArt`
- `lifeTransformArt`
- `standAbilityLines`
- `storyReveal`
- `radarValues`
- `foreshadowLabel`
- `continueLabel`

The markup should be generated from structured data, not hardcoded entirely inside `handleGiornoTap`.

The future architecture should allow all scenes to share reveal components while keeping scene-specific motion and copy.

## State Model

Add a separate reveal state from the current two-tap animation.

Suggested states:

- `idle`
- `name_locked`
- `dream_igniting`
- `stand_entering`
- `stand_scan`
- `dream_return`
- `continuing`

Do not reuse `is-dream-transition` to mean every reveal state. That class currently implies scene advance. The Stand reveal needs explicit state classes so the scene can hold after the second tap.

State cleanup is a quality requirement. Replay, Previous, Next, tab selection, scene change, and reduced-motion switching must remove Giorno reveal classes, timers, temporary objects, and inline styles.

## Transition Rules

The second tap must not immediately advance to Bucciarati.

After `dream_return`, the user continues to Bucciarati manually by tapping the reveal, pressing Enter or Space, or using Next. If autoplay is enabled, the scene may advance after the return line has been readable for at least 2 seconds.

The transition into Bucciarati should use story logic:

- The life bloom compresses into a small tracking line.
- The line points toward the next scene.
- Bucciarati's scene enters as the first person who tests and then believes Giorno's dream.

Do not use a generic fade to black. The opener should hand the story to Bucciarati.

## Mobile Requirements

Mobile must be designed first, not as a cropped desktop version.

The first tap should lock Giorno's name without covering the character's face.

Gold Experience should enter from the side or lower diagonal depending on the mobile crop. It must not block the quote completely during the readable state.

The Stand Scan should occupy the lower middle or lower third above the tabs. It should not cover controls permanently and should not require pinch or precise scrolling.

Touch targets for continue must be at least 44px high.

The transformation cue should be visible near the tap point when possible, but the scene should still work if the user taps the quote rather than the art.

## Performance Requirements

The opening scene is the first impression, so reveal assets must not slow initial rendering.

Load the base Giorno art as today. Preload Gold Experience reveal assets after the first scene is interactive or immediately after the first tap. Do not block first paint on Stand reveal assets.

Use optimized WebP for large Stand assets. Keep large raster reveal assets small enough to avoid visible stutter on mobile.

Prefer transform, opacity, masks, clip-path, and CSS variables. Avoid layout-heavy animation during the entrance.

Do not add video for the first implementation unless the file size and visual quality are clearly better than layered image animation.

## Accessibility

The reveal must be understandable without motion.

Stand Scan text should be real DOM text.

The continue control should be keyboard reachable.

A live region can announce `Gold Experience Stand Scan unlocked` after the Stand Scan becomes readable.

Reduced-motion behavior:

- First tap locks name.
- Second tap shows Gold Experience with a single snap.
- Stand Scan appears immediately after.
- Character return remains available.

Do not hide critical meaning inside images or fast typography only.

## Quality Bar

The feature is not complete if it only adds a Gold Experience picture and a text box.

It is complete when the user's two taps feel like a declaration becoming life, Gold Experience appears because of that declaration, the scan explains the ability, and the final line makes Giorno's dream sharper rather than flatter.

A good version makes a new viewer understand the premise of Part 5. A great version makes a Giorno fan feel the uneasy mix of grace, criminal ambition, and moral resolve.

## Acceptance Criteria

First tap on Giorno locks the name and begins subtle life cues.

Second tap triggers Gold Experience entrance instead of immediately advancing to Bucciarati.

Gold Experience appears as a purpose-built visual asset with at least one clear life-giving transformation cue.

Stand Scan displays Stand name, user, ability summary, and radar without Chinese text.

The character return line explains why Giorno's dream is a plan to change Passione, not a generic ambition.

The user can continue to Bucciarati after the reveal.

Replay resets to the original Giorno state.

Previous, Next, and scene tabs clear the reveal state cleanly.

Desktop and mobile both keep the quote, Stand, scan, and controls readable.

Reduced-motion mode remains usable.

No reveal asset causes obvious first-load or second-tap stutter.

## Validation Plan

Manual visual validation:

- Desktop first tap.
- Desktop second tap and Gold Experience entrance.
- Desktop Stand Scan readability.
- Desktop transition into Bucciarati.
- Mobile first tap.
- Mobile second tap and Gold Experience entrance.
- Mobile Stand Scan readability above tabs.
- Replay during Stand Scan.
- Next during Stand Scan.
- Tab switch during reveal.
- Reduced-motion pass.

Automated validation:

- No JavaScript syntax errors.
- First tap does not advance scenes.
- Second tap produces a Stand reveal state before any scene change.
- Continue action moves from Giorno to Bucciarati.
- Replay clears all Giorno reveal classes and returns to idle.
- Mobile viewport reveal layout does not overlap the bottom tabs.

Screenshots should be captured at these points:

- Initial Giorno opener.
- Name locked.
- Life transformation beat.
- Gold Experience full entrance.
- Stand Scan readable state.
- Dream return line.
- Mobile Stand Scan state.

## Rollout Plan

Build Giorno after Bucciarati's reveal grammar is accepted, or in parallel only if the shared reveal component is already stable.

Giorno should remain the simplest reveal in the set. It defines the onboarding rhythm. Later scenes can be more aggressive, stranger, or more tragic, but the opener must teach users how to read the site.

Do not introduce Gold Experience Requiem here beyond a small optional foreshadow. The final Requiem scene owns that payoff.

## Implementation Decisions

Autoplay off means the reveal waits for the user.

The second tap should enter Stand reveal, not `setScene(current + 1)`.

The scan uses theater-specific axes and should be labeled as interpretive if it includes `Resolve Link`.

The life transformation should be specific enough to teach Gold Experience. Generic plants are not enough unless they clearly emerge from an object Giorno touched.

The transition to Bucciarati should feel earned because Bucciarati is the first major person to hear and test Giorno's dream.

## Self-Review Notes

This spec avoids a wiki-card structure and keeps the opener focused on playable explanation.

It uses Gold Experience Requiem only as a late foreshadow so the first scene does not collapse the whole story into the finale.

All proposed runtime copy is English or Japanese only.

The spec uses concrete scene states, assets, copy, and validation targets rather than empty future-work language.
