import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processMatchResult } from "./process-match-result";

const USER_SUBMITTED = "11111111-1111-1111-1111-111111111111";
const USER_NOT_SUBMITTED = "22222222-2222-2222-2222-222222222222";
const MATCH_ID = "match-1";

function createMockAdmin(overrides?: {
  predictions?: Array<{
    user_id: string;
    match_id: string;
    predicted_home: number;
    predicted_away: number;
    locked?: boolean;
    predicted_advances_team_id?: number | null;
    predicted_is_draw?: boolean;
    id?: string;
  }>;
}): SupabaseClient {
  const submissions = [{ user_id: USER_SUBMITTED }];
  const profiles = [
    {
      id: USER_SUBMITTED,
      entry_fee_paid: true,
      is_admin: false,
      withdrawn_at: null,
    },
  ];
  const predictions =
    overrides?.predictions ??
    [
      {
        id: "pred-1",
        user_id: USER_SUBMITTED,
        match_id: MATCH_ID,
        predicted_home: 2,
        predicted_away: 0,
        predicted_is_draw: false,
        predicted_advances_team_id: null,
        locked: false,
      },
    ];

  const upsertedPoints: Array<{ user_id: string; match_id: string; points: number }> = [];

  const matchRow = {
    id: MATCH_ID,
    fifa_match_number: 1,
    phase: "group_stage",
    group_letter: "A",
    home_team_id: 1,
    away_team_id: 2,
    home_source: null,
    away_source: null,
    home_score: 2,
    away_score: 0,
    status: "finished",
    result_advances_team_id: null,
    kickoff_at: "2026-06-15T18:00:00Z",
  };

  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    const builder = () => chain;

    chain.select = vi.fn(builder);
    chain.eq = vi.fn(builder);
    chain.in = vi.fn(builder);
    chain.or = vi.fn(builder);
    chain.is = vi.fn(builder);
    chain.order = vi.fn(builder);
    chain.range = vi.fn(builder);
    chain.upsert = vi.fn(async (row: { user_id: string; match_id: string; points: number }) => {
      if (table === "user_match_points") upsertedPoints.push(row);
      return { error: null };
    });
    chain.update = vi.fn(builder);
    chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    chain.single = vi.fn(async () => ({ data: null, error: null }));

    chain.then = undefined;

    Object.defineProperty(chain, "data", {
      get() {
        if (table === "user_tournament_submissions") return submissions;
        if (table === "profiles") return profiles;
        if (table === "predictions") return predictions;
        if (table === "app_config") return [];
        if (table === "user_match_points") return [];
        if (table === "user_jornada_bonus_points") return [];
        if (table === "user_advancement_bonus_points") return [];
        if (table === "prediction_changes") return [];
        if (table === "teams") return [];
        if (table === "matches") return [matchRow];
        return [];
      },
    });

    const exec = async () => {
      if (table === "user_tournament_submissions") {
        return { data: submissions, error: null };
      }
      if (table === "profiles") {
        return { data: profiles, error: null };
      }
      if (table === "predictions") {
        return { data: predictions, error: null };
      }
      if (table === "app_config") {
        return { data: [], error: null };
      }
      if (table === "user_match_points") {
        return { data: [], error: null };
      }
      if (table === "user_jornada_bonus_points") {
        return { data: [], error: null };
      }
      if (table === "prediction_changes") {
        return { data: [], error: null };
      }
      if (table === "user_advancement_bonus_points") {
        return { data: [], error: null };
      }
      if (table === "teams") {
        return { data: [], error: null };
      }
      if (table === "matches") {
        return { data: [matchRow], error: null };
      }
      if (table === "profiles" && chain.update) {
        return { error: null };
      }
      return { data: [], error: null };
    };

    chain.select = vi.fn(() => {
      const sel = { ...chain };
      sel.eq = vi.fn(() => sel);
      sel.in = vi.fn(() => sel);
      sel.or = vi.fn(() => sel);
      sel.is = vi.fn(() => sel);
      sel.order = vi.fn(() => sel);
      sel.range = vi.fn(() => sel);
      sel.single = exec;
      sel.maybeSingle = exec;
      Object.assign(sel, { then: (resolve: (v: unknown) => void) => exec().then(resolve) });
      return sel;
    });

    return chain;
  });

  return { from, _upsertedPoints: upsertedPoints } as unknown as SupabaseClient & {
    _upsertedPoints: typeof upsertedPoints;
  };
}

describe("processMatchResult — regression: submitted + locked=false", () => {
  it("scores 10 pts for exact 2-0 when prediction is not locked", async () => {
    const admin = createMockAdmin();
    const upserted = (admin as unknown as { _upsertedPoints: Array<{ points: number }> })
      ._upsertedPoints;

    const result = await processMatchResult(admin, {
      matchId: MATCH_ID,
      phase: "group_stage",
      homeScore: 2,
      awayScore: 0,
    });

    expect(result.usersScored).toBe(1);
    expect(result.eligibleCount).toBe(1);
    expect(upserted).toHaveLength(1);
    expect(upserted[0]?.points).toBe(10);
  });

  it("does not score users without a complete submission", async () => {
    const admin = createMockAdmin({
      predictions: [
        {
          user_id: USER_NOT_SUBMITTED,
          match_id: MATCH_ID,
          predicted_home: 2,
          predicted_away: 0,
          locked: false,
        },
      ],
    });

    const result = await processMatchResult(admin, {
      matchId: MATCH_ID,
      phase: "group_stage",
      homeScore: 2,
      awayScore: 0,
    });

    expect(result.usersScored).toBe(0);
    expect(result.eligibleCount).toBe(0);
  });
});
