# Miela（ミエラ）

オーダーケーキ（センイルケーキ・レタリングケーキ等）を個人受注している作家向けの、
**受注 + デザイン確認ツール**。

核となる価値は **「作る前に、仕上がりイメージを客と確定させる」** こと。
DMと口頭でのやり取りによるイメージ違い・作り直しを防ぎます。

## コアフロー

1. 作家が「新規注文」を作成 → **受注フォームリンク** を発行し、お客様の LINE / DM に送る
2. お客様がリンクを開き、希望日・サイズ・味・アレルギー・参考画像・要望を入力（認証不要）
3. 作家がエディタで **デザインモック** を作成（土台・レタリング・デコパーツ・参考画像の下敷き）
4. **確認リンク** をお客様に共有
5. お客様が「このデザインでOK」or「修正してほしい（コメント付き）」を返す
6. OKで **デザイン確定（ロック）**。**製作仕様シート**（A4印刷対応）が見られるようになる

## 技術スタック

- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui（Radix）
- Supabase（Postgres / Auth / Storage、RLS有効）
- Drizzle ORM + drizzle-kit
- react-konva（モックエディタ）
- Zod（フォーム・API バリデーション）
- Vitest + PGlite（コアフローの integration テスト）

## セットアップ

### 1. 依存関係

Node.js 20 以上が必要です。

```bash
npm install
```

### 2. Supabase プロジェクト

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. **Authentication → Providers → Email** を有効化
   - 開発中は「Confirm email」をオフにするとメール確認なしでログインできて楽です
3. **Project Settings → API** から URL / anon key / service_role key を控える
4. **Project Settings → Database** から接続文字列（Direct または Session pooler。
   Vercel 等 serverless では Transaction pooler 推奨）を控える

### 3. 環境変数

```bash
cp .env.example .env.local
```

`.env.local` に控えた値を設定します。

| 変数 | 内容 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role キー（**サーバー専用・秘匿**） |
| `DATABASE_URL` | Postgres 接続文字列 |
| `NEXT_PUBLIC_APP_URL` | 共有リンクの生成に使う公開 URL |

### 4. マイグレーションと RLS

```bash
# テーブル作成（drizzle/ 配下のSQLを適用）
npm run db:migrate
```

続いて Supabase ダッシュボードの **SQL Editor** で
[`supabase/rls.sql`](supabase/rls.sql) を実行してください。
RLS ポリシーの適用と、Storage バケット
（`order-images` / `mocks`、どちらも非公開）の作成を行います。

### 5. ローカル起動

```bash
npm run dev
```

http://localhost:3000 を開き、`/signup` で作家アカウントを登録すると
ダッシュボードに入れます。

> DB なしでエディタだけ触りたい場合は http://localhost:3000/dev/editor-preview
> （開発ビルド限定・本番では404）。

## スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 型チェック |
| `npm test` | コアフローの integration テスト（PGlite 使用、Supabase 不要） |
| `npm run db:generate` | スキーマ変更から SQL マイグレーション生成 |
| `npm run db:migrate` | マイグレーション適用（`DATABASE_URL` が必要） |

## セキュリティ設計

- 作家ページは Supabase Auth（メール+パスワード）+ middleware で保護
- 客側ページ（`/f/[token]`, `/r/[token]`）は認証なし。
  `nanoid` 24文字の推測不能トークンを `share_tokens` テーブルで管理し、
  **サーバー側（Route Handler / Server Component）でのみ検証**
- リンクは再発行すると旧トークンが失効
- DB 書き込みはすべてサーバー側（Server Actions / Route Handlers）で Zod 検証後に実行。
  anon キーで直接テーブルには触れない（RLS で全拒否）
- Storage は非公開バケット + サーバー発行の署名付きURLのみで表示

## ディレクトリ構成（抜粋）

```
src/
  app/
    (maker)/            # 作家側（要ログイン）
      dashboard/        # 注文一覧
      orders/new        # 注文作成
      orders/[id]       # 注文詳細（リンク発行・履歴・応答）
      orders/[id]/editor# モックエディタ
      orders/[id]/spec  # 製作仕様シート（A4印刷対応）
    f/[token]/          # 客: 受注フォーム
    r/[token]/          # 客: デザイン確認
    api/form/[token]    # フォーム送信（画像アップロード含む）
    api/review/[token]  # 確認応答（OK / 修正依頼）
  components/editor/    # react-konva エディタ
  db/                   # Drizzle スキーマ
  lib/                  # 定数・バリデーション・シーンモデル・Supabaseクライアント
  server/               # フロー関数（テスト対象）・Server Actions
supabase/rls.sql        # RLS ポリシー + Storage バケット
drizzle/                # SQL マイグレーション
tests/core-flow.test.ts # コアフロー integration テスト
```

## スコープ外（MVP）

決済・通知（メール/LINE）・複数店舗/スタッフ管理・客側アカウント・自由描画等の
高度なエディタ機能は実装していません。

## デプロイ（Vercel）

現在の公開先: **https://miela-one.vercel.app**

Supabase の環境変数を設定するまでは、トップページ以外は
「準備中（`/setup`）」の案内にフォールバックします（500 にはなりません）。
本番を機能させる手順:

### 1. Supabase プロジェクト作成（要ブラウザ操作）

上記「セットアップ 2」を実施し、URL / anon key / service_role key / 接続文字列を控える。

### 2. マイグレーションと RLS の適用

手元に本番の `DATABASE_URL` を入れて実行:

```bash
# .env.local の DATABASE_URL を本番Supabaseの接続文字列にして
npm run db:migrate
```

その後 Supabase の **SQL Editor** で [`supabase/rls.sql`](supabase/rls.sql) を実行
（RLS ポリシー + Storage バケット `order-images` / `mocks` を作成）。

### 3. Vercel に環境変数を設定

**Project → Settings → Environment Variables** に5つを登録:

| 変数 | 値 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role キー |
| `DATABASE_URL` | 接続文字列（serverless では **Transaction pooler / 6543** 推奨） |
| `NEXT_PUBLIC_APP_URL` | `https://miela-one.vercel.app`（独自ドメイン取得後はそちら） |

> ⚠️ `NEXT_PUBLIC_*` はビルド時に埋め込まれるため、
> **設定後に必ず再デプロイ**（Deployments → Redeploy）が必要です。

> ⚠️ `MIELA_DEMO` は **設定しないこと**。ローカル専用のデモDB（インメモリ）で、
> serverless では状態が保持されず機能しません。

### 4. Supabase 側の仕上げ

- **Authentication → URL Configuration** に本番URLを追加
- 独自ドメイン（例: `miela.app`）取得後は Vercel の **Domains** に追加し、
  `NEXT_PUBLIC_APP_URL` を更新して再デプロイ

### コスト（無料枠の目安）

| サービス | 無料枠 | 注意 |
| --- | --- | --- |
| Vercel Hobby | 無料 | 非商用・個人利用が前提（商用は Pro / $20/月） |
| Supabase Free | 無料 | 7日間アクセスが無いとプロジェクトが自動停止 |
| ドメイン | 有料 | `miela.app` は年 $14〜20 程度（任意） |
