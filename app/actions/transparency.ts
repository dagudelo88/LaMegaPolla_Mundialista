"use server";

import { requireUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import type { TransparencyEntry, TransparencyEntryKind } from "@/types/database";
import { PHASE_LABELS } from "@/types/database";

export type TransparencyFilter = "all" | "paid" | "admin" | "results";

const PAGE_SIZE = 50;

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
    supabase.from("teams").select("id, name_es"),
    supabase
      .from("matches")
      .select("id, fifa_match_number, phase, group_letter, home_team_id, away_team_id"),
  ]);

  const usernameById = new Map((profiles ?? []).map((p) => [p.id, p.username ?? "—"]));
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

  const entries: TransparencyEntry[] = [];

  if (filter === "all" || filter === "paid") {
    const { data: paidChanges } = await supabase
      .from("prediction_changes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    for (const row of paidChanges ?? []) {
      const matchMeta = row.match_id ? matchById.get(row.match_id) : null;
      entries.push({
        id: `paid-${row.id}`,
        kind: "paid_change",
        createdAt: row.created_at,
        playerUsername: usernameById.get(row.user_id) ?? "—",
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
      const matchMeta = matchById.get(row.match_id);
      entries.push({
        id: `admin-${row.id}`,
        kind: "admin_prediction",
        createdAt: row.created_at,
        playerUsername: usernameById.get(row.user_id) ?? "—",
        actorUsername: usernameById.get(row.admin_id) ?? "—",
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

      const matchMeta = row.target_id ? matchById.get(row.target_id) : null;

      entries.push({
        id: `result-${row.id}`,
        kind: "result_correction" as TransparencyEntryKind,
        createdAt: row.created_at,
        playerUsername: "—",
        actorUsername: usernameById.get(row.admin_id ?? "") ?? "—",
        matchNumber: matchMeta?.matchNumber ?? null,
        matchLabel: matchMeta
          ? buildMatchLabel(
              matchMeta.matchNumber,
              matchMeta.homeName,
              matchMeta.awayName,
              matchMeta.phase,
              matchMeta.groupLetter
            )
          : `Partido ${row.target_id?.slice(0, 8) ?? ""}`,
        beforeScore: formatScore(details?.previous?.homeScore, details?.previous?.awayScore),
        afterScore: formatScore(details?.current?.homeScore, details?.current?.awayScore),
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
