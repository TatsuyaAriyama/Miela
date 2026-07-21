import { z } from "zod";

/** エディタのキャンバスサイズ（正方形） */
export const CANVAS_SIZE = 600;

export const TextNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("text"),
  text: z.string().min(1).max(100),
  fontKey: z.enum(["maru", "mincho", "tegaki"]),
  fontSize: z.number().min(8).max(160),
  colorKey: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
});

export const StickerNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("sticker"),
  stickerKey: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  scale: z.number().min(0.2).max(5).default(1),
});

export const SceneNodeSchema = z.discriminatedUnion("type", [
  TextNodeSchema,
  StickerNodeSchema,
]);

export const SceneSchema = z.object({
  version: z.literal(1),
  base: z.object({
    shape: z.enum(["round", "heart", "square"]),
    sizeGo: z.number().int().min(3).max(12),
    colorKey: z.string().min(1),
  }),
  nodes: z.array(SceneNodeSchema).max(100),
});

export type TextNode = z.infer<typeof TextNodeSchema>;
export type StickerNode = z.infer<typeof StickerNodeSchema>;
export type SceneNode = z.infer<typeof SceneNodeSchema>;
export type Scene = z.infer<typeof SceneSchema>;

export function defaultScene(input?: {
  shape?: Scene["base"]["shape"] | null;
  sizeGo?: number | null;
}): Scene {
  return {
    version: 1,
    base: {
      shape: input?.shape ?? "round",
      sizeGo: input?.sizeGo ?? 5,
      colorKey: "white",
    },
    nodes: [],
  };
}
