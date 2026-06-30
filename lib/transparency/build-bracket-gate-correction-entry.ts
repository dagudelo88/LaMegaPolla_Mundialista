import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransparencyEntry } from "@/types/database";
import { BRACKET_GATE_CORRECTION_ACTION } from "@/lib/scoring/build-bracket-gate-impact-snapshot";
import { PHASE_LABELS } from "@/types/database";

/** Fixed id so the entry is never duplicated when merging history pages. */
export const BRACKET_GATE_CORRECTION_ENTRY_ID =
  "scoring-correction-2026-06-29-bracket-gate";

const EMPTY_SCORE_CHANGE = {
  beforeHome: null,
  beforeAway: null,
  afterHome: null,
  afterAway: null,
  beforeAdvancesTeam: null,
  afterAdvancesTeam: null,
};

export async function buildBracketGateCorrectionEntry(
  supabase: SupabaseClient
): Promise<TransparencyEntry | null> {
  const { data: action } = await supabase
    .from("admin_actions")
    .select("created_at, details")
    .eq("action", BRACKET_GATE_CORRECTION_ACTION)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!action?.details) return null;

  const details = action.details as {
    impact?: TransparencyEntry["bracketGateImpact"];
  };
  const impact = details.impact;
  if (!impact?.impactedPlayers?.length) return null;

  return {
    id: BRACKET_GATE_CORRECTION_ENTRY_ID,
    kind: "scoring_correction",
    createdAt: action.created_at,
    playerUsername: "—",
    matchNumber: null,
    matchLabel: "Eliminatorias · Regla §7 (llave completa)",
    phaseLabel: PHASE_LABELS.round_of_32 ?? "Dieciseisavos",
    homeTeam: null,
    awayTeam: null,
    beforeScore: "—",
    afterScore: "—",
    scoreChange: EMPTY_SCORE_CHANGE,
    reason: "Corrección de puntos por llave incompleta en eliminatorias",
    bracketGateImpact: impact,
  };
}
