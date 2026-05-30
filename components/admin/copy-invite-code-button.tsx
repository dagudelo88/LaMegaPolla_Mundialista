"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}

interface CopyInviteCodeButtonProps {
  code: string;
  size?: "sm" | "default";
}

export function CopyInviteCodeButton({ code, size = "sm" }: CopyInviteCodeButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    setError(false);
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      return;
    }
    setError(true);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleCopy}
      aria-label={`${es.admin.inviteCopy}: ${code}`}
      className="shrink-0"
    >
      {copied ? (
        <>
          <Check className="size-3.5" aria-hidden />
          {es.admin.inviteCopied}
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden />
          {error ? es.admin.inviteCopyError : es.admin.inviteCopy}
        </>
      )}
    </Button>
  );
}
