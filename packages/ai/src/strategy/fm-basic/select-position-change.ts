import type { LegalCandidate } from "@yugioh/shared";

export function selectPositionChange(candidates: readonly LegalCandidate[]): LegalCandidate | undefined {
  return candidates.find((candidate) => candidate.action.type === "change_position");
}
