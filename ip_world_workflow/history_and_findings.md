# History And Findings

## What the earlier passes proved

The early successful passes proved that the Studio-first chain is real. A Studio world can be created, bound to a Cohub space, imported, covered, given works, verified through placements and checkpointed.

The three-world and five-world validation runs also proved this can be repeated across multiple IPs instead of being a one-off accident.

## What the earlier passes got wrong

Early technical passes were too easy to call complete.

A world could have real IDs, live covers and a passing board readback while still being shallow, visually inconsistent or full of ugly source-facing card content. That gap is what forced the product-grade standard to be written down.

## Product-grade correction

The later product spec hardened the bar.

It established that large Fandom IP worlds need coverage-driven content, reader-facing card writing, one world-level visual style, and a board that behaves like a premium world bible rather than a dump of imported records.

## Lord of the Rings lesson

The Lord of the Rings product-grade supplement was the strongest proof that the workflow must separate honest coverage from naive atom counts.

The run hit the platform limit for independent characters and handled it by mixing independent character atoms with explicit grouped coverage. That run proved the coverage gate cannot be optional and that platform constraints must be surfaced rather than hidden.

## Star Wars lesson

Star Wars forced the workflow to mature on three fronts.

The first gap was product quality. The world initially had too few characters and places, weak style discipline and prompt-shaped card content.

The second gap was board quality. Repairing the board made it obvious that passing import is not enough if the final canvas is unreadable.

The third gap was live recovery. Cover generation failures and placement drift had to be repaired in the real world rather than treated as theoretical issues. That produced a stronger recovery and checkpoint discipline.

## Current working truth

The chain is now understood well enough to standardize.

The remaining work is not discovering whether the chain exists. The remaining work is turning the chain into a durable operating workflow with explicit gates, stable templates and less judgment drift between runs.

The current production default is therefore local-dependent orchestration with a bound Studio space execution phase, not workflow-hub-only execution.

## Subagent planning lesson

The 2026-07-03 evaluation first looked like a one-shot planning failure, but that was only the mid-run view.

The real result after waiting for completion was stronger:

- early loose prompts failed or looked dead
- a prompt with explicit file shapes, small source budget, canon default, and self-verification eventually produced a passing full planning package
- an even stricter prompt also produced a passing full planning package
- a narrow source-inventory slice also passed on its own

That changes the workflow lesson.

One-shot clean-context planning is viable, but it is not viable with a vague brief. It needs a self-contained prompt that removes file-shape ambiguity and forces local artifact verification before the worker reports success.

The other important lesson is supervisory patience. Mid-run inspection can look like failure even when the subagent later completes the package. The main agent should not call the run failed until the worker has either finished or clearly stalled past the allowed waiting window.

## Chainsaw Man lesson

The Chainsaw Man run exposed the most important execution-boundary mistake in the workflow so far.

The workflow-hub Cohub sandbox could create a Studio `worldId`, but it could not finish provisioning with `COHUB_EXECUTION_TOKEN`. That made it look as if the chain itself was broken when the real issue was stage ownership and auth class.

The same world could then be provisioned successfully from the shared owner browser session in local Chrome, which immediately produced the real bound `spaceId`.

The run also proved the same split on source discovery. Direct Fandom probing from the sandbox hit Cloudflare challenge pages, while the local `fandom` CLI worked.

That means the workflow is not one agent in one sandbox. It is a coordinated flow across execution profiles:

- local orchestrator for source truth and Studio auth
- bound Studio space for import and product-state work
- workflow hub for process memory and supervision

## Reference reports copied into this hub

The references folder contains representative artifacts from prior runs so future work can trace decisions back to evidence rather than memory.
