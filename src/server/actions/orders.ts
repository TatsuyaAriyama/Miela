"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMaker } from "@/server/auth";
import { appUrl } from "@/server/url";
import {
  createOrder,
  FlowError,
  getOwnedOrder,
  issueReviewLink,
  issueShareToken,
  updateOrderStatus,
} from "@/server/flows";
import { orderCreateSchema } from "@/lib/validation";

export type ActionResult =
  | { ok: true; url?: string }
  | { ok: false; error: string };

export type OrderCreateState = { error?: string };

export async function createOrderAction(
  _prev: OrderCreateState,
  formData: FormData,
): Promise<OrderCreateState> {
  const parsed = orderCreateSchema.safeParse({
    title: formData.get("title"),
    customerName: formData.get("customerName") ?? "",
    deliveryDate: formData.get("deliveryDate") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }
  const { maker, db } = await requireMaker();
  const { order } = await createOrder(db, maker.id, {
    title: parsed.data.title,
    customerName: parsed.data.customerName || undefined,
    deliveryDate: parsed.data.deliveryDate || undefined,
  });
  revalidatePath("/dashboard");
  redirect(`/orders/${order.id}`);
}

/** 受注フォームリンクを再発行する（既存リンクは失効） */
export async function reissueFormLinkAction(
  orderId: string,
): Promise<ActionResult> {
  try {
    const { maker, db } = await requireMaker();
    const order = await getOwnedOrder(db, orderId, maker.id);
    if (!order) return { ok: false, error: "注文が見つかりません" };
    const token = await issueShareToken(db, orderId, "form");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, url: `${await appUrl()}/f/${token}` };
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
}

/** デザイン確認リンクを発行し、状態を「お客様確認待ち」へ */
export async function issueReviewLinkAction(
  orderId: string,
): Promise<ActionResult> {
  try {
    const { maker, db } = await requireMaker();
    const order = await getOwnedOrder(db, orderId, maker.id);
    if (!order) return { ok: false, error: "注文が見つかりません" };
    const token = await issueReviewLink(db, orderId);
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/dashboard");
    return { ok: true, url: `${await appUrl()}/r/${token}` };
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
}

export async function completeOrderAction(
  orderId: string,
): Promise<ActionResult> {
  return changeStatus(orderId, "completed");
}

export async function cancelOrderAction(
  orderId: string,
): Promise<ActionResult> {
  return changeStatus(orderId, "cancelled");
}

async function changeStatus(
  orderId: string,
  to: "completed" | "cancelled",
): Promise<ActionResult> {
  try {
    const { maker, db } = await requireMaker();
    const order = await getOwnedOrder(db, orderId, maker.id);
    if (!order) return { ok: false, error: "注文が見つかりません" };
    await updateOrderStatus(db, orderId, to);
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
}

function toMessage(e: unknown): string {
  if (e instanceof FlowError) return e.message;
  console.error(e);
  return "処理に失敗しました。時間をおいて再度お試しください";
}
