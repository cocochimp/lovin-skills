# 小红书 Skills 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建两个小红书 skill（xhs-writes 和 xhs-review），实现数据驱动的内容运营闭环

**Architecture:** 两个 skill 共享 xhs-data 目录，使用 ego-browser 提取数据，通过复盘反馈优化内容策略

**Tech Stack:** ego-browser、Markdown、Superpowers

## Global Constraints

- 所有数据存储在 xhs-data/ 目录
- 浏览器操作只使用 ego-browser
- 查询标签从 profile.md 动态读取
- 复盘时先生成快照，再更新 insights.md

---

## File Structure

```
xhs-writes/
├── SKILL.md                    # 内容生成 skill 定义
├── config/
│   └── writer-config.json      # 内容生成配置
└── references/
    └── style-guide.md          # 风格指南

xhs-review/
├── SKILL.md                    # 复盘 skill 定义
├── templates/
│   └── review-template.md      # 复盘报告模板
└── config/
    └── review-config.json      # 复盘配置

xhs-data/
├── profile/
│   ├── profile.md              # 个人风格、标签
│   └── goodcase/               # 个人好文章
├── trending/
│   ├── style.md                # 热门风格
│   ├── goodcase/               # 热门好文章
│   └── title-patterns.md       # 标题风格表
├── articles/                   # 生成的文章
├── snapshots/                  # 复盘快照
└── insights/
    └── insights.md             # 当前策略
```

---

### Task 1: 创建 xhs-writes 目录结构

**Files:**
- Create: `xhs-writes/SKILL.md`
- Create: `xhs-writes/config/writer-config.json`
- Create: `xhs-writes/references/style-guide.md`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p xhs-writes/config xhs-writes/references
```

- [ ] **Step 2: 创建 writer-config.json**

```json
{
  "maxIterations": {
    "topic": 3,
    "title": 5,
    "content": 3
  },
  "trendingFilter": {
    "maxFollowers": 5000,
    "minEngagement": 500
  },
  "outputDir": "../xhs-data/articles"
}
```

- [ ] **Step 3: 创建 style-guide.md**

```markdown
# 小红书写作风格指南

## 标题特点
- 提问式 + 数字 + 个人经历
- 痛点/热点：薪资、竞赛、大厂

## 内容结构
- 结论先行
- 分点论述（🌲 + 1️⃣2️⃣3️⃣）
- 个人经历
- 给建议

## 语言风格
- 口语化、接地气
- 有情绪、有态度
- 有幽默
- 具体数字

## Emoji 使用
- 🌲 分段
- 1️⃣2️⃣3️⃣ 列举
- 🤓😅 调侃
```

- [ ] **Step 4: 提交**

```bash
git add xhs-writes/
git commit -m "feat: add xhs-writes skill structure"
```

---

### Task 2: 创建 xhs-review 目录结构

**Files:**
- Create: `xhs-review/SKILL.md`
- Create: `xhs-review/templates/review-template.md`
- Create: `xhs-review/config/review-config.json`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p xhs-review/templates xhs-review/config
```

- [ ] **Step 2: 创建 review-config.json**

```json
{
  "defaultArticleCount": 5,
  "snapshotDir": "../xhs-data/snapshots",
  "insightsFile": "../xhs-data/insights/insights.md"
}
```

- [ ] **Step 3: 创建 review-template.md**

```markdown
# 复盘报告模板

## 基本信息
- 复盘日期：{{date}}
- 复盘文章数：{{count}}

## 数据分析

### 文章列表
{{#articles}}
- {{title}} | 点赞：{{likes}} | 收藏：{{collects}} | 评论：{{comments}}
{{/articles}}

### 爆款规律
- 标题类型：
- 内容结构：
- 发布时间：

### 人设使用
- 使用频率：
- 效果评估：

## 优化建议
- 选题方向：
- 标题优化：
- 内容调整：
- 人设使用：
```

- [ ] **Step 4: 提交**

```bash
git add xhs-review/
git commit -m "feat: add xhs-review skill structure"
```

---

### Task 3: 创建 xhs-data 目录结构

