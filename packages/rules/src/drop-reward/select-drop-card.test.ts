import type { CardNumber, DropPool } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { selectDropCardNumber } from "./select-drop-card.ts";

const commonTier: DropPool = [
  { tier: "common", cardNumbers: ["001", "002", "003"] },
  { tier: "rare", cardNumbers: ["010"] },
];
const defaultCommonPool: readonly CardNumber[] = ["099"];

describe("selectDropCardNumber", () => {
  it("picks a candidate from the resolved tier when it is not empty", () => {
    const result = selectDropCardNumber(commonTier, "common", defaultCommonPool, "session-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe("duelist_pool");
    expect(["001", "002", "003"]).toContain(result.value.cardNumber);
  });

  it("falls back to the default common pool when the resolved tier has no candidates", () => {
    const result = selectDropCardNumber(commonTier, "ultra-rare", defaultCommonPool, "session-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe("default_common_pool");
    expect(result.value.cardNumber).toBe("099");
  });

  it("preserves the requested tier in the outcome even when falling back", () => {
    const result = selectDropCardNumber(commonTier, "ultra-rare", defaultCommonPool, "session-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tier).toBe("ultra-rare");
  });

  it("returns no_drop_candidates_available when both the tier and the default pool are empty", () => {
    const result = selectDropCardNumber(commonTier, "ultra-rare", [], "session-1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("no_drop_candidates_available");
  });

  it("never throws for an unknown tier id", () => {
    expect(() =>
      selectDropCardNumber(commonTier, "does-not-exist", defaultCommonPool, "session-1"),
    ).not.toThrow();
    expect(() => selectDropCardNumber(commonTier, "does-not-exist", [], "session-1")).not.toThrow();
  });

  it("applies the injected weightLookup instead of uniform weights", () => {
    const weightLookup = (cardNumber: CardNumber) => (cardNumber === "002" ? 1000 : 1);
    const result = selectDropCardNumber(
      commonTier,
      "common",
      defaultCommonPool,
      "session-1",
      weightLookup,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cardNumber).toBe("002");
  });

  it("defaults to uniform weights when weightLookup is omitted", () => {
    const withoutLookup = selectDropCardNumber(commonTier, "common", defaultCommonPool, "session-1");
    const withUniformLookup = selectDropCardNumber(
      commonTier,
      "common",
      defaultCommonPool,
      "session-1",
      () => 1,
    );

    expect(withoutLookup).toEqual(withUniformLookup);
  });

  it("returns the same outcome for the same duelSessionId across repeated calls", () => {
    const first = selectDropCardNumber(commonTier, "common", defaultCommonPool, "session-42");
    const second = selectDropCardNumber(commonTier, "common", defaultCommonPool, "session-42");

    expect(first).toEqual(second);
  });

  it("can return a different card for a different duelSessionId with more than one candidate", () => {
    const outcomes = new Set<CardNumber>();
    for (let i = 0; i < 50; i++) {
      const result = selectDropCardNumber(commonTier, "common", defaultCommonPool, `session-${i}`);
      if (result.ok) outcomes.add(result.value.cardNumber);
    }
    expect(outcomes.size).toBeGreaterThan(1);
  });
});
