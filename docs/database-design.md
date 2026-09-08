# DB設計

## 1. 方針

MVP時点から複数ライバーとコラボ商品を扱える構造にする。

商品とライバーは多対多とし、夜風ユイ専用のスキーマにはしない。

## 2. ER

```text
livers
   |
   | 1
   v
product_livers
   ^
   | N
products
   |
   | 1
   v
order_items
   ^
   | N
orders
   |
   | 1
   v
idempotency_keys
```

より正確には `livers` と `products` が `product_livers` を介した多対多。

## 3. Tables

### livers

| Column | Type | Constraint |
| --- | --- | --- |
| id | String | PK |
| slug | String | UNIQUE |
| name | String | NOT NULL |
| description | String? | |
| image_url | String? | |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

### products

| Column | Type | Constraint |
| --- | --- | --- |
| id | String | PK |
| slug | String | UNIQUE |
| name | String | NOT NULL |
| description | String? | |
| price | Int | NOT NULL, >= 0 |
| stock | Int | NOT NULL, >= 0 |
| purchase_limit | Int? | 1注文あたりの購入上限。NULLは追加上限なし |
| category | Enum/String | NOT NULL |
| image_url | String? | |
| sales_start_at | DateTime | NOT NULL |
| sales_end_at | DateTime? | |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

`status` は保存せず、販売期間と在庫から導出する。

### product_livers

| Column | Type | Constraint |
| --- | --- | --- |
| product_id | String | FK |
| liver_id | String | FK |

複合主キー:

```text
(product_id, liver_id)
```

### orders

| Column | Type | Constraint |
| --- | --- | --- |
| id | String | PK |
| status | Enum/String | NOT NULL |
| total_amount | Int | NOT NULL |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

### order_items

| Column | Type | Constraint |
| --- | --- | --- |
| id | String | PK |
| order_id | String | FK |
| product_id | String | FK |
| product_name | String | NOT NULL |
| unit_price | Int | NOT NULL |
| quantity | Int | NOT NULL |
| subtotal | Int | NOT NULL |

`product_name` と `unit_price` は注文時点のスナップショットとして保持する。

### idempotency_keys

| Column | Type | Constraint |
| --- | --- | --- |
| key | String | PK / UNIQUE |
| order_id | String | FK / UNIQUE |
| created_at | DateTime | NOT NULL |

## 4. Product Status

DBへ状態文字列を重複保存せず、以下から導出する。

```text
now < sales_start_at
  -> upcoming

sales_start_at <= now
and (sales_end_at is null or now <= sales_end_at)
and stock > 0
  -> on_sale

stock = 0
  -> sold_out

sales_end_at < now
  -> ended
```

表示優先順位は実装時にテストで固定する。

## 5. Inventory Concurrency

注文時は事前SELECTだけを根拠にせず、条件付きUPDATEを使用する。

概念SQL:

```sql
UPDATE products
SET stock = stock - $quantity
WHERE id = $productId
  AND stock >= $quantity
RETURNING stock;
```

更新件数0件の場合は在庫不足として扱う。

在庫減算、Order作成、Order Item作成、Idempotency記録は同一Transactionで行う。

PrismaPgのinteractive transaction（Read Committed）内で、キーのhashに対する`pg_advisory_xact_lock`を取得してから既存注文を確認する。transaction単位のlockなのでpooled接続でsession lockを残さない。hash衝突は無関係なキーを直列化するだけで、キーの一致判定は既存PKを使う。

商品ID順で`SELECT ... FOR UPDATE`し、価格・販売期間・購入上限を読み取る。在庫はJavaScriptで判定せず、Prisma `updateMany`の`stock >= quantity`条件と`decrement`で原子的に減算する。固定順のrow lockは複数商品の逆順リクエストによるdeadlockを避け、注文途中の価格変更も防ぐ。更新0件や後続商品の失敗では全体rollbackする。既存stock非負CHECKも維持する。

同一キーの内容比較には既存OrderItemの商品ID・数量を正規化して使うため、request hash列は追加しない。注文金額・明細・キーはnested createで記録する。

Issue #8のmigrationはnullableな`purchase_limit`列の追加のみ。既存商品はNULLとなり、既存データの削除・書き換えは行わない。

## 6. Index

MVPで想定するIndex:

- `livers.slug` UNIQUE
- `products.slug` UNIQUE
- `products.sales_start_at`
- `products.sales_end_at`
- `product_livers.product_id`
- `product_livers.liver_id`
- `order_items.order_id`
- `order_items.product_id`
- `idempotency_keys.key` UNIQUE

実際のクエリパターンを確認し、不要なIndexは追加しすぎない。

## 7. Future Extension

MVPでは実装しないが、以下への拡張を想定する。

### Product Variants

```text
products
  |
  v
product_variants
  |
  v
inventories
```

サイズ・色・SKU単位で価格や在庫を持つ場合に分離する。

### Collections

```text
collections
  |
product_collections
  |
products
```

Birthday / Anniversary / Eventなどの企画単位で商品をまとめる。

## 8. Prisma

Prisma SchemaをDB構造のSingle Source of TruthとしてGit管理する。

Migration:

```bash
# development
pnpm prisma migrate dev

# production
pnpm prisma migrate deploy
```

本番ではNeonの同じbranch/databaseに対し、runtimeのpooled接続とmigrationのdirect接続を分ける。
接続変数、適用前後の確認、既存本番基盤の識別情報は[本番DB基盤・migration運用](production-database.md)を参照する。
