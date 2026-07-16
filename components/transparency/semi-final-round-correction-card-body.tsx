import type { SemiFinalRoundCorrectionImpact } from "@/types/database";
import { es } from "@/lib/i18n/es";

interface SemiFinalRoundCorrectionCardBodyProps {
  impact: SemiFinalRoundCorrectionImpact;
}

export function SemiFinalRoundCorrectionCardBody({
  impact,
}: SemiFinalRoundCorrectionCardBodyProps) {
  const n = es.transparency.semiFinalRoundCorrectionNotice;

  return (
    <div className="mt-3 space-y-3 text-sm text-[var(--color-muted-foreground)]">
      <p>{n.intro}</p>
      <p>{n.rule}</p>
      <p>{n.fix}</p>

      <p className="font-medium text-[var(--color-foreground)]">{n.impactedHeading}</p>
      {impact.impactedPlayers.length === 0 ? (
        <p>{n.noImpacted}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-2">{n.colPlayer}</th>
                <th className="py-2 pr-2">{n.colConcept}</th>
                <th className="py-2 pr-2 text-right">{n.colAdded}</th>
              </tr>
            </thead>
            <tbody>
              {impact.impactedPlayers.map((player) => (
                <tr
                  key={player.username}
                  className="border-b border-[var(--color-border)]/60"
                >
                  <td className="py-2 pr-2 font-medium text-[var(--color-foreground)]">
                    @{player.username}
                  </td>
                  <td className="py-2 pr-2">{player.label}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{player.pointsAdded}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs">{n.footer}</p>
    </div>
  );
}
