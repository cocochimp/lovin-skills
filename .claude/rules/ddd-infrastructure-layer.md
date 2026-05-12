---
description: 当编写或修改基础设施层代码（仓储实现、数据访问、外部服务集成）时自动应用
globs:
  - "src/**/infrastructure/**/*.java"
  - "src/**/infra/**/*.java"
---

<!-- auto-generated from: https://aliyuque.antfin.com/fliggy-flight/flightsaas/wh4gwuglql04go8b -->

# DDD Infrastructure Layer 规则

## 核心原则

1. Infrastructure 层是纯技术实现层，只负责"存"和"取"，禁止包含任何业务逻辑
2. 实现 domain 层定义的 Repository 接口，对 domain 层完全屏蔽技术细节（数据库、缓存、消息队列）
3. 所有数据库操作异常必须捕获并转换为 ResultDO 返回，禁止向上层抛出技术异常
4. PO 仅在 Infrastructure 层内部流转，禁止暴露给 domain/application/client 层
5. Converter 只做字段映射，禁止包含业务判断逻辑

## 编码约束

- DO: Repository 实现类使用 `@Component` 注解，命名为 `{业务名}RepositoryImpl`
- DO: 包结构按业务域划分：`infrastructure/{业务名}/repository/`、`mysql/po/`、`mysql/mapper/`、`converter/`
- DO: save 方法通过判断聚合根 ID 是否为 null 区分 insert 和 update
- DO: Converter 方法为 static，入参为 null 时直接返回 null
- DO: Mapper 方法参数和返回值只能使用 PO 或基础数据类型
- DO: 枚举转换在 Converter 中完成：PO 存 Integer，聚合根用领域枚举
- DO: 查询未找到数据时返回 `ResultDO.buildSuccessResult(null)` 或空列表，不返回失败
- DO: 日志记录包含关键业务参数
- DON'T: 禁止依赖 application 层、client 层或其他业务系统的二方包
- DON'T: 禁止调用 HSF、HTTP Client 等外部服务（只允许中间件：MyBatis、Redis、Tair、RocketMQ 等）
- DON'T: 禁止在 Converter 中编写 if/else 业务判断
- DON'T: 禁止 PO 中包含业务方法，PO 只有字段和 getter/setter
- DON'T: 禁止 Mapper 被 domain 层或 application 层直接调用
- DON'T: 禁止 Mapper 方法使用聚合根或 DTO 作为参数/返回值
- DON'T: 禁止直接向上层抛出 SQLException 等技术异常

## 示例

```java
// 正确示例：Repository 实现类结构
@Slf4j
@Component
public class OrderRepositoryImpl implements OrderRepository {

    @Autowired
    private OrderMapper orderMapper;

    @Override
    public ResultDO<Void> save(OrderAggregate aggregate) {
        try {
            OrderPO po = OrderConverter.toPO(aggregate);
            if (aggregate.getId() == null) {
                orderMapper.insert(po);
                aggregate.setId(po.getId());
            } else {
                int rows = orderMapper.updateById(po);
                if (rows == 0) {
                    return ResultDO.buildFailResult("UPDATE_FAIL", "更新失败");
                }
            }
            return ResultDO.buildSuccessResult(null);
        } catch (Exception e) {
            log.error("保存订单失败, aggregateId: {}", aggregate.getId(), e);
            return ResultDO.buildFailResult("DB_SAVE_ERROR", "保存订单数据异常");
        }
    }

    @Override
    public ResultDO<OrderAggregate> query(OrderQuery query) {
        try {
            OrderPO po = orderMapper.selectById(query.getId());
            if (po == null) {
                return ResultDO.buildSuccessResult(null);
            }
            return ResultDO.buildSuccessResult(OrderConverter.toAggregate(po));
        } catch (Exception e) {
            log.error("查询订单失败, query: {}", query, e);
            return ResultDO.buildFailResult("DB_QUERY_ERROR", "查询订单数据异常");
        }
    }
}
```

```java
// 正确示例：Converter 纯字段映射
public class OrderConverter {

    public static OrderAggregate toAggregate(OrderPO po) {
        if (po == null) {
            return null;
        }
        OrderAggregate aggregate = new OrderAggregate();
        aggregate.setId(po.getId());
        aggregate.setOrderNo(po.getOrderNo());
        aggregate.setStatus(OrderStatusEnum.getByCode(po.getOrderStatus()));
        return aggregate;
    }

    public static OrderPO toPO(OrderAggregate aggregate) {
        if (aggregate == null) {
            return null;
        }
        OrderPO po = new OrderPO();
        po.setId(aggregate.getId());
        po.setOrderNo(aggregate.getOrderNo());
        if (aggregate.getStatus() != null) {
            po.setOrderStatus(aggregate.getStatus().getCode());
        }
        return po;
    }
}
```

```java
// 错误示例：Converter 中包含业务逻辑
public class OrderConverter {

    public static OrderPO toPO(OrderAggregate aggregate) {
        OrderPO po = new OrderPO();
        po.setOrderNo(aggregate.getOrderNo());
        // 禁止：这是业务逻辑
        if (aggregate.getAmount() > 10000) {
            po.setOrderLevel("VIP");
        }
        return po;
    }
}
```

```java
// 错误示例：Mapper 被 application 层直接调用
@Service
public class OrderAppService {
    @Autowired
    private OrderMapper orderMapper; // 禁止！应通过 Repository 接口

    public void getOrder(Long id) {
        OrderPO po = orderMapper.selectById(id);
    }
}
```
