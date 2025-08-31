# 保险料计算流程

本文档详细描述了从用户输入保险参数到计算结果显示的完整流程，包括涉及的类文件和方法。

## 1. 流程概述

```
用户请求 → 控制器 → 服务层 → DAO层 → 数据库 → DAO层 → 服务层 → 控制器 → JSP模板 → 用户展示
```

## 2. 详细流程分析

### 2.1 用户请求阶段

用户访问 URL：`http://localhost:8080/premium?action=simulate`
方法：HTTP GET
参数：action=simulate

### 2.2 控制层 (Controller)

**文件**: `src/main/java/com/insurance/controller/PremiumCalculatorServlet.java`

**关键方法**:

- `doGet()` - 处理 GET 请求
- `showSimulationForm()` - 显示保费模拟表单
- `calculatePremium()` - 计算保费
- `batchCalculatePremium()` - 批量计算保费
- `showRateTable()` - 显示料率表

**核心代码**:

```java
@WebServlet("/premium")
public class PremiumCalculatorServlet extends HttpServlet {
    private PremiumCalculatorService premiumService;

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String action = request.getParameter("action");
        if (action == null) {
            action = "simulate";
        }
        switch (action) {
            case "simulate":
                showSimulationForm(request, response);
                break;
            case "calculate":
                calculatePremium(request, response);
                break;
            case "rates":
                showRateTable(request, response);
                break;
            default:
                showSimulationForm(request, response);
                break;
        }
    }

    private void showSimulationForm(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        request.setAttribute("defaultProductId", 1);
        request.setAttribute("defaultGender", "M");
        request.setAttribute("defaultEntryAge", 30);
        request.setAttribute("defaultInsurancePeriod", 20);
        request.setAttribute("defaultInsuredAmount", 3000000.0);

        RequestDispatcher dispatcher = request.getRequestDispatcher("/WEB-INF/views/premium/simulate.jsp");
        dispatcher.forward(request, response);
    }

    private void calculatePremium(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            int productId = Integer.parseInt(request.getParameter("productId"));
            String gender = request.getParameter("gender");
            int entryAge = Integer.parseInt(request.getParameter("entryAge"));
            int insurancePeriod = Integer.parseInt(request.getParameter("insurancePeriod"));
            double insuredAmount = Double.parseDouble(request.getParameter("insuredAmount"));

            Map<String, Object> result = premiumService.calculatePremium(
                productId, gender, entryAge, insurancePeriod, insuredAmount
            );

            if (result.containsKey("error")) {
                request.setAttribute("errorMessage", result.get("error"));
                showSimulationForm(request, response);
                return;
            }

            request.setAttribute("calculationResult", result);
            RequestDispatcher dispatcher = request.getRequestDispatcher("/WEB-INF/views/premium/result.jsp");
            dispatcher.forward(request, response);

        } catch (NumberFormatException e) {
            request.setAttribute("errorMessage", "输入值无效");
            showSimulationForm(request, response);
        }
    }
}
```

### 2.3 服务层 (Service)

**文件**: `src/main/java/com/insurance/service/PremiumCalculatorService.java`

**关键方法**:

- `calculatePremium()` - 计算保险费
- `calculatePremiumUsingProcedure()` - 使用存储过程计算保险费
- `validateCalculationParameters()` - 验证计算参数
- `getPremiumRateTable()` - 获取料率表
- `batchCalculatePremium()` - 批量计算保险费

**核心代码**:

```java
public class PremiumCalculatorService {
    private PremiumRateDAO premiumRateDAO;

    public Map<String, Object> calculatePremium(int productId, String gender, int entryAge,
                                               int insurancePeriod, double insuredAmount) {
        Map<String, Object> result = new HashMap<>();

        // 验证输入参数
        String validationError = validateCalculationParameters(productId, gender, entryAge,
                                                             insurancePeriod, insuredAmount);
        if (validationError != null) {
            result.put("error", validationError);
            return result;
        }

        // 获取料率
        PremiumRate rate = premiumRateDAO.getRateByConditions(productId, gender, entryAge, insurancePeriod);
        if (rate == null) {
            result.put("error", "指定条件的料率未找到");
            return result;
        }

        // 计算保费
        double totalRate = rate.getTotalRate();
        double annualPremium = insuredAmount * totalRate;
        double monthlyPremium = annualPremium / 12;

        // 构建结果
        result.put("success", true);
        result.put("annualPremium", annualPremium);
        result.put("monthlyPremium", monthlyPremium);
        result.put("totalRate", totalRate);
        result.put("baseRate", rate.getBaseRate());
        result.put("loadingRate", rate.getLoadingRate());
        result.put("premiumRate", rate);
        result.put("insuredAmount", insuredAmount);
        result.put("calculationDate", new Date());

        return result;
    }

    private String validateCalculationParameters(int productId, String gender, int entryAge,
                                                int insurancePeriod, double insuredAmount) {
        // 验证商品ID是否有效
        if (productId <= 0) {
            return "商品ID无效";
        }

        // 验证性别是否为M或F
        if (gender == null || (!gender.equals("M") && !gender.equals("F"))) {
            return "性别必须为M或F";
        }

        // 验证加入年龄是否在有效范围内(0-100)
        if (entryAge < 0 || entryAge > 100) {
            return "加入年龄无效 (0-100)";
        }

        // 验证保险期间是否在有效范围内(1-50年)
        if (insurancePeriod <= 0 || insurancePeriod > 50) {
            return "保险期间无效 (1-50年)";
        }

        // 验证保险金额是否大于0
        if (insuredAmount <= 0) {
            return "保险金额必须大于0";
        }

        // 检查年龄和期间范围
        int[] validAgeRange = premiumRateDAO.getValidAgeRange(productId);
        if (entryAge < validAgeRange[0] || entryAge > validAgeRange[1]) {
            return "加入年龄超出有效范围 (" + validAgeRange[0] + "-" + validAgeRange[1] + "岁)";
        }

        int[] validPeriodRange = premiumRateDAO.getValidPeriodRange(productId);
        if (insurancePeriod < validPeriodRange[0] || insurancePeriod > validPeriodRange[1]) {
            return "保险期间超出有效范围 (" + validPeriodRange[0] + "-" + validPeriodRange[1] + "年)";
        }

        return null;
    }
}
```

