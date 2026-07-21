import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { ensureDemoReady } from "@/server/demo-db";
import { FlowError, respondToReview } from "@/server/flows";
import { TOKEN_PATTERN } from "@/lib/tokens";
import { reviewResponseSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** 客のデザイン確認応答（OK / 修正依頼）。トークン検証の上で記録する */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) {
    return NextResponse.json(
      { ok: false, error: "リンクが無効です" },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "送信データを読み取れませんでした" },
      { status: 400 },
    );
  }

  const parsed = reviewResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      },
      { status: 400 },
    );
  }

  try {
    await ensureDemoReady();
    const db = getDb();
    const state = await respondToReview(db, token, parsed.data);
    return NextResponse.json({ ok: true, status: state.order.status });
  } catch (e) {
    if (e instanceof FlowError) {
      const status = e.code === "invalid_token" ? 404 : 409;
      return NextResponse.json({ ok: false, error: e.message }, { status });
    }
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "送信に失敗しました。時間をおいてお試しください" },
      { status: 500 },
    );
  }
}
