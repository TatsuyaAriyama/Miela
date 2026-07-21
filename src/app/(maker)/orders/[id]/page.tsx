import Link from "next/link";
import { notFound } from "next/navigation";
/* eslint-disable @next/next/no-img-element -- 署名付きURL（有効期限あり）のため next/image 最適化は使わない */
import { requireMaker } from "@/server/auth";
import {
  getActiveToken,
  getOwnedOrder,
  listMocksWithApprovals,
  listOrderImages,
} from "@/server/flows";
import { appUrl } from "@/server/url";
import {
  BUCKET_MOCKS,
  BUCKET_ORDER_IMAGES,
  createSignedUrls,
} from "@/lib/supabase/storage";
import { StatusBadge } from "@/components/status-badge";
import { CopyButton } from "@/components/copy-button";
import {
  CancelOrderButton,
  CompleteOrderButton,
  IssueReviewLinkButton,
  ReissueFormLinkButton,
} from "@/components/order-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  allergenLabel,
  SHAPE_META,
  sizeLabel,
} from "@/lib/constants";
import { formatDateJa, formatDateTimeJa } from "@/lib/format";

export const metadata = { title: "注文詳細" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { maker, db } = await requireMaker();
  const order = await getOwnedOrder(db, id, maker.id);
  if (!order) notFound();

  const [images, mockHistory, formToken, reviewToken, base] = await Promise.all([
    listOrderImages(db, order.id),
    listMocksWithApprovals(db, order.id),
    getActiveToken(db, order.id, "form"),
    getActiveToken(db, order.id, "review"),
    appUrl(),
  ]);

  const [imageUrls, mockPngUrls] = await Promise.all([
    createSignedUrls(
      BUCKET_ORDER_IMAGES,
      images.map((i) => i.storagePath),
    ),
    createSignedUrls(
      BUCKET_MOCKS,
      mockHistory.flatMap((m) => (m.mock.pngPath ? [m.mock.pngPath] : [])),
    ),
  ]);

  const formUrl = formToken ? `${base}/f/${formToken}` : null;
  const reviewUrl = reviewToken ? `${base}/r/${reviewToken}` : null;
  const isClosed = order.status === "completed" || order.status === "cancelled";
  const isLocked = order.status === "approved" || isClosed;
  const hasMock = mockHistory.length > 0;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">
              {order.title || "（無題の注文）"}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customerName ? `${order.customerName} 様` : "お客様未定"} ・
            引き渡し {formatDateJa(order.deliveryDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isLocked ? (
            <Button asChild size="sm">
              <Link href={`/orders/${order.id}/editor`}>
                {hasMock ? "エディタで編集" : "モックを作成"}
              </Link>
            </Button>
          ) : null}
          {order.status === "approved" || order.status === "completed" ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/orders/${order.id}/spec`}>製作仕様シート</Link>
            </Button>
          ) : null}
          {order.status === "approved" ? (
            <CompleteOrderButton orderId={order.id} />
          ) : null}
          {!isClosed ? <CancelOrderButton orderId={order.id} /> : null}
        </div>
      </div>

      {/* 共有リンク */}
      {!isClosed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">共有リンク</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  受注フォーム
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    お客様が希望内容を入力するリンク
                  </span>
                </p>
                <div className="flex shrink-0 gap-2">
                  {formUrl ? <CopyButton text={formUrl} /> : null}
                  <ReissueFormLinkButton orderId={order.id} />
                </div>
              </div>
              {formUrl ? (
                <p className="truncate rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                  {formUrl}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">未発行</p>
              )}
            </div>
            <Separator />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  デザイン確認
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    最新モックにOK/修正依頼を返すリンク
                  </span>
                </p>
                <div className="flex shrink-0 gap-2">
                  {reviewUrl ? <CopyButton text={reviewUrl} /> : null}
                  {!isLocked ? (
                    <IssueReviewLinkButton
                      orderId={order.id}
                      hasMock={hasMock}
                      hasActiveLink={reviewUrl != null}
                    />
                  ) : null}
                </div>
              </div>
              {reviewUrl ? (
                <p className="truncate rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                  {reviewUrl}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {hasMock
                    ? "未発行。モックができたら発行してお客様に送りましょう"
                    : "モックを保存すると発行できます"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* お客様の入力内容 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">お客様の入力内容</CardTitle>
        </CardHeader>
        <CardContent>
          {order.status === "draft" || order.status === "awaiting_form" ? (
            <p className="text-sm text-muted-foreground">
              まだフォームの回答がありません
            </p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <InfoRow label="お名前" value={order.customerName ?? "—"} />
              <InfoRow
                label="希望日"
                value={formatDateJa(order.deliveryDate)}
              />
              <InfoRow
                label="サイズ"
                value={order.sizeGo ? sizeLabel(order.sizeGo) : "—"}
              />
              <InfoRow
                label="形"
                value={order.shape ? SHAPE_META[order.shape].label : "—"}
              />
              <InfoRow label="味" value={order.flavor ?? "—"} />
              <InfoRow
                label="アレルギー"
                value={
                  order.allergyItems.length > 0
                    ? order.allergyItems.map(allergenLabel).join("、")
                    : "なし"
                }
              />
              {order.allergyNote ? (
                <InfoRow label="アレルギー備考" value={order.allergyNote} wide />
              ) : null}
              {order.requestText ? (
                <InfoRow label="ご要望" value={order.requestText} wide />
              ) : null}
            </dl>
          )}

          {images.length > 0 ? (
            <>
              <Separator className="my-4" />
              <p className="mb-2 text-sm font-medium">参考画像</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {images.map((img) => {
                  const url = imageUrls.get(img.storagePath);
                  return url ? (
                    <a
                      key={img.id}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-md border bg-muted"
                    >
                      <img
                        src={url}
                        alt={img.originalName ?? "参考画像"}
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div
                      key={img.id}
                      className="flex aspect-square items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
                    >
                      表示不可
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* モック履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">デザインモック履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {mockHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだモックがありません。エディタで作成しましょう
            </p>
          ) : (
            <ul className="space-y-4">
              {mockHistory.map(({ mock, approval }) => {
                const pngUrl = mock.pngPath
                  ? mockPngUrls.get(mock.pngPath)
                  : undefined;
                return (
                  <li key={mock.id} className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-white">
                      {pngUrl ? (
                        <img
                          src={pngUrl}
                          alt={`モック v${mock.version}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          画像なし
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 py-1">
                      <p className="text-sm font-medium">
                        バージョン {mock.version}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {formatDateTimeJa(mock.createdAt)}
                        </span>
                      </p>
                      {approval ? (
                        approval.status === "approved" ? (
                          <p className="mt-1 text-sm font-medium text-emerald-700">
                            ✓ お客様がOKしました（
                            {formatDateTimeJa(approval.createdAt)}）
                          </p>
                        ) : (
                          <div className="mt-1">
                            <p className="text-sm font-medium text-rose-700">
                              修正依頼（{formatDateTimeJa(approval.createdAt)}）
                            </p>
                            {approval.comment ? (
                              <p className="mt-1 rounded-md bg-rose-50 px-3 py-2 text-sm whitespace-pre-wrap">
                                {approval.comment}
                              </p>
                            ) : null}
                          </div>
                        )
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          お客様の応答なし
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
