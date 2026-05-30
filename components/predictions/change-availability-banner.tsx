import Link from "next/link";
import type { ChangeAvailability } from "@/lib/changes/load-change-availability";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

interface ChangeAvailabilityBannerProps {
  availability: ChangeAvailability;
  showCta?: boolean;
}

export function ChangeAvailabilityBanner({
  availability,
  showCta = true,
}: ChangeAvailabilityBannerProps) {
  if (!availability.isSubmitted) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm text-[var(--color-muted-foreground)]">
        {es.pronosticos.notSubmittedYet}
      </div>
    );
  }

  if (!availability.paidChangesEnabled) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        {es.pronosticos.submittedBeforeDeadline}
      </div>
    );
  }

  const available = !availability.changesExhausted;

  return (
    <div
      className={`rounded-xl border p-4 ${
        available
          ? "border-green-500/40 bg-green-500/10"
          : "border-amber-500/40 bg-amber-500/10"
      }`}
    >
      <p className={`text-sm font-semibold ${available ? "text-green-800 dark:text-green-200" : "text-amber-900 dark:text-amber-200"}`}>
        {available
          ? es.pronosticos.paidChangeAvailable.replace(
              "{count}",
              String(availability.changesRemaining)
            )
          : es.pronosticos.paidChangeUsed}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {available ? es.pronosticos.paidChangeAvailableHint : es.pronosticos.paidChangeExhaustedHint}
      </p>
      {showCta && available && (
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link href="/pronosticos">{es.pronosticos.paidChangeGoToPredictions}</Link>
        </Button>
      )}
    </div>
  );
}
