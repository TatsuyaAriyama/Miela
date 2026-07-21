import { Card, CardContent } from "@/components/ui/card";

/** 客側ページ共通の枠。LINE内ブラウザ想定でとにかく軽く */
export function CustomerShell({
  shopName,
  children,
}: {
  shopName?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col px-4 py-6">
      <header className="mb-5 text-center">
        {shopName ? (
          <p className="text-base font-medium">{shopName}</p>
        ) : null}
        <p className="mt-0.5 text-[11px] tracking-widest text-muted-foreground">
          powered by Miela
        </p>
      </header>
      <div className="flex-1">{children}</div>
    </main>
  );
}

export function InvalidLinkCard() {
  return (
    <MessageCard
      title="リンクが無効です"
      body="リンクの有効期限が切れているか、URLが正しくない可能性があります。お手数ですが、作家までお問い合わせください。"
    />
  );
}

export function MessageCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 py-8 text-center">
        <p className="font-medium">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
