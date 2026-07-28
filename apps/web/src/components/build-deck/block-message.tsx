"use client";

import type { DomainError } from "@yugioh/shared";

import { BUILD_DECK_MESSAGES, ownedQuantityLimitMessage } from "./messages.ts";

export type BlockMessageProps = Readonly<{
  lastBlock: DomainError | undefined;
}>;

/**
 * Maps the deck-edit block code to the specific player-facing message (spec
 * build-deck/F05 §6, PRD Error Handling): each of the three player-facing
 * codes gets its own text; `card_not_in_draft` is defensive-only (normal UI
 * never offers "remove" for a card absent from the draft) and renders
 * nothing, matching the PRD's "— sem mensagem ao jogador" for that case.
 */
export function BlockMessage({ lastBlock }: BlockMessageProps) {
  if (lastBlock === undefined || lastBlock.code === "card_not_in_draft") {
    return null;
  }

  if (lastBlock.code === "owned_quantity_limit") {
    const quantityOwned = lastBlock.details["quantityOwned"];
    return <p role="alert">{ownedQuantityLimitMessage(Number(quantityOwned))}</p>;
  }

  if (lastBlock.code === "max_copies_limit") {
    return <p role="alert">{BUILD_DECK_MESSAGES.maxCopiesLimit}</p>;
  }

  if (lastBlock.code === "card_not_owned") {
    return <p role="alert">{BUILD_DECK_MESSAGES.cardNotOwned}</p>;
  }

  return null;
}
