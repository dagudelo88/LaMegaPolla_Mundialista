"use server";

import { requireUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import type {
  TransparencyEntry,
  TransparencyEntryKind,
  TransparencyMatchTeam,
  TransparencyScoreChange,
} from "@/types/database";
import { PHASE_LABELS } from "@/types/database";

export type TransparencyFilter = "all" | "paid" | "admin" | "results";

const PAGE_SIZE = 50;

function formatScore(home: number | null | undefined, away: number | null | undefined): string {
  if (home == null || away == null) return "—";
  return `${home}-${away}`;
}

function buildPhaseLabel(phase: string | null, groupLetter: string | null): string | null {
  if (phase === "group_stage" && groupLetter) return `Grupo ${groupLetter}`;
  if (phase) return PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? phase;
  return null;
}

function buildMatchLabel(
  matchNumber: number | null,
  phaseLabel: string | null
): string {
  const num = matchNumber != null ? `#${matchNumber}` : "";
  return [num, phaseLabel].filter(Boolean).join(" · ") || "Partido";
}

function teamFromId(
  teamId: number | null | undefined,
  teamById: Map<number, { name: string; fifaCode: string }>
): TransparencyMatchTeam | null {
  if (teamId == null) return null;
  const team = teamById.get(teamId);
  if (!team) return null;
  return { name: team.name, fifaCode: team.fifaCode };
}

function buildScoreChange(input: {
  oldHome: number | null | undefined;
  oldAway: number | null | undefined;
  newHome: number | null | undefined;
  newAway: number | null | undefined;
  oldAdvancesTeamId?: number | null;
  newAdvancesTeamId?: number | null;
  teamById: Map<number, { name: string; fifaCode: string }>;
}): TransparencyScoreChange {
  return {
    beforeHome: input.oldHome ?? null,
    beforeAway: input.oldAway ?? null,
    afterHome: input.newHome ?? null,
    afterAway: input.newAway ?? null,
    beforeAdvancesTeam: teamFromId(input.oldAdvancesTeamId, input.teamById),
    afterAdvancesTeam: teamFromId(input.newAdvancesTeamId, input.teamById),
  };
}

interface MatchMeta {
  matchNumber: number | null;
  phase: string | null;
  groupLetter: string | null;
  homeTeam: TransparencyMatchTeam | null;
  awayTeam: TransparencyMatchTeam | null;
}

export async function loadTransparencyHistory(options?: {
  filter?: TransparencyFilter;
  page?: number;
}): Promise<{ entries: TransparencyEntry[]; hasMore: boolean }> {
  await requireUser();
  const supabase = await createClient();
  const filter = options?.filter ?? "all";
  const page = options?.page ?? 0;
  const fetchLimit = PAGE_SIZE * (page + 1) + 1;

  const [{ data: profiles }, { data: teams }, { data: matches }] = await Promise.all([
    supabase.from("profiles").select("id, username"),
    supabase.from("teams").select("id, name_es, fifa_code"),
    supabase
      .from("matches")
      .select("id, fifa_match_number, phase, group_letter, home_team_id, away_team_id"),
  ]);

  const usernameById = new Map((profiles ?? []).map((p) => [p.id, p.username ?? "—"]));
  const teamById = new Map(
    (teams ?? []).map((t) => [t.id, { name: t.name_es, fifaCode: t.fifa_code }])
  );

  const matchById = new Map<string, MatchMeta>(
    (matches ?? []).map((m) => [
      m.id,
      {
        matchNumber: m.fifa_match_number,
        phase: m.phase,
        groupLetter: m.group_letter,
        homeTeam: teamFromId(m.home_team_id, teamById),
        awayTeam: teamFromId(m.away_team_id, teamById),
      },
    ])
  );

  const entries: TransparencyEntry[] = [];

  function pushEntry(
    base: Omit<TransparencyEntry, "matchLabel" | "phaseLabel" | "homeTeam" | "awayTeam"> & {
      matchId?: string | null;
    }
  ) {
    const matchMeta = base.matchId ? matchById.get(base.matchId) : null;
    const phaseLabel = matchMeta
      ? buildPhaseLabel(matchMeta.phase, matchMeta.groupLetter)
      : null;

    entries.push({
      ...base,
      matchLabel: buildMatchLabel(matchMeta?.matchNumber ?? base.matchNumber, phaseLabel),
      phaseLabel,
      homeTeam: matchMeta?.homeTeam ?? null,
      awayTeam: matchMeta?.awayTeam ?? null,
    });
  }

  if (filter === "all" || filter === "paid") {
    const { data: paidChanges } = await supabase
      .from("prediction_changes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    for (const row of paidChanges ?? []) {
      const scoreChange = buildScoreChange({
        oldHome: row.old_home,
        oldAway: row.old_away,
        newHome: row.new_home,
        newAway: row.new_away,
        oldAdvancesTeamId: row.old_advances_team_id,
        newAdvancesTeamId: row.new_advances_team_id,
        teamById,
      });

      pushEntry({
        id: `paid-${row.id}`,
        kind: "paid_change",
        createdAt: row.created_at,
        playerUsername: usernameById.get(row.user_id) ?? "—",
        matchNumber: row.match_id ? matchById.get(row.match_id)?.matchNumber ?? null : null,
        matchId: row.match_id,
        beforeScore: formatScore(row.old_home, row.old_away),
        afterScore: formatScore(row.new_home, row.new_away),
        scoreChange,
        pointsSpent: row.points_spent,
      });
    }
  }

  if (filter === "all" || filter === "admin") {
    const { data: adminOverrides } = await supabase
      .from("prediction_admin_overrides")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    for (const row of adminOverrides ?? []) {
      const scoreChange = buildScoreChange({
        oldHome: row.old_home,
        oldAway: row.old_away,
        newHome: row.new_home,
        newAway: row.new_away,
        oldAdvancesTeamId: row.old_advances_team_id,
        newAdvancesTeamId: row.new_advances_team_id,
        teamById,
      });

      pushEntry({
        id: `admin-${row.id}`,
        kind: "admin_prediction",
        createdAt: row.created_at,
        playerUsername: usernameById.get(row.user_id) ?? "—",
        actorUsername: usernameById.get(row.admin_id) ?? "—",
        matchNumber: matchById.get(row.match_id)?.matchNumber ?? null,
        matchId: row.match_id,
        beforeScore: formatScore(row.old_home, row.old_away),
        afterScore: formatScore(row.new_home, row.new_away),
        scoreChange,
        pointsSpent: 0,
        reason: row.admin_note,
      });
    }
  }

  if (filter === "all" || filter === "results") {
    const { data: resultActions } = await supabase
      .from("admin_actions")
      .select("id, admin_id, action, target_id, details, created_at")
      .in("action", ["correct_match_result", "set_match_result"])
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    for (const row of resultActions ?? []) {
      const details = row.details as {
        previous?: { homeScore?: number; awayScore?: number };
        current?: { homeScore?: number; awayScore?: number };
      } | null;

      const scoreChange = buildScoreChange({
        oldHome: details?.previous?.homeScore,
        oldAway: details?.previous?.awayScore,
        newHome: details?.current?.homeScore,
        newAway: details?.current?.awayScore,
        teamById,
      });

      pushEntry({
        id: `result-${row.id}`,
        kind: "result_correction" as TransparencyEntryKind,
        createdAt: row.created_at,
        playerUsername: "—",
        actorUsername: usernameById.get(row.admin_id ?? "") ?? "—",
        matchNumber: row.target_id ? matchById.get(row.target_id)?.matchNumber ?? null : null,
        matchId: row.target_id,
        beforeScore: formatScore(details?.previous?.homeScore, details?.previous?.awayScore),
        afterScore: formatScore(details?.current?.homeScore, details?.current?.awayScore),
        scoreChange,
        reason:
          row.action === "set_match_result"
            ? "Resultado validado"
            : "Resultado corregido",
      });
    }
  }

  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const start = page * PAGE_SIZE;
  const slice = entries.slice(start, start + PAGE_SIZE + 1);
  const hasMore = slice.length > PAGE_SIZE;

  return {
    entries: slice.slice(0, PAGE_SIZE),
    hasMore,
  };
}
