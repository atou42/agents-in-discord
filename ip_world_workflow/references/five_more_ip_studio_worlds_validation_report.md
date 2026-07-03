# Five More IP Studio Worlds Validation Report

Date: 2026-06-27

Verdict: PASS

This run created five additional Neta Studio Worlds through the standard Studio-first chain. None of the five reuses the earlier completed Harry Potter, Lord of the Rings, or Narnia worlds. The previous Star Wars partial run is not counted.

## Worlds

| IP | Studio World | World ID | Cohub Space ID | Studio Link |
| --- | --- | --- | --- | --- |
| Oz | The Wonderful Wizard of Oz Fandom Studio World | world_01KW4VXN0S99G94YNNCYFE2B7S | c1ba4d1f-cfe8-42a7-8359-d1c8ca9cd015 | https://neta.art/world/world_01KW4VXN0S99G94YNNCYFE2B7S/studio |
| Alice in Wonderland | Alice in Wonderland Fandom Studio World | world_01KW4VXSHZ3D8SSKM4F1CPPEHT | 83878a21-53d0-41b5-9e91-49d3bb0fea2e | https://neta.art/world/world_01KW4VXSHZ3D8SSKM4F1CPPEHT/studio |
| Sherlock Holmes | Sherlock Holmes Fandom Studio World | world_01KW4VXXNT5X1Q4C70MHEYWFAP | e0d4acbe-1b7e-470f-9704-2ca56f8754a5 | https://neta.art/world/world_01KW4VXXNT5X1Q4C70MHEYWFAP/studio |
| Dracula | Dracula Fandom Studio World | world_01KW4VY1SHERV060QCF57TG7MN | b489f16e-f90a-4d2a-84d4-01fd915d8b09 | https://neta.art/world/world_01KW4VY1SHERV060QCF57TG7MN/studio |
| Frankenstein | Frankenstein Fandom Studio World | world_01KW4VY5Y4X2EPV1QREN4VBJAE | 34e4c651-2cfa-4e96-995a-95c52ff971df | https://neta.art/world/world_01KW4VY5Y4X2EPV1QREN4VBJAE/studio |

## Import Inputs

| IP | Import JSON | Atoms | Character | Location | Lore | Event | Secret | Perspective | Direct Fandom Cover URLs |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Oz | deliverables/ip_world_factory/oz/oz_narrating_import.json | 24 | 8 | 5 | 6 | 3 | 1 | 1 | 16 |
| Alice in Wonderland | deliverables/ip_world_factory/wonderland/wonderland_narrating_import.json | 24 | 8 | 5 | 6 | 3 | 1 | 1 | 13 |
| Sherlock Holmes | deliverables/ip_world_factory/sherlock_holmes/sherlock_holmes_narrating_import.json | 24 | 8 | 5 | 6 | 3 | 1 | 1 | 15 |
| Dracula | deliverables/ip_world_factory/dracula/dracula_narrating_import.json | 24 | 8 | 5 | 6 | 3 | 1 | 1 | 9 |
| Frankenstein | deliverables/ip_world_factory/frankenstein/frankenstein_narrating_import.json | 24 | 8 | 5 | 6 | 3 | 1 | 1 | 9 |

Source reports are saved beside each import JSON as `source_report.json`. Fandom image coverage was weaker for Dracula and Frankenstein because several location/lore pages did not expose image pages through the wiki API. The import still preserved source URLs and metadata where available, and missing covers were generated through the Neta cover pipeline instead of being treated as complete.

## Cohub And Studio Validation

| IP | Import Result | Covers | Manifest Works | Media | Repair Dry Run | Locks / Tmp | Studio Placements |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| Oz | atomsAdded 24, boardFinalized true | 24 ready, 0 missing URL | 1 | 1 ready | before=after, atoms 24, works 1, covers 24, media 1 | none | 36 total, 24 atom, 2 work |
| Alice in Wonderland | atomsAdded 24, boardFinalized true | 24 ready, 0 missing URL | 1 | 1 ready | before=after, atoms 24, works 1, covers 24, media 1 | none | 36 total, 24 atom, 2 work |
| Sherlock Holmes | atomsAdded 24, boardFinalized true | 24 ready, 0 missing URL | 1 | 1 ready | before=after, atoms 24, works 1, covers 24, media 1 | none | 36 total, 24 atom, 2 work |
| Dracula | atomsAdded 24, boardFinalized true | 24 ready, 0 missing URL | 1 | 1 ready | before=after, atoms 24, works 1, covers 24, media 1 | none | 36 total, 24 atom, 2 work |
| Frankenstein | atomsAdded 24, boardFinalized true | 24 ready, 0 missing URL | 1 | 1 ready | before=after, atoms 24, works 1, covers 24, media 1 | none | 36 total, 24 atom, 2 work |

