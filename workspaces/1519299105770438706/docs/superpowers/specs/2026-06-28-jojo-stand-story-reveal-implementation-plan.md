# JoJo Stand Story Reveal Implementation Plan

Date: 2026-06-28

Status: implementation planning spec

## Purpose

Turn the current quote-motion theater into a Stand Story Reveal theater without losing the sharp playable feeling that already works.

The next implementation phase should not try to build all 11 reveals at once. It should build a shared reveal grammar, prove it with Bucciarati Betrayal, then expand through small batches. The lead agent owns architecture, merge quality, visual consistency, validation, and deployment. Subagents own bounded character slices only after the shared grammar is stable enough to protect the page from becoming 10 unrelated systems.

The work prioritizes quality over speed. A slower batch that feels coherent is better than a fast batch that turns the site into lore cards and disconnected effects.

## Source Specs

The implementation must treat these documents as source material:

- `docs/superpowers/specs/2026-06-28-bucciarati-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-giorno-gold-experience-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-bucciarati-farewell-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-narancia-aerosmith-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-mista-sex-pistols-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-fugo-purple-haze-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-abbacchio-moody-blues-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-trish-spice-girl-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-doppio-epitaph-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-diavolo-king-crimson-stand-story-reveal-design.md`
- `docs/superpowers/specs/2026-06-28-requiem-stand-story-reveal-design.md`

The older interaction design remains useful for baseline behavior:

- `docs/superpowers/specs/2026-06-25-jojo-quote-theater-interaction-design.md`

## Current Baseline

The site is a single static theater built from `index.html`, `script.js`, and `styles.css`.

The scene list lives in `script.js` and currently contains 11 scenes. Current assets live under `assets/generated`, with runtime-optimized WebP assets under `assets/generated/optimized`. `dist` mirrors the deployed runtime.

Existing behavior that must remain intact:

- English/Japanese runtime text only. No Chinese in the page UI.
- Auto mode remains off by default.
- Replay, Previous, Next, tabs, and keyboard navigation remain available.
- Every current scene still has a primary interaction.
- Existing Bucciarati zipper route, Narancia three random locks, Mista four shots, Fugo hold, Abbacchio scrub, Doppio taps, Diavolo hold, Trish tap, Giorno taps, and Requiem tap must not regress unless deliberately replaced by a better reveal flow.
- Images remain locally served from the cohub space, not external hotlinks.
- At least the next 3 carousel images continue to preload.

## Implementation Strategy

Use small-batch parallel work with a lead-controlled merge.

The lead agent should build or approve the shared reveal foundation before character subagents touch scene-specific logic. Subagents may generate assets, draft scene modules, or prototype CSS/interaction slices, but they should not independently rewrite `script.js` structure or introduce separate reveal frameworks.

The first implementation target is not all 11 specs. The first shippable milestone is a high-quality reveal foundation plus Bucciarati Betrayal. The second milestone adds Giorno, Narancia, and Mista. The third milestone adds Fugo, Abbacchio, and Trish. The final milestone adds Doppio, Diavolo, and Requiem as a connected endgame chain.

Each milestone must be deployable and worth showing. No milestone should leave broken or half-visible reveal controls in scenes that are not implemented yet.

## Role Model

Lead agent responsibilities:

- Read and maintain this implementation plan.
- Read the relevant scene spec before each batch.
- Keep one coherent reveal state model and cleanup path.
- Define shared markup and data contracts.
- Assign bounded tasks to subagents only after the shared contract is clear.
- Review subagent output before merge.
- Resolve conflicts and perform the final integration.
- Run local and online validation.
- Upload runtime files and assets to the cohub space.
- Maintain a living ledger.

Subagent responsibilities:

- Work on one assigned character or asset pack at a time.
- Read the assigned character spec, this implementation plan, current `script.js`, current `styles.css`, and existing assets.
- Use Fandom only if additional setting or ability accuracy is needed.
- Return focused files or patches that match the shared reveal contract.
- Include proof of local validation or clear limitations.
- Do not spawn more agents.
- Do not edit unrelated scenes.
- Do not invent a second global architecture.

## Shared Reveal Foundation

The first technical task is to create a reusable reveal foundation without over-abstracting.

Required capabilities:

