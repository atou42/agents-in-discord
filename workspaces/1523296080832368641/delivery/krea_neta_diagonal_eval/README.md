# Krea Neta Studio Diagonal Eval Delivery

This package contains the first-pass 800-run diagonal eval setup.

- Styles: 100
- IPs: 100
- Style/IP assignment rows: 200
- Run matrix rows: 800

Files:

- `style_pool_100.json` contains the 100-style shortlist with family tags, selection scores, risk flags, and preview URLs.
- `ip_pool_100.json` contains the 100-IP shortlist with Neta diagnosis tags.
- `style_ip_assignment.csv` maps every IP to one fit style and one tension style.
- `run_matrix_800.csv` contains the 800-run diagonal matrix ready for execution.
- `prompt_packs/` contains five pilot prompt-pack examples.
- `delivery_summary.json` records the count checks.
- `source/moodboards.json` is the local cache of the harvested Krea moodboard library used to build the shortlist.

Execution notes:

- Every style is used exactly twice across the assignment table.
- Every IP receives exactly 8 runs in the matrix.
- Native Krea moodboard injection remains out of scope. Style is represented through the external shortlist and prompt-pack route.

Executor:

- `node tools/run_krea_neta_diagonal_eval.mjs inspect --ready-only`
- `node tools/run_krea_neta_diagonal_eval.mjs dry-run --ready-only --limit 2`
- `node tools/run_krea_neta_diagonal_eval.mjs run --ready-only --ip-slugs the_lord_of_the_rings --limit 1`

Current ready subset:

- Only the five pilot prompt packs are execution-ready right now: `batman`, `dune`, `mobile_suit_gundam`, `pokemon`, `the_lord_of_the_rings`.
- The executor refuses to run the full 800 if prompt packs are missing. Use `--ready-only` for the pilot subset until the remaining prompt packs are authored.

Smoke verification:

- A real end-to-end run completed successfully at `execution_runs/run-2026-07-06T08-29-01-498Z/`.
- That smoke run executed `ip_mythic_fantasy_01_r01` for `The Lord of the Rings`, produced one completed job, and saved request, queued response, final response, summary, and a downloaded output image.
