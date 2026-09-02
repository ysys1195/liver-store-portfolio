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
| Authentication | Basic Authentication via Next.js Middleware |
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

- Node.js 20.9.0 以上
- Corepack（pnpm 10.34.5 を `packageManager` で固定）
- Docker Desktop など、Docker Compose を実行できる環境

### セットアップ

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

起動後、[http://localhost:3000](http://localhost:3000) をブラウザで開いてください。

`.env` は Git 管理外です（`.env.example` のみ管理対象）。ローカル用の値だけを設定し、秘密情報や本番の認証情報は記載しないでください。

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

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `pnpm dev`          | 開発サーバーを起動           |
| `pnpm build`        | 本番用ビルドを作成           |
| `pnpm start`        | ビルド済みアプリを起動       |
| `pnpm lint`         | ESLintを実行                 |
| `pnpm typecheck`    | TypeScriptの型チェックを実行 |
| `pnpm format`       | Prettierでコードを整形       |
| `pnpm format:check` | Prettierの整形差分を確認     |

### 基本ディレクトリ

```text
src/
├── app/          # App Routerのページ・レイアウト
├── components/   # 共通UIコンポーネント
├── lib/          # 共通ロジック・サーバー処理
└── types/        # 共通の型定義
```

## Disclaimer / Assets

本サイトは非公式・非商用の採用選考用デモです。実際の決済機能は実装しません。

画像・ロゴ・音声などのアセットは、自作・生成物・プレースホルダーなど、利用権を確認できるもののみを使用する方針です。
