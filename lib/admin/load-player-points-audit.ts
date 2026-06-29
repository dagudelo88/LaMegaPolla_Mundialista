import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPaidChanges, type PaidChangeRow } from "@/lib/changes/load-paid-changes";
import {
  collectJornadaKeysFromMatches,
  computeJornadaBonusByMatchId,
} from "@/lib/jornada/compute-user-jornada-bonus";
import { getJornadaKey } from "@/lib/jornada/helpers";
import { parseAdvancementBonusKey } from "@/lib/scoring/advancement-bonus-keys";
import {
  loadBracketContext,
  isRoundComplete,
  resolveUserKnockoutTeams,
} from "@/lib/scoring/bracket-context";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";
import {
  calculateMatchAdvancementBonus,
  predictedAdvancingTeamId,
  officialAdvancingTeamId,
} from "@/lib/scoring/calculate-match-advancement-bonus";
import {
  teamsForRoundComparison,
  calculateRoundAdvancementBonus,
} from "@/lib/scoring/calculate-round-advancement-bonus";
import {
  calculateMatchPoints,
  type MatchPhase,
} from "@/lib/scoring/calculate-match-points";
import { DEFAULT_JORNADA_BONUS_CONFIG } from "@/lib/scoring/calculate-jornada-bonus";
import { KNOCKOUT_PHASES, nextKnockoutPhaseAfterRound } from "@/lib/scoring/knockout-phase-order";
import { loadAdvancementBonusPerTeam } from "@/lib/scoring/load-advancement-bonus-config";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
import { teamsInPhase } from "@/lib/scoring/bracket-context";
import type { DbMatchWithTeams, DbPrediction } from "@/lib/predictions/helpers";
import type { BracketContext } from "@/lib/scoring/bracket-context";

/** Round keys audited for +2 advancement bonuses (player admin audit). */
export const ADVANCEMENT_AUDIT_ROUND_KEYS = [
  "group_stage",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
] as const;

/** Only rounds officially complete are shown in advancement audit (matches liquidation). */
export function eligibleAdvancementAuditRoundKeys(ctx: BracketContext): string[] {
  return ADVANCEMENT_AUDIT_ROUND_KEYS.filter((roundKey) => isRoundComplete(ctx, roundKey));
}

export type LedgerEntryType =
  | "match"
  | "match_advancement"
  | "round_advancement"
  | "jornada_bonus"
  | "paid_change"
  | "gate_skip";

export interface PointsLedgerEntry {
  timestamp: string;
  type: LedgerEntryType;
  label: string;
  delta: number;
  runningBalance: number;
  sortKey: string;
}

export interface MatchPointsAuditRow {
  matchId: string;
  matchNumber: number;
  phase: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCode: string;
  awayTeamCode: string;
  predictedHome: number;
  predictedAway: number;
  predictedAdvancerId: number | null;
  officialAdvancerId: number | null;
  actualHome: number;
  actualAway: number;
  storedPoints: number | null;
  expectedPoints: number;
  delta: number;
  gated: boolean;
  blockedTeams: number[];
  jornadaBonusPoints: number;
  isJornadaTopScorerPick: boolean;
}

export interface AdvancementAuditRow {
  bonusKey: string;
  type: "match" | "round" | "unknown";
  label: string;
  storedBonus: number | null;
  expectedBonus: number;
  delta: number;
  breakdown: Record<string, unknown> | null;
}

export interface JornadaAuditRow {
  jornadaKey: string;
  storedBonus: number | null;
  expectedBonus: number;
  delta: number;
}

export interface GatedMatchRow {
  matchId: string;
  matchNumber: number | null;
  phase: string;
  label: string;
  blockedTeams: number[];
  predictedHome: number;
  predictedAway: number;
}

export interface PlayerPointsAuditSummary {
  matchEarned: number;
  advancementBonus: number;
  jornadaBonus: number;
  spent: number;
  computedNet: number;
  profileTotal: number;
  isBalanced: boolean;
}

