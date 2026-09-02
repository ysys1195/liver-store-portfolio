# GitHub Issue Plan

実装順にIssueを進める。

---

## Issue 1: [Setup] Next.js / pnpm / Tailwind の初期環境を構築する

### 目的

Next.js + TypeScript + pnpm + Tailwind CSS の開発環境を構築する。

### 対応内容

- Next.js + TypeScript
- pnpm固定
- Tailwind CSS
- ESLint / formatter
- `.gitignore`
- `.env.example`
- 基本ディレクトリ構成

### 受け入れ条件

- [ ] `pnpm install` 成功
- [ ] `pnpm dev` で起動
- [ ] Tailwind適用確認
- [ ] `.env` がGit管理外
- [ ] READMEに起動手順

---

## Issue 2: [Infra] Docker ComposeでローカルPostgreSQL環境を構築する

### 対応内容

- `compose.yaml`
- PostgreSQL
- Volume
- `.env.example`
- 起動・停止手順

### 受け入れ条件

- [ ] `docker compose up -d` でDB起動
- [ ] データ永続化
- [ ] チームメンバーがREADMEだけで再現可能

---

## Issue 3: [DB] Prismaを導入し複数ライバー対応スキーマを作成する

### 対応内容

- Prisma導入
- Liver
- Product
- ProductLiver
- Order
- OrderItem
- IdempotencyKey
- Migration
- Seed

### 受け入れ条件

- [ ] `prisma migrate dev` 成功
- [ ] Seedで夜風ユイと商品データ作成
- [ ] 商品とライバーの多対多が確認可能
- [ ] MigrationがGit管理される

---

## Issue 4: [Security] Basic認証と非公式ポートフォリオ表示を実装する

### 対応内容

- Next.js Middleware Basic Auth
- 認証情報を環境変数化
- Disclaimer Modal
- sessionStorage
- `noindex, nofollow`
- robots.txt
- Footer disclaimer

### 受け入れ条件

- [ ] 未認証ではアプリ閲覧不可
- [ ] 認証情報がクライアントbundleへ含まれない
- [ ] 初回TOPでDisclaimer必須
- [ ] 再訪セッションでは不要な再表示をしない
- [ ] 全ページで非公式表記確認

---

## Issue 5: [UI] TOP・商品一覧・商品詳細を実装する

### 対応内容

- Header
- Hero
- New Items
- Liver profile
- Product List
- Category Filter
- Product Detail
- Responsive

### 受け入れ条件

- [ ] TOPから商品一覧・詳細へ遷移可能
- [ ] HeaderロゴでTOPへ戻れる
- [ ] 販売状態がUIで判別可能
- [ ] Mobile/Desktop対応

---

## Issue 6: [Cart] Zustandでカート機能を実装する

### 対応内容

- Zustand
- localStorage persistence
- Add
- Quantity update
- Remove
- Empty state
- Subtotal

### 受け入れ条件

- [ ] 商品追加可能
- [ ] 数量変更可能
- [ ] 削除可能
- [ ] Refresh後も保持
- [ ] 在庫を超えた数量操作をUIで防止

---

## Issue 7: [Inventory] TanStack Queryで在庫取得・Cache・stale data制御を実装する

### 対応内容

- Inventory API
- TanStack Query
- staleTime
- Loading
- Retry
- Error UI
- refetch
- Query invalidation

### 受け入れ条件

- [ ] 在庫取得中にLoading表示
- [ ] GET失敗時Retry
- [ ] 最終失敗後に手動Retry
- [ ] staleな在庫を再取得可能
- [ ] エラー別のUI表示

---

## Issue 8: [Order] 注文APIのIdempotencyと在庫競合制御を実装する

### 対応内容

- `POST /api/orders`
- Zod
- DB価格参照
- Transaction
- Atomic inventory update
- Idempotency Key
- 409 Conflict
- Mutation pending中のボタンdisabled

### 受け入れ条件

- [ ] 同一Keyで注文が重複しない
- [ ] 在庫数を超えて注文成功しない
- [ ] stockが負数にならない
- [ ] stale在庫から購入した場合409
- [ ] 409後に在庫を再取得
- [ ] Clientから送った価格を信用しない

---

## Issue 9: [Demo] Flash Sale Simulationを実装する

### 対応内容

- `/demo/flash-sale`
- `POST /api/demo/reset`
- 20並行リクエスト
- 一部重複Idempotency Key
- 結果集計UI

### 受け入れ条件

- [ ] 初期在庫を5へReset可能
- [ ] 20件程度を並行送信可能
- [ ] 成功・競合・重複・残在庫を表示
- [ ] 最終在庫と注文数の整合性が取れる

---

## Issue 10: [Test] Unit / Component / E2Eテストを整備する

### Unit

- Product status
- 購入可能判定
- 金額計算
- Validation

### Component

- SOLD OUT CTA
- Loading
- Retry
- Cart

### E2E

```text
TOP
-> Product Detail
-> Add Cart
-> Cart
-> Order
-> Demo Checkout
```

### 受け入れ条件

- [ ] Vitest実行成功
- [ ] Testing Library実行成功
- [ ] Playwright主要フロー成功

---

## Issue 11: [Deploy] Vercel + Neonへデプロイする

### 対応内容

- Neon project
- Production DATABASE_URL
- Vercel
- Environment Variables
- `prisma migrate deploy`
- Basic認証

### 受け入れ条件

- [ ] Production deploy成功
- [ ] DB Migration成功
- [ ] Basic認証必須
- [ ] 本番で注文デモ動作

---

## Issue 12: [QA] アクセシビリティ・レスポンシブ・READMEを仕上げる

### 対応内容

- Keyboard操作
- Focus
- aria
- Responsive
- Error states
- README
- Architecture docs更新
- Screenshot
- Demo URL

### 受け入れ条件

- [ ] Mobile/Desktop確認
- [ ] キーボード主要操作可能
- [ ] READMEだけでプロジェクト意図が分かる
- [ ] 設計ドキュメントと実装の差分がない
