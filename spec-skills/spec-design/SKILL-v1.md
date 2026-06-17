---
name: spec-design
description: '从业务 spec 派生工程化 spec (design.md)。design.md 结构镜像 spec.md 的需求树，对每个需求/规则的关键实现做阐述（领域行为、数据访问、外部依赖、缓存策略、异常处理、测试要点），叠加全局技术编排（调用链、Controller/Application 入口、横切选型、现状映射）。当用户说 "spec-design"、"生成工程化 spec"、"派生 design"、"基于业务 spec 出实施方案" 时触发。'
---

# 工程化规格派生（DDD 工程契约）

将 spec-detail 产出的业务 spec.md 派生为工程化 spec（design.md）。design.md 是业务 spec 和代码之间的契约层，**结构镜像 spec.md** 的需求树，对每条规则/场景的关键实现做阐述，使 AI coding 能"机械填空"完成代码。

**核心理念**：design.md 是工程契约，不是代码。它定义"业务行为"到"代码组织"的映射，但不写方法体。AI coding 阶段根据 design.md 填空，checkstyle 兜底校验。

**职责边界**：
- 本技能只生成变更级 `design.md`（工程化 spec）
- 不生成代码、不修改业务 `spec.md`
- 不生成 Repository / Adaptor 的具体实现细节（只声明接口签名 + 实现选型，方法体交给 coding 阶段）

## When to Use

- spec-detail 已产出 `spec.md`（业务 spec）且已和产品对齐
- 准备进入 coding 阶段，需要明确各层方法签名和调用链
- 用户说 "spec-design"、"派生 design"、"出工程化 spec"、"基于业务 spec 做实施方案"

## When NOT to Use

- 业务 spec 还在和产品讨论 → 用 `spec-detail`
- 工程化 design.md 已存在只是改局部 → 直接编辑，不要重派生
- 想跳过 design 直接 coding → 不推荐（放大 LLM 凭空发挥的空间）

## 核心概念

### 业务 spec vs 工程化 spec

| 维度 | 业务 spec（`spec.md`） | 工程化 spec（`design.md`） |
|---|---|---|
| 受众 | 产品 + 工程 | 工程 + LLM coding |
| 语言 | DDD 领域语言（无技术细节） | 工程契约语言（含技术分层） |
| 层级 | 只描述领域层行为 | 含 Controller / Application / Domain / Adaptor / Cache 全栈 |
| 粒度 | GIVEN/WHEN/THEN + 业务规则 | 方法签名 + 调用链 + 技术选型 + 异常映射 |
| 修改触发 | 业务变化时改 | 业务 spec 改了重派生 |

### 命名与目录约定

```
specs/<变更名称>/
├── spec.md           （spec-detail 产出，业务 spec）
├── design.md         （★ 本技能产出，工程化 spec / 技术设计）
└── derive-notes.md   （可选，关键决策记录）
```

### 派生原则：模式驱动

业务 spec 标注的"开发模式"决定 design.md 的调用链骨架（不允许跨模式发挥）：

| 业务模式 | 调用链骨架 |
|---------|-----------|
| 写模式 | Controller → CommandAppService → DomainService → Aggregate.method() → Repository.save() |
| 读模式（本域） | Controller → QueryAppService → Repository.query() → Assembler |
| 读模式（外部） | Controller → QueryAppService → OutAdaptor → Assembler |
| 纯计算模式 | Controller → QueryAppService → DomainService → Result |
| 规则+计算模式 | Controller → QueryAppService → DomainService → Repository.query(规则) + Aggregate.matchRule/calculate() |

如业务 spec 已含 PlantUML 时序图（如 search-availability），优先复用并补技术层细节；否则按上表骨架新绘。

### design.md 结构：全局技术编排 + 镜像 spec 章节

design.md **结构镜像 spec.md 的需求树**，每节阐述 spec 对应条目的关键实现。避免按层组织（Controller/App/Adaptor/...）导致 reviewer 跳着看的问题。