- Scene-local reveal data on scene objects.
- Shared render helpers for Stand reveal layers.
- Shared state cleanup entry point.
- Shared continue behavior.
- Shared reduced-motion behavior.
- Shared preloading hook for reveal assets.
- Shared validation hooks that make Playwright checks possible.
- No dependency on a framework or build tool.

Suggested data shape:

- `standName`
- `standUser`
- `standType`
- `standArt`
- `standDetailArt`
- `abilityLines`
- `bridgeLine`
- `storyReveal`
- `radarValues`
- `eventFragments`
- `continueLabel`
- `revealAssets`

This shape can be extended per scene, but the first version should stay small. Diavolo and Requiem will need extra fields for forecast and zero-rule diagrams; those should be extensions, not a separate system.

Suggested runtime state:

- `idle`
- `interaction_active`
- `interaction_success`
- `stand_entering`
- `stand_scan`
- `character_return`
- `continuing`

Scene-specific states can exist, but they should map back to this shared sequence.

## Asset Strategy

Assets decide whether the reveal feels real. Do not use generic UI panels to compensate for missing art.

For each implemented scene, new Stand assets should be original redraws that match the current manga-theater direction: textured paper, sharp ink, controlled color, strong silhouettes, fashion-pose energy, and no direct anime screenshot imitation.

First asset batch:

- Sticky Fingers full or three-quarter transparent asset.
- Sticky Fingers hand or zipper detail asset.
- Stand Scan frame compatible with Bucciarati.

Second asset batch:

- Gold Experience full or three-quarter asset.
- Gold Experience hand or life-transformation detail.
- Aerosmith large reveal asset if current plane assets are not enough.
- Sex Pistols six-entity lineup or composable entity set.

Third asset batch:

- Purple Haze full asset and capsule detail.
- Moody Blues full asset and replay/static frame.
- Spice Girl full asset and softening/handprint detail.

Final asset batch:

- Doppio signal/Epitaph fragment assets.
- King Crimson aftermath and Epitaph assets.
- Gold Experience Requiem full asset and causality/zero diagram assets.

All large runtime assets should be optimized to WebP before deployment. Source PNGs can be kept under `assets/generated`, but runtime should prefer WebP when possible.

## Milestone 0: Foundation And Bucciarati Betrayal

Goal:

Build the reveal grammar and prove it on Bucciarati Betrayal.

Scope:

- Add shared reveal data/rendering/cleanup helpers.
- Add Sticky Fingers reveal assets.
- Change successful Bucciarati zipper release so it holds the scene, triggers Sticky Fingers entrance, shows Stand Scan, returns to Bucciarati's character meaning, then lets the user continue to Farewell.
- Preserve failed zipper behavior and mobile zipper alignment.
- Preserve Replay, Previous, Next, tabs, and reduced-motion.

Do not:

- Start implementing the other 10 reveals.
- Rewrite the full scene renderer unless needed for the shared reveal layer.
- Add long lore paragraphs.

Quality gate:

This milestone is not accepted unless a first-time viewer can understand why the zipper interaction exists and a Bucciarati fan can feel that Sticky Fingers and the betrayal line have been treated with respect.

Validation:

- `node --check script.js`
- local desktop browser flow: Betrayal drag success, Stand entrance, Stand Scan, character return, continue to Farewell
- local mobile browser flow around 390px width: same path, with zipper alignment preserved
- Replay during Stand Scan
- Next during Stand entrance
- tab switch during character return
- failed zipper snapback still works
- reduced-motion path
- no console errors
- no missing asset requests
- online cohub smoke check after upload

## Milestone 1: First Expansion Batch

Goal:

Add Giorno, Narancia, and Mista as the first parallel expansion batch.

Why these scenes:

Giorno teaches the opener and life-giving reveal. Narancia tests a pointer-driven three-step reveal with existing plane assets. Mista tests multi-tap count, persistent damage, and multiple small Stand entities. Together they prove the reveal grammar can support elegant, tactical, and playful scenes.

Subagent split:

- Giorno subagent: Gold Experience entrance, life-transformation cue, opener continuation into Bucciarati.
- Narancia subagent: Aerosmith reveal after three random CO2 locks, preserving random non-repeating target positions.
- Mista subagent: Sex Pistols reveal after four shots, with six entities and no No. 4.

Lead responsibilities:

