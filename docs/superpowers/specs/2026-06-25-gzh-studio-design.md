# gzh-studio 设计文档

> 将 `gzh-writes` skill 的内容生产流程（选题→写文→配图→发布）可视化为本地 Web 应用。
> 日期：2026-06-25　状态：待评审

---

## 1. 目标与定位

把 `gzh-writes` skill 的能力做成一个**本地单用户**的可视化 Web 工具：

- **不重写业务逻辑**：选题偏好、主客观写作约束、subagent 并行抓取、配图模板、发布脚本均已沉淀在 skill 内，Web 只做"可视化壳 + 编排"。
- **轻后端编排**：后端通过 Claude Agent SDK 加载 `gzh-writes` skill 运行，Web 端把 skill 的"等待用户确认"环节变成向导式交互。
- **三个模块**：热点看板、撰文向导、风格/渠道设置（对应三张设计稿）。

### 非目标（YAGNI）

多用户、登录鉴权、云数据库、实时协作、移动端适配。

---

## 2. 技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 前端 | React + Vite + TypeScript | 单页三视图；轻状态用 zustand |
| UI 风格 | shadcn/ui 风（现代极简） | 浅底 + 中性灰 + 圆角卡片 + 细边框 |
| 后端 | Fastify + TypeScript | 单进程，内嵌 `@anthropic-ai/claude-agent-sdk` |
| 通信 | REST + SSE | REST 触发动作；SSE 单向推流 agent 输出 |
| 持久化 | 本地文件 | 配置 JSON、任务状态、热点快照、成稿 MD/PNG |

本地起两个进程：Vite 开发服务器代理到 Fastify。

---

## 3. 三个模块

### 3.1 热点看板
- 渠道 × 热点文章（标题 + URL）的只读看板。
- **布局**：渠道横向列 + 横向滚动（Kanban 式），列数由 `channels.json` 决定。
- **刷新**：触发 agent 跑 skill 模式A 并行抓取各渠道热点 → 写入 `hotspots.json` 缓存 → 渲染。
- **右键单篇文章 → 跳转撰文**：以该文章为种子主题（等价 skill 模式B），无勾选框。

### 3.2 撰文向导
- **4 步**：选题 → 写文（标题+初稿合并）→ 配图 → 发布，对应 skill 的确认点。
- 顶部 4 步进度条（Stepper），底部 `last / next` 导航。
- **ai chat = 右侧抽屉（Drawer）**：边聊边看当步内容，用于改稿 / 更换。
- **进度呈现**：SSE 实时步骤日志（"正在抓取 36氪…"）+ 正文逐字流式。

### 3.3 设置
- ① 风格文字描述（写入 `style.json`，会话启动注入写作上下文）。
- ② 渠道 URL 配置（直接读写 skill 现有 `channels.json`）。

---

## 4. 核心机制：UI 契约（自定义工具 / 人工确认闸门）

agent 默认输出 Markdown，但向导需要**可点选**的结构化数据。采用**自定义工具**作为人工确认闸门（比解析 ```json 块更健壮）。

### 4.1 工具集

agent 走到 skill 每个"等待用户确认"时，调用对应工具而非打印等待：

| 工具 | 步骤 | input |
|------|------|-------|
| `present_topics` | 选题 | `{ topics: [{id, title, summary, sourceUrl}] }` |
| `present_draft` | 写文 | `{ titleOptions: [{id, label, group}], contentMd, frontmatter }` |
| `present_covers` | 配图① | `{ options: [{id, previewUrl, desc}] }` |
| `present_images` | 配图② | `{ cover: {url}, dataChart: {url} }` |
| `present_publish` | 发布 | `{ checklist: [...] }` |
| `report_result` | 完成 | `{ mediaId }` |

### 4.2 人在环（human-in-the-loop）流程

工具处理器（server）：
1. 把工具 input 经 SSE 推前端（`present` 事件）。
2. **挂起 Promise**，agent 在此阻塞。
3. 用户在向导/Drawer 操作 → `POST /tasks/:id/respond`。
4. resolve Promise，把用户决策作为**工具返回值**喂回 agent。
5. agent 继续。

### 4.3 工具返回值（判别联合）

```ts
type GateResponse =
  | { type: "confirm"; selection: unknown }    // 选定，进下一步
  | { type: "revise"; feedback: string }       // ai chat 改稿 → agent 重生成、再次 present
  | { type: "regenerate" }                      // “更换 / 下一批”
