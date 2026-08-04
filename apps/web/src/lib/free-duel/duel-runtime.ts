import {
  createApply,
  buildInitializationInput,
  closeReactionWindow,
  initDuel,
  serialize,
} from "@yugioh/engine";
import { buildReadyDeck, createFusionSequenceResolver, getPublicDuelState } from "@yugioh/rules";
import { OFFICIAL_FUSIONS } from "@yugioh/data/fusion/official";
import type {
  Card,
  CardCatalogLookup,
  ConsolidatedDuelResult,
  DuelSession,
  Duelist,
  EndedDuelSession,
  MatchOrchestrationInput,
} from "@yugioh/shared";

import { resolveDuelResult } from "./resolve-duel-result.ts";
import {
  MINIMUM_RATING_REWARD,
  readDuelOutcome,
  unavailableRatingEngine,
} from "./rating-policy.ts";
import { createPassiveAiAgent } from "./passive-ai-agent.ts";
import { createCryptoSeedGenerator, generateDuelSessionId } from "./seed-generator.ts";
import {
  createDuelSession,
  type AdvanceCpuDependencies,
  type ApplyAction,
} from "./duel-session.ts";

type ResolveEndedDuelResult = (session: EndedDuelSession) => Promise<ConsolidatedDuelResult>;

export type DuelRuntime = Readonly<{
  start(input: MatchOrchestrationInput, duelist: Duelist): DuelSession;
  applyAction: ApplyAction;
  advanceDependencies: Omit<AdvanceCpuDependencies, "cpuProfile" | "onStep">;
  resolveResult: ResolveEndedDuelResult;
}>;

export type CreateDuelRuntimeInput = Readonly<{
  cards: readonly Card[];
  sleep?: ((ms: number) => Promise<void>) | undefined;
}>;

function createCatalogLookup(cards: readonly Card[]): CardCatalogLookup {
  const byNumber = new Map(cards.map((card) => [card.numero, card]));
  return (cardNumber) => byNumber.get(cardNumber);
}

export function createDuelRuntime(input: CreateDuelRuntimeInput): DuelRuntime {
  const catalog = createCatalogLookup(input.cards);
  const fusionResults = new Map(
    OFFICIAL_FUSIONS.flatMap((recipe) =>
      recipe.kind === "materials" ? [[recipe.materials.join(":"), recipe.result] as const] : [],
    ),
  );
  const resolveFusion = createFusionSequenceResolver((left, right) =>
    fusionResults.get([left, right].sort().join(":")),
  );
  const apply = createApply({ resolveFusion, getCard: catalog });
  const seedGenerator = createCryptoSeedGenerator();
  const aiAgent = createPassiveAiAgent({ sleep: input.sleep });
  const resolveResult: ResolveEndedDuelResult = (session) =>
    resolveDuelResult(session, {
      readOutcome: readDuelOutcome,
      createSnapshot: serialize,
      ratingEngine: unavailableRatingEngine,
      minimumReward: MINIMUM_RATING_REWARD,
    });

  return {
    start: (matchInput) =>
      createDuelSession(matchInput, {
        buildInitializationInput,
        initDuel,
        seedGenerator,
        catalog,
        validateDeck: buildReadyDeck,
        generateSessionId: generateDuelSessionId,
      }),
    applyAction: apply,
    advanceDependencies: {
      apply,
      closeReactionWindow,
      aiAgent,
      getPublicDuelState,
    },
    resolveResult,
  };
}
