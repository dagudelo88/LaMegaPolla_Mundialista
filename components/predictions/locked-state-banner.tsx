"use client";

import Link from "next/link";
import { es } from "@/lib/i18n/es";
import { formatAppDateTime } from "@/lib/matches/format-datetime";

interface LockedStateBannerProps {
  submittedAt: string | null;
  totalPoints: number;
  changesUsedToday: number;
  maxChangesPerDay: number;
}

export function LockedStateBanner({
  submittedAt,
  totalPoints,
  changesUsedToday,
  maxChangesPerDay,
}: LockedStateBannerProps) {
  const changesRemaining = Math.max(0, maxChangesPerDay - changesUsedToday);
  const changesExhausted = changesUsedToday >= maxChangesPerDay;

  return (
    <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4">
      <h2 className="font-semibold text-[var(--color-primary)]">{es.pronosticos.submitted}</h2>
      {submittedAt && (
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.pronosticos.submittedAt}{" "}
          {formatAppDateTime(submittedAt)}
        </p>
      )}
      <p className="mt-2 text-sm">{es.pronosticos.lockedBanner}</p>
      <p className="mt-2 text-sm">
        {es.dashboard.points}: <strong>{totalPoints}</strong>
      </p>
      <p
        className={`mt-2 text-sm font-medium ${
          changesExhausted
            ? "text-amber-700 dark:text-amber-300"
            : "text-green-700 dark:text-green-300"
        }`}
      >
        {changesExhausted
          ? es.pronosticos.paidChangeUsed
          : es.pronosticos.paidChangeAvailable.replace(
              "{count}",
              String(changesRemaining)
            )}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {changesExhausted
          ? es.pronosticos.paidChangeExhaustedHint
          : es.pronosticos.paidChangeAvailableHint}
      </p>
      {!changesExhausted && (
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          {es.pronosticos.paidChangeTabHint}
        </p>
      )}
      <Link
        href="/transparencia"
        className="mt-3 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
      >
        {es.pronosticos.viewChangeHistory} →
      </Link>
    </div>
  );
}
