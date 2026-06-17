---
name: spec-design
description: '从业务 spec 派生工程化 design.md。design.md 只记录 AI coding 无法从 spec+V3规范+现有代码 自行推导的决策：外部契约、多选一技术选型、工程接线、非显然编排约束。当用户说 "spec-design"、"生成工程化 spec"、"派生 design"、"基于业务 spec 出实施方案" 时触发。'
---

# 工程化设计派生（决策备忘录）

将 spec-detail 产出的业务 spec.md 派生为 design.md。

**核心理念**：design.md 不是代码预演稿，是**决策备忘录 + 接线图**。它只回答一个问题：

> AI coding agent 面对 spec + V3 规范 + 现有代码时，哪些地方有多个合理选项、哪些信息它根本拿不到？

**判断试金石**：把这段内容删掉，AI coding 会跑偏吗？
- 会 → 写进 design.md
- 不会（AI 能从 spec/V3/代码推导）→ 不写

## When to Use

- spec-detail 已产出 `spec.md` 且已对齐
- 准备进入 coding，需要消除技术歧义
- 用户说 "spec-design"、"派生 design"、"出工程化 spec"

## When NOT to Use

- 业务 spec 还在讨论 → 用 `spec-detail`
- design.md 已存在只改局部 → 直接编辑
- 纯领域模型/纯业务规则变更，无技术歧义 → 可跳过 design 直接 coding

## design.md 只回答四类问题

### 1. 外部契约（AI 拿不到的信息）

> AI 知道"要调供应商"，但不知道 API 长什么样

- 外部 API 格式（请求/响应/认证）
- 已有内部服务的接口签名（HSF/Dubbo/HTTP，需指明路径）
- 第三方 SDK 用法约束

### 2. 多选一技术选型（多个都"对"，必须选一个）

> AI 知道"要缓存"，但 Redis Hash vs String vs SortedSet 都能实现

- 缓存：数据结构 + Key 模板 + TTL + 中间件
- 持久化：MySQL / MongoDB / 配置中心 / 硬编码
- 并发控制：分布式锁 / 乐观锁 / 无锁
- 异步：MQ topic + 消息格式 / 同步调用
- 配置来源：Diamond / Apollo / 应用配置

### 3. 工程接线（代码放哪、谁调谁）

> AI 知道有 Goods 域和 Item 域，但不知道它们在工程上怎么关联

- 各 DomainService / AppService / Controller 所在 module
- 跨域调用方式（同 JVM 直接依赖 / HSF / HTTP）
- 现状映射：每个关键类是 NEW / REUSE / EXTEND

### 4. 非显然编排约束（spec 没说但影响正确性的）

> spec 说了"命中复用/未命中回源"，但没说并发、事务、失败策略

- 并发击穿策略
- 回源失败降级策略
- 事务边界（写缓存失败是否影响返回）
- 数据一致性要求（最终一致 / 强一致）

## AI coding 不需要 design 提供的（禁止写入）

| 看似需要 | 为什么不需要 |
|---------|------------|
| DomainService 方法签名 | V3 规范 + spec 领域对象 → 唯一推导 |
| 方法体逻辑 / 算法摘要 | spec 的公式/决策表/约束 → 直接翻译 |
| DTO 字段列表 | spec 的输入输出描述 → 直接映射 |
| Assembler/Converter 映射 | DTO↔领域对象字段对应 → 机械推导 |
| 测试用例 / 测试方法名 | GIVEN-WHEN-THEN → 直接转 |
| 异常类命名 | spec 已定义（如 PricingRuleNotFoundException）|
| 调用链中每一步的细节叙述 | spec 时序图 + V3 分层规则 → 推导 |

## 输入

**规则加载**：按 CLAUDE.md §规则加载 的 **spec-design** 行执行。

**业务输入**：

| 文件 | 用途 | 必须 |
|------|------|------|
| `specs/<变更>/spec.md` | 业务 spec（主输入） | 必读 |
| `specs/<domain>-model/spec.md` | 领域模型定义 | 必读 |
| `specs/跨域共享模型/spec.md` | 共享类型与枚举 | 必读 |
| 外部接口文档（URL / 文件） | 外部协议 | 涉及 OutAdaptor 时必读 |
| 现有工程参考代码路径 | 推断包路径/命名/风格 | 必须，缺失则停止 |

**启动前必问用户**：
1. 是否涉及外部接口？提供文档
2. 提供现有工程参考代码路径（至少 1 个 Adaptor / Repository / Cache 示例）
3. 若是全新项目无参考代码 → 进入"白纸模式"（提示质量风险）

## 输出

```
specs/<变更名称>/
├── design.md         （本技能产出）
└── derive-notes.md   （可选，关键决策的选型理由 + 备选方案对比）
```

## design.md 模板

````markdown
# Design：<变更名称>

> 业务 spec：[./spec.md](./spec.md)
> 派生时间：<YYYY-MM-DD>

## 工程接线

| 角色 | Module | 类名 | 状态 |
|------|--------|------|------|
| Controller | <module> | <XxxController> | NEW / REUSE / EXTEND |
| AppService | <module> | <XxxQueryAppService> | NEW / REUSE / EXTEND |
| DomainService (Item) | <module> | <XxxDomainService> | NEW / REUSE / EXTEND |
| DomainService (Goods) | <module> | <XxxDomainService> | NEW / REUSE / EXTEND |
| Adaptor (供应商) | <module> | <XxxAdaptor> | NEW / REUSE / EXTEND |
| ... | ... | ... | ... |

跨域调用方式：<同 JVM / HSF / HTTP>

## 外部契约

### <外部系统名 1>

