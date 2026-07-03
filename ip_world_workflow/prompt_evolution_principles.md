# Prompt Evolution Principles

This file explains how to revise the planning-stage subagent prompt after a failed or weak run.

It exists so future agents do not improvise prompt changes from memory.

## Core rule

When a planning run fails, do not repair the run output.

Create a new run and change only the prompt surface.

Prompt changes should be driven by the verifier result and the actual artifact gaps, not by vague impressions.

## Prompt evolution order

Revise the prompt in this order:

### 1. Remove ambiguity about the work surface

If the subagent did not clearly understand where it was allowed to write, tighten:

- exact run dir
- exact files allowed to change
- explicit ban on editing anything else

This is the first correction because artifact sprawl or hesitation often starts from an unclear write boundary.

### 2. Remove ambiguity about the task boundary

If the subagent drifts into research, Studio creation, or world-building steps, tighten:

- explicit planning-only framing
- explicit forbidden actions
- explicit statement that no Studio world, import, or image generation should happen

### 3. Shrink the source command budget

If the subagent spends too long exploring sources or produces no files, reduce the source surface:

- give a short fixed command list
- prefer four to eight concrete commands over open-ended discovery
- allow a few extra metadata calls only when clearly needed

This was one of the strongest improvements in the 2026-07-03 evaluation.

### 4. Hard-code output shape

If the subagent leaves placeholders or empty JSON, specify:

- exact markdown headings
- exact JSON top-level keys
- exact fields that must be non-empty

Do not merely say what kinds of content are needed. Show the target shape.

### 5. Give a canon default instead of asking for open canon interpretation

If the world has an obvious initial scope, provide the default canon line directly in the prompt.

The subagent may still refine it, but starting from a concrete canon default is more reliable than asking it to invent one from scratch under time pressure.

### 6. Force self-verification

If the package looks plausible but still fails acceptance, require the subagent to run:

`verify_planning_package.py`

and fix its own files until the verifier passes.

This was the single strongest closing step for producing a complete planning package.

### 7. Add a blocker rule only after the above are already explicit

Blocker rules help, but they are not a substitute for a precise task.

Use them to stop silent research loops, not to compensate for an unclear prompt.

## What not to change first

Do not start by making the prompt longer.

Do not start by adding more background documents.

Do not start by asking for more creativity.

The 2026-07-03 evaluation showed that success came from tighter surfaces and clearer artifact shapes, not from broader context.

## Diagnostic mapping

If the verifier says scaffold placeholder remains, tighten the file shape and direct overwrite instructions.

If the verifier says source inventory is empty or missing commands, tighten the command list and require command recording.

If the verifier says canon boundary is missing, provide a canon default and require `run_manifest.json` update.

If the verifier says stage gates are still `PENDING`, explicitly require `stage_gate_log.json` updates with evidence paths.

If the package looks empty during the first inspection window, do not evolve the prompt yet. Wait for subagent completion first. Early inspection can be misleading.

## One-shot versus sliced fallback

Default to the verified one-shot pattern first.

If one-shot fails repeatedly for the same world or same worker context, fall back to sliced delegation:

- source inventory slice
- delivery contract slice
- world diagnosis slice
- stage-log normalization slice

Sliced mode is a fallback, not the default, because the one-shot pattern is now proven to work.
