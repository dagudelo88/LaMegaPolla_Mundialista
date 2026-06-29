import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAdvancementBonusKey, roundAdvancementBonusKey } from "@/lib/scoring/advancement-bonus-keys";
import {
  loadBracketContext,
  resolveUserKnockoutTeams,
  isRoundComplete,
  teamsInPhase,
} from "@/lib/scoring/bracket-context";
import {
  calculateRoundAdvancementBonus,
  teamsForRoundComparison,
} from "@/lib/scoring/calculate-round-advancement-bonus";
import { loadAdvancementBonusPerTeam } from "@/lib/scoring/load-advancement-bonus-config";
import { KNOCKOUT_PHASES } from "@/lib/scoring/knockout-phase-order";
import { nextKnockoutPhaseAfterRound } from "@/lib/scoring/knockout-phase-order";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";
import { isGateDisplayEligibleForPhase } from "@/lib/scoring/gate-display-eligibility";
import { formatGateBlockedReasons } from "@/lib/scoring/format-gate-blocked-reasons";
import type { DbMatchWithTeams, DbPrediction } from "@/lib/predictions/helpers";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { PHASE_LABELS } from "@/types/database";

export interface PlayerPointsSummary {
  matchEarned: number;
  advancementBonus: number;
  jornadaBonus: number;
  spent: number;
  profileTotal: number;
  computedNet: number;
  isBalanced: boolean;
}

export interface PlayerAdvancementBonusRow {
  bonusKey: string;
  type: "match" | "round" | "unknown";
  label: string;
  points: number;
  correctTeamIds: number[];
  teams: Array<{ id: number; name_es: string; fifa_code: string }>;
  /** Stored in DB matches computed engine (false once liquidated). */
  pendingLiquidation?: boolean;
  /** Teams user predicted in next phase but did not qualify officially. */
  incorrectCount?: number;
  /** User's team count in next phase for this round comparison. */
  userTeamCount?: number;
}

export interface PlayerGatedMatchRow {
  matchId: string;
  matchNumber: number | null;
  phase: string;
  phaseLabel: string;
  label: string;
  blockedTeamIds: number[];
  blockedTeamNames: string[];
  blockedTeamCodes: string[];
  blockedTeamReasons: string[];
  predictedHome: number;
  predictedAway: number;
  isFinished: boolean;
}

export interface PlayerPointsBreakdown {
  summary: PlayerPointsSummary;
  advancementRows: PlayerAdvancementBonusRow[];
  gatedMatches: PlayerGatedMatchRow[];
}

async function loadUserPredictions(
  client: SupabaseClient,
  userId: string
): Promise<DbPrediction[]> {
  const { data } = await client
    .from("predictions")
    .select(
      "id, match_id, predicted_home, predicted_away, predicted_is_draw, predicted_advances_team_id, locked, user_id"
    )
    .eq("user_id", userId);
  return (data ?? []) as DbPrediction[];
}

const ROUND_LABELS: Record<string, string> = {
  group_stage: "Clasificados a dieciseisavos",
  round_of_32: "Clasificados a octavos",
  round_of_16: "Clasificados a cuartos",
  quarter_final: "Clasificados a semifinales",
  semi_final: "Clasificados a la final",
  third_place: "Final y tercer puesto",
  final: "Campeón",
};

function buildUserTeamsByPhase(
  ctx: Awaited<ReturnType<typeof loadBracketContext>>,
  userResolved: Map<number, { homeTeamId: number | null; awayTeamId: number | null }>
): Map<MatchPhase, Set<number>> {
  const map = new Map<MatchPhase, Set<number>>();
  for (const phase of KNOCKOUT_PHASES) {
    map.set(phase, teamsInPhase(userResolved, ctx.knockoutDefs, phase));
  }
  return map;
}

