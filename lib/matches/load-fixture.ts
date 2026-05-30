import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createPublicSupabase } from "@/lib/supabase/public";
import type { MatchPhase, MatchWithTeams } from "@/types/database";

const MATCH_SELECT =
  "id, fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, kickoff_at, prediction_deadline, status, venue, matchday_key, home_score, away_score";

async function fetchOfficialFixture() {
  const supabase = createPublicSupabase();

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, fifa_code, name_es, group_letter, flag_emoji")
    .order("group_letter")
    .order("fifa_code");

  if (teamsError) throw new Error(teamsError.message);

  const { data: matchesRaw, error: matchesError } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .order("fifa_match_number");

  if (matchesError) throw new Error(matchesError.message);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const matches: MatchWithTeams[] = (matchesRaw ?? []).map((m) => ({
    ...m,
    phase: m.phase as MatchPhase,
    home_team: m.home_team_id ? (teamMap.get(m.home_team_id) ?? null) : null,
    away_team: m.away_team_id ? (teamMap.get(m.away_team_id) ?? null) : null,
  }));

  return { teams: teams ?? [], matches };
}

export const loadOfficialFixture = unstable_cache(
  fetchOfficialFixture,
  ["official-fixture"],
  { revalidate: 60, tags: [CACHE_TAGS.fixture] }
);
