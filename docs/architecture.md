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

ルートには最小限の `QueryClientProvider` を配置し、商品詳細の在庫に連動する状態バッジと
購入パネルをClient ComponentとしてAPIへ接続する。商品本体の初期表示は引き続き
Server Componentでサーバー関数を直接呼び出す。

商品詳細では在庫Queryの結果を在庫数だけでなく、販売状態バッジ、購入CTA、カートへ
追加できる数量上限にも使用する。再取得後に在庫が減少または売り切れた場合、初期HTMLの
在庫値を購入UIへ残さない。Loading中または最終取得失敗時は、未確認の在庫を根拠に
カートへ追加できないよう購入操作を表示しない。

在庫Queryは次の境界を共有する。

- Query key: `["product", productId, "inventory"]`
- 30秒の `staleTime`
- 通信エラーと5xxのみ最大2回Retry
- stale状態でwindow focusした場合にrefetch
- 注文処理から利用できる商品単位のinvalidation helper

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

カート画面ではhydrate後の商品IDごとに同じInventory Queryを購読する。最新在庫が0と
確認できた商品だけをZustandと`localStorage`から自動削除し、画面には対象商品名と理由を
赤文字で残す。QueryがLoadingまたはErrorの間は、通信失敗を在庫切れと誤認して削除しない。
削除通知は検出時に`sessionStorage`へ保存し、同じタブ内では画面遷移や再読み込み後も
利用者が「×」で閉じるまで表示する。カート本体の永続データとは保存期間を分離する。

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

DB接続文字列はサーバー専用環境変数で切り替える。実行時のPrismaPgは
`DATABASE_URL`（Neon pooled接続）、Prisma CLIは`DIRECT_URL`（同じDBのdirect接続）を使用する。
`DIRECT_URL`が空または未設定ならローカル互換のため`DATABASE_URL`へfallbackする。
両方未設定のlocalhost fallbackはClient生成用で、本番migrationの接続先として使用しない。
本番運用は[本番DB基盤](production-database.md)を参照する。

既存の`postinstall`でPrisma Clientを生成する。migrationは明示的な運用操作とし、
Next.js buildやPreview buildから本番DBへ自動適用しない。

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

Inventory Route Handlerは商品なしを `PRODUCT_NOT_FOUND` / 404へ変換し、その他の
例外は内部詳細を伏せた `INTERNAL_ERROR` / 500へ変換する。クライアントは404と
一時的な取得失敗を異なる文言で表示し、どちらも最終失敗後に手動再取得を提供する。
