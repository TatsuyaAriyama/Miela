"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReviewActions({ token }: { token: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"choice" | "revision">("choice");
  const [comment, setComment] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (action: "approved" | "revision_requested") => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "送信に失敗しました。時間をおいてお試しください");
        return;
      }
      router.refresh();
      window.scrollTo({ top: 0 });
    } catch {
      setError("送信に失敗しました。通信環境をご確認ください");
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        {mode === "choice" ? (
          <>
            <Button
              className="w-full"
              size="lg"
              disabled={submitting}
              onClick={() => setConfirming(true)}
            >
              このデザインでOK 🎉
            </Button>
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              disabled={submitting}
              onClick={() => setMode("revision")}
            >
              修正をお願いする
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="comment">
                修正してほしい内容
                <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Textarea
                id="comment"
                rows={4}
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="例: 文字の色をもう少し濃いピンクにしてほしいです"
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={submitting || comment.trim().length === 0}
              onClick={() => submit("revision_requested")}
            >
              {submitting ? "送信中..." : "修正依頼を送信する"}
            </Button>
            <Button
              className="w-full"
              variant="ghost"
              disabled={submitting}
              onClick={() => setMode("choice")}
            >
              戻る
            </Button>
          </>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>このデザインで確定しますか？</DialogTitle>
              <DialogDescription>
                確定後の変更はできません。作家はこのデザインで製作を始めます。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => setConfirming(false)}
              >
                やめる
              </Button>
              <Button disabled={submitting} onClick={() => submit("approved")}>
                {submitting ? "送信中..." : "確定する"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
