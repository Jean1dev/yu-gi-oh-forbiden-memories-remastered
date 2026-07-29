import type { ReadyDeck } from "@yugioh/shared";

let pendingDeck: Readonly<{ duelistId: string; playerDeck: ReadyDeck }> | null = null;

export function setDuelHandoff(duelistId: string, playerDeck: ReadyDeck): void {
  pendingDeck = { duelistId, playerDeck };
}

export function takeDuelHandoff(
  duelistId: string,
): Readonly<{ duelistId: string; playerDeck: ReadyDeck }> | null {
  if (pendingDeck?.duelistId !== duelistId) return null;
  const handoff = pendingDeck;
  pendingDeck = null;
  return handoff;
}

export function clearDuelHandoff(): void {
  pendingDeck = null;
}
