const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** "2026-08-01" → "8月1日(土)" */
export function formatDateJa(isoDate: string | null | undefined): string {
  if (!isoDate) return "未定";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${m}月${d}日(${WEEKDAYS_JA[date.getUTCDay()]})`;
}

/** 引き渡しまでの残り日数（過去なら負値） */
export function daysUntil(isoDate: string, today: Date = new Date()): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const base = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - base) / 86_400_000);
}

export function formatDateTimeJa(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
