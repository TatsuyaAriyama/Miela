import Link from "next/link";
import { requireMaker } from "@/server/auth";
import { listOrders } from "@/server/flows";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { daysUntil, formatDateJa } from "@/lib/format";
import { sizeLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = { title: "注文一覧" };

export default async function DashboardPage() {
  const { maker, db } = await requireMaker();
  const orders = await listOrders(db, maker.id);
  const active = orders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled",
  );
  const closed = orders.filter(
    (o) => o.status === "completed" || o.status === "cancelled",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">注文一覧</h1>
        <Button asChild>
          <Link href="/orders/new">＋ 新規注文</Link>
        </Button>
      </div>

      {active.length === 0 && closed.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            まだ注文がありません。「新規注文」から受注フォームリンクを発行して、
            お客様に送りましょう。
          </CardContent>
        </Card>
      ) : null}

      <ul className="space-y-3">
        {active.map((order) => {
          const days =
            order.deliveryDate != null ? daysUntil(order.deliveryDate) : null;
          return (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="block">
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {order.title || "（無題の注文）"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {order.customerName ? `${order.customerName} 様` : "お客様未定"}
                        {order.sizeGo ? ` ・ ${sizeLabel(order.sizeGo)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusBadge status={order.status} />
                      <p className="text-sm">
                        {formatDateJa(order.deliveryDate)}
                        {days != null ? (
                          <span
                            className={cn(
                              "ml-1.5 text-xs",
                              days <= 3 ? "font-semibold text-rose-600" : "text-muted-foreground",
                            )}
                          >
                            {days === 0
                              ? "本日"
                              : days > 0
                                ? `あと${days}日`
                                : `${-days}日前`}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      {closed.length > 0 ? (
        <details className="pt-2">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            完了・キャンセル（{closed.length}件）
          </summary>
          <ul className="mt-3 space-y-3">
            {closed.map((order) => (
              <li key={order.id}>
                <Link href={`/orders/${order.id}`} className="block">
                  <Card className="opacity-70 transition-opacity hover:opacity-100">
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {order.title || "（無題の注文）"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {order.customerName ? `${order.customerName} 様` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusBadge status={order.status} />
                        <p className="text-sm text-muted-foreground">
                          {formatDateJa(order.deliveryDate)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
