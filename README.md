# Liver Store Portfolio

VTuber / Virtual Liver 向けECストアを題材にした、採用選考用の非公式ポートフォリオです。

人気商品の販売開始直後に発生しうるアクセス集中を想定し、フロントエンドのUI実装だけでなく、在庫競合、二重注文、stale data、APIキャッシュ、Retry、エラーハンドリングまで含めたEC体験を設計・実装します。

> [!IMPORTANT]
> 本プロジェクトは採用選考用に個人で制作する非公式ポートフォリオです。
> ANYCOLOR株式会社、にじさんじ、および各公式サービスとは関係ありません。
> 掲載する商品はデモ用であり、実際の販売・注文・決済は行いません。

## Goals

- React / Next.js / TypeScript を用いたフロントエンド設計・実装力を示す
- BFFを介した安全なデータアクセスと入力検証を実装する
- 人気商品販売時の在庫競合と二重注文を再現し、DBレベルで整合性を保つ
- Loading / Retry / Error / Cache / stale data を含む実運用を意識したUXを実装する
- 複数人開発を想定し、Dockerとドキュメントでローカル環境を再現可能にする
- Issueベースで開発を進め、設計判断と実装履歴を追跡可能にする

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js / React / TypeScript |
| Package Manager | pnpm |
| Styling | Tailwind CSS |
| Server State | TanStack Query |
| Client State | Zustand |
| Validation | Zod |
| ORM | Prisma |
| Database | PostgreSQL |
| Local DB | Docker Compose + PostgreSQL |
| Production DB | Neon Postgres |
| Hosting | Vercel |
| Authentication | Basic Authentication via Next.js Proxy |
| Unit / Component Test | Vitest / React Testing Library |
| E2E | Playwright |

## Architecture

```text
Browser
  |
  v
Next.js
  |- Server Components
  |- Client Components
  |- BFF / Route Handlers
  |
  v
Prisma
  |
  v
PostgreSQL
  |- Local: Docker
  `- Production: Neon
```

クライアントからの入力は改ざん可能であることを前提とし、価格・在庫・販売期間・購入上限などの重要な判定はサーバー側で行います。

## MVP

- Basic認証
- 初回表示時の非公式ポートフォリオ確認モーダル
- TOP
- 商品一覧
- 商品詳細
- カート
- Demo Checkout
- 複数ライバー対応データモデル
- 商品在庫・販売期間表示
- Loading / Retry / エラー表示
- TanStack QueryによるAPIキャッシュ・stale data制御
- ボタン連打防止
- Idempotency Keyによる二重注文防止
- PostgreSQLでの原子的な在庫更新による在庫競合制御
- Flash Sale Simulation

## Documentation

- [要件定義](docs/requirements.md)
- [画面遷移・ワイヤーフレーム](docs/screen-flow.md)
- [アーキテクチャ](docs/architecture.md)
- [API設計](docs/api-design.md)
- [DB設計](docs/database-design.md)
- [本番DB基盤・migration運用](docs/production-database.md)
- [アクセス集中デモ設計](docs/flash-sale-design.md)
- [Issue計画](docs/issue-plan.md)

## Development Policy

開発はGitHub Issue単位で進めます。

1. Issueで目的・受け入れ条件を定義
2. Issue単位でブランチを作成
3. 実装・テスト
4. Pull Requestで変更内容と設計判断を記録
5. レビュー後にmainへマージ

## Local Development

### 必要な環境

- Node.js 20.19.0 / 22.12.0 以上、または 24.0.0 以上
- Corepack（pnpm 10.34.5 を `packageManager` で固定）
- Docker Desktop など、Docker Compose を実行できる環境

### セットアップ

```bash
corepack enable
pnpm install
cp .env.example .env
# .env の BASIC_AUTH_USER / BASIC_AUTH_PASSWORD を任意の値へ変更
docker compose up -d
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

