"use client";

import { useMemo } from "react";
import type { PaidChangeBlockReason } from "@/lib/predictions/paid-change-eligibility";
import { MatchPredictionCard } from "@/components/predictions/match-prediction-card";
import { resolveAllKnockoutMatches } from "@/lib/bracket/knockout-resolver";
import type { GroupMatchResult, KnockoutMatchDef, TeamRef } from "@/lib/bracket/types";
import { es } from "@/lib/i18n/es";
import { formatBracketSlotLabel } from "@/lib/matches/slot-label";
import { PHASE_LABELS, type MatchPhase } from "@/types/database";

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
  kickoff_at: string;
  venue: string | null;
  home_source: unknown;
  away_source: unknown;
}

interface PredictionRow {
  id: string;
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_advances_team_id: number | null;
  admin_overridden?: boolean;
}

interface KnockoutPanelProps {
  matches: MatchRow[];
  teams: TeamRow[];
  predictions: PredictionRow[];
  groupResults: GroupMatchResult[];
  advancingThirdGroups: string[];
  knockoutDefs: KnockoutMatchDef[];
  disabled: boolean;
  unlocked: boolean;
  paidChangeMode?: boolean;
  qualifierAdjustmentActive?: boolean;
  qualifierAdjustmentAffectedByMatchId?: Record<string, boolean>;
  paidChangeEligibleByMatchId?: Record<string, boolean>;
  paidChangeBlockReasonByMatchId?: Record<string, PaidChangeBlockReason>;
  changeCosts?: Partial<Record<MatchPhase, number>>;
  changesExhausted?: boolean;
  onSaved?: () => void;
}

export function KnockoutPanel({
  matches,
  teams,
  predictions,
  groupResults,
  advancingThirdGroups,
  knockoutDefs,
  disabled,
  unlocked,
  paidChangeMode,
  qualifierAdjustmentActive,
  qualifierAdjustmentAffectedByMatchId,
  paidChangeEligibleByMatchId,
  paidChangeBlockReasonByMatchId,
  changeCosts,
  changesExhausted,
  onSaved,
}: KnockoutPanelProps) {
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const predMap = useMemo(() => new Map(predictions.map((p) => [p.match_id, p])), [predictions]);

  const knockoutPredictions = useMemo(() => {
    const map = new Map<number, { predictedHome: number; predictedAway: number; predictedAdvancesTeamId?: number | null }>();
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
    if (!unlocked) return new Map();
    return resolveAllKnockoutMatches(
      knockoutDefs,
      teamRefs,
      groupResults,
      advancingThirdGroups,
      knockoutPredictions
    );
  }, [unlocked, knockoutDefs, teamRefs, groupResults, advancingThirdGroups, knockoutPredictions]);

  if (!unlocked) {
    return (
      <p className="rounded-lg border border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
        {es.pronosticos.knockoutLocked}
      </p>
    );
  }

  const phases: MatchPhase[] = [
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
  ];

  return (
    <div className="space-y-6">
      {phases.map((phase) => {
        const phaseMatches = matches
          .filter((m) => m.phase === phase)
          .sort((a, b) => (a.fifa_match_number ?? 0) - (b.fifa_match_number ?? 0));
        if (!phaseMatches.length) return null;

        return (
          <section key={phase}>
            <h3 className="mb-3 font-semibold">{PHASE_LABELS[phase]}</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {phaseMatches.map((m) => {
                const num = m.fifa_match_number ?? 0;
                const teamsResolved = resolved.get(num);
                const homeTeam = teamsResolved?.homeTeamId
                  ? teamMap.get(teamsResolved.homeTeamId) ?? null
                  : null;
                const awayTeam = teamsResolved?.awayTeamId
                  ? teamMap.get(teamsResolved.awayTeamId) ?? null
                  : null;
                const def = knockoutDefs.find((d) => d.fifaMatchNumber === num);
                const pred = predMap.get(m.id);
                const matchQualifierMode = Boolean(
                  qualifierAdjustmentActive &&
                    qualifierAdjustmentAffectedByMatchId?.[m.id]
                );

                return (
                  <MatchPredictionCard
                    key={m.id}
                    matchId={m.id}
                    matchNumber={num}
                    phase={phase}
                    kickoffAt={m.kickoff_at}
                    venue={m.venue}
                    home={homeTeam}
                    away={awayTeam}
                    homeLabel={def ? formatBracketSlotLabel(def.homeSource) : "—"}
                    awayLabel={def ? formatBracketSlotLabel(def.awaySource) : "—"}
                    initialHome={pred ? pred.predicted_home : ""}
                    initialAway={pred ? pred.predicted_away : ""}
                    initialAdvancesTeamId={pred?.predicted_advances_team_id ?? null}
                    predictionId={pred?.id}
                    disabled={
                      (disabled && !matchQualifierMode) ||
                      teamsResolved?.unresolved === true
                    }
                    paidChangeMode={paidChangeMode && !matchQualifierMode}
                    qualifierAdjustmentMode={matchQualifierMode}
                    paidChangeEligible={paidChangeEligibleByMatchId?.[m.id] ?? false}
                    paidChangeBlockReason={paidChangeBlockReasonByMatchId?.[m.id]}
                    changesExhausted={changesExhausted}
                    changeCost={changeCosts?.[phase]}
                    adminOverridden={pred?.admin_overridden}
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
