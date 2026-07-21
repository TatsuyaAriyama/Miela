import { customAlphabet } from "nanoid";

/** URLセーフな英数字のみ・24文字（スペック要件: 21文字以上・推測不能） */
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const generateShareToken = customAlphabet(alphabet, 24);

export const TOKEN_PATTERN = /^[0-9A-Za-z]{20,64}$/;
