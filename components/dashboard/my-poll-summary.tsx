import Link from "next/link";
import { TeamWithFlag } from "@/components/predictions/team-flag";
import { ChangeAvailabilityBanner } from "@/components/predictions/change-availability-banner";
import type { ChangeAvailability } from "@/lib/changes/load-change-availability";
import type { DashboardData } from "@/lib/pool/load-dashboard-data";
import { es } from "@/lib/i18n/es";
import { formatAppDateTime } from "@/lib/matches/format-datetime";
import { Button } from "@/components/ui/button";

interface MyPollSummaryProps {
  totalPoints: number;
  data: DashboardData;
  changeAvailability: ChangeAvailability;
}

export function MyPollSummary({ totalPoints, data, changeAvailability }: MyPollSummaryProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">{es.dashboard.points}</p>
          <p className="text-4xl font-bold text-[var(--color-primary)] tabular-nums">
            {totalPoints}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">{es.dashboard.rank}</p>
          <p className="text-4xl font-bold tabular-nums">
            {data.rank != null ? `#${data.rank}` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">{es.dashboard.scoredMatches}</p>
          <p className="text-4xl font-bold tabular-nums">{data.matchPoints.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {es.dashboard.paidChangesSpent}
          </p>
          <p className="text-4xl font-bold tabular-nums text-red-500">
            −{data.totalPointsSpent}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {data.paidChanges.length} {es.dashboard.paidChangesCountDetail}
          </p>
        </div>
      </div>

      <ChangeAvailabilityBanner availability={changeAvailability} />

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{es.dashboard.myResults}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {es.dashboard.myResultsHint}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/resultados">{es.nav.results}</Link>
          </Button>
        </div>

        {data.matchPoints.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">{es.dashboard.noScoredYet}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">{es.dashboard.match}</th>
                  <th className="py-2 pr-3">{es.dashboard.prediction}</th>
                  <th className="py-2 pr-3">{es.dashboard.actual}</th>
                  <th className="py-2">{es.dashboard.pointsCol}</th>
                </tr>
              </thead>
              <tbody>
                {data.matchPoints.map((row) => (
                  <tr
                    key={row.matchNumber}
                    className={`border-b border-[var(--color-border)] ${
                      row.points > 0 ? "bg-[var(--color-primary)]/5" : ""
                    }`}
                  >
                    <td className="py-2 pr-3 tabular-nums">{row.matchNumber}</td>
                    <td className="py-2 pr-3">
                      <div className="flex min-w-[14rem] flex-wrap items-center gap-x-2 gap-y-1">
                        <TeamWithFlag
                          name={row.homeTeamName}
                          fifaCode={row.homeTeamCode}
                          align="left"
                          flagSize="sm"
                          layout="inline"
                        />
                        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                          vs
                        </span>
                        <TeamWithFlag
                          name={row.awayTeamName}
                          fifaCode={row.awayTeamCode}
                          align="left"
                          flagSize="sm"
                          layout="inline"
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums">
                      {row.predictedHome}-{row.predictedAway}
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums">
                      {row.actualHome}-{row.actualAway}
                    </td>
                    <td
                      className={`py-2 font-semibold tabular-nums ${
                        row.points > 0 ? "text-[var(--color-primary)]" : ""
                      }`}
                    >
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{es.dashboard.paidChangesTitle}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {es.dashboard.paidChangesHint}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-right">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {es.dashboard.paidChangesTotal}
              </p>
              <p className="text-2xl font-bold tabular-nums text-red-500">
                −{data.totalPointsSpent} pts
              </p>
            </div>
            {changeAvailability.isSubmitted && !changeAvailability.changesExhausted && (
              <Button asChild size="sm" variant="outline">
                <Link href="/pronosticos">{es.dashboard.paidChangeGoToPredictions}</Link>
              </Button>
            )}
          </div>
        </div>

        {data.paidChanges.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {es.dashboard.paidChangesEmpty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                  <th className="py-2 pr-3">{es.dashboard.paidChangesDate}</th>
                  <th className="py-2 pr-3">{es.dashboard.paidChangesMatch}</th>
                  <th className="py-2 pr-3">{es.dashboard.paidChangesChange}</th>
                  <th className="py-2">{es.dashboard.paidChangesPoints}</th>
                </tr>
              </thead>
              <tbody>
                {data.paidChanges.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-border)]">
                    <td className="py-2 pr-3 whitespace-nowrap text-[var(--color-muted-foreground)]">
                      {formatAppDateTime(row.createdAt)}
                    </td>
                    <td className="py-2 pr-3">{row.matchLabel}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums">
                      {row.beforeScore} → {row.afterScore}
                    </td>
                    <td className="py-2 font-semibold tabular-nums text-red-500">
                      −{row.pointsSpent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
