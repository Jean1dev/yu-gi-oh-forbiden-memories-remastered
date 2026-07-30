import type { CardNumber, DropPool, DropTier } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { selectDropCardNumber } from "./select-drop-card.ts";

const cardNumberArb = fc.integer({ min: 0, max: 999 }).map((n) => String(n).padStart(3, "0"));
const tierIdArb = fc.string({ minLength: 1, maxLength: 8 }).filter((s) => s.trim().length > 0);

const dropTierArb: fc.Arbitrary<DropTier> = fc.record({
  tier: tierIdArb,
  cardNumbers: fc.uniqueArray(cardNumberArb, { minLength: 1, maxLength: 10 }),
});

const dropPoolArb: fc.Arbitrary<DropPool> = fc.array(dropTierArb, { maxLength: 6 });

const defaultCommonPoolArb: fc.Arbitrary<readonly CardNumber[]> = fc.array(cardNumberArb, {
  maxLength: 10,
});

describe("selectDropCardNumber candidate-set closure", () => {
  it("always returns a card number that belongs to the effectively used candidate set", () => {
    fc.assert(
      fc.property(
        dropPoolArb,
        tierIdArb,
        defaultCommonPoolArb,
        fc.string({ minLength: 1 }),
        (pool, tier, defaultPool, duelSessionId) => {
          const result = selectDropCardNumber(pool, tier, defaultPool, duelSessionId);
          if (!result.ok) return;

          const tierCandidates = pool.find((entry) => entry.tier === tier)?.cardNumbers ?? [];
          const effectiveSet = tierCandidates.length > 0 ? tierCandidates : defaultPool;
          expect(effectiveSet).toContain(result.value.cardNumber);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("selectDropCardNumber determinism", () => {
  it("produces deeply equal results for the same arguments across repeated calls", () => {
    fc.assert(
      fc.property(
        dropPoolArb,
        tierIdArb,
        defaultCommonPoolArb,
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 20 }),
        (pool, tier, defaultPool, duelSessionId, repeats) => {
          const results = Array.from({ length: repeats }, () =>
            selectDropCardNumber(pool, tier, defaultPool, duelSessionId),
          );
          for (const result of results) {
            expect(result).toEqual(results[0]);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("selectDropCardNumber totality", () => {
  it("never throws for any pool, tier or default pool combination", () => {
    fc.assert(
      fc.property(
        dropPoolArb,
        tierIdArb,
        defaultCommonPoolArb,
        fc.string({ minLength: 1 }),
        (pool, tier, defaultPool, duelSessionId) => {
          expect(() => selectDropCardNumber(pool, tier, defaultPool, duelSessionId)).not.toThrow();
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("always returns a Result, never a thrown error, even with duplicated tiers", () => {
    fc.assert(
      fc.property(
        dropTierArb,
        fc.integer({ min: 2, max: 5 }),
        tierIdArb,
        fc.string({ minLength: 1 }),
        (tier, repeatCount, requestedTier, duelSessionId) => {
          const pool: DropPool = Array.from({ length: repeatCount }, () => tier);
          const result = selectDropCardNumber(pool, requestedTier, [], duelSessionId);
          expect(typeof result.ok).toBe("boolean");
        },
      ),
      { numRuns: 1000 },
    );
  });
});
