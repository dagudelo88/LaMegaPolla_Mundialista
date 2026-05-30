"use client";

import type { PaidChangeBlockReason } from "@/lib/predictions/paid-change-eligibility";
import { MatchPredictionCard } from "@/components/predictions/match-prediction-card";
import type { MatchPhase } from "@/types/database";
import { GROUP_LETTERS } from "@/types/database";

interface MatchRow {
  id: string;
  fifa_match_number: number | null;
  phase: MatchPhase;
  group_letter: string | null;
  kickoff_at: string;
  venue: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
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

interface GroupStagePanelProps {
  matches: MatchRow[];
  predictions: PredictionRow[];
  disabled: boolean;
  paidChangeMode?: boolean;
  paidChangeEligibleByMatchId?: Record<string, boolean>;
  paidChangeBlockReasonByMatchId?: Record<string, PaidChangeBlockReason>;
  changeCost?: number;
  changesExhausted?: boolean;
}

export function GroupStagePanel({
  matches,
  predictions,
  disabled,
  paidChangeMode,
  paidChangeEligibleByMatchId,
  paidChangeBlockReasonByMatchId,
  changeCost,
  changesExhausted,
}: GroupStagePanelProps) {
  const predMap = new Map(predictions.map((p) => [p.match_id, p]));
  const groupMatches = matches.filter((m) => m.phase === "group_stage");

  return (
    <div className="space-y-4">
      {GROUP_LETTERS.map((letter) => {
        const letterMatches = groupMatches
          .filter((m) => m.group_letter === letter)
          .sort((a, b) => (a.fifa_match_number ?? 0) - (b.fifa_match_number ?? 0));
        if (!letterMatches.length) return null;

        return (
          <details key={letter} open className="rounded-xl border border-[var(--color-border)]">
            <summary className="cursor-pointer px-4 py-3 font-semibold">
              Grupo {letter}
            </summary>
            <div className="grid gap-3 border-t border-[var(--color-border)] p-4 sm:grid-cols-2">
              {letterMatches.map((m) => {
                const pred = predMap.get(m.id);
                return (
                  <MatchPredictionCard
                    key={m.id}
                    matchId={m.id}
                    matchNumber={m.fifa_match_number ?? 0}
                    phase={m.phase}
                    kickoffAt={m.kickoff_at}
                    venue={m.venue}
                    home={m.home_team ?? null}
                    away={m.away_team ?? null}
                    initialHome={pred ? pred.predicted_home : ""}
                    initialAway={pred ? pred.predicted_away : ""}
                    initialAdvancesTeamId={pred?.predicted_advances_team_id ?? null}
                    predictionId={pred?.id}
                    disabled={disabled && (!paidChangeMode || !!changesExhausted)}
                    paidChangeMode={paidChangeMode && !changesExhausted}
                    paidChangeEligible={paidChangeEligibleByMatchId?.[m.id] ?? false}
                    paidChangeBlockReason={paidChangeBlockReasonByMatchId?.[m.id]}
                    changeCost={changeCost}
                    adminOverridden={pred?.admin_overridden}
                  />
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