起動後、[http://localhost:3000](http://localhost:3000) をブラウザで開き、
ローカル開発では `.env` の `DISABLE_BASIC_AUTH=true` によりBasic認証なしで表示できます。
`DISABLE_BASIC_AUTH=false` にすると、`.env` に設定したBasic認証情報の入力が必要です。
認証情報が未設定、または一致しない場合は `401 Unauthorized` となり、アプリは表示されません。

`DISABLE_BASIC_AUTH=true` が認証を無効化するのは `NODE_ENV=development` の場合だけです。
通常の `pnpm dev` は `127.0.0.1` だけで待ち受けるため、認証を省略しても別端末からは
接続できません。Preview・本番環境ではこの値にかかわらずBasic認証を必須とし、
認証情報がない場合もfail closedでアクセスを拒否します。

スマートフォンなど同一LANの別端末から確認する場合は、先に `.env` の
`DISABLE_BASIC_AUTH=false` へ変更してから、次のように明示的に起動してください。

```bash
pnpm exec next dev --hostname 0.0.0.0
```

`.env` は Git 管理外です（`.env.example` のみ管理対象）。ローカル用の値だけを設定し、秘密情報や本番の認証情報は記載しないでください。
Basic認証情報は `NEXT_PUBLIC_` を付けず、必ずサーバー専用環境変数として設定します。

### アクセス制限・非公式表記の確認

- 未認証または誤った認証情報では `401 Unauthorized` が返る
- loopbackだけで待ち受ける通常のローカル開発では、`DISABLE_BASIC_AUTH=true` の場合に認証を省略できる
- LANへ公開するときは `DISABLE_BASIC_AUTH=false` にしてBasic認証を有効化する
- 正しい認証情報ではTOPが表示され、初回のみ必須Disclaimerが表示される
- 「内容を確認しました」を選ぶと、同じブラウザセッション内では再表示されない
- 全ページ共通Footerに非公式・非商用デモである旨が表示される
- ページのrobots metadataが `noindex, nofollow` で、`/robots.txt` が全クロールを拒否する

環境変数を変更した場合は開発サーバーを再起動してください。確認時にBasic認証情報を
コマンド履歴へ残したくない場合は、ブラウザの認証ダイアログを使用してください。

### Prisma / Database setup

`prisma/schema.prisma` をDBスキーマのsource of truthとし、`prisma/migrations` をGit管理します。初回セットアップではPostgreSQLが`healthy`になった後、migrationとseedを順に実行してください。

```bash
pnpm prisma migrate dev
pnpm prisma db seed
```

seedは再実行可能です。夜風ユイを含む架空ライバー、デモ商品、`ProductLiver`による関連をupsertし、最後に各商品へ紐付くライバー名を表示します。Prisma Clientだけを再生成する場合は次を実行します。

```bash
pnpm prisma generate
```

商品とライバーの多対多関連は、seedの出力に加えて次のSQLでも確認できます。

```bash
docker compose exec postgres psql -U liver_store -d liver_store -c \
  "SELECT p.name AS product, string_agg(l.name, ', ' ORDER BY l.name) AS livers FROM product_livers pl JOIN products p ON p.id = pl.product_id JOIN livers l ON l.id = pl.liver_id GROUP BY p.id, p.name ORDER BY p.id;"
```

schema変更時は`prisma/schema.prisma`を更新してから、名前付きmigrationを作成します。生成されたSQLを確認し、migrationファイルも変更と一緒にコミットしてください。

```bash
pnpm prisma migrate dev --name describe_change
```

### PostgreSQL

PostgreSQL は `docker compose up -d` でバックグラウンド起動します。コンテナの状態は次のコマンドで確認できます。`postgres` サービスが `healthy` になれば起動完了です。

```bash
docker compose ps
```

次のコマンドで PostgreSQL へ接続し、接続先のデータベース名を確認できます。

```bash
docker compose exec postgres psql -U liver_store -d liver_store -c "SELECT current_database();"
```

`.env` の `POSTGRES_USER` または `POSTGRES_DB` を変更した場合は、接続確認コマンドの値も合わせて変更してください。`POSTGRES_PORT` を変更する場合は `DATABASE_URL` のポートも同じ値にします。

コンテナを停止・削除するには次のコマンドを実行します。データは `postgres_data` named volume に保持されるため、その後にコンテナを再作成しても引き継がれます。

```bash
docker compose down
docker compose up -d
```

ローカル DB をデータごと完全に削除してリセットする場合は、named volume も削除します。この操作で削除したデータは復元できません。

```bash
docker compose down --volumes
docker compose up -d
```

### コマンド

| Command                   | Description                  |
| ------------------------- | ---------------------------- |
| `pnpm dev`                | 開発サーバーを起動           |
| `pnpm build`              | 本番用ビルドを作成           |
| `pnpm start`              | ビルド済みアプリを起動       |
| `pnpm test`               | Vitestを実行                 |
| `pnpm lint`               | ESLintを実行                 |
| `pnpm typecheck`          | TypeScriptの型チェックを実行 |
| `pnpm format`             | Prettierでコードを整形       |
| `pnpm format:check`       | Prettierの整形差分を確認     |
| `pnpm prisma generate`    | Prisma Clientを生成          |
| `pnpm prisma migrate dev` | 開発DBへmigrationを適用      |
| `pnpm prisma db seed`     | デモデータを投入             |

### 基本ディレクトリ

```text
src/
├── app/          # App Routerのページ・レイアウト
├── components/   # 共通UIコンポーネント
├── lib/          # 共通ロジック・サーバー処理
├── stores/       # Zustandによるクライアント状態
└── types/        # 共通の型定義
```

## Disclaimer / Assets

本サイトは非公式・非商用の採用選考用デモです。実際の決済機能は実装しません。

画像・ロゴ・音声などのアセットは、自作・生成物・プレースホルダーなど、利用権を確認できるもののみを使用する方針です。

## 注文APIのローカル実DB検証

Issue #8の注文APIはデモ用注文と在庫更新のみを扱います。Checkoutから送信し、結果不明時は同じタブに保存したキーで再確認できます。実決済・配送はありません。

実DBテストは通常の`pnpm test`ではskipされます。専用Docker DBを起動し、明示的に指定してください（以下は使い捨てローカル検証専用の認証値）。本番URLは指定しないでください。

```bash
docker run --name liver-issue8-test -e POSTGRES_USER=issue8 -e POSTGRES_PASSWORD=issue8_local -e POSTGRES_DB=issue8_test -p 127.0.0.1:55428:5432 -d postgres:17-alpine
# pg_isreadyで起動完了を確認してから実行
docker exec liver-issue8-test pg_isready -U issue8 -d issue8_test
DATABASE_URL=postgresql://issue8:issue8_local@localhost:55428/issue8_test DIRECT_URL=postgresql://issue8:issue8_local@localhost:55428/issue8_test pnpm prisma migrate deploy
ORDER_TEST_DATABASE_URL=postgresql://issue8:issue8_local@localhost:55428/issue8_test pnpm test
```

テストはloopbackかつDB名`issue8_test`のみ許容し、実行ごとの識別子を持つテストデータだけを作成・削除します。通常の`DATABASE_URL`はテスト先に使いません。
同時注文・同一キー再送・rollback・DB価格・販売期間・購入上限・非負CHECKを検証します。本番Neonのdeploy・seed・注文確認はIssue #11の残作業です。
