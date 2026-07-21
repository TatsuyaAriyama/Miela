/**
 * コアフローの integration テスト。
 * PGlite（インメモリPostgres）に Drizzle マイグレーションを適用し、
 * 注文作成 → フォーム送信 → モック保存 → 確認リンク → 承認 → ロック
 * の一連の業務フローをDBレベルで検証する。
 */
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { Db } from "@/db";
import {
  createOrder,
  ensureMaker,
  FlowError,
  getActiveToken,
  getLatestMock,
  getOrderByToken,
  getReviewState,
  issueReviewLink,
  listMocksWithApprovals,
  respondToReview,
  saveMock,
  submitCustomerForm,
  updateOrderStatus,
} from "@/server/flows";
import { defaultScene, type Scene } from "@/lib/scene";
import type { CustomerFormValues } from "@/lib/validation";

const MAKER_ID = "00000000-0000-4000-8000-000000000001";

const formValues: CustomerFormValues = {
  customerName: "みお",
  deliveryDate: "2026-08-01",
  sizeGo: 5,
  shape: "heart",
  flavor: "チョコレート",
  allergyItems: ["egg", "milk"],
  allergyNote: "卵は少量なら可",
  requestText: "くすみピンクでかわいく。HAPPY BIRTHDAY MIO と入れてください",
};

let db: Db;

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "drizzle" });
  db = pglite as unknown as Db;
});

describe("コアフロー: 注文作成 → フォーム → モック → 承認 → ロック", () => {
  let orderId: string;
  let formToken: string;
  let reviewToken: string;

  it("作家を登録できる（重複してもエラーにならない）", async () => {
    await ensureMaker(db, {
      id: MAKER_ID,
      shopName: "cake atelier miel",
      displayName: "みえ",
    });
    await ensureMaker(db, {
      id: MAKER_ID,
      shopName: "別名",
      displayName: "別名",
    });
    const makers = await db.select().from(schema.makers);
    expect(makers).toHaveLength(1);
    expect(makers[0].shopName).toBe("cake atelier miel");
  });

  it("注文を作成するとフォームリンクが発行され、回答待ちになる", async () => {
    const { order, formToken: token } = await createOrder(db, MAKER_ID, {
      title: "8/1 みおさま センイル",
    });
    orderId = order.id;
    formToken = token;
    expect(order.status).toBe("awaiting_form");
    expect(token.length).toBeGreaterThanOrEqual(21);

    const found = await getOrderByToken(db, token, "form");
    expect(found?.order.id).toBe(orderId);
    // 用途違いのトークンとしては解決できない
    expect(await getOrderByToken(db, token, "review")).toBeNull();
  });

  it("客がフォームを送信すると注文に反映される", async () => {
    const order = await submitCustomerForm(db, formToken, formValues);
    expect(order.status).toBe("form_submitted");
    expect(order.customerName).toBe("みお");
    expect(order.deliveryDate).toBe("2026-08-01");
    expect(order.sizeGo).toBe(5);
    expect(order.shape).toBe("heart");
    expect(order.allergyItems).toEqual(["egg", "milk"]);
  });

  it("フォームの二重送信は拒否される", async () => {
    await expect(
      submitCustomerForm(db, formToken, formValues),
    ).rejects.toThrowError(FlowError);
  });

  it("モックを保存するとバージョンが増え、作成中ステータスになる", async () => {
    const scene = defaultScene({ shape: "heart", sizeGo: 5 });
    const v1 = await saveMock(db, orderId, scene);
    expect(v1.version).toBe(1);

    const scene2: Scene = {
      ...scene,
      nodes: [
        {
          id: "t1",
          type: "text",
          text: "HAPPY BIRTHDAY MIO",
          fontKey: "maru",
          fontSize: 34,
          colorKey: "choco",
          x: 300,
          y: 300,
          rotation: 0,
        },
      ],
    };
    const v2 = await saveMock(db, orderId, scene2);
    expect(v2.version).toBe(2);

    const latest = await getLatestMock(db, orderId);
    expect(latest?.version).toBe(2);

    const orders = await db.select().from(schema.orders);
    expect(orders[0].status).toBe("mock_in_progress");
  });

  it("確認リンクを発行すると確認待ちになり、再発行で旧リンクが失効する", async () => {
    const first = await issueReviewLink(db, orderId);
    reviewToken = await issueReviewLink(db, orderId);
    expect(await getOrderByToken(db, first, "review")).toBeNull();

    const state = await getReviewState(db, reviewToken);
    expect(state?.order.status).toBe("awaiting_approval");
    expect(state?.mock.version).toBe(2);
    expect(state?.approval).toBeNull();
  });

  it("修正依頼するとコメントが記録され、修正依頼ステータスになる", async () => {
    const state = await respondToReview(db, reviewToken, {
      action: "revision_requested",
      comment: "文字をもう少し大きくしてほしいです",
    });
    expect(state.order.status).toBe("needs_revision");
    expect(state.approval?.status).toBe("revision_requested");

    // 同じバージョンへの再応答は拒否
    await expect(
      respondToReview(db, reviewToken, { action: "approved", comment: "" }),
    ).rejects.toThrowError(FlowError);
  });

  it("修正版を保存して再共有し、客がOKするとデザイン確定（ロック）", async () => {
    const scene = defaultScene({ shape: "heart", sizeGo: 5 });
    const v3 = await saveMock(db, orderId, {
      ...scene,
      nodes: [
        {
          id: "t1",
          type: "text",
          text: "HAPPY BIRTHDAY MIO",
          fontKey: "maru",
          fontSize: 48,
          colorKey: "choco",
          x: 300,
          y: 300,
          rotation: 0,
        },
      ],
    });
    expect(v3.version).toBe(3);

    reviewToken = await issueReviewLink(db, orderId);
    const state = await respondToReview(db, reviewToken, {
      action: "approved",
      comment: "",
    });
    expect(state.order.status).toBe("approved");

    const history = await listMocksWithApprovals(db, orderId);
    expect(history[0].mock.version).toBe(3);
    expect(history[0].approval?.status).toBe("approved");
  });

  it("確定後はモック保存も再応答もできない", async () => {
    await expect(
      saveMock(db, orderId, defaultScene({ shape: "heart", sizeGo: 5 })),
    ).rejects.toThrowError(FlowError);
    await expect(
      respondToReview(db, reviewToken, {
        action: "revision_requested",
        comment: "やっぱり変えたい",
      }),
    ).rejects.toThrowError(FlowError);
    await expect(issueReviewLink(db, orderId)).rejects.toThrowError(FlowError);
  });

  it("確定後は完了にでき、フォームトークンは残っていても再回答できない", async () => {
    await updateOrderStatus(db, orderId, "completed");
    const orders = await db.select().from(schema.orders);
    expect(orders[0].status).toBe("completed");

    const activeForm = await getActiveToken(db, orderId, "form");
    expect(activeForm).toBe(formToken);
    await expect(
      submitCustomerForm(db, formToken, formValues),
    ).rejects.toThrowError(FlowError);
  });
});
