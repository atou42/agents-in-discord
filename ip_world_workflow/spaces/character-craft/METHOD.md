# Character Craft Method — Cards a Creator Can Feel

## 1. Source first, write second

Before writing a card, pull the character's source page(s) and extract: canonical name/aliases, affiliation(s) with era, 3-5 defining events, key relationships with valence, abilities WITH limits, design signature. Check the run's Fan Red Lines for anything touching this character — those facts get double-checked. A card written from memory is a factuality incident waiting for the audit.

## 2. Six sections, each earning its place

- **Identity/profile**: who they are in the world's terms, one strong hook line first. Not a Wikipedia lead.
- **Personality**: temperament + values + one contradiction. Flat-perfect characters read as AI filler.
- **Experience**: the 3-5 events that made them, in world-chronology, each with consequence.
- **Relationships**: named, directional, tension-bearing ("mentor whose death she has not forgiven" beats "knows X").
- **Abilities**: what they can do AND how it shows on screen/page.
- **Limitations**: real costs and weaknesses. This section is where fans judge whether we read the source.

## 3. Dimensionalize with the trait deck (when the source is thin or the card feels flat)

Use the local `character-traits` skill (200 trait method-cards, 96 positive + 104 negative):

- thin secondary character → `draw.py --tier supporting` for a coherent trait set to ground prose
- rich character feeling generic → `draw.py --analyze "<background>"` → semantically pick traits with the most dramatic tension, then rewrite personality/limitations around them
- always keep drawn traits consistent with canon: traits inspire expression, never override source facts

For ORIGINAL worlds (KB4 path) the deck is a primary generator; for IP worlds it is a seasoning tool.

## 4. Batch consistency

Every batch worker receives the same exemplar card (pick the best card of the run so far). After each batch: run the character-card gate on the batch, diff tone/length/structure against the exemplar, fix drift before the next batch starts. Never let two batches ship with visibly different voice.

## 5. Self-check per card

- Could a fan of this IP find a factual error? (check red lines again)
- Does anything on the visible face smell like pipeline? (tags, codes, prompts, URLs)
- Would a creator reading only this card be able to write a scene with this character?
- Is the English natural prose, not translated-sounding?
