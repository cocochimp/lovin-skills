# gzh-writes: 网络搜索探测策略 + 配图质量自审

**日期**: 2026-05-21
**状态**: 待实施
**影响文件**: `.claude/skills/gzh-writes/SKILL.md`

---

## 背景

gzh-writes 存在两个需要优化的问题：

1. **网络搜索效率低、失败风险高**：当前 5 个 SubAgent 并行启动，各自独立执行 WebFetch → agent-browser 降级。如果网络不通，5 个 agent 全部失败，浪费大量 token 和时间。
2. **配图质量无保障**：数据图由 AI 自由编写 HTML/CSS，生成质量波动大，缺乏系统化的质量检查环节。

## 改动 1：网络通道探测优先策略

### 核心思路

先启动 1 个 SubAgent 探测网络可用通道，确定通道后再统一启动剩余 SubAgent。

### 详细流程

#### 无参数模式 (`/gzh`)

```
Step 1: 探测阶段
  启动 1 个 SubAgent → 对第 1 个渠道 (36氪) 尝试 WebFetch
    ├─ WebFetch 成功 → channel = "webfetch"
    └─ WebFetch 失败 → 同一 SubAgent 尝试 agent-browser
                        ├─ 成功 → channel = "browser"
                        └─ 失败 → 提示用户网络不可用，终止流程

Step 2: 批量抓取
  channel 确定后，并行启动剩余 4 个 SubAgent
  每个 SubAgent 仅使用 channel 指定的方式抓取，不做降级
  探测 SubAgent 的结果也一并使用（不丢弃）
```

#### 有参数模式 (`/gzh "主题"`)

只有 1 个 SubAgent，流程简化：
1. WebSearch 搜索主题 → WebFetch 获取详情
2. WebFetch 失败 → agent-browser 降级
3. 逻辑与现有基本一致，仅明确先试再降级的顺序

#### Step 2 素材搜索

复用 Step 1 已确认的通道结论。如果 Step 1 确认 channel = "webfetch"，Step 2 素材搜索直接用 WebFetch；如果 channel = "browser"，直接用 agent-browser。不再重复探测。

### SKILL.md 变更点

1. 新增 `## 网络通道探测规则` 章节，描述探测逻辑和 channel 传递规则
2. 修改 Step 1 无参数模式的 SubAgent prompt 模板，分为探测 prompt 和批量抓取 prompt
3. 修改 Step 1 有参数模式的 SubAgent prompt，明确降级顺序
4. 修改 Step 2 素材搜索指令，引用 Step 1 的 channel 结论

---

## 改动 2：配图质量 AI 自审循环

### 核心思路

每张图片截图完成后，Claude 用 Read 工具查看 PNG，按设计检查清单逐项评估，不达标则修改 HTML/CSS 并重新截图，最多迭代 3 轮。

### 检查清单

| 检查项 | 判断标准 |
|--------|----------|
| 布局对齐 | 元素左右对称或对齐，间距均匀，无明显错位 |
| 字号层次 | 标题 > 副标题 > 正文 > 注释，大小区分清晰 |
| 配色协调 | 颜色不超过 3 种主色，对比度足够，无刺眼搭配 |
| 内容完整 | 文字无截断，数据完整显示，无空白缺失区域 |
| 整体美感 | 看起来像专业设计的信息图，而非粗糙拼凑 |

### 自审流程

```
生成 HTML → Playwright 截图为 PNG
  ↓
Read 查看 PNG → 按 5 项清单逐项评估（通过/不通过）
  ↓
全部通过？
  ├─ 是 → 展示给用户确认
  └─ 否 → 定位问题 → 修改 HTML/CSS → 重新截图 → 再审
           （最多 3 轮迭代）
              ↓
           3 轮后仍不通过？
              ↓
           展示图片 + 标注已知问题 → 用户决定接受或手动调整
```

### 封面图 vs 数据图差异

- **封面图**：模板固定，主要检查文字截断和配色，通常 1 轮即通过
- **数据图**：自由度高，布局/配色问题更多，是自审的主要价值所在

### SKILL.md 变更点

1. 在 Step 3 配图流程中，封面图截图命令后新增自审环节
2. 在 Step 3 配图流程中，数据图截图命令后新增自审环节
3. 新增 `### 图片质量自审规则` 子章节，包含检查清单和迭代规则

---

## 不做的事情

- 不引入外部图表库（Chart.js / ECharts）
- 不新增模板文件，保持现有 `cover_template.html` 和 `data_template.html` 不变
- 不修改 `capture.js`、`md2wx.js`、`publish.js` 等脚本
- 不改变用户交互流程的整体结构（仍然是 4 步流程）
