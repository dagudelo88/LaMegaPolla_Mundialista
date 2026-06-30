import type { BracketGateCorrectionImpact } from "@/types/database";
import { es } from "@/lib/i18n/es";

interface BracketGateCorrectionCardBodyProps {
  impact: BracketGateCorrectionImpact;
}

export function BracketGateCorrectionCardBody({ impact }: BracketGateCorrectionCardBodyProps) {
  const n = es.transparency.bracketGateCorrectionNotice;

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
                <th className="py-2 pr-2">{n.colMatch}</th>
                <th className="py-2 pr-2 text-right">{n.colRemoved}</th>
              </tr>
            </thead>
            <tbody>
              {impact.impactedPlayers.map((player) =>
                player.matches.map((match, idx) => (
                  <tr
                    key={`${player.userId}-${match.fifaMatchNumber ?? idx}`}
                    className="border-b border-[var(--color-border)]/60"
                  >
                    <td className="py-2 pr-2">
                      {idx === 0 ? (
                        <span className="font-medium text-[var(--color-foreground)]">
                          @{player.username}
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {match.fifaMatchNumber != null ? `#${match.fifaMatchNumber}` : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-red-600 dark:text-red-400">
                      −{Math.max(0, match.storedPoints - match.expectedPoints)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs">{n.footer}</p>
    </div>
  );
}
