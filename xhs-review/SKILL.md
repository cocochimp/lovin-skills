---
name: xhs-review
description: 小红书复盘 skill。当用户说“复盘小红书”、“小红书数据”、“xhs-review”时触发。
---

# 小红书复盘

## 触发词
- "复盘小红书"
- "小红书数据"
- "xhs-review"

## 首次使用

如果 `~/.xhs-data/` 不存在，需要先初始化：

```bash
# 方式1：软链接到项目数据目录（推荐开发时使用）
ln -s /path/to/your/project/xhs-data ~/.xhs-data

# 方式2：创建独立数据目录（推荐生产使用）
mkdir -p ~/.xhs-data/{profile/goodcase,trending/goodcase,articles,snapshots,insights}
# 然后复制模板文件到对应目录
```

初始化完成后，编辑 `~/.xhs-data/profile/profile.md` 填写你的个人信息。

## 数据文件

所有数据存储在 `~/.xhs-data/`，不依赖项目路径。

| 文件 | 用途 |
|------|------|
| `~/.xhs-data/profile/profile.md` | 个人风格、标签 |
| `~/.xhs-data/trending/style.md` | 热门风格（对比用） |
| `~/.xhs-data/insights/insights.md` | 当前策略（对比用） |
| `~/.xhs-data/snapshots/` | 复盘快照输出目录 |

## 流程

### 步骤1：数据收集（5分钟）

1. 使用 ego-browser 打开用户主页
2. 读取文章列表和数据（标题、点赞、收藏、评论）
3. 默认复盘最新5篇，用户可指定

### 步骤2：数据分析（10分钟）

1. 对比分析（哪篇好？哪篇差？）
2. 分析爆款规律（标题类型、内容结构、发布时间）
3. 对比 `~/.xhs-data/trending/style.md`（是否符合趋势）
4. 对比 `~/.xhs-data/insights/insights.md`（是否遵循策略）
5. 分析人设使用频率（是否过度消耗）

### 步骤3：生成快照（5分钟）

1. 生成 `~/.xhs-data/snapshots/YYMMDD-<topic>.md`
2. 包含：数据分析、爆款规律、问题诊断、优化建议

### 步骤4：更新策略（5分钟）

1. 基于快照结论，更新 `~/.xhs-data/insights/insights.md`
2. 建议调整 `~/.xhs-data/profile/profile.md`（查询标签、人设使用频率）
3. 建议更新 `~/.xhs-data/profile/goodcase/`（新增好文章）
4. 建议调整 `~/.xhs-data/trending/`（热门风格变化）

### 步骤5：讨论确认（10分钟）

1. 和用户讨论调整方案
2. 确认哪些建议要执行
3. 执行确认的调整

## ego-browser 调用

### 提取用户主页数据

```javascript
ego-browser nodejs <<'EOFBROWSER'
const task = await taskSpace("extract profile data");
const page = task.page("p1");
await page.goto("https://www.xiaohongshu.com/user/profile/60b467fa0000000001002f9f", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 3000));
// 提取文章列表：标题、点赞、收藏、评论
await task.finish({ keep: [] });
EOFBROWSER
```

### 提取文章详情

```javascript
ego-browser nodejs <<'EOFBROWSER'
const task = await taskSpace("extract article detail");
const page = task.page("p1");
await page.goto("<article_url>", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 5000));
await page.evaluate(() => window.scrollBy(0, 500));
await new Promise(r => setTimeout(r, 2000));
// 提取：标题、正文、标签、互动数据
await task.finish({ keep: [] });
EOFBROWSER
```

## 快照模板

```markdown
# 复盘报告 - {{date}}

## 数据概览
| 标题 | 点赞 | 收藏 | 评论 |
|------|------|------|------|
| ... | ... | ... | ... |

## 爆款分析
- 数据最好的：
- 原因分析：

## 失败分析
- 数据最差的：
- 原因分析：

## 人设使用
- 使用频率：
- 效果评估：

## 趋势对比
- 是否符合 trending/style.md：
- 偏差：

## 优化建议
- 选题方向：
- 标题优化：
- 内容调整：
- 人设使用：
- 查询标签调整：
```

## 约束

- 浏览器操作只使用 ego-browser
- 先快照后更新：先生成 snapshots/，再更新 insights.md
- 默认复盘最新5篇，用户可指定
- 所有建议需用户确认后才执行
