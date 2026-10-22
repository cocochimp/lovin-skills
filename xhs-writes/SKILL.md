---
name: xhs-writes
description: 小红书内容生成 skill。当用户说"写小红书"、"小红书笔记"、"xhs-writes"时触发。负责基于个人风格库+规则库+爆款库生成文章，是数据飞轮的"写作端"。
---

# 小红书内容生成 (xhs-writes)

## 触发词
- "写小红书"
- "小红书笔记"
- "xhs-writes"

## 目录结构（本 skill 拥有个人侧数据）

```
xhs-writes/
├── profile/
│   ├── personal_profile.md      # 个人信息：身份/经历/定位/商业化（低频维护）
│   ├── writing_style.md         # ★写作风格库：学习固化，写作必读（不每次重取）
│   ├── performance.json         # ★文章数据&分析：结构化流量指标（review 时更新）
│   └── topic_suggestions.json   # ★选题建议池：没有选题时从这里挑
└── articles/
    └── YYYY-MM-DD_<slug>.md     # 只存已发布文章，frontmatter 带 note_id
```

> 市场/复盘数据（trending/insights/snapshots/raw）在 xhs-review/ 下，本 skill 写作时读取。

## 写作前必读（阶段0：读库）
按顺序读取，缺一不可：
1. `profile/writing_style.md`（个人风格，写作全程遵守）
2. `profile/personal_profile.md`（人设/定位/查询标签）
3. `../xhs-review/insights.md`（规则库：哪些标题/话题/结构被验证有效）
4. `../xhs-review/trending/title_patterns.md`（标题模板）
5. `../xhs-review/trending/style.md`（热门风格）
6. `profile/performance.json`（历史文章表现，避免重复踩坑）

## 流程

### 阶段1：选题（5分钟）
1. 询问用户："是否有选题？"
2. 有选题 → 校验：
   - 话题是否属于主流爆款池（薪资/转型/面试/简历/大厂真相）——R04
   - 标注类型：method（方法论）/ truth（真相）/ experiment（实验）
   - 校验内容配比：method 60% / truth 30% / experiment 10%（跑偏提示）
3. 无选题 → 读取 `profile/topic_suggestions.json`，按 status 优先级挑 5 个候选给用户选

### 阶段2：对标爆款（5分钟）
1. 从 `../xhs-review/trending/goodcase/<主题>/` 选同话题 Top 3 精读
2. 明确输出：「我的标题对标哪条钩子」「我的结构对标哪篇」
3. 若无同话题案例，用采集补充（见"爆款采集"）

### 阶段3：标题（5分钟）
1. 基于 title_patterns.md + writing_style.md + 对标结果，生成 5 个标题
2. 每条约出对标模板；规则命中（数字式/暴论式/时间差式）优先
3. 用户选择 1 个或自己输入

### 阶段4：正文（10分钟）
1. 遵守 writing_style.md 全部约束（结构/语言/emoji/禁忌）
2. **收藏钩子自查**（R03/R06）：读者为什么收藏我？无清单/模板/话术 → 打回补内容
3. 数字必须真实可核验（月薪/扣款/比例等），不编造
4. 用户反馈，最多修改 3 次
5. 确认完成 → 存 `articles/YYYY-MM-DD_<slug>.md`（frontmatter 带 title/date/status/tags，note_id 发布后补）

### 输出
- 保存到 `profile/../articles/YYYY-MM-DD_<slug>.md`，不自动发布
- 发布后提示：把 note_id 补进文章 frontmatter，下次 xhs-review 复盘时会同步 performance.json

## 爆款采集（阶段2 无案例时补充）：MediaCrawler

**爆款笔记批量采集使用 MediaCrawler**（`/Users/Doc/agent/lovin-skills/MediaCrawler`），输出结构化 JSONL（含标题、点赞、收藏、评论、正文、作者、标签）。ego-browser 仅用于 xhs-review（复盘用户自己的数据）和单篇精读。

```bash
cd /Users/Doc/agent/lovin-skills/MediaCrawler && \
HTTPS_PROXY=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897 ALL_PROXY=http://127.0.0.1:7897 \
/Users/cocochimp/.local/bin/uv run python main.py \
  --platform xhs --type search \
  --keywords "<查询标签1,查询标签2>" \
  --crawler_max_notes_count 15 \
  --save_data_option jsonl \
  --lt qrcode --get_comment no
```

说明：
- `--keywords` 传多个查询标签，用英文逗号分隔（从 personal_profile.md 的 Search Tags 动态读取）
- 输出到 `MediaCrawler/data/xhs/jsonl/search_contents_YYYY-MM-DD.jsonl`
- 登录态已保存在 `browser_data/xhs_user_data_dir`，免扫码
- 代理 7897 是 Clash Verge 端口；若代理未开可去掉环境变量前缀

筛选爆款：
- 点赞 500~2万，剔除官方/机构号、纯贴图无价值内容
- 更新 `../xhs-review/trending/`（style.md / title_patterns.md / goodcase/，每主题 Top 5）
- goodcase 管理规则见 `../xhs-review/SKILL.md`

## ego-browser 调用（单篇精读用）
浏览器操作只使用 ego-browser。每轮创建 TaskSpace 时打印 `task.spaceId`，后续轮次用 `taskSpace(<spaceId>)` 恢复同一空间。

```bash
ego-browser nodejs <<'EOFBROWSER'
const task = await taskSpace("extract article");
console.log("spaceId:", task.spaceId);
const page = task.page("p1");
await page.goto("<article_url>", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 5000));
await page.evaluate(() => window.scrollBy(0, 500));
await new Promise(r => setTimeout(r, 2000));
// 提取：标题、正文、互动数据、标签（登录弹窗时用 task.handOff() 移交用户）
await task.finish({ keep: [] });
EOFBROWSER
```

## 约束
- 写作必读库：writing_style.md + insights.md 不可跳过
- 每篇必须过收藏钩子自查（R03/R06）
- 全手动流程：无任何自动 cron；生成的文章不自动发布
- 选题/标题/内容迭代上限：选题 3 轮、标题 5 选 1、内容 3 次修改
- 查询标签从 personal_profile.md 动态读取，不是固定值
