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
Sold Out          10
Duplicate          5
Remaining Stock    0
Actual Orders      5
```

Issue #9では10個のUUIDを各2回送信する固定20件。各注文は対象商品1点のみ。成功済みキーの再送だけをDuplicateとして数え、在庫切れで注文が作られなかったキーの重複送信はSold Outに数える。

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
Flash Sale画面・reset APIは下記Issue #9で実装。本番Neonで競合負荷テスト・reset・seed再投入は行わない。

## Issue #9 実装と実行手順

`/demo/flash-sale` はフッターから開く。非公式の説明と初回Disclaimerを表示する。
「在庫を5にリセット」→「20件を並行送信」→結果表示の順で操作する。

- ブラウザから`Promise.allSettled`で既存の`POST /api/orders`へ送信する。サーバーの注文処理・価格検証・原子的な在庫減算・冪等処理は複製しない。
- リセットは対象商品だけの在庫・販売期間を初期化する。商品row lock下で、在庫5と累計注文数・数量を同じtransactionの基準値として返す。過去の注文とキー、他の商品は保持する。
- 実行後は商品Inventory Queryをinvalidateし、`GET /api/demo/state`から在庫・注文数・数量を同じDB snapshotで再取得する。
- 新規作成応答、在庫競合、冪等リプレイ、その他エラー、結果不明、応答のユニーク注文数、DB差分注文数、残在庫を表示する。
- `残在庫 + DB差分購入数量 = 5`、`DB差分注文数 = DB差分購入数量 = 応答のユニーク注文数`を検証する。結果不明や取得失敗中は「未確認」、不一致は別操作の混在などを案内し、成功と表示しない。整合性の一致は全20応答の成功を意味しない（在庫競合は期待結果）。
- TanStack Queryのmutationは自動Retryなし、操作中のdisabledと同期ガードで多重操作を防ぐ。注文キー・基準値・結果をsessionStorageへ保存し、通信失敗/5xx/タイムアウトは同じキーで手動再確認する。確定済み応答は再送しない。結果不明がある間はリセット不可。
- 再読み込み後は保存済み実行を復元し、自動注文は送らない。保存不可・破損時は送信を停止する。結果再取得だけのボタンも用意する。POST/GETとも15秒の通信期限を設けるが、abortはサーバーの注文取消を意味しない。

### 安全なローカル環境

本番Neonでは実行しない。通常の開発DBとも分け、loopback上の`liver_store_demo`を用意する。既存Docker Composeを起動している場合の例:

```bash
docker compose exec postgres createdb -U liver_store liver_store_demo
```

ローカル`.env`の`DATABASE_URL`のDB名を`liver_store_demo`へ変更し、`DIRECT_URL`は空にする。
`ENABLE_FLASH_SALE_DEMO=true`にして、専用DBへの接続を確認してから以下を実行する。

```bash
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm dev
```

`NODE_ENV=production`またはVercelではフラグにかかわらず拒否する。接続先はloopback、DB名は`liver_store_demo`/テスト専用`issue9_test`のみを許可する。POSTはJSONとsame-originのOriginを必須とし、Basic認証の開発時例外は既存方針を引き継ぐ。通常の`pnpm dev`はloopback限定。このリセットAPIはブラウザのOrigin/Hostもloopbackに限定するため、LANの別端末からは実行できない。

### 制約

これは1人ずつ実行する20件の機能デモ。複数タブ/閲覧者の実行を分離するrunモデルは設けない。同じ商品の通常注文や別のリセットが混在すると、DB差分との照合が不一致になる場合がある。最終値は取得した時点のsnapshotであり、その後の変更を監視するものではない。
リセットの応答を失った場合は、注文送信前に手動でリセットを再試行できる。注文履歴・キーは実行のたびに蓄積する。公開本番用のリセット機能や大規模負荷試験、実決済は含めない。

### 自動テスト

`pnpm test`でAPIの入力/環境/Originガード、集計、UI状態、再送キー保持を検証する。実DBテストは明示的な環境変数を指定した場合のみ実行し、既存の`DATABASE_URL`へは接続しない。

- `ORDER_TEST_DATABASE_URL`: loopbackの`issue8_test`（既存注文テスト）
- `FLASH_SALE_TEST_DATABASE_URL`: loopbackの`issue9_test`（リセットと20並行デモ）

両DBにmigrationを適用後、上記変数を指定して`pnpm test`を実行する。Flash Sale統合テストは対象商品が既存の場合に上書きせず失敗し、自分で作成したテストデータだけを後片付けする。
