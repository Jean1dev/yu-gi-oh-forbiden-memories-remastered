import { describe, expect, it } from "vitest";
import { filterLegalCandidates } from "./filter-legal-candidates.ts";

describe("filterLegalCandidates", () => {
  it("preserves accepted candidates in order and discards rejections", () => {
    const state = {} as never;
    const actions = [{ type: "advance_phase" }, { type: "advance_phase" }] as const;
    let call = 0;
    const result = filterLegalCandidates({
      state,
      candidates: actions,
      evaluate: () => (++call === 1 ? { kind: "rejected" } : { kind: "accepted", resultingState: state }),
    });
    expect(result).toEqual({ kind: "legal_candidates", candidates: [{ action: actions[1], resultingState: state }] });
  });

  it("returns an explicit fallback when nothing is accepted", () => {
    expect(filterLegalCandidates({ state: {} as never, candidates: [], evaluate: () => ({ kind: "rejected" }) })).toEqual({
      kind: "fallback",
      action: { type: "advance_phase" },
    });
  });
});
