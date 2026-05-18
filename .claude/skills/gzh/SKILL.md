---
name: gzh
description: 公众号自媒体内容生产全流程。触发词："公众号"、"写公众号"、"gzh"、"/gzh"。支持选题、写文、配图、发布四个阶段，可单独触发也可全流程执行。
---

# 公众号内容生产技能

## 触发方式

| 命令 | 作用 |
|------|------|
| `/gzh` | 全流程（选题→写文→配图→发布），每步有确认点 |
| `/gzh 选题 [方向]` | 只出选题列表，方向可选：商业/思考/热点 |
| `/gzh 写文 [主题]` | 直接写文章 |
| `/gzh 配图 [文章路径]` | 为已有文章生成配图 |
| `/gzh 发布` | 输出发布就绪内容包 |

---

## Step 1：选题

**数据源（固定渠道）：**

| 渠道 | URL | 抓取目标 |
|------|-----|----------|
| 36氪 | https://www.36kr.com | 首页热门标题 5-10 条 |
| 财联社深度 | https://www.cls.cn/depth | 深度分析文章标题 5-10 条 |
| 微博热搜 | https://weibo.com/hot/search | 社会/泛热点 5-10 条 |

**流程：**
1. 并行启动 3 个 SubAgent（Agent tool, subagent_type=general-purpose），每个负责一个渠道的数据抓取
2. 汇总三渠道数据（约 15-30 条素材）
3. 如用户指定方向则聚焦筛选，否则综合推荐
4. 生成 5 个选题，每个包含：

**抓取策略（每个 SubAgent 必须严格执行，不可跳过任何步骤）：**

> ⚠️ 硬性规则：WebFetch 失败后 MUST 调用 agent-browser 技能降级抓取，禁止直接返回空结果。

1. **第一步：WebFetch** — 用 WebFetch 抓取目标 URL，提取标题列表
2. **第二步：降级 agent-browser（必须执行）** — 若 WebFetch 返回错误、空内容、或无法提取有效标题 → **必须**使用 Skill tool 调用 `agent-browser` 技能，执行以下操作：
   - navigate 到目标 URL
   - 等待页面加载完成
   - snapshot 获取页面内容
   - 从 snapshot 中提取标题列表
3. **第三步：均失败** — 仅当 WebFetch 和 agent-browser 都失败后，才返回空结果

**给 SubAgent 的 prompt 必须包含以下完整指令（直接复制）：**

```
你的任务是抓取 {URL} 的热门标题 5-10 条。严格按以下步骤执行：

步骤1：用 WebFetch 工具抓取 {URL}，提取文章标题列表。

步骤2：如果步骤1失败（报错、返回空、无法提取标题），你必须使用 Skill 工具调用 agent-browser 技能，然后用 agent-browser 提供的浏览器自动化能力访问该页面并提取标题。不可跳过此步骤。

步骤3：仅当步骤1和步骤2都失败时，返回"抓取失败"。

输出格式：每行一个标题，编号列出。
```

```
1. [标题]
   论点：一句话核心观点
   角度：切入视角说明
   争议点：可能引发的讨论方向
```

4. 等待用户选定后进入下一步

---

## Step 2：写文

### 写作引擎规格

- **字数：** 700-900字（硬限制，写完后检查）
- **风格：** 观点先行、论据锋利、口语化表达（详见 references/style-guide.md）

### 写作流程

1. **定结构**：用3句话概括——核心论点是什么、用什么论据支撑、结尾走向哪里
2. **搜素材**：用 WebFetch 搜集数据/案例；若 WebFetch 失败，**必须**调用 Skill tool 触发 `agent-browser` 技能降级抓取，不可跳过。确保每个论据有具体支撑
3. **写初稿**：按"亮刀→论据推进→反转/留问"结构完成
4. **口语化检验**：逐句默读，拗口的改顺
5. **删废话**：每句话必须推进论点，删掉不影响理解的句子
6. **字数检查**：确认700-900字范围内

