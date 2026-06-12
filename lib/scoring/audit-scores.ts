import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateMatchPoints,
  type MatchPhase,
} from "@/lib/scoring/calculate-match-points";
import { matchAdvancementBonusKey } from "@/lib/scoring/advancement-bonus-keys";
import { loadBracketContext } from "@/lib/scoring/bracket-context";
import {
  calculateMatchAdvancementBonus,
} from "@/lib/scoring/calculate-match-advancement-bonus";
import { loadAdvancementBonusPerTeam } from "@/lib/scoring/load-advancement-bonus-config";
import { loadScoringConfig } from "@/lib/scoring/load-scoring-config";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";
import {
  loadActiveSubmittedUserIds,
  loadScorableMatchPredictions,
} from "@/lib/scoring/scoring-eligibility";
import { loadUserBracketCache } from "@/lib/scoring/user-bracket-cache";

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
  issue: "missing_row" | "wrong_points";
  gated?: boolean;
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

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, total_points")
    .in("id", eligibleIds.size ? [...eligibleIds] : ["00000000-0000-0000-0000-000000000000"]);

  const usernameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.username ?? p.id])
  );

  const { data: finishedMatches, error: matchErr } = await admin
    .from("matches")
    .select(
      "id, fifa_match_number, phase, home_score, away_score, home_team_id, away_team_id, result_advances_team_id"
    )
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("fifa_match_number");

  if (matchErr) throw new Error(matchErr.message);

  const matchDiscrepancies: MatchScoreDiscrepancy[] = [];
  const advancementDiscrepancies: AdvancementDiscrepancy[] = [];
  const summaryByMatch: ScoreAuditResult["summaryByMatch"] = [];

  for (const match of finishedMatches ?? []) {
    const phase = match.phase as MatchPhase;
    const eligibilityOpts = {
      bracketCtx,
      userBracketCache,
      phase,
    };

    const scorable = await loadScorableMatchPredictions(admin, match.id, eligibilityOpts);
    const { data: storedRows } = await admin
      .from("user_match_points")
      .select("user_id, points")
      .eq("match_id", match.id);

    const storedByUser = new Map((storedRows ?? []).map((r) => [r.user_id, r.points]));
    let scored = 0;

    for (const pred of scorable) {
      const rawPoints = calculateMatchPoints(
        phase,
        { home: match.home_score!, away: match.away_score! },
        { home: pred.predictedHome, away: pred.predictedAway },
        config
      );

      const userResolved = userBracketCache.get(pred.userId);
      const gate = userResolved
        ? isKnockoutMatchScorableForUserByMatchNumber(bracketCtx, userResolved, match.id)
        : { scorable: true };
      const expectedPoints = gate.scorable ? rawPoints : 0;

      const storedPoints = storedByUser.get(pred.userId) ?? null;
      if (storedPoints == null) {
        matchDiscrepancies.push({
          matchId: match.id,
          fifaMatchNumber: match.fifa_match_number,
          username: usernameById.get(pred.userId) ?? pred.userId,
          userId: pred.userId,
          predictedHome: pred.predictedHome,
          predictedAway: pred.predictedAway,
          actualHome: match.home_score!,
          actualAway: match.away_score!,
          storedPoints: null,
          expectedPoints,
          issue: "missing_row",
          gated: !gate.scorable,
        });
      } else {
        scored += 1;
        if (storedPoints !== expectedPoints) {
          matchDiscrepancies.push({
            matchId: match.id,
            fifaMatchNumber: match.fifa_match_number,
            username: usernameById.get(pred.userId) ?? pred.userId,
            userId: pred.userId,
            predictedHome: pred.predictedHome,
            predictedAway: pred.predictedAway,
            actualHome: match.home_score!,
            actualAway: match.away_score!,
            storedPoints,
            expectedPoints,
            issue: "wrong_points",
            gated: !gate.scorable,
          });
        }
      }

      if (
        phase !== "group_stage" &&
        match.home_team_id != null &&
        match.away_team_id != null
      ) {
        const expectedAdvancement = gate.scorable
          ? calculateMatchAdvancementBonus(
              {
                phase,
                homeTeamId: match.home_team_id,
                awayTeamId: match.away_team_id,
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
        const { data: storedAdv } = await admin
          .from("user_advancement_bonus_points")
          .select("points")
          .eq("user_id", pred.userId)
          .eq("bonus_key", bonusKey)
          .maybeSingle();

        const storedAdvPoints = storedAdv?.points ?? null;
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

    summaryByMatch.push({
      matchId: match.id,
      fifaMatchNumber: match.fifa_match_number,
      eligible: scorable.length,
      scored,
    });
  }

  const totalDiscrepancies: TotalPointsDiscrepancy[] = [];

  for (const profile of profiles ?? []) {
    const [
      { data: matchPts },
      { data: advancementPts },
      { data: bonusPts },
      { data: changes },
    ] = await Promise.all([
      admin.from("user_match_points").select("points").eq("user_id", profile.id),
      admin
        .from("user_advancement_bonus_points")
        .select("points")
        .eq("user_id", profile.id),
      admin.from("user_jornada_bonus_points").select("points").eq("user_id", profile.id),
      admin.from("prediction_changes").select("points_spent").eq("user_id", profile.id),
    ]);

    const earned = (matchPts ?? []).reduce((s, r) => s + r.points, 0);
    const advancement = (advancementPts ?? []).reduce((s, r) => s + r.points, 0);
    const bonus = (bonusPts ?? []).reduce((s, r) => s + r.points, 0);
    const spent = (changes ?? []).reduce((s, r) => s + r.points_spent, 0);
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
    !result.advancementDiscrepancies.length &&
    !result.totalDiscrepancies.length
  ) {
    lines.push("", "No discrepancies found.");
  }

  return lines.join("\n");
}
