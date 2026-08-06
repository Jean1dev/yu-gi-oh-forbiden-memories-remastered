import { describe, expect, it } from "vitest";

import { BASE_SCORE } from "./fm-score-table.ts";
import { scoreDuel, type DuelScoreInput } from "./score-duel.ts";

/**
 * The baseline every test below measures against.
 *
 * Most parameters sit in a zero-point bucket here, but two cannot: `pureMagics`
 * and `triggeredTraps` have no zero bucket at all — their only non-negative
 * value is "none played", worth +2 each. That asymmetry is the formula's, not a
 * fixture artefact, and it is why a technical duel scores *low*.
 */
const BASELINE: DuelScoreInput = {
  turns: 10, //                  9 ≤ 10 < 29        →   0
  effectiveAttacks: 4, //        4 ≤  4 < 10        →   0
  defensiveVictories: 0, //           0 <  2        →   0
  faceDownPlays: 0, //                0 <  1        →   0
  fusions: 1, //                 1 ≤  1 <  5        →   0
  equips: 1, //                  1 ≤  1 <  5        →   0
  pureMagics: 0, //                   0 <  1        →  +2
  triggeredTraps: 0, //               0 <  1        →  +2
  remainingCards: 8, //          8 ≤  8 < 28        →   0
  remainingLifePoints: 1000, //  1000 ≤ … < 7000    →   0
  winType: "annihilation", //                       →  +2
};

/** 50 + 2 (no magics) + 2 (no traps) + 2 (annihilation). */
const BASELINE_SCORE = BASE_SCORE + 6;

function withOverrides(overrides: Partial<DuelScoreInput>): number {
  return scoreDuel({ ...BASELINE, ...overrides });
}

function contributionOf(overrides: Partial<DuelScoreInput>): number {
  return withOverrides(overrides) - BASELINE_SCORE;
}

describe("scoreDuel — the baseline", () => {
  it("scores the documented baseline duel at 56", () => {
    expect(scoreDuel(BASELINE)).toBe(BASELINE_SCORE);
    expect(BASELINE_SCORE).toBe(56);
  });
});

describe("scoreDuel — turns", () => {
  it("awards 12 points for a duel of fewer than 5 turns", () => {
    expect(contributionOf({ turns: 4 })).toBe(12);
  });

  it("awards 8 points for a duel of 5 to 8 turns", () => {
    expect(contributionOf({ turns: 5 })).toBe(8);
    expect(contributionOf({ turns: 8 })).toBe(8);
  });

  it("awards nothing for a duel of 9 to 28 turns", () => {
    expect(contributionOf({ turns: 9 })).toBe(0);
    expect(contributionOf({ turns: 28 })).toBe(0);
  });

  it("awards -12 points for a duel of 33 turns or more", () => {
    expect(contributionOf({ turns: 33 })).toBe(-12);
    expect(contributionOf({ turns: 400 })).toBe(-12);
  });
});

describe("scoreDuel — combat parameters", () => {
  it("awards 4 points for fewer than 2 effective attacks", () => {
    expect(contributionOf({ effectiveAttacks: 1 })).toBe(4);
  });

  it("awards -4 points for 20 or more effective attacks", () => {
    expect(contributionOf({ effectiveAttacks: 20 })).toBe(-4);
  });

  it("awards nothing for fewer than 2 defensive victories", () => {
    expect(contributionOf({ defensiveVictories: 1 })).toBe(0);
  });

  it("awards -40 points for 15 or more defensive victories", () => {
    expect(contributionOf({ defensiveVictories: 15 })).toBe(-40);
  });
});

describe("scoreDuel — technical parameters", () => {
  it("awards nothing for zero face-down plays", () => {
    expect(contributionOf({ faceDownPlays: 0 })).toBe(0);
  });

  it("awards -8 points for 31 or more face-down plays", () => {
    expect(contributionOf({ faceDownPlays: 31 })).toBe(-8);
  });

  it("awards 4 points for zero fusions and -12 for 15 or more", () => {
    expect(contributionOf({ fusions: 0 })).toBe(4);
    expect(contributionOf({ fusions: 15 })).toBe(-12);
  });

  it("awards 4 points for zero equips and -12 for 15 or more", () => {
    expect(contributionOf({ equips: 0 })).toBe(4);
    expect(contributionOf({ equips: 15 })).toBe(-12);
  });

  it("has no zero bucket for pure magics: the first one played costs 6 points", () => {
    // +2 for none, -4 for one — there is no neutral amount of magic.
    expect(contributionOf({ pureMagics: 1 })).toBe(-6);
    expect(contributionOf({ pureMagics: 10 })).toBe(-18);
  });

  it("has no zero bucket for triggered traps: the first one costs 10 points", () => {
    expect(contributionOf({ triggeredTraps: 1 })).toBe(-10);
    expect(contributionOf({ triggeredTraps: 7 })).toBe(-34);
  });
});

describe("scoreDuel — final-state parameters", () => {
  it("penalises a nearly empty deck and rewards a nearly full one", () => {
    expect(contributionOf({ remainingCards: 3 })).toBe(-7);
    expect(contributionOf({ remainingCards: 32 })).toBe(15);
  });

  it("penalises low life points and rewards full life points", () => {
    expect(contributionOf({ remainingLifePoints: 99 })).toBe(-7);
    expect(contributionOf({ remainingLifePoints: 8000 })).toBe(6);
  });
});

describe("scoreDuel — win type", () => {
  it("adds 2 points for an annihilation win", () => {
    expect(withOverrides({ winType: "annihilation" })).toBe(BASELINE_SCORE);
  });

  it("subtracts 40 points for a deck-out win", () => {
    // 42 below the baseline: it loses the +2 of annihilation and takes -40.
    expect(withOverrides({ winType: "deck_out" })).toBe(BASELINE_SCORE - 42);
  });

  it("adds 40 points for an exodia win", () => {
    expect(withOverrides({ winType: "exodia" })).toBe(BASELINE_SCORE + 38);
  });
});

describe("scoreDuel — saturation and totality", () => {
  it("saturates at the last point value for a counter far above every threshold", () => {
    expect(withOverrides({ fusions: 15 })).toBe(withOverrides({ fusions: 9999 }));
  });

  it("reaches the published minimum for the worst possible duel", () => {
    expect(
      scoreDuel({
        turns: 999,
        effectiveAttacks: 999,
        defensiveVictories: 999,
        faceDownPlays: 999,
        fusions: 999,
        equips: 999,
        pureMagics: 999,
        triggeredTraps: 999,
        remainingCards: 0,
        remainingLifePoints: 0,
        winType: "deck_out",
      }),
    ).toBe(-140);
  });

  it("reaches the published maximum for the best possible duel", () => {
    expect(
      scoreDuel({
        turns: 1,
        effectiveAttacks: 1,
        defensiveVictories: 0,
        faceDownPlays: 0,
        fusions: 0,
        equips: 0,
        pureMagics: 0,
        triggeredTraps: 0,
        remainingCards: 40,
        remainingLifePoints: 8000,
        winType: "exodia",
      }),
    ).toBe(139);
  });
});
