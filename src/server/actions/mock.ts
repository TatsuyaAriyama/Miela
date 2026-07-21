"use server";

import { revalidatePath } from "next/cache";
import { requireMaker } from "@/server/auth";
import { FlowError, getOwnedOrder, saveMock, setMockPng } from "@/server/flows";
import { uploadMockPng } from "@/lib/supabase/storage";
import { mockSaveSchema } from "@/lib/validation";

export type MockSaveResult =
  | { ok: true; version: number }
  | { ok: false; error: string };

/** シーンJSONを新バージョンとして保存し、PNG を Storage へ書き出す */
export async function saveMockAction(input: unknown): Promise<MockSaveResult> {
  const parsed = mockSaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "保存データが不正です" };
  }
  try {
    const { maker, db } = await requireMaker();
    const { orderId, scene, pngDataUrl } = parsed.data;
    const order = await getOwnedOrder(db, orderId, maker.id);
    if (!order) return { ok: false, error: "注文が見つかりません" };

    const mock = await saveMock(db, orderId, scene);
    const pngPath = await uploadMockPng(orderId, mock.version, pngDataUrl);
    await setMockPng(db, mock.id, pngPath);

    revalidatePath(`/orders/${orderId}`);
    return { ok: true, version: mock.version };
  } catch (e) {
    if (e instanceof FlowError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "保存に失敗しました。時間をおいて再度お試しください" };
  }
}
