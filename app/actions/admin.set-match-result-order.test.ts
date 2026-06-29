import { describe, expect, it, vi, beforeEach } from "vitest";

const callOrder: string[] = [];

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(async () => ({ user: { id: "admin-1" } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

vi.mock("@/lib/predictions/prediction-lock-sync", () => ({
  syncAllSubmittedPredictionLocks: vi.fn(async () => {}),
}));

vi.mock("@/lib/bracket/resolve-official-bracket", () => ({
  resolveOfficialBracket: vi.fn(async () => {
    callOrder.push("resolveOfficialBracket");
    return {};
  }),
}));

vi.mock("@/lib/scoring/process-match-result", () => ({
  processMatchResult: vi.fn(async () => {
    callOrder.push("processMatchResult");
    return { usersScored: 1, eligibleCount: 1 };
  }),
}));

vi.mock("@/lib/scoring/process-jornada-bonus", () => ({
  processJornadaBonus: vi.fn(async () => 0),
}));

vi.mock("@/lib/scoring/process-completed-rounds", () => ({
  processCompletedRoundAdvancementBonuses: vi.fn(async () => 0),
}));

vi.mock("@/lib/scoring/bracket-context", () => ({
  loadBracketContext: vi.fn(async () => ({})),
}));

vi.mock("@/lib/scoring/recalculate-total-points", () => ({
  recalculateAllActiveParticipantTotals: vi.fn(async () => 0),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));

const mockAdmin = {
  from: vi.fn((table: string) => {
    let refetchMatch = false;
    const chain: Record<string, unknown> = {};
    const self = () => chain;

    chain.select = vi.fn(self);
    chain.eq = vi.fn(() => {
      if (table === "matches") refetchMatch = true;
      return chain;
    });
    chain.update = vi.fn(() => chain);
    chain.insert = vi.fn(async () => ({ error: null }));
    chain.single = vi.fn(async () => {
      if (table === "matches") {
        if (refetchMatch) {
          return { data: { home_team_id: 10, away_team_id: 20 }, error: null };
        }
        return {
          data: {
            phase: "round_of_16",
            status: "scheduled",
            home_score: null,
            away_score: null,
            home_team_id: 10,
            away_team_id: 20,
            result_advances_team_id: null,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    Object.assign(chain, {
      then: (resolve: (v: unknown) => void) => {
        if (table === "matches" && chain.update) {
          return Promise.resolve({ error: null }).then(resolve);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    });

    return chain;
  }),
};

describe("setMatchResult — knockout bracket resolve before scoring", () => {
  beforeEach(() => {
    callOrder.length = 0;
    vi.clearAllMocks();
  });

  it("calls resolveOfficialBracket before processMatchResult for knockouts", async () => {
    const { setMatchResult } = await import("@/app/actions/admin");
    await setMatchResult("match-ko-1", 2, 1);

    const resolveIdx = callOrder.indexOf("resolveOfficialBracket");
    const processIdx = callOrder.indexOf("processMatchResult");
    expect(resolveIdx).toBeGreaterThanOrEqual(0);
    expect(processIdx).toBeGreaterThan(resolveIdx);
  });
});
