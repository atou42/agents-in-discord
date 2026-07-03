# Start New Planning Run

Use this when the user wants to start planning for a new IP world before any Studio world is created.

## Trigger intent

This entry should be used when the user is effectively asking for:

- a new IP world planning run
- a planning package before world creation
- a clean-context subagent planning test

## Operator steps

First initialize the run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py init-run \
  --base-dir deliverables \
  --world-name "<WORLD_NAME>" \
  --wiki <WIKI_SLUG> \
  --scope "<REQUESTED_SCOPE>"
```

Then send one clean-context subagent the prompt from:

- `subagent_world_planning_prompt_template.md`

If the run is obviously better as separated planning slices, use clean-context subagents for those slices instead of keeping the whole world serial. Keep the worker scopes narrow and verify the resulting package from artifacts.

Then verify the run:

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/verify_planning_package.py \
  --run-dir deliverables/<world-slug>
```

## Default operator sentence

The fastest correct way to trigger this workflow is to tell the agent:

```text
启动 <IP> world planning
```

## Not for later stages

Do not use this entry as the main workflow for:

- atom authoring
- Studio world bootstrap
- cover generation
- board placement
- final world acceptance

Those belong to later parts of the full workflow.
