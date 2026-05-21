---
name: gzh-writes
description: 公众号自媒体内容生产全流程。触发词："公众号"、"写公众号"、"gzh"、"/gzh-writes"。输入 /gzh-writes 进入方向选择后自动执行选题→写文→配图→发布；输入 /gzh-writes "主题" 直接以该主题进入全流程。
---

# 公众号编写发布Skill

## 触发方式

| 命令            | 行为 |
|---------------|------|
| `/gzh-writes` | 进入交互菜单选方向，然后全流程（选题→写文→配图→发布） |
| `/gzh-writes "具体主题"` | 跳过菜单，直接搜索该主题相关内容，进入全流程 |

---

## 网络通道探测规则

所有需要网络抓取的环节都遵循以下探测优先策略：

1. **探测阶段**：先启动 1 个 SubAgent，对第一个目标尝试 WebFetch
   - 成功 → 通道为 `webfetch`
   - 失败 → 改用 Skill tool 调用 `agent-browser` 重试
     - 成功 → 通道为 `browser`
     - 也失败 → 提示用户"网络不可用"，终止流程
2. **批量阶段**：通道确定后，剩余 SubAgent 并行启动，全部使用已确定的通道
3. **通道复用**：Step 1 确定的通道在 Step 2 直接复用，不再重复探测

---

## 交互入口

**1、无参数（`/gzh-writes`）：**

使用 AskUserQuestion 提问："选择内容方向："，options：推荐（综合热点）/ 商业 / AI科技 / 时政

选择后进入 Step 1 → Step 2 → Step 3 → Step 4 全流程。

**2、有参数（`/gzh-writes "具体主题"`）：**

跳过菜单，启动 1 个 SubAgent 直接搜索该主题相关内容，进入全流程。

---

## Step 1：选题

### 模式 A — 无参数（用户选了方向）

**数据源（5 个固定渠道）：**

| 渠道 | URL | 方向 |
|------|-----|------|
| 36氪 | https://www.36kr.com | 综合/科技 |
| 财联社深度 | https://www.cls.cn/depth | 财经/时政 |
| 虎嗅 | https://www.huxiu.com | 商业/产业 |
| 钛媒体 | https://www.tmtpost.com | 科技/商业 |
| 界面新闻 | https://www.jiemian.com | 时政/财经 |

**流程：**
1. 启动 1 个探测 SubAgent 抓取第 1 个渠道（36氪），确定通道
2. 通道确定后，并行启动剩余 4 个 SubAgent 批量抓取
3. 汇总素材，按用户方向筛选，生成 5 条选题
4. 内部保留全部素材供"更换"使用

### 模式 B — 有参数（`/gzh-writes "xxx"`）

启动 1 个 SubAgent 用 WebSearch 搜索该主题，获取 5-10 条结果，对最相关的 3-5 条用 WebFetch 获取摘要。从结果中生成 5 条选题。

### 渠道抓取 SubAgent prompt（通用模板）

> ⚠️ 硬性规则：遵循「网络通道探测规则」，先探测再批量。

~~~
你的任务是抓取 {URL} 的热门标题 3-5 条。

【探测模式专用 — 仅第 1 个 SubAgent 执行】
步骤1：用 WebFetch 抓取 {URL}，提取标题列表。成功则末尾附加：CHANNEL=webfetch
步骤2：若步骤1失败，用 Skill 工具调用 agent-browser 技能访问该页面提取标题。成功则末尾附加：CHANNEL=browser
步骤3：若都失败，输出：CHANNEL=failed

【批量模式 — 通道已确定】
- channel=webfetch：用 WebFetch 抓取 {URL}
- channel=browser：用 Skill 工具调用 agent-browser 技能访问 {URL}
失败则返回"抓取失败"。

输出格式：
1. 标题文字 | 链接URL
2. 标题文字 | 链接URL

探测模式最后一行必须是 CHANNEL=webfetch / CHANNEL=browser / CHANNEL=failed
~~~

主流程解析探测结果中的 `CHANNEL=xxx` 行决定后续通道。`CHANNEL=failed` 则终止流程。

