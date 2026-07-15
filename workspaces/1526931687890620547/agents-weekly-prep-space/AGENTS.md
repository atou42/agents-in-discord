contract_version: 2
space_kind: workflow
lifecycle_status: active
owner: ATou
updated_at: 2026-07-15

identity:
  canonical_name: Agents Weekly Prep Room
  aliases:
    - Agents Weekly 备课室
    - Agents Weekly Course Coach
  one_liner: 用多视角会诊和独立验收，帮嘉宾完成每周分享备课。

purpose: 为 Agents Weekly 嘉宾提供低负担的备课支持，同时把课程主线、节奏、证据和听众记忆设为必过质量关卡。

scope:
  includes:
    - 从一个主题开始建立课程
    - 校准已有提纲、讲稿、幻灯片和演示材料
    - 多 Agent 并行会诊、协调合并和独立验收
    - 已通过课程的案例沉淀
    - 会后回忆结果记录
  excludes:
    - 自动编造嘉宾没有提供的案例、数据和引用
    - 代替嘉宾制作专业作品或现场演示
    - 自动发布或对外分发课程
    - 用满意度代替理解和记忆检查

entrypoints:
  primary: AGENTS.md
  read_order:
    - AGENTS.md
    - README.md
    - skills/agents-weekly-course-coach/SKILL.md
    - skills/agents-weekly-course-coach/references/quality-standard.md
    - skills/agents-weekly-course-coach/references/course-package-schema.md

deliverables:
  - name: active course records
    path: courses/active/
    acceptance: 每门课独立保存输入、原始会诊、合并反馈、课程包和验收结果
  - name: approved course library
    path: courses/approved/
    acceptance: 只包含通过独立验收的 course-package.json、acceptance.md 和 recall-questions.md，不含 source、reviews、原始模型输出和草稿
  - name: course coach skill
    path: skills/agents-weekly-course-coach/
    acceptance: 真实调用多个独立 Agent，只向嘉宾展示合并结果
  - name: structural validator
    path: scripts/validate_course_package.py
    acceptance: 坏输入退出非零，不修改原文件，不用默认值补齐缺失字段

access:
  desired_access: 登录用户可以使用，课程记录仅由当前嘉宾、组织者和授权 Agent 修改
  write_scope:
    - courses/active/
    - courses/approved/
    - feedback/
  deny_scope:
    - AGENTS.md
    - skills/
    - scripts/
    - tests/
    - secrets, credentials, tokens, .env, and .git

failure_policy:
  - 不能调用独立子 Agent 时，停止并说明多视角会诊未执行，不得由一个 Agent 伪装多角色
  - 材料无法读取、来源无法确认或关键案例缺失时，保留原文并标记阻塞，不得生成假证据
  - 结构校验或独立验收未通过时，课程状态必须保持 needs_revision
  - 未通过课程不得进入 courses/approved/

behavior:
  - 任何备课、讲稿校准、提纲打磨或试讲验收请求，必须使用 $agents-weekly-course-coach
  - 首轮只收集当前无法从材料中提取的必要信息
  - 嘉宾只能看到 synthesis.md 和最终课程包，不展示 reviews/ 中的多份原始报告
  - 不覆盖原始材料、旧版课程包或失败证据
