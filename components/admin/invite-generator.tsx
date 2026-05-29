"use client";

import { useState } from "react";
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h2 className="mb-3 text-lg font-semibold">{es.admin.invites}</h2>
      <Button onClick={handleGenerate} disabled={pending}>
        {es.admin.generate}
      </Button>
      {lastCode && (
        <p className="mt-3 font-mono text-lg text-[var(--color-accent)]">
          {lastCode}
        </p>
      )}
    </div>
  );
}
