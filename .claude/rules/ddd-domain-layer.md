---
description: 当编写或修改领域层代码（领域服务、仓储接口、领域事件）时自动应用
globs:
  - "src/**/domain/**/*.java"
---

<!-- auto-generated from: https://aliyuque.antfin.com/fliggy-flight/flightsaas/hh59bpw9m1i210um -->

# DDD Domain Layer 规则

## 核心原则

- 领域层只包含纯业务代码，禁止引用技术框架或第三方库（Spring 注解除外）
- 禁止在领域层使用任何设计模式（策略、工厂、模板方法、责任链等），业务分支用 if/else 直接处理
- DomainService 禁止直接依赖 Adaptor，需要外部数据时通过 Param 中的函数式接口懒加载
- 聚合根是唯一的业务入口，外部只能通过聚合根方法访问内部实体和值对象
- 所有异常必须在 DomainService 内捕获，通过 ResultDO 返回，禁止向上层抛出未处理异常

## 编码约束

- DO: domain 包结构严格按 `{业务名}/model/aggregate|entity|value|param|result`、`service/`、`repository/` 组织
- DO: Param 类继承 `BaseParam`，命名为 `{方法名}Param`
- DO: Result 类继承 `BaseResult`，命名为 `{方法名}Result`，允许充血方法
- DO: Repository 接口继承 `AggregateRepository`，定义在 domain 层，实现在 infrastructure 层
- DO: 聚合根继承 `BaseAggregate`，实体继承 `BaseEntity`，值对象继承 `BaseValue`
- DO: Entity 属性必须使用 `Field<T>`、`FieldSet<T>`、`FieldList<T>` 类型
- DO: 值对象设计为不可变，只包含计算类和判断类方法
- DO: DomainService 写模式标准流程：获取锁 -> 加载聚合根 -> 执行业务逻辑 -> 持久化 -> 释放锁
- DO: 聚合根需要序列化时，计算/查找/判断类方法加 `@JSONField(serialize = false)`
- DON'T: 禁止在 domain 层出现 Utils、常量类、配置类等非领域概念代码
- DON'T: 禁止 DomainService 调用其他领域服务、其他领域聚合根、应用层服务或基础设施层实现
- DON'T: 禁止 Repository 依赖 Adaptor 或调用第三方外部服务
- DON'T: 禁止在聚合根中定义技术意义的通用 update 方法，方法名必须体现业务意图
- DON'T: 禁止将规则匹配或计算逻辑泄露到 DomainService 层，必须内聚在聚合根/实体中

## 示例

```java
// 正确示例：业务逻辑直接用 if/else，不引入设计模式
public FeeCalculateResult calculateFee(FeeCalculateParam param) {
    if (DomesticIntlEnum.DOMESTIC.equals(param.getDomesticIntl())) {
        return calculateDomesticFee(param);
    } else {
        return calculateInternationalFee(param);
    }
}

// 错误示例：引入策略模式，业务逻辑分散
public FeeCalculateResult calculateFee(FeeCalculateParam param) {
    FeeStrategy strategy = feeStrategyFactory.getStrategy(param.getDomesticIntl());
    return strategy.calculate(param);
}
```

```java
// 正确示例：DomainService 通过 Param 中的函数式接口获取外部数据
@FunctionalInterface
public interface ExchangeRateProvider {
    BigDecimal getExchangeRate(String currency);
}

@Data
@EqualsAndHashCode(callSuper = true)
public class CalculateSalePriceParam extends BaseParam {
    private List<ProductItem> productItems;
    private ExchangeRateProvider exchangeRateProvider; // Application 层注入实现
}

// 错误示例：DomainService 直接依赖 Adaptor
@Service
public class SalePriceDomainServiceImpl implements SalePriceDomainService {
    @Autowired
    private ExchangeRateAdaptor exchangeRateAdaptor; // 禁止！
}
```

```java
// 正确示例：聚合根方法体现业务意图
public void cancelOrder(CancelOrderParam param) {
    if (param == null) {
        throw new AggregateException("参数不能为空");
    }
    if (!this.status.canCancel()) {
        throw new AggregateException("当前状态不可取消");
    }
    this.status = OrderStatus.CANCELLED;
}

// 错误示例：聚合根暴露通用 setter 式方法
public void updateStatus(OrderStatus status) {
    this.status = status; // 无业务校验，无业务语义
}
```

```java
// 正确示例：Entity 使用 Field<T> 类型
@Data
@EqualsAndHashCode(callSuper = true)
public class OrderItemEntity extends BaseEntity<Long> {
    private Field<Long> orderId;
    private Field<String> productName;
    private Field<Long> price;

    public void updatePrice(Long newPrice) {
        if (newPrice == null || newPrice <= 0) {
            throw new AggregateException("价格必须大于0");
        }
        this.price = Field.of(newPrice);
    }
}

// 错误示例：Entity 使用普通类型
public class OrderItemEntity extends BaseEntity<Long> {
    private Long orderId;       // 应使用 Field<Long>
    private String productName; // 应使用 Field<String>
}
```

```java
// 正确示例：DomainService 完整写模式模板
@Slf4j
@Service
public class OrderDomainServiceImpl implements OrderDomainService {
    @Resource
    private OrderRepository orderRepository;

    @Override
    public ResultDO<Void> confirmPayment(ConfirmPaymentParam param) {
        LevelLock levelLock = orderRepository.buildLock("order:confirmPayment:" + param.getOrderId());
        try {
            if (!levelLock.tryLock()) {
                return ResultDO.buildFailResult("LOCK_FAIL", "获取锁失败");
            }
            ResultDO<OrderAggregate> queryResult = orderRepository.query(
                new OrderQuery(param.getOrderId()));
            if (!queryResult.isSuccess()) {
                return ResultDO.buildFailResult(queryResult.getMsg());
            }
            OrderAggregate orderAggregate = queryResult.getData();
            if (orderAggregate == null) {
                return ResultDO.buildFailResult("ORDER_NOT_FOUND", "订单不存在");
            }
            orderAggregate.confirmPayment(param);
            orderRepository.save(orderAggregate);
        } catch (BizException e) {
            log.error("确认支付业务异常, param: {}", param, e);
            return ResultDO.buildFailResult(e.getCode(), e.getMsg());
        } catch (Throwable e) {
            log.error("确认支付系统异常, param: {}", param, e);
            return ResultDO.buildFailResult("SYSTEM_ERROR", "系统异常");
        } finally {
            levelLock.unlock();
        }
        return ResultDO.buildSuccessResult(null);
    }
}
```
