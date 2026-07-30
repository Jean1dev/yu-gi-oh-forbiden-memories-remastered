import { ok, type Card } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { applyVictoryReward } from "./apply-victory-reward.ts";

describe("applyVictoryReward properties", () => {
  it("never loses either side of an accepted victory reward", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 1_000_000 }), async (stars) => {
        const result = await applyVictoryReward(
          { playerId: "player", duelId: `duel-${stars}`, cardNumber: "001", stars },
          {
            catalog: () => ({ numero: "001" }) as Card,
            victoryRewardRepository: {
              apply: async () => ok({ applied: true, cardQuantity: 1, walletStars: stars }),
            },
            victoryRewardQueue: {
              enqueueReward: async () => undefined,
              listPendingRewards: async () => [],
              removePendingReward: async () => undefined,
            },
            collectionCache: {
              loadSnapshot: async () => undefined,
              saveSnapshot: async () => undefined,
            },
            walletCache: { loadSnapshot: async () => undefined, saveSnapshot: async () => undefined },
            applyOfflineVictoryReward: async () => {
              throw new Error("not used");
            },
            clock: { now: () => new Date(0) },
          },
        );
        expect(result).toEqual({
          ok: true,
          value: { status: "applied", cardQuantity: 1, walletStars: stars },
        });
      }),
      { numRuns: 1_000 },
    );
  });
});
