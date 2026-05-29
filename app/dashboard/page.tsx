import { signOut } from "@/app/actions/auth";
import { getProfile, requireUser } from "@/lib/auth/require-admin";
import { es } from "@/lib/i18n/es";
import { createClient } from "@/lib/supabase/server";
import { BugReportForm } from "@/components/bugs/bug-report-form";
import { Button } from "@/components/ui/button";
import { getAllConfig } from "@/lib/config/get-config";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const config = await getAllConfig();

  const supabase = await createClient();
  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{es.dashboard.title}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {es.dashboard.welcome},{" "}
          <span className="font-semibold text-[var(--color-accent)]">
            @{profile?.username ?? "..."}
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {es.dashboard.points}
          </p>
          <p className="text-4xl font-bold text-[var(--color-primary)]">
            {profile?.total_points ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Partidos en el sistema
          </p>
          <p className="text-4xl font-bold">{matchCount ?? 0}</p>
          {(matchCount ?? 0) === 0 && (
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
              Fase 1: ejecuta el seed FIFA cuando el calendario esté listo.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h2 className="mb-2 text-lg font-semibold">Configuración activa</h2>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          Valores desde la base de datos (REGLAS.md), no hardcodeados.
        </p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(config)
            .filter(([k]) => k.startsWith("scoring.") || k.startsWith("changes."))
            .map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2 border-b border-[var(--color-border)] py-1">
                <dt className="text-[var(--color-muted-foreground)]">{key}</dt>
                <dd className="font-mono">{JSON.stringify(value)}</dd>
              </div>
            ))}
        </dl>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Reportar un problema</h2>
        <BugReportForm />
      </div>

      <form action={signOut}>
        <Button type="submit" variant="outline">
          {es.nav.logout}
        </Button>
      </form>
    </section>
  );
}