```
# 工程化规格：<变更名称>

## 全局技术编排                       ← 横切关注集中地
  ### 调用链总图（PlantUML）
  ### Controller 入口（DTO + API）
  ### Application 主编排（签名 + 编排骨架 + 事务/并发）
  ### 横切技术基线（数据库/缓存/锁/MQ 等选型）
  ### 现状映射（NEW/REUSE/EXTEND 表）

## 需求：<需求名 1>                   ← 镜像 spec.md 的需求
  ### 规则 BR-XXX <规则名>            ← 镜像 spec.md 的规则
    - 领域行为：<方法签名>
    - 数据访问 / 外部依赖 / 缓存策略
    - 算法要点 / 异常处理
    - 关键决策（链接 derive-notes.md）
    - 测试要点（覆盖 spec 中的场景）

## 需求：<需求名 2>
  ...
```

**两个关键约定**：

1. **每节必须有 spec 锚点**：design.md 的规则节必须对应 spec.md 的 BR-XXX 编号（或需求名）；没有对应锚点的节不允许出现（**防超纲**）
2. **跨节复用用引用**：同一实现要素（如某个 Adaptor / 缓存策略）首次出现的节完整阐述，后续节用 `引用 §全局.横切` 或 `引用 §需求X.规则Y`，**不重复阐述**

**详尽程度边界**：

| 层级 | 处理方式 | 例 |
|------|---------|----|
| **契约层** | 必须详尽，不可省略 | Controller DTO 字段、方法签名、Cache Key 模板、异常映射 |
| **结构层** | 必须详尽 | 调用链骨架、现状映射（NEW/REUSE/EXTEND） |
| **行为层** | 只摘要，引用 spec | 业务规则、算法详细逻辑、测试断言值 |
| **决策层** | 标"已决策"，详情移到 derive-notes.md | 选型理由、备选方案对比 |

**判断试金石**：把这段内容删掉，AI coding 会跑偏吗？会 → 留下；不会 → 删掉或外移。

## 输入与输出

### 输入

| 文件 | 用途 | 必读/按需 |
|------|------|---------|
| `specs/<变更名称>/spec.md` | 业务 spec（主输入） | 必读 |
| `specs/<domain>-domain-model/spec.md` | 业务 spec 引用的领域模型 spec（可能多份） | 必读 |
| `specs/跨域共享模型/spec.md` | 共享类型与枚举 | 必读 |
| `rules/ddd/ddd-overview.md` | DDD 总览 | 必读 |
| `rules/ddd/ddd-<layer>-layer.md` | 按业务 spec 模式按需读对应分层规范 | 按需 |
| 外部接口文档（URL / 文件路径） | 外部协议（如飞猪 ARI） | 涉及 OutAdaptor 时必读，由用户提供 |
| **现有工程参考代码（路径）** | 已有的 Adaptor / Repository / Cache 实现示例 | **必须**，由用户提供；缺失则拒绝派生（见护栏） |

### 输出

| 文件 | 说明 |
|------|------|
| `specs/<变更名称>/design.md` | 工程化 spec |
| `specs/<变更名称>/derive-notes.md` | （可选）关键决策记录，含用户回答 |

## 执行流程

### 阶段 0：加载上下文

1. 读取业务 spec，提取：
   - 功能元信息（开发模式、接口入口）
   - 参与对象列表
   - 所有需求 + 规则 + 场景（GIVEN/WHEN/THEN）
   - 业务规则编号（BR-XXX）
   - 已绘制的时序图（如有）
2. 读取领域模型 spec（业务 spec 引用的每个域）
3. 读取跨域共享模型 spec
4. 按业务 spec 模式读取对应 DDD 规范：
   - 写模式 / 读模式 / 规则+计算模式：全六层
   - 纯计算模式：domain / application / adaptor / client / model（不需 infrastructure）
5. **询问用户**（必问）：
   - 是否涉及外部接口？如有，提供文档（URL 或文件路径）
   - 提供现有工程参考代码路径（Adaptor / Repository / Cache 各 1 个示例最佳）

