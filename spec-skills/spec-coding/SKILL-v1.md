---
name: spec-coding
description: '从 design.md 生成符合 DDD 规范且通过 spec 验收的代码。直接使用 superpowers:writing-plans 生成 Plan、superpowers:subagent-driven-development 执行（含 superpowers:test-driven-development），在此基础上注入 DDD 规则审查作为第三阶段 review。当用户说 "spec-coding"、"根据 design 生成代码"、"实现 design.md"、"coding" 时触发。'
---

# Spec Coding（Design → Code）

从 `design.md` 生成代码。输出：符合 DDD 规范 + 通过 spec 测试验收的完整实现。

**执行链路**：
```
Phase 0: 加载上下文（design.md + spec.md + DDD rules）
Phase 1: USE superpowers:writing-plans → 生成 plan.md
Phase 2: USE superpowers:subagent-driven-development → 逐任务执行
         （implementer 内部 USE superpowers:test-driven-development）
         + 追加第三阶段：DDD Rule Review
Phase 3: USE superpowers:verification-before-completion → 最终验收
```

**本 skill 的增量定义**（superpowers 不覆盖的部分）：
1. Phase 0：DDD 规则按需加载策略
2. Phase 1 的约束注入：DDD 层级依赖序 + 分层 TDD 策略
3. Phase 2 的第三阶段 Review：DDD Rule Reviewer（superpowers 只有 spec + code-quality 两阶段）
4. Phase 3 的额外验收：DDD 层级扫描 + Spec 合规矩阵

---

## When to Use

- `design.md` 已存在且人工 review 通过
- 用户说 "spec-coding"、"实现 design.md"、"根据 design 生成代码"、"coding"

## When NOT to Use

- design.md 还没生成 → 先用 `spec-design`
- 业务 spec 还在讨论 → 先用 `spec-detail`
- 只改一两行代码 → 直接改

---

## Phase 0：加载上下文 + 校验

**必读（始终加载）**：

| 文件 | 用途 | 优先级 |
|------|------|--------|
| `specs/<变更名称>/design.md` | 主输入：类路径、方法签名、编排骨架、测试要点 | 最高（唯一真相源） |
| `specs/<变更名称>/spec.md` | 业务 spec：GIVEN/WHEN/THEN 场景（测试断言值来源） | 高 |
| `rules/coding-enforcement.md` | 编码硬约束（用户反馈驱动，21 条强规则） | 高（硬约束） |
| `rules/ai-coding-guidelines.md` | AI 编码行为准则（Karpathy Guidelines） | 中（柔性指导） |
| `rules/ddd-quick-reference.md` | DDD 分层规则入口（按需加载详细规则） | 中 |

**规则优先级**：`design.md > coding-enforcement.md > ai-coding-guidelines.md > DDD 分层规则`

**按需加载 DDD 详细规则**（根据 design.md 涉及的层）：

| 条件 | 加载 |
|------|------|
| Domain 层 | `rules/ddd/ddd-domain-layer.md` |
| Application 层 | `rules/ddd/ddd-application-layer.md` + `rules/practical/practical-orchestration.md` |
| Adaptor 层 | `rules/ddd/ddd-adaptor-layer.md` + `rules/practical/practical-adaptor.md` |
| Infrastructure 层 | `rules/ddd/ddd-infrastructure-layer.md` + `rules/practical/practical-infrastructure.md` |
| Client 层 | `rules/ddd/ddd-client-layer.md` |
| Model 层 | `rules/ddd/ddd-model-layer.md` |
| 错误码 | `rules/practical/practical-error-code.md` |
| Assembler | `rules/practical/practical-assembler.md` |
| 日志埋点 | `rules/practical/practical-logging.md` |

**前置校验**：
- design.md 存在且含"现状映射"表
- REUSE/EXTEND 类路径可在代码库中找到
- 目标工程路径可写

校验失败 → 停止，提示用户。

---

## Phase 1：USE superpowers:writing-plans

**REQUIRED SUB-SKILL:** Use `superpowers:writing-plans` 生成 Plan。

在调用 writing-plans 时，注入以下**额外约束**作为 Plan 生成的输入上下文：

### 约束 1：DDD 层级依赖序

Plan 的 task 必须按以下顺序组织（writing-plans 原生不感知 DDD 分层）：

