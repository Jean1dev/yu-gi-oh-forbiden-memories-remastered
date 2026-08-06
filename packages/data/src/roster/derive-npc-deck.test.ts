import { describe, expect, it } from "vitest";

import { MAX_COPIES_PER_CARD, REQUIRED_DECK_SIZE } from "@yugioh/shared";

import { POOL_WEIGHT_TOTAL, deriveNpcDeck, totalPoolWeight } from "./derive-npc-deck.ts";
import { createMulberry32 } from "./deterministic-random.ts";
import type { DuelistPoolEntry } from "./duelist-source.ts";

/** An evenly weighted pool of `size` cards whose weights sum to `POOL_WEIGHT_TOTAL`. */
function evenPool(size: number): DuelistPoolEntry[] {
  const base = Math.floor(POOL_WEIGHT_TOTAL / size);
  return Array.from({ length: size }, (_, index) => ({
    cardNumber: String(index + 1).padStart(3, "0"),
    weight: index === 0 ? POOL_WEIGHT_TOTAL - base * (size - 1) : base,
  }));
}

/** Teana's real shape: a handful of heavy entries plus a long 2/2048 tail. */
const skewedPool: DuelistPoolEntry[] = [
  { cardNumber: "024", weight: 300 },
  { cardNumber: "058", weight: 300 },
  { cardNumber: "338", weight: 300 },
  { cardNumber: "344", weight: 120 },
  { cardNumber: "393", weight: 400 },
  { cardNumber: "395", weight: 300 },
  { cardNumber: "399", weight: 300 },
  ...Array.from({ length: 14 }, (_, index) => ({
    cardNumber: String(index + 100).padStart(3, "0"),
    weight: 2,
  })),
];

describe("deriveNpcDeck", () => {
  it("builds exactly forty cards", () => {
    const result = deriveNpcDeck(evenPool(20), createMulberry32(1));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(REQUIRED_DECK_SIZE);
  });

  it("never exceeds the copy limit", () => {
    const result = deriveNpcDeck(skewedPool, createMulberry32(7));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const copies = new Map<string, number>();
    for (const cardNumber of result.value) {
      copies.set(cardNumber, (copies.get(cardNumber) ?? 0) + 1);
    }
    expect(Math.max(...copies.values())).toBeLessThanOrEqual(MAX_COPIES_PER_CARD);
  });

  it("only draws cards declared in the pool", () => {
    const pool = evenPool(20);
    const declared = new Set(pool.map((entry) => entry.cardNumber));
    const result = deriveNpcDeck(pool, createMulberry32(99));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.every((cardNumber) => declared.has(cardNumber))).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    const first = deriveNpcDeck(skewedPool, createMulberry32(20260805));
    const second = deriveNpcDeck(skewedPool, createMulberry32(20260805));
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.value).toEqual(second.value);
  });

  it("produces different decks for different seeds", () => {
    const first = deriveNpcDeck(skewedPool, createMulberry32(1));
    const second = deriveNpcDeck(skewedPool, createMulberry32(2));
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.value).not.toEqual(second.value);
  });

  it("walks the pool in card-number order regardless of declaration order", () => {
    const pool = evenPool(20);
    const shuffled = [...pool].reverse();
    const first = deriveNpcDeck(pool, createMulberry32(42));
    const second = deriveNpcDeck(shuffled, createMulberry32(42));
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.value).toEqual(second.value);
  });

  it("skips the two card numbers the original game never deals", () => {
    const pool: DuelistPoolEntry[] = [
      { cardNumber: "721", weight: 1024 },
      { cardNumber: "722", weight: 512 },
      ...evenPool(20).map((entry) => ({ ...entry, weight: Math.floor(512 / 20) })),
    ];
    const result = deriveNpcDeck(pool, createMulberry32(5));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(REQUIRED_DECK_SIZE);
      expect(result.value).not.toContain("721");
      expect(result.value).not.toContain("722");
    }
  });

  it("fails as a value when the pool cannot fill forty slots", () => {
    const pool: DuelistPoolEntry[] = [{ cardNumber: "010", weight: POOL_WEIGHT_TOTAL }];
    const result = deriveNpcDeck(pool, createMulberry32(5));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("deck_pool_exhausted");
  });

  it("skips a roll that lands past the end of an under-weighted pool", () => {
    const pool: DuelistPoolEntry[] = [{ cardNumber: "010", weight: 1 }];
    const result = deriveNpcDeck(pool, createMulberry32(5));
    // Only 3 copies are reachable at all, so this is the exhaustion path — the
    // point is that it terminates instead of clamping to the last entry.
    expect(result.ok).toBe(false);
  });
});

describe("totalPoolWeight", () => {
  it("sums the declared weights", () => {
    expect(totalPoolWeight(skewedPool)).toBe(POOL_WEIGHT_TOTAL);
    expect(totalPoolWeight(evenPool(23))).toBe(POOL_WEIGHT_TOTAL);
  });
});
