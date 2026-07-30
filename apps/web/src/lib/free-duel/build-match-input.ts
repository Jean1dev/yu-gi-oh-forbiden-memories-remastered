import type { Duelist, DuelistId, MatchOrchestrationInput, ReadyDeck } from "@yugioh/shared";
import { groupIntoComposition } from "@yugioh/rules";

export function buildMatchInput(input: {
  readonly duelistId: DuelistId;
  readonly playerDeck: ReadyDeck;
  readonly duelist: Duelist;
  readonly seed?: number | undefined;
}): MatchOrchestrationInput {
  return {
    duelistId: input.duelistId,
    playerComposition: input.playerDeck.composition,
    cpuComposition: groupIntoComposition(input.duelist.deck),
    ...(input.seed === undefined ? {} : { seed: input.seed }),
  };
}