- 协议：<HTTP / HSF / SDK>
- 接口：<URL / 方法签名>
- 请求格式：<摘要或链接>
- 响应格式：<摘要或链接>
- 异常映射：<超时/错误码 → 本系统处理方式>

### <已有内部服务>

- 路径：<代码路径>
- 接口签名：<方法签名>
- 备注：<REUSE / 需 EXTEND 什么>

## 技术选型

| 决策点 | 选择 | 备选 | 理由（一句话） |
|--------|------|------|--------------|
| 缓存数据结构 | Redis Hash | String / SortedSet | ... |
| 缓存 Key | `prefix:{hotelId}:{searchHash}` | — | ... |
| 缓存 TTL | Diamond 可配，默认 300s | 固定值 | ... |
| PricingRule 来源 | 一期硬编码 | MySQL / 配置中心 | ... |
| 并发击穿 | 允许穿透，不加锁 | Redis SETNX | ... |
| 回源失败 | 抛异常，不降级 | 降级旧批次 | ... |
| ... | ... | ... | ... |

> 选型详细理由见 [derive-notes.md](./derive-notes.md)

## 非显然约束

<!-- spec 没说、V3 没覆盖、但影响 AI coding 正确性的约束 -->

- <约束 1>：<描述>
- <约束 2>：<描述>
- ...

## 调用链总图（可选，仅当 spec 时序图不足时补充）

<!-- 如 spec.md 已有完整 PlantUML 时序图且足够指导 coding，此节写"见 spec.md §全局时序"即可 -->
<!-- 仅当需要补充技术层细节（如 Cache 读写时机、Adaptor 具体类名）时才画 -->

```plantuml
@startuml
...
@enduml
```

---

## 规则覆盖度（人工 Review 用）

<!-- 本章不指导 AI coding，仅供人工 reviewer 快速验证决策完备性 -->

| spec 规则 | 有技术歧义？ | design 对应 | Review 焦点 |
|-----------|------------|------------|------------|
| BR-XXX <规则名> | 是：<歧义类型> | §<对应章节> | <reviewer 关注点> |
| BR-YYY <规则名> | 否（纯计算） | — | spec 自洽即可 |
| 全局：<编排关注> | 是：<歧义类型> | §<对应章节> | <reviewer 关注点> |

**Review 指引**：
- 标"是"的行：review 对应 design 章节的选型是否合理
- 标"否"的行：确认该规则确实无技术歧义（AI 从 spec+V3 可推导）
- 如发现某"否"行实际有歧义 → 补充 design 决策
````

## 关键决策触发

派生过程中遇到以下情况，**必须暂停并问用户**（不得 AI 擅自选择）：

| 触发条件 | 示例 |
|---------|------|
| 多个技术方案都合理 | Redis Hash vs String |
| 影响运维/成本的参数 | TTL 值、锁超时、重试次数 |
| 跨团队依赖的接口粒度 | Adaptor 一个方法多场景 vs 每场景一方法 |
| 一致性/可用性取舍 | 缓存写失败是否影响返回 |
| 超出一期范围的判断 | "这个是否一期先硬编码" |

**提问格式**：

```
【决策】<标题>

A：<方案>（优点 / 缺点）
B：<方案>（优点 / 缺点）

推荐 <X>，因为 <spec 中的证据>。你选？
```

决策结果 → design.md 技术选型表 + derive-notes.md 详细理由。

## 约束

**术语一致性（核心）**：
- design.md 中的所有名词**必须**和 spec.md 使用相同术语
- spec 写"汇率服务" → design 不能改叫"货币转换网关"
- spec 写"PricingRule" → design 不能改叫"MarkupConfig"
- AI coding 靠术语匹配关联 spec 规则和 design 决策，术语漂移 = 关联断裂

**结构约束**：
- design.md 的每个外部契约/选型/约束必须能追溯到 spec.md 中的某个需求或规则（防超纲）
- spec.md 中涉及技术歧义的规则必须在 design.md 中有对应决策（防遗漏）
- 跨处复用的决策只写一次，其他处引用

**内容红线**：
- 禁止写 DomainService 方法签名（AI 从 spec + V3 推导）
- 禁止写 DTO 字段列表（AI 从 spec 输入输出推导）
- 禁止写算法逻辑摘要（spec 的公式/决策表已经是最佳表达）
- 禁止写测试方法名或断言值（AI 从 GIVEN-WHEN-THEN 推导）
- 禁止重新定义领域对象（领域 spec 是唯一真相源）
- 禁止重新定义共享模型（跨域共享模型 spec 是唯一真相源）
- 禁止出现占位符（TBD / TODO / 待定 / 同上）

**流程约束**：
- 必须先读完 spec + 领域模型 + V3 规范再开始
- 必须获取现有工程参考代码路径，缺失则停止
- 现状映射必须基于实际 grep/find 结果，不允许凭空标 REUSE
- 关键决策必须问用户，不允许 AI 擅选

## 自检（完成前验证）

- [ ] 每项技术选型都有 spec 中的需求锚点（为什么需要这个决策）
- [ ] spec 中所有涉及外部系统的规则都有对应外部契约节
- [ ] 现状映射每个类基于实际代码扫描
- [ ] 无 AI 可自行推导的内容（方法签名/DTO/算法/测试）
- [ ] 无占位符
- [ ] 关键决策都已问过用户
- [ ] derive-notes.md 记录了每个决策的备选方案 + 理由

## 完成摘要格式

```
## Design 派生完成：<变更名称>

**已生成**：design.md + derive-notes.md

**关键决策（N 项）**：
- <决策 1>：选了 <X>
- <决策 2>：选了 <Y>

**现状映射**：NEW <N> / REUSE <M> / EXTEND <K>

**下一步**：review design.md → 通过后 coding
```
