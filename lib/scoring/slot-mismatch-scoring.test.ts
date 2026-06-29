import { describe, expect, it } from "vitest";
import {
  calculateMatchAdvancementBonus,
  predictedAdvancingTeamId,
} from "@/lib/scoring/calculate-match-advancement-bonus";
import {
  isKnockoutMatchScorableForUser,
  isPartialAdvancementBonusEligible,
} from "@/lib/scoring/bracket-gate";
import { calculateMatchPoints } from "@/lib/scoring/calculate-match-points";

const BRA = 4;
const JPN = 5;
const NED = 6;

describe("slot mismatch scoring — M76 Brasil vs Japón", () => {
  const officialPair = { homeTeamId: BRA, awayTeamId: JPN };
  const userPair = { homeTeamId: BRA, awayTeamId: NED };
  const official = new Map([["round_of_32", new Set([BRA, JPN, NED])]]);

  it("blocks match points even when user nailed the official score", () => {
    const gate = isKnockoutMatchScorableForUser(
      {
        teams: [],
        matches: [],
        knockoutDefs: [],
        matchById: new Map(),
        matchByNumber: new Map(),
        officialGroupResults: [],
        officialKnockoutResolved: new Map([[76, officialPair]]),
        officialTeamsByPhase: official as never,
        officialQualifiedToKnockout: new Set(),
      },
      "round_of_32",
      userPair.homeTeamId,
      userPair.awayTeamId,
      officialPair
    );
    expect(gate.scorable).toBe(false);
    expect(gate.reason).toBe("slot_mismatch");

    const rawPoints = calculateMatchPoints(
      "round_of_32",
      { home: 2, away: 1 },
      { home: 2, away: 1 }
    );
    expect(rawPoints).toBe(20);
    expect(gate.scorable ? rawPoints : 0).toBe(0);
  });

  it("denies advancement bonus when user predicted wrong advancer for overlap", () => {
    const predictedAdvancer = predictedAdvancingTeamId({
      homeTeamId: BRA,
      awayTeamId: NED,
      predictedHome: 2,
      predictedAway: 1,
      predictedAdvancesTeamId: null,
    });
    expect(predictedAdvancer).toBe(BRA);
    expect(
      isPartialAdvancementBonusEligible(userPair, officialPair, predictedAdvancer, JPN)
    ).toBe(false);
  });

  it("denies partial bonus when predicted advancer is not in overlap", () => {
    const predictedAdvancer = predictedAdvancingTeamId({
      homeTeamId: BRA,
      awayTeamId: NED,
      predictedHome: 1,
      predictedAway: 2,
      predictedAdvancesTeamId: null,
    });
    expect(predictedAdvancer).toBe(NED);
    expect(
      isPartialAdvancementBonusEligible(userPair, officialPair, predictedAdvancer, JPN)
    ).toBe(false);
  });

  it("grants partial +2 when user predicted overlapping team to advance", () => {
    const predictedBraWins = predictedAdvancingTeamId({
      homeTeamId: BRA,
      awayTeamId: NED,
      predictedHome: 2,
      predictedAway: 0,
      predictedAdvancesTeamId: null,
    });
    expect(predictedBraWins).toBe(BRA);
    expect(
      isPartialAdvancementBonusEligible(userPair, officialPair, predictedBraWins, BRA)
    ).toBe(true);
  });

  it("grants full advancement bonus when pairing matches", () => {
    const points = calculateMatchAdvancementBonus({
      phase: "round_of_32",
      homeTeamId: BRA,
      awayTeamId: JPN,
      predictedHome: 2,
      predictedAway: 1,
      predictedAdvancesTeamId: null,
      actualHome: 2,
      actualAway: 1,
      resultAdvancesTeamId: null,
    });
    expect(points).toBe(2);
  });
});
