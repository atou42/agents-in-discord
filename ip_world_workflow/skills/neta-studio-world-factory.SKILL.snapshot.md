---
name: neta-studio-world-factory
description: 用于创建、写入和验收标准化 Neta Studio World。Use when the task asks to build or mass-produce a Neta Studio World from Cohub/Neta/Fandom assets, create a world ID, bind the Studio-created Cohub space, import standardized atoms, generate covers, create works/media, place assets on the Studio board, or write a reusable runbook for this chain.
---

# Neta Studio World Factory

## 核心结论

标准链路必须从 Neta Studio 创建 world 开始。不要把普通 Cohub space 当成 Studio World。

普通 Cohub space 挂上 Neta mod 后，可以跑一部分 CLI，也能写文件，但它缺少 Studio world 记录和 world-space 绑定。完整链路要先拿到 `world_...`，再使用 Studio 自动绑定出来的 Cohub space 做执行空间。

正确路径是：

```text
Studio 创建 world
-> 打开 /world/<worldId>/studio 等待绑定 Cohub space
-> 在绑定 space 里上传 import JSON
-> 用 Neta CLI import atoms
-> 处理 cover
-> 生成或发布 work/media
-> 读取 Studio placements 做验收
```

## 当前默认运行模式

当前生产默认是严格本地依赖版，不是假设 workflow-hub 里的 Cohub agent 能单独完成全链路。

当前默认控制面是：

```text
local shared browser + local fandom/wiki/tooling
-> local control script 记录阶段、证据和交付物
-> create/provision real Studio world
-> switch into the bound Cohub space for import/generation/board work
-> local final verification, report and checkpoint
```

已经证明过的 Cohub 闭环 bootstrap 继续保留，但它现在是实验分支，不是默认生产路径。只有在明确要压测这个分支时，才把 create/provision 和 source discovery 下放到 Cohub sandbox。

## 完成标准

只有同时满足产品标准和链路标准，才算完成。链路跑通只是底线，不能把一个低密度、不可读、不可生成的 world 交付成合格样板间。

产品标准：

- 内容规模要接近目标 IP 在 Fandom 里的主要知识结构。不能只挑少量示例 atom。大型 IP 至少要覆盖主要角色、重要地点、组织/阵营、种族/群体、物件/神器、能力/规则、历史事件、关系网络、叙事视角和关键场景。数量底线不能代替覆盖验收。
- 创建 atom 前必须先做 source inventory：从 Fandom 或目标源站查询关键分类，合并去重，给每个候选页标注导入、合并、分组代表、排除或延期。不能把手写核心名单冒充 Fandom 覆盖。
- atom 正文必须是世界观资产内容，不是抓取元数据。角色卡要写身份、外貌、性格、背景、阵营、关系、能力、弱点、重要经历、视觉描述和生成用途。地点卡要写地理位置、视觉特征、历史、所属势力、相关人物、重要事件和场景用途。组织、物件、事件、规则也要有对应的世界内解释。
- Fandom 的 `source_url`、分类、图片列表、抓取失败等只能作为 provenance 或内部 metadata。不要把 `reference_images`、`source_fetch_failures`、原始 JSON 直接铺在 Studio 卡片正文里。
- 每个世界必须先从画风 space 或既有风格库中选出一个确定的世界级统一画风。人物、地点、物件、事件、web work、key visual 都使用同一个美术体系；可以按对象调整构图、镜头、材质和场景词，但不能把同一世界拆成多个互相割裂的美术风格。
- Fandom 图片要作为还原参考，用于角色轮廓、服装、地点材料、标志物和氛围，不等于把 Fandom 图片列表展示给用户。生成图必须是新图，不复制影视画面或演员脸。
- Studio board 要像可浏览的 IP 样板间，而不是导入日志。分区、命名、卡片正文和作品摆放都要服务后续创作和批量生成。

链路标准：

- Studio 有真实 `world_...` ID。
- world 记录里有 `spaceId`。
- 绑定的 Cohub space 已挂载 Neta mod。
- `manifest.json` 里 atom 数量符合预期。
- `artifacts/covers/*.json` 全部为 `ready`，且 ready cover 都有 URL。
- 至少一个标准 work/media 走通。image work 必须出现在 `work list`、`manifest.works` 和 `artifacts.media`。
- Studio board 能读回 placements，atom 和 work 都已经出现在 board 上。
- 没有 `manifest.json.lock`、`artifacts.json.lock` 或 `*.tmp-*` 残留。
- 报告写清楚 world ID、space ID、内容覆盖、统一画风选择依据、导入结果、公开资产、Studio placements、差异和坑。