- Lock shared reveal contract before subagents begin.
- Provide each subagent the exact scene spec and current reveal helper API.
- Review each slice independently.
- Merge one scene at a time.
- Run full regression after each merge.

Quality gate:

No scene may advance immediately after its old trigger. Each must show interaction success, Stand entrance, Stand Scan, character return, and a deliberate continue path. The scene must still work if the user navigates away during the reveal.

Validation:

- all Milestone 0 checks still pass
- Giorno: first tap locks name, second tap enters Gold Experience reveal, continue moves to Betrayal
- Narancia: three distinct lock targets, third lock enters Aerosmith reveal, continue moves to Mista
- Mista: four shot marks persist, No. 4 is absent from Sex Pistols lineup, continue moves to Fugo
- desktop and mobile screenshots for each Stand Scan
- repeated replay and tab-switch probes for each scene
- missing-asset probe by checking all referenced reveal assets return 200 locally and online

## Milestone 2: Emotional Middle Batch

Goal:

Add Fugo, Abbacchio, and Trish.

Why these scenes:

These scenes test whether the reveal system can handle restraint, memory, and self-awakening instead of only high-energy action. If these fail, the site becomes shallow fan service.

Subagent split:

- Fugo subagent: Purple Haze reveal through pressure, containment, capsule danger, and painful refusal.
- Abbacchio subagent: Moody Blues reveal through scrubbed memory, truth lock, replay scan, and final clue.
- Trish subagent: Spice Girl reveal through softening, elastic resistance, and selfhood.

Lead responsibilities:

- Prevent these scenes from becoming louder versions of earlier reveals.
- Keep text short and emotionally precise.
- Check mobile layout more aggressively because these reveals depend on readable story lines.

Quality gate:

Each scene must make its emotional choice understandable to a new viewer without flattening the character. Fugo cannot be framed as simple cowardice, Abbacchio cannot be reduced to a replay machine, and Trish cannot be treated as a passive escort target.

Validation:

- all previous milestone checks still pass
- Fugo: short hold fails safely, long hold enters Purple Haze reveal, continue moves to Abbacchio
- Abbacchio: failed scrub snaps back, successful scrub enters Moody Blues reveal, continue moves to Trish
- Trish: tap enters Spice Girl reveal, softening/elasticity explains the ability, continue moves to Doppio
- reduced-motion pass for all three
- mobile text and controls do not overlap bottom tabs
- repeated navigation cleanup from every reveal state

## Milestone 3: Endgame Chain

Goal:

Add Doppio, Diavolo, and Requiem as one connected endgame chain.

Why these scenes:

These three are mechanically and narratively linked. Doppio should foreshadow without fully revealing Diavolo. Diavolo must correctly explain Epitaph and King Crimson. Requiem must answer Diavolo by making results fail to arrive.

Subagent split:

- Doppio subagent: signal taps, Epitaph fragments, partial King Crimson manifestation, no full Diavolo overexposure.
- Diavolo subagent: hold reveals Epitaph result first, release deletes the process, King Crimson appears in aftermath.
- Requiem subagent: quote tap starts causality attempt, Return to Zero denies result, GER scan explains non-arrival.

Lead responsibilities:

- Own the full Doppio-to-Diavolo-to-Requiem chain.
- Ensure ability explanations are accurate and not simplified into generic time magic.
- Keep spoilers focused and purposeful.
- Run the longest end-to-end validation path.

Quality gate:

The final chain must make a new viewer understand the difference between Epitaph, King Crimson, and Gold Experience Requiem without a lore essay. Deep fans should not see a common misread such as King Crimson being treated as time stop or Requiem as a bigger punch.

Validation:

- all previous milestone checks still pass
- Doppio: repeated taps produce signal escalation, Epitaph fragment, partial Stand reveal, continue to Diavolo
- Diavolo: failed hold flickers only, successful hold shows forecast before release, release creates missing-middle cut, continue to Requiem
- Requiem: action/result attempt fails before rule text appears, Stand Scan explains Return to Zero, judgment appears, return to Giorno waits for user when autoplay is off
- full desktop loop from Giorno to Requiem and back
- full mobile loop from Giorno to Requiem and back
- no stale timers advance a later scene after navigation
- no horizontal overflow on mobile

## Merge Policy

No subagent output is accepted directly into the final page.

