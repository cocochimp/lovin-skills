---
name: gzh-review
description: "Use when the user says /gzh-review or asks to review WeChat public account performance data. Analyzes article metrics and generates optimization recommendations."
---

# 公众号数据调研 Skill

对已发布的公众号文章进行数据复盘，生成调研报告，并将改进建议应用到 gzh-writes skill，让它写出流量更好的文章。

## 触发

- `/gzh-review` — 默认分析全部可见数据
- `/gzh-review 7` — 只看最近 7 天

## 工作流

### Step 1: 浏览器抓取数据

使用 agent-browser skill 从公众号后台抓取内容分析数据。

#### 1.1 打开登录页

调用 agent-browser 以 **--headed 模式**打开 `https://mp.weixin.qq.com`（mp.weixin.qq.com 会检测 headless 浏览器，headless 会被重定向拦截），截图展示二维码，提示用户：

> "请用微信扫码登录公众号后台，登录完成后告诉我。"

**等待用户确认已登录**，然后用 snapshot 确认已进入后台主页。

#### 1.2 导航到内容分析

登录确认后，直接 goto `https://mp.weixin.qq.com/#/datacube/content` 跳转到内容分析页。

用 snapshot 确认到达正确页面。如果 URL 失效（页面空白或重定向），降级为菜单导航：点击左侧「统计」→「内容分析」。

#### 1.3 提取表格数据

目标字段：标题、发布日期、阅读量、分享次数、点赞次数、收藏次数、评论数（如有）、完读率（如有）。

**优先路径 — 导出功能**：
1. 先用 snapshot 检查页面是否有"导出数据"按钮
2. 如果有，直接下载 CSV/Excel 并解析，跳过下面的手动提取

**手动提取路径**：
1. 用 `agent-browser eval` 注入 JS，从 DOM 批量提取列表页所有行数据（避免逐条 click+navigate）
2. 用 snapshot 确认提取结果（比 screenshot 更快更可靠）
3. 仅在需要完读率、阅读时长等**详情页独有数据**时，批量获取详情页 URL 后逐篇访问
4. 如果表格有分页，翻页后**必须重新 snapshot** 刷新元素引用再提取

将提取的数据整理为结构化格式，进入 Step 2。

### Step 2: 关联本地文章 + 分析数据

#### 2.1 本地文章匹配

读取 `docs/gzh/*.md` 的 YAML frontmatter，按标题模糊匹配线上文章，关联 tags 信息用于选题分析。

#### 2.2 核心指标排名
- 按阅读量排名所有文章
- 计算每篇文章的分享率（分享 / 阅读量）
- 计算每篇文章的点赞率（点赞 / 阅读量）
- 计算每篇文章的收藏率（收藏 / 阅读量）

#### 2.3 标题特征分析

分析 Top 3 和 Bottom 3 文章标题的差异特征：
- 标题字数
- 是否包含数字/金额
- 是否使用反问句或对比结构
- 是否包含热点人名/公司名

#### 2.4 选题维度分析

按 tags 分组，计算各标签维度的平均表现（阅读量、分享率）。识别高表现和低表现的选题方向。

#### 2.5 发布时间分析
- 工作日 vs 周末的平均阅读量差异
- 识别最佳发布日期模式

### Step 3: 生成报告

参考 `templates/report-template.md` 的结构，生成完整报告。

**输出路径**：`docs/gzh-review/review-{YYYY-MM-DD}.md`

生成后：
1. 展示报告摘要给用户
2. 告知完整报告已保存到文件
3. **等待用户确认**，询问是否需要将改进建议应用到 gzh-writes skill

### Step 4: 应用改进建议（可选）

仅在用户明确选择"应用"时执行。**核心目标：让 gzh-writes 写出流量更好的文章。**

#### 4.1 识别可应用的改进

从报告的数据洞察中，提取可以落地的具体修改：
- `.claude/skills/gzh-writes/references/style-guide.md` — 写作风格优化（标题写法、正文结构）
- `.claude/skills/gzh-writes/SKILL.md` — 选题策略优化（高流量选题方向、避开低流量方向）

#### 4.2 展示 Diff

将每个修改以 diff 形式展示给用户，说明：
- 修改了什么
- 为什么改（对应哪条数据洞察）
- 预期效果

#### 4.3 等待确认

**必须等待用户逐条确认**后，再使用 Edit 工具执行修改。

#### 4.4 同步根目录副本

如果 `.claude/skills/gzh-writes/` 的文件被修改，同步修改到 `gzh-writes/` 根目录副本（如果存在）。

## 约束

- 数据通过浏览器自动化从公众号后台获取，不依赖微信 API
- 数据分析完全由 Agent 完成，不依赖额外分析脚本
- 报告使用中文
- 修改 gzh-writes 的文件前必须获得用户确认
- 不要编造数据，如果某项数据缺失，标注"数据缺失"

### agent-browser 使用规范

- **必须使用 --headed 模式**：微信后台会拦截 headless 浏览器，导致重定向失败
- **优先用 snapshot 提取数据**：比 screenshot 更快更可靠，仅在需要视觉确认时用 screenshot
- **页面导航或滚动后，必须重新 snapshot**：刷新元素引用（@eN 会过期，直接用会报错）
- **优先用 eval 注入 JS 批量提取数据**：避免逐条 click+navigate，大幅减少 token 消耗
