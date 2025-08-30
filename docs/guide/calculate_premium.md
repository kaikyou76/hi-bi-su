# MySQL 存储过程：`calculate_premium` 详解

```sql
-- 创建存储过程：计算保险料率
DELIMITER //
CREATE PROCEDURE calculate_premium(
    IN p_product_id INT,
    IN p_gender ENUM('M', 'F'),
    IN p_entry_age INT,
    IN p_insurance_period INT,
    IN p_insured_amount DECIMAL(12,2),
    OUT p_monthly_premium DECIMAL(10,2),
    OUT p_annual_premium DECIMAL(10,2)
)
BEGIN
    DECLARE v_base_rate DECIMAL(10,6);
    DECLARE v_loading_rate DECIMAL(10,6);
    DECLARE v_rate_factor DECIMAL(10,6);
    DECLARE v_base_premium DECIMAL(12,2);

    -- 获取料率
    SELECT base_rate, loading_rate
    INTO v_base_rate, v_loading_rate
    FROM premium_rates
    WHERE product_id = p_product_id
      AND gender = p_gender
      AND entry_age = p_entry_age
      AND insurance_period = p_insurance_period
      AND valid_from <= CURDATE()
      AND (valid_to IS NULL OR valid_to >= CURDATE())
    LIMIT 1;

    -- 计算料率系数
    SET v_rate_factor = v_base_rate + v_loading_rate;

    -- 计算基础保费
    SET v_base_premium = p_insured_amount * v_rate_factor;

    -- 计算月保费和年保费
    SET p_monthly_premium = v_base_premium / 12;
    SET p_annual_premium = v_base_premium;

END //
DELIMITER ;
```

## MySQL 存储过程：`calculate_premium` 详解

这段代码是一个 MySQL 存储过程（Stored Procedure），名为 `calculate_premium`，用于计算保险保费。它封装了从数据库查询费率、计算保费的完整逻辑，对外提供输入输出参数接口。以下是详细解析：

---

## 一、存储过程基本信息

**作用**：根据输入的保险产品信息和用户特征，计算并返回月保费和年保费。  
**调用方式**：通过 `CALL calculate_premium(参数1, 参数2, ..., @月保费, @年保费)` 调用，获取输出参数结果。

---

## 二、参数解析（输入/输出）

| 参数名               | 类型             | 方向 | 说明                                        |
| -------------------- | ---------------- | ---- | ------------------------------------------- |
| `p_product_id`       | `INT`            | IN   | 输入：保险产品 ID（关联具体产品）           |
| `p_gender`           | `ENUM('M', 'F')` | IN   | 输入：性别（'M'男性/'F'女性，限定枚举值）   |
| `p_entry_age`        | `INT`            | IN   | 输入：投保年龄（用户购买保险时的年龄）      |
| `p_insurance_period` | `INT`            | IN   | 输入：保险期限（保障年限，如 10 年、20 年） |
| `p_insured_amount`   | `DECIMAL(12,2)`  | IN   | 输入：保险金额（保额，单位：元）            |
| `p_monthly_premium`  | `DECIMAL(10,2)`  | OUT  | 输出：月保费（计算结果，保留 2 位小数）     |
| `p_annual_premium`   | `DECIMAL(10,2)`  | OUT  | 输出：年保费（计算结果，保留 2 位小数）     |

---

## 三、局部变量（内部使用）

| 变量名           | 类型            | 作用                                          |
| ---------------- | --------------- | --------------------------------------------- |
| `v_base_rate`    | `DECIMAL(10,6)` | 存储从数据库查询的基础费率（如 0.00125）      |
| `v_loading_rate` | `DECIMAL(10,6)` | 存储从数据库查询的附加费率（额外风险加成）    |
| `v_rate_factor`  | `DECIMAL(10,6)` | 费率系数（基础费率+附加费率，合计风险系数）   |
| `v_base_premium` | `DECIMAL(12,2)` | 基础保费（保险金额 × 费率系数，即年保费基数） |

---

## 四、核心逻辑分步解析

### 1. 获取费率数据（从数据库查询）

```sql
SELECT base_rate, loading_rate
INTO v_base_rate, v_loading_rate
FROM premium_rates
WHERE
  product_id = p_product_id          -- 匹配产品ID
  AND gender = p_gender              -- 匹配性别
  AND entry_age = p_entry_age        -- 匹配投保年龄
  AND insurance_period = p_insurance_period  -- 匹配保险期限
  AND valid_from <= CURDATE()        -- 费率已生效（生效日期 ≤ 今天）
  AND (valid_to IS NULL OR valid_to >= CURDATE())  -- 费率未过期（无过期日或过期日 ≥ 今天）
LIMIT 1;  -- 只取一条有效费率记录
```

**作用**：从 `premium_rates`（保险费率表）中查询当前有效的、匹配用户特征的基础费率和附加费率。

---

### 2. 计算费率系数

```sql
SET v_rate_factor = v_base_rate + v_loading_rate;  -- 总费率 = 基础费率 + 附加费率
```

**示例**：若基础费率为 0.00125，附加费率为 0.00025，则总费率系数为 0.0015。

---

### 3. 计算基础保费

```sql
SET v_base_premium = p_insured_amount * v_rate_factor;  -- 基础保费 = 保险金额 × 总费率系数
```

**示例**：保险金额 100 万元 × 总费率 0.0015 = 基础保费 1500 元（年保费基数）。

---

### 4. 计算月保费和年保费

```sql
SET p_monthly_premium = v_base_premium / 12;  -- 月保费 = 基础保费 ÷ 12
SET p_annual_premium = v_base_premium;        -- 年保费 = 基础保费
```

