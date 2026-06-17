# gzh-writes 网络探测 + 配图自审 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修改 gzh-writes SKILL.md，实现网络通道探测优先策略和配图质量 AI 自审循环。

**Architecture:** 纯 prompt 层修改，仅涉及 SKILL.md 一个文件。网络搜索改为"先探测后批量"模式，配图流程新增截图后自审迭代环节。

**Tech Stack:** Claude Code Skill（Markdown prompt 文件）

---

### Task 1: 新增「网络通道探测规则」章节

**Files:**
- Modify: `.claude/skills/gzh-writes/SKILL.md:14` (在 `## 交互入口` 之前插入新章节)

- [ ] **Step 1: 在 SKILL.md 的 `---` 分隔线（第 16 行，`## 交互入口` 之前）插入新章节**

在第 15 行（`## 触发方式` 表格之后的 `---` 之后、`## 交互入口` 之前）插入：

```markdown
## 网络通道探测规则

所有需要网络抓取的环节（Step 1 选题抓取、Step 2 素材搜索），都遵循以下探测优先策略：

### 探测流程

1. **探测阶段**：先启动 1 个 SubAgent，对第一个目标尝试 WebFetch（或 WebSearch）
   - 成功 → 确定通道为 `webfetch`
   - 失败 → 同一 SubAgent 改用 Skill tool 调用 `agent-browser` 技能重试
     - 成功 → 确定通道为 `browser`
     - 也失败 → 提示用户"网络不可用，请检查网络后重试"，终止流程
2. **批量阶段**：通道确定后，剩余 SubAgent 并行启动，全部使用已确定的通道，不再各自降级
3. **通道复用**：Step 1 确定的通道结论在 Step 2 素材搜索时直接复用，不再重复探测

### 通道类型说明

| 通道 | 含义 | SubAgent 内使用的工具 |
|------|------|----------------------|
| `webfetch` | WebFetch/WebSearch 可用 | 使用 WebFetch 或 WebSearch 获取内容 |
| `browser` | 需要浏览器降级 | 使用 Skill tool 调用 `agent-browser` 技能获取内容 |
```

- [ ] **Step 2: 验证插入位置正确**

Read `.claude/skills/gzh-writes/SKILL.md` 确认新章节位于 `## 触发方式` 之后、`## 交互入口` 之前，且 Markdown 格式正确无误。

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/gzh-writes/SKILL.md
git commit -m "feat: add network channel probe rules to gzh-writes"
```

---

### Task 2: 修改 Step 1 模式 A — 探测优先的渠道抓取

**Files:**
- Modify: `.claude/skills/gzh-writes/SKILL.md` (Step 1 模式 A 的流程和 SubAgent prompt 部分，约第 42-126 行)

- [ ] **Step 1: 替换模式 A 的「流程」部分**

将当前第 53-57 行的流程：

```markdown
**流程：**
1. 并行启动 5 个 SubAgent（Agent tool, subagent_type=general-purpose），每个负责一个渠道抓取 3-5 条标题
2. 汇总所有素材，按用户选择的方向聚焦筛选（选了"推荐"则综合推荐）
3. 内部保留全部素材供"更换"使用
4. 生成 5 条选题
```

替换为：

```markdown
**流程：**
1. **探测阶段**：启动 1 个 SubAgent（Agent tool, subagent_type=general-purpose），对第 1 个渠道（36氪）执行探测抓取（见下方探测 prompt），确定可用通道
2. **批量抓取**：通道确定后，并行启动剩余 4 个 SubAgent，每个使用已确定的通道抓取对应渠道（见下方批量抓取 prompt）
3. 汇总所有素材（含探测 SubAgent 的结果），按用户选择的方向聚焦筛选（选了"推荐"则综合推荐）
4. 内部保留全部素材供"更换"使用
5. 生成 5 条选题
```

- [ ] **Step 2: 替换「渠道抓取策略」和 SubAgent prompt 部分**

将当前第 85-111 行（从 `### 渠道抓取策略` 到 SubAgent prompt 代码块结束）替换为：

```markdown
### 渠道抓取策略（模式 A 专用）

> ⚠️ 硬性规则：遵循「网络通道探测规则」，先探测再批量，不允许 5 个 SubAgent 同时盲启。

#### 探测 SubAgent prompt（第 1 个渠道，发给探测 SubAgent）：

```
你的任务是抓取 {URL} 的热门标题 3-5 条，同时帮我确定网络通道。

步骤1：用 WebFetch 工具抓取 {URL}，提取文章标题列表。
- 如果成功，在输出末尾附加一行：CHANNEL=webfetch

