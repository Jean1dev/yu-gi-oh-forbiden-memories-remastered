import { describe, expect, it, vi } from "vitest";
import { err, ok, DomainError } from "@yugioh/shared";
import { createAiCandidateEvaluator } from "./ai-candidate-evaluator.ts";

describe("createAiCandidateEvaluator", () => {
  it("rejects unknown and expired projections", () => {
    const evaluator = createAiCandidateEvaluator({
      apply: vi.fn(() => err(new DomainError("no", "phase_mismatch"))),
      getPublicDuelState: vi.fn(),
    });
    const publicState = {} as never;
    expect(evaluator.evaluate(publicState, { type: "advance_phase" })).toEqual({
      kind: "unavailable",
      code: "unknown_public_state",
    });
    const context = evaluator.open(publicState, {} as never);
    context.close();
    expect(evaluator.evaluate(publicState, { type: "advance_phase" })).toEqual({
      kind: "unavailable",
      code: "expired_decision_context",
    });
  });

  it("projects accepted results without promoting the private snapshot", () => {
    const original = { turn: 1 } as never;
    const next = { turn: 2 } as never;
    const projected = { turn: 2 } as never;
    const evaluator = createAiCandidateEvaluator({
      apply: () => ok({ state: next, events: [] }),
      getPublicDuelState: (state) => (state === next ? projected : ({} as never)),
    });
    const publicState = {} as never;
    evaluator.open(publicState, original);
    expect(evaluator.evaluate(publicState, { type: "advance_phase" })).toEqual({
      kind: "accepted",
      resultingState: projected,
    });
    expect(original).toEqual({ turn: 1 });
  });
});
