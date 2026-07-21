"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  cancelOrderAction,
  completeOrderAction,
  issueReviewLinkAction,
  reissueFormLinkAction,
  type ActionResult,
} from "@/server/actions/orders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function useLinkAction(
  action: (orderId: string) => Promise<ActionResult>,
  successMessage: string,
) {
  const [pending, startTransition] = useTransition();
  const run = (orderId: string) => {
    startTransition(async () => {
      const result = await action(orderId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.url) {
        const copied = await copyToClipboard(result.url);
        toast.success(
          copied ? `${successMessage}（URLをコピーしました）` : successMessage,
        );
      } else {
        toast.success(successMessage);
      }
    });
  };
  return { pending, run };
}

export function ReissueFormLinkButton({ orderId }: { orderId: string }) {
  const { pending, run } = useLinkAction(
    reissueFormLinkAction,
    "フォームリンクを再発行しました",
  );
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        再発行
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>フォームリンクを再発行しますか？</DialogTitle>
            <DialogDescription>
              いま共有中のリンクは無効になります。すでにお客様へ送ったリンクが
              開けなくなる点にご注意ください。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              やめる
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                run(orderId);
              }}
            >
              再発行する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function IssueReviewLinkButton({
  orderId,
  hasMock,
  hasActiveLink,
}: {
  orderId: string;
  hasMock: boolean;
  hasActiveLink: boolean;
}) {
  const { pending, run } = useLinkAction(
    issueReviewLinkAction,
    "確認リンクを発行しました",
  );
  return (
    <Button
      type="button"
      variant={hasActiveLink ? "outline" : "default"}
      size="sm"
      disabled={pending || !hasMock}
      onClick={() => run(orderId)}
      title={!hasMock ? "先にモックを保存してください" : undefined}
    >
      {hasActiveLink ? "再発行" : "確認リンクを発行"}
    </Button>
  );
}

export function CompleteOrderButton({ orderId }: { orderId: string }) {
  const { pending, run } = useLinkAction(
    completeOrderAction,
    "完了にしました",
  );
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => run(orderId)}
    >
      完了にする
    </Button>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const { pending, run } = useLinkAction(
    cancelOrderAction,
    "キャンセルしました",
  );
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        キャンセル
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この注文をキャンセルしますか？</DialogTitle>
            <DialogDescription>
              共有リンクからのアクセスはできなくなります。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              やめる
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                run(orderId);
              }}
            >
              キャンセルする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
