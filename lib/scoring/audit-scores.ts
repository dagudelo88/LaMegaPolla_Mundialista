import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";
import { matchAdvancementBonusKey } from "@/lib/scoring/advancement-bonus-keys";
import {
  loadBracketContext,
  isRoundComplete,
  teamsInPhase,
} from "@/lib/scoring/bracket-context";
import {
  calculateMatchAdvancementBonus,
} from "@/lib/scoring/calculate-match-advancement-bonus";
import { loadAdvancementBonusPerTeam } from "@/lib/scoring/load-advancement-bonus-config";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
import { computeGatedMatchPoints } from "@/lib/scoring/compute-gated-match-points";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";
import {
  teamsForRoundComparison,
  calculateRoundAdvancementBonus,
} from "@/lib/scoring/calculate-round-advancement-bonus";
import { roundAdvancementBonusKey } from "@/lib/scoring/advancement-bonus-keys";
import { KNOCKOUT_PHASES, nextKnockoutPhaseAfterRound } from "@/lib/scoring/knockout-phase-order";
import { resolveOfficialMatchTeamIds } from "@/lib/scoring/resolve-match-team-ids";
import {
  loadActiveSubmittedUserIds,
  type ScorablePrediction,
} from "@/lib/scoring/scoring-eligibility";
import { loadUserBracketCache } from "@/lib/scoring/user-bracket-cache";
import { fetchAllPages } from "@/lib/supabase/fetch-all-pages";
import type { DbPrediction } from "@/lib/predictions/helpers";

const ROUND_KEYS = [
  "group_stage",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
] as const;

export interface MatchScoreDiscrepancy {
  matchId: string;
  fifaMatchNumber: number | null;
  username: string;
  userId: string;
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
  storedPoints: number | null;
  expectedPoints: number;
  issue: "missing_row" | "wrong_points" | "gated_wrong_points";
  gated?: boolean;
  gateReason?: string;
  pointsOverAwarded?: number;
}

export interface GatedPlayerSummary {
  username: string;
  userId: string;
  totalPointsOverAwarded: number;
  matches: Array<{
    fifaMatchNumber: number | null;
    storedPoints: number;
    expectedPoints: number;
    gateReason?: string;
  }>;
}

export interface AdvancementDiscrepancy {
  username: string;
  userId: string;
  bonusKey: string;
  storedPoints: number | null;
  expectedPoints: number;
  issue: "missing_row" | "wrong_points";
}

export interface TotalPointsDiscrepancy {
  username: string;
  userId: string;
  storedTotal: number;
  expectedTotal: number;
}

export interface ScoreAuditResult {
  finishedMatches: number;
  matchDiscrepancies: MatchScoreDiscrepancy[];
  gatedDiscrepancies: MatchScoreDiscrepancy[];
  gatedSummaryByPlayer: GatedPlayerSummary[];
  advancementDiscrepancies: AdvancementDiscrepancy[];
  totalDiscrepancies: TotalPointsDiscrepancy[];
  summaryByMatch: {
    matchId: string;
    fifaMatchNumber: number | null;
    eligible: number;
    scored: number;
  }[];
}

