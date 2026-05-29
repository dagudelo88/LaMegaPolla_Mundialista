"use client";

import { useMemo } from "react";
import { MatchPredictionCard } from "@/components/predictions/match-prediction-card";
import { resolveAllKnockoutMatches } from "@/lib/bracket/knockout-resolver";
import type { BracketSlot, GroupMatchResult, KnockoutMatchDef, TeamRef } from "@/lib/bracket/types";
import { es } from "@/lib/i18n/es";
import { PHASE_LABELS, type MatchPhase } from "@/types/database";

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
  changeCosts?: Partial<Record<MatchPhase, number>>;
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
  changeCosts,
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
                    homeLabel={def ? slotLabel(def.homeSource) : "—"}
                    awayLabel={def ? slotLabel(def.awaySource) : "—"}
                    initialHome={pred ? pred.predicted_home : ""}
                    initialAway={pred ? pred.predicted_away : ""}
                    initialAdvancesTeamId={pred?.predicted_advances_team_id ?? null}
                    predictionId={pred?.id}
                    disabled={disabled || teamsResolved?.unresolved === true}
                    paidChangeMode={paidChangeMode}
                    changeCost={changeCosts?.[phase]}
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
