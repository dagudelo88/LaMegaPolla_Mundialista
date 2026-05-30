"use client";

import { useMemo } from "react";
import { MatchPredictionCard } from "@/components/predictions/match-prediction-card";
import { resolveAllKnockoutMatches } from "@/lib/bracket/knockout-resolver";
import type { BracketSlot, GroupMatchResult, KnockoutMatchDef, TeamRef } from "@/lib/bracket/types";
import { getJornadaKey, sortJornadaKeys, type JornadaMeta } from "@/lib/jornada/build-jornada-meta";
import { es } from "@/lib/i18n/es";
import { formatMatchDateHeader } from "@/lib/matches/format-datetime";
import type { PaidChangeBlockReason } from "@/lib/predictions/paid-change-eligibility";
import type { MatchPhase } from "@/types/database";

interface TeamRow {
  id: number;
  fifa_code: string;
  name_es: string;
  flag_emoji: string | null;
  group_letter: string;
}

interface MatchRow {
  id: string;
  fifa_match_number: number | null;
  phase: MatchPhase;
  group_letter: string | null;
  kickoff_at: string;
  venue: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_source: unknown;
  away_source: unknown;
  home_team?: { id: number; fifa_code: string; name_es: string; flag_emoji: string | null } | null;
  away_team?: { id: number; fifa_code: string; name_es: string; flag_emoji: string | null } | null;
}

interface PredictionRow {
  id: string;
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_advances_team_id: number | null;
  admin_overridden?: boolean;
}

interface SchedulePredictionsPanelProps {
  matches: MatchRow[];
  teams: TeamRow[];
  predictions: PredictionRow[];
  groupResults: GroupMatchResult[];
  advancingThirdGroups: string[];
  knockoutDefs: KnockoutMatchDef[];
  jornadaMetaByKey: Record<string, JornadaMeta>;
  disabled: boolean;
  knockoutUnlocked: boolean;
  paidChangeMode?: boolean;
  paidChangeEligibleByMatchId?: Record<string, boolean>;
  paidChangeBlockReasonByMatchId?: Record<string, PaidChangeBlockReason>;
  changeCosts?: Partial<Record<MatchPhase, number>>;
  changesExhausted?: boolean;
  onSaved?: () => void;
}

function slotLabel(slot: BracketSlot): string {
  if (slot.type === "group_rank") {
    return `${slot.rank === 1 ? "1º" : "2º"} Grupo ${slot.group}`;
  }
  if (slot.type === "third_best") {
    return `3º (${slot.eligible_groups.join("/")})`;
  }
  if (slot.type === "match_winner") {
    return `Ganador P${slot.match_number}`;
  }
  if (slot.type === "match_loser") {
    return `Perdedor P${slot.match_number}`;
  }
  return "—";
}