```

**向导按钮**与 **Drawer 的 ai chat** 统一收敛到同一回灌通道。`last`（回退）不走 agent —— 见 §6。

---

## 5. Agent 会话生命周期

- 每个撰文任务 = 一个 SDK 会话（持久 `session id`，落 `session.json`，支持 resume）。
- 启动时 `appendSystemPrompt` 注入"驱动 Web 向导"指令：每个确认点必须调用 `present_*` 工具、不得自行往下推进。
- **agent 运行 cwd = `gzh-writes` skill 根目录**（经 `GZH_WRITES_DIR` 配置），使 skill 相对路径（`config/channels.json`、`assets/cover_template.html`、`scripts/publish.js`、`docs/gzh/`）全部可解析；产出的 PNG/MD 由 server 复制进任务目录。
- 入口区分：
  - 热点右键进入 → 模式B，首条 prompt 带文章标题 + URL。
  - 直接进撰文 → 模式A 默认商业方向。

---

## 6. 步骤导航与回退

- 已完成步骤产出缓存在 `steps/<step>.json`，`last/next` **只在缓存视图间切换**（只读回看），不重新触发 agent。
- 想改前一步决策 = 在该步用 **ai chat（revise）** → agent 从该步重生成；其后步骤标记失效需重走。
- 不让 LLM "倒带"（不可靠），用 server 缓存 + 重生成代替。

---

## 7. API 面（REST + SSE）

```
GET    /api/hotspots                 # 读缓存看板
POST   /api/hotspots/refresh         # 触发抓取，返回 jobId（进度走 SSE）
GET    /api/tasks                    # 任务/草稿列表
POST   /api/tasks                    # 新建（body: {seed?}）→ taskId
GET    /api/tasks/:id                # 任务详情 + 各步缓存
GET    /api/tasks/:id/stream         # SSE 推流
POST   /api/tasks/:id/respond        # body:{step,type,payload} → resolve 闸门
DELETE /api/tasks/:id
GET/PUT /api/config/channels         # 复用 channels.json
GET/PUT /api/config/style            # style.json
```

**SSE 事件类型**：`status`（步骤日志行）、`delta`（正文逐字）、`present`（present_* 载荷）、`step_done`、`error`、`done`。断线用 Last-Event-ID 续传。

---

## 8. 持久化文件布局

```
server/data/
├── hotspots.json                  # {channel: [{title,url}], fetchedAt}
└── tasks/<taskId>/
    ├── task.json                  # {status, currentStep, seed, title, createdAt}
    ├── session.json               # SDK session id
    ├── messages.jsonl             # 聊天全量（Drawer 历史）
    ├── steps/{topic,write,image,publish}.json
    └── assets/                    # 封面/数据图 PNG
config/
├── channels.json                  # 复用：[{name,url,category}]
└── style.json                     # 新增：{description: string}
```

成稿仍复用 skill 路径 `docs/gzh/{YYYY-MM-DD}-{关键词}.md`。

---

## 9. 配图步骤（Web 呈现）

- 后端复用 skill 的 HTML 模板 + 无头截图（puppeteer）生成**真 PNG**。
- 前端展示 3-5 组封面缩略图供选 + 数据图预览。
- 图片自审（skill 的 5 项检查、最多 3 轮）在后端进行，前端只在 `status` 日志显示自审进度，最终通过 `present_images` 呈现成图。

---

## 10. 发布步骤

- 展示草稿清单（`present_publish`）→ 用户确认 → 调 `scripts/publish.js` 存草稿箱 → `report_result` 回显 `media_id`。
- 失败时显示公众号 API 错误，**保留草稿**不丢。

---

## 11. 前端组件树

```
App（TopNav: 热点|撰文 + 设置入口）
├─ HotspotBoard ─ ChannelColumn[]（横滚）─ ArticleCard（右键菜单→撰文）
├─ DraftList（任务卡：状态/标题/续写）
├─ WizardView ─ Stepper(4) + StepPanel{Topic|Write|Image|Publish}
│                + NavBar(last/next) + AiChatDrawer（右侧抽屉, useTaskStream）
└─ SettingsPanel ─ StyleConfig + ChannelConfig
shared: useTaskStream(SSE hook)、apiClient、shadcn 组件
```

---

## 12. 错误处理与边界

- agent 报错 → SSE `error` → toast + 当步「重试」。
- 抓取部分失败 → 看板按渠道展示成功项 + 该列错误标记。
- 发布失败 → 显示 API 错误，保留草稿。
- `ANTHROPIC_API_KEY` 走环境变量；缺失时启动报清晰提示。
- 并发任务各自独立会话，互不串扰。

---

## 13. 测试策略

- **Mock Agent 模式**：server 提供假 SDK 实现（按脚本吐 present_* 载荷），前端/向导/Drawer 全流程在**不烧 token**下可测，同时覆盖"前端原型"价值。
- server 单测：工具闸门挂起/resolve、respond 路由、配置读写。
- 前端：向导步骤切换、SSE hook 组件测试。
- 真 agent E2E：仅 1 条冒烟用例（选题步）。

---

## 14. 工程结构

```
gzh-studio/
├── client/                 # React+Vite+TS
│   ├── views/              # 热点 / 撰文向导 / 设置
│   ├── components/         # shadcn 组件、Drawer、Stepper、看板列
│   └── store/              # zustand：任务/会话状态
├── server/                 # Fastify+TS
│   ├── agent/              # Agent SDK 封装、present_* 工具、会话管理
│   ├── routes/             # REST + SSE
│   ├── images/             # 复用截图管道（puppeteer + skill 模板）
│   └── data/               # 本地：任务状态、热点快照
├── config/                 # channels.json（复用）+ style.json（新增）
└── docs/gzh/               # 成稿（复用 skill 路径）
```

环境变量：`ANTHROPIC_API_KEY`、`GZH_WRITES_DIR`（指向现有 `gzh-writes` skill 根目录）。

---

## 15. 数据流（一条任务的生命周期）

1. 热点看板右键文章 → `POST /tasks`（seed=文章）→ 新建会话，写入草稿列表。
2. 会话每个 turn 走到确认点 → 调 `present_*` 工具 → SSE 推前端，工具挂起。
3. 用户在向导操作 / Drawer ai chat → `POST /respond` → resolve 工具 → agent 继续。
4. 配图步触发截图管道；发布步触发 `publish.js`。
5. 全程状态写 `server/data/`，可中断恢复。