The lead merges manually after review. Each merge must answer:

- Does this follow the source spec?
- Does it preserve the shared reveal grammar?
- Does it avoid generic lore-card behavior?
- Does it keep controls and cleanup reliable?
- Does it preserve mobile readability?
- Does it avoid Chinese runtime UI text?
- Does it avoid external hotlinked assets?
- Does it keep prior scenes working?

If a subagent returns a large rewrite of unrelated code, reject the rewrite and extract only usable pieces.

If two scenes need the same helper, the lead extracts the helper. Subagents should not independently introduce near-duplicate helpers.

## Living Ledger

Maintain:

`docs/superpowers/specs/2026-06-28-jojo-stand-story-reveal-implementation-ledger.md`

The ledger must be read before each resumed work session and updated after:

- context discovery
- asset generation or selection
- shared architecture changes
- scene implementation
- merge decisions
- failed validation
- successful validation
- cohub upload
- scope decisions
- blockers

The ledger should include concrete facts, not vibes. Failed checks and rejected design ideas belong in the ledger.

## Validation Standard

A milestone is not done because it looks good in one screenshot.

Required validation for every milestone:

- JavaScript syntax check.
- Desktop browser interaction checks.
- Mobile browser interaction checks.
- Replay/Previous/Next/tab cleanup checks.
- Reduced-motion checks.
- Console error scan.
- Missing asset check.
- Runtime asset path check.
- Cohub upload.
- Online smoke check against the cohub URL.

Required adversarial probes:

- Navigate away during Stand entrance.
- Press Replay during Stand Scan.
- Switch tabs during character return.
- Trigger the same scene twice after replay.
- Complete the scene on mobile.
- Use a failed or short interaction path where the scene has one.
- Confirm no delayed timer from a previous scene changes the current scene.

## Deployment Standard

After each accepted milestone:

- Rebuild or refresh `dist` if runtime files changed.
- Upload `dist` to the cohub space root.
- Upload any changed `assets`, relevant `docs`, and milestone archives to the same cohub space.
- Verify the public page URL returns 200.
- Verify `script.js`, `styles.css`, and at least one new reveal asset return 200.
- Run at least one browser interaction on the public cohub URL.
- Archive the milestone locally under `archives/`.
- Commit the changed files.

Current cohub space:

`cff01d0c-3643-40ee-bd8e-5a468d910587`

Current public URL:

`https://s-cff01d0c-3643-40ee-bd8e-5a468d910587-3000.cohub.run/`

## Stop Conditions

Stop and report instead of pushing through if:

- Required Stand assets cannot be generated at a quality level that matches the current site.
- A scene interaction cannot be made usable on mobile.
- A shared helper starts forcing scenes into the same motion language.
- The implementation causes uncontrolled timer or cleanup bugs.
- Cohub upload or online validation is unavailable.
- A spec appears factually wrong and needs user review before implementation.

## High-Standard Goal

建议 goal：

按照 `docs/superpowers/specs/2026-06-28-jojo-stand-story-reveal-implementation-plan.md` 分阶段实现 JoJo Part 5 Stand Story Reveal Theater，目标是在不破坏当前动态漫体验的前提下，把每个名台词交互升级成可玩的替身能力解释和角色理解入口；每轮开始先读取并维护 `docs/superpowers/specs/2026-06-28-jojo-stand-story-reveal-implementation-ledger.md`，按 Milestone 0 到 3 小批量推进，由主 agent 负责共享 reveal 架构、审美一致性、合并、验证、cohub 上传和最终质量，subagent 只做被分配的单角色或资产切片；必须保持现有页面交互、英文/日文 UI、移动端可用性、Replay/Previous/Next/tabs、预加载、cohub 本地资源和已验收的场景不退化；每个里程碑完成前必须通过本地和线上浏览器验收、移动端验收、reduced-motion 检查、控制清理检查、缺失资产检查、console 错误检查、至少一组 adversarial 导航/重复触发探测，并把证据写入 ledger；只有当当前里程碑的实现、资产、文档、归档、commit、cohub 同步和公开 URL 验收都完成，且没有未说明的退化或阻塞时，才允许标记该阶段完成，遇到资产质量、移动端、设定准确性或上传验证不可达时必须明确报告阻塞。

ready 检验：通过

