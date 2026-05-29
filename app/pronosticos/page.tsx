import { loadPronosticosData } from "@/app/actions/predictions";
import { PronosticosShell } from "@/components/predictions/pronosticos-shell";
import { requireUser } from "@/lib/auth/require-admin";
import { getPaidChangeCost } from "@/lib/changes/paid-change-cost";
import { getConfigNumber } from "@/lib/config/get-config";
import { es } from "@/lib/i18n/es";
import type { MatchPhase } from "@/types/database";

export default async function PronosticosPage() {
  const user = await requireUser();
  const data = await loadPronosticosData(user.id);
  const maxChangesPerDay = await getConfigNumber("changes.max_per_day", 1);

  const phases: MatchPhase[] = [
    "group_stage",
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
  ];

  const changeCosts: Partial<Record<MatchPhase, number>> = {};
  for (const phase of phases) {
    changeCosts[phase] = await getPaidChangeCost(phase);
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">{es.pronosticos.title}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">{es.pronosticos.subtitle}</p>
      </div>
      <PronosticosShell
        data={data}
        maxChangesPerDay={maxChangesPerDay}
        changeCosts={changeCosts}
      />
    </section>
  );
}
