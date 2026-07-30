import { describe, expect, it } from "vitest";
import { expandComposition, groupIntoComposition, totalCards } from "./composition.ts";

describe("duel deck composition", () => {
  it("counts and expands deterministically", () => {
    const composition = { "010": 2, "001": 1 };
    expect(totalCards(composition)).toBe(3);
    expect(expandComposition(composition)).toEqual(["001", "010", "010"]);
    expect(expandComposition({ "001": 1, "010": 2 })).toEqual(expandComposition(composition));
  });

  it("groups repeated card numbers and is the inverse of expansion", () => {
    expect(groupIntoComposition([])).toEqual({});
    expect(groupIntoComposition(["010", "001", "010"])).toEqual({ "001": 1, "010": 2 });
    expect(expandComposition(groupIntoComposition(["010", "001", "010"]))).toEqual([
      "001",
      "010",
      "010",
    ]);
  });
});
