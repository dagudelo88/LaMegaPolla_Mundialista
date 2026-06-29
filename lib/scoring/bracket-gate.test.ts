import { describe, expect, it } from "vitest";
import type { BracketContext } from "@/lib/scoring/bracket-context";
import {
  isKnockoutMatchScorableForUser,
  isKnockoutMatchScorableForUserByMatchNumber,
  isPartialAdvancementBonusEligible,
  overlappingTeamsInSlot,
  pairingMatchesSlot,
} from "@/lib/scoring/bracket-gate";

const ECU = 1;
const NOR = 2;
const CIV = 3;
const BRA = 4;
const JPN = 5;
const NED = 6;

function minimalCtx(
  officialTeamsByPhase: Map<string, Set<number>>,
  officialKnockoutResolved: Map<number, { homeTeamId: number | null; awayTeamId: number | null }> = new Map(),
  matchById: BracketContext["matchById"] = new Map()
): BracketContext {
  return {
    teams: [],
    matches: [],
    knockoutDefs: [],
    matchById,
    matchByNumber: new Map(),
    officialGroupResults: [],
    officialKnockoutResolved,
    officialTeamsByPhase: officialTeamsByPhase as BracketContext["officialTeamsByPhase"],
    officialQualifiedToKnockout: new Set(),
  };
}

describe("pairingMatchesSlot", () => {
  it("matches regardless of home/away order", () => {
    expect(pairingMatchesSlot(BRA, JPN, JPN, BRA)).toBe(true);
    expect(pairingMatchesSlot(BRA, JPN, BRA, JPN)).toBe(true);
  });

  it("rejects different pairs", () => {
    expect(pairingMatchesSlot(ECU, NOR, CIV, NOR)).toBe(false);
    expect(pairingMatchesSlot(BRA, NED, BRA, JPN)).toBe(false);
  });
});

describe("overlappingTeamsInSlot", () => {
  it("returns shared teams only", () => {
    expect(
      overlappingTeamsInSlot(
        { homeTeamId: ECU, awayTeamId: NOR },
        { homeTeamId: CIV, awayTeamId: NOR }
      )
    ).toEqual([NOR]);
  });
});

describe("isPartialAdvancementBonusEligible", () => {
  const user = { homeTeamId: ECU, awayTeamId: NOR };
  const official = { homeTeamId: CIV, awayTeamId: NOR };

  it("grants +2 when overlapping team advances and user predicted it", () => {
    expect(isPartialAdvancementBonusEligible(user, official, NOR, NOR)).toBe(true);
  });

  it("denies when user predicted wrong advancer", () => {
    expect(isPartialAdvancementBonusEligible(user, official, ECU, NOR)).toBe(false);
  });
});

describe("isKnockoutMatchScorableForUser", () => {
  it("allows group stage always", () => {
    const result = isKnockoutMatchScorableForUser(
      minimalCtx(new Map()),
      "group_stage",
      1,
      2
    );
    expect(result.scorable).toBe(true);
  });

  it("blocks when user team not in official phase", () => {
    const official = new Map();
    official.set("quarter_final", new Set([10, 20]));
    const result = isKnockoutMatchScorableForUser(
      minimalCtx(official),
      "quarter_final",
      99,
      20
    );
    expect(result.scorable).toBe(false);
    expect(result.reason).toBe("bracket_gate");
    expect(result.blockedTeams).toContain(99);
  });

  it("blocks M78 when user has ECU+NOR but official is CIV+NOR", () => {
    const official = new Map();
    official.set("round_of_32", new Set([ECU, NOR, CIV]));
    const result = isKnockoutMatchScorableForUser(
      minimalCtx(official),
      "round_of_32",
      ECU,
      NOR,
      { homeTeamId: CIV, awayTeamId: NOR }
    );
    expect(result.scorable).toBe(false);
    expect(result.reason).toBe("slot_mismatch");
  });

  it("blocks M76 when user has BRA+NED but official is BRA+JPN", () => {
    const official = new Map();
    official.set("round_of_32", new Set([BRA, JPN, NED]));
    const result = isKnockoutMatchScorableForUser(
      minimalCtx(official),
      "round_of_32",
      BRA,
      NED,
      { homeTeamId: BRA, awayTeamId: JPN }
    );
    expect(result.scorable).toBe(false);
    expect(result.reason).toBe("slot_mismatch");
  });

  it("allows when both teams official in phase and pairing matches", () => {
    const official = new Map();
    official.set("round_of_16", new Set([10, 20]));
    const result = isKnockoutMatchScorableForUser(
      minimalCtx(official),
      "round_of_16",
      10,
      20,
      { homeTeamId: 10, awayTeamId: 20 }
    );
    expect(result.scorable).toBe(true);
  });

  it("allows when both in phase but official pair not yet resolved", () => {
    const official = new Map();
    official.set("round_of_32", new Set([BRA, JPN, NED]));
    const result = isKnockoutMatchScorableForUser(
      minimalCtx(official),
      "round_of_32",
      BRA,
      NED
    );
    expect(result.scorable).toBe(true);
  });
});

describe("isKnockoutMatchScorableForUserByMatchNumber", () => {
  const MATCH_78 = "match-78";
  const MATCH_76 = "match-76";

  it("blocks slot mismatch via match number lookup", () => {
    const ctx = minimalCtx(
      new Map([["round_of_32", new Set([ECU, NOR, CIV])]]),
      new Map([[78, { homeTeamId: CIV, awayTeamId: NOR }]]),
      new Map([
        [
          MATCH_78,
          {
            id: MATCH_78,
            fifa_match_number: 78,
            phase: "round_of_32",
            group_letter: null,
            home_team_id: null,
            away_team_id: null,
            home_source: null,
            away_source: null,
            home_score: null,
            away_score: null,
            status: "scheduled",
            result_advances_team_id: null,
          },
        ],
      ])
    );
    const userResolved = new Map([[78, { homeTeamId: ECU, awayTeamId: NOR }]]);
    const result = isKnockoutMatchScorableForUserByMatchNumber(
      ctx,
      userResolved,
      MATCH_78
    );
    expect(result.scorable).toBe(false);
    expect(result.reason).toBe("slot_mismatch");
  });

  it("blocks M76 BRA+NED vs official BRA+JPN", () => {
    const ctx = minimalCtx(
      new Map([["round_of_32", new Set([BRA, JPN, NED])]]),
      new Map([[76, { homeTeamId: BRA, awayTeamId: JPN }]]),
      new Map([
        [
          MATCH_76,
          {
            id: MATCH_76,
            fifa_match_number: 76,
            phase: "round_of_32",
            group_letter: null,
            home_team_id: null,
            away_team_id: null,
            home_source: null,
            away_source: null,
            home_score: null,
            away_score: null,
            status: "scheduled",
            result_advances_team_id: null,
          },
        ],
      ])
    );
    const userResolved = new Map([[76, { homeTeamId: BRA, awayTeamId: NED }]]);
    expect(
      isKnockoutMatchScorableForUserByMatchNumber(ctx, userResolved, MATCH_76)
    ).toMatchObject({ scorable: false, reason: "slot_mismatch" });
  });
});