步骤2：如果步骤1失败（报错、返回空、无法提取标题），你必须使用 Skill 工具调用 agent-browser 技能，然后用 agent-browser 提供的浏览器自动化能力访问该页面并提取标题。
- 如果成功，在输出末尾附加一行：CHANNEL=browser

步骤3：如果步骤1和步骤2都失败，输出：CHANNEL=failed

输出格式：每行一个标题，编号列出，每条附带文章链接（如能获取）。格式如下：
1. 标题文字 | 链接URL
2. 标题文字 | 链接URL

最后一行必须是 CHANNEL=webfetch 或 CHANNEL=browser 或 CHANNEL=failed
```

#### 批量抓取 SubAgent prompt（剩余 4 个渠道，通道已确定）：

**当 channel = webfetch 时：**

```
你的任务是抓取 {URL} 的热门标题 3-5 条。

用 WebFetch 工具抓取 {URL}，提取文章标题列表。如果失败，返回"抓取失败"。

输出格式：每行一个标题，编号列出，每条附带文章链接（如能获取）。格式如下：
1. 标题文字 | 链接URL
2. 标题文字 | 链接URL
```

**当 channel = browser 时：**

```
你的任务是抓取 {URL} 的热门标题 3-5 条。

使用 Skill 工具调用 agent-browser 技能，然后用 agent-browser 提供的浏览器自动化能力：
1. navigate 到 {URL}
2. 等待页面加载完成
3. snapshot 获取页面内容
4. 从 snapshot 中提取标题列表

如果失败，返回"抓取失败"。

输出格式：每行一个标题，编号列出，每条附带文章链接（如能获取）。格式如下：
1. 标题文字 | 链接URL
2. 标题文字 | 链接URL
```

#### 通道判断逻辑

主流程解析探测 SubAgent 返回结果中的 `CHANNEL=xxx` 行：
- `CHANNEL=webfetch` → 剩余 4 个 SubAgent 使用 webfetch prompt
- `CHANNEL=browser` → 剩余 4 个 SubAgent 使用 browser prompt
- `CHANNEL=failed` → 提示用户"网络不可用，请检查网络后重试"，终止流程
```

- [ ] **Step 3: 验证替换正确**

Read `.claude/skills/gzh-writes/SKILL.md` 确认：
1. 模式 A 流程描述已更新为探测+批量两阶段
2. 旧的三级降级策略和旧 SubAgent prompt 已被完全替换
3. 新增了探测 prompt、webfetch 批量 prompt、browser 批量 prompt 三套模板
4. 通道判断逻辑清晰

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/gzh-writes/SKILL.md
git commit -m "feat: implement probe-first network strategy for gzh-writes Step 1 Mode A"
```

---

### Task 3: 修改 Step 1 模式 B 和 Step 2 素材搜索 — 适配通道策略

**Files:**
- Modify: `.claude/skills/gzh-writes/SKILL.md` (模式 B prompt 和 Step 2 写作流程部分)

- [ ] **Step 1: 修改模式 B 的 SubAgent prompt**

将当前模式 B 的 prompt（约第 69-81 行）替换为：

```markdown
**给 SubAgent 的 prompt：**

```
你的任务是搜索"{用户传入主题}"相关的最新资讯和深度分析。

步骤1：用 WebSearch 搜索"{用户传入主题}"，获取最新的 5-10 条相关结果。

步骤2：对搜索结果中最相关的 3-5 条，用 WebFetch 获取详细内容摘要。
- 如果 WebFetch 全部失败，改用 Skill 工具调用 agent-browser 技能，用浏览器自动化访问这些 URL 并提取内容摘要。
- 如果 WebFetch 成功，在输出末尾附加：CHANNEL=webfetch
- 如果 WebFetch 失败但 agent-browser 成功，在输出末尾附加：CHANNEL=browser
- 如果都失败，在输出末尾附加：CHANNEL=failed

输出格式：
1. 标题 | 链接URL | 一句话摘要
2. 标题 | 链接URL | 一句话摘要

最后一行必须是 CHANNEL=webfetch 或 CHANNEL=browser 或 CHANNEL=failed
```
```

- [ ] **Step 2: 修改 Step 2 写作流程中的「搜素材」步骤**

将当前第 166 行的搜素材描述：

```markdown
2. **搜素材**：用 WebFetch 搜集数据/案例；若 WebFetch 失败，**必须**调用 Skill tool 触发 `agent-browser` 技能降级抓取，不可跳过。确保每个论据有具体支撑
```

替换为：

```markdown
2. **搜素材**：复用 Step 1 确定的网络通道搜集数据/案例。如果 Step 1 通道为 `webfetch`，直接用 WebFetch；如果为 `browser`，直接用 Skill tool 调用 `agent-browser` 技能。不再重复探测。确保每个论据有具体支撑
```

- [ ] **Step 3: 验证修改正确**

Read `.claude/skills/gzh-writes/SKILL.md` 确认：
1. 模式 B prompt 包含 CHANNEL 输出行
2. Step 2 搜素材引用了 Step 1 的通道结论
3. 所有旧的独立降级逻辑已被清除

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/gzh-writes/SKILL.md
git commit -m "feat: adapt Mode B and Step 2 material search to channel probe strategy"
```

