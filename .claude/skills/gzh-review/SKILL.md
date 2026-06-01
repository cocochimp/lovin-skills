---
name: gzh-review
description: "Use when the user says /gzh-review or asks to review WeChat public account performance data. Analyzes article metrics and generates optimization recommendations."
---

# 公众号数据调研 Skill

对已发布的公众号文章进行数据复盘，生成调研报告，并可选地将改进建议应用到 gzh-writes skill 的写作规范中。

## 触发

- `/gzh-review` — 默认拉取最近 14 天
- `/gzh-review 7` — 指定天数
- `/gzh-review 30` — 拉取最近 30 天

## 工作流

### Step 1: 拉取数据

运行数据拉取脚本：

```bash
node .claude/skills/gzh-review/scripts/fetch-stats.js --days {N} --format json
```

**错误处理**：
- `配置文件不存在` → 提示用户创建 `~/.gzh-config.json`
- `access_token 失败` → 检查 appId/appSecret 是否正确
- `errcode 45009` → API 调用频率超限，等待后重试
- 文章数为 0 → 确认天数范围，可能无已发布文章

将 JSON 输出保存到变量，进入 Step 2。

### Step 2: 分析数据

基于 JSON 数据，逐项分析：

#### 2.1 核心指标排名
- 按阅读量排名所有文章
- 计算每篇文章的分享率（share_count / int_page_read_count）
- 计算每篇文章的点赞率（like_count / int_page_read_count）
- 计算每篇文章的收藏率（add_to_fav_count / int_page_read_count）

#### 2.2 标题特征分析
分析 Top 3 和 Bottom 3 文章标题的差异特征：
- 标题字数
- 是否包含数字/金额
- 是否使用反问句或对比结构
- 是否包含热点人名/公司名

#### 2.3 选题维度分析
按 tags 分组，计算各标签维度的平均表现（阅读量、分享率）。识别高表现和低表现的选题方向。

#### 2.4 发布时间分析
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

仅在用户明确选择"应用"时执行。

#### 4.1 识别可应用的改进
从报告的"改进建议"部分，提取可以落地到以下文件的具体修改：
- `.claude/skills/gzh-writes/references/style-guide.md` — 写作风格优化
- `.claude/skills/gzh-writes/SKILL.md` — 选题策略、发布策略优化

#### 4.2 展示 Diff
将每个修改以 diff 形式展示给用户，说明修改原因和依据的数据。

#### 4.3 等待确认
**必须等待用户逐条确认**后，再使用 Edit 工具执行修改。

#### 4.4 同步根目录副本
如果 `.claude/skills/gzh-writes/` 的文件被修改，同步修改到 `gzh-writes/` 根目录副本（如果存在）。

## 约束

- 数据分析完全由 Agent 完成，不依赖额外分析脚本
- 报告使用中文
- 修改 gzh-writes 的文件前必须获得用户确认
- 不要编造数据，如果某项数据缺失，标注"数据缺失"
