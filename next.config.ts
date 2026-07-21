import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite(WASM) はバンドルすると壊れるため外部化する（ローカルデモDB用）。
  // 本番(Supabase Postgres)では読み込まれない。
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