## 前置条件

需要已经登录 `https://neta.art`。如果要通过浏览器上下文创建 world 或读 placements，优先复用已登录的 Chrome/CDP 页面。

浏览器登录态必须走机器级共享 profile，不要让每个 session 自己起临时浏览器。标准入口是：

```bash
node /Users/atou/codex-skills-shared/scripts/shared_browser.mjs start --base-url https://neta.art
node /Users/atou/codex-skills-shared/scripts/shared_browser.mjs doctor --base-url https://neta.art --url https://neta.art --probe-path /api/user
```

这套 CLI 会把共享配置写到 `~/.codex/shared-browser.json`，并固定一套 `user-data-dir` 和远程调试端口。后续所有 Studio 浏览器操作都只连这套 shared browser。默认会优先沿用已有的 `~/.codex/tmp/neta_chrome_mid`，否则落到 `~/.codex/tmp/shared_browser_profile`。

看到 `doctor` 里 `loggedIn: true` 才能继续走浏览器侧 world 创建、placements 读取和网页写入。若 `loggedIn: false`，先用同一套 shared browser 打开 `neta.art` 完成登录：

```bash
node /Users/atou/codex-skills-shared/scripts/shared_browser.mjs open --url https://neta.art
```

不要再用 Playwright 默认临时 profile、`agent-browser` 临时 profile、或手工连别的 CDP 端口做 Studio owner 操作。那样 session 之间不会共享登录态。

需要有可用的 `cohub` CLI，并能访问目标 Cohub space。

需要有结构化导入文件。通常是 Fandom 或其他来源整理出来的 `narrating import` JSON。这个 skill 不负责从 Fandom 抓资料本身；如果还没有 import JSON，先用 `fandom-cli`、`neta-world-importer` 或项目内已有脚本产出标准 JSON。

导入文件不能只是 Fandom metadata 包装。生成 import 前要把源内容整理成面向创作者的世界观资产正文，并把来源、参考图、抓取失败留在 metadata/provenance。

这个 skill 还自带一个本地控制脚本，用来把长任务跑成一个可验收的交付包，而不是跑成聊天记录：

```bash
python3 scripts/local_world_workflow.py init-run \
  --world-name "Star Wars" \
  --wiki starwars \
  --scope "Disney canon"
```

这个脚本负责：

- 初始化稳定的 run folder。
- 固定交付目录和文件名。
- 记录 stage gate verdict 和证据路径。
- 记录 world ID、space ID、checkpoint ID 和链接。
- 在交付前检查 handoff 包是不是齐了。

它不负责替 agent 做世界理解、风格判断、卡片写作或视觉审美判断。它是控制脚本，不是自动创作器。

## 内容建模标准

构建 IP world 前先建立内容清单。大型 Fandom IP 的最低可交付密度建议是 80 个以上 atom；如果只做技术 smoke test，报告必须明确标注为 smoke test，不能标为完整 world。80 是最低密度，不是完整覆盖证明。

## Fandom 覆盖标准

完整 world 必须先做 Fandom/source coverage inventory，再生成 atoms。inventory 是交付物的一部分，要记录 wiki、查询过的分类、分类页数、去重规则、纳入层级、排除原因和最终 atom 映射。

不要从手写名单开始声称覆盖。每个主要实体类型都要先发现源站分类，再合并去重候选页。角色通常要检查 broad characters、作品级 characters、major characters、电影/书籍/游戏子分类、以及本次 scope 包含的相邻 canon 分类。地点、阵营、物件、事件、种族、能力、规则和 lore system 也按同样方式处理。

覆盖要分层，不要盲目把所有低信号页面都变成 atom：

- Tier 1：理解世界不可缺少的核心实体，必须覆盖。
- Tier 2：重要支撑实体，用来让世界可浏览、可生成、可复用，应大部分覆盖。
- Tier 3：长尾或低信号实体，可以合并、分组代表、延期或排除。

完整 Fandom-scale world 的验收线：

- Tier 1 覆盖率至少 95%。
- Tier 1 + Tier 2 覆盖率至少 80%。
- 所有发现候选必须 100% 有状态记录：imported、merged、grouped、excluded 或 deferred。
- 如果某个分类有几百个长尾页面，报告必须写清楚本轮导入到哪一层，哪些延期，为什么延期。

