import { describe, expect, it } from "vitest";

import roster from "../../data/roster.json" with { type: "json" };
import { POOL_WEIGHT_TOTAL } from "./derive-npc-deck.ts";

/**
 * Guards the shipped `roster.json`, not the builder that writes it — the
 * builder lives in `scripts/`, whose tests are not part of this package's
 * `vitest run --dir src`.
 *
 * `test-duelist` is excluded throughout: it is invented by this project rather
 * than ported, so it has no original chances to carry.
 */
type PortedTier = Readonly<{
  tier: string;
  cardNumbers: readonly string[];
  weights?: Readonly<Record<string, number>> | undefined;
}>;

/**
 * Widens the JSON import's literal types. TypeScript infers every card number
 * of every tier as its own key, which makes indexing by a runtime string an
 * error even though the data is exactly what these tests assert.
 */
const ported: readonly Readonly<{ id: string; dropPool: readonly PortedTier[] }>[] =
  roster.duelists.filter((duelist) => duelist.id !== "test-duelist");

describe("shipped roster drop weights (rating-engine/F03 + free-duel/F06)", () => {
  it("ships at least one ported duelist to assert against", () => {
    expect(ported.length).toBeGreaterThan(0);
  });

  it("carries weights on every tier of every ported duelist", () => {
    for (const duelist of ported) {
      for (const tier of duelist.dropPool) {
        expect(tier.weights, `${duelist.id}/${tier.tier}`).toBeDefined();
      }
    }
  });

  it("weighs every ported tier at exactly 2048, as the original does", () => {
    for (const duelist of ported) {
      for (const tier of duelist.dropPool) {
        const total = Object.values(tier.weights ?? {}).reduce((sum, weight) => sum + weight, 0);

        expect(total, `${duelist.id}/${tier.tier}`).toBe(POOL_WEIGHT_TOTAL);
      }
    }
  });

  it("gives every listed card a positive weight", () => {
    for (const duelist of ported) {
      for (const tier of duelist.dropPool) {
        for (const cardNumber of tier.cardNumbers) {
          expect(tier.weights?.[cardNumber], `${duelist.id}/${tier.tier}/${cardNumber}`)
            .toBeGreaterThan(0);
        }
      }
    }
  });

  it("weighs no card that the tier does not list", () => {
    for (const duelist of ported) {
      for (const tier of duelist.dropPool) {
        expect(Object.keys(tier.weights ?? {}).sort()).toEqual([...tier.cardNumbers].sort());
      }
    }
  });

  it("exposes the three FM tiers, so every grade band has a reachable pool", () => {
    for (const duelist of ported) {
      expect(duelist.dropPool.map((tier) => tier.tier).sort()).toEqual([
        "common",
        "sa-pow",
        "sa-tec",
      ]);
    }
  });
});
