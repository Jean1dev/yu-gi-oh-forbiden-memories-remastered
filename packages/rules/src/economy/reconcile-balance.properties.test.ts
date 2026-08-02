import type { PendingVictoryReward } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { reconcileWalletBalance } from "./reconcile-balance.ts";

const duelIdArb = fc.uuid();
const starsArb = fc.integer({ min: 0, max: 100_000 });

const pendingRewardArb: fc.Arbitrary<PendingVictoryReward> = fc
  .tuple(duelIdArb, starsArb, fc.integer({ min: 0, max: 1_000_000 }))
  .map(([duelId, stars, queuedOffset]) => ({
    duelId,
    playerId: "player-1",
    cardNumber: "001",
    stars,
    queuedAt: new Date(queuedOffset).toISOString(),
  }));

const pendingQueueArb = fc.array(pendingRewardArb, { maxLength: 10 });
const originArb = fc.constantFrom<"server" | "cache">("server", "cache");
const persistedStarsArb = fc.integer({ min: 0, max: 1_000_000 });
const structurallyInvalidArb = fc.oneof(
  fc.double({ noInteger: true, noNaN: false }),
  fc.integer({ max: -1 }),
  fc.constant(Number.NaN),
  fc.constant(Number.POSITIVE_INFINITY),
  fc.constant(Number.NEGATIVE_INFINITY),
);

function distinctStarsTotal(pending: readonly PendingVictoryReward[]): number {
  const byDuelId = new Map<string, number>();
  for (const reward of pending) {
    if (!byDuelId.has(reward.duelId)) byDuelId.set(reward.duelId, reward.stars);
  }
  return [...byDuelId.values()].reduce((sum, stars) => sum + stars, 0);
}

describe("reconcileWalletBalance properties", () => {
  it("effectiveStars is always an integer >= persistedStars >= 0", () => {
    fc.assert(
      fc.property(originArb, persistedStarsArb, pendingQueueArb, (origin, persistedStars, pending) => {
        const appliedDuelIds = new Set(pending.filter((_, i) => i % 2 === 0).map((r) => r.duelId));
        const result = reconcileWalletBalance({ origin, persistedStars, pending, appliedDuelIds });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(Number.isInteger(result.value.effectiveStars)).toBe(true);
        expect(result.value.effectiveStars).toBeGreaterThanOrEqual(result.value.persistedStars);
        expect(result.value.persistedStars).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("creates no stars once every queued duelId is already applied", () => {
    fc.assert(
      fc.property(persistedStarsArb, pendingQueueArb, (persistedStars, pending) => {
        const appliedDuelIds = new Set(pending.map((r) => r.duelId));
        const result = reconcileWalletBalance({
          origin: "server",
          persistedStars,
          pending,
          appliedDuelIds,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.effectiveStars).toBe(result.value.persistedStars);
      }),
      { numRuns: 1000 },
    );
  });

  it("loses no stars when nothing has been applied yet", () => {
    fc.assert(
      fc.property(persistedStarsArb, pendingQueueArb, (persistedStars, pending) => {
        const result = reconcileWalletBalance({
          origin: "server",
          persistedStars,
          pending,
          appliedDuelIds: new Set(),
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.effectiveStars).toBe(persistedStars + distinctStarsTotal(pending));
      }),
      { numRuns: 1000 },
    );
  });

  it("never throws for any structurally invalid persisted balance", () => {
    fc.assert(
      fc.property(originArb, structurallyInvalidArb, pendingQueueArb, (origin, persistedStars, pending) => {
        expect(() =>
          reconcileWalletBalance({ origin, persistedStars, pending, appliedDuelIds: new Set() }),
        ).not.toThrow();
        const result = reconcileWalletBalance({
          origin,
          persistedStars,
          pending,
          appliedDuelIds: new Set(),
        });
        expect(result.ok).toBe(false);
      }),
      { numRuns: 1000 },
    );
  });
});