function buildRoundAdvancementRows(
  bracketCtx: Awaited<ReturnType<typeof loadBracketContext>>,
  predictions: DbPrediction[],
  storedByKey: Map<string, { points: number; correctTeamIds: number[] }>,
  bonusPerTeam: number
): PlayerAdvancementBonusRow[] {
  const matches = bracketCtx.matches as unknown as DbMatchWithTeams[];
  const userResolved = resolveUserKnockoutTeams(bracketCtx, predictions, matches);
  const userTeamsByPhase = buildUserTeamsByPhase(bracketCtx, userResolved);
  const roundKeys = [
    "group_stage",
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
  ];

  const rows: PlayerAdvancementBonusRow[] = [];

  for (const roundKey of roundKeys) {
    if (!isRoundComplete(bracketCtx, roundKey)) continue;

    const bonusKey = roundAdvancementBonusKey(roundKey);
    const nextPhase = nextKnockoutPhaseAfterRound(roundKey);
    const { userTeamIds, officialTeamIds } = teamsForRoundComparison(
      roundKey,
      nextPhase,
      userTeamsByPhase,
      bracketCtx.officialTeamsByPhase
    );
    const computed = calculateRoundAdvancementBonus(userTeamIds, officialTeamIds, bonusPerTeam);
    const stored = storedByKey.get(bonusKey);
    const correctTeamIds =
      stored?.correctTeamIds.length ? stored.correctTeamIds : computed.correctTeamIds;
    const points = stored != null ? stored.points : computed.points;
    const count = correctTeamIds.length;

    rows.push({
      bonusKey,
      type: "round",
      label: `${ROUND_LABELS[roundKey] ?? roundKey} · ${count} país${count === 1 ? "" : "es"} × +2`,
      points,
      correctTeamIds,
      teams: [],
      pendingLiquidation: stored == null || stored.points !== computed.points,
      incorrectCount: computed.incorrectTeamIds.length,
      userTeamCount: userTeamIds.length,
    });
  }

  return rows;
}

