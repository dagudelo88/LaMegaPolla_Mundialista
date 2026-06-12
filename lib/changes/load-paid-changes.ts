import type { SupabaseClient } from "@supabase/supabase-js";
import { PHASE_LABELS } from "@/types/database";

export interface PaidChangeRow {
  id: string;
  createdAt: string;
  matchNumber: number | null;
  matchLabel: string;
  beforeScore: string;
  afterScore: string;
  pointsSpent: number;
}

function formatScore(home: number | null | undefined, away: number | null | undefined): string {
  if (home == null || away == null) return "—";
  return `${home}-${away}`;
}

function buildMatchLabel(
  matchNumber: number | null,
  homeName: string | null,
  awayName: string | null,
  phase: string | null,
  groupLetter: string | null
): string {
  const teams =
    homeName && awayName ? `${homeName} vs ${awayName}` : "Partido por definir";
  const phaseLabel =
    phase === "group_stage" && groupLetter
      ? `Grupo ${groupLetter}`
      : phase
        ? PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? phase
        : "";
  const num = matchNumber != null ? `#${matchNumber}` : "";
  return [num, teams, phaseLabel].filter(Boolean).join(" · ");
}

export async function loadPaidChanges(
  supabase: SupabaseClient,
  userId: string
): Promise<{ paidChanges: PaidChangeRow[]; totalPointsSpent: number }> {
  const { data: rows } = await supabase
    .from("prediction_changes")
    .select(
      "id, match_id, old_home, old_away, new_home, new_away, points_spent, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!rows?.length) {
    return { paidChanges: [], totalPointsSpent: 0 };
  }

  const matchIds = [...new Set(rows.map((r) => r.match_id).filter(Boolean))] as string[];

  const { data: matches } = matchIds.length
    ? await supabase
        .from("matches")
        .select("id, fifa_match_number, phase, group_letter, home_team_id, away_team_id")
        .in("id", matchIds)
    : { data: [] };

  const teamIds = [
    ...new Set(
      (matches ?? []).flatMap((m) => [m.home_team_id, m.away_team_id].filter(Boolean))
    ),
  ] as number[];

  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name_es").in("id", teamIds)
    : { data: [] as Array<{ id: number; name_es: string }> };

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name_es]));
  const matchById = new Map(
    (matches ?? []).map((m) => [
      m.id,
      {
        matchNumber: m.fifa_match_number,
        phase: m.phase,
        groupLetter: m.group_letter,
        homeName: m.home_team_id ? teamNameById.get(m.home_team_id) ?? null : null,
        awayName: m.away_team_id ? teamNameById.get(m.away_team_id) ?? null : null,
      },
    ])
  );

  const paidChanges: PaidChangeRow[] = rows.map((row) => {
    const matchMeta = row.match_id ? matchById.get(row.match_id) : null;
    return {
      id: row.id,
      createdAt: row.created_at,
      matchNumber: matchMeta?.matchNumber ?? null,
      matchLabel: matchMeta
        ? buildMatchLabel(
            matchMeta.matchNumber,
            matchMeta.homeName,
            matchMeta.awayName,
            matchMeta.phase,
            matchMeta.groupLetter
          )
        : "Partido",
      beforeScore: formatScore(row.old_home, row.old_away),
      afterScore: formatScore(row.new_home, row.new_away),
      pointsSpent: row.points_spent,
    };
  });

  const totalPointsSpent = paidChanges.reduce((sum, row) => sum + row.pointsSpent, 0);

  return { paidChanges, totalPointsSpent };
}