**选题展示格式：**

```
1. [标题]（来源）
   URL | 论点：核心观点 | 角度：切入视角 | 争议点：讨论方向
```

展示 5 条后提示：`💡 输入"更换"可获取下一批选题`。"更换"从缓存素材重新生成，无需重抓。

---

## Step 2：写文

### 标题角度

用户选定选题后，分主观/客观两组各生成 5 个标题角度，共 10 个：

```
### 主观角度（5个）
1. [标题] — 角度说明
...
### 客观角度（5个）
1. [标题] — 角度说明
...
```

选定后根据所在分组自动适配写作约束。

### 写作引擎规格

- **字数：** 700-900字（硬限制）
- **风格：** 根据所选标题维度自动决定

### 写作流程

1. **定结构**：用3句话概括核心论点/事实、论据/信息、结尾走向
2. **搜素材**：复用 Step 1 通道搜集数据/案例（webfetch 直接用 WebFetch，browser 用 agent-browser，不再探测）
3. **写初稿**
4. **口语化检验**：逐句默读，拗口的改顺
5. **删废话**：每句必须推进论点/信息
6. **字数检查**：超 900 字砍最弱论据段

### 写作约束 —「主观看法」模式

- 开头即亮刀：第一句抛争议性观点或反常识结论
- 论据2-3个，每个有数据或具体案例
- 语气像跟聪明朋友聊天，有逻辑骨架；善用反问、类比
- 结尾不总结，要么反转要么留一个值得深想的问题
- **重点标记**：2-4 处红色加粗标记（**「核心判断句」**），用于全文最锋利的判断或数据；另有 2-3 处普通加粗用于关键数据/结论
- 禁止：空洞抒情、排比堆砌、"让我们一起xxx"、任何 AI 味表达

### 写作约束 —「客观说明」模式

- 开头用事实/数据/事件引入话题，不抛观点
- 内容以信息增量为核心：what happened → why → so what
- 论据要求同主观模式（具体公司/人名/时间），但不做价值判断
- 语气克制中立，像一份高质量简报
- 可以在结尾点出"值得关注的方向"，但不下结论
- **重点标记**：2-4 处红色加粗标记（关键数据/事实节点）；另有 2-3 处普通加粗
- 禁止：主观评价（"我认为""显然"）、情绪化用词、煽动性表达

### 正文标题选择

写作完成后，生成 3-5 个正文标题选项。标题要直入主题，简洁有力，不加前缀不绕弯。正文标题和封面内容可以相同。

示例：`英伟达Q1财报拆解：营收441亿美元，同比增长69%`

用户选定后写入 md 文件 frontmatter 的 title 字段。

### 输出

文件保存至：`docs/gzh/{YYYY-MM-DD}-{关键词}.md`

```markdown
---
title: 用户选定的正文标题
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
| 封面图 | `assets/cover_template.html` | 1080×608（16:9） |
| 数据图 | `assets/data_template.html` | 1080宽，高度自适应（fullpage截图） |

### 数据图参考类型

- **对比卡片**：左右/上下对比，适合 A vs B 场景
- **数据表格**：行列结构化数据，适合多维数据
- **流程/时间轴**：节点连线，适合事件演进、因果链

### 封面图流程

**封面方案选择（交互确认）：**

生成 3-5 组封面方案，每组包含主标题（标注红色高亮词）、副标题、右下角背景数字。主标题要直入主题，传递信息而非抽象概括。

示例：
```
方案1:
  主标题: 英伟达Q1营收<red>441亿美元</red>
  副标题: 数据中心业务同比增长73%成主引擎
  背景数字: $441B
