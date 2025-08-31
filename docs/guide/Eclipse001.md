# Eclipse 调试 Java Web 项目指南

本文档详细介绍了如何在 Eclipse IDE 中配置、调试和测试 Java Web 项目，以及如何查看代码修改的效果。

## 1. 配置开发环境

### 1.1 安装必要的插件

```
1. 打开Eclipse
2. 菜单栏：Help → Eclipse Marketplace
3. 搜索并安装：
   - Web Developer Tools
   - Java EE Developer Tools
   - Maven Integration for Eclipse
```

### 1.2 配置 Tomcat 服务器

```
1. 菜单栏：Window → Preferences → Server → Runtime Environments
2. 点击"Add"按钮
3. 选择Apache Tomcat v8.x
4. 指定Tomcat安装目录
5. 选择Java Runtime Environment
6. 点击"Finish"
```

## 2. 导入和配置项目

### 2.1 导入现有项目

```
1. 菜单栏：File → Import
2. 选择"General → Existing Projects into Workspace"
3. 点击"Next"
4. 选择项目根目录（D:\java1.8-Velocity）
5. 点击"Finish"
```

### 2.2 配置项目为 Web 项目

```
1. 右键项目 → Properties
2. 选择"Project Facets"
3. 勾选"Dynamic Web Module"和"Java"
4. 点击"Further configuration available"
5. 设置Content directory为"src/main/webapp"
6. 点击"OK" → "Apply and Close"
```

## 3. 配置数据库连接

### 3.1 配置 MySQL 数据库

```
1. 确保MySQL服务已启动
2. 创建数据库：
   CREATE DATABASE insurance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
3. 执行database/schema.sql和database/sample_data.sql脚本
```

### 3.2 检查数据库配置

```
文件：src/main/java/com/insurance/util/DatabaseUtil.java
确认以下配置：
- DB_URL: jdbc:mysql://localhost:3306/insurance_system
- DB_USER: root
- DB_PASSWORD: password
```

## 4. 启动和调试项目

### 4.1 添加项目到 Tomcat 服务器

```
1. 打开Servers视图：Window → Show View → Servers
2. 右键空白处 → New → Server
3. 选择Apache Tomcat v8.x
4. 将项目添加到服务器配置中
5. 点击"Finish"
```

### 4.2 启动服务器

```
1. 在Servers视图中右键服务器
2. 选择"Start"
3. 或者点击工具栏上的启动按钮
```

### 4.3 访问应用程序

```
默认访问地址：http://localhost:8080/java1.8-Velocity/
登录页面：http://localhost:8080/java1.8-Velocity/login.jsp
```

## 5. 调试代码

### 5.1 设置断点

```
1. 在Java代码编辑器中，点击行号左侧的灰色区域
2. 出现蓝色圆点表示断点已设置
3. 可以设置多个断点
```

### 5.2 启动调试模式

```
1. 在Servers视图中右键服务器
2. 选择"Debug"
3. 或者点击调试按钮（虫子图标）
```

### 5.3 使用调试工具

```
调试控制台中的主要按钮：
- Resume (F8)：继续执行
- Step Over (F6)：单步跳过
- Step Into (F5)：单步进入
- Step Return (F7)：单步返回
- Terminate：终止调试
```

## 6. 查看调试信息

### 6.1 使用 Console 视图

```
1. Window → Show View → Console
2. 查看应用程序输出和错误信息
3. 可以查看Tomcat启动日志
```

### 6.2 使用 Variables 视图

```
1. Window → Show View → Variables
2. 查看当前作用域内的变量值
3. 可以监控变量的变化
```

### 6.3 使用 Breakpoints 视图

```
1. Window → Show View → Breakpoints
2. 管理所有断点
3. 可以启用/禁用断点
```

## 7. 测试修改效果

### 7.1 修改代码后重新部署

```
1. 保存修改的文件 (Ctrl+S)
2. 项目会自动重新部署到Tomcat
3. 或者手动右键项目 → Refresh
```

### 7.2 清理和重新构建

```
1. 菜单栏：Project → Clean
2. 选择要清理的项目
3. 点击"OK"
4. 项目会重新编译
```

### 7.3 重启服务器

```
1. 在Servers视图中右键服务器
2. 选择"Restart"
3. 确保所有修改生效
```

## 8. 常见问题解决

### 8.1 端口冲突

```
问题：端口8080已被占用
解决：
1. 在Servers视图中双击服务器配置
2. 修改HTTP/1.1端口号（如8081）
3. 重启服务器
```

### 8.2 数据库连接问题

```
问题：无法连接到数据库
解决：
1. 检查MySQL服务是否启动
2. 验证DatabaseUtil.java中的连接参数
3. 检查MySQL用户权限
```

### 8.3 类路径问题

```
问题：ClassNotFoundException或NoClassDefFoundError
解决：
1. 右键项目 → Properties → Java Build Path
2. 检查Libraries选项卡
3. 确保所有必需的JAR包都已添加
```

## 9. 性能监控

### 9.1 启用 Tomcat 日志

```
1. 在Servers视图中双击Tomcat服务器
2. 点击"Open launch configuration"
3. 在Arguments选项卡中添加JVM参数：
   -Dcom.sun.management.jmxremote
   -Dcom.sun.management.jmxremote.port=9999
   -Dcom.sun.management.jmxremote.authenticate=false
   -Dcom.sun.management.jmxremote.ssl=false
```

### 9.2 使用 Eclipse Memory Analyzer

```
1. 安装Eclipse MAT插件
2. 创建堆转储文件进行内存分析
3. 检测内存泄漏问题
```

## 10. 最佳实践

### 10.1 代码调试建议

```
1. 使用日志记录关键信息
2. 合理设置断点，避免影响程序流程
3. 使用条件断点进行精确调试
4. 定期清理不需要的断点
```

### 10.2 性能优化

```
1. 监控内存使用情况
2. 优化数据库查询
3. 使用连接池管理数据库连接
4. 避免内存泄漏
```

通过以上步骤，您可以在 Eclipse 中完整地开发、调试和测试 Java Web 应用程序，实时查看代码修改的效果。
