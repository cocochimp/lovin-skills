---
description: 当编写或修改 client 层代码（对外 API 接口、DTO 定义、服务契约）时自动应用
globs:
  - "src/**/client/**/*.java"
  - "src/**/api/**/*.java"
---

<!-- auto-generated from: https://aliyuque.antfin.com/fliggy-flight/flightsaas/qq3s2rn5f8culw60 -->

# DDD Client Layer 规则

## 核心原则

1. **client 层必须自包含** — 所有 DTO 独立定义，禁止引用 model/domain/application/infrastructure 层的任何类
2. **读写分离** — 写操作继承 `ApplicationCmdService`，读操作继承 `ApplicationQueryService`，不混用
3. **一方法一 DTO** — 每个接口方法对应独立的 RequestDTO 和 ResponseDTO，禁止复用入参/出参
4. **包结构必须分类** — req/res/model 下禁止平铺，必须按业务分类建子包
5. **业务语义命名** — 方法用业务动词命名，禁止技术动词（save/update/delete）

## 编码约束

- DO: DTO 统一继承 `BaseDto`
- DO: RequestDTO 命名为 `<方法名>RequestDTO`
- DO: ResponseDTO 命名为 `<方法名>ResponseDTO`
- DO: 返回值统一用 `ResultDO<XxxResponseDTO>` 封装
- DO: 写接口命名为 `<聚合根名>AppService`，继承 `ApplicationCmdService`
- DO: 读接口命名为 `<聚合根名>QueryAppService`，继承 `ApplicationQueryService`
- DO: 纯计算接口一个计算方法一个类
- DO: model 包中的复用对象以 `DTO` 结尾，体现行业概念（如 `SegmentDTO`、`PassengerDTO`）
- DON'T: 禁止 client 层依赖 model/domain/application/infrastructure 层
- DON'T: 禁止使用原始类型或 Map 作为接口参数
- DON'T: 禁止直接抛出异常作为错误返回方式
- DON'T: 禁止 req/res/model 包下类完全平铺不分类
- DON'T: 禁止方法命名使用 `save`、`update`、`delete`、`process` 等技术/抽象动词
- DON'T: 禁止过度复用 model DTO 导致入参膨胀或出参冗余

## 示例

```java
// 正确示例：写模式接口定义
public interface OrderAppService extends ApplicationCmdService {

    ResultDO<CreateOrderResponseDTO> createOrder(CreateOrderRequestDTO requestDTO);

    ResultDO<ConfirmPaymentResponseDTO> confirmPayment(ConfirmPaymentRequestDTO requestDTO);
}
```

```java
// 错误示例：未继承基类 + 技术动词 + Map 参数 + 抛异常
public interface OrderAppService {

    void save(Map<String, Object> params) throws BizException;

    void update(Long id, Map<String, Object> params);
}
```

```java
// 正确示例：RequestDTO 定义
public class CreateOrderRequestDTO extends BaseDto {

    private static final long serialVersionUID = 1L;

    /** 航段信息 */
    private List<SegmentDTO> segments;

    /** 乘机人信息 */
    private List<PassengerDTO> passengers;
}
```

```java
// 错误示例：未继承 BaseDto + 引用 domain 层 + 使用 Map
import com.xxx.domain.model.Order; // 禁止！

public class CreateOrderReq {
    private Order order;
    private Map<String, Object> extInfo;
}
```

## 包结构参考

```
client/
├── order/
│   ├── model/
│   │   ├── passenger/
│   │   │   ├── PassengerDTO.java
│   │   │   └── CredentialDTO.java
│   │   └── segment/
│   │       └── SegmentDTO.java
│   ├── req/
│   │   └── order/
│   │       ├── CreateOrderRequestDTO.java
│   │       └── ConfirmPaymentRequestDTO.java
│   └── res/
│       └── order/
│           ├── CreateOrderResponseDTO.java
│           └── ConfirmPaymentResponseDTO.java
```
