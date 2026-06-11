---
name: spec-coding
description: '从 spec.md + design.md + V3 规范三源驱动生成代码。spec 定义行为（做什么），design 定义决策（用什么），V3 定义结构（怎么组织）。AI agent 自行读取三源、关联术语、推导实现。当用户说 "spec-coding"、"根据 design 生成代码"、"实现 design.md"、"coding" 时触发。'
---

# Spec Coding（三源接线器）

三源驱动代码生成（详见 CLAUDE.md §三源模型）：spec(行为) + design(决策) + V3 规范(结构)。

**核心理念**：不预提取内容塞给 agent，而是告诉 agent 去哪查什么。Agent 自己读、自己靠术语关联、自己推导实现。

**执行链路**：
```
Phase 1: USE superpowers:writing-plans → plan.md（注入层级序 + TDD 策略）
Phase 2: USE superpowers:subagent-driven-development → 逐任务执行
         + DDD Rule Review（第三阶段）
Phase 3: USE superpowers:verification-before-completion → 最终验收
```

---

## When to Use

- design.md 已存在且人工 review 通过
- 用户说 "spec-coding"、"实现 design.md"、"coding"

## When NOT to Use

- design.md 还没生成 → 先用 `spec-design`
- 业务 spec 还在讨论 → 先用 `spec-detail`
- 只改一两行代码 → 直接改

---

## 前置校验

- spec.md 存在且含 GIVEN-WHEN-THEN 场景
- design.md 存在且含工程接线表
- design.md 中 REUSE/EXTEND 类路径可在代码库中找到
- 目标工程路径可写

校验失败 → 停止，提示用户。

## 规则加载

**规则加载**：按 CLAUDE.md §规则加载 的 **spec-coding** 行执行。

**业务输入**（始终加载）：

| 文件 | 用途 |
|------|------|
| `specs/<变更>/spec.md` | 行为源 |
| `specs/<变更>/design.md` | 决策源 |

---

## Phase 1：USE superpowers:writing-plans

**REQUIRED SUB-SKILL:** Use `superpowers:writing-plans` 生成 Plan。

注入以下额外约束：

### 约束 1：DDD 层级依赖序

Plan 的 task 必须按以下顺序组织：

```
Phase A: Model 层（无依赖）— 错误码枚举、共享枚举
Phase B: Domain 层（依赖 model）— 异常类 → Value → DomainService 接口 → 实现
Phase C: Client 层（依赖 model）— DTO → AppService 接口
Phase D: Application 层（依赖 domain + client）— Assembler → Config → AppServiceImpl
Phase E: Adaptor 层（依赖 application + domain）— OutAdaptor 实现 → Converter
Phase F: Infrastructure 层（依赖 domain）— Repository 实现 → PO → Mapper
Phase G: Controller 层（依赖 client + application）
Phase H: 端到端测试
```

### 约束 2：分层 TDD 策略

| DDD 层 | Task 结构 | 理由 |
|--------|----------|------|
| Model / Client / Controller | 直接实现 + compile 验证 | 纯数据/透传，无行为 |
| **Domain** | **严格 TDD**（RED → GREEN → REFACTOR） | 业务逻辑核心，场景来自 spec GIVEN-WHEN-THEN |
| Application / Adaptor / Infrastructure | 先实现 + compile → 后补测试 | 编排/薄层 |

### 约束 3：三源数据映射

告知 writing-plans 代码内容从哪来：

| 代码元素 | 来源 | 说明 |
|---------|------|------|
| 业务逻辑（方法体） | spec.md 规则/公式/决策表/约束 | AI 自行翻译为代码 |
| 测试场景 + 断言值 | spec.md GIVEN-WHEN-THEN | 直接转测试 |
| 异常类名 | spec.md 边界条件 | spec 已定义 |
| 方法签名 | spec.md 领域对象 + V3 命名规则 | AI 推导 |
| 类路径、包名 | design.md §工程接线 | 直接取 |
| 技术选型（缓存/存储/锁） | design.md §技术选型 | 直接取 |
| 外部服务接口 | design.md §外部契约 | 直接取 |
| 基类、后缀、注解 | V3 ddd-quick-reference.md | 直接取 |
| 编排骨架 | spec.md 时序图 + V3 分层规则 | AI 推导 |

