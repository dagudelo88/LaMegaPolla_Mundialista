import { describe, expect, it } from "vitest";
import {
  calculateMatchPoints,
  DEFAULT_SCORING_CONFIG,
  isPleno,
} from "./calculate-match-points";

/** Test matrices derived from REGLAS.md §4 */

describe("calculateMatchPoints — group stage (REGLAS §4)", () => {
  const phase = "group_stage" as const;
  const cfg = DEFAULT_SCORING_CONFIG;

  it("ganador + marcador exacto → 10", () => {
    expect(
      calculateMatchPoints(phase, { home: 2, away: 1 }, { home: 2, away: 1 }, cfg)
    ).toBe(10);
  });

  it("ganador + marcador diferente → 5", () => {
    expect(
      calculateMatchPoints(phase, { home: 3, away: 1 }, { home: 2, away: 1 }, cfg)
    ).toBe(5);
  });

  it("empate + marcador exacto → 10", () => {
    expect(
      calculateMatchPoints(phase, { home: 1, away: 1 }, { home: 1, away: 1 }, cfg)
    ).toBe(10);
  });

  it("empate + marcador distinto → 5", () => {
    expect(
      calculateMatchPoints(phase, { home: 2, away: 2 }, { home: 1, away: 1 }, cfg)
    ).toBe(5);
  });

  it("no acertó → 0", () => {
    expect(
      calculateMatchPoints(phase, { home: 2, away: 0 }, { home: 0, away: 1 }, cfg)
    ).toBe(0);
  });
});

describe("calculateMatchPoints — knockout (REGLAS §4)", () => {
  const phase = "round_of_16" as const;
  const cfg = DEFAULT_SCORING_CONFIG;

  it("ganador + exacto → 20", () => {
    expect(
      calculateMatchPoints(phase, { home: 1, away: 0 }, { home: 1, away: 0 }, cfg)
    ).toBe(20);
  });

  it("empate 90' + exacto → 20", () => {
    expect(
      calculateMatchPoints(phase, { home: 0, away: 0 }, { home: 0, away: 0 }, cfg)
    ).toBe(20);
  });

  it("ganador correcto + marcador distinto → 10", () => {
    expect(
      calculateMatchPoints(phase, { home: 2, away: 1 }, { home: 1, away: 0 }, cfg)
    ).toBe(10);
  });

  it("fallo → 0", () => {
    expect(
      calculateMatchPoints(phase, { home: 0, away: 1 }, { home: 1, away: 0 }, cfg)
    ).toBe(0);
  });
});

describe("isPleno", () => {
  it("detects pleno 10 in groups", () => {
    expect(
      isPleno(
        "group_stage",
        { home: 2, away: 1 },
        { home: 2, away: 1 }
      )
    ).toBe(true);
  });

  it("detects pleno 20 in knockout", () => {
    expect(
      isPleno(
        "final",
        { home: 3, away: 3 },
        { home: 3, away: 3 }
      )
    ).toBe(true);
  });
});
