import type { CakeShape, OrderStatus } from "@/db/schema";

/** 注文ステータスの表示ラベルとバッジ色 */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  draft: { label: "下書き", className: "bg-neutral-200 text-neutral-700" },
  awaiting_form: {
    label: "フォーム回答待ち",
    className: "bg-amber-100 text-amber-800",
  },
  form_submitted: {
    label: "フォーム受信",
    className: "bg-sky-100 text-sky-800",
  },
  mock_in_progress: {
    label: "モック作成中",
    className: "bg-violet-100 text-violet-800",
  },
  awaiting_approval: {
    label: "お客様確認待ち",
    className: "bg-amber-100 text-amber-800",
  },
  needs_revision: {
    label: "修正依頼あり",
    className: "bg-rose-100 text-rose-800",
  },
  approved: {
    label: "デザイン確定",
    className: "bg-emerald-100 text-emerald-800",
  },
  completed: { label: "完了", className: "bg-neutral-200 text-neutral-600" },
  cancelled: {
    label: "キャンセル",
    className: "bg-neutral-100 text-neutral-400 line-through",
  },
};

export const SHAPE_META: Record<CakeShape, { label: string }> = {
  round: { label: "丸" },
  heart: { label: "ハート" },
  square: { label: "スクエア" },
};

export const CAKE_SHAPES = ["round", "heart", "square"] as const;

/** 号数の選択肢（1号 = 直径3cm 換算） */
export const SIZE_OPTIONS = [4, 5, 6, 7, 8, 10] as const;

export function sizeLabel(sizeGo: number): string {
  return `${sizeGo}号（約${sizeGo * 3}cm）`;
}

/** 特定原材料8品目 */
export const ALLERGEN_ITEMS = [
  { key: "egg", label: "卵" },
  { key: "milk", label: "乳" },
  { key: "wheat", label: "小麦" },
  { key: "buckwheat", label: "そば" },
  { key: "peanut", label: "落花生" },
  { key: "shrimp", label: "えび" },
  { key: "crab", label: "かに" },
  { key: "walnut", label: "くるみ" },
] as const;

export type AllergenKey = (typeof ALLERGEN_ITEMS)[number]["key"];

export const ALLERGEN_KEYS: readonly string[] = ALLERGEN_ITEMS.map(
  (a) => a.key,
);

export function allergenLabel(key: string): string {
  return ALLERGEN_ITEMS.find((a) => a.key === key)?.label ?? key;
}

/** 味の選択肢（MVP: 汎用リスト） */
export const FLAVOR_OPTIONS = [
  "生クリーム（バニラ）",
  "チョコレート",
  "いちご",
  "抹茶",
  "チーズ",
  "その他（要望欄に記入）",
] as const;

/** クリーム・文字色のプリセットスウォッチ（12色） */
export const SWATCHES = [
  { key: "white", label: "ホワイト", hex: "#FDFCFA" },
  { key: "ivory", label: "アイボリー", hex: "#F6EEDF" },
  { key: "dusty-pink", label: "くすみピンク", hex: "#E7B8BC" },
  { key: "peach", label: "ピーチ", hex: "#F6CDB4" },
  { key: "lavender", label: "ラベンダー", hex: "#CBBBE4" },
  { key: "mint", label: "ミント", hex: "#BCE0D0" },
  { key: "dusty-blue", label: "くすみブルー", hex: "#AFC6D8" },
  { key: "lemon", label: "レモン", hex: "#F5E6A8" },
  { key: "pistachio", label: "ピスタチオ", hex: "#C9D3A8" },
  { key: "mocha", label: "モカ", hex: "#B59B84" },
  { key: "choco", label: "チョコ", hex: "#6B4A36" },
  { key: "charcoal", label: "チャコール", hex: "#4A4A4A" },
] as const;

export type SwatchKey = (typeof SWATCHES)[number]["key"];

export function swatchHex(key: string): string {
  return SWATCHES.find((s) => s.key === key)?.hex ?? "#FDFCFA";
}

export function swatchLabel(key: string): string {
  return SWATCHES.find((s) => s.key === key)?.label ?? key;
}

/** レタリング用フォント（Google Fonts 日本語） */
export const LETTERING_FONTS = [
  { key: "maru", label: "丸ゴシック", family: "Zen Maru Gothic" },
  { key: "mincho", label: "明朝", family: "Shippori Mincho" },
  { key: "tegaki", label: "手書き風", family: "Yomogi" },
] as const;

export type FontKey = (typeof LETTERING_FONTS)[number]["key"];

export function fontFamilyOf(key: string): string {
  return LETTERING_FONTS.find((f) => f.key === key)?.family ?? "Zen Maru Gothic";
}

export function fontLabelOf(key: string): string {
  return LETTERING_FONTS.find((f) => f.key === key)?.label ?? key;
}
