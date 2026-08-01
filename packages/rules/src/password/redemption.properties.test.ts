import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { applyRedemptionToLedger } from "./redemption.ts";

describe("redemption economy properties", () => {
  it("keeps the balance non-negative and retries idempotent", () => {
    fc.assert(fc.property(fc.nat(1_000_000), fc.array(fc.record({ id: fc.uuid(), price: fc.nat(10_000) })), (balance, intents) => {
      let state = { balanceStars: balance, appliedRedemptionIds: [] as readonly string[] };
      for (const intent of intents) {
        const result = applyRedemptionToLedger(state, { redemptionId: intent.id, priceStars: intent.price });
        if (result.ok) state = result.value.state;
        expect(state.balanceStars).toBeGreaterThanOrEqual(0);
      }
      const before = state;
      for (const intent of intents) {
        const retry = applyRedemptionToLedger(state, { redemptionId: intent.id, priceStars: intent.price });
        if (retry.ok) state = retry.value.state;
      }
      expect(state).toEqual(before);
    }), { numRuns: 1_000 });
  });
});