```

用户选定后执行以下步骤：

**封面设计规范（三要素）：**
- **主标题**：1-2 行，关键词用红色（`var(--accent)` #E94560）标注
- **副标题**：1 行补充概述，浅色（`var(--ink-light)`）
- **右下角背景数字**：量化指标，大字号低透明度（`rgba(accent, 0.15)`）

**生成步骤：**
1. 组装标题 HTML，红色词用 `<span class="accent">关键词</span>` 包裹；超10字用 `<br>` 分行
2. Read `assets/cover_template.html`，填充 `{{TITLE_HTML}}`、`{{SUBTITLE}}`、`{{CUSTOM_CSS}}`（含背景数字伪元素）
3. Write 到 `/tmp/gzh_cover_{YYYY-MM-DD}-{关键词}.html`
4. 截图：`node .claude/skills/gzh-writes/assets/capture.js /tmp/gzh_cover_{YYYY-MM-DD}-{关键词}.html docs/pic/gzh-cover-{YYYY-MM-DD}-{关键词}.png 1080 608`
5. 执行图片质量自审

### 数据图流程

1. 从文章提取适合可视化的数据/对比/流程
2. Read `assets/data_template.html`，填充 `{{CUSTOM_CSS}}` 和 `{{CONTENT_HTML}}`
3. Write 到 `/tmp/gzh_data_{YYYY-MM-DD}-{关键词}.html`
4. 截图：`node .claude/skills/gzh-writes/assets/capture.js /tmp/gzh_data_{YYYY-MM-DD}-{关键词}.html docs/pic/gzh-data-{YYYY-MM-DD}-{关键词}-{n}.png 1080 800 fullpage`
5. 执行图片质量自审

### 配图设计原则

- 封面图：深色背景 + 大标题，简洁有力，远看能识别文字
- 数据图：浅色背景，商业质感，信息清晰，无多余装饰
- 两者都保留噪点纹理增加质感

### 图片质量自审

每张图片截图完成后必须执行，不可跳过：

1. 用 Read 工具查看生成的 PNG
2. 逐项检查：布局对齐 / 字号层次 / 配色协调（≤3色）/ 内容完整（无截断溢出）/ 整体美感
3. 全部通过 → 展示给用户确认
4. 任一项不通过 → 修改 HTML/CSS → 重新截图 → 再次自审（最多 3 轮，3 轮后标注问题交用户决定）

### 输出

- 封面：`docs/pic/gzh-cover-{YYYY-MM-DD}-{关键词}.png`
- 数据图：`docs/pic/gzh-data-{YYYY-MM-DD}-{关键词}-{n}.png`

### 前置条件

首次使用需安装依赖：`cd .claude/skills/gzh-writes && npm install && npx playwright install chromium`

---

## Step 4：发布

通过微信公众平台 API 将文章存入草稿箱（不会直接发布）。

### 发布流程

1. **展示发布清单**（等待用户确认）：文章标题、封面图路径、文中配图及插入位置、摘要、检查项
2. **用户确认后执行**：

```bash
# Markdown → 微信兼容 HTML
node .claude/skills/gzh-writes/scripts/md2wx.js docs/gzh/{文章}.md /tmp/gzh_wx_{date}.html --image docs/pic/gzh-data-{date}-1.png:{段落位置}

# 上传素材 + 创建草稿
node .claude/skills/gzh-writes/scripts/publish.js \
  --title "文章标题" \
  --content /tmp/gzh_wx_{date}.html \
  --cover docs/pic/gzh-cover-{date}.png \
  --summary "50字摘要"
```

3. **输出**：草稿 media_id，提示用户登录 mp.weixin.qq.com 查看草稿箱

### 配置前置条件

凭证存储在 `~/.gzh-config.json`（不进代码仓库）：
```json
{ "appId": "你的appId", "appSecret": "你的appSecret" }
```

需要在微信公众平台后台 → 设置与开发 → 基本配置 → IP白名单中添加本机 IP。

---

## 全流程执行说明

1. 选题 → 展示5个 → **等待确认**（支持"更换"）
2. 10个标题角度 → **选标题** → 写文 → **确认/修改**
3. 3-5 个正文标题 → **选定** → 写入 md
4. 3-5 组封面方案 → **选定** → 生成封面图 → 数据图 → **确认**
5. 发布清单 → **确认** → 执行发布

每步之间必须有确认点，不要一口气跑完全流程。
