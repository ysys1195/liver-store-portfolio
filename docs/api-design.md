# API設計

## 1. 方針

初期表示用の商品データは可能な範囲でServer Componentsからサーバー関数を直接呼び出す。

ブラウザからのHTTP通信が必要な処理のみBFF APIとして公開する。

クライアントからの値は信用せず、Zodで検証する。

## 2. GET `/api/products/:productId/inventory`

商品在庫の最新状態を取得する。

### Use Case

- 商品詳細の在庫再取得
- TanStack Queryによるstale data更新
- window focus時のrefetch
- 409 Conflict後の再取得

### Response: 200

```json
{
  "productId": "yui-birthday-2026",
  "stock": 3,
  "status": "on_sale",
  "updatedAt": "2026-09-02T00:00:00.000Z"
}
```

- `status` はDBの `stock` と販売期間からサーバー側で導出する
- 常に最新状態を問い合わせるため、HTTPレスポンスは `Cache-Control: private, no-store` とする
- ブラウザ側の短時間キャッシュと再取得はTanStack Queryで制御する

### Error

#### 404

```json
{
  "code": "PRODUCT_NOT_FOUND",
  "message": "商品が見つかりません。"
}
```

#### 500

```json
{
  "code": "INTERNAL_ERROR",
  "message": "在庫情報を取得できませんでした。時間をおいて再度お試しください。"
}
```

DBエラー、接続情報、stack traceなどの内部詳細はレスポンスへ含めない。

## 3. POST `/api/orders`

注文を作成する。

### Request

```json
{
  "items": [
    {
      "productId": "yui-birthday-2026",
      "quantity": 1
    }
  ],
  "idempotencyKey": "uuid"
}
```

クライアントから価格は送信しない。

### Server Responsibilities

1. Zodによる入力検証
2. Idempotency Keyの確認
3. 商品取得
4. 販売期間確認
5. 購入数量確認
6. DB上の価格を使った注文金額算出
7. 在庫の条件付き減算
8. 注文作成
9. Order Item作成
10. Idempotency記録
11. Transaction commit

### Success: 201

```json
{
  "orderId": "order_xxx",
  "status": "completed",
  "totalAmount": 1000
}
```

### Duplicate Request: 200

同じIdempotency Keyで既に注文が作成済みの場合、既存注文を返す。

```json
{
  "orderId": "order_xxx",
  "status": "completed",
  "totalAmount": 1000,
  "replayed": true
}
```

### Validation Error: 400

```json
{
  "code": "INVALID_REQUEST",
  "message": "入力内容を確認してください。"
}
```

### Out of Stock: 409

```json
{
  "code": "OUT_OF_STOCK",
  "message": "商品は直前に売り切れました。"
}
```

### Not on Sale: 409

```json
{
  "code": "NOT_ON_SALE",
  "message": "現在この商品は購入できません。"
}
```

### Unexpected Error: 500

```json
{
  "code": "INTERNAL_ERROR",
  "message": "注文処理に失敗しました。時間をおいて再度お試しください。"
}
```

内部エラー詳細は返さない。

## 4. POST `/api/demo/reset`

Flash Sale Simulation用の商品状態を初期化する。

Basic認証配下のみで利用する。

### Request

```json
{
  "productId": "yui-birthday-2026"
}
```

### Response

```json
{
  "productId": "yui-birthday-2026",
  "stock": 5
}
```

## 5. Retry Policy

### GET

- 在庫Queryの `staleTime` は30秒とする
- 通信エラーと5xxはTanStack Queryで最大2回まで自動Retryする
- 404などの恒久的なクライアントエラーは自動Retryしない
- staleなQueryはwindow focus時に再取得する
- 最終失敗後は手動Retry UIを表示する
- Query keyは `["product", productId, "inventory"]` とし、注文処理から商品単位でinvalidateできるようにする

### POST `/api/orders`

- 単純な無条件Retryは行わない
- 再送が必要な場合は同一Idempotency Keyを使用する

## 6. HTTP Status

| Status | Usage |
| --- | --- |
| 200 | 取得成功 / Idempotency replay |
| 201 | 注文作成成功 |
| 400 | 入力不正 |
| 404 | 商品なし |
| 409 | 在庫競合 / 販売状態競合 |
| 500 | 想定外エラー |