```
Phase A: Model 层（无依赖）— 错误码枚举、共享枚举
Phase B: Domain 层（依赖 model）— 异常类 → Value → DomainService 接口 → 实现
Phase C: Client 层（依赖 model）— DTO → AppService 接口
Phase D: Application 层（依赖 domain + client）— Assembler → Config → Utils → AppServiceImpl
Phase E: Adaptor 层（依赖 application + domain）— OutAdaptor 实现 → Converter
Phase F: Infrastructure 层（依赖 domain）— Repository 实现 → PO → Mapper
Phase G: Controller 层（依赖 client + application）
Phase H: 端到端测试
```

### 约束 2：分层 TDD 策略

告知 writing-plans 在不同层使用不同的 task 结构：

| DDD 层 | Task 结构 | 理由 |
|--------|----------|------|
| Model / Client / Controller | 直接实现 + compile 验证 | 纯数据/透传，无行为 |
| **Domain** | **严格 TDD**（RED → verify fail → GREEN → verify pass → commit） | 业务逻辑核心 |
| Application / Adaptor / Infrastructure | 先实现 + compile → 后补测试 → verify pass | 编排/薄层，TDD 成本 > 收益 |

Domain 层 TDD 的 RED 步骤输入 = design.md 测试要点表 + spec.md 的 GIVEN/WHEN/THEN 断言值。

### 约束 3：数据来源映射

告知 writing-plans 代码内容的来源：

| 代码元素 | 来源 |
|---------|------|
| 类路径、包名 | design.md §现状映射 |
| 方法签名（类名、方法名、参数、返回值） | design.md §领域行为 / §Application 主编排 |
| 编排步骤顺序 | design.md §Application 主编排.编排骨架 |
| 错误码枚举值 | design.md §横切.错误码 |
| 测试方法名 + 场景 | design.md §测试要点 |
| 测试断言值（具体数字/预期结果） | spec.md §场景.GIVEN/WHEN/THEN |
| 基类、后缀、注解约定 | rules/ddd-quick-reference.md |

### 约束 4：Plan 保存路径

保存到 `specs/<变更名称>/plan.md`（覆盖 writing-plans 默认的 `docs/superpowers/plans/` 路径）。

### Plan 自检追加项

在 writing-plans 原生自检基础上，追加：

- [ ] design.md 现状映射中每个 NEW 类都有对应 task
- [ ] design.md 测试要点表中每个测试方法都出现在 plan 中
- [ ] 层级依赖序正确（无前向引用：后续 task 不引用尚未创建的类）
- [ ] 方法签名与 design.md **逐字一致**

---

## Phase 2：USE superpowers:subagent-driven-development

**REQUIRED SUB-SKILL:** Use `superpowers:subagent-driven-development` 执行 Plan。

Subagent-driven-development 原生提供：
- Fresh subagent per task
- Implementer prompt template（`./implementer-prompt.md`）
- Spec compliance reviewer（`./spec-reviewer-prompt.md`）
- Code quality reviewer（`./code-quality-reviewer-prompt.md`）

**本 skill 的定制点**：

### 定制 1：Implementer 上下文注入

在 superpowers 的 implementer prompt 基础上，**追加三块上下文**：

```
## Design Context（追加）

[从 design.md 提取该 task 对应的规则节全文]
[包含：领域行为、数据访问、异常处理表、算法要点]

## Coding Enforcement — 硬约束（追加，始终包含）

以下规则来自 coding-enforcement.md，优先级高于所有其他编码指导：

- #5: 不留 TODO / FIXME 占位 — 直接实现完整逻辑
- #6: 不生成示例/占位实现 — 禁止 throw UnsupportedOperationException
- #7: 参数不留空/不硬编码测试值
- #8: import 必须完整且正确
- #14: SunfireLog + FlyeyeLog 必须成对出现，finally 中 log()
- #15: 仅允许 Assembler/Converter/Copier — 禁止 Translator/Helper/Handler 等
- #17: 复制类必须用 MapStruct @Mapper(componentModel = "spring")
- #19: 关键逻辑必须单行书写 — 禁止对方法调用做参数折行
- #20: 每个逻辑块必须有中文注释（干什么 + 为什么）
- #21: 逻辑块间必须空行隔离，同一块内禁止空行

## AI Coding Guidelines — 行为准则（追加，始终包含）

- 先思考再编码：不确定就问，不默默选一个
- 简单优先：能解决问题的最少代码，不做投机
- 精确修改：只动必须动的，匹配已有风格
- 目标驱动：每步有可验证的成功标准

## DDD Layer Rules（追加，按当前层裁剪）

[从 ddd-quick-reference.md + 对应详细规则文件提取 3-5 条关键条款]

示例（Domain 层 task）：
- V3 §ddd-domain-layer 1.2：允许 @Resource 注入 Adaptor 接口（依赖倒置）
- V3 §ddd-domain-layer 1.3：禁止设计模式，允许穷举 enum 分支
- practical-orchestration §四：逻辑块间用空行分隔，同一块内禁止空行

## Self-Check Before Reporting（追加）

Design 合规：
- [ ] 类在 design.md 指定的包路径下
- [ ] 方法签名与 design.md 完全一致
- [ ] 无跨层依赖违规

Coding Enforcement 合规：
- [ ] 无 TODO/FIXME/占位实现
- [ ] import 完整
- [ ] 关键逻辑单行书写（无参数折行）
- [ ] 逻辑块有中文注释 + 空行隔离
- [ ] 复制类用 MapStruct，无 Translator/Helper

DDD 合规：
- [ ] 继承正确基类
- [ ] 命名符合后缀约定
- [ ] 分层 Bean 作用域正确
```

