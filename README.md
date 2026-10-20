# lovin-skills

Claude Code agent skills 集合仓库。每个 skill 是独立的 prompt 驱动能力，在特定触发词或上下文中自动激活，扩展 Claude Code 的行为。

## 包含的 Skills

| Skill | 触发词 | 功能说明 |
|-------|--------|----------|
| `gzh-review` | `/gzh-review` | 分析微信公众号文章运营数据，生成优化建议 |
| `gzh-writes` | "公众号"、"写公众号"、"gzh"、`/gzh-writes` | 公众号内容生产全流程：选题→写作→配图→发布 |
| `skill-scenario-generator` | "Skill 使用案例"、"具体场景" | 为任意 Skill 生成 5 个可直接复制执行的玩法场景 |
| `xhs-writes` | "写小红书"、"小红书笔记"、`/xhs-writes` | 小红书内容生成：选题→标题→内容 |
| `xhs-review` | "复盘小红书"、"小红书数据"、`/xhs-review` | 小红书数据复盘：分析→快照→策略 |

## 使用方式

```bash
# 克隆仓库
git clone git@github.com:cocochimp/lovin-skills.git
cd lovin-skills

# 启动 Claude Code（自动加载 .claude/skills/ 下的 skills）
claude
```

首次使用时，如果 `.claude/skills/` 下缺少项目自维护 skill 的符号链接，Claude Code 会根据 CLAUDE.md 中的指令自动创建。

## 目录结构

```
lovin-skills/
├── gzh-review/                   # 公众号数据复盘
│   ├── SKILL.md
│   └── templates/                # 报告模板
├── gzh-writes/                   # 公众号写作
│   ├── SKILL.md
│   ├── assets/                   # HTML 模板、截图脚本
│   ├── config/                   # 渠道配置
│   ├── references/               # 样式指南、发布规范
│   └── scripts/                  # 发布、格式转换脚本
├── skill-scenario-generator/     # Skill 场景生成器
│   └── SKILL.md
├── xhs-writes/                   # 小红书内容生成
│   ├── SKILL.md
│   ├── config/                   # 写作配置
│   └── references/               # 风格指南
├── xhs-review/                   # 小红书数据复盘
│   ├── SKILL.md
│   ├── templates/                # 复盘报告模板
│   └── config/                   # 复盘配置
├── xhs-data/                     # 小红书共享数据
│   ├── profile/                  # 个人风格
│   ├── trending/                 # 热门风格
│   ├── articles/                 # 生成的文章
│   ├── snapshots/                # 复盘快照
│   └── insights/                 # 策略总结
├── .claude/skills/               # 符号链接 → 根目录（Claude Code 加载）
├── docs/                         # 产出物（文章、封面图、数据图）
└── skills-lock.json              # 外部 skill 锁定（含内容哈希）
```

## 添加新 Skill

1. 在根目录创建 skill 目录：`mkdir my-skill`
2. 创建 `my-skill/SKILL.md`，包含 YAML frontmatter（name、description）和完整 prompt
3. 在 `.claude/skills/` 创建符号链接：

   ```bash
   cd .claude/skills
   ln -sf ../../my-skill my-skill
   ```

4. 更新本 README 中的 Skill 列表

## 开发规范

- 提交信息格式：`feat: xxx`、`fix: xxx`、`chore: xxx`
- Skill 的 `SKILL.md` 是面向用户的核心契约，其他文件仅作辅助
- 触发词定义在 `SKILL.md` 的 YAML frontmatter `description` 字段中
