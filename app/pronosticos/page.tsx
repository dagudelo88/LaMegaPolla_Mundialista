import { requireUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function PronosticosPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("id, phase, kickoff_at, status")
    .order("kickoff_at", { ascending: true })
    .limit(20);

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Pronósticos</h1>
      <p className="text-[var(--color-muted-foreground)]">
        Envío completo del torneo (REGLAS §3). Los partidos aparecerán tras el seed FIFA.
      </p>
      {matches?.length ? (
        <ul className="space-y-2 text-sm">
          {matches.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            >
              {m.phase} — {new Date(m.kickoff_at).toLocaleString("es")}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">No hay partidos cargados. Ejecuta el script de seed.</p>
      )}
    </section>
  );
}
