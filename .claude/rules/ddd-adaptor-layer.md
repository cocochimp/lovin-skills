---
description: 当编写或修改适配器层代码（Controller、消息监听、定时任务、外部服务适配）时自动应用
globs:
  - "src/**/adaptor/**/*.java"
  - "src/**/adapter/**/*.java"
  - "src/**/controller/**/*.java"
---

<!-- auto-generated from: https://aliyuque.antfin.com/fliggy-flight/flightsaas/lgelqggoztdff6os -->

# DDD Adaptor Layer 规则

## 核心原则

1. **Adaptor 是防腐层**：隔离外部技术细节（第三方服务、中间件、框架协议），禁止污染领域层和应用层
2. **接口定义基于调用方业务需要**：Adaptor 接口的方法签名、参数、返回值必须反映 Application 层的业务语义，而非外部服务的技术细节
3. **只做协议转换，不做业务逻辑**：Adaptor 实现类仅负责数据格式转换和外部调用，业务判断一律上移到 Application 或 Domain 层
4. **Input/Output 职责分离**：Input Adaptor 接收外部请求并调用 Application 层；Output Adaptor 封装对外部服务的调用，实现 Application 层定义的接口

## 编码约束

- DO: Input Adaptor（Controller/MQ Consumer/ScheduleTask/HSF）只做参数转换 + 调用 Application 层服务
- DO: Output Adaptor 接口定义在 Application 模块，实现类放在 Adaptor 层
- DO: Output Adaptor 返回值统一使用 `ResultDO<T>`，泛型为 Application 需要的 ResponseDTO
- DO: 参数确定且稳定时优先使用基础数据类型，提高复用性
- DO: 参数较多时直接复用 Application 层的 RequestDTO
- DO: 使用 Converter 类处理外部响应到内部 DTO 的转换
- DO: 按业务领域划分包结构：`adaptor/{业务名}/input/`、`adaptor/{业务名}/output/`
- DO: Adaptor 层允许使用策略模式等设计模式做技术路由
- DO: 类名使用 Adaptor 后缀，转换类使用 Converter 后缀
- DON'T: 禁止在 Input Adaptor 中编写任何业务逻辑
- DON'T: 禁止 Adaptor 接口按第三方 API 的结构定义方法签名
- DON'T: 禁止 Application 层或 Domain 层反向依赖 Adaptor 实现类
- DON'T: 禁止 Output Adaptor 暴露第三方的请求/响应格式给调用方
- DON'T: 禁止 Repository 通过 Adaptor 操作自己领域的数据库

## 示例

```java
// 正确示例：Output Adaptor 接口基于业务语义定义
// 接口定义在 Application 模块
public interface LogisticsAdaptor {
    ResultDO<LogisticsInfoResponseDTO> queryLogistics(String logisticsNo);
}

// 实现类在 Adaptor 层
@Component
public class LogisticsAdaptorImpl implements LogisticsAdaptor {

    @Autowired
    private ThirdPartyLogisticsClient logisticsClient;

    @Override
    public ResultDO<LogisticsInfoResponseDTO> queryLogistics(String logisticsNo) {
        try {
            ThirdPartyLogisticsResponse response = logisticsClient.track(logisticsNo);
            return ResultDO.buildSuccessResult(
                LogisticsConverter.toLogisticsInfoResponseDTO(response));
        } catch (Exception e) {
            log.error("查询物流信息失败, logisticsNo: {}", logisticsNo, e);
            return ResultDO.buildFailResult("LOGISTICS_QUERY_FAIL", "查询物流信息失败");
        }
    }
}
```

```java
// 错误示例：Adaptor 接口暴露第三方结构
public interface LogisticsAdaptor {
    ThirdPartyLogisticsResponse track(ThirdPartyTrackRequest request); // 禁止！
}
```

```java
// 正确示例：Input Adaptor 只做参数转换和调用转发
@RestController
@RequestMapping("/api/order")
public class OrderController {

    @Autowired
    private OrderQueryAppService orderQueryAppService;

    @GetMapping("/detail")
    public ResultDO<GetOrderDetailResponseDTO> getOrderDetail(@RequestParam Long orderId) {
        GetOrderDetailRequestDTO requestDTO = new GetOrderDetailRequestDTO();
        requestDTO.setOrderId(orderId);
        return orderQueryAppService.getOrderDetail(requestDTO);
    }
}
```

```java
// 错误示例：Input Adaptor 中包含业务逻辑
@RestController
@RequestMapping("/api/order")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository; // 禁止直接操作 Repository

    @GetMapping("/detail")
    public ResultDO<GetOrderDetailResponseDTO> getOrderDetail(@RequestParam Long orderId) {
        OrderAggregate order = orderRepository.findById(orderId).getData();
        // 禁止：Controller 中做业务判断
        if (order.getStatus() == OrderStatus.CANCELLED) {
            return ResultDO.buildFailResult("ORDER_CANCELLED", "订单已取消");
        }
        GetOrderDetailResponseDTO dto = new GetOrderDetailResponseDTO();
        dto.setOrderNo(order.getOrderNo());
        return ResultDO.buildSuccessResult(dto);
    }
}
```
