"use client";

import { es } from "@/lib/i18n/es";
import { formatAppDateTime } from "@/lib/matches/format-datetime";
import { GLOBAL_DEADLINE_LABEL } from "@/lib/config/tournament-deadline";

interface SubmittedEditableBannerProps {
  submittedAt: string | null;
  globalDeadline: string;
}

export function SubmittedEditableBanner({
  submittedAt,
  globalDeadline,
}: SubmittedEditableBannerProps) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <h2 className="font-semibold text-emerald-200">{es.pronosticos.submitted}</h2>
      {submittedAt && (
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.pronosticos.submittedAt} {formatAppDateTime(submittedAt)}
        </p>
      )}
      <p className="mt-2 text-sm">
        {es.pronosticos.submittedEditableBanner.replace(
          "{deadline}",
          formatAppDateTime(globalDeadline)
        )}
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
        {GLOBAL_DEADLINE_LABEL}
      </p>
    </div>
  );
}
