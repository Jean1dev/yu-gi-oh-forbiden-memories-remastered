import {
  DomainError,
  err,
  ok,
  type CardCatalogLookup,
  type DeckComposition,
  type ReadyDeck,
  type Result,
} from "@yugioh/shared";

import { expandComposition } from "./composition.ts";
import { validateDeckForDuel } from "./duel-validation.ts";

export function buildReadyDeck(input: {
  composition: DeckComposition;
  catalog: CardCatalogLookup;
}): Result<ReadyDeck, DomainError> {
  const verdict = validateDeckForDuel(input);
  if (!verdict.valid) {
    return err(
      new DomainError("Active deck is invalid.", "active_deck_invalid", {
        violations: verdict.violations,
      }),
    );
  }
  return ok({
    composition: input.composition,
    cardNumbers: expandComposition(input.composition),
    total: verdict.total,
  });
}