export function SchedulePredictionsPanel({
  matches,
  teams,
  predictions,
  groupResults,
  advancingThirdGroups,
  knockoutDefs,
  jornadaMetaByKey,
  disabled,
  knockoutUnlocked,
  paidChangeMode,
  paidChangeEligibleByMatchId,
  paidChangeBlockReasonByMatchId,
  changeCosts,
  changesExhausted,
  onSaved,
}: SchedulePredictionsPanelProps) {
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const predMap = useMemo(() => new Map(predictions.map((p) => [p.match_id, p])), [predictions]);

  const knockoutPredictions = useMemo(() => {
    const map = new Map<
      number,
      { predictedHome: number; predictedAway: number; predictedAdvancesTeamId?: number | null }
    >();
    for (const m of matches) {
      if (m.phase === "group_stage" || !m.fifa_match_number) continue;
      const pred = predMap.get(m.id);
      if (pred) {
        map.set(m.fifa_match_number, {
          predictedHome: pred.predicted_home,
          predictedAway: pred.predicted_away,
          predictedAdvancesTeamId: pred.predicted_advances_team_id,
        });
      }
    }
    return map;
  }, [matches, predMap]);

  const teamRefs: TeamRef[] = teams.map((t) => ({
    id: t.id,
    fifaCode: t.fifa_code,
    groupLetter: t.group_letter,
  }));

  const resolved = useMemo(() => {
    if (!knockoutUnlocked) return new Map();
    return resolveAllKnockoutMatches(
      knockoutDefs,
      teamRefs,
      groupResults,
      advancingThirdGroups,
      knockoutPredictions
    );
  }, [knockoutUnlocked, knockoutDefs, teamRefs, groupResults, advancingThirdGroups, knockoutPredictions]);

  const byJornada = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const match of matches) {
      const key = getJornadaKey(match.kickoff_at);
      const list = map.get(key) ?? [];
      list.push(match);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
      );
    }
    return map;
  }, [matches]);

  const jornadaKeys = sortJornadaKeys([...byJornada.keys()]);

  if (!matches.length) {
    return <p className="text-sm">{es.pronosticos.noMatches}</p>;
  }

  return (
    <div className="space-y-8">
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
        {es.pronosticos.scheduleTopScorerHint}
      </p>

      {jornadaKeys.map((jornadaKey) => {
        const dayMatches = byJornada.get(jornadaKey)!;
        const meta = jornadaMetaByKey[jornadaKey] ?? {
          jornadaKey,
          matchCount: dayMatches.length,
          eligible: dayMatches.length >= 2,
          firstKickoff: dayMatches[0]!.kickoff_at,
          pickOpen: false,
          settled: false,
          isTie: false,
          maxTotalGoals: null,
          winningMatchIds: [],
          predictedTopScorerMatchId: null,
          predictedTopScorerGoals: null,
          earnedPoints: null,
        };

        return (
          <section key={jornadaKey} className="space-y-4">
            <h2 className="text-lg font-semibold">
              {formatMatchDateHeader(dayMatches[0]!.kickoff_at)}
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {dayMatches.map((m) => {
                const pred = predMap.get(m.id);
                const num = m.fifa_match_number ?? 0;
                const teamsResolved = m.phase !== "group_stage" ? resolved.get(num) : null;
                const def = knockoutDefs.find((d) => d.fifaMatchNumber === num);
                const homeTeam =
                  m.phase === "group_stage"
                    ? (m.home_team ?? null)
                    : teamsResolved?.homeTeamId
                      ? (teamMap.get(teamsResolved.homeTeamId) ?? null)
                      : null;
                const awayTeam =
                  m.phase === "group_stage"
                    ? (m.away_team ?? null)
                    : teamsResolved?.awayTeamId
                      ? (teamMap.get(teamsResolved.awayTeamId) ?? null)
                      : null;
                const knockoutBlocked =
                  m.phase !== "group_stage" &&
                  (!knockoutUnlocked || teamsResolved?.unresolved === true);

                const isTopScorer =
                  meta.eligible && meta.predictedTopScorerMatchId === m.id;
                const topScorerGoals = isTopScorer ? meta.predictedTopScorerGoals : null;

                return (
                  <MatchPredictionCard
                    key={m.id}
                    matchId={m.id}
                    matchNumber={num}
                    phase={m.phase}
                    groupLetter={m.group_letter}
                    kickoffAt={m.kickoff_at}
                    venue={m.venue}
                    home={homeTeam}
                    away={awayTeam}
                    homeLabel={
                      m.phase !== "group_stage" && def ? slotLabel(def.homeSource) : undefined
                    }
                    awayLabel={
                      m.phase !== "group_stage" && def ? slotLabel(def.awaySource) : undefined
                    }
                    initialHome={pred ? pred.predicted_home : ""}
                    initialAway={pred ? pred.predicted_away : ""}
                    initialAdvancesTeamId={pred?.predicted_advances_team_id ?? null}
                    predictionId={pred?.id}
                    disabled={(disabled && !paidChangeMode) || knockoutBlocked}
                    paidChangeMode={paidChangeMode}
                    paidChangeEligible={paidChangeEligibleByMatchId?.[m.id] ?? false}
                    paidChangeBlockReason={paidChangeBlockReasonByMatchId?.[m.id]}
                    changesExhausted={changesExhausted}
                    changeCost={changeCosts?.[m.phase]}
                    adminOverridden={pred?.admin_overridden}
                    jornadaTopScorerGoals={topScorerGoals}
                    onSaved={onSaved}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