export async function loadPlayerPointsBreakdown(
  client: SupabaseClient,
  userId: string
): Promise<PlayerPointsBreakdown> {
  const [
    bracketCtx,
    predictions,
    { data: profile },
    { data: matchPts },
    { data: advancementPts },
    { data: jornadaPts },
    { data: changes },
    bonusPerTeam,
  ] = await Promise.all([
    loadBracketContext(client),
    loadUserPredictions(client, userId),
    client.from("profiles").select("total_points").eq("id", userId).single(),
    client.from("user_match_points").select("points").eq("user_id", userId),
    client
      .from("user_advancement_bonus_points")
      .select("bonus_key, points, breakdown")
      .eq("user_id", userId),
    client.from("user_jornada_bonus_points").select("points").eq("user_id", userId),
    client.from("prediction_changes").select("points_spent").eq("user_id", userId),
    loadAdvancementBonusPerTeam(client),
  ]);

  const matchEarned = (matchPts ?? []).reduce((s, r) => s + r.points, 0);
  const storedAdvancementBonus = (advancementPts ?? []).reduce((s, r) => s + r.points, 0);
  const jornadaBonus = (jornadaPts ?? []).reduce((s, r) => s + r.points, 0);
  const spent = (changes ?? []).reduce((s, r) => s + r.points_spent, 0);
  const profileTotal = profile?.total_points ?? 0;

  const storedByKey = new Map<string, { points: number; correctTeamIds: number[] }>();
  for (const row of advancementPts ?? []) {
    const breakdown = row.breakdown as { correctTeamIds?: number[] } | null;
    storedByKey.set(row.bonus_key, {
      points: row.points,
      correctTeamIds: breakdown?.correctTeamIds ?? [],
    });
  }

  const teamIds = new Set<number>();
  for (const row of advancementPts ?? []) {
    const breakdown = row.breakdown as { correctTeamIds?: number[] } | null;
    for (const id of breakdown?.correctTeamIds ?? []) teamIds.add(id);
  }

  const roundRows = buildRoundAdvancementRows(
    bracketCtx,
    predictions,
    storedByKey,
    bonusPerTeam
  );
  for (const row of roundRows) {
    for (const id of row.correctTeamIds) teamIds.add(id);
  }

  const { data: advancementTeams } = teamIds.size
    ? await client.from("teams").select("id, name_es, fifa_code").in("id", [...teamIds])
    : { data: [] };
  const advancementTeamById = new Map((advancementTeams ?? []).map((t) => [t.id, t]));

  const matchAdvancementRows: PlayerAdvancementBonusRow[] = (advancementPts ?? [])
    .filter((r) => parseAdvancementBonusKey(r.bonus_key).type === "match" && r.points > 0)
    .map((r) => {
      const parsed = parseAdvancementBonusKey(r.bonus_key);
      const match = bracketCtx.matchById.get(parsed.id);
      return {
        bonusKey: r.bonus_key,
        type: "match" as const,
        label: match?.fifa_match_number
          ? `#${match.fifa_match_number} Avance correcto`
          : "Avance partido",
        points: r.points,
        correctTeamIds: [],
        teams: [],
      };
    });

  const advancementRows: PlayerAdvancementBonusRow[] = [
    ...roundRows.map((row) => ({
      ...row,
      teams: row.correctTeamIds
        .map((id) => advancementTeamById.get(id))
        .filter((t): t is { id: number; name_es: string; fifa_code: string } => Boolean(t)),
    })),
    ...matchAdvancementRows.map((row) => ({
      ...row,
      teams: row.correctTeamIds
        .map((id) => advancementTeamById.get(id))
        .filter((t): t is { id: number; name_es: string; fifa_code: string } => Boolean(t)),
    })),
  ];

  const hasPendingAdvancement = advancementRows.some((r) => r.pendingLiquidation);
  const computedAdvancementTotal = advancementRows.reduce((s, r) => s + r.points, 0);
  const advancementBonus = hasPendingAdvancement
    ? computedAdvancementTotal
    : storedAdvancementBonus;
  const computedNet = matchEarned + advancementBonus + jornadaBonus - spent;

  const predByMatch = new Map(predictions.map((p) => [p.match_id, p]));
  const gatedMatches: PlayerGatedMatchRow[] = [];
  const blockedIds = new Set<number>();
  const matches = bracketCtx.matches as unknown as DbMatchWithTeams[];
  const userResolved = resolveUserKnockoutTeams(bracketCtx, predictions, matches);

  for (const m of bracketCtx.matches) {
    if (m.phase === "group_stage" || !predByMatch.has(m.id)) continue;

    const phase = m.phase as MatchPhase;
    if (!isGateDisplayEligibleForPhase(bracketCtx, phase)) continue;

    const gate = isKnockoutMatchScorableForUserByMatchNumber(bracketCtx, userResolved, m.id);
    if (gate.scorable) continue;

    const pred = predByMatch.get(m.id)!;
    for (const id of gate.blockedTeams ?? []) blockedIds.add(id);

    gatedMatches.push({
      matchId: m.id,
      matchNumber: m.fifa_match_number,
      phase,
      phaseLabel: PHASE_LABELS[phase] ?? phase,
      label: m.fifa_match_number != null ? `#${m.fifa_match_number}` : m.id.slice(0, 8),
      blockedTeamIds: gate.blockedTeams ?? [],
      blockedTeamNames: [],
      blockedTeamCodes: [],
      blockedTeamReasons: [],
      predictedHome: pred.predicted_home,
      predictedAway: pred.predicted_away,
      isFinished: m.status === "finished",
    });
  }

  if (blockedIds.size) {
    const { data: blockedTeams } = await client
      .from("teams")
      .select("id, name_es, fifa_code")
      .in("id", [...blockedIds]);
    const blockedById = new Map((blockedTeams ?? []).map((t) => [t.id, t]));
    const teamNameById = new Map(
      (blockedTeams ?? []).map((t) => [t.id, t.name_es] as const)
    );
    for (const row of gatedMatches) {
      row.blockedTeamNames = row.blockedTeamIds
        .map((id) => blockedById.get(id)?.name_es)
        .filter((n): n is string => Boolean(n));
      row.blockedTeamCodes = row.blockedTeamIds
        .map((id) => blockedById.get(id)?.fifa_code)
        .filter((c): c is string => Boolean(c));
      row.blockedTeamReasons = formatGateBlockedReasons(
        bracketCtx,
        row.blockedTeamIds,
        teamNameById,
        row.phase as MatchPhase
      );
    }
  }

  gatedMatches.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));

  return {
    summary: {
      matchEarned,
      advancementBonus,
      jornadaBonus,
      spent,
      profileTotal,
      computedNet,
      isBalanced: computedNet === profileTotal,
    },
    advancementRows,
    gatedMatches: gatedMatches.filter((g) => g.isFinished || g.blockedTeamIds.length > 0),
  };
}
