"use client";

import { es } from "@/lib/i18n/es";
import { formatAppDateTime } from "@/lib/matches/format-datetime";

interface QualifierAdjustmentBannerProps {
  firstKnockoutKickoff: string | null;
}

export function QualifierAdjustmentBanner({
  firstKnockoutKickoff,
}: QualifierAdjustmentBannerProps) {
  return (
    <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4">
      <h2 className="font-semibold text-emerald-800 dark:text-emerald-200">
        {es.pronosticos.qualifierAdjustmentTitle}
      </h2>
      <p className="mt-2 text-sm">{es.pronosticos.qualifierAdjustmentHint}</p>
      {firstKnockoutKickoff && (
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          {es.pronosticos.qualifierAdjustmentDeadline.replace(
            "{deadline}",
            formatAppDateTime(firstKnockoutKickoff)
          )}
        </p>
      )}
      <p className="mt-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
        {es.pronosticos.qualifierAdjustmentKnockoutHint}
      </p>
    </div>
  );
}
