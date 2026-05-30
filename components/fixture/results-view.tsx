import { FixtureMatchRow } from "@/components/fixture/fixture-match-row";
import { TeamFlag } from "@/components/predictions/team-flag";
import { matchToFixtureSides } from "@/lib/matches/fixture-sides";
import { es } from "@/lib/i18n/es";
import { GROUP_LETTERS, PHASE_LABELS, type MatchPhase, type MatchWithTeams } from "@/types/database";

interface TeamRow {
  id: number;
  fifa_code: string;
  name_es: string;
  group_letter: string;
}

interface StandingsGroup {
  group: string;
  rows: Array<{
    rank: number;
    fifaCode: string;
    name: string;
    played: number;
    pts: number;
    gd: number;
    gf: number;
  }>;
}

interface ResultsViewProps {
  matches: MatchWithTeams[];
  standings: StandingsGroup[];
  advancingThirdGroups: Set<string>;
  stats: { finished: number; live: number; scheduled: number; total: number };
}

function teamAdvancesFromGroup(
  group: string,
  rank: number,
  advancingThirdGroups: Set<string>
) {
  return rank <= 2 || (rank === 3 && advancingThirdGroups.has(group));
}

const KNOCKOUT_ORDER: MatchPhase[] = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

export function ResultsView({ matches, standings, advancingThirdGroups, stats }: ResultsViewProps) {
  const groupMatches = matches.filter((m) => m.phase === "group_stage");

  const knockoutByPhase = new Map<MatchPhase, MatchWithTeams[]>();
  for (const phase of KNOCKOUT_ORDER) {
    const phaseMatches = matches.filter((m) => m.phase === phase);
    if (phaseMatches.length) knockoutByPhase.set(phase, phaseMatches);
  }

  if (!matches.length) {
    return (
      <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-sm text-[var(--color-muted-foreground)]">
        {es.fixture.noMatches}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {es.fixture.statsFinished}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.finished}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {es.fixture.statsLive}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.live}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {es.fixture.statsPending}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.scheduled}</p>
        </div>
      </div>

      {standings.some((s) => s.rows.some((r) => r.played > 0)) && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{es.fixture.standingsTitle}</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">{es.fixture.standingsHint}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {standings.map((group) => (
              <div
                key={group.group}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <h3 className="mb-2 font-semibold">Grupo {group.group}</h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[var(--color-muted-foreground)]">
                      <th className="py-1">#</th>
                      <th className="py-1">{es.pronosticos.team}</th>
                      <th className="py-1 text-center">{es.pronosticos.pg}</th>
                      <th className="py-1 text-center">{es.pronosticos.pts}</th>
                      <th className="py-1 text-center">{es.pronosticos.dg}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => {
                      const advances = teamAdvancesFromGroup(
                        group.group,
                        row.rank,
                        advancingThirdGroups
                      );
                      return (
                        <tr
                          key={row.fifaCode}
                          className={`border-t border-[var(--color-border)] ${
                            advances
                              ? "bg-[var(--color-primary)]/10 font-medium"
                              : "opacity-60"
                          }`}
                        >
                          <td className="py-1 tabular-nums">{row.rank}</td>
                          <td className="py-1">
                            <span className="inline-flex items-center gap-1.5">
                              <TeamFlag fifaCode={row.fifaCode} name={row.name} />
                              {row.name}
                            </span>
                          </td>
                          <td className="py-1 text-center tabular-nums">{row.played}</td>
                          <td className="py-1 text-center tabular-nums">{row.pts}</td>
                          <td className="py-1 text-center tabular-nums">{row.gd}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}

      {GROUP_LETTERS.map((letter) => {
        const letterMatches = groupMatches
          .filter((m) => m.group_letter === letter)
          .sort((a, b) => (a.fifa_match_number ?? 0) - (b.fifa_match_number ?? 0));
        if (!letterMatches.length) return null;

        return (
          <section key={letter}>
            <h2 className="mb-3 text-lg font-semibold">Grupo {letter}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {letterMatches.map((match) => {
                const sides = matchToFixtureSides(match);
                return (
                  <FixtureMatchRow
                    key={match.id}
                    matchNumber={match.fifa_match_number ?? 0}
                    phase={match.phase}
                    groupLetter={match.group_letter}
                    kickoffAt={match.kickoff_at}
                    venue={match.venue}
                    status={match.status}
                    home={sides.home}
                    away={sides.away}
                    homeScore={match.home_score}
                    awayScore={match.away_score}
                    showScore
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {[...knockoutByPhase.entries()].map(([phase, phaseMatches]) => (
        <section key={phase}>
          <h2 className="mb-3 text-lg font-semibold">{PHASE_LABELS[phase]}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {phaseMatches.map((match) => {
              const sides = matchToFixtureSides(match);
              return (
                <FixtureMatchRow
                  key={match.id}
                  matchNumber={match.fifa_match_number ?? 0}
                  phase={match.phase}
                  kickoffAt={match.kickoff_at}
                  venue={match.venue}
                  status={match.status}
                  home={sides.home}
                  away={sides.away}
                  homeScore={match.home_score}
                  awayScore={match.away_score}
                  showScore
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export type { TeamRow, StandingsGroup };
