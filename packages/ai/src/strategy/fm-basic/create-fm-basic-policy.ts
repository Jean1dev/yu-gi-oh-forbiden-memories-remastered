import type { EvaluateAiCandidate } from "@yugioh/shared";
import { generateCandidates } from "../../candidates/generate-candidates.ts";
import { filterLegalCandidates } from "../../legal-candidates/filter-legal-candidates.ts";
import type { StrategyPolicy } from "../types.ts";
import { normalizeFmBasicParameters } from "./normalize-parameters.ts";
import { selectFmBasicAction } from "./select-action.ts";

export type FmBasicPolicyDependencies = Readonly<{
  evaluateCandidate: EvaluateAiCandidate;
}>;

export function createFmBasicPolicy(dependencies: FmBasicPolicyDependencies): StrategyPolicy {
  return Object.freeze({
    name: "fm-basic",
    decide: ({ state, parameters }) => {
      const candidates = generateCandidates(state, "P2");
      const legalResult = filterLegalCandidates({
        state,
        candidates,
        evaluate: dependencies.evaluateCandidate,
      });
      return selectFmBasicAction({
        state,
        legalResult,
        parameters: normalizeFmBasicParameters(parameters),
      });
    },
  });
}