角色覆盖有额外硬门槛：如果声明 scope 包含某个角色分类，那么导入角色数不能低于该分类直接发现的角色数，除非报告逐个列出排除或合并原因。例如 `The Lord of the Rings characters` 直接发现 44 个页面时，导入 31 个手工角色且没有 omission table，必须判定为 coverage failure。

如果平台存在角色 writer 上限，要把平台上限和 coverage 目标分开记录。当前 Demon Slayer 实测里，Studio world writer 会把独立 `character` atom 卡在 50 左右；超过上限的角色不能假装已经完整导入。标准做法是：

- 在 coverage inventory 里继续保留完整角色候选。
- 报告里明确写出平台独立角色上限。
- 超出上限的角色用 group atom、adjacent type，或分批世界方案承接。
- 不要因为平台上限就把 coverage failure 伪装成已完成。

每个 imported atom 应能追溯到 source candidate。每个 source candidate 必须落到下列状态之一：

- imported as atom。
- merged into another atom。
- represented by group atom。
- excluded with reason。
- deferred with reason。

这个 skill 自带一个基础 coverage gate 脚本，可用于建立 inventory 并验证 import 是否达标。脚本路径相对本文件为：

```bash
scripts/build_fandom_coverage_inventory.py
```

用法示例：

```bash
python3 /path/to/neta-studio-world-factory/scripts/build_fandom_coverage_inventory.py \
  --import-json <narrating-import.json> \
  --out-dir <deliverable-dir>/coverage_gate
```

默认配置是 LOTR/Middle-earth 示例。其他 IP 应传入 `--config <coverage-config.json>`。config 至少要定义 `wiki`、`scope`、`entityTypes` 和可选 `aliases`、`excludedTitlePatterns`、`minimumAtomCounts`、`groupRepresentations`。脚本输出 `source_inventory.json` 和 `coverage_gate_report.json`，报告 verdict 不是 `PASS` 时，不允许把 world 标为完整 Fandom-scale world。Tier 3 未导入候选会标为 `deferred`；Tier 1/2 未导入候选会标为 `missing` 并触发失败。若平台有角色数量上限，可以用 `groupRepresentations` 把候选映射到 group atom；gate 会把 `grouped` 计入覆盖，但报告必须写明不是独立 character atom。

推荐 atom 结构：

- `character`：主要角色、反派、导师、统治者、队友、怪物或关键 NPC。
- `location`：国家、城市、建筑、道路、战场、边境、隐秘空间和标志性环境。
- `organization` 或 `lore`：阵营、种族、制度、魔法/能力体系、语言、文化和规则。
- `object` 或 `lore`：神器、武器、书信、标志物、载具和可复用道具。
- `event`：历史大事件、战役、旅程、背叛、灾难、仪式和转折点。
- `relationship` 或 `secret`：血缘、联盟、仇恨、师承、誓言、隐藏身份和叙事钩子。
- `perspective`：可用于生成新故事的角色视角、阵营视角或创作者视角。

每个 atom 的展示正文要优先回答这个资产是什么、长什么样、和谁有关、能产生什么场景、生成时应该抓住哪些特征。来源追踪放在 metadata，不抢占正文。

## 可见卡片契约

Studio 里给人看的 card copy 只能保留读者真的需要的正文段落。不要把 authoring scaffold 原样平铺进卡片。

硬约束：

- `one_liner` 应该进入 title 或 subtitle，不要再作为正文重复一遍。
- `story_use`、`search_keywords`、`style_prompt`、`generation_prompt`、`reference_images`、`source_url`、`source_title`、`fact_extraction_notes` 这类字段默认都属于内部作者层，不要显示在卡片正文。
- 导入脚本不要对 `visible_content` 做无脑全字段 flatten。要按 atom type 选一组稳定的 reader-facing 段落。
- 人物卡正文默认只保留身份、性格、经历、关系、能力与限制这几段。地点、组织、规则、事件也同理，只保留介绍对象本身的段落。
- 如果某个字段更像写作提示而不是世界资料，就留在 provenance 或 authoring note，不要上墙。

只要 Canvas 里能直接看到 `story_use`、关键词串、prompt 词、来源元数据或参考图列表，就判定为内容展示失败。