### 约束 4：Plan 保存路径

保存到 `specs/<变更名称>/plan.md`。

### Plan 自检追加项

- [ ] design.md 工程接线中每个 NEW 类都有对应 task
- [ ] spec.md 每条规则的 GIVEN-WHEN-THEN 场景都有对应测试 task
- [ ] 层级依赖序正确（无前向引用）
- [ ] design.md 每个技术选型都有消费它的 task（如缓存选型 → Application 编排 task）

---

## Phase 2：USE superpowers:subagent-driven-development

**REQUIRED SUB-SKILL:** Use `superpowers:subagent-driven-development` 执行 Plan。

### 定制 1：Implementer 三源接线

在 superpowers 的 implementer prompt 基础上，追加三源指引：

```
## 你的信息源（按需自行读取，靠术语关联）

### 行为源：specs/<变更>/spec.md
- 找与当前 task 相关的规则（靠领域对象名 / BR-XXX 编号匹配）
- 业务逻辑从规则的公式/决策表/约束声明翻译为代码
- 测试断言值从 GIVEN-WHEN-THEN 场景取
- 异常类名从边界条件取

### 决策源：specs/<变更>/design.md
- 找当前 task 涉及的技术选型（缓存/存储/外部服务）
- 外部契约看接口签名 + 异常映射
- 工程接线看类放哪个 module/package
- 非显然约束看 spec 没说但影响实现的规则

### 结构源：rules/（按 CLAUDE.md §规则加载 的 spec-coding 行加载）

## 关联方式

三源使用相同术语。按术语在三源间跳转，不需要显式映射表。

## Self-Check Before Reporting

- [ ] 业务逻辑与 spec 规则一致（公式/约束/边界都覆盖）
- [ ] 技术选型与 design 一致（用了 design 指定的缓存/存储/服务）
- [ ] 类在 design 工程接线指定的 module/package 下
- [ ] 符合 V3 分层规则（自行读取当前层 ddd-<layer>-layer.md 验证）
- [ ] 符合 coding-enforcement.md（自行读取全文验证）
```

### 定制 2：Domain 层严格 TDD

Domain 层 task 时，implementer 内部 **REQUIRED SUB-SKILL:** Use `superpowers:test-driven-development`。

TDD RED 步骤的输入 = spec.md 中对应规则的 GIVEN-WHEN-THEN 场景。

其他层不强制 TDD。

### 定制 3：Spec Reviewer 三源对照

superpowers 的 spec-reviewer 模板中 `[FULL TEXT of task requirements]` 替换为：

```
## What Was Requested

### 行为要求（from spec.md）
[该 task 涉及的 spec 规则 + 场景，靠领域对象名 / BR-XXX 匹配]

### 技术决策（from design.md）
[该 task 涉及的技术选型 + 外部契约 + 工程接线]

## Checks

1. 业务行为是否与 spec 规则一致？（公式/约束/边界条件）
2. 技术选型是否与 design 一致？（缓存/存储/外部服务）
3. 类路径是否与 design 工程接线一致？
4. 多余实现？（spec 没要求 + design 没决策的代码）
```

### 定制 4：追加第三阶段 — DDD Rule Review

在 code-quality-reviewer 通过之后，追加 DDD Rule Reviewer：

```
You are reviewing code for DDD architecture compliance AND coding enforcement rules.

## 规则来源（自行读取完整文件，逐条检查）

1. rules/coding-enforcement.md — 21 条硬约束，逐条对照代码
2. rules/ddd/ddd-<当前层>-layer.md — 当前层 DDD 完整规则
3. rules/practical/practical-<相关topic>.md — 当前层实践加严
4. rules/ddd-quick-reference.md — 分层 Bean 表（后缀 + 基类 + 依赖方向）
5. CLAUDE.md §跨阶段红旗 — 通用红线

## Code to Review

[实际代码 diff]

## Report Format

- ✅ Compliant — 每个规则文件逐条通过
- ❌ Violations: [规则来源 + 条款编号 + file:line + 修复建议]
```

