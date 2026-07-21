import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import {
  addOrderImages,
  FlowError,
  getOrderByToken,
  submitCustomerForm,
} from "@/server/flows";
import { ensureDemoReady } from "@/server/demo-db";
import { uploadOrderImage } from "@/lib/supabase/storage";
import { TOKEN_PATTERN } from "@/lib/tokens";
import {
  customerFormSchema,
  isAllowedImage,
  MAX_UPLOAD_IMAGES,
  MAX_UPLOAD_SIZE_MB,
} from "@/lib/validation";

export const runtime = "nodejs";

/** 客の受注フォーム送信。トークン検証の上 service role でDB/Storageに書く */
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "送信データを読み取れませんでした" },
      { status: 400 },
    );
  }

  const parsed = customerFormSchema.safeParse({
    customerName: formData.get("customerName"),
    deliveryDate: formData.get("deliveryDate"),
    sizeGo: formData.get("sizeGo"),
    shape: formData.get("shape"),
    flavor: formData.get("flavor"),
    allergyItems: formData
      .getAll("allergyItems")
      .filter((v): v is string => typeof v === "string"),
    allergyNote: formData.get("allergyNote") ?? "",
    requestText: formData.get("requestText") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      },
      { status: 400 },
    );
  }

  const images = formData
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0);
  if (images.length > MAX_UPLOAD_IMAGES) {
    return NextResponse.json(
      { ok: false, error: `画像は${MAX_UPLOAD_IMAGES}枚までです` },
      { status: 400 },
    );
  }
  for (const file of images) {
    if (!isAllowedImage(file)) {
      return NextResponse.json(
        { ok: false, error: "対応していない画像形式が含まれています" },
        { status: 400 },
      );
    }
    if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: `画像は1枚${MAX_UPLOAD_SIZE_MB}MBまでです` },
        { status: 400 },
      );
    }
  }

  try {
    await ensureDemoReady();
    const db = getDb();
    const found = await getOrderByToken(db, token, "form");
    if (!found) {
      return NextResponse.json(
        { ok: false, error: "リンクが無効です。作家にお問い合わせください" },
        { status: 404 },
      );
    }

    const order = await submitCustomerForm(db, token, parsed.data);

    if (images.length > 0) {
      const uploaded: { storagePath: string; originalName?: string }[] = [];
      for (const file of images) {
        const storagePath = await uploadOrderImage(order.id, file);
        uploaded.push({ storagePath, originalName: file.name });
      }
      await addOrderImages(db, order.id, uploaded);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof FlowError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "送信に失敗しました。時間をおいてお試しください" },
      { status: 500 },
    );
  }
}
