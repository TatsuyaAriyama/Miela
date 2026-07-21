import Link from "next/link";
import { requireMaker } from "@/server/auth";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export default async function MakerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { maker } = await requireMaker();
  return (
    <div className="min-h-svh">
      <header className="print-hidden sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Miela
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {maker.shopName}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
