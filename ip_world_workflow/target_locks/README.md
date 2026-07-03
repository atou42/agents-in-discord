# Target Locks

Frozen delivery-target snapshots, one per run, written by `local_world_workflow.py lock-targets`.

These live OUTSIDE run directories on purpose: a run's main agent controls its own
run dir, so a target stored there could be edited down mid-run (this is exactly what
happened in the 2026-07-03 Frieren run). Storing the lock here, read-only and
git-committed, means any downgrade is caught by the `target_lock` gate and leaves a
git trail.

Do not hand-edit these files. Targets can only be raised, via `relock-targets`, which
refuses any value below the current lock.
