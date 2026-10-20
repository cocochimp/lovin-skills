---
name: xhs-writes
description: 小红书内容生成 skill。当用户说“写小红书”、“小红书笔记”、“xhs-writes”时触发。
---

# 小红书内容生成

## 触发词
- "写小红书"
- "小红书笔记"
- "xhs-writes"

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
| `~/.xhs-data/profile/profile.md` | 个人风格、标签、人设 |
| `~/.xhs-data/profile/goodcase/` | 个人好文章（5-10篇） |
| `~/.xhs-data/trending/style.md` | 热门风格 |
| `~/.xhs-data/trending/goodcase/` | 热门好文章 |
| `~/.xhs-data/trending/title-patterns.md` | 标题风格表 |
| `~/.xhs-data/insights/insights.md` | 当前策略 |
| `~/.xhs-data/articles/` | 生成的文章输出目录 |

## 流程

### 阶段1：选题（5分钟）

1. 询问用户："是否有选题？"
2. 如果有选题：
   - 读取 `~/.xhs-data/profile/profile.md`
   - 读取 `~/.xhs-data/insights/insights.md`
   - 确认选题方向是否符合人设和策略
   - 进入阶段3
3. 如果没有选题：
   - 进入阶段2

### 阶段2：拉取低粉爆款 + 选题建议（10分钟）

1. 读取 `~/.xhs-data/profile/profile.md` 的**查询标签**
2. 使用 ego-browser 打开小红书，用查询标签搜索
3. 筛选低粉爆款（粉丝<5000，互动>500）
4. 剔除无效内容（纯贴图、无参考价值等）
5. 更新 `~/.xhs-data/trending/`（style.md、goodcase/、title-patterns.md）
6. 结合个人风格，生成5个选题建议
7. 用户选择1个或自己输入

### 阶段3：标题（5分钟）

1. 读取 `~/.xhs-data/trending/title-patterns.md`
2. 读取 `~/.xhs-data/profile/profile.md` 的写作风格
3. 基于选题 + 标题风格 + 个人风格，生成5个标题
4. 用户选择1个或自己输入

### 阶段4：内容（10分钟）

1. 读取 `~/.xhs-data/profile/profile.md`
2. 读取 `~/.xhs-data/profile/goodcase/`（个人好文章）
3. 读取 `~/.xhs-data/trending/style.md`（热门风格）
4. 读取 `~/.xhs-data/trending/goodcase/`（热门好文章）
5. 基于标题 + 个人风格 + 爆款风格，生成初稿
6. 用户反馈，最多修改3次
7. 确认完成

### 输出

保存到 `~/.xhs-data/articles/YYYY-MM-DD-<title>.md`

## ego-browser 调用

### 搜索低粉爆款（阶段2）

```javascript
ego-browser nodejs <<'EOFBROWSER'
const task = await taskSpace("search trending");
const page = task.page("p1");
await page.goto("https://www.xiaohongshu.com/search_result?keyword=<查询标签>");
await new Promise(r => setTimeout(r, 3000));
// 提取笔记列表：标题、作者、粉丝数、互动数据
// 筛选：粉丝<5000，互动>500
await task.finish({ keep: [] });
EOFBROWSER
```

### 提取文章详情

```javascript
ego-browser nodejs <<'EOFBROWSER'
const task = await taskSpace("extract article");
const page = task.page("p1");
await page.goto("<article_url>", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 5000));
await page.evaluate(() => window.scrollBy(0, 500));
await new Promise(r => setTimeout(r, 2000));
// 提取：标题、正文、互动数据、标签
await task.finish({ keep: [] });
EOFBROWSER
```

## 约束

- 浏览器操作只使用 ego-browser
- 查询标签从 profile.md 动态读取，不是固定值
- 每个阶段最多迭代次数：选题3轮、标题5个选项、内容3次修改
- 生成的文章保存到 `~/.xhs-data/articles/`，不自动发布
