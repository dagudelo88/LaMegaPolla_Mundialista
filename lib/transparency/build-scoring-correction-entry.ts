import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransparencyEntry } from "@/types/database";

/** Fixed id so the entry is never duplicated when merging history pages. */
export const SCORING_CORRECTION_ENTRY_ID = "scoring-correction-2026-06-11-match-1";

/** When the scoring engine fix and recalculation were applied (UTC). */
export const SCORING_CORRECTION_CREATED_AT = "2026-06-11T23:15:00.000Z";

const EMPTY_SCORE_CHANGE = {
  beforeHome: null,
  beforeAway: null,
  afterHome: null,
  afterAway: null,
  beforeAdvancesTeam: null,
  afterAdvancesTeam: null,
};

export async function buildScoringCorrectionEntry(
  supabase: SupabaseClient
): Promise<TransparencyEntry | null> {
  const { data: match } = await supabase
    .from("matches")
    .select("id, fifa_match_number, phase, group_letter, home_team_id, away_team_id")
    .eq("fifa_match_number", 1)
    .maybeSingle();

  if (!match) return null;

  const teamIds = [match.home_team_id, match.away_team_id].filter(
    (id): id is number => id != null
  );

  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name_es, fifa_code").in("id", teamIds)
    : { data: [] };

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const home = match.home_team_id ? teamById.get(match.home_team_id) : null;
  const away = match.away_team_id ? teamById.get(match.away_team_id) : null;

  const phaseLabel =
    match.phase === "group_stage" && match.group_letter
      ? `Grupo ${match.group_letter}`
      : null;

  return {
    id: SCORING_CORRECTION_ENTRY_ID,
    kind: "scoring_correction",
    createdAt: SCORING_CORRECTION_CREATED_AT,
    playerUsername: "—",
    matchNumber: match.fifa_match_number,
    matchLabel: [`#${match.fifa_match_number}`, phaseLabel].filter(Boolean).join(" · "),
    phaseLabel,
    homeTeam: home ? { name: home.name_es, fifaCode: home.fifa_code } : null,
    awayTeam: away ? { name: away.name_es, fifaCode: away.fifa_code } : null,
    beforeScore: "—",
    afterScore: "—",
    scoreChange: EMPTY_SCORE_CHANGE,
    reason: "Recálculo de puntos para todos los participantes activos",
  };
}
