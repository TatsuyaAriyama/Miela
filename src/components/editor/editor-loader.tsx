"use client";

import dynamic from "next/dynamic";
import type { Scene } from "@/lib/scene";
import type { RefImage } from "./mock-editor";

/** react-konva は SSR 不可のためクライアントのみで読み込む */
const MockEditor = dynamic(() => import("./mock-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
      エディタを読み込み中...
    </div>
  ),
});

export function EditorLoader(props: {
  orderId: string;
  initialScene: Scene;
  latestVersion: number;
  refImages: RefImage[];
}) {
  return <MockEditor {...props} />;
}
