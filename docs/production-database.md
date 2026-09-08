# 本番DB基盤・migration運用

Issue #11の本番DB基盤のみの先行対応。Issue #8の注文API開発前に、Neon上の接続方式と既存schemaを確定する。
Production deploy、Basic認証の本番確認、注文デモ、注文API・在庫減算・idempotencyの実装は別対応とする。

## 既存基盤（2026-09-08確認）

| 項目 | 設定 |
| --- | --- |
| Neon organization | `ysys1195-personal`（Free） |
| Neon project | `liver-store-portfolio` / `wispy-scene-52412312` |
| Production branch | `production` / `br-damp-star-av9soalg` |
| Database / role | `neondb` / `neondb_owner` |
| PostgreSQL | 17（Dockerと同じmajor） |
| Region | AWS US East 1 / N. Virginia（既存Vercel `iad1`に合わせる） |
| Vercel project | `ysys1195s-projects/liver-store-portfolio`（既存を再利用） |

Neonの既存organizationと全2プロジェクトを確認し、同用途のDBがなかったため専用プロジェクトを1つ作成した。別用途の`course-tracker`と`grocery-price-log`は変更していない。Neon Authは無効。有料プランへの変更はしていない。
以後は上記を再利用し、作成前にorganization・project・branch・databaseを確認する。

## 環境変数

| 変数 | 用途・保管先 |
| --- | --- |
| `DATABASE_URL` | Next.jsサーバーのPrismaPg用。Neon Connectでproduction / neondb / neondb_ownerを選び、Connection poolingを有効にしたURL。VercelのProductionだけにSensitiveとして保存する。 |
| `DIRECT_URL` | Prisma CLI用。同じbranch/database/roleでConnection poolingを無効にしたURL。migrationを実行する管理端末の一時的な環境変数、または専用のsecret managerで管理する。 |

本番URLには`sslmode=verify-full`を使用し、TLSと証明書検証を有効にする。Neonが付加する`channel_binding=require`も保持する。
秘密値に`NEXT_PUBLIC_`を付けない。接続文字列・パスワード・トークンをコミット、PR、チャット、コマンド引数、シェル履歴、ログへ貼り付けない。
ローカル`.env`にはDocker用の値だけを保存する。ローカルの`DIRECT_URL=`は空でよい。

既存VercelのProduction/Preview共通`DATABASE_URL`を分離し、旧値はPreviewのみの設定として維持した。
新しいNeon接続はProduction専用のSensitive変数として登録済み。Previewには本番URLを渡さず、必要になった時点で隔離DBを用意する。
`POSTGRES_*`はDocker用であり、Next.jsの接続には使用しない。今回それらやBasic認証設定は変更していない。
`DIRECT_URL`はアプリ実行に不要なのでVercelへ追加していない。

Vercelの環境変数変更は既存Deploymentへ遡及しない。次回Production deployで使用される。今回Production deployは実行していない。

## Migration手順

1. 上記Neonの識別情報をConsoleで確認し、同じbranch/databaseのdirect URLを取得する。
2. 対象commitの`prisma/migrations`をレビューする。既存データがある場合は復元可能なバックアップ・Neonの復元範囲も確認する。ローカルやPreviewの接続先と取り違えない。
3. `pnpm install`を実行する（既存`postinstall`がPrisma Clientを生成する）。
4. 管理端末のzshで次を実行する。入力は非表示で、URLをコマンド履歴に残さない。

```zsh
read -rs 'DIRECT_URL?Neon production direct URL: '
print
export DIRECT_URL
pnpm db:migrate:status
pnpm db:migrate:deploy
pnpm db:migrate:status
unset DIRECT_URL
```

`db:migrate:deploy`は`pnpm prisma migrate deploy`、`db:migrate:status`は`pnpm prisma migrate status`の別名。
初回statusは未適用migrationのため非ゼロになり得る。deploy失敗時は先へ進めず、接続先とmigration状態を確認する。
値を再出力する`echo`、`printenv`、シェルの`set -x`は使わない。共有する実行結果には成功/失敗とmigration名だけを残し、エラーの生ログを貼らない。
作業後は失敗時も`unset DIRECT_URL`し、一時的に保存した秘密ファイルを削除する。

本番では`migrate dev`、`migrate reset`、`db push`を実行しない。migrationをbuild/postinstallへ組み込まず、Previewや依存インストールから本番DBを書き換えない。
新規schema変更はDockerでmigrationを作成してGit管理し、レビュー済みSQLを本番へ適用する。

## 適用後の読み取り確認

Neon SQL Editorで対象branch/databaseを確認して実行できる。

```sql
SELECT migration_name, checksum, finished_at, rolled_back_at
FROM _prisma_migrations
ORDER BY migration_name;

SELECT tablename FROM pg_tables WHERE schemaname = 'public';

SELECT conname, convalidated FROM pg_constraint
WHERE conrelid = 'products'::regclass AND contype = 'c';

SELECT indisunique, indisvalid FROM pg_index
WHERE indexrelid = 'idempotency_keys_order_id_key'::regclass;
```

`finished_at`が設定済み、`rolled_back_at`がNULLであることを確認する。checksumはリポジトリの各`migration.sql`のSHA-256と比較する。
在庫・価格のCHECK制約とidempotencyの一意indexを確認する。一意indexは`pg_constraint`ではなく`pg_index`で確認する。

## 実施結果・Issue #8への引き継ぎ

- 本番direct接続で`prisma migrate deploy`成功。`20260902090225_init`と`20260902090500_add_product_constraints`を適用した。
- `migrate status`はup to date。deploy再実行はNo pending migrations。
- direct / pooledの両方でTLS接続、migrationのchecksum一致、6業務tableとmigration管理table、在庫・価格CHECK、idempotencyのPKと一意indexを読み取り確認した。
- PrismaPgと生成済みPrisma Clientで、pooled接続のinteractive transaction内からProduct / Liver / Orderのcount取得に成功した（各0件）。注文作成や在庫更新は行っていない。
- seedは投入していない。既存seedは商品在庫・販売期間等をupsertで更新するため、後続のデモ公開準備で内容と対象DBを確認して別途実施する。

Issue #8はこのPostgreSQL 17 / PrismaPg / pooled runtime + direct migration構成を前提に開発できる。日常開発と競合・書き込みテストはDockerまたは隔離した検証DBを使用し、本番DBをテストでresetしない。
本番DBでの注文競合・idempotencyの動作確認は未実施であり、今回の接続成功はその正しさを保証しない。

Issue #11の残作業は、デモデータ準備、Production deploy、Basic認証必須の実機確認、Issue #8以降の注文デモ確認。今回のPRは`Refs #11`とし、Issueを閉じない。

## 参考

- [Prisma: database connections](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)
- [Neon: security overview](https://neon.com/docs/security/security-overview)
- [Vercel: environment variables](https://vercel.com/docs/environment-variables)
