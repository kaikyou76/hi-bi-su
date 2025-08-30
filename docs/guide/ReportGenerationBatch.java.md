# 报告生成批处理

```java
package com.insurance.batch;

import com.insurance.util.DatabaseUtil;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 报告生成批处理类
 * 这个类负责定期生成各类业务报表，包括：
 * 1. 每周一凌晨4点生成周度报告（合同统计、资料请求统计、销售统计）
 * 2. 每月1日凌晨5点生成月度报告（月合同、月销售、月客户分析）
 *
 * 使用ScheduledExecutorService实现定时任务调度，确保报告按周期自动生成
 */
public class ReportGenerationBatch {
    // 创建一个单线程的定时任务调度器，用于执行所有报告生成任务
    private static final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    /**
     * 启动报告生成批处理任务调度
     * 这个方法会初始化两个周期性任务：
     * 1. 每周一凌晨4点执行周度报告生成
     * 2. 每月1日凌晨5点执行月度报告生成
     */
    public static void startBatchProcessing() {
        System.out.println("开始报告生成批处理...");

        // 安排每周一凌晨4点执行周度报告生成
        scheduler.scheduleAtFixedRate(
            ReportGenerationBatch::executeReportGeneration,  // 周度报告生成任务
            getWeeklyInitialDelay(),  // 首次执行延迟（到下周一凌晨4点的时间）
            7 * 24 * 60 * 60 * 1000,  // 执行间隔（7天，即1周）
            TimeUnit.MILLISECONDS  // 时间单位（毫秒）
        );

        // 安排每月1日凌晨5点执行月度报告生成
        scheduler.scheduleAtFixedRate(
            ReportGenerationBatch::executeMonthlyReports,  // 月度报告生成任务
            getMonthlyInitialDelay(),  // 首次执行延迟（到下月1日凌晨5点的时间）
            30 * 24 * 60 * 60 * 1000L,  // 执行间隔（约30天，即1个月）
            TimeUnit.MILLISECONDS  // 时间单位（毫秒）
        );
    }

    /**
     * 停止报告生成批处理任务调度
     * 优雅地关闭调度器，确保所有正在执行的任务完成后再停止
     */
    public static void stopBatchProcessing() {
        System.out.println("停止报告生成批处理...");
        scheduler.shutdown();  // 开始关闭调度器，不再接受新任务

        try {
            // 等待60秒让当前任务完成
            if (!scheduler.awaitTermination(60, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();  // 60秒后仍有任务运行则强制关闭
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();  // 等待被中断时强制关闭
            Thread.currentThread().interrupt();  // 恢复中断状态
        }
    }

    /**
     * 执行周度报告生成
     * 生成三类周度报告：合同统计报告、资料请求统计报告和销售统计报告
     */
    private static void executeReportGeneration() {
        System.out.println("[" + new Date() + "] 执行周度报告生成批处理");

        try {
            // 1. 生成合同统计报告（合同状态分布、平均保费等）
            generateContractStatsReport();
            System.out.println("合同统计报告生成完成");

            // 2. 生成资料请求统计报告（请求状态分布、处理时长等）
            generateRequestStatsReport();
            System.out.println("资料请求统计报告生成完成");

            // 3. 生成销售统计报告（周销售额、支付次数等）
            generateSalesReport();
            System.out.println("销售统计报告生成完成");

            System.out.println("[" + new Date() + "] 周度报告生成批处理成功完成");
        } catch (Exception e) {
            System.err.println("[" + new Date() + "] 报告生成过程中发生错误: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * 执行月度报告生成
     * 生成三类月度报告：月合同报告、月销售报告和月客户分析报告
     */
    private static void executeMonthlyReports() {
        System.out.println("[" + new Date() + "] 执行月度报告生成批处理");

        try {
            // 1. 生成月合同报告（按产品统计合同数量和保费）
            generateMonthlyContractReport();
            System.out.println("月合同报告生成完成");

            // 2. 生成月销售报告（按日统计销售额）
            generateMonthlySalesReport();
            System.out.println("月销售报告生成完成");

            // 3. 生成月客户分析报告（按性别和年龄组统计客户分布）
            generateMonthlyCustomerAnalysis();
            System.out.println("月客户分析报告生成完成");

            System.out.println("[" + new Date() + "] 月度报告生成批处理成功完成");
        } catch (Exception e) {
            System.err.println("[" + new Date() + "] 月度报告生成过程中发生错误: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * 生成合同统计报告
     * 统计所有合同的状态分布、平均保费和总保险金额
     *
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static void generateContractStatsReport() throws SQLException {
        // 生成报告日期和文件名（格式：contract_stats_2023-10-09.csv）
        String reportDate = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
        String fileName = "contract_stats_" + reportDate + ".csv";

        // SQL查询：统计合同状态分布和金额指标
        String sql = "SELECT " +
                    "COUNT(*) as total_contracts, " +  // 总合同数
                    "SUM(CASE WHEN contract_status = '承認' THEN 1 ELSE 0 END) as approved_count, " +  // 承認状态合同数
                    "SUM(CASE WHEN contract_status = '審査中' THEN 1 ELSE 0 END) as pending_count, " +  // 審査中状态合同数
                    "SUM(CASE WHEN contract_status = '取消' THEN 1 ELSE 0 END) as cancelled_count, " +  // 取消状态合同数
                    "SUM(CASE WHEN contract_status = '失効' THEN 1 ELSE 0 END) as lapsed_count, " +  // 失効状态合同数
                    "AVG(monthly_premium) as avg_monthly_premium, " +  // 平均月保费
                    "SUM(insured_amount) as total_insured_amount " +  // 总保险金额
                    "FROM contracts";  // 合同表

        try (Connection conn = DatabaseUtil.getConnection();  // 获取数据库连接
             PreparedStatement pstmt = conn.prepareStatement(sql);  // 创建预编译SQL
             ResultSet rs = pstmt.executeQuery()) {  // 执行查询并获取结果集

            if (rs.next()) {
                // 从结果集提取统计数据
                int totalContracts = rs.getInt("total_contracts");
                int approvedCount = rs.getInt("approved_count");
                int pendingCount = rs.getInt("pending_count");
                int cancelledCount = rs.getInt("cancelled_count");
                int lapsedCount = rs.getInt("lapsed_count");
                double avgPremium = rs.getDouble("avg_monthly_premium");
                double totalInsured = rs.getDouble("total_insured_amount");

                // 打印报告信息（实际应用中会写入文件）
                System.out.println("合同统计报告: " + fileName);
                System.out.println("总合同数: " + totalContracts);
                System.out.println("承認合同: " + approvedCount);
                System.out.println("審査中: " + pendingCount);
                System.out.println("取消: " + cancelledCount);
                System.out.println("失効: " + lapsedCount);
                System.out.println("平均月额保险费: " + avgPremium);
                System.out.println("总保险金额: " + totalInsured);
            }
        }
    }

    /**
     * 生成资料请求统计报告
     * 统计资料请求的状态分布和平均处理时长
     *
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static void generateRequestStatsReport() throws SQLException {
        // 生成报告日期和文件名（格式：request_stats_2023-10-09.csv）
        String reportDate = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
        String fileName = "request_stats_" + reportDate + ".csv";

        // SQL查询：统计资料请求状态和处理时长
        String sql = "SELECT " +
                    "COUNT(*) as total_requests, " +  // 总请求数
                    "SUM(CASE WHEN request_status = '新規' THEN 1 ELSE 0 END) as new_count, " +  // 新規状态请求数
                    "SUM(CASE WHEN request_status = '処理中' THEN 1 ELSE 0 END) as processing_count, " +  // 処理中状态请求数
                    "SUM(CASE WHEN request_status = '完了' THEN 1 ELSE 0 END) as completed_count, " +  // 完了状态请求数
                    "SUM(CASE WHEN request_status = '取消' THEN 1 ELSE 0 END) as cancelled_count, " +  // 取消状态请求数
                    "AVG(TIMESTAMPDIFF(DAY, created_at, COALESCE(completed_date, NOW()))) as avg_processing_days " +  // 平均处理天数
                    "FROM document_requests";  // 资料请求表

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            if (rs.next()) {
                int totalRequests = rs.getInt("total_requests");
                int newCount = rs.getInt("new_count");
                int processingCount = rs.getInt("processing_count");
                int completedCount = rs.getInt("completed_count");
                int cancelledCount = rs.getInt("cancelled_count");
                double avgProcessingDays = rs.getDouble("avg_processing_days");

                System.out.println("资料请求统计报告: " + fileName);
                System.out.println("总请求数: " + totalRequests);
                System.out.println("新規: " + newCount);
                System.out.println("処理中: " + processingCount);
                System.out.println("完了: " + completedCount);
                System.out.println("取消: " + cancelledCount);
                System.out.println("平均处理日数: " + avgProcessingDays + "日");
            }
        }
    }

    /**
     * 生成销售统计报告
     * 统计最近7天的销售总额、支付次数和平均支付金额
     *
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static void generateSalesReport() throws SQLException {
        // 生成报告日期和文件名（格式：sales_report_2023-10-09.csv）
        String reportDate = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
        String fileName = "sales_report_" + reportDate + ".csv";

        // SQL查询：统计最近7天的销售数据
        String sql = "SELECT " +
                    "SUM(pr.amount) as total_sales, " +  // 总销售额
                    "COUNT(pr.id) as total_payments, " +  // 总支付次数
                    "AVG(pr.amount) as avg_payment_amount, " +  // 平均支付金额
                    "MIN(pr.payment_date) as first_payment_date, " +  // 最早支付日期
                    "MAX(pr.payment_date) as last_payment_date " +  // 最近支付日期
                    "FROM payment_records pr " +  // 支付记录表
                    "WHERE pr.payment_status = '完了' " +  // 仅统计状态为"完了"的支付
                    "AND pr.payment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";  // 最近7天

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            if (rs.next()) {
                double totalSales = rs.getDouble("total_sales");
                int totalPayments = rs.getInt("total_payments");
                double avgPayment = rs.getDouble("avg_payment_amount");
                Date firstPayment = rs.getDate("first_payment_date");
                Date lastPayment = rs.getDate("last_payment_date");

                System.out.println("销售统计报告: " + fileName);
                System.out.println("总销售额: " + totalSales);
                System.out.println("总支付次数: " + totalPayments);
                System.out.println("平均支付金额: " + avgPayment);
                System.out.println("最早支付日期: " + firstPayment);
                System.out.println("最近支付日期: " + lastPayment);
            }
        }
    }

    /**
     * 生成月合同报告
     * 按产品统计当月新签合同数量、总保险金额和总保费
     *
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static void generateMonthlyContractReport() throws SQLException {
        // 生成月份和文件名（格式：monthly_contracts_2023-10.csv）
        String month = new SimpleDateFormat("yyyy-MM").format(new Date());
        String fileName = "monthly_contracts_" + month + ".csv";

        // SQL查询：按产品统计当月合同数据
        String sql = "SELECT " +
                    "ip.product_name, " +  // 产品名称
                    "COUNT(c.id) as contract_count, " +  // 合同数量
                    "SUM(c.insured_amount) as total_insured_amount, " +  // 总保险金额
                    "SUM(c.monthly_premium) as total_monthly_premium, " +  // 总月保费
                    "AVG(c.monthly_premium) as avg_monthly_premium " +  // 平均月保费
                    "FROM contracts c " +  // 合同表
                    "JOIN insurance_products ip ON c.product_id = ip.id " +  // 关联产品表
                    "WHERE YEAR(c.created_at) = YEAR(CURDATE()) " +  // 当年
                    "AND MONTH(c.created_at) = MONTH(CURDATE()) " +  // 当月
                    "GROUP BY ip.product_name " +  // 按产品分组
                    "ORDER BY contract_count DESC";  // 按合同数量降序

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            System.out.println("月合同报告: " + fileName);
            // 遍历结果集，打印每个产品的统计数据
            while (rs.next()) {
                String productName = rs.getString("product_name");
                int contractCount = rs.getInt("contract_count");
                double totalInsured = rs.getDouble("total_insured_amount");
                double totalPremium = rs.getDouble("total_monthly_premium");
                double avgPremium = rs.getDouble("avg_monthly_premium");

                System.out.println(productName + ": " + contractCount + "件, " +
                                 totalInsured + "円, " + totalPremium + "円/月");
            }
        }
    }

    /**
     * 生成月销售报告
     * 按日统计当月销售额和支付次数
     *
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static void generateMonthlySalesReport() throws SQLException {
        // 生成月份和文件名（格式：monthly_sales_2023-10.csv）
        String month = new SimpleDateFormat("yyyy-MM").format(new Date());
        String fileName = "monthly_sales_" + month + ".csv";

        // SQL查询：按日统计当月销售数据
        String sql = "SELECT " +
                    "DATE_FORMAT(pr.payment_date, '%Y-%m-%d') as payment_day, " +  // 支付日期（格式化）
                    "COUNT(pr.id) as daily_payments, " +  // 每日支付次数
                    "SUM(pr.amount) as daily_sales, " +  // 每日销售额
                    "AVG(pr.amount) as avg_daily_payment " +  // 每日平均支付金额
                    "FROM payment_records pr " +  // 支付记录表
                    "WHERE pr.payment_status = '完了' " +  // 仅统计"完了"状态
                    "AND YEAR(pr.payment_date) = YEAR(CURDATE()) " +  // 当年
                    "AND MONTH(pr.payment_date) = MONTH(CURDATE()) " +  // 当月
                    "GROUP BY payment_day " +  // 按日分组
                    "ORDER BY payment_day";  // 按日期排序

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            System.out.println("月销售报告: " + fileName);
            // 遍历结果集，打印每日销售数据
            while (rs.next()) {
                String paymentDay = rs.getString("payment_day");
                int dailyPayments = rs.getInt("daily_payments");
                double dailySales = rs.getDouble("daily_sales");
                double avgPayment = rs.getDouble("avg_daily_payment");

                System.out.println(paymentDay + ": " + dailyPayments + "件, " +
                                 dailySales + "円, 平均: " + avgPayment + "円");
            }
        }
    }

    /**
     * 生成月客户分析报告
     * 按性别和年龄组统计当月新客户分布及平均保费
     *
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static void generateMonthlyCustomerAnalysis() throws SQLException {
        // 生成月份和文件名（格式：customer_analysis_2023-10.csv）
        String month = new SimpleDateFormat("yyyy-MM").format(new Date());
        String fileName = "customer_analysis_" + month + ".csv";

        // SQL查询：按性别和年龄组统计客户数据
        String sql = "SELECT " +
                    "c.gender, " +  // 性别
                    "FLOOR((YEAR(CURDATE()) - YEAR(c.birth_date)) / 10) * 10 as age_group, " +  // 年龄组（如20代、30代）
                    "COUNT(DISTINCT cu.id) as customer_count, " +  // 客户数量（去重）
                    "AVG(co.monthly_premium) as avg_premium, " +  // 平均保费
                    "AVG(co.insured_amount) as avg_insured_amount " +  // 平均保险金额
                    "FROM contracts co " +  // 合同表
                    "JOIN customers cu ON co.customer_id = cu.id " +  // 关联客户表
                    "JOIN insured_persons c ON co.id = c.contract_id AND c.relationship = '本人' " +  // 关联投保人信息
                    "WHERE YEAR(co.created_at) = YEAR(CURDATE()) " +  // 当年
                    "AND MONTH(co.created_at) = MONTH(CURDATE()) " +  // 当月
                    "GROUP BY c.gender, age_group " +  // 按性别和年龄组分组
                    "ORDER BY c.gender, age_group";  // 排序

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            System.out.println("月客户分析报告: " + fileName);
            // 遍历结果集，打印各性别年龄组的客户数据
            while (rs.next()) {
                String gender = rs.getString("gender");
                int ageGroup = rs.getInt("age_group");
                int customerCount = rs.getInt("customer_count");
                double avgPremium = rs.getDouble("avg_premium");
                double avgInsured = rs.getDouble("avg_insured_amount");

                System.out.println(gender + " " + ageGroup + "代: " + customerCount + "人, " +
                                 "平均保险费: " + avgPremium + "円, " +
                                 "平均保险金额: " + avgInsured + "円");
            }
        }
    }

    /**
     * 计算到下周一凌晨4点的初始延迟时间
     *
     * @return 到下周一凌晨4点的毫秒数
     */
    private static long getWeeklyInitialDelay() {
        long now = System.currentTimeMillis();  // 当前时间（毫秒）
        java.util.Calendar calendar = java.util.Calendar.getInstance();  // 日历实例

        // 设置日历为下周一凌晨4点
        calendar.set(java.util.Calendar.DAY_OF_WEEK, java.util.Calendar.MONDAY);  // 周一
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 4);  // 4点
        calendar.set(java.util.Calendar.MINUTE, 0);       // 0分
        calendar.set(java.util.Calendar.SECOND, 0);       // 0秒
        calendar.set(java.util.Calendar.MILLISECOND, 0);  // 0毫秒

        // 如果当前时间已过本周一4点，则设置为下周一4点
        if (calendar.getTimeInMillis() <= now) {
            calendar.add(java.util.Calendar.WEEK_OF_YEAR, 1);  // 加1周
        }

        return calendar.getTimeInMillis() - now;  // 返回延迟毫秒数
    }

    /**
     * 计算到下月1日凌晨5点的初始延迟时间
     *
     * @return 到下月1日凌晨5点的毫秒数
     */
    private static long getMonthlyInitialDelay() {
        long now = System.currentTimeMillis();  // 当前时间（毫秒）
        java.util.Calendar calendar = java.util.Calendar.getInstance();  // 日历实例

        // 设置日历为下月1日凌晨5点
        calendar.set(java.util.Calendar.DAY_OF_MONTH, 1);  // 1日
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 5);   // 5点
        calendar.set(java.util.Calendar.MINUTE, 0);        // 0分
        calendar.set(java.util.Calendar.SECOND, 0);        // 0秒
        calendar.set(java.util.Calendar.MILLISECOND, 0);   // 0毫秒

        // 如果当前时间已过本月1日5点，则设置为下月1日5点
        if (calendar.getTimeInMillis() <= now) {
            calendar.add(java.util.Calendar.MONTH, 1);  // 加1个月
        }

        return calendar.getTimeInMillis() - now;  // 返回延迟毫秒数
    }

    /**
     * 手动执行报告生成批处理
     * 立即执行所有周度和月度报告生成任务（用于临时生成报告）
     */
    public static void manualExecute() {
        System.out.println("手动执行报告生成批处理...");
        executeReportGeneration();  // 执行周度报告
        executeMonthlyReports();    // 执行月度报告
    }
}
```