### 写作约束

- 开头即亮刀：第一句抛争议性观点或反常识结论
- 论据2-3个，每个有数据或具体案例
- 语气像跟聪明朋友聊天，有逻辑骨架；善用反问、类比
- 结尾不总结，要么反转要么留一个值得深想的问题
- 禁止：空洞抒情、排比堆砌、"让我们一起xxx"、任何 AI 味表达

### 输出

文件保存至：`docs/gzh/{YYYY-MM-DD}-{关键词}.md`

文件格式：
```markdown
---
title: 文章标题
date: YYYY-MM-DD
tags: [标签1, 标签2]
summary: 50字以内摘要
---

正文内容
```

---

## Step 3：配图

自主生成公众号专属配图，无需依赖外部技能。

| 用途 | 模板 | 规格 |
|------|------|------|
| 封面图 | `assets/cover_template.html` | 1080×608（16:9，公众号封面规范） |
| 数据图 | `assets/data_template.html` | 1080宽，高度自适应（fullpage截图） |

### 封面图流程

1. 从文章提取封面标题（可以是抓眼球的变体）和副标题
2. Read `assets/cover_template.html`
3. 填充占位符：
   - `{{TITLE_HTML}}`：封面大标题（用 `<div class="title">` 包裹）
   - `{{SUBTITLE}}`：副标题文字
   - `{{CUSTOM_CSS}}`：可选的自定义样式覆盖（如调整配色、字号）
4. Write 到 `/tmp/gzh_cover_{YYYY-MM-DD}.html`
5. 截图：`node .claude/skills/gzh/assets/capture.js /tmp/gzh_cover_{YYYY-MM-DD}.html docs/pic/gzh-cover-{YYYY-MM-DD}.png 1080 608`

### 数据图流程

1. 从文章提取适合可视化的数据/对比/流程
2. Read `assets/data_template.html`
3. 根据内容从零设计 CSS+HTML，填充：
   - `{{CUSTOM_CSS}}`：完整的自定义样式（布局、配色、排版）
   - `{{CONTENT_HTML}}`：数据可视化内容（图表、对比卡片、流程图等）
4. Write 到 `/tmp/gzh_data_{YYYY-MM-DD}.html`
5. 截图：`node .claude/skills/gzh/assets/capture.js /tmp/gzh_data_{YYYY-MM-DD}.html docs/pic/gzh-data-{YYYY-MM-DD}-{n}.png 1080 800 fullpage`

### 配图设计原则

- 封面图：深色背景 + 大标题，简洁有力，远看能识别文字
- 数据图：浅色背景，商业质感，信息清晰，无多余装饰元素
- 两者都保留噪点纹理增加质感，但不添加署名、编码等无关元素

### 输出

- 封面：`docs/pic/gzh-cover-{YYYY-MM-DD}.png`
- 数据图：`docs/pic/gzh-data-{YYYY-MM-DD}-{n}.png`

### 前置条件

首次使用需安装依赖：`cd .claude/skills/gzh && npm install && npx playwright install chromium`

---

## Step 4：发布

输出最终发布清单：

```
## 发布清单

### 文章
[完整 Markdown 正文]

### 封面图
路径：xxx

### 文中配图
- 图1路径：xxx（插入位置：第X段后）

### 摘要
[50字以内，用于公众号摘要字段]

### 检查项
- [ ] 标题是否抓眼球
- [ ] 封面图文字清晰
- [ ] 文中配图位置合理
- [ ] 摘要是否引发点击欲
```

---

## 全流程执行说明

当用户触发 `/gzh`（无子命令）时：

1. 执行选题 → 展示5个选题 → **等待用户确认**
2. 执行写文 → 展示初稿 → **等待用户确认/修改意见**
3. 执行配图 → 展示配图结果 → **等待用户确认**
4. 执行发布 → 输出完整发布包

每步之间必须有确认点，不要一口气跑完全流程。
