# DDD Rules Generator Skill 设计文档

## 概述

一个 Claude Code Skill，从语雀 DDD 文档中自动提炼出 `.claude/rules/` 下的编码规则文件。支持动态配置 URL 列表，增量更新时展示 Diff 供用户确认。

## Skill 目录结构

```
.claude/skills/ddd-rules-generator/
├── SKILL.md              # Skill 主入口，定义触发词和主流程
├── sources.yaml          # URL 配置列表（用户维护）
└── references/
    └── rule-template.md  # Rule 文件的输出模板/格式规范
```

## 配置格式（sources.yaml）

```yaml
sources:
  - url: "https://yuque.antfin.com/xxx/ddd-model-layer"
    topic: "ddd-model-layer"
    globs:
      - "src/**/model/**/*.java"
  - url: "https://yuque.antfin.com/xxx/ddd-domain-layer"
    topic: "ddd-domain-layer"
    globs:
      - "src/**/domain/**/*.java"
  - url: "https://yuque.antfin.com/xxx/ddd-application-layer"
    topic: "ddd-application-layer"
    globs:
      - "src/**/application/**/*.java"
```

- `topic` 决定输出文件名：`.claude/rules/ddd-{topic}.md`
- `globs` 可选，限定该 Rule 的作用范围，默认 `src/**/*.java`

## 输出格式（Rule 文件）

每个生成的 `.claude/rules/ddd-{topic}.md`：

```markdown
---
description: 当涉及 {topic} 相关代码编写时自动应用
globs:
  - "src/**/*.java"
---

<!-- auto-generated from: {url} -->

# DDD {Topic} 规则

## 核心原则

- ...（3-5 条，简洁有力）

## 编码约束

- DO: ...
- DON'T: ...

## 示例

​```java
// 正确示例
...

// 错误示例
...
​```
```

## 主流程

**触发词：** "生成DDD规则"、"更新DDD规则"、"ddd rules"

**步骤：**

1. **读取配置** — 解析 `sources.yaml`，获取 URL 列表和 topic 映射
2. **并行派发 SubAgent** — 为每个 URL 启动一个 SubAgent（Agent tool），传入：
   - 语雀 URL
   - topic 名称
   - Rule 模板格式要求
   - 已有的对应 Rule 文件内容（如果存在，用于参考）
3. **汇总结果** — 收集所有 SubAgent 返回的 Rule 内容
4. **Diff 展示** — 对比现有 `.claude/rules/ddd-*.md` 文件，向用户展示变更摘要
5. **写入** — 用户确认后写入 `.claude/rules/`

## SubAgent 设计

**每个 SubAgent 的职责：**

- 用 `skylark_resolve_url` 解析语雀 URL 得到 doc_id
- 用 `skylark_doc_detail` 读取文档全文
- 按 Rule 模板格式提炼出规则内容
- 返回完整的 Rule 文件内容（markdown 字符串）

**SubAgent Prompt 核心指令：**

```
你是一个 DDD 规则提炼专家。

任务：阅读以下语雀文档内容，提炼出适用于 Claude Code Rules 的编码规则。

主题：{topic}
Globs：{globs}

要求：
1. 提炼核心原则（3-5 条，简洁有力）
2. 提炼编码约束（具体的 do / don't）
3. 给出正确和错误的代码示例
4. 规则必须是可执行的指令，不是概念解释
5. 用中文书写规则，代码示例用 Java
6. 如果文档内容过于抽象缺少具体约束，标注哪些部分是推断补充的

输出格式：按照 Rule 模板格式返回完整的 .md 文件内容。
```

**设计原则：**

- SubAgent 只负责读取+提炼，不负责写入文件
- 每个 SubAgent 只处理一篇文档，上下文干净
- 并行执行，效率高

## 智能 Diff 与更新策略

**首次运行：** 直接生成所有 Rule 文件，无需 Diff。

**后续更新时：**

1. SubAgent 返回新的 Rule 内容
2. 主流程读取现有 `.claude/rules/ddd-{topic}.md`
3. 对比新旧内容，分三种情况：
   - **无变化** — 跳过，告知用户该文件无需更新
   - **有变化** — 展示变更摘要（新增了哪些规则、修改了哪些、删除了哪些）
   - **新增文件** — 标记为新增（对应新加的 URL）
4. 用户确认后批量写入

**URL 被移除的情况：**

当 `sources.yaml` 中某个 URL 被删除，但 `.claude/rules/` 中对应文件还在时：
- 主流程检测到"孤儿文件"，提示用户是否删除
- 不自动删除，交给用户决定

**用户手动修改过 Rule 文件的情况：**

- 每次更新时展示完整 Diff（新内容 vs 当前文件内容）
- 用户自行判断是否覆盖
- 文件头部 `<!-- auto-generated from: {url} -->` 注释作为溯源标记

## 关键设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| Rule 粒度 | 按主题拆分多文件 | 对应语雀文档分层结构，增量更新友好 |
| 配置位置 | Skill 内部 sources.yaml | 集中管理，不污染项目根目录 |
| 读取策略 | 每次全量读取 | 语雀 MCP 调用成本低，避免缓存复杂度 |
| SubAgent 策略 | 按文档并行 | 上下文隔离，专注力不分散 |
| 更新策略 | Diff 展示 + 用户确认 | 保护手动修改，用户有完全控制权 |
| 一致性检查 | 不做 | 源文档本身应保持一致，Skill 不擅自修改 |
| 输出范围 | 项目级 .claude/rules/ | 不同项目可有不同 DDD 规则 |

## 使用示例

**首次生成：**
```
用户：生成DDD规则
Skill：读取 sources.yaml，发现 3 个 URL...
      并行读取语雀文档并提炼规则...
      生成 3 个 Rule 文件：
      - .claude/rules/ddd-model-layer.md (新增)
      - .claude/rules/ddd-domain-layer.md (新增)
      - .claude/rules/ddd-application-layer.md (新增)
      确认写入？
用户：确认
Skill：写入完成。
```

**增量更新：**
```
用户：更新DDD规则
Skill：读取 sources.yaml，发现 4 个 URL（新增 1 个）...
      并行读取语雀文档并提炼规则...
      变更摘要：
      - ddd-model-layer.md: 无变化
      - ddd-domain-layer.md: 修改了 2 条约束
      - ddd-application-layer.md: 无变化
      - ddd-infrastructure-layer.md: 新增
      确认写入？
用户：确认
Skill：写入完成。
```
