---
description: 常规开发规范，编写任何 Java 代码时自动应用
globs:
  - "src/**/*.java"
---

<!-- auto-generated from: https://aliyuque.antfin.com/fliggy-flight/flightsaas/cm8yzu4wx1qgw3s6 -->

# 常规开发规范

## 核心原则

1. **早返回，减嵌套** — 对不符合条件的单分支判断，立即 return 或 continue，消灭深层 if-else 嵌套
2. **删无用代码** — 无用字段、变量、开关、冗余类型转换一律删除，不留死代码
3. **方法不超 100 行** — 超过则拆分为参数校验、请求转换、响应转换、代理等子方法
4. **集合初始化指定容量** — 构建 List、Map 时尽可能预估并初始化大小
5. **优先使用枚举** — Entity 中可枚举的字段用枚举类型，不用基础类型

## 编码约束

- DO: 使用 `StringUtils.isNotBlank()` / `isBlank()` 判断字符串
- DO: 多分支逻辑必须用 `if-else` 或 `if-else if` 完整覆盖
- DO: Stream 链式调用每个操作独占一行
- DO: lambda 中变量名与类型名一致且首字母小写（如 `itemParam` 而非 `p`）
- DO: 转换方法入参声明为 `final`，有输入有输出
- DO: 对象批量属性拷贝使用 EntityCopier / TaskCopier 模式
- DO: 异常捕获后统一抛出框架约定异常
- DO: 代理方法在 `finally` 中记录入参、响应、EagleeyeId 的 INFO 日志
- DON'T: 禁止使用 `StringUtils.isEmpty()` / `isNotEmpty()`（无法识别空白字符串）
- DON'T: 禁止冗余类型转换：如 `getLong().toString()` 再 `Integer.valueOf()`
- DON'T: 禁止定义全局未使用的私有字段或局部变量
- DON'T: 禁止非末行 lambda 将多个 Stream 操作写在同一行

## 示例

```java
// 正确示例：早返回消灭嵌套
private ResultDO<Resp> process(Request req) {
    JSONObject config = loadConf(req.getAgent());
    if (config.isEmpty()) {
        return ResultDO.buildFailResultCanNotRetry("不支持自动化");
    }

    if (BooleanUtils.isNotTrue(config.getBoolean("needTicketId"))) {
        return buildDefaultResp(req);
    }

    String taskId = cache.get(KEY + req.getTraceId());
    if (StringUtils.isBlank(taskId)) {
        return startNewTask(config, req);
    }

    return queryTaskResult(config, taskId, req);
}

// 错误示例：多层 if-else 嵌套
private ResultDO<Resp> process(Request req) {
    JSONObject config = loadConf(req.getAgent());
    if (config.isEmpty()) {
        return ResultDO.buildFailResultCanNotRetry("不支持自动化");
    } else {
        if (BooleanUtils.isTrue(config.getBoolean("needTicketId"))) {
            String taskId = cache.get(KEY + req.getTraceId());
            if (StringUtils.isNotBlank(taskId)) {
                // 深层嵌套继续...
            } else {
                // ...
            }
        } else {
            // ...
        }
    }
}
```

```java
// 正确示例：Stream 链式调用换行
long count = offerPenalties.stream()
        .filter(i -> PenaltyApplyRangeEnum.ALL_UNUSED.equals(i.getApplyRange()))
        .filter(i -> PenaltyTypeEnum.CANCELLATION.equals(i.getType()))
        .map(OfferPenaltyInfo::getDepTime)
        .distinct()
        .count();

// 错误示例：挤在一行
long count = offerPenalties.stream().filter(i -> PenaltyApplyRangeEnum.ALL_UNUSED.equals(i.getApplyRange())).filter(i -> PenaltyTypeEnum.CANCELLATION.equals(i.getType())).map(i -> i.getDepTime()).distinct().count();
```

```java
// 正确示例：集合初始化容量
List<String> names = new ArrayList<>(passengers.size());
Map<String, Order> orderMap = new HashMap<>(16);

// 错误示例：未指定容量
List<String> names = new ArrayList<>();
Map<String, Order> orderMap = new HashMap<>();
```

```java
// 正确示例：转换方法有输入有输出
private OrderDTO convertToDTO(final OrderEntity entity) {
    OrderDTO dto = new OrderDTO();
    dto.setOrderId(entity.getId());
    dto.setStatus(entity.getStatus().name());
    return dto;
}

// 错误示例：void 方法直接修改入参
private void fillDTO(OrderDTO dto, OrderEntity entity) {
    dto.setOrderId(entity.getId());
    dto.setStatus(entity.getStatus().name());
}
```
