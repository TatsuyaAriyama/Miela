import Link from "next/link";
import { notFound, redirect } from "next/navigation";
/* eslint-disable @next/next/no-img-element -- 署名付きURLのため next/image は使わない */
import { requireMaker } from "@/server/auth";
import { getOwnedOrder, listMocksWithApprovals } from "@/server/flows";
import { BUCKET_MOCKS, createSignedUrl } from "@/lib/supabase/storage";
import { SceneSchema, type Scene } from "@/lib/scene";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  allergenLabel,
  fontLabelOf,
  SHAPE_META,
  sizeLabel,
  swatchHex,
  swatchLabel,
} from "@/lib/constants";
import { formatDateJa, formatDateTimeJa } from "@/lib/format";
import { stickerByKey } from "@/lib/stickers";

export const metadata = { title: "製作仕様シート" };

export default async function SpecSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { maker, db } = await requireMaker();
  const order = await getOwnedOrder(db, id, maker.id);
  if (!order) notFound();
  if (order.status !== "approved" && order.status !== "completed") {
    redirect(`/orders/${order.id}`);
  }

  // 確定（approved）された最新バージョンのモックを取得
  const history = await listMocksWithApprovals(db, order.id);
  const confirmed =
    history.find((h) => h.approval?.status === "approved") ?? history[0];
  if (!confirmed) redirect(`/orders/${order.id}`);

  const sceneParsed = SceneSchema.safeParse(confirmed.mock.sceneJson);
  const scene: Scene | null = sceneParsed.success ? sceneParsed.data : null;
  const pngUrl = confirmed.mock.pngPath
    ? await createSignedUrl(BUCKET_MOCKS, confirmed.mock.pngPath)
    : null;

  const texts = scene?.nodes.filter((n) => n.type === "text") ?? [];
  const stickerCounts = new Map<string, number>();
  for (const node of scene?.nodes ?? []) {
    if (node.type === "sticker") {
      stickerCounts.set(
        node.stickerKey,
        (stickerCounts.get(node.stickerKey) ?? 0) + 1,
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="print-hidden mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/orders/${order.id}`}>← 注文に戻る</Link>
        </Button>
        <PrintButton />
      </div>

      <div className="print-sheet rounded-lg border bg-white p-8 shadow-sm">
        {/* ヘッダー */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs tracking-widest text-muted-foreground">
              MIELA 製作仕様シート
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              {order.title || "（無題の注文）"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {maker.shopName} ／ デザイン確定:{" "}
              {confirmed.approval
                ? formatDateTimeJa(confirmed.approval.createdAt)
                : "—"}{" "}
              （v{confirmed.mock.version}）
            </p>
          </div>
          <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">引き渡し日</p>
            <p className="text-sm font-semibold">
              {formatDateJa(order.deliveryDate)}
            </p>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid grid-cols-2 gap-6">
          {/* 左: デザインプレビュー */}
          <div>
            <SectionTitle>確定デザイン（配置プレビュー）</SectionTitle>
            {pngUrl ? (
              <img
                src={pngUrl}
                alt="確定デザイン"
                className="mt-2 aspect-square w-full rounded-md border bg-white object-contain"
              />
            ) : (
              <div className="mt-2 flex aspect-square items-center justify-center rounded-md border text-sm text-muted-foreground">
                画像なし
              </div>
            )}
          </div>

          {/* 右: 基本情報 */}
          <div className="space-y-4 text-sm">
            <div>
              <SectionTitle>基本情報</SectionTitle>
              <dl className="mt-2 space-y-1.5">
                <SpecRow
                  label="お客様"
                  value={order.customerName ? `${order.customerName} 様` : "—"}
                />
                <SpecRow
                  label="サイズ"
                  value={
                    scene
                      ? sizeLabel(scene.base.sizeGo)
                      : order.sizeGo
                        ? sizeLabel(order.sizeGo)
                        : "—"
                  }
                />
                <SpecRow
                  label="形"
                  value={
                    scene
                      ? SHAPE_META[scene.base.shape].label
                      : order.shape
                        ? SHAPE_META[order.shape].label
                        : "—"
                  }
                />
                <SpecRow label="味" value={order.flavor ?? "—"} />
              </dl>
            </div>

            <div>
              <SectionTitle>アレルギー</SectionTitle>
              <p className="mt-2 font-medium">
                {order.allergyItems.length > 0
                  ? order.allergyItems.map(allergenLabel).join("、")
                  : "申告なし"}
              </p>
              {order.allergyNote ? (
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {order.allergyNote}
                </p>
              ) : null}
            </div>

            {scene ? (
              <div>
                <SectionTitle>土台</SectionTitle>
                <dl className="mt-2 space-y-1.5">
                  <SpecRow
                    label="クリーム色"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border"
                          style={{
                            backgroundColor: swatchHex(scene.base.colorKey),
                          }}
                        />
                        {swatchLabel(scene.base.colorKey)}
                      </span>
                    }
                  />
                </dl>
              </div>
            ) : null}
          </div>
        </div>

        {/* レタリング */}
        <div className="mt-6">
          <SectionTitle>レタリング（{texts.length}件）</SectionTitle>
          {texts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">文字なし</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-4 font-normal">文字</th>
                  <th className="py-1.5 pr-4 font-normal">フォント</th>
                  <th className="py-1.5 pr-4 font-normal">サイズ</th>
                  <th className="py-1.5 font-normal">色</th>
                </tr>
              </thead>
              <tbody>
                {texts.map((t) => (
                  <tr key={t.id} className="border-b border-dashed">
                    <td className="py-2 pr-4 font-medium whitespace-pre-wrap">
                      {t.text}
                    </td>
                    <td className="py-2 pr-4">{fontLabelOf(t.fontKey)}</td>
                    <td className="py-2 pr-4">{Math.round(t.fontSize)}px</td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border"
                          style={{ backgroundColor: swatchHex(t.colorKey) }}
                        />
                        {swatchLabel(t.colorKey)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* パーツ */}
        <div className="mt-6">
          <SectionTitle>デコパーツ</SectionTitle>
          {stickerCounts.size === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">パーツなし</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
              {Array.from(stickerCounts.entries()).map(([key, count]) => (
                <li key={key}>
                  {stickerByKey(key)?.label ?? key} × {count}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ご要望 */}
        {order.requestText ? (
          <div className="mt-6">
            <SectionTitle>お客様のご要望（原文）</SectionTitle>
            <p className="mt-2 rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {order.requestText}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-l-3 border-primary pl-2 text-xs font-semibold tracking-wide text-foreground">
      {children}
    </h2>
  );
}

function SpecRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-xs leading-6 text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
