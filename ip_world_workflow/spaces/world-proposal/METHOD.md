# Proposal Method — How to Research an IP and Draft the Proposal

Self-contained method for producing `ip_proposal.md`. You should not need to leave this space to know *how* to work; the domain KB (KB1/KB2) deepens this method but is not a prerequisite for following it.

Every rule here is anchored to a real failure. When you feel like skipping a step, read its story first.

## 1. Research the fandom, not just the wiki

Counting Fandom category pages tells you the world's size. It does not tell you what fans care about — and worlds built from surface data get the shape right and the soul wrong. Fans detect that instantly.

Do all of these, not just the first:

- **Walk the category tree, not the root count.** Large IPs hide the real cast inside subcategories (by faction, era, family, allegiance). Naive root counts under-scoped Harry Potter and Star Wars runs before this rule existed. Save raw command outputs to `coverage/observed_surface_evidence/` — the lock requires them.
- **Find the popularity signal.** Community polls, character popularity rankings, fan wiki "trivia" sections. The characters fans rank far above their screen time MUST be in the tier-1 cast, or fans notice the gap immediately.
- **Read what fans argue about.** Talk pages, subreddit stickies, "common mistakes" fan posts. This is where red lines live.
- **Identify the fandom's center of gravity** in one sentence: is it the found-family dynamic? the magic system? the geography? the ships? This sentence drives the Delight Plan and the board's reading order.

## 2. Reference images: two sources or it didn't happen

A reference image is a **fact claim** ("this is what X canonically looks like"), and single-source facts are guesses. One wrong protagonist reference poisons every generated asset downstream — the whole cast gets built to match the wrong face.

The traps are specific and real:

| Trap | Example pattern | Rule |
|---|---|---|
| Same-name character | minor namesake page ranks higher in search | confirm the page's infobox affiliation matches your subject |
| Mid-series redesign | season-2 look used for season-1 contexts | state WHICH design era you chose and why |
| Film vs source divergence | movie look ≠ manga/novel canon | declare the canon line your run follows and match it |
| AU / spin-off versions | mobile-game variant art floods image search | trace the image to a main-canon source |

Format for every entry in Key Reference Images:

```
- <Subject>: <primary-url> — confirmed via <second-source-url> (<which trap this rules out>)
```

Minimum four subjects: at least two protagonists, at least two key locations.

## 3. Fan red lines: the factuality contract

This section is not decoration — the acceptance space samples delivered cards against it. Write facts so specific they can be checked: "the protagonist's eye color changes after chapter 120 and late-arc cards must use the new color", "the two rival factions' sigils must never appear together", "the mentor's death timing is sacred". Each with one sentence of why fans care.

Thin red lines (under ~200 chars) fail the gate, but the real bar is: **could a verifier use this list to catch a wrong card?**

## 4. Cast scoping: the source surface is the floor

State the proposed tier-1 count as a number, next to the observed surface as a number. The Frieren run tried to deliver 5 characters against an 82-page surface; the Cyberpunk run initially locked 18 against 50+. Both got caught, both wasted rework. Scope honestly the first time:

- full-world floor: max(12, 15% of observed character pages) — the lock enforces this
- every tier-1 character will need an archived asset (keyCharacterAssets ≥ tier1) — plan generation budget accordingly
- deliberate exclusions are fine, silent ones are not: name who is out and why

## 5. Style candidates: advise, never decide

The Cyberpunk 2077 run argued itself out of the library's own Cyberpunk style into a generic hero-splash look — the rationale sounded reasonable and was wrong, and no one who knew the IP had reviewed it. That is why this section exists and why the user picks.

For each of 3-5 candidates from the style library (exemplar images: style space `style_index/thumbs/<ID>.png`):

- the library id + exemplar image link/copy
- a reason grounded in THIS IP: cast recognizability, tone fit, the fandom's existing visual culture (what does popular fan art look like? what did licensed adaptations get praised/mocked for?)
- the main risk of choosing it

End with a recommendation and the strongest alternative. Do not pre-commit the run to your recommendation in any other artifact.

## 6. Present, then stop

Post the proposal to the user. **Wait.** Silence is not approval; partial feedback is not approval. When the user replies, update `ip_proposal.md` to match their decisions FIRST, then the approval file is recorded (`checks/ip_proposal_approval.json`, written from the user's explicit reply — never by you preemptively). The gate rejects approvals older than the proposal file, so post-approval edits force re-review. That is intentional.

## Quality self-check before presenting

- Would a creator who knows this IP feel understood, or feel fobbed off?
- Can every number be traced to saved evidence?
- Does every reference entry name the trap it ruled out?
- Could the red lines catch a wrong card?
- Are the style reasons about THIS IP, or could they be pasted into any proposal?
- Check the counter-example library (domain KB2) for numbered failure cases matching your draft.
