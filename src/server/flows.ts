import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import {
  approvals,
  makers,
  mocks,
  orderImages,
  orders,
  shareTokens,
  type Approval,
  type Mock,
  type Order,
  type OrderStatus,
  type ShareToken,
} from "@/db/schema";
import type { Scene } from "@/lib/scene";
import { generateShareToken } from "@/lib/tokens";
import type { CustomerFormValues } from "@/lib/validation";

/** フロー上の業務エラー。ユーザー向けメッセージをそのまま持つ */
export class FlowError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_found"
      | "invalid_token"
      | "invalid_state"
      | "already_responded"
      | "locked" = "invalid_state",
  ) {
    super(message);
    this.name = "FlowError";
  }
}

/** 確定後に編集をロックするステータス */
export const LOCKED_STATUSES: OrderStatus[] = [
  "approved",
  "completed",
  "cancelled",
];

export async function ensureMaker(
  db: Db,
  input: {
    id: string;
    shopName: string;
    displayName: string;
    snsUrl?: string | null;
  },
): Promise<void> {
  await db
    .insert(makers)
    .values({
      id: input.id,
      shopName: input.shopName,
      displayName: input.displayName,
      snsUrl: input.snsUrl || null,
    })
    .onConflictDoNothing({ target: makers.id });
}

export async function getMaker(db: Db, makerId: string) {
  const rows = await db
    .select()
    .from(makers)
    .where(eq(makers.id, makerId))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// 注文
// ---------------------------------------------------------------------------

export async function createOrder(
  db: Db,
  makerId: string,
  input: { title: string; customerName?: string; deliveryDate?: string },
): Promise<{ order: Order; formToken: string }> {
  const inserted = await db
    .insert(orders)
    .values({
      makerId,
      title: input.title,
      customerName: input.customerName || null,
      deliveryDate: input.deliveryDate || null,
      status: "awaiting_form",
    })
    .returning();
  const order = inserted[0];
  const formToken = await issueShareToken(db, order.id, "form");
  return { order, formToken };
}

export async function getOwnedOrder(
  db: Db,
  orderId: string,
  makerId: string,
): Promise<Order | null> {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.makerId, makerId)))
    .limit(1);
  return rows[0] ?? null;
}

/** ダッシュボード用: 引き渡し日が近い順（未定は最後） */
export async function listOrders(db: Db, makerId: string): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.makerId, makerId))
    .orderBy(
      sql`${orders.deliveryDate} asc nulls last`,
      desc(orders.createdAt),
    );
}

export async function updateOrderStatus(
  db: Db,
  orderId: string,
  to: Extract<OrderStatus, "completed" | "cancelled">,
): Promise<void> {
  const rows = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const current = rows[0]?.status;
  if (!current) throw new FlowError("注文が見つかりません", "not_found");
  if (to === "completed" && current !== "approved") {
    throw new FlowError("デザイン確定後のみ完了にできます");
  }
  if (to === "cancelled" && (current === "completed" || current === "cancelled")) {
    throw new FlowError("この注文はキャンセルできません");
  }
  await db
    .update(orders)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}

// ---------------------------------------------------------------------------
// 共有トークン
// ---------------------------------------------------------------------------

/** 同一用途の既存トークンを失効させて新規発行する */
export async function issueShareToken(
  db: Db,
  orderId: string,
  purpose: "form" | "review",
): Promise<string> {
  await db
    .update(shareTokens)
    .set({ revoked: true })
    .where(
      and(eq(shareTokens.orderId, orderId), eq(shareTokens.purpose, purpose)),
    );
  const token = generateShareToken();
  await db.insert(shareTokens).values({ orderId, token, purpose });
  return token;
}

export async function getActiveToken(
  db: Db,
  orderId: string,
  purpose: "form" | "review",
): Promise<string | null> {
  const rows = await db
    .select()
    .from(shareTokens)
    .where(
      and(
        eq(shareTokens.orderId, orderId),
        eq(shareTokens.purpose, purpose),
        eq(shareTokens.revoked, false),
      ),
    )
    .orderBy(desc(shareTokens.createdAt))
    .limit(1);
  return rows[0]?.token ?? null;
}