### 2.4 数据访问层 (DAO)

**文件**: `src/main/java/com/insurance/dao/PremiumRateDAO.java`

**关键方法**:

- `getRateByConditions()` - 根据条件获取有效料率
- `getRatesByProductId()` - 获取指定商品的所有料率
- `getValidAgeRange()` - 获取指定商品的有效年龄范围
- `getValidPeriodRange()` - 获取指定商品的有效保险期间范围
- `mapResultSetToPremiumRate()` - 将结果集映射到 PremiumRate 对象

**核心代码**:

```java
public class PremiumRateDAO {
    public PremiumRate getRateByConditions(int productId, String gender, int entryAge, int insurancePeriod) {
        String sql = "SELECT pr.*, ip.product_name, ip.product_code " +
                   "FROM premium_rates pr " +
                   "LEFT JOIN insurance_products ip ON pr.product_id = ip.id " +
                   "WHERE pr.product_id = ? " +
                   "AND pr.gender = ? " +
                   "AND pr.entry_age = ? " +
                   "AND pr.insurance_period = ? " +
                   "AND pr.valid_from <= CURDATE() " +
                   "AND (pr.valid_to IS NULL OR pr.valid_to >= CURDATE()) " +
                   "ORDER BY pr.valid_from DESC " +
                   "LIMIT 1";

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, productId);
            pstmt.setString(2, gender);
            pstmt.setInt(3, entryAge);
            pstmt.setInt(4, insurancePeriod);

            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToPremiumRate(rs);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public int[] getValidAgeRange(int productId) {
        String sql = "SELECT MIN(entry_age) as min_age, MAX(entry_age) as max_age " +
                   "FROM premium_rates " +
                   "WHERE product_id = ? " +
                   "AND valid_from <= CURDATE() " +
                   "AND (valid_to IS NULL OR valid_to >= CURDATE())";

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, productId);
            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                int minAge = rs.getInt("min_age");
                int maxAge = rs.getInt("max_age");
                return new int[]{minAge, maxAge};
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return new int[]{0, 0};
    }

    private PremiumRate mapResultSetToPremiumRate(ResultSet rs) throws SQLException {
        PremiumRate rate = new PremiumRate();
        rate.setId(rs.getInt("id"));
        rate.setProductId(rs.getInt("product_id"));
        rate.setGender(rs.getString("gender"));
        rate.setEntryAge(rs.getInt("entry_age"));
        rate.setInsurancePeriod(rs.getInt("insurance_period"));
        rate.setBaseRate(rs.getDouble("base_rate"));
        rate.setLoadingRate(rs.getDouble("loading_rate"));
        rate.setValidFrom(rs.getDate("valid_from"));
        rate.setValidTo(rs.getDate("valid_to"));
        rate.setProductName(rs.getString("product_name"));
        rate.setProductCode(rs.getString("product_code"));
        return rate;
    }
}
```

### 2.5 模型层 (Model)

**文件**: `src/main/java/com/insurance/model/PremiumRate.java`

**关键字段**:

- id - 保险料率 ID
- productId - 商品 ID
- gender - 性别
- entryAge - 加入年龄
- insurancePeriod - 保险期间
- baseRate - 基本料率
- loadingRate - 附加料率
- validFrom - 有效开始日期
- validTo - 有效结束日期
- productName - 商品名称
- productCode - 商品代码

### 2.6 数据库层

**表名**: `premium_rates`

**关键字段**:

- id (主键)
- product_id (商品 ID)
- gender (性别)
- entry_age (加入年龄)
- insurance_period (保险期间)
- base_rate (基本料率)
- loading_rate (附加料率)
- valid_from (有效开始日期)
- valid_to (有效结束日期)
- created_at (创建时间)
- updated_at (更新时间)