人物卡现在有单独硬 gate。主 agent 在把 `atom_package` 记成 PASS 之前，必须先跑：

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-character-cards \
  --run-dir deliverables/<world-slug> \
  --source import
```

这个 gate 至少会检查三件事：

- 角色卡不是只有一段 description。
- 可见正文覆盖身份、性格、经历、关系、能力与限制。
- 可见字段里没有 `story_use`、`generation_prompt`、`reference_images` 这类内部作者层内容。

如果主 agent 一次写不稳，优先派一个干净上下文的 subagent 只做人物卡扩写或修复，然后主 agent 回来重跑 gate。不要一边补人物卡，一边顺手继续推进导入、封面或 board。

导入完成后，在把 `bound_space_import` 记成 PASS 之前，再跑一遍 live gate：

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-character-cards \
  --run-dir deliverables/<world-slug> \
  --source live
```

这一步专门拦 `visible_content` 映射把人物正文清空，或者把内部字段重新露到卡面上的回归。

当前 Studio import shape 的已验证 atom type 是：

- `character`
- `location`
- `event`
- `lore`
- `secret`
- `perspective`

`stand`、`organization`、`object`、`relationship` 这些语义类型如果当前 world runner 没有单独 schema，就先稳定映射到 `lore`、`secret` 或 `perspective`。不要脑补一个 UI 不认识的 atom type 再让导入在半路炸掉。

补充实测：不同导入链可能暴露不同的 live type 集。Demon Slayer 的真实 Studio world 在一次收口后稳定成：

- `character`
- `location`
- `organization`
- `object`
- `event`
- `system`

所以验收时不要只看导入 JSON，而要读回 live `manifest.json`，确认最后 world 里实际保留的是哪套 schema。如果同一 world 同时混入 `systems`/`system` 或 `factions`/`organization` 这类并行命名，要继续清洗到单一 schema，再算标准化完成。

## 世界级统一画风

每个 world 只能选一个主画风。选择顺序是：

1. 优先读取画风 space 或既有 Studio style atom，找最能覆盖该 IP 全世界的风格。
2. 如果画风 space 不可用，才从项目已验证风格库中选择一个临时主风格，并在报告里标注这是临时选择。
3. 选中后写入 world config、每个 atom 的生成指令和 work/media prompt。

这一步推荐拆成一个干净上下文的 subagent，只做一件事：

- 查 style space 或 approved style library 候选。
- 对比候选是否真能覆盖角色、地点、物件、事件和 KV。
- 产出一个 `style_decision.json`，不要顺手开始写 atom 或生成图。

主 agent 在继续之前必须亲自跑 gate：

```bash
python3 /Users/atou/agents-in-discord/ip_world_workflow/scripts/local_world_workflow.py check-style-decision \
  --run-dir deliverables/<world-slug>
```

没有过这个 gate，不允许把 `style_decision` 记为 PASS，也不允许继续把后续阶段记为 PASS。

不要手写一个看起来像 style id 的占位字符串冒充真实风格来源。先查真实 style/elementum，再做选择。

在 Neta 现有能力里，优先通过 `elementum` 搜索真实 style 候选，再做视觉抽检。可用入口包括：

```bash
curl -sG "$NETA_API_BASE_URL/v2/travel/parent-search" \
  --data-urlencode "keywords=<IP or style keywords>" \
  --data-urlencode "page_index=0" \
  --data-urlencode "page_size=10" \
  --data-urlencode "sort_scheme=best" \
  --data-urlencode "parent_type=elementum" \
  -H "x-token: $NETA_TOKEN"
```

或者走已封装的 `search_character_or_elementum` / `request_character_or_elementum`。

选型时至少核对：

- 名称是不是和目标 IP 或目标风格真的一致。
- avatar/header 图是不是可作为世界级 style authority，而不是抽象材质、单个道具或低质头像。
- 同一个候选能不能同时覆盖角色、地点、组织、事件和 KV。

主画风要包含：

- 风格名称。
- 选择依据。
- 统一 prompt。
- 禁用项，例如不要影视截图复刻、不要演员脸、不要不同美术体系混用。
- 对角色、地点、物件和事件的同风格变体说明。

验收时要抽查不同类型资产，确认它们属于同一个视觉体系。

## 创建 Studio World

通过登录状态调用 Studio 的 world 创建能力，拿到 `worldId`。可用浏览器页面上下文执行：

```http
POST /api/worlds
```

