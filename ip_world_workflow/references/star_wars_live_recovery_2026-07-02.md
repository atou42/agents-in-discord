# Star Wars Live Recovery 2026-07-02

This is the recovery report for the real Star Wars Studio world that was already live from the previous run.

## Live identifiers

- Studio world ID: `world_01KWF1W5VGDJBPXS4FRXDY49HB`
- Cohub space ID: `6ada2271-5645-48c2-9e51-ead4d1350c23`

## What was verified again

- shared browser is still alive on the machine-wide CDP config
- Studio owner session is still valid
- `GET /api/worlds/world_01KWF1W5VGDJBPXS4FRXDY49HB` returns `phase=ready`
- `spaceId` is still bound to `6ada2271-5645-48c2-9e51-ead4d1350c23`
- workspace model still contains the manual image work

## Board recovery

The board was not in an acceptable state at the start of this recovery pass.

Observed before board fix:

- placements count: `71`
- kinds:
  - `atom`: 65
  - `section-title`: 2
  - `section-body`: 2
  - `world-title`: 1
  - `world-prologue`: 1
- the manual image work was not present in board placements

The board was then rewritten to a full five-section layout based on the actual 65-atom live package.

Observed after board fix:

- placements count: `78`
- kinds:
  - `atom`: 65
  - `section-title`: 5
  - `section-body`: 5
  - `work`: 1
  - `world-title`: 1
  - `world-prologue`: 1

Recovered section titles:

- `characters`
- `locations`
- `factions-orders`
- `lore-and-artifacts`
- `events-and-eras`

Recovered work placement:

- `work:work_manual_7463fb2ac1d24f1c`

## Work state

The Star Wars recovery world still has one concrete image work:

- work ID: `work_manual_7463fb2ac1d24f1c`
- title: `Star Wars Visual Reference - Coruscant Skyline`
- media ID: `image_manual_7463fb2ac1d24f1c`

The work remains linked to the Coruscant atom and remains readable from the workspace model.

## Cover recovery status

Start of this recovery pass:

- `ready`: 33
- `generating`: 32
- `failed`: 0

After bulk re-scheduling the remaining generating covers:

- `ready`: 44
- `failed`: 21
- `generating`: 0

So the cover pipeline is not dead, but it is not healthy enough to finish acceptance.

## Failure pattern

Most failed covers are not content-schema failures. They are provider-route failures.

Main recurring failure:

- `seedream-5.0-lite` channel unavailable
- upstream returns HTTP 500 with `get_channel_failed`

Additional isolated failure:

- one Gemini run returned prohibited-content or no-image style blocking on a major hero sample

This means the remaining gap is now concentrated in image generation infrastructure, not in world creation, space binding, import shape, or board structure.

## Current acceptance state

The following are now real and verified:

- real Studio world
- real bound Cohub space
- 65 imported atoms
- unified world config and visual style
- fixed board structure with all five sections
- one concrete image work on the board

The world is still not fully accepted because all atom covers are not yet `ready`.

## Cover regeneration pass

The failed cover set was then repaired by replacing provider-failed covers with manually regenerated image works and re-binding those works back onto the affected atoms.

Real regenerated cover works now present in the live space:

- Luke Skywalker
- Han Solo
- Darth Vader
- Anakin Skywalker
- Obi-Wan Kenobi
- Yoda
- Din Djarin
- Rey Skywalker
- Kylo Ren
- Clone Wars
- Great Purge of Mandalore
- Darksaber
- X-wing starfighter
- Death Star plans
- Beskar
- Mandalorians
- Chewbacca
- R2-D2
- C-3PO
- Grogu

Leia Organa had already been repaired earlier in the same pass and is included in the final accepted state.

## Final accepted state

Final Cohub-side verification:

- `manifest.json` atoms: `65`
- `manifest.json` works: `22`
- cover status: `65 ready`, `0 failed`, `0 generating`
- media status: `22 ready`
- no `manifest.json.lock`
- no `artifacts.json.lock`
- no `*.tmp-*`

Final manifest repair check:

- `repair manifest --dry-run` now reports identical before/after counts for both manifest and artifacts

Public URL checks:

- Grogu regenerated cover URL returns `200 image/png`
- Luke regenerated cover URL returns `200 image/png`
- legacy manual image work URL returns `200 image/png`

Studio placements readback after the regeneration pass:

- placements count: `98`
- kinds:
  - `atom`: 65
  - `work`: 21
  - `world-title`: 1
  - `world-prologue`: 1
  - `section-title`: 5
  - `section-body`: 5

Verified work placement:

- Grogu regenerated work is present in live Studio placements

Observed discrepancy:

- `work list` returns `22` image works, including the older manual Coruscant reference work
- Studio placements currently report `21` work cards, so the legacy manual reference work is still not echoed back by the placements API even though it remains live in Cohub files and its public media URL is healthy

## Verdict

`PASS` for the atom-cover regeneration and acceptance target.

The live Star Wars Studio world is now in a fully accepted cover state:

- all 65 atom covers are `ready`
- all regenerated cover assets are written into the real world
- public image assets resolve
- board placements contain atoms plus regenerated work cards
- Cohub indexes are repaired and clean
