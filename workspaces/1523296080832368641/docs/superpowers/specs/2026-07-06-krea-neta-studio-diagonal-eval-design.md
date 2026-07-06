# Krea Neta Studio Diagonal Eval Design

Date: 2026-07-06

## Goal

Design a first-pass large-scale Krea eval for Neta Studio that prioritizes visible differences rather than full combinatorial coverage.

This eval is not trying to prove one global winner. It is trying to expose where outputs diverge across style, IP, subject framing, scene type, shot language, and lighting, while keeping the total run count near 800.

## Core decision

Do not run a full XYZ grid.

Use a sparse diagonal design with balanced contrast coverage:

- at least 100 IPs
- 100 styles selected from the Krea moodboard library
- 800 primary generations total
- each IP receives 8 runs
- each IP is paired with 2 styles
- each style is used by 2 IPs

This gives local within-IP contrast and global cross-IP contrast without exploding the run count.

## What is in scope

The first 800-run pack is for difference discovery across:

- style obedience
- IP recognizability
- subject stability
- scene controllability
- shot controllability
- lighting controllability
- overall image strength

## What is out of scope

This first pack does not try to:

- exhaust all style x IP x scene x shot x light combinations
- benchmark every system parameter
- use native Krea moodboard injection as a runtime input
- optimize for absolute best image quality on a single IP

Native `moodboard` and `styleReference` are currently disabled in the Krea work space. For this eval, moodboards are treated as external style assets. Style is injected through a normalized style pack built from the moodboard library, not through the disabled product feature.

## Current platform constraints

From the current Krea work spec and code:

- `textToImage`, `imageToImage`, `lora`, and `creativity` are available
- `moodboard` and `styleReference` are disabled
- `imageToImage` currently follows source-image size rather than requested width and height

Because this pack is difference-first, not system-debug-first, the first 800 runs should freeze most system parameters and focus on content/style differences.

## Style pool design

### Source pool

Use the already harvested Krea moodboard library:

- 3,549 moodboards
- 56,784 images
- existing top-20 distinctive style pack as seed material

### Neta Studio suitability gate

A style is eligible only if it can plausibly support all four visible Neta Studio surfaces:

- characters
- locations
- objects/symbols
- key visuals or event scenes

Reject styles that are mainly:

- pure texture
- pure UI or HUD overlays
- pure macro abstraction
- single-object packshots
- unreadable distortion gimmicks
- styles that collapse location and character identity into the same visual mush

### Style family stratification

Select 100 styles by family, not by raw novelty score alone.

Use 10 families x 10 styles each:

1. painterly mythic
2. cinematic noir
3. graphic illustration
4. animation or toon-derived
5. gothic or baroque
6. retro printmaking or woodblock
7. solarpunk or futurist worldbuilding
8. tactile or handcrafted material styles
9. surreal but still scene-readable
10. luminous ethereal or environmental atmosphere

Within each family, balance for:

- human character readability
- environment readability
- object/icon readability
- compositional flexibility

Each chosen style should have:

- stable style name
- normalized style description
- normalized style keywords
- family label
- risk flags
- 4 reference previews

## IP pool design

### Sampling rule

Choose at least 100 IPs using Neta Studio diagnosis dimensions, not popularity alone.

Each IP should be tagged on:

- primary family
- asset center of gravity
- visual recognition mechanism
- scale
- time structure
- difficulty profile

### Recommended IP strata

Balance the 100 IPs across at least these world types:

1. mythic fantasy
2. political or institutional
3. gothic or horror-inflected
4. youth adventure
5. modern heroic
6. military-industrial
7. science fiction or cosmic
8. creature or ecology driven
9. cozy or community scale
10. surreal or concept-heavy worlds

Within the 100 IPs, ensure a mix of:

- character-led worlds
- location-led worlds
- faction or organization-led worlds
- system or lore-led worlds
- highly recognizable silhouettes
- highly recognizable environments
- hard worlds for style transfer

## Pairing rule between styles and IPs

Each IP gets exactly two styles:

- Style A: fit style
- Style B: tension style

Fit style means the style naturally supports the IP.
Tension style means the style still fits Neta Studio and remains readable, but pulls the IP into a different visual mood.

Each style is assigned to exactly two IPs:

- one IP from a near-fit world family
- one IP from a different world family

This creates two important contrast paths:

- within-IP style contrast
- within-style cross-IP contrast

## Run template

### Why 8 runs per IP

Five content axes matter in the first pack:

- style: A or B
- subject center: character-led or world-led
- scene mode: iconic static or dynamic event
- shot mode: close or wide
- light mode: bright readable or dark dramatic

The full grid would be 32 combinations per IP and 3,200 runs for 100 IPs.

