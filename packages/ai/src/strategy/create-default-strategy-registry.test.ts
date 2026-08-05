import { describe, expect, it } from "vitest";
import { createDefaultStrategyRegistry } from "./create-default-strategy-registry.ts";

describe("createDefaultStrategyRegistry", () => {
  it("contains exactly passive and fm-basic", () => {
    expect(
      createDefaultStrategyRegistry({ evaluateCandidate: () => ({ kind: "rejected" }) }).names(),
    ).toEqual(["passive", "fm-basic"]);
  });
});
