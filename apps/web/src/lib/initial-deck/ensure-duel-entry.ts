import { ok, type Collection, type DomainError, type Result } from "@yugioh/shared";

import { createSupabaseServiceRoleClient } from "../supabase/client.ts";
import { loadCatalogAndPool } from "./catalog-adapter.ts";
import { createCryptoRandomSource } from "./crypto-random-source.ts";
import { ensureInitialDeck } from "./ensure-initial-deck.ts";
import { createSupabaseInitialDeckRepository } from "./supabase-repository.ts";

/**
 * The defensive guard any screen that needs an active deck calls before
 * proceeding (Build Deck on open; Free Duel/Online Duel cross-PRD on start —
 * spec build-deck/F02 §3 step 16). Reads `active_decks`; if it is absent,
 * re-runs the same idempotent operation the signup handler uses instead of a
 * second code path, so a player who reaches a duel screen before Auth/Cadastro
 * ever fires never gets stuck. While this promise is pending, the caller
 * shows "Preparando seu deck inicial…" (PRD §6 F02 Error Handling).
 */
export async function ensureDuelEntry(playerId: string): Promise<Result<Collection, DomainError>> {
  const client = createSupabaseServiceRoleClient();

  const result = await ensureInitialDeck({
    playerId,
    repository: createSupabaseInitialDeckRepository(client),
    randomSource: createCryptoRandomSource(),
    loadCatalog: loadCatalogAndPool,
  });
  if (!result.ok) {
    return result;
  }

  return ok(result.value.deck);
}
