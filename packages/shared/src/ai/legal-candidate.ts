import type { DuelAction } from "../duel/orchestration.ts";
import type { PublicDuelState } from "../duel/types.ts";

export type LegalCandidate = Readonly<{
  action: DuelAction;
  resultingState: PublicDuelState;
}>;

export type CandidateEvaluation =
  | Readonly<{ kind: "accepted"; resultingState: PublicDuelState }>
  | Readonly<{ kind: "rejected" }>
  | Readonly<{
      kind: "unavailable";
      code: "unknown_public_state" | "expired_decision_context";
    }>;

export type EvaluateAiCandidate = (
  state: PublicDuelState,
  action: DuelAction,
) => CandidateEvaluation;

export type LegalCandidateFilterResult =
  | Readonly<{ kind: "legal_candidates"; candidates: readonly LegalCandidate[] }>
  | Readonly<{ kind: "fallback"; action: Readonly<{ type: "advance_phase" }> }>;
