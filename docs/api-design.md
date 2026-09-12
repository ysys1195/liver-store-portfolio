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

クライアントから価格は送信しない。改変リクエストの価格・合計等の未知フィールドはZodで除外し、DB価格だけで計算する。

`idempotencyKey`はJSON body内の必須UUID（小文字へ正規化）。itemsは1〜50件、productIdは1〜200文字、quantityは1〜2,147,483,647の整数。同一商品IDの重複行は400とする。金額がPostgreSQL Int上限を超える場合も400で全体をrollbackする。

同一キーは商品ID・数量の組が一致する場合だけ200で既存結果を返す（配列順は無視）。価格変更・売り切れ後も注文時の金額を返す。異なる内容でのキー再利用は409 `IDEMPOTENCY_KEY_CONFLICT`。成功したキーは期限を設けず保持する。

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

### Other errors

- 商品が存在しない：404 `PRODUCT_NOT_FOUND`
- DBの`purchaseLimit`を超える数量：409 `PURCHASE_LIMIT_EXCEEDED`
- 同一キー・異なる商品ID/数量：409 `IDEMPOTENCY_KEY_CONFLICT`

`purchaseLimit`は商品ごとの1注文あたり上限。NULLは追加上限なし。在庫と販売期間の制限は常に適用する。アカウント単位や累計の制限は扱わない。
全レスポンスを`Cache-Control: private, no-store`とする。

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
- 再送が必要な場合は同一Idempotency Keyと同じitemsを使用する
- Checkoutは送信前にキー・itemsをsessionStorageへ保存し、同じタブの再読み込み後も復元する
- 通信失敗・5xx・不正な成功レスポンスでは結果不明としてキーを維持し、手動で再確認する。自動Retryはしない
- 確定した400/404/409失敗は新規注文を作成しない。内容不一致のキー競合は既存注文があるためキーを保持し、それ以外はカートを修正して次の論理注文を開始できる。409後は全対象商品のInventory Queryをinvalidate/refetchし、最新在庫を表示する
- 成功結果も同じタブに保持し、再読み込みだけでは新しい注文を送らない
- ブラウザ保存が利用できない場合は送信しない。保存データが破損している場合も新しいキーで送信しない
- キーの保存範囲は同じタブ。別タブの独立操作や保存データの手動削除を同じ論理注文として識別する機能はない

## 6. HTTP Status

| Status | Usage |
| --- | --- |
| 200 | 取得成功 / Idempotency replay |
| 201 | 注文作成成功 |
| 400 | 入力不正 |
| 404 | 商品なし |
| 409 | 在庫競合 / 販売状態競合 |
| 500 | 想定外エラー |

### Checkoutの通信待機・操作表示

- 注文mutationは`networkMode: always`とし、オフラインで待機した注文をオンライン復帰時に自動送信しない。通信失敗時は同じキー・内容での手動再確認を案内する。
- 注文リクエストはレスポンス本文の取得まで含めて15秒でタイムアウトし、fetchをabortする。これはサーバー側の注文取消を意味しないため、キーを保持し結果不明として扱う。
- 在庫refetchは注文mutationの完了を待たせず、独立したQueryでloading・errorを表示する。再取得失敗時は保存済みの古い在庫を「最新」と表示せず、手動再取得を表示する。
- 確定ボタンは有効時にホバーで色を変え、ポインターを表示する。無効時は薄く表示し、禁止カーソルにする。キーボード操作時にはフォーカス枠を表示する。