export interface PlayerPointsAudit {
  summary: PlayerPointsAuditSummary;
  matchRows: MatchPointsAuditRow[];
  advancementRows: AdvancementAuditRow[];
  jornadaRows: JornadaAuditRow[];
  gatedMatches: GatedMatchRow[];
  paidChanges: PaidChangeRow[];
  ledger: PointsLedgerEntry[];
}

async function loadUserPredictions(
  admin: SupabaseClient,
  userId: string
): Promise<DbPrediction[]> {
  const { data } = await admin
    .from("predictions")
    .select("id, match_id, predicted_home, predicted_away, predicted_is_draw, predicted_advances_team_id, locked, user_id")
    .eq("user_id", userId);
  return (data ?? []) as DbPrediction[];
}

function buildLedger(entries: Omit<PointsLedgerEntry, "runningBalance">[]): PointsLedgerEntry[] {
  const sorted = [...entries].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  let balance = 0;
  return sorted.map((e) => {
    balance += e.delta;
    return { ...e, runningBalance: balance };
  });
}

export async function loadAdminPlayerPointsAudit(
  admin: SupabaseClient,
  userId: string
): Promise<PlayerPointsAudit> {
  const [
    bracketCtx,
    scoringConfig,
    bonusPerTeam,
    predictions,
    { data: profile },
    { paidChanges, totalPointsSpent },
  ] = await Promise.all([
    loadBracketContext(admin),
    loadScoringConfig(admin),
    loadAdvancementBonusPerTeam(admin),
    loadUserPredictions(admin, userId),
    admin.from("profiles").select("total_points").eq("id", userId).single(),
    loadPaidChanges(admin, userId),
  ]);

  const matches = bracketCtx.matches as unknown as DbMatchWithTeams[];
  const userResolved = resolveUserKnockoutTeams(bracketCtx, predictions, matches);

  const { data: umpRows } = await admin
    .from("user_match_points")
    .select("match_id, points, breakdown")
    .eq("user_id", userId);

  const storedMatchById = new Map((umpRows ?? []).map((r) => [r.match_id, r]));

  const { data: advancementRows } = await admin
    .from("user_advancement_bonus_points")
    .select("bonus_key, points, breakdown, created_at")
    .eq("user_id", userId);

  const storedAdvancementByKey = new Map(
    (advancementRows ?? []).map((r) => [r.bonus_key, r])
  );

  const { data: jornadaStored } = await admin
    .from("user_jornada_bonus_points")
    .select("jornada_key, points")
    .eq("user_id", userId);

  const predByMatch = new Map(predictions.map((p) => [p.match_id, p]));

  const finishedWithPred = bracketCtx.matches.filter(
    (m) =>
      m.status === "finished" &&
      m.home_score != null &&
      m.away_score != null &&
      predByMatch.has(m.id)
  );

  const teamIds = [
    ...new Set(
      finishedWithPred.flatMap((m) => [m.home_team_id, m.away_team_id].filter(Boolean))
    ),
  ] as number[];

  const { data: teams } = teamIds.length
    ? await admin.from("teams").select("id, name_es, fifa_code").in("id", teamIds)
    : { data: [] };

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));

  const jornadaKeys = collectJornadaKeysFromMatches(
    finishedWithPred as Array<{ fifa_schedule_date: string }>
  );
  const { data: jornadaMatchesRaw } = jornadaKeys.length
    ? await admin
        .from("matches")
        .select("id, fifa_match_number, kickoff_at, fifa_schedule_date, status, home_score, away_score")
    : { data: [] };

  const jornadaMatches = (jornadaMatchesRaw ?? []).filter((m) =>
    jornadaKeys.includes(getJornadaKey(m))
  );

  const { data: jornadaResults } = jornadaKeys.length
    ? await admin
        .from("jornada_results")
        .select("jornada_key, max_total_goals, winning_match_ids, is_tie")
        .in("jornada_key", jornadaKeys)
    : { data: [] };

  const { data: jornadaConfigRows } = await admin
    .from("app_config")
    .select("key, value")
    .in("key", ["scoring.jornada_bonus.match", "scoring.jornada_bonus.exact"]);

  const jornadaConfigByKey = new Map((jornadaConfigRows ?? []).map((r) => [r.key, r.value]));
  const readBonusConfig = (key: string, fallback: number) => {
    const raw = jornadaConfigByKey.get(key);
    if (raw == null) return fallback;
    if (typeof raw === "number") return raw;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  const jornadaBonusByMatch = computeJornadaBonusByMatchId({
    matches: jornadaMatches,
    predictions,
    jornadaResults: jornadaResults ?? [],
    config: {
      match: readBonusConfig("scoring.jornada_bonus.match", DEFAULT_JORNADA_BONUS_CONFIG.match),
      exact: readBonusConfig("scoring.jornada_bonus.exact", DEFAULT_JORNADA_BONUS_CONFIG.exact),
    },
  });

  const matchRows: MatchPointsAuditRow[] = [];
  const gatedMatches: GatedMatchRow[] = [];
  const ledgerParts: Omit<PointsLedgerEntry, "runningBalance">[] = [];

  for (const m of finishedWithPred) {
    const pred = predByMatch.get(m.id)!;
    const phase = m.phase as MatchPhase;
    const homeTeam = m.home_team_id ? teamById.get(m.home_team_id) : undefined;
    const awayTeam = m.away_team_id ? teamById.get(m.away_team_id) : undefined;
    if (!homeTeam || !awayTeam || m.fifa_match_number == null) continue;

    const gate = isKnockoutMatchScorableForUserByMatchNumber(
      bracketCtx,
      userResolved,
      m.id
    );

    const rawPoints = calculateMatchPoints(
      phase,
      { home: m.home_score!, away: m.away_score! },
      { home: pred.predicted_home, away: pred.predicted_away },
      scoringConfig
    );
    const expectedPoints = gate.scorable ? rawPoints : 0;
    const stored = storedMatchById.get(m.id);
    const storedPoints = stored?.points ?? null;

    const jornadaInfo = jornadaBonusByMatch.get(m.id);
    const jornadaBonusPoints = jornadaInfo?.bonus ?? 0;

    const predictedAdvancerId =
      phase !== "group_stage" && m.home_team_id && m.away_team_id
        ? predictedAdvancingTeamId({
            homeTeamId: m.home_team_id,
            awayTeamId: m.away_team_id,
            predictedHome: pred.predicted_home,
            predictedAway: pred.predicted_away,
            predictedAdvancesTeamId: pred.predicted_advances_team_id,
          })
        : null;

    const officialAdvancerId =
      phase !== "group_stage" && m.home_team_id && m.away_team_id
        ? officialAdvancingTeamId({
            homeTeamId: m.home_team_id,
            awayTeamId: m.away_team_id,
            actualHome: m.home_score!,
            actualAway: m.away_score!,
            resultAdvancesTeamId: m.result_advances_team_id,
          })
        : null;

    matchRows.push({
      matchId: m.id,
      matchNumber: m.fifa_match_number,
      phase,
      homeTeamName: homeTeam.name_es,
      awayTeamName: awayTeam.name_es,
      homeTeamCode: homeTeam.fifa_code,
      awayTeamCode: awayTeam.fifa_code,
      predictedHome: pred.predicted_home,
      predictedAway: pred.predicted_away,
      predictedAdvancerId,
      officialAdvancerId,
      actualHome: m.home_score!,
      actualAway: m.away_score!,
      storedPoints,
      expectedPoints,
      delta: (storedPoints ?? 0) - expectedPoints,
      gated: !gate.scorable,
      blockedTeams: gate.blockedTeams ?? [],
      jornadaBonusPoints,
      isJornadaTopScorerPick: jornadaInfo?.isTopScorerPick ?? false,
    });

    if (!gate.scorable) {
      gatedMatches.push({
        matchId: m.id,
        matchNumber: m.fifa_match_number,
        phase,
        label: `#${m.fifa_match_number} ${homeTeam.name_es} vs ${awayTeam.name_es}`,
        blockedTeams: gate.blockedTeams ?? [],
        predictedHome: pred.predicted_home,
        predictedAway: pred.predicted_away,
      });
      ledgerParts.push({
        timestamp: m.kickoff_at ?? "",
        type: "gate_skip",
        label: `#${m.fifa_match_number} Bloqueado §7`,
        delta: 0,
        sortKey: `${m.kickoff_at ?? ""}-gate-${m.fifa_match_number}`,
      });
    } else if ((storedPoints ?? 0) > 0 || stored != null) {
      ledgerParts.push({
        timestamp: m.kickoff_at ?? "",
        type: "match",
        label: `#${m.fifa_match_number} ${homeTeam.name_es} vs ${awayTeam.name_es}`,
        delta: storedPoints ?? 0,
        sortKey: `${m.kickoff_at ?? ""}-match-${m.fifa_match_number}`,
      });
    }
  }

  matchRows.sort((a, b) => a.matchNumber - b.matchNumber);

  const advancementAuditRows: AdvancementAuditRow[] = [];
  const userTeamsByPhase = new Map(
    KNOCKOUT_PHASES.map((phase) => [
      phase,
      teamsInPhase(userResolved, bracketCtx.knockoutDefs, phase),
    ])
  );

  const roundKeys = eligibleAdvancementAuditRoundKeys(bracketCtx);

  for (const roundKey of roundKeys) {
    const nextPhase = nextKnockoutPhaseAfterRound(roundKey);
    const { userTeamIds, officialTeamIds } = teamsForRoundComparison(
      roundKey,
      nextPhase,
      userTeamsByPhase as Map<MatchPhase, Set<number>>,
      bracketCtx.officialTeamsByPhase
    );
    const expected = calculateRoundAdvancementBonus(
      userTeamIds,
      officialTeamIds,
      bonusPerTeam
    );
    const bonusKey = `round:${roundKey}`;
    const stored = storedAdvancementByKey.get(bonusKey);
    const storedBonus = stored?.points ?? null;

    if (expected.points > 0 || storedBonus != null) {
      advancementAuditRows.push({
        bonusKey,
        type: "round",
        label: `Ronda ${roundKey} (+2×${expected.correctTeamIds.length})`,
        storedBonus,
        expectedBonus: expected.points,
        delta: (storedBonus ?? 0) - expected.points,
        breakdown: (stored?.breakdown as Record<string, unknown>) ?? null,
      });

      if ((storedBonus ?? 0) > 0) {
        ledgerParts.push({
          timestamp: stored?.created_at ?? roundKey,
          type: "round_advancement",
          label: `Avance ronda ${roundKey} +${storedBonus}`,
          delta: storedBonus!,
          sortKey: `round-${roundKey}`,
        });
      }
    }
  }

  for (const m of finishedWithPred) {
    if (m.phase === "group_stage") continue;
    const bonusKey = `match:${m.id}`;
    const stored = storedAdvancementByKey.get(bonusKey);
    if (!stored && !predByMatch.has(m.id)) continue;

    const pred = predByMatch.get(m.id)!;
    const gate = isKnockoutMatchScorableForUserByMatchNumber(
      bracketCtx,
      userResolved,
      m.id
    );
    const expectedAdv =
      gate.scorable && m.home_team_id && m.away_team_id
        ? calculateMatchAdvancementBonus(
            {
              phase: m.phase as MatchPhase,
              homeTeamId: m.home_team_id,
              awayTeamId: m.away_team_id,
              predictedHome: pred.predicted_home,
              predictedAway: pred.predicted_away,
              predictedAdvancesTeamId: pred.predicted_advances_team_id,
              actualHome: m.home_score!,
              actualAway: m.away_score!,
              resultAdvancesTeamId: m.result_advances_team_id,
            },
            bonusPerTeam
          )
        : 0;

    if (stored || expectedAdv > 0) {
      const parsed = parseAdvancementBonusKey(bonusKey);
      const homeTeam = m.home_team_id ? teamById.get(m.home_team_id) : undefined;
      const awayTeam = m.away_team_id ? teamById.get(m.away_team_id) : undefined;
      advancementAuditRows.push({
        bonusKey,
        type: parsed.type === "match" ? "match" : "unknown",
        label:
          homeTeam && awayTeam
            ? `#${m.fifa_match_number} Avance ${homeTeam.name_es} vs ${awayTeam.name_es}`
            : bonusKey,
        storedBonus: stored?.points ?? null,
        expectedBonus: expectedAdv,
        delta: (stored?.points ?? 0) - expectedAdv,
        breakdown: (stored?.breakdown as Record<string, unknown>) ?? null,
      });
    }

    if ((stored?.points ?? 0) > 0) {
      ledgerParts.push({
        timestamp: m.kickoff_at ?? "",
        type: "match_advancement",
        label: `#${m.fifa_match_number} Avance +${stored!.points}`,
        delta: stored!.points,
        sortKey: `${m.kickoff_at ?? ""}-adv-match-${m.fifa_match_number}`,
      });
    }
  }

  const jornadaRows: JornadaAuditRow[] = [];
  const storedJornadaByKey = new Map((jornadaStored ?? []).map((r) => [r.jornada_key, r.points]));

  for (const key of jornadaKeys) {
    const storedBonus = storedJornadaByKey.get(key) ?? null;
    let expectedBonus = 0;
    for (const [matchId, info] of jornadaBonusByMatch) {
      if (jornadaMatches.some((jm) => jm.id === matchId && getJornadaKey(jm) === key)) {
        expectedBonus += info.bonus;
      }
    }
    if (storedBonus != null || expectedBonus > 0) {
      jornadaRows.push({
        jornadaKey: key,
        storedBonus,
        expectedBonus,
        delta: (storedBonus ?? 0) - expectedBonus,
      });
    }
  }

  for (const [key, points] of storedJornadaByKey) {
    if (points > 0) {
      ledgerParts.push({
        timestamp: key,
        type: "jornada_bonus",
        label: `Bono jornada ${key} +${points}`,
        delta: points,
        sortKey: `jornada-${key}`,
      });
    }
  }

  for (const change of paidChanges) {
    ledgerParts.push({
      timestamp: change.createdAt,
      type: "paid_change",
      label: change.matchLabel,
      delta: -change.pointsSpent,
      sortKey: `${change.createdAt}-change-${change.id}`,
    });
  }

  const matchEarned = matchRows.reduce((s, r) => s + (r.storedPoints ?? 0), 0);
  const advancementBonus = (advancementRows ?? []).reduce((s, r) => s + r.points, 0);
  const jornadaBonus = (jornadaStored ?? []).reduce((s, r) => s + r.points, 0);
  const computedNet = matchEarned + advancementBonus + jornadaBonus - totalPointsSpent;
  const profileTotal = profile?.total_points ?? 0;

  return {
    summary: {
      matchEarned,
      advancementBonus,
      jornadaBonus,
      spent: totalPointsSpent,
      computedNet,
      profileTotal,
      isBalanced: computedNet === profileTotal,
    },
    matchRows,
    advancementRows: advancementAuditRows,
    jornadaRows,
    gatedMatches,
    paidChanges,
    ledger: buildLedger(ledgerParts),
  };
}

export async function loadAdminGlobalScoreAudit(admin: SupabaseClient) {
  const { auditScores } = await import("@/lib/scoring/audit-scores");
  return auditScores(admin);
}