### 2.7 JSP 视图层

**文件**: `src/main/webapp/WEB-INF/views/premium/simulate.jsp`

**关键代码**:

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!-- 保险费计算表单 -->
<form method="post" action="${pageContext.request.contextPath}/premium" id="premiumForm">
    <input type="hidden" name="action" value="calculate">

    <div class="form-row">
        <div class="form-group">
            <label for="productId">商品选择:</label>
            <select id="productId" name="productId" class="form-control" required>
                <option value="1">学资保险计划A</option>
                <option value="2">学资保险计划B</option>
                <option value="3">医疗保险计划A</option>
                <option value="4">终身保险计划A</option>
            </select>
        </div>

        <div class="form-group">
            <label for="gender">性别:</label>
            <select id="gender" name="gender" class="form-control" required>
                <option value="M">男性</option>
                <option value="F">女性</option>
            </select>
        </div>
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="entryAge">加入年龄:</label>
            <input type="number" id="entryAge" name="entryAge" class="form-control"
                   min="0" max="100" value="30" required>
        </div>

        <div class="form-group">
            <label for="insurancePeriod">保险期间 (年):</label>
            <input type="number" id="insurancePeriod" name="insurancePeriod" class="form-control"
                   min="1" max="50" value="20" required>
        </div>
    </div>

    <div class="form-group">
        <label for="insuredAmount">保险金额 (円):</label>
        <input type="number" id="insuredAmount" name="insuredAmount" class="form-control"
               min="100000" step="100000" value="3000000" required>
    </div>

    <div class="form-group text-right">
        <button type="submit" class="btn btn-primary">计算执行</button>
        <a href="${pageContext.request.contextPath}/premium?action=simulate" class="btn btn-secondary">清除</a>
    </div>
</form>
```

**文件**: `src/main/webapp/WEB-INF/views/premium/result.jsp`

**关键代码**:

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<c:if test="${not empty calculationResult and calculationResult.success}">
    <div class="result-container">
        <h2>计算结果</h2>

        <div class="result-summary">
            <div class="summary-card">
                <h3>月保险费</h3>
                <p class="premium-amount">
                    <fmt:formatNumber value="${calculationResult.monthlyPremium}" pattern="¥#,###" />
                </p>
            </div>

            <div class="summary-card">
                <h3>年保险费</h3>
                <p class="premium-amount">
                    <fmt:formatNumber value="${calculationResult.annualPremium}" pattern="¥#,###" />
                </p>
            </div>
        </div>

        <div class="result-details">
            <h3>计算详情</h3>
            <table class="details-table">
                <tr>
                    <th>保险金额</th>
                    <td>
                        <fmt:formatNumber value="${calculationResult.insuredAmount}" pattern="¥#,###" />
                    </td>
                </tr>
                <tr>
                    <th>基本料率</th>
                    <td>
                        <fmt:formatNumber value="${calculationResult.baseRate * 100}" pattern="0.0000" />%
                    </td>
                </tr>
                <tr>
                    <th>附加料率</th>
                    <td>
                        <fmt:formatNumber value="${calculationResult.loadingRate * 100}" pattern="0.0000" />%
                    </td>
                </tr>
                <tr>
                    <th>总料率</th>
                    <td>
                        <fmt:formatNumber value="${calculationResult.totalRate * 100}" pattern="0.0000" />%
                    </td>
                </tr>
                <tr>
                    <th>商品名</th>
                    <td>${calculationResult.premiumRate.productName}</td>
                </tr>
                <tr>
                    <th>性别</th>
                    <td>${param.gender == 'M' ? '男性' : '女性'}</td>
                </tr>
                <tr>
                    <th>加入年龄</th>
                    <td>${param.entryAge}岁</td>
                </tr>
                <tr>
                    <th>保险期间</th>
                    <td>${param.insurancePeriod}年</td>
                </tr>
            </table>
        </div>
    </div>
</c:if>
```

## 3. 流程总结

1. **用户请求**: 用户访问`/premium?action=simulate`显示计算表单
2. **参数输入**: 用户输入保险参数（商品 ID、性别、加入年龄、保险期间、保险金额）
3. **控制器处理**: `PremiumCalculatorServlet.doPost()`接收请求，调用`calculatePremium()`方法
4. **服务层调用**: `PremiumCalculatorService.calculatePremium()`验证参数并计算保险费
5. **数据访问**: `PremiumRateDAO.getRateByConditions()`查询数据库获取对应料率
6. **计算执行**: 服务层根据料率和保险金额计算年保费和月保费
7. **结果返回**: 计算结果逐层返回到控制器
8. **JSP 渲染**: 控制器将结果放入 request 属性并转发到`result.jsp`
9. **页面展示**: JSP 页面格式化显示计算结果给用户

这个流程展示了保险费计算的完整业务逻辑，从用户输入参数到数据库查询料率，再到计算和结果显示的全过程。
