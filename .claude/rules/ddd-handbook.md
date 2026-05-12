---
description: DDD 整体架构约束和跨层通用规则，编写任何 Java 代码时自动应用
globs:
  - "src/**/*.java"
---

<!-- auto-generated from: https://aliyuque.antfin.com/fliggy-flight/flightsaas/hhhmyshb8ud2vw0q -->

# DDD Handbook 规则

## 核心原则

1. **依赖方向自外向内，禁止反向依赖**：inAdaptor → application → domain → repository 接口；外层依赖内层，内层不得引用外层
2. **领域层纯净无技术污染**：domain 包内禁止引入任何技术框架注解或第三方库，技术实现通过接口由 infrastructure 层提供
3. **client 层自包含，禁止依赖 model 层**：对外暴露的 RPC 接口定义的 DTO 必须自包含所有字段定义，不得引用内部 model 模块的类
4. **按业务领域划分包，而非按技术职责**：每一层内部按 `{业务名}/` 组织子包，禁止按技术类型横切（如 `utils/`、`common/`）
5. **根据场景选择开发模式**：写模式、读模式、规则+计算模式、纯计算模式，不同模式有不同的调用链，不可混用

## 编码约束

- DO: 将业务逻辑放在聚合根/实体方法中，而非 Service 或 Util 类
- DO: Repository 接口定义在 domain 层，实现放在 infrastructure 层
- DO: Adaptor 接口定义在 application 层，实现放在 adaptor/output 层
- DO: 聚合根的属性类型只能是实体（Entity）或值对象（Value Object），不允许基础数据类型直接作为聚合根字段
- DO: 参数对象命名以 `Param` 结尾，返回对象以 `Result` 结尾，DTO 以 `DTO` 结尾
- DO: domain 包下只允许存在：`model/`（aggregate、entity、value、param、result）、`service/`、`repository/`
- DON'T: 禁止在 domain 层创建 `utils/`、`helper/`、`common/` 等非领域概念包
- DON'T: 禁止 Repository 调用 Adaptor（外部服务由 application 层通过 Adaptor 调用）
- DON'T: 禁止在 domain 层使用 `@Autowired`、`@Service`、`@Component` 等 Spring 注解
- DON'T: 禁止在聚合根/实体外部通过 getter 获取内部状态后做业务判断（破坏封装性）
- DON'T: 禁止纯计算模式使用 infrastructure 层（无持久化需求时不引入 Repository）
- DON'T: 禁止 client 模块的 DTO 类 import `model` 模块的任何类

## 示例

```java
// 正确示例：业务逻辑内聚在聚合根中
public class OrderAggregate {
    private OrderEntity orderEntity;
    private List<PassengerEntity> passengers;

    public void cancel(CancelOrderParam param) {
        orderEntity.validateCancellable();
        orderEntity.markCancelled(param.getReason());
        passengers.forEach(PassengerEntity::releaseTicket);
    }
}

// 错误示例：业务逻辑泄漏到 Service，聚合根沦为数据袋
public class OrderDomainServiceImpl implements OrderDomainService {
    public void cancel(OrderAggregate order, CancelOrderParam param) {
        if (order.getOrderEntity().getStatus().equals("PAID")) {
            order.getOrderEntity().setStatus("CANCELLED");
            order.getOrderEntity().setCancelReason(param.getReason());
        }
        for (PassengerEntity p : order.getPassengers()) {
            p.setTicketStatus("RELEASED");
        }
    }
}
```

```java
// 正确示例：聚合根属性为实体或值对象
public class SubsidyRuleAggregate {
    private SubsidyRuleEntity rule;
    private ConditionValue condition;
    private AmountValue subsidyAmount;
}

// 错误示例：聚合根中出现基础数据类型
public class SubsidyRuleAggregate {
    private SubsidyRuleEntity rule;
    private Boolean enableSwitch;  // 禁止：应收敛到实体中
    private String controlFlag;    // 禁止：应建模为值对象
    private Long maxAmount;        // 禁止：应封装为值对象
}
```

```java
// 正确示例：领域层纯净，技术实现在 infrastructure
// domain 层（接口）
public interface OrderRepository {
    OrderAggregate query(Long orderId);
    void save(OrderAggregate order);
}

// infrastructure 层（实现）
@Repository
public class OrderRepositoryImpl implements OrderRepository {
    @Autowired
    private OrderMapper orderMapper;

    @Override
    public OrderAggregate query(Long orderId) {
        OrderPO po = orderMapper.selectById(orderId);
        return OrderConverter.toAggregate(po);
    }
}

// 错误示例：domain 层引入技术框架
package com.example.domain.order.service;

import org.springframework.beans.factory.annotation.Autowired; // 禁止
import org.springframework.stereotype.Service;                  // 禁止

@Service
public class OrderDomainServiceImpl implements OrderDomainService {
    @Autowired
    private OrderMapper orderMapper; // 禁止直接依赖数据访问
}
```
