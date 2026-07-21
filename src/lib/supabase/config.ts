/**
 * Supabase の接続情報が実際に設定されているか。
 * 未設定（例: Vercel で環境変数を入れる前）でもアプリが 500 で落ちないよう、
 * middleware / 認証まわりでこの判定を使ってグレースフルに分岐する。
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      anonKey &&
      !url.includes("dummy") &&
      !anonKey.includes("dummy"),
  );
}
