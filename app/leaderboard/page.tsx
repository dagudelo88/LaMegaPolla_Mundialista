import { createClient } from "@/lib/supabase/server";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("profiles")
    .select("username, total_points, joined_at")
    .not("username", "is", null)
    .order("total_points", { ascending: false })
    .order("joined_at", { ascending: true });

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Tabla de posiciones</h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Desempate: plenos (10/20), luego fecha de inscripción (REGLAS §8).
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="py-2">#</th>
            <th className="py-2">Nickname</th>
            <th className="py-2">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r, i) => (
            <tr key={r.username!} className="border-b border-[var(--color-border)]">
              <td className="py-2">{i + 1}</td>
              <td className="py-2 font-medium">@{r.username}</td>
              <td className="py-2">{r.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
