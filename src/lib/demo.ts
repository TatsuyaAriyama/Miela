import path from "node:path";

/**
 * ローカルデモモード。
 * `MIELA_DEMO=1` のとき、Supabase を使わずに
 *   - DB: PGlite（プロセス内Postgres、ディスク永続）
 *   - 認証: 固定のデモ作家（ログイン不要）
 *   - Storage: ローカルファイル
 * で全フローを動かせるようにする。本番挙動には一切影響しない。
 */
export const IS_DEMO = process.env.MIELA_DEMO === "1";

/** デモ作家（Supabase Auth user の代わり） */
export const DEMO_MAKER = {
  id: "00000000-0000-4000-8000-0000000d3300",
  shopName: "cake atelier miel（デモ）",
  displayName: "みえ",
} as const;

const DEMO_ROOT = path.join(process.cwd(), ".miela-demo");

// DB はインメモリPGlite（demo-db.ts）なのでディレクトリ不要。Storage のみディスクを使う。
export const DEMO_STORAGE_DIR = path.join(DEMO_ROOT, "storage");
