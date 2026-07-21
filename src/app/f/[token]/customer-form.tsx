"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  ALLERGEN_ITEMS,
  CAKE_SHAPES,
  FLAVOR_OPTIONS,
  SHAPE_META,
  SIZE_OPTIONS,
  sizeLabel,
} from "@/lib/constants";
import {
  isAllowedImage,
  MAX_UPLOAD_IMAGES,
  MAX_UPLOAD_SIZE_MB,
} from "@/lib/validation";
import { MessageCard } from "@/components/customer-shell";

type Props = {
  token: string;
  initialCustomerName: string;
  initialDeliveryDate: string;
};

export function CustomerForm({
  token,
  initialCustomerName,
  initialDeliveryDate,
}: Props) {
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files],
  );

  const todayIso = useMemo(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${m}-${d}`;
  }, []);

  if (done) {
    return (
      <MessageCard
        title="送信しました 🎂"
        body="ご回答ありがとうございます。作家がデザイン案を作成したら、確認用のリンクをお送りします。"
      />
    );
  }

  const onSelectFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_UPLOAD_IMAGES) break;
      if (!isAllowedImage(file)) continue;
      if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        setError(`画像は1枚${MAX_UPLOAD_SIZE_MB}MBまでです`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.delete("images");
      for (const f of files) formData.append("images", f);
      const res = await fetch(`/api/form/${token}`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "送信に失敗しました。時間をおいてお試しください");
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch {
      setError("送信に失敗しました。通信環境をご確認ください");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          オーダーケーキのご希望を教えてください。
          いただいた内容をもとにデザイン案を作成し、確認用リンクをお送りします。
        </p>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="customerName">
              お名前（ニックネーム可）<Req />
            </Label>
            <Input
              id="customerName"
              name="customerName"
              defaultValue={initialCustomerName}
              maxLength={40}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryDate">
              受け取り希望日<Req />
            </Label>
            <Input
              id="deliveryDate"
              name="deliveryDate"
              type="date"
              min={todayIso}
              defaultValue={initialDeliveryDate}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              サイズ<Req />
            </Label>
            <RadioGroup name="sizeGo" required className="grid grid-cols-2 gap-2">
              {SIZE_OPTIONS.map((size) => (
                <Label
                  key={size}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={String(size)} />
                  {sizeLabel(size)}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>
              形<Req />
            </Label>
            <RadioGroup name="shape" required className="grid grid-cols-3 gap-2">
              {CAKE_SHAPES.map((shape) => (
                <Label
                  key={shape}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-2 py-2.5 text-sm font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={shape} />
                  {SHAPE_META[shape].label}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>
              味<Req />
            </Label>
            <RadioGroup name="flavor" required className="grid gap-2">
              {FLAVOR_OPTIONS.map((flavor) => (
                <Label
                  key={flavor}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={flavor} />
                  {flavor}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>アレルギー（当てはまるものにチェック）</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALLERGEN_ITEMS.map((item) => (
                <Label
                  key={item.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <Checkbox name="allergyItems" value={item.key} />
                  {item.label}
                </Label>
              ))}
            </div>
            <Input
              name="allergyNote"
              placeholder="その他のアレルギーがあれば記入"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">
              イメージ画像（最大{MAX_UPLOAD_IMAGES}枚）
            </Label>
            <p className="text-xs text-muted-foreground">
              作ってほしいケーキの参考画像・手書きイメージなど
            </p>
            <Input
              ref={fileInputRef}
              id="images"
              name="images"
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              onChange={(e) => onSelectFiles(e.target.files)}
            />
            {previews.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((p, i) => (
                  <div key={`${p.name}-${i}`} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.name}
                      className="aspect-square w-full rounded-md border object-cover"
                    />
                    <button
                      type="button"
                      aria-label="削除"
                      className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-xs text-background"
                      onClick={() =>
                        setFiles(files.filter((_, idx) => idx !== i))
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requestText">ご要望・書きたい文字など</Label>
            <Textarea
              id="requestText"
              name="requestText"
              rows={4}
              maxLength={2000}
              placeholder={"例: 「HAPPY BIRTHDAY MIO」と入れてほしいです。\n全体的にくすみピンクでかわいい感じに…"}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "送信中..." : "この内容で送信する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Req() {
  return <span className="ml-0.5 text-destructive">*</span>;
}