### 执行序

```
Implementer → Spec Review（三源对照）→ Code Quality Review（superpowers 原生）→ DDD Rule Review
```

三阶段全 ✅ 才 mark task complete。

### 规则注入策略

```
Implementer = 三源指引（告诉去哪读什么）+ Self-Check 清单
              agent 自行按 CLAUDE.md §规则加载 读取对应规则文件

DDD Rule Reviewer = 指向规则文件（agent 自行读取完整版逐条审查）
```

Implementer 按指引自主读取（写代码），Reviewer 读完整版逐条审（严格审查）。

---

## Phase 3：最终验收

**REQUIRED SUB-SKILL:** Use `superpowers:verification-before-completion`。

追加验证：

### 追加 1：Spec 场景覆盖矩阵

遍历 spec.md 每条规则下的**每个 GIVEN-WHEN-THEN 场景**：

```markdown
## Spec Compliance Matrix

| spec 规则 | 场景 | 测试类.方法 | 状态 |
|-----------|------|-----------|------|
| BR-Item-001 | 单条规则命中 | BuildItemOfferDomainServiceTest.xxx | ✅ |
| BR-Item-001 | 多条规则命中按优先级 | ... | ✅ |
| BR-Item-002 | 跨币种三层加价 | ... | ✅ |
| ... | ... | ... | ✅/❌ |
```

全部 ✅ 才通过。有 ❌ → 回到 Phase 2。

### 追加 2：工程接线验证

对照 design.md 工程接线表，验证每个类的实际路径：

```markdown
| 角色 | design 指定 module | 实际路径 | 状态 |
|------|-------------------|---------|------|
| BuildItemOfferDomainService | item-domain | item-domain/src/.../... | ✅ |
```

### 追加 3：全量编译与测试

```bash
mvn compile -pl <all-affected-modules>
mvn test -pl <all-affected-modules>
```

### 最终报告

```
## Spec Coding Complete: <变更名称>

**Plan:** specs/<变更>/plan.md
**Tasks:** N/N complete ✅
**Compile:** PASS ✅
**Tests:** M tests, all PASS ✅
**Spec Coverage:** K/K scenarios covered ✅
**DDD Compliance:** Clean ✅
**Wiring:** All classes match design ✅

**Next:** 人工 code review → merge
```

---

## 约束

**三源优先级**：

| 冲突场景 | 优先 | 理由 |
|---------|------|------|
| spec 规则 vs AI 自行发挥 | spec | 行为由 spec 定义，AI 不发明需求 |
| design 选型 vs AI 认为更好的方案 | design | 技术决策已经人工 review 过 |
| V3 规范 vs 业界通用 DDD | V3 | 项目约定 > 通用模式 |
| coding-enforcement vs ai-guidelines | enforcement | 硬约束 > 柔性指导 |

**红线**：
- 禁止 agent 发明三源中不存在的类/方法/架构概念
- 禁止跳过任何 Review 阶段
- 禁止在所有测试通过前声明完成
- 执行中发现 spec 或 design 有 gap → 停止并报告，不自行补全
- 连续执行不暂停 — 除非 BLOCKED 无法自解

---

## 与其他 skill 的关系

```
spec-explore → spec-detail → spec-design → ★ spec-coding
                  ↓               ↓              ↓
              spec.md(行为)   design.md(决策)   代码
                                                 ↑
                                          V3 规范(结构)

spec-coding 内部：
  ├── USE superpowers:writing-plans
  ├── USE superpowers:subagent-driven-development
  │     ├── USE superpowers:test-driven-development（Domain 层）
  │     ├── spec-reviewer（三源对照）
  │     ├── code-quality-reviewer（superpowers 原生）
  │     └── ddd-rule-reviewer（DDD + coding-enforcement）
  └── USE superpowers:verification-before-completion
```
