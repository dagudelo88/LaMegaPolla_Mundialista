"use client";

import { useState } from "react";
import { CopyInviteCodeButton } from "@/components/admin/copy-invite-code-button";
import { generateInviteCode } from "@/app/actions/admin";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

export function InviteGenerator() {
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleGenerate() {
    setPending(true);
    try {
      const { code } = await generateInviteCode();
      setLastCode(code);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
      <h3 className="text-sm font-semibold">{es.admin.generateInviteTitle}</h3>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.admin.generateInviteHint}
      </p>
      <Button onClick={handleGenerate} disabled={pending} className="mt-3">
        {es.admin.generate}
      </Button>
      {lastCode && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="font-mono text-lg text-[var(--color-accent)]">{lastCode}</p>
          <CopyInviteCodeButton code={lastCode} />
        </div>
      )}
    </div>
  );
}