export async function auditScores(admin: SupabaseClient): Promise<ScoreAuditResult> {
  const config = await loadScoringConfig(admin);
  const bonusPerTeam = await loadAdvancementBonusPerTeam(admin);
  const bracketCtx = await loadBracketContext(admin);
  const userBracketCache = await loadUserBracketCache(admin, bracketCtx);
  const eligibleIds = await loadActiveSubmittedUserIds(admin);
  const eligibleIdList = [...eligibleIds];

  const [
    { data: profiles },
    { data: finishedMatches, error: matchErr },
    allPredictions,
    allAdvancementRows,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, total_points")
      .in("id", eligibleIdList.length ? eligibleIdList : ["00000000-0000-0000-0000-000000000000"]),
    admin
      .from("matches")
      .select(
        "id, fifa_match_number, phase, home_score, away_score, home_team_id, away_team_id, result_advances_team_id"
      )
      .eq("status", "finished")
      .not("home_score", "is", null)
      .not("away_score", "is", null)
      .order("fifa_match_number"),
    eligibleIdList.length
      ? fetchAllPages<DbPrediction & { user_id: string }>(({ from, to }) =>
          admin
            .from("predictions")
            .select(
              "id, match_id, predicted_home, predicted_away, predicted_is_draw, predicted_advances_team_id, locked, user_id"
            )
            .in("user_id", eligibleIdList)
            .order("id")
            .range(from, to)
        )
      : Promise.resolve([] as Array<DbPrediction & { user_id: string }>),
    eligibleIdList.length
      ? fetchAllPages<{ user_id: string; bonus_key: string; points: number }>(({ from, to }) =>
          admin
            .from("user_advancement_bonus_points")
            .select("user_id, bonus_key, points")
            .in("user_id", eligibleIdList)
            .order("user_id")
            .order("bonus_key")
            .range(from, to)
        )
      : Promise.resolve([] as { user_id: string; bonus_key: string; points: number }[]),
  ]);

  if (matchErr) throw new Error(matchErr.message);

  const finishedMatchIds = (finishedMatches ?? []).map((m) => m.id);
  const allStoredMatchPts = finishedMatchIds.length
    ? await fetchAllPages<{ user_id: string; match_id: string; points: number }>(({ from, to }) =>
        admin
          .from("user_match_points")
          .select("user_id, match_id, points")
          .in("match_id", finishedMatchIds)
          .order("user_id")
          .order("match_id")
          .range(from, to)
      )
    : [];

  const usernameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.username ?? p.id])
  );

  const predsByMatch = new Map<string, Array<DbPrediction & { user_id: string }>>();
  for (const p of allPredictions) {
    if (!eligibleIds.has(p.user_id)) continue;
    const list = predsByMatch.get(p.match_id) ?? [];
    list.push(p);
    predsByMatch.set(p.match_id, list);
  }

  const storedMatchPtsByKey = new Map<string, number>();
  for (const row of allStoredMatchPts) {
    storedMatchPtsByKey.set(`${row.user_id}:${row.match_id}`, row.points);
  }

  const advancementPtsByKey = new Map<string, number>();
  for (const row of allAdvancementRows) {
    advancementPtsByKey.set(`${row.user_id}:${row.bonus_key}`, row.points);
  }

  function scorablePredictionsForMatch(
    matchId: string,
    phase: MatchPhase
  ): ScorablePrediction[] {
    const isKnockout = phase !== "group_stage";
    return (predsByMatch.get(matchId) ?? [])
      .filter((p) => {
        if (!isKnockout) return true;
        const userResolved = userBracketCache.get(p.user_id);
        if (!userResolved) return true;
        return isKnockoutMatchScorableForUserByMatchNumber(
          bracketCtx,
          userResolved,
          matchId
        ).scorable;
      })
      .map((p) => ({
        userId: p.user_id,
        matchId: p.match_id,
        predictedHome: p.predicted_home,
        predictedAway: p.predicted_away,
        predictedAdvancesTeamId: p.predicted_advances_team_id,
      }));
  }

  const matchDiscrepancies: MatchScoreDiscrepancy[] = [];
  const gatedDiscrepancies: MatchScoreDiscrepancy[] = [];
  const expectedMatchPtsByUser = new Map<string, number>();
  const advancementDiscrepancies: AdvancementDiscrepancy[] = [];
  const summaryByMatch: ScoreAuditResult["summaryByMatch"] = [];

  for (const match of finishedMatches ?? []) {
    const phase = match.phase as MatchPhase;
    const allPreds = predsByMatch.get(match.id) ?? [];
    const scorable = scorablePredictionsForMatch(match.id, phase);
    let scored = 0;

    for (const p of allPreds) {
      const actual = { home: match.home_score!, away: match.away_score! };
      const predicted = { home: p.predicted_home, away: p.predicted_away };
      const userResolved = userBracketCache.get(p.user_id);
      const { points: expectedPoints, gate } = computeGatedMatchPoints(
        bracketCtx,
        userResolved,
        match.id,
        phase,
        actual,
        predicted,
        config
      );

      expectedMatchPtsByUser.set(
        p.user_id,
        (expectedMatchPtsByUser.get(p.user_id) ?? 0) + expectedPoints
      );

      const storedPoints = storedMatchPtsByKey.get(`${p.user_id}:${match.id}`) ?? null;
      const isScorable = scorable.some((s) => s.userId === p.user_id);

      if (storedPoints == null) {
        if (expectedPoints > 0 || phase === "group_stage") {
          const row: MatchScoreDiscrepancy = {
            matchId: match.id,
            fifaMatchNumber: match.fifa_match_number,
            username: usernameById.get(p.user_id) ?? p.user_id,
            userId: p.user_id,
            predictedHome: p.predicted_home,
            predictedAway: p.predicted_away,
            actualHome: match.home_score!,
            actualAway: match.away_score!,
            storedPoints: null,
            expectedPoints,
            issue: "missing_row",
            gated: !gate.scorable,
            gateReason: gate.reason,
          };
          matchDiscrepancies.push(row);
          if (!gate.scorable) gatedDiscrepancies.push(row);
        }
      } else {
        if (isScorable) scored += 1;
        if (storedPoints !== expectedPoints) {
          const issue: MatchScoreDiscrepancy["issue"] =
            !gate.scorable && storedPoints > 0 ? "gated_wrong_points" : "wrong_points";
          const row: MatchScoreDiscrepancy = {
            matchId: match.id,
            fifaMatchNumber: match.fifa_match_number,
            username: usernameById.get(p.user_id) ?? p.user_id,
            userId: p.user_id,
            predictedHome: p.predicted_home,
            predictedAway: p.predicted_away,
            actualHome: match.home_score!,
            actualAway: match.away_score!,
            storedPoints,
            expectedPoints,
            issue,
            gated: !gate.scorable,
            gateReason: gate.reason,
            pointsOverAwarded: Math.max(0, storedPoints - expectedPoints),
          };
          matchDiscrepancies.push(row);
          if (issue === "gated_wrong_points") gatedDiscrepancies.push(row);
        }
      }

      if (phase !== "group_stage") {
        const pred = scorable.find((s) => s.userId === p.user_id);
        if (!pred) continue;

        const { homeTeamId, awayTeamId } = resolveOfficialMatchTeamIds(bracketCtx, match.id, {
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
        });

        if (homeTeamId != null && awayTeamId != null) {
          const expectedAdvancement = gate.scorable
            ? calculateMatchAdvancementBonus(
                {
                  phase,
                  homeTeamId,
                  awayTeamId,
                  predictedHome: pred.predictedHome,
                  predictedAway: pred.predictedAway,
                  predictedAdvancesTeamId: pred.predictedAdvancesTeamId,
                  actualHome: match.home_score!,
                  actualAway: match.away_score!,
                  resultAdvancesTeamId: match.result_advances_team_id,
                },
                bonusPerTeam
              )
            : 0;

          const bonusKey = matchAdvancementBonusKey(match.id);
          const storedAdvPoints = advancementPtsByKey.get(`${pred.userId}:${bonusKey}`) ?? null;
          if (storedAdvPoints == null && expectedAdvancement > 0) {
            advancementDiscrepancies.push({
              username: usernameById.get(pred.userId) ?? pred.userId,
              userId: pred.userId,
              bonusKey,
              storedPoints: null,
              expectedPoints: expectedAdvancement,
              issue: "missing_row",
            });
          } else if (storedAdvPoints != null && storedAdvPoints !== expectedAdvancement) {
            advancementDiscrepancies.push({
              username: usernameById.get(pred.userId) ?? pred.userId,
              userId: pred.userId,
              bonusKey,
              storedPoints: storedAdvPoints,
              expectedPoints: expectedAdvancement,
              issue: "wrong_points",
            });
          }
        }
      }
    }

    for (const pred of scorable) {
      if (phase === "group_stage") continue;
      if (allPreds.some((p) => p.user_id === pred.userId)) continue;

      const { homeTeamId, awayTeamId } = resolveOfficialMatchTeamIds(bracketCtx, match.id, {
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
      });
      if (homeTeamId == null || awayTeamId == null) continue;

      const userResolved = userBracketCache.get(pred.userId);
      const { gate } = computeGatedMatchPoints(
        bracketCtx,
        userResolved,
        match.id,
        phase,
        { home: match.home_score!, away: match.away_score! },
        { home: pred.predictedHome, away: pred.predictedAway },
        config
      );

      const expectedAdvancement = gate.scorable
        ? calculateMatchAdvancementBonus(
            {
              phase,
              homeTeamId,
              awayTeamId,
              predictedHome: pred.predictedHome,
              predictedAway: pred.predictedAway,
              predictedAdvancesTeamId: pred.predictedAdvancesTeamId,
              actualHome: match.home_score!,
              actualAway: match.away_score!,
              resultAdvancesTeamId: match.result_advances_team_id,
            },
            bonusPerTeam
          )
        : 0;

      const bonusKey = matchAdvancementBonusKey(match.id);
      const storedAdvPoints = advancementPtsByKey.get(`${pred.userId}:${bonusKey}`) ?? null;
      if (storedAdvPoints == null && expectedAdvancement > 0) {
        advancementDiscrepancies.push({
          username: usernameById.get(pred.userId) ?? pred.userId,
          userId: pred.userId,
          bonusKey,
          storedPoints: null,
          expectedPoints: expectedAdvancement,
          issue: "missing_row",
        });
      } else if (storedAdvPoints != null && storedAdvPoints !== expectedAdvancement) {
        advancementDiscrepancies.push({
          username: usernameById.get(pred.userId) ?? pred.userId,
          userId: pred.userId,
          bonusKey,
          storedPoints: storedAdvPoints,
          expectedPoints: expectedAdvancement,
          issue: "wrong_points",
        });
      }
    }

    summaryByMatch.push({
      matchId: match.id,
      fifaMatchNumber: match.fifa_match_number,
      eligible: scorable.length,
      scored,
    });
  }

  const gatedSummaryMap = new Map<string, GatedPlayerSummary>();
  for (const d of gatedDiscrepancies) {
    const over = d.pointsOverAwarded ?? Math.max(0, (d.storedPoints ?? 0) - d.expectedPoints);
    if (over <= 0) continue;
    const existing = gatedSummaryMap.get(d.userId) ?? {
      username: d.username,
      userId: d.userId,
      totalPointsOverAwarded: 0,
      matches: [],
    };
    existing.totalPointsOverAwarded += over;
    existing.matches.push({
      fifaMatchNumber: d.fifaMatchNumber,
      storedPoints: d.storedPoints ?? 0,
      expectedPoints: d.expectedPoints,
      gateReason: d.gateReason,
    });
    gatedSummaryMap.set(d.userId, existing);
  }
  const gatedSummaryByPlayer = [...gatedSummaryMap.values()].sort(
    (a, b) => b.totalPointsOverAwarded - a.totalPointsOverAwarded
  );

  for (const userId of eligibleIds) {
    const userResolved = userBracketCache.get(userId);
    if (!userResolved) continue;
    const userTeamsByPhase = new Map(
      KNOCKOUT_PHASES.map((phase) => [
        phase,
        teamsInPhase(userResolved, bracketCtx.knockoutDefs, phase),
      ])
    );

    for (const roundKey of ROUND_KEYS) {
      if (!isRoundComplete(bracketCtx, roundKey)) continue;

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
      const bonusKey = roundAdvancementBonusKey(roundKey);

      const storedAdvPoints = advancementPtsByKey.get(`${userId}:${bonusKey}`) ?? null;
      if (storedAdvPoints == null && expected.points > 0) {
        advancementDiscrepancies.push({
          username: usernameById.get(userId) ?? userId,
          userId,
          bonusKey,
          storedPoints: null,
          expectedPoints: expected.points,
          issue: "missing_row",
        });
      } else if (storedAdvPoints != null && storedAdvPoints !== expected.points) {
        advancementDiscrepancies.push({
          username: usernameById.get(userId) ?? userId,
          userId,
          bonusKey,
          storedPoints: storedAdvPoints,
          expectedPoints: expected.points,
          issue: "wrong_points",
        });
      }
    }
  }

  const [allJornadaPts, allChanges] = await Promise.all([
    eligibleIdList.length
      ? fetchAllPages<{ user_id: string; points: number }>(({ from, to }) =>
          admin
            .from("user_jornada_bonus_points")
            .select("user_id, points")
            .in("user_id", eligibleIdList)
            .order("user_id")
            .range(from, to)
        )
      : Promise.resolve([] as { user_id: string; points: number }[]),
    eligibleIdList.length
      ? fetchAllPages<{ user_id: string; points_spent: number }>(({ from, to }) =>
          admin
            .from("prediction_changes")
            .select("user_id, points_spent")
            .in("user_id", eligibleIdList)
            .order("user_id")
            .range(from, to)
        )
      : Promise.resolve([] as { user_id: string; points_spent: number }[]),
  ]);

  const advancementTotalByUser = new Map<string, number>();
  for (const row of allAdvancementRows) {
    advancementTotalByUser.set(
      row.user_id,
      (advancementTotalByUser.get(row.user_id) ?? 0) + row.points
    );
  }
  const jornadaPtsByUser = new Map<string, number>();
  for (const row of allJornadaPts) {
    jornadaPtsByUser.set(row.user_id, (jornadaPtsByUser.get(row.user_id) ?? 0) + row.points);
  }
  const spentByUser = new Map<string, number>();
  for (const row of allChanges) {
    spentByUser.set(row.user_id, (spentByUser.get(row.user_id) ?? 0) + row.points_spent);
  }

  const totalDiscrepancies: TotalPointsDiscrepancy[] = [];

  for (const profile of profiles ?? []) {
    const earned = expectedMatchPtsByUser.get(profile.id) ?? 0;
    const advancement = advancementTotalByUser.get(profile.id) ?? 0;
    const bonus = jornadaPtsByUser.get(profile.id) ?? 0;
    const spent = spentByUser.get(profile.id) ?? 0;
    const expectedTotal = earned + advancement + bonus - spent;

    if (profile.total_points !== expectedTotal) {
      totalDiscrepancies.push({
        username: profile.username ?? profile.id,
        userId: profile.id,
        storedTotal: profile.total_points,
        expectedTotal,
      });
    }
  }

  return {
    finishedMatches: finishedMatches?.length ?? 0,
    matchDiscrepancies,
    gatedDiscrepancies,
    gatedSummaryByPlayer,
    advancementDiscrepancies,
    totalDiscrepancies,
    summaryByMatch,
  };
}

