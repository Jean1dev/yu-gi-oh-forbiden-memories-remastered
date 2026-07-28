import { describe, expect, it } from "vitest";

import { createMulberry32 } from "./mulberry32.ts";
import { shuffle } from "./shuffle.ts";

describe("shuffle", () => {
  it("does not mutate the received list", () => {
    const list = [1, 2, 3, 4, 5];
    const original = [...list];

    shuffle(list, createMulberry32(1));

    expect(list).toEqual(original);
  });

  it("preserves length and the multiset of elements", () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8];

    const result = shuffle(list, createMulberry32(7));

    expect(result).toHaveLength(list.length);
    expect([...result].sort()).toEqual([...list].sort());
  });

  it("produces the same permutation for the same seeded generator", () => {
    const list = ["a", "b", "c", "d", "e"];

    const resultA = shuffle(list, createMulberry32(99));
    const resultB = shuffle(list, createMulberry32(99));

    expect(resultA).toEqual(resultB);
  });
});
