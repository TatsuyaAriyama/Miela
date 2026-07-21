"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type Konva from "konva";
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Path,
  Rect,
  Stage,
  Text,
  Transformer,
} from "react-konva";
import { CANVAS_SIZE, type Scene, type SceneNode } from "@/lib/scene";
import { fontFamilyOf, swatchHex } from "@/lib/constants";
import { stickerDataUrl } from "@/lib/stickers";

const CENTER = CANVAS_SIZE / 2;
/** 1号=3cm を 13px/cm で描画 */
const PX_PER_CM = 13;
/** ハート形パス（0 0 100 100 基準） */
const HEART_PATH =
  "M50 88 C22 68 6 48 6 30 C6 14 17 4 30 4 C39 4 46 9 50 18 C54 9 61 4 70 4 C83 4 94 14 94 30 C94 48 78 68 50 88 Z";

function useHtmlImage(src: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.src = src;
    return () => {
      image.onload = null;
    };
  }, [src]);
  return img;
}

function BaseShape({ base }: { base: Scene["base"] }) {
  const sizePx = base.sizeGo * 3 * PX_PER_CM;
  const fill = swatchHex(base.colorKey);
  const shadow = {
    shadowColor: "rgba(60,30,30,0.18)",
    shadowBlur: 24,
    shadowOffsetY: 10,
  };
  if (base.shape === "round") {
    return (
      <Circle
        x={CENTER}
        y={CENTER}
        radius={sizePx / 2}
        fill={fill}
        {...shadow}
        listening={false}
      />
    );
  }
  if (base.shape === "square") {
    const side = sizePx * 0.92;
    return (
      <Rect
        x={CENTER - side / 2}
        y={CENTER - side / 2}
        width={side}
        height={side}
        cornerRadius={sizePx * 0.07}
        fill={fill}
        {...shadow}
        listening={false}
      />
    );
  }
  const scale = sizePx / 92;
  return (
    <Path
      x={CENTER - 50 * scale}
      y={CENTER - 46 * scale}
      data={HEART_PATH}
      scaleX={scale}
      scaleY={scale}
      fill={fill}
      {...shadow}
      listening={false}
    />
  );
}

function UnderlayImage({
  url,
  opacity,
}: {
  url: string | null;
  opacity: number;
}) {
  const img = useHtmlImage(url);
  if (!img) return null;
  const fit = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
  const w = img.width * fit;
  const h = img.height * fit;
  return (
    <KonvaImage
      image={img}
      x={(CANVAS_SIZE - w) / 2}
      y={(CANVAS_SIZE - h) / 2}
      width={w}
      height={h}
      opacity={opacity}
      listening={false}
    />
  );
}

