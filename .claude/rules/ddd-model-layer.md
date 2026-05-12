---
description: 当编写或修改模型层代码（实体、值对象、聚合根）时自动应用
globs:
  - "src/**/model/**/*.java"
  - "src/**/entity/**/*.java"
  - "src/**/valueobject/**/*.java"
---

<!-- auto-generated from: https://aliyuque.antfin.com/fliggy-flight/flightsaas/pfm4axvoqzofn13r -->

# DDD Model Layer 规则

## 核心原则

1. **model 层是共享模型层**：仅存放跨模块共享的枚举、通用业务概念和常量，不存放特定领域的实体或聚合根
2. **client 层禁止依赖 model 层**：client 的 DTO 必须自包含，避免依赖扩散到外部调用方
3. **共享模型必须实现 Serializable**：通用业务概念类必须实现序列化接口，确保跨模块传输安全
4. **枚举必须携带 code 和 description**：共享枚举统一使用 code + description 双字段模式，便于持久化和展示
5. **通过 Assembler 隔离层间转换**：client DTO 与 model 中相似概念的转换必须在 application 层通过 Assembler 完成

## 编码约束

- DO: 共享枚举放在 `model.{业务名}` 包下，类名以 `Enum` 结尾
- DO: 通用业务概念类实现 `Serializable` 并声明 `serialVersionUID`
- DO: 枚举构造函数包含 `code` 和 `description` 两个字段
- DO: model 层的类保持纯 POJO，不依赖 Spring 或其他框架注解
- DO: 当 client 层需要类似 model 的概念时，在 client 层独立定义 DTO
- DON'T: 不要在 client 模块中 import model 层的任何类
- DON'T: 不要在 model 层放置属于特定领域的实体（Entity）或聚合根（AggregateRoot）
- DON'T: 不要在 model 层引入业务逻辑或行为方法
- DON'T: 不要在 model 层依赖 domain / application / adaptor / infrastructure 层
- DON'T: 不要在枚举中使用无意义的数字 code（如 1, 2, 3），应使用有语义的字符串

## 示例

```java
// 正确示例：共享枚举定义
package com.example.flight.model.common;

public enum DomesticIntlEnum {

    DOMESTIC("D", "国内"),
    INTERNATIONAL("I", "国际"),
    ;

    private final String code;
    private final String description;

    DomesticIntlEnum(String code, String description) {
        this.code = code;
        this.description = description;
    }

    public String getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }
}
```

```java
// 正确示例：通用业务概念
package com.example.flight.model.segment;

import java.io.Serializable;

public class Segment implements Serializable {

    private static final long serialVersionUID = 1L;

    private String depCityCode;
    private String arrCityCode;
    private String flightDate;

    // getter/setter
}
```

```java
// 错误示例：client 层直接依赖 model
package com.example.flight.client.dto;

import com.example.flight.model.common.DomesticIntlEnum; // 禁止！

public class FlightQueryRequest {
    private DomesticIntlEnum domesticIntl; // 会导致外部调用方传递依赖 model 包
}
```

```java
// 正确示例：client 层自包含 DTO
package com.example.flight.client.dto;

public class FlightQueryRequest {
    /** 国内国际标识：D-国内，I-国际 */
    private String domesticIntl;
}
```

```java
// 错误示例：model 层包含业务逻辑
package com.example.flight.model.segment;

public class Segment implements Serializable {
    private String depCityCode;
    private String arrCityCode;

    // 禁止：model 层不承载业务逻辑
    public boolean isInternational() {
        return !depCityCode.startsWith("CN");
    }
}
```
