# IP Proposal Template

Phase-one deliverable. The builder (or a clean-context research subagent) fills this out after source discovery and world diagnosis, then presents it to the user and **stops**. No import, no generation, no board work until `checks/ip_proposal_approval.json` records the user's explicit approval. The `ip_proposal` gate enforces every structural rule below; this file explains how to fill each section well.

Write it as `ip_proposal.md` in the run directory. Substance over form: the gate rejects placeholder-quality proposals (< 1200 chars), but a proposal can be structurally complete and still shallow — the user will notice.

---

```markdown
# <WORLD_NAME> — IP Proposal

## Why This IP
[What kind of fandom does this IP have, and what is its center of gravity?
What do fans actually engage with — the cast, the lore system, the ships,
the world geography? Ground this in real research: wiki category structure,
community discussions, fan polls, not memory. 1-2 paragraphs.]

## Main Cast
[State the proposed tier-1 character count AS A NUMBER, against the observed
source surface (also a number). Explain the selection logic: who is included,
who is deliberately out, and why the count is proportionate to the source.
If community popularity diverges from screen time, say how you weighed it.]

## Key Reference Images
[At least 4 links: protagonists and key locations. EVERY entry must show
cross-source verification — a second source confirming this is the right
version of the character/location. Name the trap you avoided where relevant:
same-name characters, mid-series redesigns, film-vs-source divergence, AU
versions. Format per line:
- <Subject>: <primary-url> — confirmed via <second-source-url> (<what the
  cross-check ruled out>)]

## Fan Red Lines
[The specific facts, designs, relationships and timings that fans will not
forgive getting wrong. Be concrete: eye colors that change mid-story, faction
iconography that must never mix, deaths whose timing is sacred, ship
neutrality requirements. Each with a sentence of why. This section is the
factuality contract for the whole run — the factuality audit will sample
against exactly these kinds of claims.]

## Delight Plan
[How this world will show fans we actually know the IP: deep-cut characters
only source-readers know, board layout mirroring in-world geography, easter
eggs grounded in canon details. 2-4 concrete items, each traceable to source.]

## Style Candidates
[3 to 5 candidates from the style library, each with:
- the library id (e.g. AN-03) and its exemplar image
  (style space: style_index/thumbs/<ID>.png — link or copy it),
- a reason grounded in THIS IP (recognizability of the cast, tone fit,
  what the fandom's existing visual culture looks like),
- the main risk of choosing it.
End with your recommendation and the strongest alternative. The user picks;
you advise.]
```

---

## After presenting

1. Post the proposal (or its summary with all six sections) to the user.
2. **Wait.** Do not proceed on silence. Do not interpret partial feedback as approval.
3. When the user replies, record their actual decisions:

```json
// checks/ip_proposal_approval.json
{
  "approvedBy": "user",
  "approvedAt": "<ISO timestamp>",
  "decisions": {
    "selectedStyle": "<library id the user chose>",
    "castAdjustment": "<'none' or what changed>",
    "notes": "<anything else the user directed>"
  }
}
```

4. If the user changes the proposal, edit `ip_proposal.md` to match reality **before** recording approval — the gate rejects approvals older than the proposal file.
5. Carry the decisions forward: `selectedStyle` feeds `style_decision.json` (which still needs its own `userApproval` with the compared candidates), cast adjustments feed the coverage report before `lock-targets`.
