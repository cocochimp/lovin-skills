---
name: ddd-rules-generator
description: 从语雀 DDD 文档中提炼 Claude Code Rules 编码规则。当用户提到"生成DDD规则"、"更新DDD规则"、"ddd rules"、"同步DDD规则"时触发。即使用户只是说"更新一下规则"或"把语雀文档转成规则"，只要上下文涉及 DDD 相关内容，也应触发此技能。
---

# DDD Rules Generator

从语雀 DDD 文档中自动提炼编码规则，输出为项目级 `.claude/rules/` 下的 Rule 文件。每个语雀文档对应一个独立的 Rule 文件，按主题拆分，支持增量更新。

## 工作流程

### Step 1: 读取配置

读取本 Skill 目录下的 `sources.yaml` 文件，解析出所有待处理的语雀 URL 及其 topic 映射。

配置路径：与本 SKILL.md 同目录的 `sources.yaml`

如果 `sources.yaml` 为空或不存在，提示用户先配置 URL 列表。

### Step 2: 并行派发 SubAgent

为 `sources.yaml` 中的每个 URL 条目启动一个独立的 SubAgent（使用 Agent tool），并行执行。

每个 SubAgent 的输入：
- 语雀 URL
- topic 名称
- globs 配置（如果有）
- Rule 模板格式（读取 `references/rule-template.md`）
- 当前已有的对应 Rule 文件内容（如果 `.claude/rules/ddd-{topic}.md` 存在，传入供参考）

每个 SubAgent 的任务：

```
你是一个 DDD 规则提炼专家。

任务：
1. 用 skylark_resolve_url 解析语雀 URL 得到 doc_id
2. 用 skylark_doc_detail 读取文档全文
3. 按下方模板格式，从文档中提炼出 Claude Code Rules 编码规则

语雀 URL：{url}
主题：{topic}
Globs：{globs}

提炼要求：
1. 提炼核心原则（3-5 条，简洁有力，是可执行的指令而非概念解释）
2. 提炼编码约束（具体的 DO / DON'T，每条约束必须对应一个明确的编码行为）
3. 给出正确和错误的 Java 代码示例（从文档中提取或根据文档原则构造）
4. 规则用中文书写，代码示例用 Java
5. 如果文档内容过于抽象缺少具体编码约束，标注哪些部分是你根据 DDD 最佳实践推断补充的

已有 Rule 内容（如果有，仅供参考当前规则覆盖了什么，不要受其束缚）：
{existing_rule_content}

输出格式：返回完整的 Rule 文件内容（包含 YAML frontmatter），严格按照以下模板：

---
description: {description}
globs:
{globs_yaml}
---

<!-- auto-generated from: {url} -->

# DDD {Topic} 规则

## 核心原则

- ...

## 编码约束

- DO: ...
- DON'T: ...

## 示例

```java
// 正确示例
...

// 错误示例
...
```
```

SubAgent 只负责读取语雀文档和提炼规则内容，不负责写入文件。

### Step 3: 汇总结果

收集所有 SubAgent 返回的 Rule 文件内容。如果某个 SubAgent 失败（URL 无法解析、文档不存在等），记录错误信息，继续处理其他文档。

### Step 4: Diff 展示

对比 SubAgent 返回的新内容与现有 `.claude/rules/ddd-{topic}.md` 文件：

**首次运行（文件不存在）：** 标记为"新增"，展示完整内容摘要。

**后续更新：** 分三种情况展示：
- **无变化** — 告知用户该文件无需更新
- **有变化** — 展示变更摘要：新增了哪些规则、修改了哪些、删除了哪些
- **新增文件** — 标记为新增（对应 sources.yaml 中新加的 URL）

**孤儿文件检测：** 扫描 `.claude/rules/ddd-*.md` 文件，如果某个文件对应的 topic 不在当前 `sources.yaml` 中，提示用户是否删除。不自动删除。

向用户展示完整的变更摘要，等待确认。

### Step 5: 写入

用户确认后，批量写入所有有变化的 Rule 文件到 `.claude/rules/` 目录。

写入完成后，列出所有已生成/更新的文件路径。

## 注意事项

- 每个 SubAgent 独立处理一篇文档，保持上下文干净，避免文档间互相干扰
- SubAgent 应并行启动（在同一个 message 中发起多个 Agent tool 调用）
- 如果用户只想更新某个特定 topic，可以只处理对应的 URL，不必全量运行
- Rule 文件头部的 `<!-- auto-generated from: {url} -->` 注释用于溯源，不要删除
- 生成的规则必须是"可执行的编码指令"，不是 DDD 概念科普
