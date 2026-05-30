import { loadTransparencyHistory } from "@/app/actions/transparency";
import { ChangeAvailabilityBanner } from "@/components/predictions/change-availability-banner";
import { CorrectionsHistory } from "@/components/transparency/corrections-history";
import { requireUser } from "@/lib/auth/require-admin";
import { loadChangeAvailability } from "@/lib/changes/load-change-availability";
import { es } from "@/lib/i18n/es";

export default async function TransparenciaPage() {
  const user = await requireUser();
  const [{ entries, hasMore }, availability] = await Promise.all([
    loadTransparencyHistory({ filter: "all", page: 0 }),
    loadChangeAvailability(user.id),
  ]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{es.transparency.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {es.transparency.subtitle}
        </p>
      </header>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {es.transparency.todayAvailability}
        </h2>
        <ChangeAvailabilityBanner availability={availability} />
      </div>

      <CorrectionsHistory initialEntries={entries} initialHasMore={hasMore} />
    </section>
  );
}
