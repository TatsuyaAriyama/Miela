import { z } from "zod";
import { ALLERGEN_KEYS, CAKE_SHAPES, SIZE_OPTIONS } from "./constants";
import { SceneSchema } from "./scene";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません");

/** 客の受注フォーム入力 */
export const customerFormSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "お名前（ニックネーム可）を入力してください")
    .max(40, "40文字以内で入力してください"),
  deliveryDate: isoDate,
  sizeGo: z.coerce
    .number()
    .refine((v): v is (typeof SIZE_OPTIONS)[number] =>
      SIZE_OPTIONS.includes(v as (typeof SIZE_OPTIONS)[number]),
    { message: "サイズを選択してください" },
    ),
  shape: z.enum(CAKE_SHAPES, { message: "形を選択してください" }),
  flavor: z
    .string()
    .trim()
    .min(1, "味を選択してください")
    .max(60),
  allergyItems: z
    .array(z.string().refine((k) => ALLERGEN_KEYS.includes(k)))
    .max(ALLERGEN_KEYS.length)
    .default([]),
  allergyNote: z.string().trim().max(500).optional().default(""),
  requestText: z.string().trim().max(2000).optional().default(""),
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerFormValues = z.output<typeof customerFormSchema>;

/** 作家の新規注文作成 */
export const orderCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "管理用タイトルを入力してください")
    .max(60, "60文字以内で入力してください"),
  customerName: z.string().trim().max(40).optional().default(""),
  deliveryDate: isoDate.optional().or(z.literal("")).default(""),
});

/** モック保存（シーンJSON + PNG data URL） */
export const mockSaveSchema = z.object({
  orderId: z.uuid(),
  scene: SceneSchema,
  pngDataUrl: z
    .string()
    .startsWith("data:image/png;base64,", "PNGデータが不正です")
    .max(8_000_000, "画像サイズが大きすぎます"),
});

/** 客のデザイン確認応答 */
export const reviewResponseSchema = z
  .object({
    action: z.enum(["approved", "revision_requested"]),
    comment: z.string().trim().max(1000).optional().default(""),
  })
  .refine((v) => v.action !== "revision_requested" || v.comment.length > 0, {
    message: "修正内容のコメントを入力してください",
    path: ["comment"],
  });

/** 作家プロフィール（サインアップ時） */
export const makerProfileSchema = z.object({
  shopName: z.string().trim().min(1, "店名を入力してください").max(60),
  displayName: z.string().trim().min(1, "表示名を入力してください").max(40),
  snsUrl: z
    .union([z.url({ message: "URLの形式が正しくありません" }), z.literal("")])
    .optional()
    .default(""),
});

export const signupSchema = makerProfileSchema.extend({
  email: z.email({ message: "メールアドレスの形式が正しくありません" }),
  password: z.string().min(8, "パスワードは8文字以上にしてください").max(72),
});

export const loginSchema = z.object({
  email: z.email({ message: "メールアドレスの形式が正しくありません" }),
  password: z.string().min(1, "パスワードを入力してください"),
});

export const MAX_UPLOAD_IMAGES = 5;
export const MAX_UPLOAD_SIZE_MB = 10;

const IMAGE_MIME_ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

export function isAllowedImage(file: { type: string; name: string }): boolean {
  if (IMAGE_MIME_ALLOWED.has(file.type)) return true;
  // iOS からの HEIC は type が空になることがあるため拡張子でも判定
  return /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(file.name);
}
