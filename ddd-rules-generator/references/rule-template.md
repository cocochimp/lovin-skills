# Rule 文件输出模板

SubAgent 提炼规则时，必须严格按照此模板格式输出完整的 Rule 文件内容。

## 模板结构

```markdown
---
description: {对该 Rule 触发条件的自然语言描述，让 Claude Code 知道何时应用}
globs:
  - "{glob pattern 1}"
  - "{glob pattern 2}"
---

<!-- auto-generated from: {源语雀文档 URL} -->

# DDD {Topic 中文名} 规则

## 核心原则

- {原则1：一句话，简洁有力，是可执行的指令}
- {原则2}
- {原则3}
- {原则4（可选）}
- {原则5（可选）}

## 编码约束

- DO: {具体的正面编码行为}
- DO: {具体的正面编码行为}
- DON'T: {具体的反面编码行为}
- DON'T: {具体的反面编码行为}
- DO: {更多约束...}

## 示例

```java
// 正确示例：{简短说明为什么这是正确的}
public class Order {
    private final OrderId id;
    private final List<OrderItem> items;

    public Money calculateTotal() {
        return items.stream()
            .map(OrderItem::subtotal)
            .reduce(Money.ZERO, Money::add);
    }
}

// 错误示例：{简短说明为什么这是错误的}
public class Order {
    private Long id;
    private List<Map<String, Object>> items;

    public BigDecimal calculateTotal() {
        // 直接操作基本类型，丢失了领域语义
        return items.stream()
            .map(item -> (BigDecimal) item.get("price"))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```
```

## 填写指南

### description 字段

用自然语言描述何时应用此规则。示例：
- "当编写或修改领域模型层代码时自动应用"
- "当涉及聚合根、实体、值对象的设计和实现时自动应用"
- "当编写应用服务层代码（命令处理、查询处理、事务编排）时自动应用"

### globs 字段

限定规则作用的文件范围。从 sources.yaml 中获取，如果未配置则默认：
```yaml
globs:
  - "src/**/*.java"
```

### 核心原则

- 3-5 条，每条一句话
- 必须是可执行的指令，不是概念定义
- 好的例子："聚合根是唯一的外部访问入口，禁止绕过聚合根直接操作内部实体"
- 坏的例子："聚合根是 DDD 中的一个重要概念，用于维护一致性边界"（这是概念解释，不是指令）

### 编码约束

- 每条以 DO 或 DON'T 开头
- 必须对应一个明确的、可在代码中验证的行为
- 好的例子："DON'T: 在领域实体中注入 Spring Bean 或 Repository"
- 坏的例子："DON'T: 写不好的代码"（太模糊）

### 示例

- 正确和错误示例成对出现
- 代码要足够具体，能看出规则的边界在哪里
- 用注释简短说明为什么对/错
- 如果源文档中有代码示例，优先使用源文档的
- 如果没有，根据规则原则构造典型场景
