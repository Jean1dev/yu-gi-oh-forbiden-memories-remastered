import { describe, expect, it } from "vitest";

import { validateVictoryRewardStars } from "./victory-reward.ts";

describe("validateVictoryRewardStars", () => {
  it.each([
    ["zero", 0],
    ["a positive integer", 12],
  ])("accepts %s", (_label, stars) => {
    expect(validateVictoryRewardStars(stars)).toEqual({ ok: true, value: stars });
  });

  it.each([
    ["a negative number", -1],
    ["a non-integer number", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("rejects %s without throwing", (_label, stars) => {
    expect(() => validateVictoryRewardStars(stars)).not.toThrow();
    const result = validateVictoryRewardStars(stars);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_stars_amount");
  });
});
