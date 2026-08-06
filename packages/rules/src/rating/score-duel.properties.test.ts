import { DUEL_GRADES } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  MAX_DUEL_SCORE,
  MIN_DUEL_SCORE,
  SCORE_PARAMETERS,
  type DuelWinType,
  type ScoreParameterName,
} from "./fm-score-table.ts";
import { gradeFromScore } from "./grade-duel.ts";
import { scoreDuel, type DuelScoreInput } from "./score-duel.ts";

const parameterNames = Object.keys(SCORE_PARAMETERS) as readonly ScoreParameterName[];

/**
 * The two parameters read off the final state rather than counted during the
 * duel. They run the other way: more cards left and more life left are better,
 * while every counted action is at best neutral.
 */
const HIGHER_IS_BETTER: ReadonlySet<ScoreParameterName> = new Set([
  "remainingCards",
  "remainingLifePoints",
]);

const winTypeArbitrary = fc.constantFrom<DuelWinType>("annihilation", "deck_out", "exodia");

const scoreInputArbitrary: fc.Arbitrary<DuelScoreInput> = fc.record({
  turns: fc.integer({ min: 1, max: 200 }),
  effectiveAttacks: fc.integer({ min: 0, max: 60 }),
  defensiveVictories: fc.integer({ min: 0, max: 60 }),
  faceDownPlays: fc.integer({ min: 0, max: 60 }),
  fusions: fc.integer({ min: 0, max: 60 }),
  equips: fc.integer({ min: 0, max: 60 }),
  pureMagics: fc.integer({ min: 0, max: 60 }),
  triggeredTraps: fc.integer({ min: 0, max: 60 }),
  remainingCards: fc.integer({ min: 0, max: 40 }),
  remainingLifePoints: fc.integer({ min: 0, max: 8000 }),
  winType: winTypeArbitrary,
});

describe("scoreDuel properties (rating-engine F02)", () => {
  it("always lands within the published bounds", () => {
    fc.assert(
      fc.property(scoreInputArbitrary, (input) => {
        const score = scoreDuel(input);

        expect(score).toBeGreaterThanOrEqual(MIN_DUEL_SCORE);
        expect(score).toBeLessThanOrEqual(MAX_DUEL_SCORE);
      }),
      { numRuns: 1000 },
    );
  });

  it("never throws for any non-negative counter", () => {
    fc.assert(
      fc.property(scoreInputArbitrary, (input) => {
        expect(() => scoreDuel(input)).not.toThrow();
      }),
      { numRuns: 1000 },
    );
  });

  it("is deterministic for the same input", () => {
    fc.assert(
      fc.property(scoreInputArbitrary, (input) => {
        expect(scoreDuel(input)).toBe(scoreDuel({ ...input }));
      }),
      { numRuns: 1000 },
    );
  });

  /**
   * Each table's direction, checked one parameter at a time. This is what
   * catches a transposed sign in the transcription: an inverted table would
   * still stay inside the bounds, but it would break here.
   */
  it.each(parameterNames)("moves %s in the expected direction", (name) => {
    const higherIsBetter = HIGHER_IS_BETTER.has(name);

    fc.assert(
      fc.property(
        scoreInputArbitrary,
        fc.integer({ min: 0, max: 60 }),
        fc.integer({ min: 0, max: 60 }),
        (input, low, high) => {
          fc.pre(low < high);
          const atLow = scoreDuel({ ...input, [name]: low });
          const atHigh = scoreDuel({ ...input, [name]: high });

          if (higherIsBetter) {
            expect(atHigh).toBeGreaterThanOrEqual(atLow);
          } else {
            expect(atHigh).toBeLessThanOrEqual(atLow);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("gradeFromScore properties (rating-engine F02)", () => {
  it("always returns a grade from the closed scale", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10_000, max: 10_000 }), (score) => {
        expect(DUEL_GRADES).toContain(gradeFromScore(score));
      }),
      { numRuns: 1000 },
    );
  });

  it("gives the same grade to any two scores in the same band of ten", () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 89 }), fc.integer({ min: 0, max: 9 }), (base, offset) => {
        const bandStart = base - (base % 10);

        expect(gradeFromScore(bandStart + offset)).toBe(gradeFromScore(bandStart));
      }),
      { numRuns: 1000 },
    );
  });

  it("never decreases as the score grows", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_DUEL_SCORE, max: MAX_DUEL_SCORE }),
        fc.integer({ min: MIN_DUEL_SCORE, max: MAX_DUEL_SCORE }),
        (a, b) => {
          fc.pre(a <= b);

          expect(DUEL_GRADES.indexOf(gradeFromScore(a))).toBeLessThanOrEqual(
            DUEL_GRADES.indexOf(gradeFromScore(b)),
          );
        },
      ),
      { numRuns: 1000 },
    );
  });
});
