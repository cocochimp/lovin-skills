---
description: 当编写或修改应用层代码（应用服务、命令处理、查询处理、事务编排）时自动应用
globs:
  - "src/**/application/**/*.java"
  - "src/**/app/**/*.java"
---

<!-- auto-generated from: https://aliyuque.antfin.com/fliggy-flight/flightsaas/ztqfcugef8ska5xq -->

# DDD Application Layer 规则

## 核心原则

1. **Application 层只做场景编排，禁止包含核心业务逻辑** — 业务规则、状态变更、计算公式必须下沉到 DomainService 或聚合根
2. **读写分离（CQRS）** — 写操作用 `{聚合根名}AppService`（继承 `ApplicationCmdService`），读操作用 `{聚合根名}QueryAppService`（继承 `ApplicationQueryService`），Command 层禁止调用 Query 层接口
3. **参数自校验，错误码不外抛** — 入参必须是 RequestDTO 且通过 `requestDTO.check()` 自校验；返回值统一用 `ResultDO<T>` 封装，禁止向调用方抛异常
4. **依赖方向单向** — 只允许依赖 domain、client、model 模块和无 IO 的 Utils；禁止依赖其他业务域二方包和中间件

## 编码约束

- DO: 方法命名使用业务动词（`createOrder`、`confirmPayment`、`queryOrderList`）
- DO: 通过 Assembler 完成 DTO 与领域对象的转换
- DO: 通过 Adaptor 访问外部服务，通过 Repository 访问数据库
- DO: 对外暴露的 DTO 放 `client` 模块，内部流转的 DTO 放 `application/{业务名}/model/`
- DO: 纯计算/规则计算场景：一个计算方法一个类，以动词命名
- DO: 每个 AppService 方法用 try-catch 包裹，catch 中记录日志并返回 `ResultDO.buildFailResult`
- DON'T: 禁止在 AppService 中编写参数校验逻辑（校验必须在 RequestDTO.check() 中）
- DON'T: 禁止使用原始类型、Map 作为入参
- DON'T: 禁止方法命名使用技术动词（`save`、`update`、`insert`、`delete`）
- DON'T: 禁止直接访问数据库或直接调用外部 RPC/HTTP
- DON'T: 禁止在 Application 层放置业务计算公式、规则匹配、聚合根状态变更逻辑
- DON'T: 禁止 Command 层调用 Query 层接口

## 示例

```java
// 正确示例：场景编排 + 参数自校验 + ResultDO 返回
@Slf4j
@Service
public class OrderAppServiceImpl implements OrderAppService {

    @Autowired
    private OrderDomainService orderDomainService;
    @Autowired
    private InventoryAdaptor inventoryAdaptor;

    @Override
    public ResultDO<CreateOrderResponseDTO> createOrderOnline(CreateOrderOnlineRequestDTO requestDTO) {
        try {
            // 参数自校验
            ResultDO checkResult = requestDTO.check();
            if (!checkResult.isSuccess()) {
                return ResultDO.buildFailResult(checkResult.getCode(), checkResult.getMsg());
            }

            // 通过 Adaptor 校验前置条件
            ResultDO<InventoryCheckResponseDTO> inventoryResult = inventoryAdaptor.checkInventory(
                requestDTO.getProductId(), requestDTO.getQuantity());
            if (!inventoryResult.isSuccess()) {
                return ResultDO.buildFailResult(inventoryResult.getCode(), inventoryResult.getMsg());
            }

            // Assembler 转换 + 调用领域服务
            CreateOrderParam param = OrderAssembler.toParam(requestDTO);
            ResultDO<OrderAggregate> domainResult = orderDomainService.createOrder(param);
            if (!domainResult.isSuccess()) {
                return ResultDO.buildFailResult(domainResult.getCode(), domainResult.getMsg());
            }

            return ResultDO.buildSuccessResult(OrderAssembler.toResponseDTO(domainResult.getData()));
        } catch (Exception e) {
            log.error("线上创建订单系统异常, requestDTO: {}", requestDTO, e);
            return ResultDO.buildFailResult("SYSTEM_ERROR", "系统异常");
        }
    }
}
```

```java
// 错误示例：在 Application 层写业务逻辑 + 直接抛异常 + 技术动词命名
@Service
public class OrderAppServiceImpl implements OrderAppService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // ❌ 方法名用技术动词
    public OrderDTO saveOrder(String productId, int quantity, BigDecimal price) {
        // ❌ 在 AppService 中写参数校验
        if (productId == null || productId.isEmpty()) {
            throw new IllegalArgumentException("商品ID不能为空");
        }

        // ❌ 业务计算逻辑应在领域层
        BigDecimal discount = BigDecimal.ONE;
        if (quantity > 10) {
            discount = new BigDecimal("0.9");
        }
        BigDecimal totalPrice = price.multiply(BigDecimal.valueOf(quantity)).multiply(discount);

        // ❌ 直接操作数据库
        jdbcTemplate.update("INSERT INTO orders ...", productId, quantity, totalPrice);

        // ❌ 直接抛异常
        if (totalPrice.compareTo(new BigDecimal("100000")) > 0) {
            throw new RuntimeException("订单金额超限");
        }

        return new OrderDTO();
    }
}
```

```java
// 正确示例：读模式查询服务
@Slf4j
@Service
public class OrderQueryAppServiceImpl implements OrderQueryAppService {

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private LogisticsAdaptor logisticsAdaptor;

    @Override
    public ResultDO<GetOrderDetailResponseDTO> getOrderDetail(GetOrderDetailRequestDTO requestDTO) {
        try {
            ResultDO checkResult = requestDTO.check();
            if (!checkResult.isSuccess()) {
                return ResultDO.buildFailResult(checkResult.getCode(), checkResult.getMsg());
            }

            ResultDO<OrderAggregate> queryResult = orderRepository.findById(requestDTO.getOrderId());
            if (!queryResult.isSuccess()) {
                return ResultDO.buildFailResult(queryResult.getMsg());
            }

            ResultDO<LogisticsInfoResponseDTO> logisticsResult = logisticsAdaptor.queryLogistics(
                queryResult.getData().getLogisticsNo());

            GetOrderDetailResponseDTO responseDTO = OrderAssembler.toGetOrderDetailResponseDTO(
                queryResult.getData(), logisticsResult.getData());
            return ResultDO.buildSuccessResult(responseDTO);
        } catch (Exception e) {
            log.error("获取订单详情失败, requestDTO: {}", requestDTO, e);
            return ResultDO.buildFailResult("SYSTEM_ERROR", "系统异常");
        }
    }
}
```

## 包结构参考

```
application/
├── {业务名}/
│   ├── scenario/          # AppService 实现类
│   └── assembler/         # DTO ↔ 领域对象转换
```
