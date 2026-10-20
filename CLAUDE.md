# CLAUDE.md

本文件为 Claude Code 提供仓库级别的工作指引。

## 项目简介

`lovin-skills` 是 Claude Code agent skills 集合仓库。每个 skill 是一个独立的 prompt 驱动能力，在特定触发词或上下文中扩展 Claude Code 的行为。

## 仓库结构

- **根目录**：各 skill 的源文件目录，是 skill 内容的主存储位置
- **`.claude/skills/`**：通过符号链接引用根目录的 skill 源文件，Claude Code 运行时加载此目录

```
lovin-skills/
├── gzh-review/                   # 公众号数据复盘（源文件）
├── gzh-writes/                   # 公众号写作（源文件）
├── skill-scenario-generator/     # Skill 场景生成器（源文件）
├── .claude/skills/               # 符号链接 → 根目录（Claude Code 运行时加载）
├── docs/                         # 产出物（文章、图片等）
└── skills-lock.json              # 外部 skill 锁定文件
```

## 关键指令：符号链接自动创建

当 `.claude/skills/` 下缺少项目自维护 skill 的符号链接时，Claude Code 应自动执行以下命令创建：

```bash
cd .claude/skills
ln -sf ../../gzh-review gzh-review
ln -sf ../../gzh-writes gzh-writes
ln -sf ../../skill-scenario-generator skill-scenario-generator
```

> **注意**：`.claude/` 目录在 `.gitignore` 中被忽略，因此符号链接不会被 git 跟踪。克隆仓库后，Claude Code 会根据以上指令自动创建所需的符号链接。

## Skill 列表

| Skill | 触发词 | 简介 |
|-------|--------|------|
| `gzh-review` | `/gzh-review`、公众号数据复盘 | 分析微信公众号文章数据，生成优化建议 |
| `gzh-writes` | "公众号"、"写公众号"、"gzh"、`/gzh-writes` | 公众号自媒体内容生产全流程：选题→写文→配图→发布 |
| `skill-scenario-generator` | "Skill 使用案例"、"Skill 具体场景" | 为指定 Skill 生成 5 个可复制执行的玩法场景 |
| `xhs-writes` | "写小红书"、"小红书笔记" | 小红书内容生成 |
| `xhs-review` | "复盘小红书"、"小红书数据" | 小红书数据复盘 |

## 开发规范

- 提交信息用英文，格式：`feat: xxx`、`fix: xxx`、`chore: xxx`
- 代码注释保持简洁，避免冗余描述
- Skill 以 prompt 为先：`SKILL.md` 是面向用户的核心契约，其他文件起辅助作用
- 触发词定义在 `SKILL.md` 的 YAML frontmatter `description` 字段
