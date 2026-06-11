# 数据图规格

## 可视化类型

根据文章内容选择最合适的类型：

- **对比卡片**：左右/上下对比布局，适合 A vs B 场景（如新旧方案、竞品对比）
- **数据表格**：行列清晰的结构化数据展示，适合多维数据（如财务指标、功能对比矩阵）
- **流程/时间轴**：纵向或横向的节点连线，适合事件演进、产品迭代、因果链

## 生成流程

1. 从文章提取适合可视化的数据/对比/流程
2. **匹配子模板**：根据内容类型优先选择预置子模板：
   - **对比类**（A vs B）→ Read `assets/data_compare.html`，填充占位符
   - **表格类**（多维数据）→ Read `assets/data_table.html`，填充占位符
   - **时间轴/流程类**（事件演进）→ Read `assets/data_timeline.html`，填充占位符
   - **以上都不匹配** → Read `assets/data_template.html`，从零设计 CSS+HTML，填充 `{{CUSTOM_CSS}}` 和 `{{CONTENT_HTML}}`
3. Write 到 `/tmp/gzh_data_{YYYY-MM-DD}-{关键词}.html`
4. 截图：`node .claude/skills/gzh-writes/assets/capture.js /tmp/gzh_data_{YYYY-MM-DD}-{关键词}.html docs/pic/gzh-data-{YYYY-MM-DD}-{关键词}-{n}.png 1080 800 fullpage`
5. 执行「图片质量自审」流程（详见 `references/image-review.md`）

## 设计原则

- 浅色背景，商业质感，信息清晰，无多余装饰元素
- 保留噪点纹理增加质感，但不添加署名、编码等无关元素
