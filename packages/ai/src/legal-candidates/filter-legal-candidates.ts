import type {
  DuelAction,
  EvaluateAiCandidate,
  LegalCandidate,
  LegalCandidateFilterResult,
  PublicDuelState,
} from "@yugioh/shared";

export function filterLegalCandidates(input: Readonly<{
  state: PublicDuelState;
  candidates: readonly DuelAction[];
  evaluate: EvaluateAiCandidate;
}>): LegalCandidateFilterResult {
  const legal: LegalCandidate[] = [];
  for (const action of input.candidates) {
    const result = input.evaluate(input.state, action);
    if (result.kind === "accepted") {
      legal.push({ action, resultingState: result.resultingState });
    }
  }
  return legal.length > 0
    ? { kind: "legal_candidates", candidates: legal }
    : { kind: "fallback", action: { type: "advance_phase" } };
}
