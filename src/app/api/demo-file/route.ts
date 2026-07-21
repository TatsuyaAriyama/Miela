import fs from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { IS_DEMO } from "@/lib/demo";
import { demoFilePath } from "@/lib/supabase/storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

/** デモモードのローカル保存ファイルを配信する（本番相当では署名付きURLが使われる） */
export async function GET(request: NextRequest) {
  if (!IS_DEMO) return new NextResponse("Not found", { status: 404 });

  const bucket = request.nextUrl.searchParams.get("b");
  const objectPath = request.nextUrl.searchParams.get("p");
  if (!bucket || !objectPath) {
    return new NextResponse("Bad request", { status: 400 });
  }

  try {
    const full = demoFilePath(bucket, objectPath);
    const bytes = await fs.readFile(full);
    const ext = full.slice(full.lastIndexOf(".")).toLowerCase();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
