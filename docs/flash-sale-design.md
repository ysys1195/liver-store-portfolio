# Flash Sale Simulation 設計

## 1. 目的

人気ライバーの記念グッズ販売開始直後を想定し、複数購入リクエストが同時に到達した場合でも在庫数と注文数の整合性が崩れないことをデモする。

大量負荷そのものを再現するのではなく、「並行リクエスト時の競合」を再現する。

## 2. シナリオ

```text
商品: Birthday Goods
初期在庫: 5
同時購入リクエスト: 20
```

期待結果例:

```text
Requests          20
Success            5
Sold Out          13
Duplicate          2
Remaining Stock    0
Actual Orders      5
```

重複リクエスト数はデモ設定により変更可能。

## 3. 通常購入フロー

```text
User
 |
 | 商品詳細表示
 v
Next.js
 |
 | 最新在庫取得
 v
PostgreSQL
 |
 v
User
 |
 | 購入
 v
Client
 |
 | Idempotency Key生成
 | POST /api/orders
 v
BFF
 |
 | validate
 | transaction begin
 | idempotency check
 | conditional stock update
 | create order
 | create order items
 | save idempotency
 | commit
 v
Client
 |
 | invalidate query
 v
最新在庫表示
```

## 4. アクセス集中デモフロー

```text
Recruiter
 |
 | Reset
 v
POST /api/demo/reset
 |
 v
stock = 5

Recruiter
 |
 | Run Simulation
 v
Browser
 |
 | Promise.allSettled(...)
 |
 +--> POST /api/orders #1
 +--> POST /api/orders #2
 +--> ...
 `--> POST /api/orders #20
          |
          v
       BFF群
          |
          v
     PostgreSQL
          |
          +-- 5 requests: stock update成功
          `-- remaining: update 0 rows / duplicate
          |
          v
       Results
```

## 5. 三層の防御

### 1. UI: ボタン連打防止

Mutation中はボタンをdisabledにする。

目的:

- 誤操作防止
- UX改善

これだけでは二重注文を完全には防げない。

### 2. API: Idempotency

同一操作の再送に同じIdempotency Keyを使用する。

目的:

- 通信再送
- 二重クリック
- タイムアウト後の再実行

による注文重複を防止する。

### 3. DB: Atomic Inventory Update

条件付きUPDATEにより、並行処理時も在庫を負数にしない。

目的:

- 同時購入による在庫競合をDBで解決する

## 6. stale data Scenario

```text
Browser cache
stock = 1

別ユーザー購入

DB
stock = 0

Browser
stock = 1 (stale)

購入実行
  |
  v
POST /api/orders
  |
  v
409 OUT_OF_STOCK
  |
  v
invalidateQueries
  |
  v
inventory refetch
  |
  v
SOLD OUT
```

画面表示を購入可否の最終根拠にしないことを示す。

## 7. Retry

### GET

自動Retry可能。

### POST Orders

無条件Retryではなく、Idempotency Keyを維持した再送のみ許容する。

## 8. デモ上の注意

- 実際に数万アクセスを発生させない
- 無料枠を消費する負荷試験を目的としない
- 20件程度の並行リクエストで競合ロジックを確認する
- Demo Reset APIはBasic認証下のみで利用する

## Issue #8の実装・検証境界

通常購入APIとCheckoutのpending・冪等再送・409後refetchを実装済み。キーのtransaction advisory lock、商品ID順のrow lock、条件付きstock decrement、注文とキーの同時commitで整合性を保つ。
隔離したDocker PostgreSQLで在庫5に対する20並行注文、同一キー10並行再送、複数商品のrollbackを自動テストする。`ORDER_TEST_DATABASE_URL`はloopbackの`issue8_test`だけを許容する。
Flash Sale画面・reset APIはIssue #9で実装し、本番Neonで競合負荷テスト・reset・seed再投入は行わない。
