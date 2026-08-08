import { DUEL_GRADES, FM_DROP_TIERS, type DuelGrade } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { MAX_DUEL_SCORE, MIN_DUEL_SCORE } from "./fm-score-table.ts";
import { gradeFromScore } from "./grade-duel.ts";

import { GRADE_REWARDS, rewardForGrade } from "./rating-reward-table.ts";

const TEC_LADDER: readonly DuelGrade[] = ["D-TEC", "C-TEC", "B-TEC", "A-TEC", "S-TEC"];
const POW_LADDER: readonly DuelGrade[] = ["D-POW", "C-POW", "B-POW", "A-POW", "S-POW"];
const RARE_GRADES: readonly DuelGrade[] = ["S-TEC", "A-TEC", "A-POW", "S-POW"];

describe("rewardForGrade — the ten entries", () => {
  const expected: readonly (readonly [DuelGrade, number, string])[] = [
    ["S-TEC", 5, FM_DROP_TIERS.SA_TEC],
    ["A-TEC", 4, FM_DROP_TIERS.SA_TEC],
    ["B-TEC", 3, FM_DROP_TIERS.COMMON],
    ["C-TEC", 2, FM_DROP_TIERS.COMMON],
    ["D-TEC", 1, FM_DROP_TIERS.COMMON],
    ["D-POW", 1, FM_DROP_TIERS.COMMON],
    ["C-POW", 2, FM_DROP_TIERS.COMMON],
    ["B-POW", 3, FM_DROP_TIERS.COMMON],
    ["A-POW", 4, FM_DROP_TIERS.SA_POW],
    ["S-POW", 5, FM_DROP_TIERS.SA_POW],
  ];

  it.each(expected)("returns %d stars and the %s tier for %s", (grade, stars, dropTier) => {
    expect(rewardForGrade(grade)).toEqual({ stars, dropTier });
  });
});

describe("rewardForGrade — table invariants", () => {
  it("has exactly one entry per grade in DUEL_GRADES", () => {
    expect(Object.keys(GRADE_REWARDS).sort()).toEqual([...DUEL_GRADES].sort());
  });

  it("grants between 1 and 5 stars for every grade", () => {
    for (const grade of DUEL_GRADES) {
      expect(rewardForGrade(grade).stars).toBeGreaterThanOrEqual(1);
      expect(rewardForGrade(grade).stars).toBeLessThanOrEqual(5);
    }
  });

  it("never grants zero stars — winning always pays something", () => {
    for (const grade of DUEL_GRADES) {
      expect(rewardForGrade(grade).stars).not.toBe(0);
    }
  });

  it("maps every grade to one of the three FM drop tiers", () => {
    const tiers = Object.values(FM_DROP_TIERS);

    for (const grade of DUEL_GRADES) {
      expect(tiers).toContain(rewardForGrade(grade).dropTier);
    }
  });

  it("makes all three drop tiers reachable", () => {
    const reachable = new Set(DUEL_GRADES.map((grade) => rewardForGrade(grade).dropTier));

    expect(reachable).toEqual(new Set(Object.values(FM_DROP_TIERS)));
  });

  it("opens a rare tier only for S and A grades", () => {
    for (const grade of DUEL_GRADES) {
      const isRare = rewardForGrade(grade).dropTier !== FM_DROP_TIERS.COMMON;
      expect(isRare).toBe(RARE_GRADES.includes(grade));
    }
  });

  it("maps the six central grades to the common tier", () => {
    const central = DUEL_GRADES.filter((grade) => !RARE_GRADES.includes(grade));

    expect(central).toHaveLength(6);
    for (const grade of central) {
      expect(rewardForGrade(grade).dropTier).toBe(FM_DROP_TIERS.COMMON);
    }
  });
});

describe("rewardForGrade — monotonicity per side of the axis", () => {
  // Monotonic *per side*, not globally: the score is a single line whose middle
  // is easy and whose two ends are deliberate, so the reward follows distance
  // from the centre. A global comparison by raw score would be false.
  it.each([
    ["TEC", TEC_LADDER],
    ["POW", POW_LADDER],
  ] as const)("stars increase from D to S within the %s band", (_label, ladder) => {
    const stars = ladder.map((grade) => rewardForGrade(grade).stars);

    for (let index = 1; index < stars.length; index += 1) {
      expect(stars[index]!).toBeGreaterThan(stars[index - 1]!);
    }
  });

  it("pays the same for equivalent letters on both sides of the axis", () => {
    for (let index = 0; index < TEC_LADDER.length; index += 1) {
      expect(rewardForGrade(TEC_LADDER[index]!).stars).toBe(
        rewardForGrade(POW_LADDER[index]!).stars,
      );
    }
  });

  it("returns a referentially stable object for repeated calls", () => {
    expect(rewardForGrade("S-POW")).toBe(rewardForGrade("S-POW"));
  });
});

describe("the score → grade → reward chain (rating-engine F02 + F03)", () => {
  it("yields a valid reward for any score", () => {
    fc.assert(
      fc.property(fc.integer({ min: MIN_DUEL_SCORE, max: MAX_DUEL_SCORE }), (score) => {
        const reward = rewardForGrade(gradeFromScore(score));

        expect(reward.stars).toBeGreaterThanOrEqual(1);
        expect(reward.stars).toBeLessThanOrEqual(5);
        expect(Object.values(FM_DROP_TIERS)).toContain(reward.dropTier);
      }),
      { numRuns: 1000 },
    );
  });

  it("never pays less the further a score sits from the centre, per side of the axis", () => {
    const CENTRE = 50;

    fc.assert(
      fc.property(
        fc.integer({ min: MIN_DUEL_SCORE, max: MAX_DUEL_SCORE }),
        fc.integer({ min: MIN_DUEL_SCORE, max: MAX_DUEL_SCORE }),
        (a, b) => {
          // Same side only: comparing across the axis by raw score would be
          // meaningless, since both ends are the hard ones.
          fc.pre(a < CENTRE === b < CENTRE);
          const [nearer, further] =
            Math.abs(a - CENTRE) <= Math.abs(b - CENTRE) ? [a, b] : [b, a];

          expect(rewardForGrade(gradeFromScore(further)).stars).toBeGreaterThanOrEqual(
            rewardForGrade(gradeFromScore(nearer)).stars,
          );
        },
      ),
      { numRuns: 1000 },
    );
  });
});
