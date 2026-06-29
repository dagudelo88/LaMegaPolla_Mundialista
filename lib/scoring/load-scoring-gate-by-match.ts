import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { loadBracketContext, resolveUserKnockoutTeams } from "@/lib/scoring/bracket-context";
import {
  isKnockoutMatchScorableForUserByMatchNumber,
  overlappingTeamsInSlot,
} from "@/lib/scoring/bracket-gate";
import { isGateDisplayEligibleForPhase } from "@/lib/scoring/gate-display-eligibility";
import {
  formatGateBlockedReasons,
  formatSlotMismatchReasons,
} from "@/lib/scoring/format-gate-blocked-reasons";
import type { DbMatchWithTeams, DbPrediction } from "@/lib/predictions/helpers";
import { es } from "@/lib/i18n/es";

export interface ScoringGateInfo {
  scorable: boolean;
  blockedTeamIds: number[];
  blockedTeamReasons: string[];
  phase: MatchPhase;
  reason: "bracket_gate" | "slot_mismatch" | "group_stage";
  officialHomeName?: string;
  officialAwayName?: string;
  partialAdvancementHint?: string;
}

export type ScoringGateByMatchId = Record<string, ScoringGateInfo>;

export async function loadScoringGateByMatchId(
  client: SupabaseClient,
  userId: string,
  predictions: DbPrediction[],
  teamNameById: Map<number, string> = new Map()
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

    const phase = m.phase as MatchPhase;
    if (!isGateDisplayEligibleForPhase(bracketCtx, phase)) continue;

    const gate = isKnockoutMatchScorableForUserByMatchNumber(bracketCtx, userResolved, m.id);
    const blockedTeamIds = gate.blockedTeams ?? [];
    const fifaNumber = m.fifa_match_number;
    const officialPair =
      fifaNumber != null ? bracketCtx.officialKnockoutResolved.get(fifaNumber) : undefined;
    const officialHomeName =
      officialPair?.homeTeamId != null
        ? teamNameById.get(officialPair.homeTeamId) ?? null
        : null;
    const officialAwayName =
      officialPair?.awayTeamId != null
        ? teamNameById.get(officialPair.awayTeamId) ?? null
        : null;

    let blockedTeamReasons: string[] = [];
    let partialAdvancementHint: string | undefined;

    if (!gate.scorable) {
      if (gate.reason === "slot_mismatch") {
        blockedTeamReasons = formatSlotMismatchReasons(officialHomeName, officialAwayName);
        const userTeams =
          fifaNumber != null ? userResolved.get(fifaNumber) : undefined;
        if (userTeams && officialPair) {
          const overlap = overlappingTeamsInSlot(userTeams, officialPair);
          if (overlap.length === 1) {
            const name = teamNameById.get(overlap[0]!) ?? String(overlap[0]);
            partialAdvancementHint = es.gateBlocked.partialAdvancementHint(name);
          }
        }
      } else {
        blockedTeamReasons = formatGateBlockedReasons(
          bracketCtx,
          blockedTeamIds,
          teamNameById,
          phase
        );
      }
    }

    result[m.id] = {
      scorable: gate.scorable,
      blockedTeamIds,
      blockedTeamReasons,
      phase,
      reason: gate.reason === "slot_mismatch" ? "slot_mismatch" : "bracket_gate",
      ...(officialHomeName && officialAwayName
        ? { officialHomeName, officialAwayName }
        : {}),
      ...(partialAdvancementHint ? { partialAdvancementHint } : {}),
    };
  }

  return result;
}
