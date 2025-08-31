# 顾客管理 JSP 流程

本文档详细描述了从用户请求到 JSP 页面展示的顾客管理完整流程，包括涉及的类文件和方法。

## 1. 流程概述

```
用户请求 → 控制器 → 服务层 → DAO层 → 数据库 → DAO层 → 服务层 → 控制器 → JSP模板 → 用户展示
```

## 2. 详细流程分析

### 2.1 用户请求阶段

用户访问 URL：`http://localhost:8080/customer?action=list`
方法：HTTP GET
参数：action=list

### 2.2 控制层 (Controller)

**文件**: `src/main/java/com/insurance/controller/CustomerServlet.java`

**关键方法**:

- `doGet()` - 处理 GET 请求
- `listCustomers()` - 显示顾客列表
- `viewCustomer()` - 查看顾客详情
- `showEditForm()` - 显示编辑表单
- `addCustomer()` - 添加顾客
- `updateCustomer()` - 更新顾客
- `deleteCustomer()` - 删除顾客
- `searchCustomers()` - 搜索顾客

**核心代码**:

```java
@WebServlet("/customer")
public class CustomerServlet extends HttpServlet {
    private CustomerService customerService;

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String action = request.getParameter("action");
        if (action == null) {
            action = "list";
        }
        switch (action) {
            case "list":
                listCustomers(request, response);
                break;
            case "view":
                viewCustomer(request, response);
                break;
            case "edit":
                showEditForm(request, response);
                break;
            case "delete":
                deleteCustomer(request, response);
                break;
            case "search":
                searchCustomers(request, response);
                break;
            default:
                listCustomers(request, response);
                break;
        }
    }

    private void listCustomers(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        List<Customer> customers = customerService.getAllCustomers();
        request.setAttribute("customers", customers);
        RequestDispatcher dispatcher = request.getRequestDispatcher("/WEB-INF/views/customer/list.jsp");
        dispatcher.forward(request, response);
    }
}
```

### 2.3 服务层 (Service)

**文件**: `src/main/java/com/insurance/service/CustomerService.java`

**关键方法**:

- `getAllCustomers()` - 获取所有顾客列表
- `getCustomerById()` - 根据 ID 获取顾客
- `addCustomer()` - 添加顾客
- `updateCustomer()` - 更新顾客
- `deleteCustomer()` - 删除顾客
- `searchCustomers()` - 搜索顾客
- `validateCustomer()` - 验证顾客信息

**核心代码**:

```java
public class CustomerService {
    private CustomerDAO customerDAO;

    public List<Customer> getAllCustomers() {
        return customerDAO.getAllCustomers();
    }

    public boolean addCustomer(Customer customer) {
        // 业务逻辑验证
        if (customer == null || customer.getCustomerCode() == null || customer.getCustomerCode().trim().isEmpty()) {
            return false;
        }
        // 检查顾客编号是否已存在
        Customer existingCustomer = customerDAO.getCustomerByCode(customer.getCustomerCode());
        if (existingCustomer != null) {
            return false;
        }
        return customerDAO.addCustomer(customer);
    }

    public String validateCustomer(Customer customer) {
        // 验证顾客信息
        if (customer.getCustomerCode() == null || customer.getCustomerCode().trim().isEmpty()) {
            return "顾客编号不能为空";
        }
        // 其他验证...
        return null; // 验证通过
    }
}
```

### 2.4 数据访问层 (DAO)

**文件**: `src/main/java/com/insurance/dao/CustomerDAO.java`

**关键方法**:

- `getAllCustomers()` - 从数据库获取所有顾客
- `getCustomerById()` - 根据 ID 获取顾客
- `addCustomer()` - 添加顾客到数据库
- `updateCustomer()` - 更新顾客信息
- `deleteCustomer()` - 删除顾客（软删除）
- `searchCustomers()` - 搜索顾客
- `mapResultSetToCustomer()` - 将结果集映射到 Customer 对象

**核心代码**:

