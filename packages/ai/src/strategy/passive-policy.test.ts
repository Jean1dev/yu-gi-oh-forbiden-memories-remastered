import { describe, expect, it } from "vitest";
import { passivePolicy } from "./passive-policy.ts";

describe("passivePolicy", () => {
  it("always advances the phase", () => {
    expect(passivePolicy.decide({ state: {} as never, parameters: {} })).toEqual({
      type: "advance_phase",
    });
  });
});
