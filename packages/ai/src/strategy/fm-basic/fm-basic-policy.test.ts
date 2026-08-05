import { describe, expect, it } from "vitest";
import { selectFmBasicAction } from "./select-action.ts";

describe("fm-basic deterministic selection", () => {
  it("uses the explicit fallback for every empty legal result", () => {
    const input = {
      state: {} as never,
      legalResult: { kind: "fallback", action: { type: "advance_phase" } } as const,
      parameters: {
        aggression: 0.5,
        playsSpells: true,
        playsFieldSpells: false,
        defensiveThreshold: 0,
      },
    };
    expect(selectFmBasicAction(input)).toEqual({ type: "advance_phase" });
    expect(selectFmBasicAction(input)).toEqual(selectFmBasicAction(input));
  });
});
