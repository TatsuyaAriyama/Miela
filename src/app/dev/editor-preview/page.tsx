import { notFound } from "next/navigation";
import { EditorLoader } from "@/components/editor/editor-loader";
import { defaultScene } from "@/lib/scene";

/** 開発用: DBなしでエディタの動作確認をするページ（本番では404） */
export default function EditorPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const refSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f6e2e6"/><circle cx="200" cy="200" r="150" fill="#e7b8bc"/><text x="200" y="210" text-anchor="middle" font-size="28" fill="#6b4a36">参考画像サンプル</text></svg>`,
  );
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <EditorLoader
        orderId="00000000-0000-4000-8000-000000000099"
        initialScene={defaultScene({ shape: "round", sizeGo: 5 })}
        latestVersion={0}
        refImages={[
          { url: `data:image/svg+xml;utf8,${refSvg}`, name: "sample" },
        ]}
      />
    </main>
  );
}