**校验**：
- 业务 spec 必须存在且模式已标注，否则停止并提示先用 spec-detail
- 引用的领域对象必须能在领域模型 spec 中找到定义，否则停止并提示补领域 spec
- **现有工程参考代码缺失 → 停止派生**，提示用户："工程化 spec 派生依赖现有代码风格（包路径、命名、异常映射等），无参考会导致一次成功率显著下降。请提供至少 1 个现有的 Adaptor 实现或 Repository 实现路径。若是从零起的新项目，请明确告知，本技能将进入'白纸模式'（产物质量自行评估）。"

### 阶段 1：派生"全局技术编排"章节

主控派生 design.md 顶部的全局编排，承载所有横切关注：

| 子章节 | 派生要点 |
|--------|---------|
| **调用链总图** | 按业务 spec 模式选取调用链骨架；如 spec 已含 PlantUML 时序图，复用并补技术层细节（如把"App"细化为 Controller / Application 两段；把"adaptor 旁路输出"标明为具体 Adaptor 类名）|
| **Controller 入口** | 按入口类型（HTTP / HSF / MQ）派生 Controller 类 + Request/Response DTO；字段命名对齐 spec 中的领域概念；参考现有 Controller 示例 |
| **Application 主编排** | 派生 AppService 方法签名 + 编排骨架（逻辑摘要，不写方法体）+ 事务边界 + 并发控制 |
| **横切技术基线** | 列出技术选型表（数据库、缓存中间件、并发锁、MQ 等），每项含选型 + 一句话理由；遇到关键决策 → 阶段 3 问用户 |
| **现状映射** | 用 Glob/Grep 扫描代码库，对 design 中声明的每个类（含 Controller / AppService / DTO / Adaptor / Cache）标记 NEW / REUSE: <路径> / EXTEND: <路径> + <增量> |

**节奏**：派生完做一次自检（覆盖度 / 现状扫描是否完整），再进入阶段 2。

### 阶段 2：按 spec 镜像派生"需求/规则"章节

**遍历** spec.md 的需求 → 规则结构，**逐节**派生 design.md 对应章节。

对每条规则节，按以下要素阐述（**只写需要的，无对应内容则省略**）：

| 要素 | 内容 | 引用约定 |
|------|------|---------|
| **领域行为** | DomainService / Aggregate 方法签名 | 引用领域模型 spec（不重复定义） |
| **数据访问** | Repository 接口签名 + 实现选型（一期硬编码 / MySQL / 配置中心 / ...） | 选型如属横切 → 引用 §全局.横切 |
| **外部依赖** | Adaptor 接口签名 + 异常映射 | 已在他处定义 → 引用 §其他节 |
| **缓存策略** | Key 模板 + TTL + 数据结构 + 缓存中间件 | 通用策略 → 引用 §全局.横切 |
| **算法要点** | 关键算法摘要（**只写要点，详细逻辑引用 spec**） | "详见 spec.md §<规则名>.逻辑" |
| **异常处理** | 表格：异常情况 → 业务异常类 | — |
| **关键决策** | 一行标"☑️ <决策标题>"，详情见 derive-notes.md | 链接到 derive-notes.md 对应编号 |
| **测试要点** | 表格：测试方法签名 → 对应 spec 场景（**不写断言值，断言在 spec 里**）| "见 spec.md §<规则名>.<场景名>" |

**遍历完后做"覆盖度自检"**：spec.md 的每条规则都对应 design.md 的某节？反之 design.md 的每节都对应 spec.md 锚点？

### 阶段 3：关键决策点（USE superpowers:brainstorming）

派生过程中遇到"需要架构判断"的点，**暂停派生，向用户提问**。

**典型决策点**：
- Cache 数据结构（Redis Hash / String / SortedSet？）
- TTL 策略（固定 / 动态？数值多少？）
- Adaptor 接口粒度（粗：一个方法多场景 / 细：每场景一方法）
- 事务边界（Application 层 / DomainService 层）
- 异常分类（业务异常 / 系统异常 / 第三方异常）
- 并发锁机制（Redis SETNX / Redisson / 数据库行锁 / 无锁）

**提问格式**（对齐 spec-explore 的"立场而非脚本"风格）：