当前前端已验证的创建 body 不是完整 snapshot，而是：

```json
{
  "config": {
    "genre": "starter",
    "tone": "starter",
    "era": "starter",
    "rules": [],
    "language": "en",
    "seedPrompt": "Build a creator-facing ...",
    "creationMode": "one-line"
  }
}
```

`creationMode` 已观察到至少支持：

- `one-line`
- `character`
- `place`
- `make`
- `book-import`

其中 `one-line`、`character`、`place`、`make` 都走 starter config，只是 `creationMode` 不同。`book-import` 走 source config，前端会额外传 `name`、`sourceText`、`totalChapters`、`processedChapterCount`。

本 skill 目录下已有一个直接调用该接口的 helper：

```bash
python3 scripts/create_studio_world.py \
  --mode one-line \
  --prompt "Build a creator-facing Demon Slayer studio world..." \
  --token "$NETA_TOKEN" \
  --poll-workspace \
  --poll-studio-page
```

成功后必须打开：

```text
https://neta.art/world/<worldId>/studio
```

如果走浏览器 CDP，上游入口也必须是 shared browser：

```bash
node /Users/atou/codex-skills-shared/scripts/shared_browser.mjs ws-url
```

取到的 websocket URL 才是允许复用的唯一浏览器入口。

打开 Studio 页面后再读取 world 记录，确认已经出现：

```json
{
  "id": "world_...",
  "spaceId": "...",
  "phase": "ready"
}
```

如果没有 `spaceId`，不要继续导入。先刷新或等待 Studio 完成 provisioning。

补充实测：浏览器 owner 会话创建出的 Studio world 可能会在 space bootstrap 期间自动写入一版 starter archive，不一定是空 world。进入绑定后的 Cohub space 时，要先读回当前 `manifest.json`、`artifacts.json` 和已有 session，再决定是增量补强、清洗重建，还是换 clean world 重做。

## 确认 Cohub Space

拿到 `spaceId` 后，检查这个 Cohub space 已经挂载 Neta mod。只输出 env key 名称或布尔值，不要打印 token 值。

需要看到类似结果：

```json
{
  "mods": [
    {
      "name": "Neta Platform",
      "mountPath": "/mods/neta",
      "mountSlug": "neta"
    }
  ],
  "hasWorldId": true
}
```

注意：space metadata 里有 `NETA_WORLD_ID` 不代表 `cohub run` 会自动注入。实测 `cohub run` 里需要显式 export。

## 导入 Atoms

上传 import JSON：

```bash
cohub -s <spaceId> spaces files upload --dir imports <import.json>
```

运行 import：

```bash
cohub -s <spaceId> run -- bash -lc '
  set -euo pipefail
  export NETA_WORLD_ID=<worldId>
  export NETA_STUDIO_API_BASE_URL=https://neta.art
  cat imports/<import.json> | node /mods/neta/neta narrating import
'
```

成功结果需要包含：

```json
{
  "ok": true,
  "data": {
    "configUpdated": true,
    "atomsAdded": 57,
    "boardFinalized": true
  }
}
```

`narrating import` 的职责是写 world config、atoms、cover tasks 和初始 board placements。它不会创建 work。

如果只是为了快速验证链路，`atom add` 可以分批灌入世界并自动创建 cover。但它更适合 smoke test 或 content build，不适合直接作为最终板子编排手段。实测在已存在 title/prologue 和旧 placement 的 world 上反复增量 `atom add`，卡片容易持续堆在标题区附近，导致 Canvas 可读性很差。要交付正式样板间时，优先选择：

- 在 clean world 上尽早一次性导入主批次内容；
- 或者在同一轮里完成 board finalize，再做视觉验收；
- 如果已经被多轮增量导入堆坏，通常比继续补丁更可靠的做法是 clean rebuild。

## 处理 Cover

导入后 cover 可能只有一部分 ready，其余停在 `generating`。这是正常的未完成状态，不要把它当成验收通过。

### Fandom 参考图和画风污染

Fandom 图片必须参与生成，否则角色、地点和道具会丢失还原度。但不要把 Fandom 图片裸传给封面生成，也不要只依赖 `atom cover retry`。当前 `atom cover retry` 只根据 atom 的 `description`、`content` 和 world `visualStyle` 拼 prompt；它不会自动读取 source report 里的 Fandom 图片。对知名 IP 来说，这会让模型靠自身记忆生成，容易滑向电影剧照、演员脸、摄影质感或旧式游戏立绘。