```java
public class CustomerDAO {
    public List<Customer> getAllCustomers() {
        List<Customer> customers = new ArrayList<>();
        String sql = "SELECT * FROM customers WHERE deleted_flag = 0 ORDER BY created_at DESC";

        try (Connection conn = DatabaseUtil.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                customers.add(mapResultSetToCustomer(rs));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return customers;
    }

    public boolean addCustomer(Customer customer) {
        String sql = "INSERT INTO customers (customer_code, first_name, last_name, first_name_kana, last_name_kana, " +
                    "gender, birth_date, age, postal_code, prefecture, city, address_line1, address_line2, " +
                    "phone_number, email, occupation, annual_income, family_composition) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, customer.getCustomerCode());
            pstmt.setString(2, customer.getFirstName());
            pstmt.setString(3, customer.getLastName());
            // 设置其他字段...

            int rowsAffected = pstmt.executeUpdate();
            return rowsAffected > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    private Customer mapResultSetToCustomer(ResultSet rs) throws SQLException {
        Customer customer = new Customer();
        customer.setId(rs.getInt("id"));
        customer.setCustomerCode(rs.getString("customer_code"));
        customer.setFirstName(rs.getString("first_name"));
        customer.setLastName(rs.getString("last_name"));
        // 设置其他字段...
        return customer;
    }
}
```

### 2.5 模型层 (Model)

**文件**: `src/main/java/com/insurance/model/Customer.java`

**关键字段**:

- id - 顾客 ID
- customerCode - 顾客编号
- firstName - 名字
- lastName - 姓氏
- gender - 性别
- birthDate - 出生日期
- email - 邮箱
- phoneNumber - 电话号码
- addressLine1 - 地址第一行
- postalCode - 邮政编码等

### 2.6 数据库层

**表名**: `customers`

**关键字段**:

- id (主键)
- customer_code (顾客编号)
- first_name (名字)
- last_name (姓氏)
- gender (性别)
- birth_date (出生日期)
- email (邮箱)
- phone_number (电话号码)
- address_line1 (地址第一行)
- postal_code (邮政编码)
- created_at (创建时间)
- updated_at (更新时间)
- deleted_flag (删除标志)

### 2.7 JSP 视图层

**文件**: `src/main/webapp/WEB-INF/views/customer/list.jsp`

**关键代码**:

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!-- 顾客列表表格 -->
<div class="table-container">
    <table class="data-table">
        <thead>
            <tr>
                <th>顾客代码</th>
                <th>姓名</th>
                <th>性别</th>
                <th>年龄</th>
                <th>电话号码</th>
                <th>邮箱</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody>
            <c:choose>
                <c:when test="${not empty customers}">
                    <c:forEach var="customer" items="${customers}">
                        <tr>
                            <td>${customer.customerCode}</td>
                            <td>${customer.lastName} ${customer.firstName}</td>
                            <td>${customer.gender == 'M' ? '男' : '女'}</td>
                            <td>${customer.age}岁</td>
                            <td>${customer.phoneNumber}</td>
                            <td>${customer.email}</td>
                            <td class="actions">
                                <a href="${pageContext.request.contextPath}/customer?action=view&id=${customer.id}"
                                   class="btn btn-info btn-sm">详情</a>
                                <a href="${pageContext.request.contextPath}/customer?action=edit&id=${customer.id}"
                                   class="btn btn-warning btn-sm">编辑</a>
                                <a href="${pageContext.request.contextPath}/customer?action=delete&id=${customer.id}"
                                   class="btn btn-danger btn-sm"
                                   onclick="return confirm('确定删除吗？')">删除</a>
                            </td>
                        </tr>
                    </c:forEach>
                </c:when>
                <c:otherwise>
                    <tr>
                        <td colspan="8" class="text-center">暂无顾客数据</td>
                    </tr>
                </c:otherwise>
            </c:choose>
        </tbody>
    </table>
</div>
```

## 3. 流程总结

1. **用户请求**: 用户访问`/customer?action=list`
2. **控制器处理**: `CustomerServlet.doGet()`接收请求，调用`listCustomers()`方法
3. **服务层调用**: `CustomerService.getAllCustomers()`获取顾客列表
4. **数据访问**: `CustomerDAO.getAllCustomers()`查询数据库并映射为 Customer 对象列表
5. **数据返回**: 数据逐层返回到控制器
6. **JSP 渲染**: 控制器将数据放入 request 属性并通过`RequestDispatcher`转发到`list.jsp`
7. **页面展示**: JSP 页面使用 JSTL 标签渲染数据并返回给用户浏览器显示

这个流程展示了典型的 MVC 架构在传统 JSP 应用中的应用，数据从数据库通过 DAO、Service、Controller 层层传递，最终通过 JSP 页面渲染展示给用户。
