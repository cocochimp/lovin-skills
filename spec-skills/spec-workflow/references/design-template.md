# 技术设计模板

当需要创建或更新 `design.md` 时，使用以下模板。文件位于 `specs/<feature>/design.md`。

## 定位

**技术蓝图**——在 V3 架构规范下，将业务 Spec 落地为可编码的技术方案。让熟悉 V3 规范的工程师能直接据此开始 coding，但不能让不熟悉 V3 的人照着抄代码。

| 该有的 | 不该有的 |
|--------|----------|
| 模块/包结构 | Java 代码块（含 `@Value @Builder` 注解的类） |
| 接口签名表（方法名+输入+输出+职责一句话） | 方法体伪代码（规则/算法除外） |
| 数据模型字段表（PO/DTO） | `try/catch` 异常处理器代码 |
| 流程图/时序图（PlantUML/Mermaid） | Controller 方法体 |
| 状态机 + 实现策略 | 完整的 Spring 配置代码 |
| 错误码映射表 | Lombok/MapStruct 注解示例 |
| 缓存/性能/监控决策 | |
| V3 规范对应说明 | |

## 前置条件

产出 design.md 前 **必须** 读取以下规范：

1. `docs/rules/ddd/ddd-architecture-overview.md` — 六层架构 + 四种开发模式 + 分层 Bean 模型表
2. `docs/rules/practical/practical-orchestration.md` — Application 编排加严
3. 当前层相关的 `docs/rules/ddd/ddd-<layer>-layer.md`
4. `docs/rules/practical/practical-naming-format.md` — 命名规范
5. `docs/rules/practical/practical-error-code.md` — 错误码规范

未读规范就动手 = 违规。

## 模板格式

```markdown
# 技术设计：<功能/域名称>

## 目标

本设计对应以下业务规格：

| 类型 | 编号 | 说明 |
|------|------|------|
| 业务规则 | BR-XXX-001, BR-XXX-002, ... | <概要> |
| 业务场景 | SC-XXX-001, SC-XXX-002, ... | <概要> |
| 约束 | CON-001, ... | <概要> |

## 开发模式

<!-- 标注 V3 四种开发模式，每个域/功能一行 -->

| 域/功能 | 开发模式 | 说明 |
|---------|----------|------|
| {域名} | 写模式 / 读模式 / 纯计算 / 规则+计算 | {选择原因} |

## 模块与包结构

<!-- 展示 Maven 模块和 Java 包的组织方式 -->

```
<app-name>/
├── <app>-client/
│   └── src/main/java/com/xxx/
│       ├── api/          # HSF 接口
│       ├── dto/           # DTO
│       └── enums/         # 枚举
├── <app>-model/
│   └── src/main/java/com/xxx/
│       └── model/         # 跨层共享模型
├── <app>-application/
│   └── src/main/java/com/xxx/
│       ├── cmd/           # ApplicationCmdService
│       ├── query/         # ApplicationQueryService
│       └── assembler/     # Assembler（MapStruct）
├── <app>-domain/
│   └── src/main/java/com/xxx/
│       ├── aggregate/     # 聚合根
│       ├── entity/        # 实体
│       ├── value/         # 值对象
│       ├── service/       # DomainService
│       └── repository/    # Repository 接口
├── <app>-adaptor/
│   └── src/main/java/com/xxx/
│       ├── web/           # Controller
│       └── hsf/           # HSF Provider
└── <app>-infrastructure/
    └── src/main/java/com/xxx/
        ├── repository/    # Repository 实现
        ├── gateway/       # 外部服务网关
        ├── converter/     # Converter（MapStruct）
        └── po/            # PO
