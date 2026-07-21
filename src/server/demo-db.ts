import "server-only";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { DEMO_MAKER, IS_DEMO } from "@/lib/demo";
import { ensureMaker } from "./flows";

/** デモモードのときだけ PGlite を初期化する（本番では何もしない no-op）。
 *  各エントリポイント（getDb を呼ぶ前）で await する。 */
export async function ensureDemoReady(): Promise<void> {
  if (!IS_DEMO) return;
  await initDemoDb();
}

type GlobalDemo = {
  mielaDemoDb?: Db;
  mielaDemoInit?: Promise<Db>;
};

const g = globalThis as unknown as GlobalDemo;

/** デモ用 PGlite の drizzle インスタンス（初期化済みを返す。多重初期化を防ぐ） */
export async function initDemoDb(): Promise<Db> {
  if (g.mielaDemoDb) return g.mielaDemoDb;
  if (g.mielaDemoInit) return g.mielaDemoInit;

  g.mielaDemoInit = (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");

    // インメモリ（この Node 環境ではファイル永続化が不安定なため）。
    // プロセス内 global にキャッシュするので稼働中は保持され、
    // サーバー再起動時のみリセットされる。
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: "drizzle" });
    await ensureMaker(db, {
      id: DEMO_MAKER.id,
      shopName: DEMO_MAKER.shopName,
      displayName: DEMO_MAKER.displayName,
    });

    g.mielaDemoDb = db;
    return db;
  })();

  // 失敗した初期化はキャッシュしない（次回リトライできるように）
  g.mielaDemoInit.catch(() => {
    g.mielaDemoInit = undefined;
  });

  return g.mielaDemoInit;
}
