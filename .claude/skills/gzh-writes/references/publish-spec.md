# 发布规格

通过微信公众平台 API 将文章存入草稿箱（不会直接发布）。

## 发布流程

1. **展示发布清单**（等待用户确认）：

```
## 发布清单

### 文章标题
xxx

### 封面图
路径：xxx

### 文中配图
- 图1路径：xxx（插入位置：第X段后）

### 摘要
[50字以内，用于公众号摘要字段]

### 检查项
- [ ] 标题是否抓眼球
- [ ] 封面图文字清晰
- [ ] 文中配图位置合理
- [ ] 摘要是否引发点击欲
- [ ] 声明原创
- [ ] 开启留言
- [ ] 群发通知（需后台手动操作）
- [ ] 定时发布时间（需后台手动设置）
```

2. **用户确认后**，执行自动发布到草稿箱：

```bash
# Step 1: Markdown → 微信兼容 HTML
node .claude/skills/gzh-writes/scripts/md2wx.js docs/gzh/{文章}.md /tmp/gzh_wx_{date}.html --image docs/pic/gzh-data-{date}-1.png:{段落位置}

# Step 2: 上传素材 + 创建草稿
node .claude/skills/gzh-writes/scripts/publish.js \
  --title "文章标题" \
  --content /tmp/gzh_wx_{date}.html \
  --cover docs/pic/gzh-cover-{date}.png \
  --summary "50字摘要" \
  --author "作者名" \
  --comment 1
```

3. **输出结果**：草稿 media_id + 发布后提示

> 草稿已创建并默认开启留言。如需声明原创、群发通知或定时发布，请前往 mp.weixin.qq.com 草稿箱操作。

## 配置前置条件

凭证与发布偏好存储在 `~/.gzh-config.json`（本地文件，不进代码仓库）：
```json
{
  "appId": "你的appId",
  "appSecret": "你的appSecret",
  "author": "你的署名",
  "original": 1,
  "reprint": 1,
  "comment": 1,
  "comment_audience": "all",
  "auto_select_comment": 1
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| appId/appSecret | 公众号开发者凭证 | 必填 |
| author | 作者署名 | - |
| original | 声明原创 (1=文字原创, 0=无需声明) | 1 |
| reprint | 快捷转载 (1=允许所有账号转载, 0=关闭) | 1 |
| comment | 开启留言 (1=开启, 0=关闭) | 1 |
| comment_audience | 谁可以留言 (all/fans/fans7) | all |
| auto_select_comment | 自动精选留言 (1=开启, 0=关闭) | 1 |

> 注意：original、reprint、auto_select_comment 目前无法通过 API 直接设置，脚本会在输出中提示用户去后台确认。

首次运行发布脚本时，若配置文件不存在，会输出完整模板引导用户创建。

需要在微信公众平台后台 → 设置与开发 → 基本配置 → IP白名单中添加本机 IP。