export function formatAuditReport(result: ScoreAuditResult): string {
  const lines: string[] = [
    `Finished matches: ${result.finishedMatches}`,
    "",
    "Per match (eligible vs scored):",
  ];

  for (const row of result.summaryByMatch) {
    const ok = row.eligible === row.scored ? "OK" : "MISMATCH";
    lines.push(
      `  #${row.fifaMatchNumber ?? "?"}: ${row.scored}/${row.eligible} scored [${ok}]`
    );
  }

  if (result.gatedDiscrepancies.length) {
    lines.push("", "§7 gated wrong points (llave incompleta):");
    for (const d of result.gatedDiscrepancies) {
      lines.push(
        `  #${d.fifaMatchNumber} @${d.username}: stored=${d.storedPoints ?? "null"}, ` +
          `expected=${d.expectedPoints}, over=+${d.pointsOverAwarded ?? 0} (${d.gateReason ?? "gated"})`
      );
    }
    if (result.gatedSummaryByPlayer.length) {
      lines.push("", "Summary by player:");
      for (const s of result.gatedSummaryByPlayer) {
        lines.push(
          `  @${s.username}: −${s.totalPointsOverAwarded} pts across ${s.matches.length} match(es)`
        );
      }
    }
  }

  if (result.matchDiscrepancies.length) {
    lines.push("", "Match point discrepancies:");
    for (const d of result.matchDiscrepancies) {
      lines.push(
        `  #${d.fifaMatchNumber} @${d.username}: pred ${d.predictedHome}-${d.predictedAway}, ` +
          `actual ${d.actualHome}-${d.actualAway}, stored=${d.storedPoints ?? "null"}, ` +
          `expected=${d.expectedPoints} (${d.issue}${d.gated ? ", gated" : ""})`
      );
    }
  }

  if (result.advancementDiscrepancies.length) {
    lines.push("", "Advancement bonus discrepancies:");
    for (const d of result.advancementDiscrepancies) {
      lines.push(
        `  @${d.username} ${d.bonusKey}: stored=${d.storedPoints ?? "null"}, ` +
          `expected=${d.expectedPoints} (${d.issue})`
      );
    }
  }

  if (result.totalDiscrepancies.length) {
    lines.push("", "Total points discrepancies:");
    for (const d of result.totalDiscrepancies) {
      lines.push(
        `  @${d.username}: stored=${d.storedTotal}, expected=${d.expectedTotal}`
      );
    }
  }

  if (
    !result.matchDiscrepancies.length &&
    !result.gatedDiscrepancies.length &&
    !result.advancementDiscrepancies.length &&
    !result.totalDiscrepancies.length
  ) {
    lines.push("", "No discrepancies found.");
  }

  return lines.join("\n");
}
