---
name: xhs-review
description: 小红书复盘 skill。当用户说"复盘小红书"、"小红书数据"、"xhs-review"时触发。负责数据采集、指标分析、规则提炼与回写，是数据飞轮的"数据中枢"。
---

# 小红书复盘 (xhs-review)

## 触发词
- "复盘小红书"
- "小红书数据"
- "xhs-review"

## 目录结构（本 skill 拥有市场/复盘数据）

```
xhs-review/
├── trending/
│   ├── style.md              # 市场热门风格（对比用）
│   ├── title_patterns.md     # 标题模式库
│   └── goodcase/             # 爆款案例：按主题分类（agent/salary/resume/interview），每主题 Top 5
├── insights.md               # ★规则库：复盘结论唯一落点（写作者必读）
├── snapshots/                # 每次复盘总结文档，保留最近 10 次
└── raw/                      # 采集原始数据 jsonl（原样留档，不整理）
```

> 个人侧数据（profile/articles）在 `../xhs-writes/` 下，本 skill 复盘时更新其 `profile/performance.json`。

## 触发方式（全手动，无自动 cron）

复盘动作只在你主动发起时执行；复盘结论默认不自动回写，每条列给你确认后执行。

## 流程

### 步骤1：数据采集（手动触发）
- **方式A（推荐）**：MediaCrawler creator 模式抓自己主页全量数据（见下）
- **方式B**：ego-browser 打开自己主页抓取（登录态已保存）
- 采集数据存 `raw/YYYY-MM-DD_search.jsonl`
- **注意**：若当前登录账号非本人主页，部分指标（如 views）不可见，则留空不记录，不臆造

MediaCrawler 命令（登录态已保存，无需扫码）：
```bash
cd /Users/Doc/agent/lovin-skills/MediaCrawler && \
uv run python main.py --platform xhs --type creator \
  --creator_id "https://www.xiaohongshu.com/user/profile/60b467fa0000000001002f9f?xsec_token=..." \
  --save_data_option jsonl
```

### 步骤2：同步数据（先于一切分析）
1. 读取 `raw/` 最新采集数据
2. **更新 ../xhs-writes/profile/performance.json**：把每篇最新 views/likes/favorites/comments 同步进去
3. 计算衍生指标：favorite_like_ratio（藏赞比）、engagement_rate（浏览互动率）
4. 与 `articles/` 通过 note_id 串联核对（每篇笔记对应一篇已发布文章）

### 步骤3：数据分析（10分钟）
1. 对比分析（哪篇好？哪篇差？）——基于 performance.json
2. 指标解读：
   - 藏赞比 >0.5 = 收藏型成立；<0.3 = 缺收藏钩子
   - 浏览互动率 >3% = 内容对得起流量；低 = 标题党或内容不符
   - 评论密度高 = 话题有争议性，可复用
3. 对比 `trending/style.md`（是否符合趋势）
4. 对比 `insights.md`（已有规则是否被验证/证伪）
5. 分析人设使用频率（是否过度消耗）

### 步骤4：生成快照（每次复盘一份总结）
1. 生成 `snapshots/YYYY-MM-DD_review.md`
2. 包含：数据概览表、爆款/失败分析、指标解读、规则变化建议
3. 保留最近 10 份，超出删除最旧（旧快照删除前可确认）

### 步骤5：提炼规则（写入 insights.md）
基于分析结论，用结构化格式提炼/验证/废弃规则：
- 验证已有规则：数据支持 → 强度升级/保持；证伪 → 标 invalid
- 新增规则：id 递增，注明假设/证据/强度/状态(pending)
- 每条规则需有具体数据证据，无证据不写规则

### 步骤6：回写确认（你拍板）
列出以下待确认项，你勾选后才执行：
1. 更新 `insights.md`（规则增改）
2. 更新 `trending/`（热门风格/标题模式/爆款 goodcase 增删，每主题 Top 5）
3. 更新 `../xhs-writes/profile/writing_style.md`（个人风格变化，可选）
4. 更新 `../xhs-writes/profile/topic_suggestions.json`（选题池增删）

## 爆款 goodcase 管理规则
- 文件命名：`YYYY-MM-DD-<主题>-<赞数>.md`
- 每条内容固定 4 块：来源（标题+链接+互动数据）、内容摘录、为什么值得学、状态（保留/待删除）
- 每主题只保留 Top 5（按赞数）；新案例进入时淘汰最末
- 同链接不重复入库（按标题+链接去重）
- 复盘时列出"建议淘汰"清单，你确认后删除

## ego-browser 调用
浏览器操作只使用 ego-browser。每轮创建 TaskSpace 时打印 `task.spaceId`，后续轮次用 `taskSpace(<spaceId>)` 恢复同一空间。

```bash
ego-browser nodejs <<'EOFBROWSER'
const task = await taskSpace("xhs review profile");
console.log("spaceId:", task.spaceId);
const page = task.page("p1");
await page.goto("https://www.xiaohongshu.com/user/profile/60b467fa0000000001002f9f", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 3000));
// 提取文章列表：标题、点赞、收藏、评论（登录弹窗时用 task.handOff() 移交用户）
await task.finish({ keep: [] });
EOFBROWSER
```

## 快照模板

```markdown
# 复盘报告 - YYYY-MM-DD

## 数据概览（performance.json 同步后）
| 标题 | 浏览 | 赞 | 藏 | 评 | 藏赞比 | 互动率 |
|------|------|----|----|----|--------|--------|
| ...  | ...  | ...| ...| ...| ...    | ...    |

## 爆款分析（本账号表现最好的）
- 数据最好：xxx
- 原因：标题钩子 / 结构 / 话题 / 时机

## 失败分析
- 数据最差：xxx
- 原因分析：

## 规则验证
- R01（数字标题）→ 验证通过/证伪，证据：
- R02（薪资话题评论高）→ ...

## 建议（待确认）
- 选题：加码 xxx / 放弃 xxx
- 标题：复用 xxx 模板
- 内容：补收藏钩子（清单/模板）
- 爆款 goodcase：新增 xxx / 淘汰 xxx

## 待你确认项
- [ ] 更新 insights.md
- [ ] 更新 trending/
- [ ] 更新 writing_style.md
- [ ] 更新 topic_suggestions.json
```

## 约束
- 全手动触发：只在用户发起时运行；无任何自动 cron
- 先同步 performance.json → 再分析 → 再写快照 → 最后回写
- 所有回写需用户确认后执行
- 默认复盘最新 5 篇，用户可指定
- 数据缺失（非本人账号看不到 views 等）→ 留空，不臆造
