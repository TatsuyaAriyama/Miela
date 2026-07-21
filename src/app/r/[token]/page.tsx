import type { Metadata } from "next";
/* eslint-disable @next/next/no-img-element -- 署名付きURLのため next/image は使わない */
import { getDb } from "@/db";
import { ensureDemoReady } from "@/server/demo-db";
import { getMaker, getReviewState } from "@/server/flows";
import { TOKEN_PATTERN } from "@/lib/tokens";
import { BUCKET_MOCKS, createSignedUrl } from "@/lib/supabase/storage";
import {
  CustomerShell,
  InvalidLinkCard,
  MessageCard,
} from "@/components/customer-shell";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateJa } from "@/lib/format";
import { SHAPE_META, sizeLabel } from "@/lib/constants";
import { ReviewActions } from "./review-actions";

export const metadata: Metadata = { title: "デザイン確認" };

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) {
    return (
      <CustomerShell>
        <InvalidLinkCard />
      </CustomerShell>
    );
  }

  await ensureDemoReady();
  const db = getDb();
  const state = await getReviewState(db, token);
  if (!state) {
    return (
      <CustomerShell>
        <InvalidLinkCard />
      </CustomerShell>
    );
  }

  const { order, mock, approval } = state;
  const maker = await getMaker(db, order.makerId);
  const shopName = maker?.shopName ?? "";

  if (order.status === "cancelled") {
    return (
      <CustomerShell shopName={shopName}>
        <MessageCard
          title="この注文はキャンセルされました"
          body="お手数ですが、作家までお問い合わせください。"
        />
      </CustomerShell>
    );
  }

  const pngUrl = mock.pngPath
    ? await createSignedUrl(BUCKET_MOCKS, mock.pngPath)
    : null;

  const isConfirmed =
    order.status === "approved" || order.status === "completed";
  const isRevisionSent = !isConfirmed && approval?.status === "revision_requested";

  return (
    <CustomerShell shopName={shopName}>
      <div className="space-y-4">
        <div className="text-center">
          <h1 className="font-medium">デザインのご確認</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ver.{mock.version}
            {order.customerName ? ` ・ ${order.customerName} 様` : ""}
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {pngUrl ? (
              <img
                src={pngUrl}
                alt={`ケーキのデザイン案 バージョン${mock.version}`}
                className="aspect-square w-full bg-white object-contain"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-sm text-muted-foreground">
                画像を準備中です
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">お受け取り日</dt>
                <dd>{formatDateJa(order.deliveryDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">サイズ・形</dt>
                <dd>
                  {order.sizeGo ? sizeLabel(order.sizeGo) : "—"}
                  {order.shape ? ` / ${SHAPE_META[order.shape].label}` : ""}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">味</dt>
                <dd>{order.flavor ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {isConfirmed ? (
          <MessageCard
            title="このデザインで確定済みです ✓"
            body="ご確認ありがとうございました。当日を楽しみにお待ちください。"
          />
        ) : isRevisionSent ? (
          <MessageCard
            title="修正のご依頼を受け付けました"
            body="作家がデザインを修正したら、あらためて確認のご連絡をお送りします。"
          />
        ) : (
          <ReviewActions token={token} />
        )}
      </div>
    </CustomerShell>
  );
}
