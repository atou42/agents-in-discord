# Three IP Studio Worlds Validation Report

Date: 2026-06-27

Skill used: `$neta-studio-world-factory`

Final verdict: `PASS`

This run completed three verified Neta Studio Worlds. Each completed world has a real `world_...` ID, a bound Cohub space, imported atoms, ready covers, a generated image/media work in `manifest.works`, a published web/index work placed on the Studio board, public URLs returning HTTP 200, and no lock or temp-file residue.

## Completed Worlds

| World | Studio Link | World ID | Cohub Space ID | Verdict |
|---|---|---|---|---|
| Harry Potter Fandom Studio World | https://neta.art/world/world_01KW40ZAFNFAF62Z6JHBP02G9G/studio | `world_01KW40ZAFNFAF62Z6JHBP02G9G` | `377f96da-b504-48a8-a43e-e0fe7d08d546` | `PASS` |
| The Lord of the Rings Fandom Studio World | https://neta.art/world/world_01KW4NWE8ASKYE3JPF3XJDR7CE/studio | `world_01KW4NWE8ASKYE3JPF3XJDR7CE` | `e1185b04-2fe3-4ea5-9bbf-2f4ebf64b6f7` | `PASS` |
| The Chronicles of Narnia Fandom Studio World | https://neta.art/world/world_01KW4Q0AM0WN2X8ME4MK0TC5KZ/studio | `world_01KW4Q0AM0WN2X8ME4MK0TC5KZ` | `654c62e8-fdf9-43c9-90b4-7112f090a90a` | `PASS` |

## Cohub Validation

| World | Atoms | Covers ready | Manifest works | Media ready | Locks | Tmp files |
|---|---:|---:|---:|---:|---|---|
| Harry Potter | 57 | 57 | 1 | 1 | none | none |
| The Lord of the Rings | 36 | 36 | 1 | 1 | none | none |
| The Chronicles of Narnia | 36 | 36 | 1 | 1 | none | none |

All three worlds passed `node /mods/neta/neta repair manifest --dry-run` with before/after counts unchanged.

## Studio Board Validation

| World | API status | Board placements | Atom placements | Work placements | Work placement IDs |
|---|---:|---:|---:|---:|---|
| Harry Potter | 200 | 67 | 57 | 2 | `work:works/images/work_01KW439XKV6B150XAWW7854EXH.json`, `work:works/web/hp-world-index` |
| The Lord of the Rings | 200 | 48 | 36 | 2 | `work:works/images/work_01KW4Q5YJSPW0PWDPK9ZZ63WF6.json`, `work:works/web/lotr-world-index` |
| The Chronicles of Narnia | 200 | 48 | 36 | 2 | `work:works/images/work_01KW4Q61P1YZAMVCZ5SSNBZ9AG.json`, `work:works/web/narnia-world-index` |

## Public URL Validation

| World | Web index | Thumbnail | Generated image |
|---|---|---|---|
| Harry Potter | `200 text/html; charset=utf-8` | `200 image/png` | `200 image/png` |
| The Lord of the Rings | `200 text/html; charset=utf-8` | `200 image/png` | `200 image/png` |
| The Chronicles of Narnia | `200 text/html; charset=utf-8` | `200 image/png` | `200 image/png` |

Public URLs:

