import Link from "next/link";
import { TeamWithFlag } from "@/components/predictions/team-flag";
import type { MatchPointsAuditRow } from "@/lib/admin/load-player-points-audit";
import { es } from "@/lib/i18n/es";

interface AdminPlayerMatchPointsTableProps {
  rows: MatchPointsAuditRow[];
  userId: string;
}

export function AdminPlayerMatchPointsTable({
  rows,
  userId,
}: AdminPlayerMatchPointsTableProps) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.storedMatch += row.storedPoints ?? 0;
      acc.expectedMatch += row.expectedPoints;
      acc.delta += row.delta;
      acc.jornada += row.jornadaBonusPoints;
      acc.storedTotal += (row.storedPoints ?? 0) + row.jornadaBonusPoints;
      acc.expectedTotal += row.expectedPoints + row.jornadaBonusPoints;
      return acc;
    },
    {
      storedMatch: 0,
      expectedMatch: 0,
      delta: 0,
      jornada: 0,
      storedTotal: 0,
      expectedTotal: 0,
    }
  );

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h2 className="text-lg font-semibold">{es.admin.pointsAudit.matchTableTitle}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.admin.pointsAudit.matchTableHint}
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
          {es.admin.pointsAudit.noScoredYet}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">{es.admin.pointsAudit.match}</th>
                <th className="py-2 pr-2">{es.admin.pointsAudit.prediction}</th>
                <th className="py-2 pr-2">{es.admin.pointsAudit.actual}</th>
                <th
                  className="py-2 pr-2 text-right"
                  title={es.admin.pointsAudit.storedHint}
                >
                  {es.admin.pointsAudit.stored}
                </th>
                <th
                  className="py-2 pr-2 text-right"
                  title={es.admin.pointsAudit.expectedHint}
                >
                  {es.admin.pointsAudit.expected}
                </th>
                <th
                  className="py-2 pr-2 text-right"
                  title={es.admin.pointsAudit.differenceHint}
                >
                  {es.admin.pointsAudit.difference}
                </th>
                <th className="py-2 pr-2 text-right">{es.admin.pointsAudit.bonusCol}</th>
                <th className="py-2 text-right">{es.admin.pointsAudit.matchTableTotalCol}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hasDelta = row.delta !== 0;
                const storedRowTotal = (row.storedPoints ?? 0) + row.jornadaBonusPoints;
                return (
                  <tr
                    key={row.matchId}
                    className={`border-b border-[var(--color-border)] ${
                      row.gated ? "bg-amber-500/10" : hasDelta ? "bg-red-500/10" : ""
                    }`}
                  >
                    <td className="py-2 pr-2 tabular-nums">{row.matchNumber}</td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <TeamWithFlag
                          name={row.homeTeamName}
                          fifaCode={row.homeTeamCode}
                          align="left"
                          flagSize="sm"
                          layout="inline"
                        />
                        <span className="text-xs">vs</span>
                        <TeamWithFlag
                          name={row.awayTeamName}
                          fifaCode={row.awayTeamCode}
                          align="left"
                          flagSize="sm"
                          layout="inline"
                        />
                        {row.gated && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                            {es.admin.pointsAudit.gatedBadge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-2 font-mono tabular-nums">
                      {row.predictedHome}-{row.predictedAway}
                    </td>
                    <td className="py-2 pr-2 font-mono tabular-nums">
                      {row.actualHome}-{row.actualAway}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{row.storedPoints ?? "—"}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{row.expectedPoints}</td>
                    <td
                      className={`py-2 pr-2 text-right tabular-nums ${
                        hasDelta ? "font-semibold text-red-500" : ""
                      }`}
                    >
                      {row.delta !== 0 ? row.delta : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {row.jornadaBonusPoints > 0 ? `+${row.jornadaBonusPoints}` : "—"}
                    </td>
                    <td
                      className={`py-2 text-right font-semibold tabular-nums ${
                        storedRowTotal > 0 ? "text-[var(--color-primary)]" : ""
                      }`}
                    >
                      {storedRowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-muted)]/30 font-semibold">
                <td className="py-3 pr-2" colSpan={4}>
                  {es.admin.pointsAudit.matchTableTotalsRow}
                </td>
                <td className="py-3 pr-2 text-right tabular-nums">{totals.storedMatch}</td>
                <td className="py-3 pr-2 text-right tabular-nums">{totals.expectedMatch}</td>
                <td
                  className={`py-3 pr-2 text-right tabular-nums ${
                    totals.delta !== 0 ? "text-red-500" : ""
                  }`}
                >
                  {totals.delta !== 0 ? totals.delta : "—"}
                </td>
                <td className="py-3 pr-2 text-right tabular-nums">
                  {totals.jornada > 0 ? `+${totals.jornada}` : "—"}
                </td>
                <td className="py-3 text-right tabular-nums text-[var(--color-primary)]">
                  {totals.storedTotal}
                  {totals.storedTotal !== totals.expectedTotal && (
                    <span className="ml-1 text-xs text-red-500">
                      ({es.admin.pointsAudit.matchTableRecalcNote} {totals.expectedTotal})
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-3 text-sm">
            <Link
              href={`/admin?jugador=${userId}#corregir-pronosticos`}
              className="text-[var(--color-primary)] hover:underline"
            >
              {es.admin.pointsAudit.editPredictionsLink}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
