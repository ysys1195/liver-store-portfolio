# アーキテクチャ設計

## 1. 全体構成

```text
Browser
  |
  v
Next.js
  |
  +-- Server Components
  |     |- TOP
  |     |- 商品一覧
  |     `- 商品詳細の初期表示
  |
  +-- Client Components
  |     |- カート
  |     |- 在庫再取得
  |     `- Flash Sale Simulation
  |
  +-- BFF / Route Handlers
        |- Inventory
        |- Orders
        `- Demo
  |
  v
Prisma
  |
  v
PostgreSQL
  |- Local: Docker Compose
  `- Production: Neon Postgres
```

## 2. 設計方針

### クライアントを信用しない

Chrome DevToolsなどからリクエスト内容は確認・改変できる。

そのため、BFFを「APIを隠すため」に導入するのではなく、以下をサーバー側へ閉じ込めるために使用する。

- DB接続情報
- 商品価格の確定
- 在庫判定
- 販売期間判定
- 購入上限判定
- Idempotency判定
- 在庫減算
- 注文作成
- 内部エラー情報

クライアントから送信された価格などは注文金額計算に使用しない。

### Server Components

初期表示で完結するデータ取得はServer Componentsからサーバー関数を呼び出す。

不要な内部APIを増やさず、初期HTML生成に必要なデータをサーバー側で取得する。

### Client Components

ユーザー操作や継続的な状態更新が必要な範囲のみClient Componentsにする。

例:

- カート
- 数量変更
- 在庫再取得
- 購入Mutation
- Flash Sale Simulation

## 3. Server State / Client State

### TanStack Query

サーバー由来で再取得・stale管理が必要な状態に使用する。

例:

- 商品在庫
- 購入後の最新商品状態
- Retryが必要なデータ

### Zustand

サーバーに永続化する必要のないクライアント状態に使用する。

例:

- カート
- localStorageへのカート永続化

カートの永続データはClient Componentのmount後にhydrateし、Server ComponentのHTMLとの
不一致を避ける。保存値は改変・破損している可能性があるため、復元時に項目の型を検証し、
数量を保存済みの在庫上限内へ補正する。価格・在庫の保存値は画面表示と事前の数量制限だけに
用い、将来の注文処理ではDBから取得した値を正とする。ブラウザ設定などで
`localStorage` が利用できない場合は、永続化せずメモリ上のカートとして動作を継続する。

## 4. 環境

### Local

```text
Next.js
  |
  v
Prisma
  |
  v
Docker PostgreSQL
```

開発者はDocker Composeにより同じPostgreSQL環境を再現する。

### Production

```text
Vercel
  |
  v
Next.js / Route Handlers
  |
  v
Prisma
  |
  v
Neon PostgreSQL
```

DB接続文字列は環境変数で切り替える。

## 5. Migration

開発:

```bash
pnpm prisma migrate dev
```

本番:

```bash
pnpm prisma migrate deploy
```

MigrationファイルはGit管理する。

## 6. Authentication / Access Control

Next.js 16のリクエスト境界であるProxy（従来のMiddleware）でBasic認証を行う。

認証情報はサーバー専用の環境変数 `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`
で管理し、リポジトリやクライアントbundleには含めない。認証情報が未設定の場合も
fail closedとしてアクセスを拒否する。静的アセットと、クローラーへ拒否方針を伝える
`robots.txt` のみ認証対象外とする。

ローカル開発では `NODE_ENV=development` かつ `DISABLE_BASIC_AUTH=true` の場合に限り、
開発体験のためBasic認証を省略できる。通常の開発サーバーは `127.0.0.1` だけで待ち受け、
ネットワークレベルでも別端末からの接続を防ぐ。LANへ意図的に公開する場合は
`DISABLE_BASIC_AUTH=false` を必須とする。Preview・本番環境では
`DISABLE_BASIC_AUTH` の値にかかわらず認証を必須とする。

さらに以下を併用する。

- Disclaimer Modal
- `noindex, nofollow`
- `robots.txt`
- 全ページの非公式表記

## 7. エラー設計

内部エラーをそのままレスポンスしない。

APIレスポンスではクライアントが処理可能なエラーコードを返す。

例:

```json
{
  "code": "OUT_OF_STOCK",
  "message": "商品は直前に売り切れました。"
}
```

ログには詳細を残し、UI向けメッセージと分離する。