标准做法是把参考分层：

- Fandom 图只负责身份、轮廓、服装、道具、地点结构、标志物和氛围。
- 世界级 style anchor 只负责画风、材质、笔触、光影、色彩和完成度。
- 展示给用户的 atom 正文里不要出现参考图 JSON；参考图属于生成输入和 provenance。

使用 `gpt-image-2` 时要注意一个限制：生成 provider 不支持多张 URL 参考图。直接传多个 `--ref-file` 很容易返回 `convert_request_failed` 或等价 provider 错误。需要先把 Fandom 身份参考和 style anchor 合成一张 reference board，再作为单张 `--ref-file` 或单个 base64 image block 传入。推荐 reference board 左侧或前几格放身份参考，右侧最后一格放世界风格锚点；prompt 必须明确左侧只管 identity，右侧只管 style。

如果 style 搜索拿到了多个候选，不要只按名字选。至少要把候选 avatar/header 图拉下来肉眼看一遍，再决定谁是世界锚点。抽象矿石、单个符号、低完成度人像都不够当世界级 style authority。

示例 prompt 模板：

```text
Create one original illustrated character cover for <CharacterName>.
The attached reference board has identity zones and one style zone.
Use the identity zones only for lore identity facts: body type, face category,
hair, costume, props, symbols and silhouette.
Do not copy their rendering style, exact face, actor likeness, camera look,
film still lighting, fan-art line style or color grade.
Use the style zone as the only style authority: <world visualStyle>.
Output one full-bleed square illustration, no split image, no reference board,
no text, no logo, no white border, no card frame, no photorealism,
no live-action, no celebrity likeness.
```

验收时必须抽查最容易被污染的样本：电影化角色、真人剧照来源角色、强 IP 主角、地点大场景和反派。若出现真人照片感、演员脸、白边卡框、参考板残留或同世界不同渲染体系，不能通过。

先验收状态：

```bash
cohub -s <spaceId> run -- bash -lc '
  python3 - <<PY
import collections, glob, json, os
covers=[json.load(open(p)) for p in glob.glob("artifacts/covers/*.json")]
print(json.dumps({
  "count": len(covers),
  "status": dict(collections.Counter(c.get("status") for c in covers)),
  "missingUrl": [c.get("atomId") for c in covers if c.get("status") == "ready" and not c.get("url")],
  "lockExists": os.path.exists("artifacts.json.lock"),
  "tmpFiles": glob.glob("artifacts.json.tmp-*")
}, ensure_ascii=False, indent=2))
PY
'
```

如果存在 `artifacts.json.lock`，先查现场，不要直接删：

```bash
cohub -s <spaceId> run -- bash -lc '
  ls -l artifacts.json.lock 2>/dev/null || true
  cat artifacts.json.lock 2>/dev/null || true
  pid=$(cat artifacts.json.lock 2>/dev/null || true)
  if [ -n "$pid" ]; then ps -p "$pid" -o pid,ppid,stat,etime,comm,args 2>/dev/null || true; fi
  ls -la artifacts.json.tmp-* 2>/dev/null || true
'
```

只有在同时满足这些条件时，才把它当成旧锁处理：

- lock 里的 PID 没有进程。
- 没有 `artifacts.json.tmp-*`。
- 没有正在运行的 cover/import/generate 命令。

处理旧锁时保留证据，再移动锁文件：

```bash
cohub -s <spaceId> run -- bash -lc '
  set -euo pipefail
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  mkdir -p diagnostics
  {
    echo "stale artifacts index lock preserved before cover processing"
    echo "timestamp=$stamp"
    echo "lock_content=$(cat artifacts.json.lock 2>/dev/null || true)"
    stat artifacts.json.lock 2>/dev/null || true
    pid=$(cat artifacts.json.lock 2>/dev/null || true)
    if [ -n "$pid" ]; then ps -p "$pid" -o pid,ppid,stat,etime,comm,args 2>/dev/null || true; fi
    ls -la artifacts.json.tmp-* 2>/dev/null || true
  } > "diagnostics/stale_artifacts_lock_${stamp}.txt"
  mv artifacts.json.lock "diagnostics/artifacts.json.lock.stale-${stamp}"
'
```

