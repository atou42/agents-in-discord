# Style Selection Method — Audition, Don't Vibe

## 1. Judge against the reference pack, at the right scale

Style is chosen against the run's Fandom reference pack (`references/fandom_reference_pack.json`), never against memory or genre vibes. The pack floor scales with cast size (tier1 ≥ 20 → roughly tier1/3 subjects, tier1/2 images) — judging a 30-character world on 5 subjects is exactly how the wrong art direction won once. If the pack is below the scaled floor, send it back before comparing anything.

## 2. Shortlist from the library by fit hypothesis

Walk the 6 families (AN/3D/IL/SK/GR/PT + SP plus-entries) and shortlist 3-5 whose core mechanism plausibly matches the IP's visual identity. Always include the "obvious" candidate if one exists (an IP named Cyberpunk gets the Cyberpunk entry in the shortlist — rejecting it requires evidence, not rhetoric).

## 3. Audition each candidate

For each shortlisted style, against the reference subjects ask:
- **Cast recognizability**: do silhouettes, faces, costume signatures survive this rendering language?
- **Tone fit**: does it carry the IP's register (gritty/quiet/heroic/comedic) across characters AND locations AND events?
- **Fandom visual culture**: what does popular fan art look like? what did licensed adaptations get praised or mocked for?
- **Range**: can one prompt system cover portraits, environments, objects, KV without splitting into unrelated looks?

Where feasible, generate 1-2 test images per finalist using the library prompt on a reference subject (KB3's audition protocol has the full 14-item version).

## 4. The reason test

An IP-grounded reason names THIS IP's features: "linework density matches the original serialization art" passes; "premium quality with strong material rendering" could be pasted into any proposal — rewrite it. Every candidate also gets its main RISK stated (what this style will do badly for this IP).

## 5. Present and stop

Recommendation + strongest alternative, exemplar images attached, risks visible. The user picks. Record provenance (library ids, session ids) in `references/style_selection_evidence.md`. If the user's pick differs from your recommendation, that is the outcome — implement it without relitigating.
