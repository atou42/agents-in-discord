# Execution Profiles And Environment Boundaries

This workflow does not run as one uniform execution surface.

The Chainsaw Man supervision on 2026-07-03 proved that the workflow only stays honest when it separates local owner-authenticated work from bound-space execution work.

The current production default is the strict local-dependent profile.

That means the control plane stays local even when the product state lives in Cohub. Cohub-closed-loop bootstrap is now a proved branch, but it is still a deliberate branch, not the default operating mode.

## Confirmed execution profiles

### Local orchestrator profile

This is the machine-level agent or human-operated environment with:

- shared Chrome owner session for `neta.art`
- local `NETA_TOKEN` if available
- local `fandom` CLI
- access to any local rich wiki source

This profile owns the steps that depend on owner auth, local browser state, or source tooling that is not portable into a Cohub sandbox.

Confirmed responsibilities:

- source discovery through Fandom CLI
- local wiki discovery and detail recovery
- world diagnosis
- delivery contract
- style-space search when it depends on local auth
- Studio world creation
- Studio world provisioning
- handing the bound `spaceId` to the execution space

This profile remains the simplest fallback when the Cohub-closed-loop bootstrap has not been prepared yet.

It is also the current default production profile even when the closed-loop bootstrap is technically available, because the workflow still benefits from local source truth, local browser reuse, local scripting and local final verification.

### Workflow-hub Cohub space profile

This is the process space, not the delivery world.

It is good for:

- workflow docs
- run artifacts
- supervision logs
- process history
- blocked reports
- stage-gate records

It is not a safe place to assume owner-authenticated Studio actions or local-source discovery will work.

It can become a full executor only after two bootstrap materials are deliberately supplied:

- a valid Studio session credential, usually an exported `STUDIO_COOKIE`
- a source-discovery transport that works from the sandbox, such as `r.jina.ai` wrapping Fandom `api.php`, a sanctioned Fandom proxy, or a mounted local wiki source

### Bound Studio space profile

This is the Cohub space bound to the real Studio world after provisioning succeeds.

This profile owns the product-state work:

- import package upload
- `narrating import`
- live manifest checks
- cover generation and repair
- work or media creation
- placement readback
- board cleanup
- artifact archive inside the world run folder

## Confirmed boundary from Chainsaw Man

The Chainsaw Man run established four live facts.

First, the workflow-hub sandbox could create a Studio world record with `COHUB_EXECUTION_TOKEN`, but that credential class was not sufficient to finish `POST /api/worlds/:id/provision`.

Second, the same world could be provisioned successfully from the shared owner browser session in local Chrome. That converted the same `worldId` from `spaceId: null` to a real bound `spaceId`.

Third, direct Fandom probing from the Cohub sandbox hit Cloudflare challenge pages, while the local `fandom` CLI worked normally on the same IP.

Fourth, the bound Studio space itself had the expected `/mods/neta/neta` capability after provisioning.

Fifth, the workflow-hub sandbox could create and provision a fresh smoke world entirely inside Cohub once a valid Studio cookie was supplied as a temporary file and the request used a browser-like user agent. The resulting smoke world was:

- world ID: `world_01KWJSS5WA1REKFH4M2BSD27FC`
- space ID: `14e4a5ca-3dd2-4835-bccc-9b0b313a5f42`

Sixth, the workflow-hub sandbox could read Fandom `api.php` successfully through `r.jina.ai`, including `search`, `categorymembers`, and `prop=categories` queries for Chainsaw Man.

## Operational rule

Do not assign the whole workflow to a single Cohub space agent and assume it can complete every stage.

Current default:

`local orchestrator as control plane`
`-> bound Studio space as product execution plane`
`-> workflow hub as process memory and shared docs`

The correct execution split is:

`local orchestrator for source + Studio auth`
`-> real world bound to Cohub space`
`-> bound-space execution for import, generation and board work`
`-> local or clean-context verification`

If the closed-loop bootstrap is present, the workflow-hub space may also own the source-discovery and Studio bootstrap stages directly, but treat that as an explicit experiment branch. Do not silently swap the default operating mode.

That closed-loop bootstrap currently means:

- a temporary `STUDIO_COOKIE` file or secret path for Studio world create and provision
- a Cohub-safe Fandom transport such as `r.jina.ai`

Prototype helpers now exist under `/Users/atou/agents-in-discord/ip_world_workflow/scripts/`:

- `cohub_studio_via_cookie.py`
- `cohub_fandom_via_jina.py`
- `local_world_workflow.py`

## Hard stop conditions

Stop and mark the stage blocked if any of these are true:

- a sandbox agent creates `worldId` but cannot produce a real bound `spaceId`
- the stage relies on Fandom discovery but the only available environment is a sandbox path already blocked by Cloudflare
- the run is trying to continue import or cover work before the bound space is real
- the run is trying to fake coverage from a hand-written list because local source tooling is unavailable
- the run claims Cohub-closed-loop execution without proving that its Studio auth bootstrap and source-discovery transport are both working

## What to record when a boundary is hit

When an environment boundary blocks a stage, the run artifacts must record:

- which execution profile was used
- which exact stage was attempted
- what credential or tool class was available
- what live result happened
- what alternate profile is required to continue

This is not incidental debugging detail. It is part of the workflow contract now.
