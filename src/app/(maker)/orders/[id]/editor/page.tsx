import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMaker } from "@/server/auth";
import {
  getLatestMock,
  getOwnedOrder,
  listOrderImages,
  LOCKED_STATUSES,
} from "@/server/flows";
import {
  BUCKET_ORDER_IMAGES,
  createSignedUrls,
} from "@/lib/supabase/storage";
import { defaultScene, SceneSchema, type Scene } from "@/lib/scene";
import { EditorLoader } from "@/components/editor/editor-loader";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateJa } from "@/lib/format";

export const metadata = { title: "モックエディタ" };

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { maker, db } = await requireMaker();
  const order = await getOwnedOrder(db, id, maker.id);
  if (!order) notFound();
  if (LOCKED_STATUSES.includes(order.status)) {
    redirect(`/orders/${order.id}`);
  }

  const [latestMock, images] = await Promise.all([
    getLatestMock(db, order.id),
    listOrderImages(db, order.id),
  ]);

  let initialScene: Scene;
  if (latestMock) {
    const parsed = SceneSchema.safeParse(latestMock.sceneJson);
    initialScene = parsed.success
      ? parsed.data
      : defaultScene({ shape: order.shape, sizeGo: order.sizeGo });
  } else {
    initialScene = defaultScene({ shape: order.shape, sizeGo: order.sizeGo });
  }

  const imageUrls = await createSignedUrls(
    BUCKET_ORDER_IMAGES,
    images.map((i) => i.storagePath),
  );
  const refImages = images.flatMap((img) => {
    const url = imageUrls.get(img.storagePath);
    return url ? [{ url, name: img.originalName ?? "参考画像" }] : [];
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/orders/${order.id}`}>← 注文に戻る</Link>
          </Button>
          <div>
            <h1 className="text-base font-semibold">
              {order.title || "（無題の注文）"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {order.customerName ? `${order.customerName} 様 ・ ` : ""}
              引き渡し {formatDateJa(order.deliveryDate)}
            </p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.requestText ? (
        <details className="rounded-lg border bg-muted/40 px-4 py-2 text-sm">
          <summary className="cursor-pointer font-medium">
            お客様のご要望を見る
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            {order.requestText}
          </p>
        </details>
      ) : null}

      <EditorLoader
        orderId={order.id}
        initialScene={initialScene}
        latestVersion={latestMock?.version ?? 0}
        refImages={refImages}
      />
    </div>
  );
}
