import { DomainError, err, ok, type LoadedDuelDeck, type Result } from "@yugioh/shared";
import type { DuelActiveDeckCache } from "./active-deck-cache.ts";
import type { DuelActiveDeckRepository } from "./active-deck-repository.ts";

export async function loadDuelActiveDeck(input: {
  playerId?: string;
  repository: DuelActiveDeckRepository;
  cache: DuelActiveDeckCache;
}): Promise<Result<LoadedDuelDeck | "missing", DomainError>> {
  if (input.playerId === undefined) {
    return err(new DomainError("A session is required.", "missing_session"));
  }
  try {
    const server = await input.repository.read(input.playerId);
    if (server.ok) {
      return server.value === undefined ? ok("missing") : ok({ ...server.value, origin: "server" });
    }
  } catch {
    // Network failures use the read-only snapshot below.
  }
  try {
    const cached = await input.cache.read(input.playerId);
    return cached === undefined
      ? err(new DomainError("Active deck is unavailable.", "active_deck_unavailable"))
      : ok({ ...cached, origin: "cache" });
  } catch {
    return err(new DomainError("Active deck is unavailable.", "active_deck_unavailable"));
  }
}
