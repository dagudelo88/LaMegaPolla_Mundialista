"use client";

import { useMemo } from "react";
import { TeamFlag } from "@/components/predictions/team-flag";
import { computeAllGroupStandings } from "@/lib/bracket/group-standings";
import { rankAllThirdPlaceTeams } from "@/lib/bracket/third-place-advancement";
import type { GroupMatchResult } from "@/lib/bracket/types";
import { es } from "@/lib/i18n/es";

interface TeamRow {
  id: number;
  fifa_code: string;
  name_es: string;
  group_letter: string;
  flag_emoji: string | null;
  fifa_ranking?: number | null;
  team_conduct_score?: number | null;
  manual_tie_break_rank?: number | null;
}

interface BracketSimulatorPanelProps {
  teams: TeamRow[];
  groupResults: GroupMatchResult[];
  groupComplete: boolean;
}

export function BracketSimulatorPanel({
  teams,
  groupResults,
  groupComplete,
}: BracketSimulatorPanelProps) {
  const teamRefs = useMemo(
    () =>
      teams.map((t) => ({
        id: t.id,
        fifaCode: t.fifa_code,
        groupLetter: t.group_letter,
        fifaRanking: t.fifa_ranking ?? null,
        teamConductScore: t.team_conduct_score ?? 0,
        manualTieBreakRank: t.manual_tie_break_rank ?? null,
      })),
    [teams]
  );

  const standings = useMemo(
    () =>
      groupComplete ? computeAllGroupStandings(teamRefs, groupResults) : [],
    [groupComplete, teamRefs, groupResults]
  );

  const rankedThirds = useMemo(() => {
    if (!groupComplete) return [];
    return rankAllThirdPlaceTeams(standings);
  }, [groupComplete, standings]);

  const advancingThirdGroups = useMemo(
    () => new Set(rankedThirds.filter((entry) => entry.advances).map((entry) => entry.group)),
    [rankedThirds]
  );

  const teamAdvancesFromGroup = (group: string, rank: number) =>
    rank <= 2 || (rank === 3 && advancingThirdGroups.has(group));

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const thirdRankByGroup = useMemo(
    () => new Map(rankedThirds.map((entry) => [entry.group, entry.rankAmongThirds])),
    [rankedThirds]
  );
  const qualifiedTeams = useMemo(() => {
    if (!groupComplete) return [];

    return standings.flatMap((standing) =>
      standing.positions
        .filter((row) => teamAdvancesFromGroup(standing.group, row.rank))
        .map((row) => ({
          group: standing.group,
          code: `${row.rank}${standing.group}`,
          row,
          qualification:
            row.rank <= 2
              ? "Directo"
              : `Mejor 3.º #${thirdRankByGroup.get(standing.group) ?? "?"}`,
        }))
    );
  }, [advancingThirdGroups, groupComplete, standings, thirdRankByGroup]);

  return (
    <div className="space-y-6">
      {!groupComplete && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          {es.pronosticos.knockoutLocked}
        </p>
      )}

      {groupComplete && (
        <div className="space-y-4">
          <h3 className="font-semibold">{es.pronosticos.standingsPreview}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {standings.map((s) => (
              <div
                key={s.group}
                className="rounded-lg border border-[var(--color-border)] p-3 text-sm"
              >
                <p className="mb-2 font-semibold">Grupo {s.group}</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--color-muted-foreground)]">
                      <th className="text-left">{es.pronosticos.pos}</th>
                      <th className="text-left">{es.pronosticos.team}</th>
                      <th>{es.pronosticos.pts}</th>
                      <th>{es.pronosticos.dg}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.positions.map((row) => {
                      const team = teamById.get(row.teamId);
                      const advances = teamAdvancesFromGroup(s.group, row.rank);
                      return (
                        <tr
                          key={row.teamId}
                          className={
                            advances
                              ? "bg-[var(--color-primary)]/10 font-medium"
                              : "opacity-60"
                          }
                        >
                          <td>{row.rank}</td>
                          <td>
                            <span className="inline-flex items-center gap-1.5">
                              <TeamFlag fifaCode={row.fifaCode} name={team?.name_es} />
                              {row.fifaCode}
                            </span>
                          </td>
                          <td className="text-center">{row.pts}</td>
                          <td className="text-center">{row.gd}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] p-4">
        <h3 className="font-semibold">{es.pronosticos.thirdPlaceTitle}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.pronosticos.thirdPlaceHint}
        </p>

        {!groupComplete ? (
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
            {es.pronosticos.thirdPlacePending}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-3">#</th>
                  <th className="pb-2 pr-3">{es.pronosticos.team}</th>
                  <th className="pb-2 pr-3">Gr.</th>
                  <th className="pb-2 pr-3">{es.pronosticos.pts}</th>
                  <th className="pb-2 pr-3">{es.pronosticos.dg}</th>
                  <th className="pb-2">{es.pronosticos.thirdPlaceStatus}</th>
                </tr>
              </thead>
              <tbody>
                {rankedThirds.map((entry) => {
                  const team = teamById.get(entry.row.teamId);
                  return (
                    <tr
                      key={entry.group}
                      className={`border-b border-[var(--color-border)]/60 ${
                        entry.advances ? "bg-[var(--color-primary)]/10" : "opacity-60"
                      }`}
                    >
                      <td className="py-2 pr-3">{entry.rankAmongThirds}</td>
                      <td className="py-2 pr-3 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <TeamFlag fifaCode={entry.row.fifaCode} name={team?.name_es} />
                          {team?.name_es ?? entry.row.fifaCode}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{entry.group}</td>
                      <td className="py-2 pr-3">{entry.row.pts}</td>
                      <td className="py-2 pr-3">{entry.row.gd}</td>
                      <td className="py-2">
                        {entry.advances
                          ? es.pronosticos.thirdPlaceAdvances
                          : es.pronosticos.thirdPlaceEliminated}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {groupComplete && (
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <h3 className="font-semibold">Clasificados a eliminatorias</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Lista completa según tu pronóstico, con la nomenclatura FIFA que alimenta la llave.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-3">Código</th>
                  <th className="pb-2 pr-3">{es.pronosticos.team}</th>
                  <th className="pb-2 pr-3">Vía</th>
                  <th className="pb-2 pr-3">{es.pronosticos.pts}</th>
                  <th className="pb-2 pr-3">{es.pronosticos.dg}</th>
                  <th className="pb-2">GF</th>
                </tr>
              </thead>
              <tbody>
                {qualifiedTeams.map((entry) => {
                  const team = teamById.get(entry.row.teamId);
                  return (
                    <tr
                      key={entry.code}
                      className="border-b border-[var(--color-border)]/60"
                    >
                      <td className="py-2 pr-3">
                        <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                          {entry.code}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <TeamFlag fifaCode={entry.row.fifaCode} name={team?.name_es} />
                          {team?.name_es ?? entry.row.fifaCode}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[var(--color-muted-foreground)]">
                        {entry.qualification}
                      </td>
                      <td className="py-2 pr-3">{entry.row.pts}</td>
                      <td className="py-2 pr-3">{entry.row.gd}</td>
                      <td className="py-2">{entry.row.gf}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
