import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BracketContext } from "@/lib/scoring/bracket-context";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const MATCH_ID = "4462d850-cde1-4d35-8e83-8984769c1bb3";

const advancementUpserts: Array<{ user_id: string; bonus_key: string; points: number }> = [];
const recalculatedUserIds: string[][] = [];

vi.mock("@/lib/scoring/load-scoring-config", () => ({
  loadScoringConfig: vi.fn(async () => ({
    exactScore: 10,
    correctWinner: 5,
    correctDraw: 3,
  })),
}));

vi.mock("@/lib/scoring/bracket-context", () => ({
  loadBracketContext: vi.fn(),
}));

vi.mock("@/lib/scoring/user-bracket-cache", () => ({
  loadUserBracketCache: vi.fn(),
}));

vi.mock("@/lib/scoring/scoring-eligibility", () => ({
  loadScorableMatchPredictions: vi.fn(),
  countScorableMatchPredictions: vi.fn(async () => 0),
  loadActiveSubmittedUserIds: vi.fn(async () => new Set([USER_ID])),
}));

vi.mock("@/lib/scoring/recalculate-total-points", () => ({
  recalculateUsersTotalPoints: vi.fn(async (_admin, userIds: string[]) => {
    recalculatedUserIds.push(userIds);
  }),
}));

vi.mock("@/lib/scoring/bracket-gate", () => ({
  isKnockoutMatchScorableForUserByMatchNumber: vi.fn(),
  isPartialAdvancementBonusEligible: vi.fn(() => false),
}));

import { loadBracketContext } from "@/lib/scoring/bracket-context";
import { loadUserBracketCache } from "@/lib/scoring/user-bracket-cache";
import {
  loadScorableMatchPredictions,
  countScorableMatchPredictions,
} from "@/lib/scoring/scoring-eligibility";
import { isKnockoutMatchScorableForUserByMatchNumber } from "@/lib/scoring/bracket-gate";
import { processMatchResult } from "@/lib/scoring/process-match-result";

function createAdmin(): SupabaseClient {
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    const builder = () => chain;
    chain.select = vi.fn(builder);
    chain.eq = vi.fn(builder);
    chain.in = vi.fn(builder);
    chain.upsert = vi.fn(async (row: { user_id: string; bonus_key?: string; points: number }) => {
      if (table === "user_advancement_bonus_points" && row.bonus_key) {
        advancementUpserts.push({
          user_id: row.user_id,
          bonus_key: row.bonus_key,
          points: row.points,
        });
      }
      return { error: null };
    });
    chain.update = vi.fn(async () => ({ error: null }));
    chain.maybeSingle = vi.fn(async () => {
      if (table === "app_config") {
        return { data: { value: 2 }, error: null };
      }
      return { data: null, error: null };
    });
    chain.single = vi.fn(async () => ({ data: null, error: null }));

    chain.select = vi.fn(() => {
      const sel = { ...chain };
      sel.eq = vi.fn(() => sel);
      sel.in = vi.fn(() => sel);
      Object.assign(sel, {
        then: (resolve: (v: unknown) => void) => {
          let data: unknown[] = [];
          if (table === "predictions") {
            data = [
              {
                user_id: USER_ID,
                predicted_home: 2,
                predicted_away: 1,
                predicted_advances_team_id: null,
              },
            ];
          }
          if (table === "user_tournament_submissions") {
            data = [{ user_id: USER_ID }];
          }
          if (table === "profiles") {
            data = [{ id: USER_ID }];
          }
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      });
      return sel;
    });

    return chain;
  });

  return { from } as unknown as SupabaseClient;
}

function mockBracketCtx(): BracketContext {
  return {
    teams: [],
    matches: [],
    knockoutDefs: [],
    matchById: new Map([
      [
        MATCH_ID,
        {
          id: MATCH_ID,
          fifa_match_number: 73,
          phase: "round_of_16",
          group_letter: null,
          home_team_id: null,
          away_team_id: null,
          home_source: null,
          away_source: null,
          home_score: 2,
          away_score: 1,
          status: "finished",
          result_advances_team_id: null,
        },
      ],
    ]),
    matchByNumber: new Map(),
    officialGroupResults: [],
    officialKnockoutResolved: new Map([[73, { homeTeamId: 10, awayTeamId: 20 }]]),
    officialTeamsByPhase: new Map(),
    officialQualifiedToKnockout: new Set(),
  };
}

describe("processMatchResult — knockout advancement with null DB team IDs", () => {
  beforeEach(() => {
    advancementUpserts.length = 0;
    recalculatedUserIds.length = 0;
    vi.mocked(loadBracketContext).mockResolvedValue(mockBracketCtx());
    vi.mocked(loadUserBracketCache).mockResolvedValue(
      new Map([[USER_ID, new Map([[73, { homeTeamId: 10, awayTeamId: 20 }]])]])
    );
    vi.mocked(loadScorableMatchPredictions).mockResolvedValue([]);
    vi.mocked(countScorableMatchPredictions).mockResolvedValue(0);
    vi.mocked(isKnockoutMatchScorableForUserByMatchNumber).mockReturnValue({
      scorable: true,
    });
  });

  it("creates match advancement bonus using resolved bracket team IDs", async () => {
    const admin = createAdmin();

    await processMatchResult(admin, {
      matchId: MATCH_ID,
      phase: "round_of_16",
      homeScore: 2,
      awayScore: 1,
      homeTeamId: null,
      awayTeamId: null,
    });

    expect(advancementUpserts).toHaveLength(1);
    expect(advancementUpserts[0]).toMatchObject({
      user_id: USER_ID,
      bonus_key: `match:${MATCH_ID}`,
      points: 2,
    });
    expect(recalculatedUserIds.flat()).toContain(USER_ID);
  });

  it("recalculates totals for gated users who only have a prediction row", async () => {
    vi.mocked(isKnockoutMatchScorableForUserByMatchNumber).mockReturnValue({
      scorable: false,
      reason: "blocked_team",
      blockedTeams: [99],
    });

    const admin = createAdmin();
    await processMatchResult(admin, {
      matchId: MATCH_ID,
      phase: "round_of_16",
      homeScore: 2,
      awayScore: 1,
      homeTeamId: null,
      awayTeamId: null,
    });

    expect(recalculatedUserIds.flat()).toContain(USER_ID);
    expect(advancementUpserts[0]?.points).toBe(0);
  });
});
