import { createAiAgent, createF01StrategyRegistry } from "@yugioh/ai";
import {
  apply,
  buildInitializationInput,
  closeReactionWindow,
  initDuel,
  serialize,
} from "@yugioh/engine";
import { buildReadyDeck, getPublicDuelState } from "@yugioh/rules";
import type {
  Card,
  CardCatalogLookup,
  ConsolidatedDuelResult,
  DuelSession,
  Duelist,
  EndedDuelSession,
  MatchOrchestrationInput,
} from "@yugioh/shared";
import { aiLogger } from "../logging.ts";
import { createAiCandidateEvaluator } from "./ai-candidate-evaluator.ts";

import { resolveDuelResult } from "./resolve-duel-result.ts";
import {
  MINIMUM_RATING_REWARD,
  readDuelOutcome,
  unavailableRatingEngine,
} from "./rating-policy.ts";
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
  const seedGenerator = createCryptoSeedGenerator();
  const candidateEvaluator = createAiCandidateEvaluator({ apply, getPublicDuelState });
  const aiAgent = createAiAgent({
    registry: createF01StrategyRegistry(),
    logger: aiLogger,
    sleep: input.sleep,
  });
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
      openAiDecisionContext: candidateEvaluator.open,
    },
    resolveResult,
  };
}
