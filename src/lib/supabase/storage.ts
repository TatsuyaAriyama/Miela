import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { createSupabaseAdminClient } from "./admin";
import { DEMO_STORAGE_DIR, IS_DEMO } from "@/lib/demo";

export const BUCKET_ORDER_IMAGES = "order-images";
export const BUCKET_MOCKS = "mocks";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1時間

export async function uploadOrderImage(
  orderId: string,
  file: File,
): Promise<string> {
  const ext = extensionOf(file.name, file.type);
  const objectPath = `${orderId}/${crypto.randomUUID()}${ext}`;

  if (IS_DEMO) {
    await writeDemoFile(
      BUCKET_ORDER_IMAGES,
      objectPath,
      Buffer.from(await file.arrayBuffer()),
    );
    return objectPath;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET_ORDER_IMAGES)
    .upload(objectPath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
  if (error) throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  return objectPath;
}

export async function uploadMockPng(
  orderId: string,
  version: number,
  pngDataUrl: string,
): Promise<string> {
  const base64 = pngDataUrl.slice("data:image/png;base64,".length);
  const bytes = Buffer.from(base64, "base64");
  const objectPath = `${orderId}/v${version}.png`;

  if (IS_DEMO) {
    await writeDemoFile(BUCKET_MOCKS, objectPath, bytes);
    return objectPath;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET_MOCKS)
    .upload(objectPath, bytes, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`モック画像の保存に失敗しました: ${error.message}`);
  return objectPath;
}

export async function createSignedUrl(
  bucket: string,
  objectPath: string,
): Promise<string | null> {
  if (IS_DEMO) return demoFileUrl(bucket, objectPath);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function createSignedUrls(
  bucket: string,
  paths: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;

  if (IS_DEMO) {
    for (const p of paths) result.set(p, demoFileUrl(bucket, p));
    return result;
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) result.set(item.path, item.signedUrl);
  }
  return result;
}

// ---------- デモモード: ローカルファイル ----------

function demoFileUrl(bucket: string, objectPath: string): string {
  const params = new URLSearchParams({ b: bucket, p: objectPath });
  return `/api/demo-file?${params.toString()}`;
}

async function writeDemoFile(
  bucket: string,
  objectPath: string,
  bytes: Buffer,
): Promise<void> {
  const full = demoFilePath(bucket, objectPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes);
}

/** デモファイルの実体パス。パストラバーサルを防ぐため basename 連結を検証 */
export function demoFilePath(bucket: string, objectPath: string): string {
  const safeBucket = bucket === BUCKET_MOCKS ? BUCKET_MOCKS : BUCKET_ORDER_IMAGES;
  const root = path.join(DEMO_STORAGE_DIR, safeBucket);
  const full = path.normalize(path.join(root, objectPath));
  if (!full.startsWith(root + path.sep)) {
    throw new Error("不正なパスです");
  }
  return full;
}

function extensionOf(name: string, mime: string): string {
  const fromName = name.match(/(\.[A-Za-z0-9]+)$/)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/gif": ".gif",
  };
  return map[mime] ?? "";
}
