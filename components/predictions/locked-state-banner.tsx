"use client";

import Link from "next/link";
import { es } from "@/lib/i18n/es";

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
  return (
    <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4">
      <h2 className="font-semibold text-[var(--color-primary)]">{es.pronosticos.submitted}</h2>
      {submittedAt && (
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.pronosticos.submittedAt}{" "}
          {new Date(submittedAt).toLocaleString("es")}
        </p>
      )}
      <p className="mt-2 text-sm">{es.pronosticos.lockedBanner}</p>
      <p className="mt-2 text-sm">
        {es.dashboard.points}: <strong>{totalPoints}</strong>
        {" · "}
        {changesUsedToday}/{maxChangesPerDay} cambios hoy
        {changesUsedToday >= maxChangesPerDay && ` (${es.pronosticos.paidChangeUsed})`}
      </p>
      <Link
        href="/transparencia"
        className="mt-3 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
      >
        {es.pronosticos.viewChangeHistory} →
      </Link>
    </div>
  );
}
