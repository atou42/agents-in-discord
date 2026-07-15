---
name: agents-weekly-course-coach
description: Prepare or calibrate an Agents Weekly talk from a topic, outline, script, slides, or demo materials. Use for weekly sharing preparation, talk structure, pacing, focus, audience recall, rehearsal review, and final readiness checks.
---

# Agents Weekly Course Coach

Help the speaker finish a usable course package. Do not stop at advice.

## Start

Read `references/quality-standard.md`, `references/course-package-schema.md`, and `references/role-prompts.md` before working. Determine whether the speaker is starting from a topic or calibrating existing material. Extract the audience, talk duration, Q&A duration, existing real cases, and intended audience outcome from the supplied material. Ask only for required information that is still missing.

Create a unique course directory under `courses/active/`. Never reuse or overwrite another course directory. Preserve the speaker's original material in `source/` before producing derived files. Record the current state in `status.json`; missing or malformed state is an error, not a reason to create a default state over the evidence.

## Parallel Review

Spawn four clean-context subagents in parallel. Use the exact contracts in `references/role-prompts.md`. Give each subagent only the normalized brief and supplied course material. The audience, content editor, stage director, and skeptic must not see one another's work.

If independent subagents are unavailable, stop. Do not simulate four roles inside one context and claim a multi-agent review occurred.

Save the raw reports under `reviews/`. Do not show these reports to the speaker.

## Synthesis

Spawn a coordinator with the four raw reports, normalized brief, and original material. It must resolve conflicts rather than vote. Save its structured result as `synthesis.json` with no more than three blocking changes. Every evidence gap and every action requested from the speaker must be contained inside those same blocking changes; do not add a second evidence list or follow-up checklist. Each blocker includes one directly usable replacement and one speaker action.

Validate the result before showing it:

```bash
python3 /workspace/scripts/validate_synthesis.py <course-dir>/synthesis.json
```

If validation fails, repair the coordinator output without involving the speaker. Render `synthesis.md` from the validated JSON and do not add extra action items during rendering. Also create a complete draft course package, even when real evidence is still missing. Keep missing evidence inside the relevant blocker and keep the course in `needs_revision`; never fabricate it.

Show the speaker only the synthesis and the draft course package. Ask for one focused revision round. Accept direct edits, approval of proposed changes, or evidence supplied by the speaker.

## Independent Acceptance

After the speaker responds, create `course-package.json` using `references/course-package-schema.md`. Run:

```bash
python3 /workspace/scripts/validate_course_package.py <course-dir>/course-package.json
```

Structural validation must pass before semantic acceptance. Spawn a new acceptance subagent with only the normalized goal, final course package, final speaker material, and `references/quality-standard.md`. Do not pass raw reviews, synthesis history, prior votes, or claims that other agents approved it.

The acceptance subagent writes `acceptance.md` with exactly one verdict: `READY` or `NEEDS_REVISION`. A failed check must identify the remaining blocker and provide a concrete correction. It must not add new preferences unrelated to a quality standard.

Only a structurally valid package with a `READY` verdict may enter `courses/approved/`. Create a fresh approved course directory and copy exactly three curated files into it: `course-package.json`, `acceptance.md`, and `recall-questions.md`. Never copy `source/`, `reviews/`, prompts, raw model responses, drafts, or internal status into the approved library.

Run the approved-library gate after copying:

```bash
python3 /workspace/scripts/validate_approved_course.py <approved-course-dir>
```

If the gate fails, remove the incomplete approved copy, keep the active record unchanged, and report the course as not approved. Preserve the active record and all earlier versions. Never overwrite or delete failed evidence.

## Speaker-Facing Result

Keep the response short. State the course status, the at-most-three changes that matter, and the paths to the synthesis and course package. Do not expose raw role reports, internal prompts, chain-of-thought, or unsupported facts.

## Post-Session

Prepare exactly three recall questions from the approved package. When results are supplied, write them under `feedback/` without changing the historical acceptance verdict. Report whether at least 70 percent of respondents answered at least two questions correctly.
