import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export const metadata = { title: "セットアップ" };

export default function SetupPage() {
  // 設定済みなら本来のダッシュボードへ
  if (isSupabaseConfigured()) redirect("/dashboard");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="space-y-2">
        <p className="text-sm tracking-widest text-primary">Miela</p>
        <h1 className="text-2xl font-semibold">準備中です 🧁</h1>
        <p className="text-sm text-muted-foreground">
          サービスのセットアップ（データベース接続）がまだ完了していません。
        </p>
      </div>

      <div className="w-full max-w-md rounded-lg border bg-card p-5 text-left text-sm leading-relaxed text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">
          管理者の方へ：以下を設定すると有効になります
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Supabase で無料プロジェクトを作成</li>
          <li>
            マイグレーション適用（<code>npm run db:migrate</code>）＋{" "}
            <code>supabase/rls.sql</code> 実行 ＋ Storageバケット作成
          </li>
          <li>
            ホスティング（Vercel）に環境変数を設定して再デプロイ（
            <code>.env.example</code> 参照）
          </li>
        </ol>
      </div>

      <Button asChild variant="outline">
        <Link href="/">トップへ戻る</Link>
      </Button>
    </main>
  );
}