```
【关键决策】<决策标题>

选项 A：<方案 A>
  优点：...
  缺点：...
  适用：...

选项 B：<方案 B>
  优点：...
  缺点：...
  适用：...

推荐：基于 spec 中的 <证据>，推荐 <选项>。
你选哪个？（或提出新方案）
```

每个决策的选择 + 理由 → 记录到 `derive-notes.md`；design.md 对应处只写 `☑️ <决策标题>（详见 derive-notes.md #<编号>）`。

### 阶段 4：合并 + 自检（USE superpowers:verification-before-completion）

主控合并"全局技术编排"+"需求/规则镜像章节"为完整 `design.md`，然后逐条自检：

**自检 checklist**（每项必须 ✅，否则回到对应阶段修复）：

- [ ] 调用链总图覆盖了 spec 中所有场景的 WHEN
- [ ] Controller DTO 字段命名与 spec 中的领域概念一致
- [ ] Application 主编排承接了所有 spec 需求的入口
- [ ] 横切技术基线已明确（数据库 / 缓存 / 锁 / MQ 等），不存在"按需"占位
- [ ] **design.md 的每个规则节都有 spec 锚点**（BR-XXX 编号或需求名可追溯）
- [ ] **spec.md 的每条规则都对应 design.md 的某节**（无遗漏）
- [ ] **跨节复用使用引用**（§全局.横切 / §需求X.规则Y），不重复阐述
- [ ] 没有 spec 没说过的需求节出现（**防超纲**）
- [ ] 共享模型只引用 specs/跨域共享模型/spec.md，没重新定义
- [ ] 领域行为只引用领域模型 spec，没重新定义
- [ ] 现状映射每个类有 NEW / REUSE / EXTEND 标记
- [ ] 测试要点覆盖每个规则下所有场景（不写断言值，断言在 spec 里）
- [ ] 没有占位符（TBD / TODO / 同上 / 见上 / 类似 §N）
- [ ] 方法签名完整（类型 + 名称），无 `...args` / `...` 省略

### 阶段 5：完成摘要

```
## 工程化 spec 派生完成：<变更名称>

**已生成：**
- specs/<变更名称>/design.md
- specs/<变更名称>/derive-notes.md（关键决策记录）

**结构概览：**
- 全局技术编排：N 节
- 需求镜像章节：N 个需求 / M 条规则

**关键决策：**
- <决策 1>：选择了 <选项>，理由：<...>
- <决策 2>：...

**现状映射统计：**
- NEW：<N> 个类
- REUSE：<M> 个类（引用现有代码）
- EXTEND：<K> 个类（需增量改造）

**自检结果：** ✅ 通过 / ⚠️ 有 N 项待人工 review

**下一步：** 人工 review design.md（建议从全局编排扫起，再按需求逐节看）→ 通过后进入 coding 阶段
```

> v0.1 不引入独立 reviewer subagent，自检由阶段 4 的 checklist 承担。后续视效果再决定是否引入 design-reviewer subagent。

## design.md 模板

````markdown
# 工程化规格：<变更名称>

> 业务 spec：[./spec.md](./spec.md)
> 派生时间：<YYYY-MM-DD>

## 全局技术编排

### 调用链总图

```plantuml
@startuml
[完整时序图，含 Controller / Application / Domain / Adaptor / Cache 全栈]
@enduml
```

### Controller 入口

**Controller 类**：`adaptor/input/<XxxController>`
**API 入口**：`<HTTP METHOD> <路径>`

**Request DTO** `client/<变更名>/req/<XxxRequestDTO>`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|

**Response DTO** `client/<变更名>/res/<XxxResponseDTO>`：

| 字段 | 类型 | 说明 |

### Application 主编排

**AppService 类**：`application/<变更名>/<XxxQueryAppService>`（或 CommandAppService）

**方法签名**：

| 方法 | 入参 | 返回 | 编排骨架（逻辑摘要） |
|------|------|------|--------------------|

**事务边界**：<声明 / 编程式；范围说明>
**并发控制**：<分布式锁 / 乐观锁 / 无；范围说明；引用 §横切.并发锁>

### 横切技术基线

