# API Servlet 与传统 Controller 的对比

## API 文件与控制器的关系解析

您的观察非常准确！这些 API 文件确实与控制器（Controller）职责非常相似，实际上它们就是控制器的一种实现形式。让我详细解释一下：

## 1. MVC 架构中的控制器角色

在**MVC 架构**中，控制器（Controller）的职责是：

- 接收用户请求
- 解析请求参数
- 调用业务逻辑层
- 返回响应结果

## 2. API Servlet 与传统 Controller 的对比

### 相同点：

1. 传统 Controller (CustomerController)　　 API Servlet (CustomerApiServlet)
2. ↓ 　　 ↓
3. 接收 HTTP 请求　　接收 HTTP 请求
4. 解析请求参数　　解析请求参数
5. 调用 Service 层　　调用 Service 层
6. 返回视图或数据　　返回 JSON 数据

### 不同点：

| 特性     | 传统 Controller | API Servlet                |
| -------- | --------------- | -------------------------- |
| 响应格式 | HTML/JSP 视图   | JSON 数据                  |
| 客户端   | Web 浏览器      | Web 应用/移动 App/API 调用 |
| 数据处理 | 表单数据        | JSON/XML 数据              |
| 返回方式 | 服务端渲染      | 前后端分离                 |

## 3. 为什么会有两套控制器？

在您的项目中存在两种控制器：

**传统 Web 控制器（处理页面请求）**：

- CustomerServlet.java（处理/customer 路径）
- UserManagementController.java（处理/admin/users 路径）
- 这些返回 JSP 页面，用于服务端渲染

**API 控制器（处理数据接口）**：

- CustomerApiServlet.java（处理/api/customers 路径）
- ContractApiServlet.java（处理/api/contracts 路径）
- 这些返回 JSON 数据，用于前后端分离或移动应用

## 4. 实际应用场景

### 传统 Controller 使用场景：

1. 用户在浏览器访问 → `http://yoursite.com/customer/list`
2. 服务器处理 → `CustomerServlet.doGet()` → 返回 customer/list.jsp 页面

### API Controller 使用场景：

1. 前端 JavaScript 调用 → `fetch('/api/customers/')`
2. 服务器处理 → `CustomerApiServlet.handleRequest()` → 返回 JSON 数据

## 5. 代码层面的相似性

看这两个方法的结构：

```java
// 传统Servlet Controller
protected void doGet(HttpServletRequest request, HttpServletResponse response) {
    // 1. 获取参数
    String action = request.getParameter("action");

    // 2. 业务处理
    List customers = customerService.getAllCustomers();

    // 3. 设置数据到request
    request.setAttribute("customers", customers);

    // 4. 转发到JSP页面
    request.getRequestDispatcher("/WEB-INF/views/customer/list.jsp").forward(request, response);
}

// API Servlet Controller
protected void handleRequest(HttpServletRequest request, HttpServletResponse response) {
    // 1. 获取参数
    String pathInfo = request.getPathInfo();

    // 2. 业务处理
    List customers = customerService.getAllCustomers();

    // 3. 构造JSON响应
    ApiResponse apiResponse = ApiResponse.success(customers);

    // 4. 发送JSON响应
    sendJsonResponse(response, apiResponse);
}
```

## 6. 设计优势

这种设计的优势：

1. **前后端分离**：Web 页面和 API 接口可以独立开发
2. **多端复用**：同一套业务逻辑可以服务于 Web、App、第三方集成
3. **渐进式迁移**：可以从传统 Web 应用逐步迁移到现代化架构
4. **职责清晰**：API 接口专门处理数据交互，传统 Controller 处理页面展示

所以您的感觉是对的，**API Servlet 本质上就是控制器模式在 API 接口场景下的具体实现**！
