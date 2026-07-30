import { buildReadyDeck } from "@yugioh/rules";
import type { ActiveDeckVerification, CardCatalogLookup, DeckViolation } from "@yugioh/shared";
import { log } from "../logging.ts";
import { loadDuelActiveDeck } from "./load-duel-active-deck.ts";

export async function verifyActiveDeck(input: {
  playerId?: string;
  repository: Parameters<typeof loadDuelActiveDeck>[0]["repository"];
  cache: Parameters<typeof loadDuelActiveDeck>[0]["cache"];
  catalog?: CardCatalogLookup;
}): Promise<ActiveDeckVerification> {
  if (input.catalog === undefined) {
    return { status: "unavailable", hasValidDeck: false, reason: "catalog_unavailable" };
  }
  const loaded = await loadDuelActiveDeck(input);
  if (!loaded.ok) {
    return {
      status: "unavailable",
      hasValidDeck: false,
      reason: loaded.error.code === "missing_session" ? "missing_session" : "load_failed",
    };
  }
  if (loaded.value === "missing" || Object.keys(loaded.value.composition).length === 0) {
    return {
      status: "blocked",
      hasValidDeck: false,
      reason: "missing_deck",
      violations: [],
      origin: loaded.value === "missing" ? "server" : loaded.value.origin,
    };
  }
  const ready = buildReadyDeck({ composition: loaded.value.composition, catalog: input.catalog });
  if (!ready.ok) {
    const violations = ready.error.details.violations as DeckViolation[];
    log("warn", "duel_active_deck_invalid", { playerId: input.playerId, violations });
    return {
      status: "blocked",
      hasValidDeck: false,
      reason: "invalid_deck",
      violations,
      origin: loaded.value.origin,
    };
  }
  return {
    status: "ready",
    hasValidDeck: true,
    readyDeck: ready.value,
    origin: loaded.value.origin,
  };
}
