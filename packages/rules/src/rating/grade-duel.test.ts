import { DUEL_GRADES, type DuelGrade } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { MAX_DUEL_SCORE, MIN_DUEL_SCORE } from "./fm-score-table.ts";
import { gradeFromScore } from "./grade-duel.ts";

/** Every band, with the first and last score that belongs to it. */
const BANDS: readonly (readonly [DuelGrade, number, number])[] = [
  ["S-TEC", MIN_DUEL_SCORE, 9],
  ["A-TEC", 10, 19],
  ["B-TEC", 20, 29],
  ["C-TEC", 30, 39],
  ["D-TEC", 40, 49],
  ["D-POW", 50, 59],
  ["C-POW", 60, 69],
  ["B-POW", 70, 79],
  ["A-POW", 80, 89],
  ["S-POW", 90, MAX_DUEL_SCORE],
];

describe("gradeFromScore — the ten bands", () => {
  it.each(BANDS)("returns %s at both ends of its band", (grade, low, high) => {
    expect(gradeFromScore(low)).toBe(grade);
    expect(gradeFromScore(high)).toBe(grade);
  });

  it("covers every score in the theoretical range without a gap", () => {
    for (let score = MIN_DUEL_SCORE; score <= MAX_DUEL_SCORE; score += 1) {
      expect(DUEL_GRADES).toContain(gradeFromScore(score));
    }
  });

  it("changes grade at every band boundary and nowhere else", () => {
    for (const [, low] of BANDS.slice(1)) {
      expect(gradeFromScore(low)).not.toBe(gradeFromScore(low - 1));
    }
  });
});

describe("gradeFromScore — saturation", () => {
  it("returns S-TEC at the theoretical minimum and below it", () => {
    expect(gradeFromScore(MIN_DUEL_SCORE)).toBe("S-TEC");
    expect(gradeFromScore(-9999)).toBe("S-TEC");
  });

  it("returns S-POW at the theoretical maximum and above it", () => {
    expect(gradeFromScore(MAX_DUEL_SCORE)).toBe("S-POW");
    expect(gradeFromScore(9999)).toBe("S-POW");
  });

  it("puts the base score of an untouched duel in the D-POW band", () => {
    expect(gradeFromScore(50)).toBe("D-POW");
  });
});
