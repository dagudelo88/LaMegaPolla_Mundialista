import { TeamWithFlag } from "@/components/predictions/team-flag";
import type { PlayerGatedMatchRow } from "@/lib/scoring/load-player-points-summary";
import { es } from "@/lib/i18n/es";

interface GatedMatchesSectionProps {
  rows: PlayerGatedMatchRow[];
}

export function GatedMatchesSection({ rows }: GatedMatchesSectionProps) {
  if (!rows.length) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
      <h2 className="text-lg font-semibold">{es.dashboard.gatedTitle}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.dashboard.gatedHint}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">{es.dashboard.gatedPhase}</th>
              <th className="py-2 pr-3">{es.dashboard.prediction}</th>
              <th className="py-2 pr-3">{es.dashboard.gatedTeams}</th>
              <th className="py-2">{es.dashboard.gatedReason}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.matchId} className="border-b border-[var(--color-border)]">
                <td className="py-2 pr-3 tabular-nums">{row.matchNumber ?? "—"}</td>
                <td className="py-2 pr-3">{row.phaseLabel}</td>
                <td className="py-2 pr-3 font-mono tabular-nums">
                  {row.predictedHome}-{row.predictedAway}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-2">
                    {row.blockedTeamCodes.map((code, i) => (
                      <TeamWithFlag
                        key={`${row.matchId}-${code}`}
                        name={row.blockedTeamNames[i] ?? code}
                        fifaCode={code}
                        align="left"
                        flagSize="sm"
                        layout="inline"
                      />
                    ))}
                  </div>
                </td>
                <td className="py-2 text-[var(--color-muted-foreground)]">
                  {row.blockedTeamNames.length === 1
                    ? es.dashboard.gatedReasonOne(
                        row.blockedTeamNames[0]!,
                        row.phaseLabel
                      )
                    : es.dashboard.gatedReasonMany(row.blockedTeamNames)}
                  {row.isFinished && (
                    <span className="mt-1 block text-amber-700 dark:text-amber-400">
                      {es.dashboard.gatedFinishedNote}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
