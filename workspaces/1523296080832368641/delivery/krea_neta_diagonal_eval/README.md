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
- `prompt_packs/` contains one prompt pack for each of the 100 IPs in the run matrix.
- `delivery_summary.json` records the count checks.
- `source/moodboards.json` is the local cache of the harvested Krea moodboard library used to build the shortlist.

Executor:

- `node tools/run_krea_neta_diagonal_eval.mjs inspect` checks package completeness.
- `node tools/run_krea_neta_diagonal_eval.mjs dry-run` renders all 800 request payloads without submitting jobs.
- `node tools/run_krea_neta_diagonal_eval.mjs run --ip-slugs foundation --limit 1` submits a real smoke job.
- Real runs write request JSON, job evidence, summary JSON, and downloaded image files under `execution_runs/`.

Execution notes:

- Every style is used exactly twice across the assignment table.
- Every IP receives exactly 8 runs in the matrix.
- Native Krea moodboard injection remains out of scope. Style is represented through the external shortlist and prompt-pack route.