The Studio placements API returned HTTP 200 for all five worlds. Each board contains 24 atom placements and 2 work placements: one web index work and one generated image work.

## Public Assets

| IP | Web Index | Thumbnail | Generated Image |
| --- | --- | --- | --- |
| Oz | https://public.cohub.run/s/c1ba4d1f-cfe8-42a7-8359-d1c8ca9cd015/works/oz-world-index/index.html | https://public.cohub.run/s/c1ba4d1f-cfe8-42a7-8359-d1c8ca9cd015/thumbnail/oz-world-index/preview.png | https://router-files.neta.art/files/e2c8183a-875f-4950-ad8d-cb60b008f473/f54f8dbc-8dcd-4780-aa39-4632a93b618b.png |
| Alice in Wonderland | https://public.cohub.run/s/83878a21-53d0-41b5-9e91-49d3bb0fea2e/works/wonderland-world-index/index.html | https://public.cohub.run/s/83878a21-53d0-41b5-9e91-49d3bb0fea2e/thumbnail/wonderland-world-index/preview.png | https://router-files.neta.art/files/9fadc7d7-caf3-478f-ac07-df84326c4a71/56d3742b-312c-48ed-9088-08d1125d4dc8.png |
| Sherlock Holmes | https://public.cohub.run/s/e0d4acbe-1b7e-470f-9704-2ca56f8754a5/works/sherlock-holmes-world-index/index.html | https://public.cohub.run/s/e0d4acbe-1b7e-470f-9704-2ca56f8754a5/thumbnail/sherlock-holmes-world-index/preview.png | https://router-files.neta.art/files/6209c8de-ec29-4067-b2bf-a8cd93ce7a9c/faefabf5-330f-4c12-91dc-e50572763f60.png |
| Dracula | https://public.cohub.run/s/b489f16e-f90a-4d2a-84d4-01fd915d8b09/works/dracula-world-index/index.html | https://public.cohub.run/s/b489f16e-f90a-4d2a-84d4-01fd915d8b09/thumbnail/dracula-world-index/preview.png | https://router-files.neta.art/files/7b7be1ad-982c-4a7e-9b79-45f6684bd719/773d70d8-2479-47e1-b1f4-5115e723dc3d.png |
| Frankenstein | https://public.cohub.run/s/34e4c651-2cfa-4e96-995a-95c52ff971df/works/frankenstein-world-index/index.html | https://public.cohub.run/s/34e4c651-2cfa-4e96-995a-95c52ff971df/thumbnail/frankenstein-world-index/preview.png | https://router-files.neta.art/files/6d37fa29-885d-4ace-8c53-9a3a8e4e9de2/fc8b9d83-f247-4853-be10-6d9cc1542abd.png |

HTTP checks returned:

| Asset Type | Expected | Result |
| --- | --- | --- |
| Web index | 200 text/html | Passed for all five |
| Thumbnail | 200 image/png | Passed for all five |
| Generated image | 200 image/png | Passed for all five |

## Files Created Or Updated

| Path | Purpose |
| --- | --- |
| scripts/build_five_more_ip_world_imports.py | Builds the five additional IP import JSON files from Fandom metadata and image references. |
| deliverables/ip_world_factory/world_run_state.json | Updated with world IDs, space IDs, index slugs, image work IDs, and generated image URLs. |
| deliverables/ip_world_factory/oz/oz_narrating_import.json | Oz import. |
| deliverables/ip_world_factory/wonderland/wonderland_narrating_import.json | Alice in Wonderland import. |
| deliverables/ip_world_factory/sherlock_holmes/sherlock_holmes_narrating_import.json | Sherlock Holmes import. |
| deliverables/ip_world_factory/dracula/dracula_narrating_import.json | Dracula import. |
| deliverables/ip_world_factory/frankenstein/frankenstein_narrating_import.json | Frankenstein import. |
| deliverables/ip_world_factory/five_more_ip_studio_worlds_validation_report.md | This validation report. |

## Notes

The full-chain result matched the expected standard flow: Studio world creation, automatic Cohub space binding, import into the bound space, cover readiness, web work, generated image work, public assets, and Studio board placements.

The one process difference was Fandom query speed. Running all five worlds in one Fandom pass stalled while querying later worlds, so the remaining worlds were run individually. This did not affect Neta data integrity because no Studio write had started at that point.

The image prompt path avoided direct actor likenesses and exact film-frame copying. That avoided the failure pattern seen in the earlier Star Wars partial attempt.
