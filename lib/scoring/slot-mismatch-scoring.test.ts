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

describe("bracket gate — M74 Alemania vs Turquía (jofego case)", () => {
  const GER = 10;
  const TUR = 11;
  const PAR = 12;
  const officialPair = { homeTeamId: GER, awayTeamId: PAR };
  const userPair = { homeTeamId: GER, awayTeamId: TUR };
  const officialTeams = new Map([["round_of_32", new Set([GER, PAR])]]);

  const ctx = {
    teams: [],
    matches: [],
    knockoutDefs: [],
    matchById: new Map(),
    matchByNumber: new Map(),
    officialGroupResults: [],
    officialKnockoutResolved: new Map([[74, officialPair]]),
    officialTeamsByPhase: officialTeams as never,
    officialQualifiedToKnockout: new Set([GER, PAR]),
  };

  it("blocks pleno when Turkey is not in the official round slot", () => {
    const gate = isKnockoutMatchScorableForUser(
      ctx,
      "round_of_32",
      userPair.homeTeamId,
      userPair.awayTeamId,
      officialPair
    );
    expect(gate.scorable).toBe(false);
    expect(gate.reason).toBe("bracket_gate");
    expect(gate.blockedTeams).toContain(TUR);

    const rawPoints = calculateMatchPoints(
      "round_of_32",
      { home: 1, away: 1 },
      { home: 1, away: 1 }
    );
    expect(rawPoints).toBe(20);
    expect(gate.scorable ? rawPoints : 0).toBe(0);
  });
});
