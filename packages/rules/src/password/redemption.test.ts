import { describe, expect, it } from "vitest";
import { applyRedemptionDebit, applyRedemptionToLedger, evaluateRedemptionEligibility } from "./redemption.ts";

describe("password redemption rules", () => {
  it.each([
    [{ priceStars: 10, balanceStars: 10, thresholdStars: null }, "ready"],
    [{ priceStars: 11, balanceStars: 10, thresholdStars: null }, "blocked_insufficient"],
    [{ priceStars: 10, balanceStars: undefined, thresholdStars: null }, "blocked_unknown_balance"],
    [{ priceStars: 10, balanceStars: 10, thresholdStars: 10 }, "needs_confirmation"],
  ] as const)("evaluates eligibility", (input, status) => expect(evaluateRedemptionEligibility(input)).toMatchObject({ ok: true, value: { status } }));
  it("never produces a negative balance", () => expect(applyRedemptionDebit(2, 3)).toMatchObject({ ok: false }));
  it("applies an id once", () => {
    const first = applyRedemptionToLedger({ balanceStars: 20, appliedRedemptionIds: [] }, { redemptionId: "one", priceStars: 5 });
    expect(first).toMatchObject({ ok: true, value: { applied: true, state: { balanceStars: 15 } } });
    if (first.ok) expect(applyRedemptionToLedger(first.value.state, { redemptionId: "one", priceStars: 5 })).toMatchObject({ ok: true, value: { applied: false, state: { balanceStars: 15 } } });
  });
});
