/**
 * デコパーツのSVGアセット（プレースホルダ品質）。
 * 差し替える場合は同じ key のまま svg 文字列を置き換えるだけでよい。
 * viewBox はすべて 0 0 100 100。キャンバスには data URL 経由の Image として描画する。
 */
export type StickerDef = {
  key: string;
  label: string;
  svg: string;
};

const s = (body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

export const STICKERS: StickerDef[] = [
  {
    key: "strawberry",
    label: "いちご",
    svg: s(
      `<path d="M50 92C28 84 14 64 14 44c0-10 8-16 18-14l18 4 18-4c10-2 18 4 18 14 0 20-14 40-36 48z" fill="#E4405F"/><path d="M50 34l-8-16c-2-4 2-8 6-6l2 1V6a2 2 0 014 0v7l2-1c4-2 8 2 6 6z" fill="#5CA85C"/><g fill="#FBE8A6"><circle cx="34" cy="52" r="2.5"/><circle cx="50" cy="60" r="2.5"/><circle cx="66" cy="52" r="2.5"/><circle cx="42" cy="70" r="2.5"/><circle cx="58" cy="72" r="2.5"/><circle cx="50" cy="44" r="2.5"/></g>`,
    ),
  },
  {
    key: "cherry",
    label: "さくらんぼ",
    svg: s(
      `<path d="M38 62C36 40 48 20 68 10" stroke="#5CA85C" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M70 60C64 42 66 26 68 10" stroke="#5CA85C" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="34" cy="72" r="16" fill="#C62F4B"/><circle cx="70" cy="72" r="14" fill="#E4405F"/><ellipse cx="29" cy="66" rx="4" ry="3" fill="#fff" opacity=".5"/>`,
    ),
  },
  {
    key: "candle",
    label: "キャンドル",
    svg: s(
      `<rect x="42" y="34" width="16" height="54" rx="6" fill="#F6CDB4"/><path d="M42 44h16v6H42zm0 14h16v6H42zm0 14h16v6H42z" fill="#E7B8BC"/><path d="M50 8c6 8 8 12 8 17a8 8 0 11-16 0c0-5 2-9 8-17z" fill="#F5B84C"/><circle cx="50" cy="26" r="3.5" fill="#FBE8A6"/>`,
    ),
  },
  {
    key: "ribbon",
    label: "リボン",
    svg: s(
      `<path d="M50 50L16 28c-4-3-10 0-10 6v30c0 6 6 9 10 6z" fill="#E7B8BC"/><path d="M50 50l34-22c4-3 10 0 10 6v30c0 6-6 9-10 6z" fill="#E7B8BC"/><path d="M50 50L16 28c-4-3-10 0-10 6v4l44 20z" fill="#DFA3A8" opacity=".6"/><circle cx="50" cy="50" r="10" fill="#D98A91"/>`,
    ),
  },
  {
    key: "heart",
    label: "ハート",
    svg: s(
      `<path d="M50 86C26 68 12 52 12 36 12 22 22 12 34 12c7 0 13 4 16 10 3-6 9-10 16-10 12 0 22 10 22 24 0 16-14 32-38 50z" fill="#E4708A"/><ellipse cx="34" cy="34" rx="7" ry="5" fill="#fff" opacity=".4" transform="rotate(-20 34 34)"/>`,
    ),
  },
  {
    key: "star",
    label: "星",
    svg: s(
      `<path d="M50 6l13 27 30 4-22 21 5 30-26-14-26 14 5-30L7 37l30-4z" fill="#F5C84C"/><path d="M50 6l13 27 30 4-22 21H29L7 37l30-4z" fill="#F8D97E" opacity=".6"/>`,
    ),
  },
  {
    key: "pearl",
    label: "真珠",
    svg: s(
      `<circle cx="50" cy="50" r="30" fill="#EDE6DC"/><circle cx="50" cy="50" r="30" fill="url(#g)" opacity="0"/><ellipse cx="40" cy="38" rx="10" ry="7" fill="#fff" opacity=".8"/><path d="M50 80a30 30 0 0028-20" stroke="#D8CDBf" stroke-width="4" fill="none" opacity=".5" stroke-linecap="round"/>`,
    ),
  },
  {
    key: "bear",
    label: "クマ",
    svg: s(
      `<circle cx="26" cy="26" r="12" fill="#C89F76"/><circle cx="74" cy="26" r="12" fill="#C89F76"/><circle cx="26" cy="26" r="6" fill="#E8CDAE"/><circle cx="74" cy="26" r="6" fill="#E8CDAE"/><circle cx="50" cy="56" r="34" fill="#C89F76"/><ellipse cx="50" cy="66" rx="14" ry="11" fill="#E8CDAE"/><circle cx="38" cy="48" r="4" fill="#4A3526"/><circle cx="62" cy="48" r="4" fill="#4A3526"/><ellipse cx="50" cy="60" rx="5" ry="4" fill="#4A3526"/><path d="M50 64v6M50 70c-3 3-7 3-9 0M50 70c3 3 7 3 9 0" stroke="#4A3526" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    key: "crown",
    label: "王冠",
    svg: s(
      `<path d="M14 74l-6-40 22 14 20-28 20 28 22-14-6 40z" fill="#F5C84C"/><rect x="12" y="74" width="76" height="12" rx="4" fill="#E8B63A"/><circle cx="8" cy="32" r="6" fill="#F5C84C"/><circle cx="92" cy="32" r="6" fill="#F5C84C"/><circle cx="50" cy="18" r="6" fill="#F5C84C"/><circle cx="50" cy="62" r="5" fill="#E4405F"/><circle cx="28" cy="66" r="4" fill="#7FB5D6"/><circle cx="72" cy="66" r="4" fill="#7FB5D6"/>`,
    ),
  },
  {
    key: "flower",
    label: "花",
    svg: s(
      `<g fill="#F0A8C0"><ellipse cx="50" cy="22" rx="13" ry="17"/><ellipse cx="50" cy="78" rx="13" ry="17"/><ellipse cx="22" cy="50" rx="17" ry="13"/><ellipse cx="78" cy="50" rx="17" ry="13"/><ellipse cx="30" cy="30" rx="13" ry="13"/><ellipse cx="70" cy="30" rx="13" ry="13"/><ellipse cx="30" cy="70" rx="13" ry="13"/><ellipse cx="70" cy="70" rx="13" ry="13"/></g><circle cx="50" cy="50" r="14" fill="#F5C84C"/>`,
    ),
  },
  {
    key: "blueberry",
    label: "ブルーベリー",
    svg: s(
      `<circle cx="36" cy="60" r="20" fill="#5B6FA8"/><circle cx="68" cy="44" r="16" fill="#7184BC"/><path d="M36 44l-3-8m35 -6l-2-7" stroke="#5CA85C" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="54" r="4" fill="#fff" opacity=".3"/><circle cx="63" cy="39" r="3" fill="#fff" opacity=".3"/><path d="M32 62l4-4 4 4-4 4zM65 46l3-3 3 3-3 3z" fill="#3D4E80"/>`,
    ),
  },
  {
    key: "orange",
    label: "オレンジ",
    svg: s(
      `<circle cx="50" cy="50" r="42" fill="#F5A94C"/><circle cx="50" cy="50" r="34" fill="#FBE3B9"/><g fill="#F5B96B"><path d="M50 50V18a32 32 0 0116 5zM50 50l28-16a32 32 0 014 16zM50 50l28 16a32 32 0 01-12 12zM50 50l6 31a32 32 0 01-12 0zM50 50L22 66a32 32 0 01-4-16zM50 50L22 34a32 32 0 0112-12z"/></g>`,
    ),
  },
  {
    key: "cream",
    label: "クリーム",
    svg: s(
      `<path d="M50 6c8 6 14 12 12 20 8-2 16 2 16 10 0 6-4 10-8 12l4 40H26l4-40c-4-2-8-6-8-12 0-8 8-12 16-10-2-8 4-14 12-20z" fill="#FBF3E4"/><path d="M30 88h40l-2-24c-6 4-10 6-18 6s-12-2-18-6z" fill="#F3E3C8"/>`,
    ),
  },
  {
    key: "choco-heart",
    label: "チョコハート",
    svg: s(
      `<path d="M50 88C28 72 14 56 14 40c0-12 9-21 20-21 7 0 13 3 16 9 3-6 9-9 16-9 11 0 20 9 20 21 0 16-14 32-36 48z" fill="#6B4A36"/><path d="M28 34c2-6 8-10 14-9" stroke="#8A6752" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    key: "macaron",
    label: "マカロン",
    svg: s(
      `<ellipse cx="50" cy="36" rx="34" ry="18" fill="#CBBBE4"/><ellipse cx="50" cy="52" rx="30" ry="8" fill="#FBF3E4"/><ellipse cx="50" cy="62" rx="34" ry="16" fill="#CBBBE4"/><path d="M22 40c4 4 16 7 28 7s24-3 28-7" stroke="#B9A5DA" stroke-width="3" fill="none" opacity=".7"/>`,
    ),
  },
  {
    key: "banner",
    label: "ガーランド",
    svg: s(
      `<path d="M6 20c28 14 60 14 88 0" stroke="#B59B84" stroke-width="3" fill="none"/><path d="M14 24l8 20 10-16zM38 30l6 22 11-14zM64 32l7 15 8-19zM84 24l4 16 7-19z" fill="#E7B8BC"/><path d="M38 30l6 22 11-14z" fill="#AFC6D8"/><path d="M84 24l4 16 7-19z" fill="#BCE0D0"/>`,
    ),
  },
  {
    key: "sparkle",
    label: "キラキラ",
    svg: s(
      `<path d="M50 8c3 18 8 24 24 28-16 4-21 10-24 28-3-18-8-24-24-28 16-4 21-10 24-28z" fill="#F5DA6E"/><path d="M78 56c2 9 4 12 12 14-8 2-10 5-12 14-2-9-4-12-12-14 8-2 10-5 12-14z" fill="#F5DA6E"/><path d="M24 60c1.5 7 3 9 9 10-6 1.5-7.5 3.5-9 10-1.5-6.5-3-8.5-9-10 6-1.5 7.5-3 9-10z" fill="#F5DA6E"/>`,
    ),
  },
  {
    key: "butterfly",
    label: "ちょうちょ",
    svg: s(
      `<path d="M48 50C30 30 18 24 12 30c-6 6 0 22 14 28-14 2-18 14-12 20 6 6 20 0 34-16z" fill="#AFC6D8"/><path d="M52 50c18-20 30-26 36-20 6 6 0 22-14 28 14 2 18 14 12 20-6 6-20 0-34-16z" fill="#CBBBE4"/><rect x="47" y="28" width="6" height="48" rx="3" fill="#6B5B4E"/><path d="M50 30c-4-8-10-12-16-12M50 30c4-8 10-12 16-12" stroke="#6B5B4E" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    key: "sakura",
    label: "桜",
    svg: s(
      `<g fill="#F6CFDD"><path d="M50 8c6 8 8 14 6 22l-6 6-6-6c-2-8 0-14 6-22z"/><path d="M90 38c-4 9-9 13-17 14l-8-3 2-8c5-6 11-8 23-3z"/><path d="M75 84c-9-1-14-5-17-13l2-8 8-2c7 3 10 9 7 23z"/><path d="M25 84c3-14 6-20 13-23l8 2 2 8c-3 8-8 12-23 13z"/><path d="M10 38c12-5 18-3 23 3l-2 8-8 3c-8-1-13-5-13-14z"/></g><circle cx="50" cy="46" r="8" fill="#F0A8C0"/>`,
    ),
  },
  {
    key: "gift",
    label: "プレゼント",
    svg: s(
      `<rect x="14" y="40" width="72" height="50" rx="6" fill="#AFC6D8"/><rect x="10" y="26" width="80" height="18" rx="5" fill="#9DB8CE"/><rect x="44" y="26" width="12" height="64" fill="#FBF3E4"/><path d="M50 26C40 12 24 10 22 18c-2 8 12 12 28 8zM50 26c10-14 26-16 28-8 2 8-12 12-28 8z" fill="#E7B8BC"/>`,
    ),
  },
];

export function stickerByKey(key: string): StickerDef | undefined {
  return STICKERS.find((st) => st.key === key);
}

export function stickerDataUrl(key: string): string {
  const def = stickerByKey(key);
  if (!def) return "";
  return `data:image/svg+xml;utf8,${encodeURIComponent(def.svg)}`;
}
