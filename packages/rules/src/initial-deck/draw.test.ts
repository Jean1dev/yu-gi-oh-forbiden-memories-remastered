import type { CardNumber } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { drawInitialDeck, type RandomSource } from "./draw.ts";

/** Replays a fixed sequence of swap indices — deterministic and exhaustible on purpose. */
function sequenceRandomSource(values: readonly number[]): RandomSource {
  let index = 0;
  return {
    nextInt(exclusiveUpperBound) {
      const value = values[index % values.length] as number;
      index += 1;
      return value % exclusiveUpperBound;
    },
  };
}

const FOURTEEN_NUMBERS: readonly CardNumber[] = Array.from({ length: 14 }, (_, i) =>
  String(i + 1).padStart(3, "0"),
);

describe("drawInitialDeck", () => {
  it("returns exactly forty cards for a pool of fourteen numbers", () => {
    const result = drawInitialDeck(FOURTEEN_NUMBERS, sequenceRandomSource([1, 2, 3, 4, 5]));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const total = [...result.value.values()].reduce((sum, quantity) => sum + quantity, 0);
    expect(total).toBe(40);
  });

  it("never produces more than three copies of the same number", () => {
    const result = drawInitialDeck(FOURTEEN_NUMBERS, sequenceRandomSource([0, 0, 0, 0, 0]));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const quantity of result.value.values()) {
      expect(quantity).toBeLessThanOrEqual(3);
    }
  });

  it("only uses numbers present in the received pool", () => {
    const result = drawInitialDeck(FOURTEEN_NUMBERS, sequenceRandomSource([3, 7, 11, 1, 0]));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const cardNumber of result.value.keys()) {
      expect(FOURTEEN_NUMBERS).toContain(cardNumber);
    }
  });

  it("is deterministic for the same random source and the same pool", () => {
    const first = drawInitialDeck(FOURTEEN_NUMBERS, sequenceRandomSource([5, 2, 9, 1, 0, 3]));
    const second = drawInitialDeck(FOURTEEN_NUMBERS, sequenceRandomSource([5, 2, 9, 1, 0, 3]));

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect([...first.value.entries()].sort()).toEqual([...second.value.entries()].sort());
  });

  it("fails when the received pool has fewer than fourteen distinct numbers", () => {
    const result = drawInitialDeck(FOURTEEN_NUMBERS.slice(0, 13), sequenceRandomSource([0]));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("initial_pool_insufficient");
  });
});