**示例**：基础保费 1500 元 → 月保费 125 元，年保费 1500 元。

---

## 五、存储过程的作用与优势

1. **封装业务逻辑**：将保费计算规则集中在数据库层，避免在应用代码中重复实现。
2. **保证计算一致性**：所有保费计算通过同一存储过程执行，避免多端实现差异。
3. **提高执行效率**：减少应用与数据库的交互次数（一次调用完成多步操作）。
4. **安全性**：通过存储过程权限控制，避免直接暴露表结构和敏感费率数据。

---

## 六、调用示例

```sql
-- 声明变量接收输出结果
SET @monthly = 0;
SET @annual = 0;

-- 调用存储过程（产品ID=1，男性，30岁，保20年，保额50万）
CALL calculate_premium(1, 'M', 30, 20, 500000.00, @monthly, @annual);

-- 查看结果
SELECT @monthly AS 月保费, @annual AS 年保费;
```

**输出**：月保费 62.50 元，年保费 750.00 元（假设总费率系数为 0.0015）。

---

## 总结

这个存储过程是保险系统的核心计算组件，通过查询匹配的费率 → 计算总费率 → 根据保额计算保费的流程，实现了保费的自动化、标准化计算。理解它需要结合保险业务中的“费率表”概念（不同产品、年龄、性别对应不同费率），以及数据库存储过程的基本语法。

```

```

とても良い質問です 👍
これは **Java コード** と **MySQL ストアドプロシージャ** が連携して「保険料を計算する」仕組みを作っています。
ひとつずつ整理して関係を見てみましょう。

---

## ① Java 側のコード

```java
private static double calculateNewPremium(int productId, String gender, int entryAge,
                                          int insurancePeriod, double insuredAmount) {
    try {
        String sql = "CALL calculate_premium(?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseUtil.getConnection();
             PreparedStatement pstmt = conn.prepareCall(sql)) {

            // 入力パラメータをセット
            pstmt.setInt(1, productId);
            pstmt.setString(2, gender);
            pstmt.setInt(3, entryAge);
            pstmt.setInt(4, insurancePeriod);
            pstmt.setDouble(5, insuredAmount);

            // 出力パラメータを登録
            pstmt.registerOutParameter(6, java.sql.Types.DECIMAL); // 月額保険料
            pstmt.registerOutParameter(7, java.sql.Types.DECIMAL); // 年額保険料（今回は使わない）

            pstmt.execute();

            return pstmt.getDouble(6); // 月額保険料を返す
        }
    } catch (SQLException e) {
        System.err.println("保险费计算错误: " + e.getMessage());
        return -1;
    }
}
```

👉 つまり Java は **ストアドプロシージャ `calculate_premium` を呼び出すための橋渡し** をしているだけです。

- 入力値を渡す (`setInt`, `setString`, `setDouble`)
- 出力値を受け取る (`getDouble`)

---

## ② MySQL のストアドプロシージャ

```sql
CREATE PROCEDURE calculate_premium(
    IN p_product_id INT,
    IN p_gender ENUM('M', 'F'),
    IN p_entry_age INT,
    IN p_insurance_period INT,
    IN p_insured_amount DECIMAL(12,2),
    OUT p_monthly_premium DECIMAL(10,2),
    OUT p_annual_premium DECIMAL(10,2)
)
BEGIN
    DECLARE v_base_rate DECIMAL(10,6);
    DECLARE v_loading_rate DECIMAL(10,6);
    DECLARE v_rate_factor DECIMAL(10,6);
    DECLARE v_base_premium DECIMAL(12,2);

    -- 料率を取得
    SELECT base_rate, loading_rate
    INTO v_base_rate, v_loading_rate
    FROM premium_rates
    WHERE product_id = p_product_id
      AND gender = p_gender
      AND entry_age = p_entry_age
      AND insurance_period = p_insurance_period
      AND valid_from <= CURDATE()
      AND (valid_to IS NULL OR valid_to >= CURDATE())
    LIMIT 1;

    -- 料率係数 = 基本料率 + 付加料率
    SET v_rate_factor = v_base_rate + v_loading_rate;

    -- 基本保険料 = 保険金額 × 料率
    SET v_base_premium = p_insured_amount * v_rate_factor;

    -- 月額保険料と年額保険料を算出
    SET p_monthly_premium = v_base_premium / 12;
    SET p_annual_premium = v_base_premium;
END;
```

👉 こちらは **実際の保険料を計算するロジック** を持っています。

1. `premium_rates` テーブルから該当条件の料率を取ってくる
2. 料率から基礎保険料を計算する
3. 月額・年額保険料を求め、**OUT パラメータ**に返す

---

## ③ Java と MySQL の関係まとめ

- Java 側：ただの「利用者」

  - 必要な情報（商品 ID・性別・年齢・保険期間・保険金額）を渡す
  - 計算済みの「月額保険料・年額保険料」を受け取る

- MySQL 側：本当の「計算担当」

  - データベース内の料率表を参照し
  - ロジックを実行して
  - 結果を Java に返す

---

## ④ メリット

- **ロジックを DB に集約できる**
  → Java 側は SQL を呼ぶだけなのでシンプル
- **料率テーブルの変更に強い**
  → DB 内のストアドプロシージャを直せば即反映
- **再利用しやすい**
  → 他のシステムからも同じストアドを呼べば同じ結果

---

✅ つまり、
「Java が計算している」のではなく、
「MySQL ストアドプロシージャに計算を丸投げしている」
という構図なんです。

---

ご質問なのですが、次に知りたいのは **この仕組みを業務でどう活用するか（メリット/デメリット）** ですか？
それとも **ストアドを Java でデバッグ・テストする方法** の方に興味がありますか？