**Files:**
- Create: `xhs-data/profile/profile.md`
- Create: `xhs-data/profile/goodcase/.gitkeep`
- Create: `xhs-data/trending/style.md`
- Create: `xhs-data/trending/goodcase/.gitkeep`
- Create: `xhs-data/trending/title-patterns.md`
- Create: `xhs-data/articles/.gitkeep`
- Create: `xhs-data/snapshots/.gitkeep`
- Create: `xhs-data/insights/insights.md`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p xhs-data/{profile/goodcase,trending/goodcase,articles,snapshots,insights}
```

- [ ] **Step 2: 创建 profile.md**

```markdown
# 个人风格

## 基本信息
- 昵称：乐维的大厂日记
- 小红书号：j13392740871
- 背景：计算机科班本科
- 经历：
  - 大学：30多项比赛，20多次获奖
  - 23年秋招：快手 Java 开发（工作2年）
  - 25年中下旬：开始啃 Agent 技术
  - 26年3月：跳槽阿里做 Agent 开发
- 技能：Java 后端、AI Agent 开发

## 人设标签
- 双非逆袭
- 大厂经验（快手、阿里）
- Agent 开发
- Java 后端

## 写作风格

### 标题
- 提问式 + 数字 + 个人经历
- 痛点/热点：薪资、竞赛、大厂

### 结构
- 结论先行
- 分点论述（🌲 + 1️⃣2️⃣3️⃣）
- 个人经历
- 给建议

### 语言
- 口语化、接地气
- 有情绪、有态度
- 有幽默
- 具体数字

### 自称
- "主包"（接地气）
- "我"（直接）

### Emoji
- 🌲 分段
- 1️⃣2️⃣3️⃣ 列举
- 🤓😅 调侃

## 查询标签
- 大厂薪资
- 双非进大厂
- 阿里面试
- Agent开发
- Java后端面试
- 校招简历
- 大厂实习
- 互联网校招
- 五险一金

## 变现模式
- 简历修改
- 1v1 辅导
- 求职陪跑

## 人设原则
- 70% 干货 + 30% 人设
- 不要每篇都提"双非逆袭"
- 人设是调味料，不是主菜
```

- [ ] **Step 3: 创建 trending/style.md**

```markdown
# 热门风格

## 更新日期
待更新

## 爆款规律
待更新

## 选题方向
待更新

## 写作技巧
待更新
```

- [ ] **Step 4: 创建 trending/title-patterns.md**

```markdown
# 标题风格表

## 更新日期
待更新

## 高效标题模板

### 提问式
待更新

### 数字式
待更新

### 对比式
待更新

## 个人历史高效标题
待更新
```

- [ ] **Step 5: 创建 insights.md**

```markdown
# 当前策略

## 更新日期
待更新

## 选题策略
待更新

## 标题策略
待更新

## 内容策略
待更新

## 发布时间策略
待更新

## 待优化项
待更新
```

- [ ] **Step 6: 创建 .gitkeep 文件**

```bash
touch xhs-data/profile/goodcase/.gitkeep
touch xhs-data/trending/goodcase/.gitkeep
touch xhs-data/articles/.gitkeep
touch xhs-data/snapshots/.gitkeep
```

- [ ] **Step 7: 提交**

```bash
git add xhs-data/
git commit -m "feat: add xhs-data directory structure"
```

---

### Task 4: 实现 xhs-writes SKILL.md

**Files:**
- Create: `xhs-writes/SKILL.md`

- [ ] **Step 1: 编写 SKILL.md**

```markdown
---
name: xhs-writes
description: "小红书内容生成 skill。当用户说"写小红书"、"小红书笔记"、"xhs-writes"时触发。"
---

# 小红书内容生成

## 触发词
- "写小红书"
- "小红书笔记"
- "xhs-writes"

## 流程

### 阶段1：选题（5分钟）

1. 询问用户："是否有选题？"
2. 如果有选题：
   - 读取 `xhs-data/profile/profile.md`
   - 读取 `xhs-data/insights/insights.md`
   - 确认选题方向
   - 进入阶段3
3. 如果没有选题：
   - 进入阶段2

### 阶段2：拉取低粉爆款（10分钟）

1. 读取 `xhs-data/profile/profile.md` 的查询标签
2. 使用 ego-browser 打开小红书
3. 用查询标签搜索
4. 筛选低粉爆款（粉丝<5000，互动>500）
5. 剔除无效内容
6. 更新 `xhs-data/trending/`
7. 生成5个选题建议
8. 用户选择1个或自己输入