function StickerNodeView({
  node,
  draggable,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  node: Extract<SceneNode, { type: "sticker" }>;
  draggable: boolean;
  onSelect: () => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
  onTransformEnd: (attrs: { x: number; y: number; rotation: number; scale: number }) => void;
}) {
  const img = useHtmlImage(stickerDataUrl(node.stickerKey));
  if (!img) return null;
  return (
    <KonvaImage
      id={node.id}
      image={img}
      x={node.x}
      y={node.y}
      width={100}
      height={100}
      offsetX={50}
      offsetY={50}
      rotation={node.rotation}
      scaleX={node.scale}
      scaleY={node.scale}
      draggable={draggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragStart={onSelect}
      onDragEnd={(e) => onDragEnd({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const target = e.target;
        onTransformEnd({
          x: target.x(),
          y: target.y(),
          rotation: target.rotation(),
          scale: target.scaleX(),
        });
      }}
    />
  );
}

function TextNodeView({
  node,
  draggable,
  fontsReady,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  node: Extract<SceneNode, { type: "text" }>;
  draggable: boolean;
  fontsReady: boolean;
  onSelect: () => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
  onTransformEnd: (attrs: {
    x: number;
    y: number;
    rotation: number;
    fontSize: number;
  }) => void;
}) {
  const ref = useRef<Konva.Text>(null);

  // x,y は中心座標として扱う（回転の基準を中央にするため offset を実寸から設定）
  useEffect(() => {
    const textNode = ref.current;
    if (!textNode) return;
    textNode.offsetX(textNode.width() / 2);
    textNode.offsetY(textNode.height() / 2);
    textNode.getLayer()?.batchDraw();
  }, [node.text, node.fontSize, node.fontKey, fontsReady]);

  return (
    <Text
      id={node.id}
      ref={ref}
      text={node.text}
      x={node.x}
      y={node.y}
      rotation={node.rotation}
      fontSize={node.fontSize}
      fontFamily={`"${fontFamilyOf(node.fontKey)}"`}
      fill={swatchHex(node.colorKey)}
      align="center"
      draggable={draggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragStart={onSelect}
      onDragEnd={(e) => onDragEnd({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const target = e.target as Konva.Text;
        const nextFontSize = Math.max(
          8,
          Math.min(160, node.fontSize * target.scaleY()),
        );
        target.scaleX(1);
        target.scaleY(1);
        onTransformEnd({
          x: target.x(),
          y: target.y(),
          rotation: target.rotation(),
          fontSize: nextFontSize,
        });
      }}
    />
  );
}

export type EditorStageProps = {
  scene: Scene;
  selectedId: string | null;
  scale: number;
  underlay: { url: string | null; visible: boolean; opacity: number };
  fontsReady: boolean;
  locked?: boolean;
  onSelect: (id: string | null) => void;
  onNodeDragEnd: (id: string, pos: { x: number; y: number }) => void;
  onTextTransformEnd: (
    id: string,
    attrs: { x: number; y: number; rotation: number; fontSize: number },
  ) => void;
  onStickerTransformEnd: (
    id: string,
    attrs: { x: number; y: number; rotation: number; scale: number },
  ) => void;
  stageRef: RefObject<Konva.Stage | null>;
  underlayLayerRef: RefObject<Konva.Layer | null>;
};

export default function EditorStage({
  scene,
  selectedId,
  scale,
  underlay,
  fontsReady,
  locked = false,
  onSelect,
  onNodeDragEnd,
  onTextTransformEnd,
  onStickerTransformEnd,
  stageRef,
  underlayLayerRef,
}: EditorStageProps) {
  const transformerRef = useRef<Konva.Transformer>(null);

  // 選択が変わったら Transformer を付け替える
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    if (!selectedId || locked) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    const target = stage.findOne(`#${selectedId}`);
    transformer.nodes(target ? [target] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, scene, fontsReady, locked, stageRef]);

  const deselectOnEmpty = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (e.target === e.target.getStage()) onSelect(null);
  };

  return (
    <Stage
      ref={stageRef}
      width={CANVAS_SIZE * scale}
      height={CANVAS_SIZE * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={deselectOnEmpty}
      onTouchStart={deselectOnEmpty}
      className="touch-none"
    >
      {/* 書き出し用の背景（白）。下敷きより下の独立レイヤー */}
      <Layer listening={false}>
        <Rect
          x={0}
          y={0}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          fill="#FFFFFF"
        />
      </Layer>

      {/* 下敷き（書き出しには含めない） */}
      <Layer ref={underlayLayerRef} listening={false} visible={underlay.visible}>
        <UnderlayImage url={underlay.url} opacity={underlay.opacity} />
      </Layer>

      <Layer>
        <BaseShape base={scene.base} />
        <Group>
          {scene.nodes.map((node) =>
            node.type === "text" ? (
              <TextNodeView
                key={`${node.id}-${fontsReady ? "f" : "l"}`}
                node={node}
                draggable={!locked}
                fontsReady={fontsReady}
                onSelect={() => onSelect(node.id)}
                onDragEnd={(pos) => onNodeDragEnd(node.id, pos)}
                onTransformEnd={(attrs) => onTextTransformEnd(node.id, attrs)}
              />
            ) : (
              <StickerNodeView
                key={node.id}
                node={node}
                draggable={!locked}
                onSelect={() => onSelect(node.id)}
                onDragEnd={(pos) => onNodeDragEnd(node.id, pos)}
                onTransformEnd={(attrs) => onStickerTransformEnd(node.id, attrs)}
              />
            ),
          )}
        </Group>
        <Transformer
          ref={transformerRef}
          rotateEnabled
          flipEnabled={false}
          keepRatio
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ]}
          anchorSize={14}
          anchorCornerRadius={7}
          rotateAnchorOffset={28}
          borderStroke="#D98A91"
          anchorStroke="#D98A91"
          anchorFill="#FFFFFF"
          boundBoxFunc={(oldBox, newBox) =>
            Math.abs(newBox.width) < 14 || Math.abs(newBox.height) < 14
              ? oldBox
              : newBox
          }
        />
      </Layer>
    </Stage>
  );
}
