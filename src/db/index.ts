import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * アプリ内で使う DB 型。
 * postgres-js（本番）と PGlite（テスト）のどちらのインスタンスも受け付けられるよう、
 * フロー関数はこの基底型を引数に取る。
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as {
  mielaDb: PostgresJsDatabase<typeof schema> | undefined;
  mielaDemoDb: Db | undefined;
};

export function getDb(): Db {
  // デモモード: instrumentation で初期化済みの PGlite を返す
  if (process.env.MIELA_DEMO === "1") {
    if (globalForDb.mielaDemoDb) return globalForDb.mielaDemoDb;
    throw new Error("デモDBが初期化されていません（サーバー再起動をお試しください）");
  }
  if (globalForDb.mielaDb) return globalForDb.mielaDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(url, { prepare: false });
  const db = drizzle(client, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.mielaDb = db;
  }
  return db;
}