实测里，中断的 cover/KV run 确实会留下 `artifacts.json.lock`，并直接阻塞后续 KV 或 media 生成。只要满足 stale lock 条件，移动锁文件后通常就能恢复队列继续跑。证据文件应该保留在 `diagnostics/`，不要静默清理。

然后逐个处理 generating cover：

```bash
cohub -s <spaceId> run -- bash -lc '
  set -uo pipefail
  export NETA_WORLD_ID=<worldId>
  export NETA_STUDIO_API_BASE_URL=https://neta.art
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  log="diagnostics/cover_process_${stamp}.log"
  python3 - <<PY > /tmp/generating_ids.txt
import glob, json
ids=[]
for p in sorted(glob.glob("artifacts/covers/*.json")):
    d=json.load(open(p))
    if d.get("status") == "generating":
        ids.append(d.get("atomId"))
print("\\n".join(i for i in ids if i))
PY
  ok=0
  failed=0
  while IFS= read -r id; do
    [ -z "$id" ] && continue
    echo "PROCESS $id" | tee -a "$log"
    out=$(node /mods/neta/neta atom cover process "$id" 2>&1)
    rc=$?
    printf "%s\n" "$out" | tee -a "$log"
    if [ "$rc" -eq 0 ]; then ok=$((ok+1)); else failed=$((failed+1)); fi
  done < /tmp/generating_ids.txt
  echo "cover_process_done ok=$ok failed=$failed log=$log" | tee -a "$log"
'
```

## 创建 Work 和 Media

Web dir-work 可用于结构化样板间、索引页、规则说明页或可交互页面：

```bash
cohub -s <spaceId> run -- bash -lc '
  set -euo pipefail
  export NETA_WORLD_ID=<worldId>
  export NETA_STUDIO_API_BASE_URL=https://neta.art
  node /mods/neta/neta work init web <slug> --title "<title>"
  # 写入 works/web/<slug>/index.html
  node /mods/neta/neta work publish web <slug> --title "<title>"
  node /mods/neta/neta work thumbnail generate <slug>
'
```

注意：web dir-work 可以 ready、public、thumbnail、board-placed，但不会出现在 `work list`，也不会计入 `manifest.works`。不要用它来验收 media/manifest work 链路。

生成 image work 用标准 media 生成命令。这个会写 `artifacts/media`、`works/images`、`manifest.works`，也会自动摆到 board：

```bash
cohub -s <spaceId> run -- bash -lc '
  set -euo pipefail
  export NETA_WORLD_ID=<worldId>
  export NETA_STUDIO_API_BASE_URL=https://neta.art
  node /mods/neta/neta generate image \
    --prompt "@CharacterName standing in a key world scene, faithful character-reference concept art, cinematic storybook fantasy, production-ready world key visual" \
    --aspect 16:9 \
    --work-title "<title>" \
    --work-description "<description>"
'
```

在 prompt 里使用 `@CharacterName` 时，CLI 会尝试解析已导入 character atom 的 cover 作为参考图。先用 `node /mods/neta/neta atom list --type character` 确认名称。

## Studio Board 验收

最终要从 Studio API 读回 placements。通过已登录浏览器上下文或等价方式请求：

```http
GET /api/worlds/<worldId>/placements
```

验收应看到：

```json
{
  "status": 200,
  "byKind": {
    "atom": 57,
    "work": 2
  }
}
```

数量不需要固定为 57 或 2；以本次 import 的 atom/work 数为准。重点是 atom 数、work 数和 board 上的实际 placement 对得上。

## Cohub 侧验收

运行：

```bash
cohub -s <spaceId> run -- bash -lc '
  export NETA_WORLD_ID=<worldId>
  export NETA_STUDIO_API_BASE_URL=https://neta.art
  node /mods/neta/neta work list
  node /mods/neta/neta repair manifest --dry-run
  python3 - <<PY
import collections, glob, json, os
m=json.load(open("manifest.json"))
covers=[json.load(open(p)) for p in glob.glob("artifacts/covers/*.json")]
media=[json.load(open(p)) for p in glob.glob("artifacts/media/*.json")]
print(json.dumps({
  "atoms": len(m.get("atoms", [])),
  "manifestWorks": len(m.get("works", [])),
  "coverStatus": dict(collections.Counter(c.get("status") for c in covers)),
  "mediaStatus": dict(collections.Counter(x.get("status") for x in media)),
  "locks": [p for p in ["manifest.json.lock", "artifacts.json.lock"] if os.path.exists(p)],
  "tmpFiles": glob.glob("*.tmp-*")
}, ensure_ascii=False, indent=2))
PY
'
```