```text
Harry Potter web:
https://public.cohub.run/s/377f96da-b504-48a8-a43e-e0fe7d08d546/works/hp-world-index/index.html

Harry Potter thumbnail:
https://public.cohub.run/s/377f96da-b504-48a8-a43e-e0fe7d08d546/thumbnail/hp-world-index/preview.png

Harry Potter image:
https://router-files.neta.art/files/fb41f7d7-7f59-4412-8138-a74af331e20e/90586870-98a0-41b1-8694-9c972adb6624.png

The Lord of the Rings web:
https://public.cohub.run/s/e1185b04-2fe3-4ea5-9bbf-2f4ebf64b6f7/works/lotr-world-index/index.html

The Lord of the Rings thumbnail:
https://public.cohub.run/s/e1185b04-2fe3-4ea5-9bbf-2f4ebf64b6f7/thumbnail/lotr-world-index/preview.png

The Lord of the Rings image:
https://router-files.neta.art/files/a0323ae7-aff7-454d-b577-1c8f9d0e6caf/adcb8758-b0ad-4318-b919-11f8c86ee8ec.png

The Chronicles of Narnia web:
https://public.cohub.run/s/654c62e8-fdf9-43c9-90b4-7112f090a90a/works/narnia-world-index/index.html

The Chronicles of Narnia thumbnail:
https://public.cohub.run/s/654c62e8-fdf9-43c9-90b4-7112f090a90a/thumbnail/narnia-world-index/preview.png

The Chronicles of Narnia image:
https://router-files.neta.art/files/0dcc04db-10c2-4b32-9f32-211f55433b71/a1af29d9-c367-4e30-a018-fade5b2c7873.png
```

## Inputs And Generated Assets

| World | Import file | Web index slug | Image work ID |
|---|---|---|---|
| Harry Potter | `deliverables/harry_potter_studio_world/harry_potter_narrating_import.json` | `hp-world-index` | `work_01KW439XKV6B150XAWW7854EXH` |
| The Lord of the Rings | `deliverables/ip_world_factory/lord_of_the_rings/lord_of_the_rings_narrating_import.json` | `lotr-world-index` | `work_01KW4Q5YJSPW0PWDPK9ZZ63WF6` |
| The Chronicles of Narnia | `deliverables/ip_world_factory/narnia/narnia_narrating_import.json` | `narnia-world-index` | `work_01KW4Q61P1YZAMVCZ5SSNBZ9AG` |

## Notes

Star Wars was attempted first and reached world creation plus atom import, but it was not counted as one of the three completed worlds. Its cover generation hit provider/model failures and content safety rejection on core Star Wars character covers. The partial Star Wars world was left with no locks or temp files, but it does not meet the goal because only 17 of 36 covers were ready.

The Lord of the Rings and Narnia image works were generated without `@CharacterName` references after referenced Fandom images proved too large for the generation input. The image/media chain still passed because each generated image created a ready media artifact, wrote a manifest work, and placed the image work on the Studio board.

Narnia import returned `claimed=false` in the narrating-board diagnostic, but direct Studio placement readback proved the board has 36 atom placements and 2 work placements. The final verdict uses the readback evidence rather than the intermediate diagnostic flag.

## Final Audit

```json
{
  "completedWorlds": 3,
  "worlds": [
    {
      "name": "Harry Potter Fandom Studio World",
      "worldId": "world_01KW40ZAFNFAF62Z6JHBP02G9G",
      "spaceId": "377f96da-b504-48a8-a43e-e0fe7d08d546",
      "atoms": 57,
      "coversReady": 57,
      "manifestWorks": 1,
      "mediaReady": 1,
      "boardPlacements": 67,
      "boardWorkPlacements": 2,
      "verdict": "PASS"
    },
    {
      "name": "The Lord of the Rings Fandom Studio World",
      "worldId": "world_01KW4NWE8ASKYE3JPF3XJDR7CE",
      "spaceId": "e1185b04-2fe3-4ea5-9bbf-2f4ebf64b6f7",
      "atoms": 36,
      "coversReady": 36,
      "manifestWorks": 1,
      "mediaReady": 1,
      "boardPlacements": 48,
      "boardWorkPlacements": 2,
      "verdict": "PASS"
    },
    {
      "name": "The Chronicles of Narnia Fandom Studio World",
      "worldId": "world_01KW4Q0AM0WN2X8ME4MK0TC5KZ",
      "spaceId": "654c62e8-fdf9-43c9-90b4-7112f090a90a",
      "atoms": 36,
      "coversReady": 36,
      "manifestWorks": 1,
      "mediaReady": 1,
      "boardPlacements": 48,
      "boardWorkPlacements": 2,
      "verdict": "PASS"
    }
  ]
}
```
