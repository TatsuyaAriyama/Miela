"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "コピー",
  variant = "outline",
  size = "sm",
}: {
  text: string;
  label?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "default";
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success("コピーしました");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("コピーできませんでした");
        }
      }}
    >
      {copied ? "コピー済み" : label}
    </Button>
  );
}
