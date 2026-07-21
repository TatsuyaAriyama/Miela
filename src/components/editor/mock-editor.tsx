"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type Konva from "konva";
import { toast } from "sonner";
import EditorStage from "./editor-stage";
import { saveMockAction } from "@/server/actions/mock";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CAKE_SHAPES,
  LETTERING_FONTS,
  SHAPE_META,
  SIZE_OPTIONS,
  SWATCHES,
  sizeLabel,
} from "@/lib/constants";
import { STICKERS, stickerDataUrl } from "@/lib/stickers";
import {
  CANVAS_SIZE,
  type Scene,
  type SceneNode,
  type TextNode,
} from "@/lib/scene";
import { cn } from "@/lib/utils";

const HISTORY_LIMIT = 50;
const EXPORT_SIZE = 1200;

export type RefImage = { url: string; name: string };

type Props = {
  orderId: string;
  initialScene: Scene;
  latestVersion: number;
  refImages: RefImage[];
};

export default function MockEditor({
  orderId,
  initialScene,
  latestVersion,
  refImages,
}: Props) {
  const router = useRouter();
  const [scene, setScene] = useState<Scene>(initialScene);
  const [past, setPast] = useState<Scene[]>([]);
  const [future, setFuture] = useState<Scene[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [version, setVersion] = useState(latestVersion);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [underlay, setUnderlay] = useState({
    index: 0,
    visible: false,
    opacity: 0.4,
  });

  const stageRef = useRef<Konva.Stage>(null);
  const underlayLayerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // レタリングフォントの読み込みを待ってからテキストを描画し直す
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await Promise.all(
          LETTERING_FONTS.map((f) =>
            document.fonts.load(`500 32px "${f.family}"`, "あA1"),
          ),
        );
        await document.fonts.ready;
      } finally {
        if (!cancelled) setFontsReady(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // キャンバスをコンテナ幅にフィットさせる
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? CANVAS_SIZE;
      setScale(Math.min(1, width / CANVAS_SIZE));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const commit = useCallback(
    (next: Scene) => {
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), scene]);
      setFuture([]);
      setScene(next);
      setDirty(true);
    },
    [scene],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [scene, ...f].slice(0, HISTORY_LIMIT));
      setScene(prev);
      setDirty(true);
      return p.slice(0, -1);
    });
    setSelectedId(null);
  }, [scene]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), scene]);
      setScene(next);
      setDirty(true);
      return f.slice(1);
    });
    setSelectedId(null);
  }, [scene]);

  const updateNode = useCallback(
    (id: string, patch: Partial<SceneNode>) => {
      commit({
        ...scene,
        nodes: scene.nodes.map((n) =>
          n.id === id ? ({ ...n, ...patch } as SceneNode) : n,
        ),
      });
    },
    [commit, scene],
  );

  const removeNode = useCallback(
    (id: string) => {
      commit({ ...scene, nodes: scene.nodes.filter((n) => n.id !== id) });
      setSelectedId(null);
    },
    [commit, scene],
  );

  const selectedNode = useMemo(
    () => scene.nodes.find((n) => n.id === selectedId) ?? null,
    [scene, selectedId],
  );

  // Delete キー削除 / Undo・Redo ショートカット
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeNode(selectedId);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, removeNode, undo, redo]);

  const addText = () => {
    const node: TextNode = {
      id: crypto.randomUUID(),
      type: "text",
      text: "HAPPY BIRTHDAY",
      fontKey: "maru",
      fontSize: 34,
      colorKey: "choco",
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      rotation: 0,
    };
    commit({ ...scene, nodes: [...scene.nodes, node] });
    setSelectedId(node.id);
  };

  const addSticker = (stickerKey: string) => {
    const jitter = (scene.nodes.length % 5) * 14 - 28;
    const node: SceneNode = {
      id: crypto.randomUUID(),
      type: "sticker",
      stickerKey,
      x: CANVAS_SIZE / 2 + jitter,
      y: CANVAS_SIZE / 2 + jitter,
      rotation: 0,
      scale: 0.8,
    };
    commit({ ...scene, nodes: [...scene.nodes, node] });
    setSelectedId(node.id);
  };

  const exportPng = (): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const underlayLayer = underlayLayerRef.current;
    const wasVisible = underlayLayer?.visible() ?? false;
    underlayLayer?.visible(false);
    try {
      return stage.toDataURL({
        x: 0,
        y: 0,
        width: CANVAS_SIZE * scale,
        height: CANVAS_SIZE * scale,
        pixelRatio: EXPORT_SIZE / (CANVAS_SIZE * scale),
        mimeType: "image/png",
      });
    } finally {
      underlayLayer?.visible(wasVisible);
    }
  };

  const save = async () => {
    setSelectedId(null);
    setSaving(true);
    try {
      // Transformer の解除を反映してから書き出す
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const pngDataUrl = exportPng();
      if (!pngDataUrl) {
        toast.error("画像の書き出しに失敗しました");
        return;
      }
      const result = await saveMockAction({ orderId, scene, pngDataUrl });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setVersion(result.version);
      setDirty(false);
      toast.success(`バージョン ${result.version} を保存しました`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const underlayUrl = refImages[underlay.index]?.url ?? null;

  return (
    <div className="space-y-4">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={past.length === 0}
          >
            ← 元に戻す
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={future.length === 0}
          >
            やり直す →
          </Button>
          {selectedNode ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => removeNode(selectedNode.id)}
            >
              削除
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {version > 0 ? `保存済み: v${version}` : "未保存"}
            {dirty ? "（未保存の変更あり）" : ""}
          </span>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "保存中..." : `保存（v${version + 1}）`}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* キャンバス */}
        <div
          ref={containerRef}
          className="mx-auto w-full max-w-[600px] overflow-hidden rounded-lg border bg-white shadow-sm"
        >
          <EditorStage
            scene={scene}
            selectedId={selectedId}
            scale={scale}
            underlay={{
              url: underlayUrl,
              visible: underlay.visible && underlayUrl != null,
              opacity: underlay.opacity,
            }}
            fontsReady={fontsReady}
            onSelect={setSelectedId}
            onNodeDragEnd={(id, pos) => updateNode(id, pos)}
            onTextTransformEnd={(id, attrs) => updateNode(id, attrs)}
            onStickerTransformEnd={(id, attrs) => updateNode(id, attrs)}
            stageRef={stageRef}
            underlayLayerRef={underlayLayerRef}
          />
        </div>

        {/* パネル */}
        <Tabs defaultValue="base" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="base">土台</TabsTrigger>
            <TabsTrigger value="text">文字</TabsTrigger>
            <TabsTrigger value="parts">パーツ</TabsTrigger>
            <TabsTrigger value="underlay">下敷き</TabsTrigger>
          </TabsList>

          {/* 土台 */}
          <TabsContent value="base" className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label>形</Label>
              <div className="grid grid-cols-3 gap-2">
                {CAKE_SHAPES.map((shape) => (
                  <Button
                    key={shape}
                    type="button"
                    variant={scene.base.shape === shape ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      commit({ ...scene, base: { ...scene.base, shape } })
                    }
                  >
                    {SHAPE_META[shape].label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>サイズ（号数）</Label>
              <div className="grid grid-cols-3 gap-2">
                {SIZE_OPTIONS.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant={scene.base.sizeGo === size ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      commit({
                        ...scene,
                        base: { ...scene.base, sizeGo: size },
                      })
                    }
                  >
                    {size}号
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {sizeLabel(scene.base.sizeGo)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>クリームの色</Label>
              <SwatchGrid
                value={scene.base.colorKey}
                onChange={(colorKey) =>
                  commit({ ...scene, base: { ...scene.base, colorKey } })
                }
              />
            </div>
          </TabsContent>

          {/* 文字 */}
          <TabsContent value="text" className="space-y-4 rounded-lg border p-4">
            <Button type="button" onClick={addText} className="w-full" size="sm">
              ＋ 文字を追加
            </Button>
            {selectedNode?.type === "text" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lettering-text">テキスト</Label>
                  <Input
                    id="lettering-text"
                    value={selectedNode.text}
                    maxLength={100}
                    onChange={(e) =>
                      updateNode(selectedNode.id, {
                        text: e.target.value || " ",
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>フォント</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {LETTERING_FONTS.map((font) => (
                      <Button
                        key={font.key}
                        type="button"
                        size="sm"
                        variant={
                          selectedNode.fontKey === font.key
                            ? "default"
                            : "outline"
                        }
                        style={{ fontFamily: `"${font.family}"` }}
                        onClick={() =>
                          updateNode(selectedNode.id, { fontKey: font.key })
                        }
                      >
                        {font.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>サイズ: {Math.round(selectedNode.fontSize)}px</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateNode(selectedNode.id, {
                          fontSize: Math.max(8, selectedNode.fontSize - 4),
                        })
                      }
                    >
                      −
                    </Button>
                    <div className="flex flex-1 gap-1.5">
                      {[24, 34, 48, 64].map((size) => (
                        <Button
                          key={size}
                          type="button"
                          variant={
                            Math.round(selectedNode.fontSize) === size
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            updateNode(selectedNode.id, { fontSize: size })
                          }
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateNode(selectedNode.id, {
                          fontSize: Math.min(160, selectedNode.fontSize + 4),
                        })
                      }
                    >
                      ＋
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>文字色</Label>
                  <SwatchGrid
                    value={selectedNode.colorKey}
                    onChange={(colorKey) =>
                      updateNode(selectedNode.id, { colorKey })
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                キャンバス上の文字をタップすると編集できます
              </p>
            )}
          </TabsContent>

          {/* デコパーツ */}
          <TabsContent value="parts" className="rounded-lg border p-4">
            <p className="mb-3 text-xs text-muted-foreground">
              タップしてキャンバスに追加。ドラッグで移動、ハンドルで拡縮・回転
            </p>
            <div className="grid grid-cols-5 gap-2">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker.key}
                  type="button"
                  title={sticker.label}
                  className="flex aspect-square items-center justify-center rounded-md border bg-white p-1.5 transition-colors hover:border-primary"
                  onClick={() => addSticker(sticker.key)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stickerDataUrl(sticker.key)}
                    alt={sticker.label}
                    className="h-full w-full"
                  />
                </button>
              ))}
            </div>
          </TabsContent>

          {/* 下敷き */}
          <TabsContent
            value="underlay"
            className="space-y-4 rounded-lg border p-4"
          >
            {refImages.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                お客様の参考画像がまだありません。フォームで画像が届くと、
                ここで下敷きとして表示できます
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label>参考画像を下に敷く</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant={underlay.visible ? "default" : "outline"}
                    onClick={() =>
                      setUnderlay((u) => ({ ...u, visible: !u.visible }))
                    }
                  >
                    {underlay.visible ? "表示中" : "非表示"}
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {refImages.map((img, i) => (
                    <button
                      key={img.url}
                      type="button"
                      className={cn(
                        "overflow-hidden rounded-md border-2",
                        underlay.index === i
                          ? "border-primary"
                          : "border-transparent",
                      )}
                      onClick={() =>
                        setUnderlay((u) => ({ ...u, index: i, visible: true }))
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.name}
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>
                    透過度: {Math.round(underlay.opacity * 100)}%
                  </Label>
                  <input
                    type="range"
                    min={0.2}
                    max={0.6}
                    step={0.05}
                    value={underlay.opacity}
                    onChange={(e) =>
                      setUnderlay((u) => ({
                        ...u,
                        opacity: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  下敷きは作業用の表示のみで、保存されるデザイン画像には含まれません
                </p>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SwatchGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {SWATCHES.map((swatch) => (
        <button
          key={swatch.key}
          type="button"
          title={swatch.label}
          aria-label={swatch.label}
          className={cn(
            "aspect-square rounded-full border transition-transform",
            value === swatch.key
              ? "scale-110 ring-2 ring-primary ring-offset-2"
              : "hover:scale-105",
          )}
          style={{ backgroundColor: swatch.hex }}
          onClick={() => onChange(swatch.key)}
        />
      ))}
    </div>
  );
}
