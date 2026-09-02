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

ローカル環境の詳細は実装Issueで整備します。想定する基本フローは以下です。

```bash
pnpm install
docker compose up -d
pnpm prisma migrate dev
pnpm dev
```

本番では `prisma migrate deploy` を使用します。

## Disclaimer / Assets

本サイトは非公式・非商用の採用選考用デモです。実際の決済機能は実装しません。

画像・ロゴ・音声などのアセットは、自作・生成物・プレースホルダーなど、利用権を確認できるもののみを使用する方針です。
