---
name: skill-scenario-generator
description: 用户提供若干个 Skill 名字或链接，为每个 Skill 生成 5 个具体的、可直接复制执行的玩法场景。当用户说"给我这些 Skill 的使用案例""帮我想想这几个 Skill 怎么用""给我每个 Skill 的具体场景"时触发此 skill。
---

# Skill Scenario Generator

为用户提供的每个 Skill 生成 5 个具体、实用、可直接复制执行的玩法场景。

## 触发条件

当用户出现以下意图时触发：
- "给我这些 Skill 的使用场景"
- "这几个 Skill 怎么玩"
- "帮我想 5 个案例"
- "给我每个 Skill 的具体用法"
- 用户提供了一组 Skill 名字或链接，期望获得使用灵感

## 输入格式

用户会提供：
- Skill 名字列表（逗号、空格、换行分隔均可），例如：`agent-browser、claude-api、system-architecture-visualizer`
- 或 Skill 链接列表
- 可选：指定场景数量（默认 5 个）
- 可选：指定偏好领域（如"偏向电商""偏向前端开发"）

## 工作流程

### 第一步：识别 Skill

对用户提供的每个 Skill：
1. 如果是名字，检查当前环境中是否存在该 Skill，读取其 SKILL.md 了解能力边界
2. 如果是链接，通过 WebFetch 获取 Skill 的描述信息
3. 如果都找不到，根据名字推断其核心能力（如 agent-browser 显然是浏览器自动化）
4. 提炼出该 Skill 的一句话能力定位

### 第二步：生成场景

为每个 Skill 生成 5 个场景，每个场景包含：
1. 场景标题：简短描述（如"小红书美食探店"）
2. 完整可执行 prompt：以 `/skill-name` 开头，包含具体的任务描述、输入参数、输出要求、输出路径

场景设计原则：
- 贴近真实工作和生活场景，不要编造脱离实际的用法
- 5 个场景尽量覆盖该 Skill 的不同能力维度，避免雷同
- prompt 要足够具体，包含明确的输入、处理逻辑、输出格式和路径
- 输出路径统一使用 `~/Desktop/output/` 作为默认目录（用户可自行替换）
- 场景难度从简单到进阶递进

场景多样性要求（每个 Skill 的 5 个场景应尽量覆盖以下维度）：
- 日常生活/消费场景（如找餐厅、比价、旅行规划）
- 工作效率场景（如竞品分析、数据整理、报告生成）
- 开发者场景（如代码生成、测试、技术调研）
- 学习/知识管理场景（如整理笔记、生成知识图谱）
- 创意/探索场景（如内容创作、灵感收集）

### 第三步：组织输出

## 输出格式

严格按以下格式输出，保持简洁清晰：

```
---

## {Skill 名字}

{一句话能力定位}

**1. {场景标题}**

{完整可执行 prompt，以 /skill-name 开头}

**2. {场景标题}**

{完整可执行 prompt}

**3. {场景标题}**

{完整可执行 prompt}

**4. {场景标题}**

{完整可执行 prompt}

**5. {场景标题}**

{完整可执行 prompt}

---
```

多个 Skill 之间用 `---` 分隔。

## 输出质量标准

- 每个 prompt 必须可以直接复制粘贴执行，不需要用户额外补充信息
- 场景标题控制在 10 个字以内
- prompt 中包含明确的输出文件路径和格式要求
- 不要出现"请替换为你的 xxx"这类占位符，直接给出具体示例值
- 如果 Skill 支持截图/图片，场景中要体现图片输出
- 语言风格：简洁直接，不要废话

## 示例

输入：`agent-browser、claude-api`

输出：

---

## agent-browser

浏览器自动化，适合抓数据、填表单、测试网页等。

**1. 小红书美食探店**

/agent-browser 在小红书搜索"杭州银泰in77美食"，找到评价最高的10家餐厅，整理名称、人均价格、推荐菜、评分到 ~/Desktop/output/in77_food.md，配上每家店的封面截图保存到同目录

**2. 竞品官网功能对比**

/agent-browser 分别打开 notion.so、飞书文档、语雀 的官网，截图首页，提取各自的核心功能卖点，整理成对比表格输出到 ~/Desktop/output/doc_tools_compare.md

**3. GitHub Trending 周报**

/agent-browser 打开 GitHub Trending 页面，筛选 Java 语言、本周，抓取前20个项目的名称、star数、描述，输出到 ~/Desktop/output/github_trending_java.md

**4. 自动化冒烟测试**

/agent-browser 打开我本地 localhost:7001 的应用，检查首页是否正常加载，截图保存，然后访问 /checkpreload.htm 验证返回 success，把测试结果写到 ~/Desktop/output/smoke_test.md

**5. 电商比价助手**

/agent-browser 分别在京东和淘宝搜索"索尼 WH-1000XM5"，抓取前5个商品的价格、店铺、销量，整理成对比表格输出到 ~/Desktop/output/price_compare.md，并截图各商品页面

---

## claude-api

用 Claude API / Anthropic SDK 构建 AI 应用。

**1. 代码 Review 机器人**

/claude-api 帮我写一个 Python 脚本，用 Anthropic SDK 调用 Claude API，输入一段代码，返回代码审查意见（包括安全风险、性能建议、代码风格），支持从命令行传入文件路径

**2. Markdown 文档智能摘要**

/claude-api 用 TypeScript + @anthropic-ai/sdk 写一个 CLI 工具，读取指定目录下所有 .md 文件，调用 Claude 生成每篇文档的摘要，最终输出一个汇总的 summary.md

**3. 多轮对话客服 Demo**

/claude-api 用 Python + Anthropic SDK 实现一个终端多轮对话 demo，支持 system prompt 自定义角色（比如电商客服），保持上下文记忆，输入 quit 退出

**4. 结构化数据提取**

/claude-api 写一个 Python 脚本，用 Claude API 的 tool_use 功能，从非结构化的招聘 JD 文本中提取岗位名称、薪资范围、技术栈要求、学历要求，输出为 JSON 格式

**5. Git Commit 日报生成器**

/claude-api 写一个 Shell + Python 脚本，读取当天的 git log，调用 Claude API 生成一份结构化的工作日报（做了什么、改了哪些模块、关键变更），输出到 ~/Desktop/output/daily_report.md

---

## 边界

- 如果无法识别某个 Skill 的能力，明确告知用户而不是瞎编场景
- 不要生成涉及隐私、安全攻击、违规爬虫的场景
- 输出路径中不要包含真实的敏感路径，使用通用的 output 目录