### 定制 2：Implementer 内部 TDD

Domain 层 task 时，implementer 内部 **REQUIRED SUB-SKILL:** Use `superpowers:test-driven-development`。

其他层 task 不强制 TDD（按 Plan 中的 task 结构执行即可）。

### 定制 3：Spec Reviewer 对照 design.md

superpowers 的 spec-reviewer 原生模板中 `[FULL TEXT of task requirements]` 替换为：

```
## What Was Requested

[design.md 对应规则节全文]
[design.md 测试要点表]
[design.md §现状映射中该类的路径]

## Additional Checks（追加）

1. 文件路径是否与 design.md"现状映射"一致？
2. 方法签名是否与 design.md 逐字一致（类名/方法名/参数类型/返回类型）？
3. Application 编排步骤顺序是否与 design.md"编排骨架"一致？
4. 异常处理表中每种情况是否都有对应代码路径？
5. 多余实现？（design.md 没要求的方法/类/逻辑）
```

### 定制 4：追加第三阶段 — DDD Rule Review

**在 code-quality-reviewer 通过之后**，追加 DDD Rule Reviewer：

```
You are reviewing code for DDD architecture compliance AND coding enforcement rules.

## Rules to Check

### coding-enforcement.md（硬约束，完整文件）
[coding-enforcement.md 全文 — 21 条强规则]

### ai-coding-guidelines.md（柔性指导）
[ai-coding-guidelines.md 全文]

### 当前层 DDD 规则：<layer name>
[ddd-<layer>-layer.md 核心条款]
[practical-<topic>.md 加严条款]

### 通用 DDD 规则
[ddd-quick-reference.md 分层 Java Bean 表]

## Code to Review

[实际代码 diff]

## Check Items — Coding Enforcement（优先级最高）

- [ ] #5: 无 TODO/FIXME 占位
- [ ] #6: 无示例/占位实现（throw UnsupportedOperationException 等）
- [ ] #7: 无硬编码测试值
- [ ] #8: import 完整且正确
- [ ] #14: SunfireLog + FlyeyeLog 成对，finally 中 log()
- [ ] #15: 无 Translator/Helper/Handler 等禁止类
- [ ] #17: 复制类用 MapStruct @Mapper(componentModel = "spring")
- [ ] #18: Bean 后缀与作用域正确
- [ ] #19: 关键逻辑单行书写（无参数折行）
- [ ] #20: 每个逻辑块有中文注释
- [ ] #21: 逻辑块间空行隔离，块内无空行

## Check Items — DDD 分层

- [ ] 分层依赖方向正确（上层 → 下层，禁止反向）
- [ ] Java Bean 后缀正确 + 继承正确基类
- [ ] 无 @Value 直接注入（用 SwitchConfig 静态字段 + Binder）
- [ ] Application 层：编排空行规则、禁散落校验、ResultDO 由 Assembler 产出
- [ ] Domain 层：禁设计模式、允许穷举 enum、@Resource 注入 Adaptor 接口
- [ ] 错误码：对外枚举在 client、对内枚举在 model、Assembler 映射

## Check Items — AI Coding Guidelines（柔性）

- [ ] 是否最简实现（无过度抽象/投机性功能）
- [ ] 是否只改了必须改的（无无关格式调整）

Report:
- ✅ Compliant
- ❌ Violations: [违规条款编号 + file:line + 修复建议]
```

**执行序（三阶段）**：
```
Implementer → Spec Review (design.md) → Code Quality Review (superpowers 原生) → DDD Rule Review (本 skill 追加)
```

三阶段全部 ✅ 才 mark task complete。