/** 確認リンクの発行。モックが1件以上ある注文のみ。状態を確認待ちへ進める */
export async function issueReviewLink(
  db: Db,
  orderId: string,
): Promise<string> {
  const order = await getOrderById(db, orderId);
  if (!order) throw new FlowError("注文が見つかりません", "not_found");
  if (LOCKED_STATUSES.includes(order.status)) {
    throw new FlowError("確定済み・終了済みの注文には発行できません", "locked");
  }
  const latest = await getLatestMock(db, orderId);
  if (!latest) {
    throw new FlowError("モックを保存してから確認リンクを発行してください");
  }
  const token = await issueShareToken(db, orderId, "review");
  await db
    .update(orders)
    .set({ status: "awaiting_approval", updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  return token;
}

export async function getOrderByToken(
  db: Db,
  token: string,
  purpose: "form" | "review",
): Promise<{ order: Order; shareToken: ShareToken } | null> {
  const rows = await db
    .select({ order: orders, shareToken: shareTokens })
    .from(shareTokens)
    .innerJoin(orders, eq(orders.id, shareTokens.orderId))
    .where(
      and(
        eq(shareTokens.token, token),
        eq(shareTokens.purpose, purpose),
        eq(shareTokens.revoked, false),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function getOrderById(db: Db, orderId: string): Promise<Order | null> {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// 客: 受注フォーム
// ---------------------------------------------------------------------------

export async function submitCustomerForm(
  db: Db,
  token: string,
  values: CustomerFormValues,
): Promise<Order> {
  const found = await getOrderByToken(db, token, "form");
  if (!found) {
    throw new FlowError("リンクが無効です。作家にお問い合わせください", "invalid_token");
  }
  const { order } = found;
  if (order.status !== "draft" && order.status !== "awaiting_form") {
    throw new FlowError("このフォームは回答済みです", "invalid_state");
  }
  const updated = await db
    .update(orders)
    .set({
      customerName: values.customerName,
      deliveryDate: values.deliveryDate,
      sizeGo: values.sizeGo,
      shape: values.shape,
      flavor: values.flavor,
      allergyItems: values.allergyItems,
      allergyNote: values.allergyNote || null,
      requestText: values.requestText || null,
      status: "form_submitted",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id))
    .returning();
  return updated[0];
}

export async function addOrderImages(
  db: Db,
  orderId: string,
  images: { storagePath: string; originalName?: string }[],
): Promise<void> {
  if (images.length === 0) return;
  await db.insert(orderImages).values(
    images.map((img) => ({
      orderId,
      storagePath: img.storagePath,
      originalName: img.originalName ?? null,
    })),
  );
}

export async function listOrderImages(db: Db, orderId: string) {
  return db
    .select()
    .from(orderImages)
    .where(eq(orderImages.orderId, orderId))
    .orderBy(asc(orderImages.createdAt));
}

// ---------------------------------------------------------------------------
// モック
// ---------------------------------------------------------------------------

/** シーンを新バージョンとして保存する（履歴は消さない） */
export async function saveMock(
  db: Db,
  orderId: string,
  scene: Scene,
): Promise<Mock> {
  const order = await getOrderById(db, orderId);
  if (!order) throw new FlowError("注文が見つかりません", "not_found");
  if (LOCKED_STATUSES.includes(order.status)) {
    throw new FlowError(
      "デザイン確定済みのため編集できません。修正が必要な場合は新しい注文を作成してください",
      "locked",
    );
  }
  const latest = await getLatestMock(db, orderId);
  const version = (latest?.version ?? 0) + 1;
  const inserted = await db
    .insert(mocks)
    .values({ orderId, version, sceneJson: scene })
    .returning();

  // フォーム受信/修正依頼中に保存したら「モック作成中」へ。確認待ち中はそのまま
  if (order.status !== "awaiting_approval") {
    await db
      .update(orders)
      .set({ status: "mock_in_progress", updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }
  return inserted[0];
}

export async function setMockPng(
  db: Db,
  mockId: string,
  pngPath: string,
): Promise<void> {
  await db.update(mocks).set({ pngPath }).where(eq(mocks.id, mockId));
}

export async function getLatestMock(
  db: Db,
  orderId: string,
): Promise<Mock | null> {
  const rows = await db
    .select()
    .from(mocks)
    .where(eq(mocks.orderId, orderId))
    .orderBy(desc(mocks.version))
    .limit(1);
  return rows[0] ?? null;
}

export async function listMocksWithApprovals(
  db: Db,
  orderId: string,
): Promise<{ mock: Mock; approval: Approval | null }[]> {
  const mockRows = await db
    .select()
    .from(mocks)
    .where(eq(mocks.orderId, orderId))
    .orderBy(desc(mocks.version));
  if (mockRows.length === 0) return [];
  const approvalRows = await db
    .select()
    .from(approvals)
    .where(
      inArray(
        approvals.mockId,
        mockRows.map((m) => m.id),
      ),
    )
    .orderBy(desc(approvals.createdAt));
  return mockRows.map((mock) => ({
    mock,
    approval: approvalRows.find((a) => a.mockId === mock.id) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// 客: デザイン確認
// ---------------------------------------------------------------------------

export type ReviewState = {
  order: Order;
  mock: Mock;
  /** このバージョンに対する応答（あれば応答済み） */
  approval: Approval | null;
};

export async function getReviewState(
  db: Db,
  token: string,
): Promise<ReviewState | null> {
  const found = await getOrderByToken(db, token, "review");
  if (!found) return null;
  const mock = await getLatestMock(db, found.order.id);
  if (!mock) return null;
  const approvalRows = await db
    .select()
    .from(approvals)
    .where(eq(approvals.mockId, mock.id))
    .orderBy(desc(approvals.createdAt))
    .limit(1);
  return { order: found.order, mock, approval: approvalRows[0] ?? null };
}

/**
 * 客の応答を記録する。
 * approved → 注文を approved にしてロック。
 * revision_requested → needs_revision（コメント必須はバリデーション層で担保）
 */
export async function respondToReview(
  db: Db,
  token: string,
  response: { action: "approved" | "revision_requested"; comment: string },
): Promise<ReviewState> {
  const state = await getReviewState(db, token);
  if (!state) {
    throw new FlowError("リンクが無効です。作家にお問い合わせください", "invalid_token");
  }
  const { order, mock } = state;
  if (order.status === "approved" || order.status === "completed") {
    throw new FlowError("このデザインはすでに確定済みです", "locked");
  }
  if (order.status === "cancelled") {
    throw new FlowError("この注文はキャンセルされています", "locked");
  }
  if (state.approval) {
    throw new FlowError(
      "このバージョンには回答済みです。変更がある場合は作家にご連絡ください",
      "already_responded",
    );
  }
  const inserted = await db
    .insert(approvals)
    .values({
      mockId: mock.id,
      status: response.action,
      comment: response.comment || null,
    })
    .returning();
  const nextStatus: OrderStatus =
    response.action === "approved" ? "approved" : "needs_revision";
  const updatedOrders = await db
    .update(orders)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(orders.id, order.id))
    .returning();
  return { order: updatedOrders[0], mock, approval: inserted[0] };
}
