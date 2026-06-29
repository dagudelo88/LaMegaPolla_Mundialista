"use client";

import { useMemo } from "react";
import { MatchPredictionCard } from "@/components/predictions/match-prediction-card";
import { resolveAllKnockoutMatches } from "@/lib/bracket/knockout-resolver";
import type { GroupMatchResult, KnockoutMatchDef, TeamRef } from "@/lib/bracket/types";
import { getJornadaKey, sortJornadaKeys, type JornadaMeta } from "@/lib/jornada/build-jornada-meta";
import { es } from "@/lib/i18n/es";
import { formatBracketSlotLabel } from "@/lib/matches/slot-label";
import { formatFifaScheduleDateHeader } from "@/lib/matches/format-datetime";
import type { PaidChangeBlockReason } from "@/lib/predictions/paid-change-eligibility";
import type { MatchPhase } from "@/types/database";

interface TeamRow {
  id: number;
  fifa_code: string;
  name_es: string;
  flag_emoji: string | null;
  group_letter: string;
  fifa_ranking?: number | null;
  team_conduct_score?: number | null;
  manual_tie_break_rank?: number | null;
}

interface MatchRow {
  id: string;
  fifa_match_number: number | null;
  phase: MatchPhase;
  group_letter: string | null;
  kickoff_at: string;
  fifa_schedule_date: string;
  venue: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_source: unknown;
  away_source: unknown;
  home_team?: { id: number; fifa_code: string; name_es: string; flag_emoji: string | null } | null;
  away_team?: { id: number; fifa_code: string; name_es: string; flag_emoji: string | null } | null;
  status?: string;
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
  qualifierAdjustmentActive?: boolean;
  qualifierAdjustmentAffectedByMatchId?: Record<string, boolean>;
  paidChangeEligibleByMatchId?: Record<string, boolean>;
  paidChangeBlockReasonByMatchId?: Record<string, PaidChangeBlockReason>;
  changeCosts?: Partial<Record<MatchPhase, number>>;
  changesExhausted?: boolean;
  scoringGateByMatchId?: Record<
    string,
    {
      scorable: boolean;
      blockedTeamIds: number[];
      blockedTeamNames: string[];
      phase: MatchPhase;
    }
  >;
  onSaved?: () => void;
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
  qualifierAdjustmentActive,
  qualifierAdjustmentAffectedByMatchId,
  paidChangeEligibleByMatchId,
  paidChangeBlockReasonByMatchId,
  changeCosts,
  changesExhausted,
  scoringGateByMatchId,
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
    fifaRanking: t.fifa_ranking ?? null,
    teamConductScore: t.team_conduct_score ?? 0,
    manualTieBreakRank: t.manual_tie_break_rank ?? null,
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
      const key = getJornadaKey(match);
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
              {formatFifaScheduleDateHeader(jornadaKey)}
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

                const isKnockout = m.phase !== "group_stage";
                const matchQualifierMode = Boolean(
                  isKnockout &&
                    qualifierAdjustmentActive &&
                    qualifierAdjustmentAffectedByMatchId?.[m.id]
                );
                const cardDisabled = isKnockout
                  ? knockoutBlocked || (disabled && !matchQualifierMode)
                  : disabled && !paidChangeMode;

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
                      isKnockout && def
                        ? formatBracketSlotLabel(def.homeSource)
                        : undefined
                    }
                    awayLabel={
                      isKnockout && def
                        ? formatBracketSlotLabel(def.awaySource)
                        : undefined
                    }
                    initialHome={pred ? pred.predicted_home : ""}
                    initialAway={pred ? pred.predicted_away : ""}
                    initialAdvancesTeamId={pred?.predicted_advances_team_id ?? null}
                    predictionId={pred?.id}
                    disabled={cardDisabled}
                    paidChangeMode={paidChangeMode && !matchQualifierMode}
                    qualifierAdjustmentMode={matchQualifierMode}
                    paidChangeEligible={paidChangeEligibleByMatchId?.[m.id] ?? false}
                    paidChangeBlockReason={paidChangeBlockReasonByMatchId?.[m.id]}
                    changesExhausted={changesExhausted}
                    changeCost={changeCosts?.[m.phase]}
                    adminOverridden={pred?.admin_overridden}
                    jornadaTopScorerGoals={topScorerGoals}
                    scoringGate={isKnockout ? scoringGateByMatchId?.[m.id] : undefined}
                    matchFinished={m.status === "finished"}
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
