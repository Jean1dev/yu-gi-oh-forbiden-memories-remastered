import type { DuelAction, LegalCandidateFilterResult, PublicDuelState } from "@yugioh/shared";
import { selectAttack } from "./select-attack.ts";
import { selectPositionChange } from "./select-position-change.ts";
import { selectSpell } from "./select-spell.ts";
import { selectSummon } from "./select-summon.ts";
import type { FmBasicParameters } from "./types.ts";

export function selectFmBasicAction(
  input: Readonly<{
    state: PublicDuelState;
    legalResult: LegalCandidateFilterResult;
    parameters: FmBasicParameters;
  }>,
): DuelAction {
  if (input.legalResult.kind === "fallback") return input.legalResult.action;
  const candidates = input.legalResult.candidates;
  return (
    selectSummon(input.state, candidates, input.parameters)?.action ??
    selectSpell(input.state, candidates, input.parameters)?.action ??
    selectPositionChange(candidates)?.action ??
    selectAttack(input.state, candidates, input.parameters)?.action ??
    candidates.find((candidate) => candidate.action.type === "advance_phase")?.action ?? {
      type: "advance_phase",
    }
  );
}
