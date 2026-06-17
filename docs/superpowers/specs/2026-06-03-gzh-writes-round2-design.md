# gzh-writes Skill 第二轮优化设计

Date: 2026-06-03

## 背景

第一轮优化（WebFetch 优先、合并确认步骤、数据图子模板、md2wx.js 路径修复）已完成。本轮针对实际使用中的 3 个改进点。

## 修改清单

### 1. 分段小标题居中 + 上方留白

**文件**: `scripts/md2wx.js`

当前 `**一、xxx**` 整行加粗的渲染样式：
```css
font-weight:bold; font-size:18px; color:#2d2926; margin:24px 0 12px; line-height:1.6;
```

改为：
```css
font-weight:bold; font-size:18px; color:#2d2926; text-align:center; margin:40px 0 16px; line-height:1.6;
```

变化点：
- 新增 `text-align:center`
- 上边距 24px → 40px
- 下边距 12px → 16px

### 2. 写作约束：案例优先 + 红色加粗重新定位

**文件**: `SKILL.md`

#### 2a. 论据风格

主观模式原文：
> 论据2-3个，每个有数据或具体案例

改为：
> 论据2-3个，以具体案例/故事为主，数据作为辅助点缀

#### 2b. 红色加粗规则

两种模式原文：
> 3-4 处红色加粗（`**「关键结论或数据」**`），加粗用于关键数据/结论，红色加粗用于核心判断句和重要数据

改为：
> 3-4 处红色加粗（`**「重点内容」**`），建议每个分段小标题下 1 处，标记该段最重要的一句内容（可以是数据、重点论述或核心结论）

#### 2c. 新增数据表达约束（两种模式共用）

在写作流程的「口语化检验」步骤后新增：
> 数据用直觉化表达：「接近一半」优于「47.3%」，「翻了三倍」优于「增长 312%」。精确数字只在核心论据处保留一个。

### 3. SKILL.md 渐进式披露

**文件**: `SKILL.md` + 新建 `references/` 目录下 5 个文件

#### 拆分方案

| 拆出内容 | 目标文件 |
|----------|---------|
| 模式 A/B SubAgent prompt | `references/subagent-prompts.md` |
| 封面图流程（方案格式、CSS 规范、生成步骤） | `references/cover-spec.md` |
| 数据图流程（子模板匹配、截图命令） | `references/data-chart-spec.md` |
| 图片质量自审流程 | `references/image-review.md` |
| 发布流程 + 配置说明 | `references/publish-spec.md` |

#### SKILL.md 保留内容

- 触发方式 + 交互入口
- Step 1~4 流程骨架（每步概述 + `→ 详见 references/xxx.md`）
- 写作引擎规格 + 写作约束（核心规则不拆）
- 全流程执行说明（4 个确认点）

#### 附带清理

- 删除多余空行和冗余分隔线
- 精简重复说明

预估 SKILL.md 从 ~454 行压缩到 ~200 行。

## 不改的部分

- 网络请求逻辑（WebFetch 优先 + agent-browser fallback 保持现状）
- 封面图模板 `cover_template.html`（布局不变）
- 数据图子模板（刚创建，不动）
- 发布脚本 `publish.js`
