# 小红书 Skills 设计文档

**Goal:** 创建两个小红书 skill（xhs-writes 和 xhs-review），实现数据驱动的内容运营闭环

**Architecture:** 两个 skill 共享 xhs-data 目录，使用 ego-browser 提取数据，通过复盘反馈优化内容策略

**Tech Stack:** ego-browser、Markdown、Superpowers

## Global Constraints

- 所有数据存储在 xhs-data/ 目录
- 浏览器操作只使用 ego-browser
- 查询标签从 profile.md 动态读取
- 复盘时先生成快照，再更新 insights.md

---

## 核心设计

### 目录结构

```
xhs-writes/          # 内容生成 skill
xhs-review/          # 复盘 skill
xhs-data/            # 共享数据
├── profile/         # 核心层（手动）
│   ├── profile.md
│   └── goodcase/
├── trending/        # 动态层（半自动）
│   ├── style.md
│   ├── goodcase/
│   └── title-patterns.md
├── articles/        # 生成的文章
├── snapshots/       # 复盘快照
└── insights/        # 策略总结
    └── insights.md
```

### xhs-writes 流程

```
阶段1：选题（5分钟）
├─ 有选题：读取 profile + insights，确认方向
└─ 无选题：进入阶段2

阶段2：拉取低粉爆款（10分钟）
├─ 读取 profile.md 查询标签
├─ ego-browser 搜索
├─ 筛选（粉丝<5000，互动>500）
├─ 更新 trending/
└─ 生成5个选题，用户选1个

阶段3：标题（5分钟）
├─ 读取 title-patterns + profile
├─ 生成5个标题
└─ 用户选1个

阶段4：内容（10分钟）
├─ 读取 profile + goodcase + trending
├─ 生成初稿
├─ 最多修改3次
└─ 保存到 articles/

总时间：30分钟
```

### xhs-review 流程

```
步骤1：数据收集（5分钟）
├─ ego-browser 打开主页
└─ 读取文章数据

步骤2：数据分析（10分钟）
├─ 对比分析
├─ 爆款规律
└─ 人设使用频率

步骤3：生成快照（5分钟）
└─ snapshots/YYMMDD-xxx.md

步骤4：更新策略（5分钟）
├─ 更新 insights.md
└─ 建议调整 profile/goodcase/trending

步骤5：讨论确认（10分钟）

总时间：35分钟
```

---

## 关键决策

1. **数据分层**：核心层（手动）+ 动态层（半自动）+ 产出层（自动）
2. **浏览器**：完全用 ego-browser，不用 MediaCrawler
3. **查询标签**：从 profile.md 动态读取，不是固定值
4. **复盘快照**：先生成快照，再更新 insights
5. **分阶段确认**：限制迭代次数，避免无限循环

---

## profile.md

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

---

## 实现计划

### Task 1: 创建目录结构

```bash
mkdir -p xhs-writes/{config,references}
mkdir -p xhs-review/{templates,config}
mkdir -p xhs-data/{profile/goodcase,trending/goodcase,articles,snapshots,insights}
```

- [ ] 创建目录
- [ ] 创建 profile.md
- [ ] 创建配置文件
- [ ] 提交

### Task 2: 实现 xhs-writes SKILL.md

- [ ] 编写 SKILL.md（4阶段流程）
- [ ] 提交

### Task 3: 实现 xhs-review SKILL.md

- [ ] 编写 SKILL.md（5步骤流程）
- [ ] 提交

### Task 4: 更新文档

- [ ] 更新 README.md
- [ ] 更新 CLAUDE.md
- [ ] 提交