通过标准：

- `repair manifest --dry-run` 的 before/after 数量一致。
- covers 全部 `ready`。
- media 至少有一个 `ready`，如果本轮要求生成 media。
- `locks` 为空。
- `tmpFiles` 为空。
- `work list` 至少能看到生成的 image work。

## 公开资产验收

对 public URL 做 HTTP 检查，不要只相信文件存在：

```bash
curl -s -o /dev/null -w 'web:%{http_code} %{content_type}\n' '<web preview url>'
curl -s -o /dev/null -w 'thumb:%{http_code} %{content_type}\n' '<thumbnail url>'
curl -s -o /dev/null -w 'image:%{http_code} %{content_type}\n' '<generated image url>'
```

预期是 `200 text/html`、`200 image/png` 或对应的 image content type。

## 必须避免的坑

不要从普通 Cohub space 开始冒充 Studio World。它可以做执行空间实验，但不是完整 world 创建路径。

不要把技术链路通过当成产品交付通过。`ok:true`、cover ready、URL 200 只说明系统写入成功，不说明 world 内容合格。

不要交付低密度 world。大型 IP 的 20 到 30 个 atom 只能算 smoke test，不能算 Fandom 级样板间。

不要把手写核心角色表当成 Fandom 覆盖。必须先查 source categories，并在报告里解释每个候选的处理状态。导入数量少于 declared scope 的直接分类数量且没有排除表时，必须判失败。

不要把 Fandom 抓取字段直接展示在卡片正文里。用户要看的是角色、地点、关系、背景、能力和世界观内容，不是 `source_url` 或图片 JSON。

不要给同一 world 的角色、地点、物件分配互相割裂的画风。一个 world 只允许一个确定的世界级主画风。

不要省略 `NETA_WORLD_ID`。`cohub run` 不一定注入 metadata extra env，必须显式 export。

不要把 `narrating import` 理解成完整资产生成。它负责初始 world config、atom、cover task 和 board 初始化，不负责 work/media。

不要看到 cover artifact 存在就算完成。必须全部 `ready` 且有 URL。

不要忽略中断 run 留下的索引锁。`artifacts.json.lock` 不清掉，cover 队列和 KV 可能会长时间卡死，但也不能在没查 PID 和 tmp 文件之前直接删。

不要把 live world 的 starter archive 和你自己的导入批次混成两套 schema。先读回 `manifest.json`，确认是 clean world 还是已有 world，再决定是增量导入还是 clean rebuild。

不要直接删除 lock。先查 PID、tmp 文件、正在运行任务，再保存证据并移动旧锁。

不要用 web dir-work 验收 `manifest.works`。web dir-work 和 generated image work 的记录方式不同。

不要打印 `NETA_TOKEN`、`NETA_ROUTER_API_KEY` 或其他 secret 值。需要检查 env 时只输出 key 名或布尔值。

不要只看 CLI 返回 `ok:true`。最终必须同时验证 Cohub 文件状态、public URL 和 Studio placements。

## 报告模板

每次交付要写一份报告，至少包含：

- 日期。
- `worldId`。
- `spaceId`。
- Studio URL。
- import 输入文件路径。
- atom 数量和分类。
- source inventory 路径、查询过的分类、候选数、导入数、合并数、排除数、延期数。
- 内容覆盖范围、Tier 1 覆盖率、Tier 1 + Tier 2 覆盖率，以及和 Fandom 主要结构的差距。
- 世界级统一画风、选择依据和适用范围。
- cover 初始状态和最终状态。
- work/media 生成结果。
- public URL 检查结果。
- Studio placements 读回结果。
- 卡片正文抽查结果，证明没有把 source metadata 当作展示内容。
- 和预期不一样的地方。
- 最终 verdict。

推荐 verdict 规则：

- `PASS`：source inventory、coverage gate、world、space、atoms、covers、work/media、board placements 和公开 URL 都验收通过。
- `CORE_SAMPLE`：只覆盖核心样板，链路可能完整，但不能冒充 full Fandom-scale world。
- `PARTIAL`：world/atoms/board 已通，但 cover 或 work/media 未完成。
- `BLOCKED`：缺登录、缺权限、缺 world-space 绑定、生成服务不可用，且无法自行推进。
