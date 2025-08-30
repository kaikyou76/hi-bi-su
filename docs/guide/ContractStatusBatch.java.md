# 合同状态更新批处理

```java
package com.insurance.batch;

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
 * 合同状态更新批处理类
 * 这个类负责定期执行保险合同状态的自动更新，包括：
 * 1. 取消超过审核期限的合同
 * 2. 使逾期未付款的合同失效
 * 3. 将已到期的合同标记为完成
 * 4. 检查逾期付款和需要提醒的合同
 *
 * 使用ScheduledExecutorService实现定时任务调度，确保任务按计划自动执行
 */
public class ContractStatusBatch {
    // 创建一个单线程的定时任务调度器，用于执行所有定时任务
    private static final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    /**
     * 启动批处理任务调度
     * 这个方法会初始化两个定时任务：
     * 1. 每天凌晨3点执行合同状态更新（取消过期审核、失效逾期付款、完成到期合同）
     * 2. 每小时30分执行付款状态检查（检查逾期付款和需要提醒的合同）
     */
    public static void startBatchProcessing() {
        System.out.println("开始合同状态更新批处理...");

        // 安排每天凌晨3点执行合同状态更新
        scheduler.scheduleAtFixedRate(
            ContractStatusBatch::executeStatusUpdate,  // 要执行的任务：合同状态更新
            getInitialDelay(3),  // 首次执行的延迟时间（计算到下一个凌晨3点的时间）
            24 * 60 * 60 * 1000,  // 任务执行间隔（24小时，以毫秒为单位）
            TimeUnit.MILLISECONDS  // 时间单位
        );

        // 安排每小时30分执行付款状态检查
        scheduler.scheduleAtFixedRate(
            ContractStatusBatch::checkPaymentStatus,  // 要执行的任务：付款状态检查
            getMinuteInitialDelay(30),  // 首次执行的延迟时间（计算到下一个30分的时间）
            60 * 60 * 1000,  // 任务执行间隔（1小时，以毫秒为单位）
            TimeUnit.MILLISECONDS  // 时间单位
        );
    }

    /**
     * 停止批处理任务调度
     * 这个方法会优雅地关闭调度器，确保所有正在执行的任务完成后再停止
     */
    public static void stopBatchProcessing() {
        System.out.println("停止合同状态更新批处理...");
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
     * 执行合同状态更新的主要逻辑
     * 这是核心业务方法，按顺序执行以下操作：
     * 1. 取消超过审核期限的合同
     * 2. 使逾期未付款的合同失效
     * 3. 将已到期的合同标记为完成
     */
    private static void executeStatusUpdate() {
        System.out.println("[" + new Date() + "] 执行合同状态更新批处理");

        try {
            // 1. 取消超过审核期限的合同（审核中状态超过30天）
            int expiredCount = cancelExpiredContracts();
            System.out.println("已取消审核过期合同: " + expiredCount + "件");

            // 2. 使逾期未付款的合同失效（已生效但60天未付款）
            int lapsedCount = lapseOverdueContracts();
            System.out.println("已失效逾期付款合同: " + lapsedCount + "件");

            // 3. 将已到期的合同标记为完成
            int maturedCount = completeMaturedContracts();
            System.out.println("已完成到期合同: " + maturedCount + "件");

            System.out.println("[" + new Date() + "] 合同状态更新批处理成功完成");
        } catch (Exception e) {
            // 捕获并处理所有异常，确保批处理任务不会因单个异常而完全停止
            System.err.println("[" + new Date() + "] 批处理过程中发生错误: " + e.getMessage());
            e.printStackTrace();  // 打印异常堆栈跟踪，便于调试
        }
    }

    /**
     * 检查付款状态
     * 这个方法执行两项检查：
     * 1. 检查逾期付款的合同（超过30天未付款）
     * 2. 检查需要发送付款提醒的合同（超过15天未付款）
     */
    private static void checkPaymentStatus() {
        System.out.println("[" + new Date() + "] 执行付款状态检查");

        try {
            // 检查逾期付款的合同（超过30天未付款）
            int overdueCount = checkOverduePayments();
            if (overdueCount > 0) {
                System.out.println("逾期付款合同: " + overdueCount + "件");
            }

            // 检查需要发送付款提醒的合同（超过15天未付款）
            int reminderCount = checkPaymentReminders();
            if (reminderCount > 0) {
                System.out.println("需要付款提醒的合同: " + reminderCount + "件");
            }
        } catch (Exception e) {
            System.err.println("[" + new Date() + "] 付款状态检查中发生错误: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * 取消审核期限已过的合同
     * 这个方法会将"审核中"状态且创建时间超过30天的合同标记为"取消"
     *
     * @return 被取消的合同数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int cancelExpiredContracts() throws SQLException {
        // SQL语句：更新审核超过30天的合同状态为"取消"
        String sql = "UPDATE contracts SET contract_status = '取消', cancellation_reason = '審査期限切れ', " +
                    "cancellation_date = CURDATE(), updated_at = CURRENT_TIMESTAMP " +
                    "WHERE contract_status = '審査中' " +  // 仅处理状态为"审核中"的合同
                    "AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)";  // 创建时间超过30天

        // 使用try-with-resources语法自动管理数据库连接和语句对象
        try (Connection conn = DatabaseUtil.getConnection();  // 获取数据库连接
             PreparedStatement pstmt = conn.prepareStatement(sql)) {  // 创建预编译SQL语句

            return pstmt.executeUpdate();  // 执行更新并返回受影响的行数
        }
    }

    /**
     * 使付款期限已过的合同失效
     * 这个方法会将"承认"状态但最后付款日期超过60天的合同标记为"失効"
     *
     * @return 失效的合同数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int lapseOverdueContracts() throws SQLException {
        // SQL语句：更新超过60天未付款的合同状态为"失効"
        String sql = "UPDATE contracts SET contract_status = '失効', lapse_date = CURDATE(), " +
                    "updated_at = CURRENT_TIMESTAMP " +
                    "WHERE contract_status = '承認' " +  // 仅处理状态为"承认"的有效合同
                    "AND last_payment_date < DATE_SUB(CURDATE(), INTERVAL 60 DAY)";  // 最后付款超过60天

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            return pstmt.executeUpdate();  // 执行更新并返回受影响的行数
        }
    }

    /**
     * 完成已到期的合同
     * 这个方法会将"承认"状态且到期日已过的合同标记为"満期"
     *
     * @return 完成的合同数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int completeMaturedContracts() throws SQLException {
        // SQL语句：更新已到期的合同状态为"満期"
        String sql = "UPDATE contracts SET contract_status = '満期', maturity_date = CURDATE(), " +
                    "updated_at = CURRENT_TIMESTAMP " +
                    "WHERE contract_status = '承認' " +  // 仅处理状态为"承认"的有效合同
                    "AND maturity_date <= CURDATE()";  // 到期日小于等于当前日期

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            return pstmt.executeUpdate();  // 执行更新并返回受影响的行数
        }
    }

    /**
     * 检查逾期付款的合同
     * 这个方法会查询超过30天未付款的合同，并打印相关信息
     *
     * @return 逾期付款的合同数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int checkOverduePayments() throws SQLException {
        // SQL语句：查询超过30天未付款的合同信息
        String sql = "SELECT c.id, c.contract_number, c.customer_id, cu.customer_name, " +
                    "c.last_payment_date, DATEDIFF(CURDATE(), c.last_payment_date) as days_overdue " +
                    "FROM contracts c " +
                    "JOIN customers cu ON c.customer_id = cu.id " +  // 关联客户表获取客户名称
                    "WHERE c.contract_status = '承認' " +  // 仅处理有效合同
                    "AND c.last_payment_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)";  // 超过30天未付款

        int overdueCount = 0;  // 逾期合同计数器

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {  // 执行查询并获取结果集

            // 遍历查询结果
            while (rs.next()) {
                int contractId = rs.getInt("id");
                String contractNumber = rs.getString("contract_number");
                String customerName = rs.getString("customer_name");
                int daysOverdue = rs.getInt("days_overdue");

                // 打印逾期合同信息
                System.out.println("逾期付款合同: " + contractNumber + " - " + customerName +
                                   " (逾期天数: " + daysOverdue + "日)");
                overdueCount++;
            }
        }

        return overdueCount;  // 返回逾期合同总数
    }

    /**
     * 检查需要付款提醒的合同
     * 这个方法会查询超过15天未付款的合同，用于发送付款提醒
     *
     * @return 需要提醒的合同数量
     * @throws SQLException 如果数据库操作失败则抛出异常
     */
    private static int checkPaymentReminders() throws SQLException {
        // SQL语句：查询超过15天未付款的合同
        String sql = "SELECT c.id, c.contract_number, c.customer_id, cu.customer_name, " +
                    "c.last_payment_date, DATEDIFF(CURDATE(), c.last_payment_date) as days_since_last_payment " +
                    "FROM contracts c " +
                    "JOIN customers cu ON c.customer_id = cu.id " +  // 关联客户表
                    "WHERE c.contract_status = '承認' " +  // 仅处理有效合同
                    "AND c.last_payment_date < DATE_SUB(CURDATE(), INTERVAL 15 DAY)";  // 超过15天未付款

        int reminderCount = 0;  // 需要提醒的合同计数器

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                String contractNumber = rs.getString("contract_number");
                String customerName = rs.getString("customer_name");
                int daysSincePayment = rs.getInt("days_since_last_payment");

                // 打印需要提醒的合同信息
                System.out.println("需要付款提醒合同: " + contractNumber + " - " + customerName +
                                   " (最后付款至今: " + daysSincePayment + "日)");
                reminderCount++;
            }
        }

        return reminderCount;
    }

    /**
     * 计算到指定时间点的初始延迟时间
     * 例如：targetHour=3表示计算到下一个凌晨3点的延迟毫秒数
     *
     * @param targetHour 目标小时数（0-23）
     * @return 到目标时间点的延迟毫秒数
     */
    private static long getInitialDelay(int targetHour) {
        long now = System.currentTimeMillis();  // 当前时间（毫秒）
        java.util.Calendar calendar = java.util.Calendar.getInstance();  // 获取日历实例

        // 设置日历时间为今天的目标小时
        calendar.set(java.util.Calendar.HOUR_OF_DAY, targetHour);  // 目标小时
        calendar.set(java.util.Calendar.MINUTE, 0);       // 分钟设为0
        calendar.set(java.util.Calendar.SECOND, 0);       // 秒设为0
        calendar.set(java.util.Calendar.MILLISECOND, 0);  // 毫秒设为0

        // 如果当前时间已经过了今天的目标小时，则设置为明天的目标小时
        if (calendar.getTimeInMillis() <= now) {
            calendar.add(java.util.Calendar.DAY_OF_MONTH, 1);  // 加一天
        }

        // 返回计算出的延迟时间（目标时间 - 当前时间）
        return calendar.getTimeInMillis() - now;
    }

    /**
     * 计算到下一个指定分钟的初始延迟时间
     * 例如：targetMinute=30表示计算到下一个整点30分的延迟毫秒数
     *
     * @param targetMinute 目标分钟数（0-59）
     * @return 到目标分钟的延迟毫秒数
     */
    private static long getMinuteInitialDelay(int targetMinute) {
        long now = System.currentTimeMillis();
        java.util.Calendar calendar = java.util.Calendar.getInstance();

        // 设置日历时间为当前小时的目标分钟
        calendar.set(java.util.Calendar.MINUTE, targetMinute);  // 目标分钟
        calendar.set(java.util.Calendar.SECOND, 0);            // 秒设为0
        calendar.set(java.util.Calendar.MILLISECOND, 0);       // 毫秒设为0

        // 如果当前时间已经过了本小时的目标分钟，则设置为下一小时的目标分钟
        if (calendar.getTimeInMillis() <= now) {
            calendar.add(java.util.Calendar.HOUR_OF_DAY, 1);  // 加一小时
        }

        return calendar.getTimeInMillis() - now;
    }

    /**
     * 手动执行批处理
     * 这个方法允许用户手动触发批处理流程，立即执行合同状态更新和付款状态检查
     */
    public static void manualExecute() {
        System.out.println("手动执行合同状态更新批处理...");
        executeStatusUpdate();  // 执行合同状态更新
        checkPaymentStatus();   // 执行付款状态检查
    }
}
```
