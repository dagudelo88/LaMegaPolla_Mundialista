import Link from "next/link";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { TeamWithFlag } from "@/components/predictions/team-flag";
import { formatPoolAmount } from "@/lib/pool/calculate-pool";
import type { DashboardData } from "@/lib/pool/load-dashboard-data";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

interface MyPollSummaryProps {
  username: string | null;
  totalPoints: number;
  data: DashboardData;
}

export function MyPollSummary({ username, totalPoints, data }: MyPollSummaryProps) {
  const fmt = (n: number) => formatPoolAmount(n, data.pool.currency);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <p className="text-sm text-[var(--color-muted-foreground)]">{es.dashboard.points}</p>
          <p className="text-4xl font-bold text-[var(--color-primary)] tabular-nums">
            {totalPoints}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <p className="text-sm text-[var(--color-muted-foreground)]">{es.dashboard.rank}</p>
          <p className="text-4xl font-bold tabular-nums">
            {data.rank != null ? `#${data.rank}` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <p className="text-sm text-[var(--color-muted-foreground)]">{es.dashboard.scoredMatches}</p>
          <p className="text-4xl font-bold tabular-nums">{data.matchPoints.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h2 className="text-lg font-semibold">{es.dashboard.poolTitle}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{es.dashboard.poolHint}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 border-b border-[var(--color-border)] py-2">
            <dt className="text-[var(--color-muted-foreground)]">{es.landing.poolParticipants}</dt>
            <dd className="font-semibold tabular-nums">{data.pool.activeParticipants}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-[var(--color-border)] py-2">
            <dt className="text-[var(--color-muted-foreground)]">{es.landing.poolTotal}</dt>
            <dd className="font-semibold tabular-nums">{fmt(data.pool.totalPool)}</dd>
          </div>
        </dl>
      </div>

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
                      <div className="flex min-w-[11rem] flex-col gap-1">
                        <TeamWithFlag
                          name={row.homeTeamName}
                          fifaCode={row.homeTeamCode}
                          align="left"
                          flagSize="sm"
                        />
                        <TeamWithFlag
                          name={row.awayTeamName}
                          fifaCode={row.awayTeamCode}
                          align="left"
                          flagSize="sm"
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
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{es.landing.leaderboardTitle}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {es.landing.leaderboardHint}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/leaderboard">{es.nav.leaderboard}</Link>
          </Button>
        </div>
        <LeaderboardTable rows={data.leaderboard} highlightUsername={username} />
      </div>
    </div>
  );
}
