import { describe, expect, it } from "vitest";
import { createStrategyRegistry } from "./create-strategy-registry.ts";
import type { StrategyPolicy } from "./types.ts";

const passive: StrategyPolicy = {
  name: "passive",
  decide: () => ({ type: "advance_phase" }),
};

describe("createStrategyRegistry", () => {
  it("resolves policies by their exact names", () => {
    const registry = createStrategyRegistry([passive]);
    expect(registry.resolve("passive")).toBe(passive);
    expect(registry.resolve("Passive")).toBeUndefined();
    expect(registry.names()).toEqual(["passive"]);
  });

  it("returns undefined for unknown strategies", () => {
    expect(createStrategyRegistry([passive]).resolve("unknown")).toBeUndefined();
  });

  it("rejects empty, duplicate, and missing passive policies", () => {
    expect(() => createStrategyRegistry([{ ...passive, name: " " }])).toThrow(/empty/);
    expect(() => createStrategyRegistry([passive, passive])).toThrow(/Duplicate/);
    expect(() => createStrategyRegistry([{ ...passive, name: "other" }])).toThrow(/passive/);
  });
});