| 技术点 | 选型 | 理由 |
|--------|------|------|
| 数据库 | MySQL / MongoDB / 无持久化 | ... |
| 缓存 | Redis（数据结构 + Key 模板 + TTL）/ Tair / Caffeine 本地缓存 / 无 | ... |
| 并发锁 | Redis SETNX / Redisson / ZooKeeper / 数据库行锁 / 无 | ... |
| 异步消息 | RocketMQ / Kafka / 无 | ... |
| 配置 | 配置中心（Diamond/Apollo）/ 应用配置文件 | ... |

### 现状映射

| 类 | 状态 | 路径 / 说明 |
|----|------|------------|
| <ClassName> | NEW | （全新创建） |
| <ClassName> | REUSE | <已存在路径> |
| <ClassName> | EXTEND | <已存在路径> + 新增 <method> 方法 |

---

## 需求：<需求名 1>

### 规则 <BR-XXX> <规则名>

**领域行为**：`<DomainServiceClass>.<method>(<Param>): <Result>`
  > 定义见 `specs/<domain>-domain-model/spec.md`

**数据访问**：`<RepositoryClass>.<method>(...)`，实现选型 = <一期硬编码 / MySQL / 配置中心 / ...>
  > 选型详见 §全局.横切

**外部依赖**：`<XxxAdaptor>.<method>(<Param>): <Result>`（adaptor/output/<XxxAdaptor>）

**缓存策略**：
- Key 模板：`<prefix>:{<placeholder>}:...`
- 数据结构：Redis <String / Hash / ...>
- TTL：<具体值或动态策略>
- 引用 §全局.横切（如属通用策略）

**算法要点**：<关键算法摘要，详见 spec.md §<规则名>.逻辑>

**异常处理**：

| 异常情况 | 业务异常 | 说明 |
|---------|---------|------|

**关键决策**：☑️ <决策标题>（详见 [derive-notes.md](./derive-notes.md) #<编号>）

**测试要点**：

| 测试类 | 测试方法 | 对应场景 |
|--------|---------|---------|
| <TestClass> | <testMethodName> | spec.md §<规则名>.<场景名> |

### 规则 <BR-YYY> <规则名>

...

---

## 需求：<需求名 2>

...
````

## 护栏规则

- 必须先读取业务 `spec.md`、领域模型 spec、跨域共享模型 spec、DDD 规范，再开始派生
- 必须先获取现有工程参考代码路径，无参考则停止并提示用户（详见阶段 0 校验）
- **design.md 章节结构必须镜像 spec.md 的需求/规则树**，每个规则节必须有 spec 锚点（BR-XXX 编号），无锚点的节不允许出现
- **spec.md 的每条规则都必须在 design.md 中有对应节**，无对应即遗漏，必须补全
- **跨节复用必须用引用，禁止重复阐述**（如某个 Adaptor 在 3 节都用到，第一次完整写，后两次引用）
- 不允许 design.md 中产生 spec.md 没说过的业务需求（防超纲）
- 不允许 design.md 中重新定义领域对象（领域 spec 是单一真相源）
- 不允许 design.md 中重新定义共享模型（跨域共享模型 spec 是单一真相源）
- 关键架构决策必须显式询问用户，不允许擅自选择（理由：派生不是创作，决策权在用户）
- 决策的"理由 / 备选方案对比"必须写到 derive-notes.md，design.md 只标"☑️ 已决策"+ 链接
- 现状映射必须基于**实际扫描代码库结果**，不允许凭空标 REUSE
- 测试要点必须覆盖 spec.md 中每条规则下的所有场景，不允许遗漏
- 测试要点**不写断言值**（断言值在 spec.md 里），只写测试方法签名 + 对应场景
- 算法要点**不重复 spec 的逻辑**，只写摘要 + 引用
- 禁止在 design.md 中出现占位符（TBD / TODO / 同上 / 见上 / 类似 §N）
- 方法签名必须完整（类型 + 名称），不允许 `...args` / `...` 等省略
- 业务 spec 已含的 PlantUML 时序图必须复用并补技术层细节，不允许另起炉灶
