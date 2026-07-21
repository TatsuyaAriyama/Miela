import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./server";

let cached: SupabaseClient | undefined;

/**
 * service role の Supabase クライアント（Storage 操作・客側フロー用）。
 * サーバー専用。クライアントバンドルに含めてはならない。
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cached;
}
