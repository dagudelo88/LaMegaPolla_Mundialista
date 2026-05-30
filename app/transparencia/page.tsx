import { loadTransparencyHistory } from "@/app/actions/transparency";
import { CorrectionsHistory } from "@/components/transparency/corrections-history";
import { requireUser } from "@/lib/auth/require-admin";
import { es } from "@/lib/i18n/es";

export default async function TransparenciaPage() {
  await requireUser();
  const { entries, hasMore } = await loadTransparencyHistory({ filter: "all", page: 0 });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{es.transparency.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {es.transparency.subtitle}
        </p>
      </header>

      <CorrectionsHistory initialEntries={entries} initialHasMore={hasMore} />
    </section>
  );
}