```

## 接口签名设计

<!-- 按层分组，每个接口一行。不写方法体，不写注解 -->

### Client 层

| 接口/类 | 方法 | 输入 | 输出 | 职责 |
|---------|------|------|------|------|
| XxxFacade | methodName | InputDTO | OutputDTO | 一句话描述 |

### Application 层

| 类 | 方法 | 输入 | 输出 | 职责 |
|----|------|------|------|------|
| XxxApplicationCmdService | methodName | Param | Result | 一句话描述 |
| XxxApplicationQueryService | methodName | Param | Result | 一句话描述 |

### Domain 层

| 类 | 方法 | 输入 | 输出 | 职责 |
|----|------|------|------|------|
| XxxAggregate | methodName | Param | void | 一句话描述 |
| XxxDomainService | methodName | Param | Result | 一句话描述 |

### Adaptor 层

| 类 | 方法 | 输入 | 输出 | 职责 |
|----|------|------|------|------|
| XxxController | methodName | RequestDTO | ResponseDTO | 一句话描述 |

### Infrastructure 层

| 类 | 方法 | 输入 | 输出 | 职责 |
|----|------|------|------|------|
| XxxRepositoryImpl | methodName | PO/Aggregate | void/Aggregate | 一句话描述 |
| XxxGateway | methodName | Param | Result | 一句话描述 |

## 数据模型

<!-- PO 和 DTO 的字段定义表 -->

### <PO/DTO 名称>

| 字段 | 类型 | 数据库列（PO）/ 序列化名（DTO） | 说明 |
|------|------|-------------------------------|------|
| field1 | Type | column_name / fieldName | 说明 |

## 流程设计

<!-- 核心流程的时序图或流程图，用 PlantUML 或 Mermaid -->

### <流程名称>

@startuml
participant "Adaptor" as A
participant "Application" as App
participant "Domain" as D
participant "Infrastructure" as I

A -> App: 请求描述
App -> D: 领域操作
D -> I: 持久化/外部调用
I --> D: 结果
D --> App: 领域结果
App --> A: 响应
@enduml

## 状态机

<!-- 补充 spec 中状态机的实现策略 -->

### <聚合根名> 状态机实现

**状态枚举**：XxxStatusEnum

**流转规则实现策略**：
- 状态校验放在聚合根方法内（前置条件检查）
- 状态变更由聚合根方法负责（内聚）
- 非法流转抛出业务异常，错误码见错误码映射表

## 错误码映射

<!-- 业务规则 → 错误码的映射关系 -->

| 业务规则 | 错误码 | 错误消息 | HTTP Status | 说明 |
|----------|--------|----------|-------------|------|
| BR-XXX-001 | ERROR_CODE | 用户可读消息 | 400/500 | 触发条件 |

## 缓存与性能

<!-- 缓存策略、性能优化决策 -->

| 场景 | 策略 | Key 设计 | TTL | 失效方式 |
|------|------|----------|-----|----------|
| {场景} | 本地缓存/Tair/不缓存 | {key 模式} | {时间} | {主动/被动} |

## V3 规范对应

<!-- 说明本设计如何与 V3 规范对齐 -->

| V3 规范要求 | 本设计对应 | 说明 |
|-------------|-----------|------|
| 六层分层 | 见模块与包结构 | client/model/application/domain/adaptor/infrastructure |
| CQRS 分离 | ApplicationCmdService + ApplicationQueryService | 写读分离 |
| 复制类白名单 | Assembler(application) + Converter(infrastructure) | 均用 MapStruct |
| 分层 Bean 后缀 | 见接口签名设计各层 | Aggregate/Entity/Value/Param/Result/DTO/PO |
```

## 好的示例

```markdown
### Application 层

| 类 | 方法 | 输入 | 输出 | 职责 |
|----|------|------|------|------|
| BuyOrderApplicationCmdService | createOrder | CreateBuyOrderParam | CreateBuyOrderResult | 编排创建采购单：参数校验 → 调用聚合根创建 → 持久化 → 发送领域事件 |
| BuyOrderApplicationCmdService | cancelOrder | CancelBuyOrderParam | void | 编排取消采购单：加载聚合根 → 调用取消方法 → 持久化 → 触发退款（如需） |
```

## 坏的示例

```markdown
### Application 层

```java
@Service
public class BuyOrderApplicationCmdService {

    @Autowired
    private BuyOrderRepository repository;

    @Transactional
    public CreateBuyOrderResult createOrder(CreateBuyOrderParam param) {
        BuyOrderAggregate order = new BuyOrderAggregate();
        order.createOrder(param);
        repository.save(order);
        return new CreateBuyOrderResult(order.getBuyOrderId());
    }
}
```

**问题**：出现了完整 Java 代码（含注解、依赖注入、方法体、事务控制）。技术设计只需要接口签名表，不需要方法体实现。
