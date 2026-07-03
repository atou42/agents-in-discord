# Lord of the Rings Studio World Supplement Validation Report

Date: 2026-06-28

Verdict: PASS

This is a supplement of the existing Studio World, not a rebuild. The original world, space, style and generated work were retained, then the content coverage gap was closed under the new Fandom coverage gate.

## World

| Field | Value |
| --- | --- |
| World name | The Lord of the Rings Fandom Studio World - Product Grade |
| World ID | world_01KW5Z5CF55B4SZNSH5VQ0KFBA |
| Cohub space ID | aa03ae2b-e530-470e-8df1-9a1039987755 |
| Studio URL | https://neta.art/world/world_01KW5Z5CF55B4SZNSH5VQ0KFBA/studio |
| Final combined import | deliverables/ip_world_factory/lord_of_the_rings_product/lord_of_the_rings_combined_after_character_cap_resolution_import.json |
| Final coverage config | deliverables/ip_world_factory/lord_of_the_rings_product/coverage_gate/lotr_final_coverage_config.json |
| Final coverage report | deliverables/ip_world_factory/lord_of_the_rings_product/coverage_gate_final_verify/coverage_gate_report.json |

## Platform Constraint

Neta currently rejects more than 50 independent `character` atoms. The run hit this limit with `Max character count (50) reached`.

To keep coverage honest, the final model uses 50 independent character atoms and 5 group atoms. The coverage gate records 39 Fandom character candidates as `grouped`, not hidden or omitted.

## Final Atom Coverage

| Type | Count |
| --- | ---: |
| character | 50 |
| location | 35 |
| faction | 12 |
| people | 15 |
| object | 20 |
| lore | 2 |
| creature | 1 |
| event | 30 |
| relationship | 8 |
| secret | 6 |
| perspective | 8 |
| total | 187 |

## Fandom Coverage Gate

| Check | Result |
| --- | --- |
| Gate verdict | PASS |
| Major LOTR + LOTR direct character coverage | 100% |
| Tier 1 + Tier 2 character coverage | 100% |
| Imported character atoms | 50 |
| Grouped character candidates | 39 |
| Missing Tier 1 / Tier 2 candidates | 0 |
| Deferred Tier 3 long tail | 389 |
| Gate failures | 0 |
| Minimum atom count failures | 0 |

Categories checked include `Major characters (The Lord of the Rings)`, `The Lord of the Rings characters`, `The Hobbit characters`, and `The Silmarillion characters`. Silmarillion long tail is explicitly deferred unless imported.

## Unified Style

Selected style remains `SP-02 商业英雄厚涂 Splash / Champion Splash Painterly`.

All newly added characters, group atoms, locations, factions, objects, events, relationships, secrets and perspectives use the same world-level art direction. No new per-type style split was introduced.

## Technical Validation

| Check | Result |
| --- | --- |
| Existing Studio world retained | PASS |
| Existing Cohub space retained | PASS |
| Supplement import | PASS |
| Character cap handling | PASS, 11 lower-priority character atoms replaced, 11 higher-priority characters added, 5 group atoms added |
| Manifest repair dry-run | PASS, atoms 187 before/after, works 1 before/after |
| Covers | PASS, 187 ready, 0 missing URL |
| Media work | PASS, 1 ready image work |
| Visible source-field pollution | PASS, 0 bad source keys |
| Locks / temp files | PASS, none |
| Studio placements | PASS, 196 placements total, 187 atom, 3 work |
| Public full index | PASS, 200 text/html |
| Public thumbnail | PASS, 200 image/png |
| Existing key visual | PASS, 200 image/png |

## Public Assets

| Asset | URL |
| --- | --- |
| Studio | https://neta.art/world/world_01KW5Z5CF55B4SZNSH5VQ0KFBA/studio |
| Full coverage index | https://public.cohub.run/s/aa03ae2b-e530-470e-8df1-9a1039987755/works/lotr-full-coverage-world-index/index.html |
| Full coverage thumbnail | https://public.cohub.run/s/aa03ae2b-e530-470e-8df1-9a1039987755/thumbnail/lotr-full-coverage-world-index/preview.png |
| Existing key visual | https://router-files.neta.art/files/095e31d6-dac4-4804-ac3d-1f9a0e2c613c/6a08ac75-8185-4dcf-a09d-8791903a7663.png |

## Visual Spot Check

Manually checked new covers for Tom Bombadil, Thorin II, Thranduil, Khamûl and Grouped Hobbit Company Dwarves. They are nonblank, recognizable, and stay within the same painterly fantasy direction. Tom is more colorful by character nature, but still uses the same thick painterly rendering language.

## Files

| Path | Purpose |
| --- | --- |
| scripts/build_fandom_coverage_inventory.py | Coverage inventory and gate script. |
| scripts/build_lotr_supplement_import.py | Builds the broad supplement import. |
| scripts/build_lotr_character_cap_resolution.py | Handles 50-character platform cap and group coverage. |
| deliverables/ip_world_factory/lord_of_the_rings_product/coverage_gate_final_verify/coverage_gate_report.json | Final verified coverage gate output. |
| deliverables/ip_world_factory/lord_of_the_rings_product/validation_report.md | This report. |
