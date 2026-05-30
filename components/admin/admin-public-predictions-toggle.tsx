"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPublicPredictionsEnabled } from "@/app/actions/admin";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

interface AdminPublicPredictionsToggleProps {
  enabled: boolean;
}

export function AdminPublicPredictionsToggle({ enabled: initialEnabled }: AdminPublicPredictionsToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    try {
      const next = !enabled;
      await setPublicPredictionsEnabled(next);
      setEnabled(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{es.admin.publicPredictionsTitle}</h2>
          <p className="max-w-xl text-sm text-[var(--color-muted-foreground)]">
            {es.admin.publicPredictionsHint}
          </p>
          <p className="text-sm font-medium">
            {enabled ? es.admin.publicPredictionsOn : es.admin.publicPredictionsOff}
          </p>
        </div>
        <Button
          type="button"
          variant={enabled ? "outline" : "default"}
          onClick={handleToggle}
          disabled={pending}
        >
          {pending
            ? es.admin.saving
            : enabled
              ? es.admin.publicPredictionsDisable
              : es.admin.publicPredictionsEnable}
        </Button>
      </div>
    </div>
  );
}