---

### Task 4: 新增「图片质量自审」环节到 Step 3

**Files:**
- Modify: `.claude/skills/gzh-writes/SKILL.md` (Step 3 配图部分，约第 230-326 行)

- [ ] **Step 1: 在 Step 3 的「配图设计原则」之后、「输出」之前插入自审章节**

在当前第 320 行（`### 配图设计原则` 的内容结束处）和第 322 行（`### 输出`）之间插入：

```markdown
### 图片质量自审

每张图片（封面图、数据图）截图完成后，**必须**执行以下自审流程，不可跳过：

#### 自审检查清单

| 检查项 | 通过标准 |
|--------|----------|
| 布局对齐 | 元素左右对称或对齐，间距均匀，无明显错位 |
| 字号层次 | 标题 > 副标题 > 正文 > 注释，大小区分清晰可辨 |
| 配色协调 | 主色不超过 3 种，对比度充足，无刺眼或冲突的配色 |
| 内容完整 | 文字无截断溢出，数据完整显示，无空白缺失区域 |
| 整体美感 | 整体看起来像专业设计的信息图，而非粗糙拼凑的截图 |

#### 自审流程

1. 截图完成后，用 Read 工具查看生成的 PNG 图片
2. 按上方 5 项检查清单逐项评估（通过/不通过）
3. **全部通过** → 展示给用户确认
4. **任一项不通过** → 定位 HTML/CSS 中的具体问题 → 修改 → 重新 Write HTML → 重新截图 → 再次自审
5. **最多迭代 3 轮**。3 轮后仍有不通过项 → 展示图片并标注已知问题，交由用户决定是否接受

#### 封面图 vs 数据图差异

- **封面图**：模板固定，重点检查文字截断和配色，通常 1 轮即通过
- **数据图**：CSS/HTML 自由度高，布局和配色问题更常见，是自审的主要价值所在
```

- [ ] **Step 2: 在封面图流程的截图命令后添加自审提示**

在当前第 304 行（封面图截图命令）之后添加一行：

```markdown
6. 执行「图片质量自审」流程（见下方自审章节）
```

- [ ] **Step 3: 在数据图流程的截图命令后添加自审提示**

在当前第 314 行（数据图截图命令）之后添加一行：

```markdown
6. 执行「图片质量自审」流程（见下方自审章节）
```

- [ ] **Step 4: 验证插入正确**

Read `.claude/skills/gzh-writes/SKILL.md` 确认：
1. 封面图生成步骤末尾有自审指引
2. 数据图生成步骤末尾有自审指引
3. 自审章节位于「配图设计原则」之后、「输出」之前
4. 检查清单 5 项完整
5. 迭代上限为 3 轮

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/gzh-writes/SKILL.md
git commit -m "feat: add image quality self-review loop to gzh-writes Step 3"
```

---

### Task 5: 全文校验与最终提交

**Files:**
- Modify: `.claude/skills/gzh-writes/SKILL.md` (全文审阅，修复任何遗漏)

- [ ] **Step 1: 全文通读 SKILL.md**

Read `.claude/skills/gzh-writes/SKILL.md` 完整文件，检查：
1. 所有对旧降级策略的引用（"WebFetch 失败后 MUST 调用 agent-browser"等）已被清除或更新
2. 「网络通道探测规则」章节与 Step 1/Step 2 的具体指令无矛盾
3. 「图片质量自审」章节与 Step 3 的流程描述一致
4. 全流程执行说明（文件末尾）是否需要更新以反映新增的自审确认点
5. Markdown 格式正确，无嵌套代码块冲突

- [ ] **Step 2: 更新全流程执行说明（如需要）**

检查文件末尾的「全流程执行说明」部分（约第 396-403 行），确认步骤描述是否需要加入自审环节的说明。如果当前描述已涵盖"等待用户确认"配图，则无需修改。

- [ ] **Step 3: 修复发现的任何问题并 Commit**

如果发现问题，修复后提交：

```bash
git add .claude/skills/gzh-writes/SKILL.md
git commit -m "fix: resolve inconsistencies in gzh-writes SKILL.md after updates"
```

如果没有问题，跳过此步。