### 定制 5：规则裁剪与注入策略

**始终完整注入**（不裁剪）：
- `coding-enforcement.md` — 21 条硬约束，每个子 agent 都必须遵守
- `ai-coding-guidelines.md` — 行为准则，每个子 agent 都应了解

**按层裁剪注入**（避免上下文膨胀）：
- DDD 分层规则只给当前层相关的条款

```
Implementer 拿到 =
  coding-enforcement.md 全文（硬约束，始终）
  ai-coding-guidelines.md 全文（行为准则，始终）
  ddd-quick-reference.md 速查表（始终）
  + 当前层 ddd-*-layer.md 中的 3-5 条关键条款（摘录）
  + 当前层 practical-*.md 中的关键加严（摘录）

DDD Rule Reviewer 拿到 =
  coding-enforcement.md 全文（硬约束，始终）
  ai-coding-guidelines.md 全文（行为准则，始终）
  ddd-quick-reference.md 速查表（始终）
  + 当前层 ddd-*-layer.md 完整文件
  + 当前层 practical-*.md 完整文件
```

Implementer 拿 DDD 精简版（指导写代码），Reviewer 拿 DDD 完整版（严格审查）。
Coding enforcement 和 ai-coding-guidelines 不裁剪——它们是通用行为约束，不分层。

---

## Phase 3：最终验收

**REQUIRED SUB-SKILL:** Use `superpowers:verification-before-completion`。

在 verification-before-completion 的标准验证基础上，追加：

### 追加 1：Spec 合规矩阵

遍历 design.md 测试要点表中**每个测试方法**：

```markdown
## Spec Compliance Matrix

| 测试类 | 测试方法 | 对应 spec 场景 | 状态 |
|--------|---------|---------------|------|
| BuildItemOfferDomainServiceImplTest | matchPricingRule_单条规则命中 | BR-Item-001 场景 1 | ✅ |
| ... | ... | ... | ✅/❌ |
```

全部 ✅ 才通过。有 ❌ → 回到 Phase 2 补实现。

### 追加 2：DDD 层级扫描

对所有新增文件做全局扫描：
- `import` 依赖方向检查（grep + 分析）
- 包路径 vs design.md 现状映射表对比
- 基类继承验证

### 追加 3：全量编译与测试

```bash
mvn compile -pl <all-affected-modules>
mvn test -pl <all-affected-modules>
```

### 最终报告

```
## Spec Coding Complete: <变更名称>

**Plan:** specs/<变更名称>/plan.md
**Tasks:** N/N complete ✅
**Compile:** PASS ✅
**Tests:** M tests, all PASS ✅
**Spec Compliance:** K/K scenarios covered ✅
**DDD Compliance:** Layer scan clean ✅

**Files Created:** <list>

**Next:** 人工 code review → merge
```

---

## 护栏规则

**优先级链**：`design.md > coding-enforcement.md > ai-coding-guidelines.md > DDD 分层规则 > spec.md`

- **design.md 是唯一真相源** — 代码的签名/路径/编排必须与之完全一致
- **coding-enforcement.md 是硬约束** — 21 条强规则不可违反（无 TODO、完整 import、单行逻辑、中文注释、MapStruct 强制等）
- **ai-coding-guidelines.md 是行为准则** — 简单优先、精确修改、不投机
- **DDD rules 是分层规范** — 后缀、基类、依赖方向、Bean 作用域
- **spec.md 是测试断言值来源** — GIVEN/WHEN/THEN 的具体数值用于测试代码
- 禁止子 agent 自行发明 design.md 中不存在的类/方法/路径
- 禁止跳过任何 Review 阶段（三阶段全过才算 done）
- 禁止在所有测试通过前声明完成
- 连续执行不暂停 — 除非 BLOCKED 无法自解
- 执行中发现 design.md 有 gap → 停止并报告，不自行补全

---

## 与其他 skill 的关系

```
spec-explore（探索问题域）
  → spec-detail（业务 spec）
    → spec-design（design.md）
      → ★ spec-coding（本技能）
           ├── USE superpowers:writing-plans
           ├── USE superpowers:subagent-driven-development
           │     ├── USE superpowers:test-driven-development（Domain 层）
           │     ├── spec-reviewer（定制：对照 design.md）
           │     ├── code-quality-reviewer（superpowers 原生）
           │     └── ddd-rule-reviewer（本 skill 追加）
           └── USE superpowers:verification-before-completion
```

**前置**：`spec-design` 已输出 `design.md` 且人工 review 通过
**后续**：人工 code review → merge
