import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm tracking-widest text-primary">
          オーダーケーキ受注 & デザイン確認
        </p>
        <h1 className="text-5xl font-semibold tracking-tight">Miela</h1>
        <p className="text-muted-foreground">ミエラ — 作る前に、仕上がりを確定。</p>
      </div>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        受注フォームの発行、デザインモックの作成、お客様の承認までを1つのリンクで。
        DMのやり取りによるイメージ違い・作り直しを防ぎます。
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/signup">無料ではじめる</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">ログイン</Link>
        </Button>
      </div>
    </main>
  );
}