Instead, use an 8-run orthogonal diagonal based on an L8 two-level array. This keeps each level balanced and keeps pairwise contrasts visible across the corpus.

### Axis level definitions

- Style
  - A = fit style
  - B = tension style
- Subject center
  - C = character-led
  - W = world-led
- Scene mode
  - I = iconic static
  - D = dynamic event
- Shot mode
  - Close = close or medium-close emphasis
  - Wide = wide or establishing emphasis
- Light mode
  - Bright = readable, open, high-clarity lighting
  - Dark = dramatic, low-key, contrast-heavy lighting

### Per-IP diagonal matrix

| Run | Style | Subject | Scene | Shot | Light |
| --- | --- | --- | --- | --- | --- |
| 1 | A | C | I | Close | Bright |
| 2 | A | C | I | Wide | Dark |
| 3 | A | W | D | Close | Bright |
| 4 | A | W | D | Wide | Dark |
| 5 | B | C | D | Close | Dark |
| 6 | B | C | D | Wide | Bright |
| 7 | B | W | I | Close | Dark |
| 8 | B | W | I | Wide | Bright |

Properties of this matrix:

- every axis level appears 4 times per IP
- each IP sees both style fit and style tension
- each style is tested on both character-led and world-led requests
- each style is tested on both iconic and dynamic scenes
- each style is tested on both close and wide framing
- each style is tested on both bright and dark lighting

This is not a pure causal isolation design for each single IP. It is a balanced difference-finding design across the full 800-run corpus.

## Prompt-pack construction

Each IP needs a small canonical prompt pack before generation.

Per IP, define:

- one primary character anchor
- one primary world anchor
- one iconic static moment
- one dynamic event moment
- one close framing description
- one wide framing description
- one bright readable light description
- one dark dramatic light description

These are not eight unrelated prompts. They are one normalized IP pack that can be remixed into the 8-run matrix above.

The important rule is consistency. If the character anchor is changed halfway through, the style comparison stops being useful.

## Execution controls

Freeze these across the first 800 runs unless a run is explicitly marked invalid:

- model
- generation route
- negative prompt policy
- creativity
- LoRA policy
- seed schedule
- output post-processing policy

Recommended first-pack controls:

- generation mode: text-to-image only
- LoRA: off by default
- creativity: fixed mid-band
- seeds: fixed 8-seed cycle reused across all IPs by run index
- native moodboard: off

### Aspect ratio policy

Do not make aspect ratio a separate axis in the first pack.

Instead:

- character-led close runs use one portrait-friendly aspect
- world-led wide runs use one landscape-friendly aspect
- all other aspect choices are inherited from the run template, not explored independently

This keeps the first pack readable and prevents aspect from becoming a silent confounder.

## Evaluation design

### Per-image scoring

Score every run on:

- style obedience
- IP recognizability
- subject fidelity
- scene fidelity
- shot fidelity
- light fidelity
- overall image strength

Use a simple scale with explicit anchors. The first pass should optimize for consistency of judging, not nuance of judging.

### Comparison surfaces

The eval report should support at least four read modes:

- within-IP compare all 8 runs
- within-IP compare Style A vs Style B slices
- within-style compare the two assigned IPs
- global slice compare by axis value, family, and difficulty tags

### Difference-first outputs

The report should emphasize:

- where fit and tension styles diverge most
- which IP families are most style-sensitive
- which shot or light requests collapse under specific style families
- which worlds remain recognizable under tension styles
- which styles are flexible enough for Neta Studio sample-room use

## Deliverables

Before generation:

- `style_pool_100.json`
- `ip_pool_100.json`
- `style_ip_assignment.csv`
- `run_matrix_800.csv`
- `prompt_packs/`

After generation:

- `results_800.csv`
- per-run thumbnails
- contact sheets by IP
- contact sheets by style
- difference report

## Success criteria

The first 800-run pack succeeds if:

- all 100 IPs are covered
- all 100 styles are covered
- every style appears twice on distinct IPs
- every IP has one fit style and one tension style
- every axis level has balanced global coverage
- every major world family has enough runs to compare internally
- the corpus makes it possible to inspect style, IP, subject, scene, shot, and light differences without needing a full 3,200-run grid

## Failure conditions

The pack should be treated as structurally weak if:

- styles are chosen only by novelty and not by Neta suitability
- IPs cluster too heavily into one family
- style A and style B are not meaningfully different
- prompt packs drift within the same IP
- system parameters vary too much between runs
- aspect ratio is allowed to become a hidden extra axis

## Recommended next step

Do not start generating all 800 immediately.

First build and review:

- the 100-style shortlist and family tags
- the 100-IP shortlist and diagnosis tags
- the style-to-IP assignment table
- 5 fully worked IP prompt packs as pilot examples

If those look right, then generate the full 800-run matrix.
