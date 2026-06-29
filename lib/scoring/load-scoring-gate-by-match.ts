import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { loadBracketContext, resolveUserKnockoutTeams } from "@/lib/scoring/bracket-context";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";
import type { DbMatchWithTeams, DbPrediction } from "@/lib/predictions/helpers";

export interface ScoringGateInfo {
  scorable: boolean;
  blockedTeamIds: number[];
  phase: MatchPhase;
  reason: "bracket_gate" | "group_stage";
}

export type ScoringGateByMatchId = Record<string, ScoringGateInfo>;

export async function loadScoringGateByMatchId(
  client: SupabaseClient,
  userId: string,
  predictions: DbPrediction[]
): Promise<ScoringGateByMatchId> {
  const bracketCtx = await loadBracketContext(client);
  const matches = bracketCtx.matches as unknown as DbMatchWithTeams[];
  const userResolved = resolveUserKnockoutTeams(bracketCtx, predictions, matches);

  const hasOfficialKnockoutProgress = bracketCtx.matches.some(
    (m) => m.phase !== "group_stage" && m.status === "finished"
  );
  const groupStageComplete = bracketCtx.matches
    .filter((m) => m.phase === "group_stage")
    .every((m) => m.status === "finished");

  if (!groupStageComplete && !hasOfficialKnockoutProgress) {
    return {};
  }

  const result: ScoringGateByMatchId = {};

  for (const m of bracketCtx.matches) {
    if (m.phase === "group_stage") continue;

    const gate = isKnockoutMatchScorableForUserByMatchNumber(bracketCtx, userResolved, m.id);
    result[m.id] = {
      scorable: gate.scorable,
      blockedTeamIds: gate.blockedTeams ?? [],
      phase: m.phase as MatchPhase,
      reason: "bracket_gate",
    };
  }

  return result;
}
