# 保险费率更新批处理

```java
package com.insurance.batch;

import com.insurance.dao.PremiumRateDAO;
import com.insurance.util.DatabaseUtil;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Date;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 保险费率更新批处理类
 * 这个类负责定期执行保险费率的更新任务，包括：
 * 1. 禁用过期的保险费率
 * 2. 激活新的保险费率
 * 3. 重新计算并更新相关合同的保险费用
 * 4. 检查长时间处理中的请求和过期的跟进请求
 *
 * 使用ScheduledExecutorService实现定时任务调度，确保任务按计划自动执行
 */
public class PremiumUpdateBatch {
    // 创建一个单线程的定时任务调度器，用于执行所有定时任务
    private static final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    // 保险费率数据访问对象，用于数据库操作（虽然在当前代码中未直接使用）
    private static PremiumRateDAO premiumRateDAO = new PremiumRateDAO();

    /**
     * 启动批处理任务调度
     * 这个方法会初始化两个定时任务：
     * 1. 每天凌晨2点执行保险费率更新
     * 2. 每小时检查一次请求状态
     */
    public static void startBatchProcessing() {
        System.out.println("开始保险费率更新批处理...");

        // 安排每天凌晨2点执行保险费率更新
        scheduler.scheduleAtFixedRate(
            PremiumUpdateBatch::executePremiumUpdate,  // 要执行的任务
            getInitialDelay(),  // 首次执行的延迟时间（计算到下一个凌晨2点的时间）
            24 * 60 * 60 * 1000,  // 任务执行间隔（24小时，以毫秒为单位）
            TimeUnit.MILLISECONDS  // 时间单位
        );

        // 安排每小时执行一次请求状态检查
        scheduler.scheduleAtFixedRate(
            PremiumUpdateBatch::checkRequestStatus,  // 要执行的任务
            getHourlyInitialDelay(),  // 首次执行的延迟时间（计算到下一个整点的时间）
            60 * 60 * 1000,  // 任务执行间隔（1小时，以毫秒为单位）
            TimeUnit.MILLISECONDS  // 时间单位
        );
    }

    /**
     * 停止批处理任务调度
     * 这个方法会优雅地关闭调度器，确保所有正在执行的任务完成后再停止
     */
    public static void stopBatchProcessing() {
        System.out.println("停止保险费率更新批处理...");
        scheduler.shutdown();  // 开始关闭调度器，不再接受新任务

        try {
            // 等待60秒，让当前任务有机会完成
            if (!scheduler.awaitTermination(60, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();  // 如果60秒后仍有任务在运行，强制关闭
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();  // 如果等待被中断，强制关闭
            Thread.currentThread().interrupt();  // 恢复中断状态
        }
    }

    /**
     * 执行保险费率更新的主要逻辑
     * 这是核心业务方法，按顺序执行以下操作：
     * 1. 禁用过期的保险费率
     * 2. 激活新的保险费率
     * 3. 重新计算并更新合同的保险费用
     */
    private static void executePremiumUpdate() {
        System.out.println("[" + new Date() + "] 执行保险费率更新批处理");

        try {
            // 1. 禁用所有已过期的保险费率
            int expiredCount = disableExpiredRates();
            System.out.println("已禁用过期费率: " + expiredCount + "条");

            // 2. 激活所有新的保险费率（生效日期为今天或之前）
            int activatedCount = activateNewRates();
            System.out.println("已激活新费率: " + activatedCount + "条");

            // 3. 重新计算并更新受影响的合同保险费
            int updatedCount = updateContractPremiums();
            System.out.println("已更新合同: " + updatedCount + "份");

            System.out.println("[" + new Date() + "] 保险费率更新批处理成功完成");
        } catch (Exception e) {
            // 捕获并处理所有异常，确保批处理任务不会因为一个异常而完全停止
            System.err.println("[" + new Date() + "] 批处理过程中发生错误: " + e.getMessage());
            e.printStackTrace();  // 打印异常堆栈跟踪，便于调试
        }
    }

    /**
     * 检查请求状态
     * 这个方法执行两项检查：
     * 1. 长时间处理中的请求（超过7天）
     * 2. 跟进日期已过但未完成的请求
     */
    private static void checkRequestStatus() {
        System.out.println("[" + new Date() + "] 执行请求状态检查");

        try {
            // 检查长时间处理中的请求
            int staleCount = checkStaleRequests();
            if (staleCount > 0) {
                System.out.println("长时间处理中的请求: " + staleCount + "条");
            }

            // 检查跟进日期已过的请求
            int overdueCount = checkOverdueFollowups();
            if (overdueCount > 0) {
                System.out.println("跟进期限已过的请求: " + overdueCount + "条");
            }
        } catch (Exception e) {
            System.err.println("[" + new Date() + "] 状态检查过程中发生错误: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * 禁用过期的保险费率
     * 这个方法会将所有已过期（valid_to < 当前日期）但尚未被禁用的费率标记为无效
     *
     * @return 被禁用的费率数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int disableExpiredRates() throws SQLException {
        // SQL语句：更新过期的费率记录，将valid_to设置为昨天
        String sql = "UPDATE premium_rates SET valid_to = CURDATE() - INTERVAL 1 DAY " +
                    "WHERE valid_to IS NOT NULL AND valid_to < CURDATE() AND valid_to != CURDATE() - INTERVAL 1 DAY";

        // 使用try-with-resources语法自动管理数据库连接和语句对象
        try (Connection conn = DatabaseUtil.getConnection();  // 获取数据库连接
             PreparedStatement pstmt = conn.prepareStatement(sql)) {  // 创建预编译SQL语句

            return pstmt.executeUpdate();  // 执行更新并返回受影响的行数
        }
    }

    /**
     * 激活新的保险费率
     * 这个方法会将所有生效日期已到（valid_from <= 当前日期）但尚未激活的费率激活
     *
     * @return 被激活的费率数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int activateNewRates() throws SQLException {
        // SQL语句：更新应该生效但尚未生效的费率记录
        String sql = "UPDATE premium_rates SET valid_from = CURDATE() " +
                    "WHERE valid_from <= CURDATE() AND valid_from != CURDATE() " +
                    "AND (valid_to IS NULL OR valid_to >= CURDATE())";

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            return pstmt.executeUpdate();  // 执行更新并返回受影响的行数
        }
    }

    /**
     * 更新合同的保险费用
     * 这个方法会查询所有有效的合同，重新计算保险费用，并更新到数据库中
     *
     * @return 更新的合同数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int updateContractPremiums() throws SQLException {
        // SQL查询：获取需要更新保险费的合同信息
        String sql = "SELECT c.id, c.product_id, c.insured_amount, " +
                    "ip.gender, ip.entry_age, ip.insurance_period " +
                    "FROM contracts c " +
                    "JOIN insured_persons ip ON c.id = ip.contract_id " +
                    "WHERE ip.relationship = '本人' " +  // 只考虑投保人本人
                    "AND c.contract_status IN ('承認', '審査中')";  // 合同状态为"承认"或"审查中"

        int updatedCount = 0;  // 记录更新成功的合同数量

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {  // 执行查询并获取结果集

            // 遍历查询结果
            while (rs.next()) {
                int contractId = rs.getInt("id");  // 合同ID
                int productId = rs.getInt("product_id");  // 产品ID
                double insuredAmount = rs.getDouble("insured_amount");  // 保险金额
                String gender = rs.getString("gender");  // 性别
                int entryAge = rs.getInt("entry_age");  // 投保年龄
                int insurancePeriod = rs.getInt("insurance_period");  // 保险期限

                // 计算新的保险费用
                double newPremium = calculateNewPremium(productId, gender, entryAge, insurancePeriod, insuredAmount);

                // 如果计算成功（新保费>0），则更新合同
                if (newPremium > 0) {
                    if (updateContractPremium(contractId, newPremium)) {
                        updatedCount++;  // 更新计数器
                    }
                }
            }
        }

        return updatedCount;  // 返回更新成功的合同数量
    }

    /**
     * 计算新的保险费用
     * 这个方法通过调用数据库存储过程来计算保险费用
     *
     * @param productId 产品ID
     * @param gender 性别
     * @param entryAge 投保年龄
     * @param insurancePeriod 保险期限
     * @param insuredAmount 保险金额
     * @return 计算出的月保险费，如果计算失败则返回-1
     */
    private static double calculateNewPremium(int productId, String gender, int entryAge,
                                             int insurancePeriod, double insuredAmount) {
        try {
            // 调用存储过程calculate_premium计算保险费
            String sql = "CALL calculate_premium(?, ?, ?, ?, ?, ?, ?)";

            try (Connection conn = DatabaseUtil.getConnection();
                 PreparedStatement pstmt = conn.prepareCall(sql)) {  // 使用prepareCall调用存储过程

                // 设置输入参数
                pstmt.setInt(1, productId);
                pstmt.setString(2, gender);
                pstmt.setInt(3, entryAge);
                pstmt.setInt(4, insurancePeriod);
                pstmt.setDouble(5, insuredAmount);

                // 注册输出参数
                pstmt.registerOutParameter(6, java.sql.Types.DECIMAL);  // 月保险费
                pstmt.registerOutParameter(7, java.sql.Types.DECIMAL);  // 年保险费（未使用）

                pstmt.execute();  // 执行存储过程

                return pstmt.getDouble(6);  // 返回月保险费
            }
        } catch (SQLException e) {
            System.err.println("保险费计算错误: " + e.getMessage());
            return -1;  // 计算失败返回-1
        }
    }

    /**
     * 更新合同的保险费用
     *
     * @param contractId 合同ID
     * @param newPremium 新的月保险费
     * @return 如果更新成功则返回true，否则返回false
     */
    private static boolean updateContractPremium(int contractId, double newPremium) {
        // 更新合同表中的月保险费和年保险费
        String sql = "UPDATE contracts SET monthly_premium = ?, annual_premium = ?, " +
                    "updated_at = CURRENT_TIMESTAMP WHERE id = ?";

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setDouble(1, newPremium);  // 月保险费
            pstmt.setDouble(2, newPremium * 12);  // 年保险费（月保险费×12）
            pstmt.setInt(3, contractId);  // 合同ID

            // executeUpdate()返回受影响的行数，如果>0表示更新成功
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("合同更新错误: " + e.getMessage());
            return false;
        }
    }

    /**
     * 检查长时间处理中的请求
     * 这个方法会找出所有状态为"处理中"且创建时间超过7天的请求
     *
     * @return 长时间处理中的请求数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int checkStaleRequests() throws SQLException {
        String sql = "SELECT id, request_number, created_at " +
                    "FROM document_requests " +
                    "WHERE request_status = '処理中' " +  // 状态为"处理中"
                    "AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)";  // 创建时间超过7天

        int staleCount = 0;  // 计数器

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {  // 执行查询

            // 遍历结果集
            while (rs.next()) {
                int requestId = rs.getInt("id");
                String requestNumber = rs.getString("request_number");
                Date createdAt = rs.getDate("created_at");

                // 打印长时间处理中的请求信息
                System.out.println("长时间处理中的请求: " + requestNumber + " (创建日期: " + createdAt + ")");
                staleCount++;
            }
        }

        return staleCount;  // 返回长时间处理中的请求数量
    }

    /**
     * 检查跟进日期已过的请求
     * 这个方法会找出所有跟进日期已过但请求状态不是"完了"或"取消"的请求
     *
     * @return 跟进日期已过的请求数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int checkOverdueFollowups() throws SQLException {
        String sql = "SELECT id, request_number, follow_up_date " +
                    "FROM document_requests " +
                    "WHERE follow_up_date IS NOT NULL " +  // 有跟进日期
                    "AND follow_up_date < CURDATE() " +  // 跟进日期已过
                    "AND request_status NOT IN ('完了', '取消')";  // 状态不是已完成或已取消

        int overdueCount = 0;

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                int requestId = rs.getInt("id");
                String requestNumber = rs.getString("request_number");
                Date followUpDate = rs.getDate("follow_up_date");

                System.out.println("跟进期限已过: " + requestNumber + " (期限: " + followUpDate + ")");
                overdueCount++;
            }
        }

        return overdueCount;
    }

    /**
     * 计算到下一个凌晨2点的初始延迟时间
     *
     * @return 到下一个凌晨2点的毫秒数
     */
    private static long getInitialDelay() {
        long now = System.currentTimeMillis();  // 当前时间（毫秒）
        java.util.Calendar calendar = java.util.Calendar.getInstance();  // 获取日历实例

        // 设置日历时间为今天凌晨2点
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 2);  // 小时（24小时制）
        calendar.set(java.util.Calendar.MINUTE, 0);       // 分钟
        calendar.set(java.util.Calendar.SECOND, 0);       // 秒
        calendar.set(java.util.Calendar.MILLISECOND, 0);  // 毫秒

        // 如果当前时间已经过了今天凌晨2点，则设置为明天凌晨2点
        if (calendar.getTimeInMillis() <= now) {
            calendar.add(java.util.Calendar.DAY_OF_MONTH, 1);  // 加一天
        }

        // 返回计算出的延迟时间（目标时间 - 当前时间）
        return calendar.getTimeInMillis() - now;
    }

    /**
     * 计算到下一个整点的初始延迟时间
     *
     * @return 到下一个整点的毫秒数
     */
    private static long getHourlyInitialDelay() {
        long now = System.currentTimeMillis();
        java.util.Calendar calendar = java.util.Calendar.getInstance();

        // 设置为下一个整点
        calendar.set(java.util.Calendar.MINUTE, 0);
        calendar.set(java.util.Calendar.SECOND, 0);
        calendar.set(java.util.Calendar.MILLISECOND, 0);
        calendar.add(java.util.Calendar.HOUR_OF_DAY, 1);  // 加一小时

        return calendar.getTimeInMillis() - now;
    }

    /**
     * 手动执行批处理
     * 这个方法允许用户手动触发批处理流程，立即执行保险费率更新和请求状态检查
     */
    public static void manualExecute() {
        System.out.println("手动执行批处理...");
        executePremiumUpdate();  // 执行保险费率更新
        checkRequestStatus();    // 执行请求状态检查
    }
}
```