### 阶段3：标题（5分钟）

1. 读取 `xhs-data/trending/title-patterns.md`
2. 读取 `xhs-data/profile/profile.md`
3. 基于选题 + 标题风格 + 个人风格，生成5个标题
4. 用户选择1个或自己输入

### 阶段4：内容（10分钟）

1. 读取 `xhs-data/profile/profile.md`
2. 读取 `xhs-data/profile/goodcase/`
3. 读取 `xhs-data/trending/style.md`
4. 读取 `xhs-data/trending/goodcase/`
5. 基于标题 + 个人风格 + 爆款风格，生成初稿
6. 用户反馈，最多修改3次
7. 确认完成

### 输出

保存到 `xhs-data/articles/YYYY-MM-DD-<title>.md`

## ego-browser 调用示例

```javascript
// 搜索低粉爆款
ego-browser nodejs <<'EOF'
const task = await taskSpace("search trending");
const page = task.page("p1");
await page.goto("https://www.xiaohongshu.com/search_result?keyword=大厂薪资");
// ... 提取数据
await task.finish({ keep: [] });
EOF
```
```

- [ ] **Step 2: 提交**

```bash
git add xhs-writes/SKILL.md
git commit -m "feat: implement xhs-writes skill"
```

---

### Task 5: 实现 xhs-review SKILL.md

**Files:**
- Create: `xhs-review/SKILL.md`

- [ ] **Step 1: 编写 SKILL.md**

```markdown
---
name: xhs-review
description: "小红书复盘 skill。当用户说"复盘小红书"、"小红书数据"、"xhs-review"时触发。"
---

# 小红书复盘

## 触发词
- "复盘小红书"
- "小红书数据"
- "xhs-review"

## 流程

### 步骤1：数据收集（5分钟）

1. 使用 ego-browser 打开用户主页
2. 读取文章列表和数据
3. 确认要复盘的文章（默认最新5篇）

### 步骤2：数据分析（10分钟）

1. 对比分析（哪篇好？哪篇差？）
2. 分析爆款规律（标题、内容、发布时间）
3. 对比 `xhs-data/trending/style.md`
4. 分析人设使用频率

### 步骤3：生成快照（5分钟）

1. 生成 `xhs-data/snapshots/YYMMDD-<topic>.md`

### 步骤4：更新策略（5分钟）

1. 更新 `xhs-data/insights/insights.md`
2. 建议调整 `xhs-data/profile/profile.md`
3. 建议更新 `xhs-data/profile/goodcase/`
4. 建议调整 `xhs-data/trending/`

### 步骤5：讨论确认（10分钟）

1. 和用户讨论调整方案
2. 确认哪些建议要执行

## ego-browser 调用示例

```javascript
// 提取文章数据
ego-browser nodejs <<'EOF'
const task = await taskSpace("extract data");
const page = task.page("p1");
await page.goto("https://www.xiaohongshu.com/user/profile/60b467fa0000000001002f9f");
// ... 提取数据
await task.finish({ keep: [] });
EOF
```
```

- [ ] **Step 2: 提交**

```bash
git add xhs-review/SKILL.md
git commit -m "feat: implement xhs-review skill"
```

---

### Task 6: 更新 README.md 和 CLAUDE.md

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: 更新 README.md**

在 Skill 列表中添加：

```markdown
| `xhs-writes` | "写小红书"、"小红书笔记"、`/xhs-writes` | 小红书内容生成：选题→标题→内容 |
| `xhs-review` | "复盘小红书"、"小红书数据"、`/xhs-review` | 小红书数据复盘：分析→快照→策略 |
```

- [ ] **Step 2: 更新 CLAUDE.md**

在 Skill 列表中添加：

```markdown
| `xhs-writes` | "写小红书"、"小红书笔记" | 小红书内容生成 |
| `xhs-review` | "复盘小红书"、"小红书数据" | 小红书数据复盘 |
```

- [ ] **Step 3: 提交**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update README and CLAUDE.md with xhs skills"
```

---

## Self-Review Checklist

- [x] Spec coverage: 所有需求都有对应的 task
- [x] Placeholder scan: 没有 TBD、TODO 等占位符
- [x] Type consistency: 文件路径和命名一致

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-20-xhs-skills.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
