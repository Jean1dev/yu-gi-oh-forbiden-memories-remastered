import type { DomainError, Result } from "@yugioh/shared";

import { createSupabaseServiceRoleClient } from "../supabase/client.ts";
import { loadCatalogAndPool } from "./catalog-adapter.ts";
import { createCryptoRandomSource } from "./crypto-random-source.ts";
import { ensureInitialDeck } from "./ensure-initial-deck.ts";
import { createSupabaseInitialDeckRepository, type InitialDeckResult } from "./supabase-repository.ts";

/**
 * The contract expected by Auth/Cadastro (cross-PRD, spec build-deck/F02 §3
 * step 15): invoked once after account creation. Tolerates at-least-once
 * redelivery by construction — a second call with the same `playerId` is an
 * observable no-op (`createdNow: false`), never an error, so Auth/Cadastro
 * does not need to guarantee exactly-once delivery on its side.
 *
 * Builds its own production dependencies (real Supabase service-role client,
 * real catalog, real `crypto`-backed randomness) the same way
 * `useCollection` builds F01's — `ensureInitialDeck` itself stays a pure
 * dependency-injected orchestrator, easy to test with fakes.
 */
export async function onAccountCreated(playerId: string): Promise<Result<InitialDeckResult, DomainError>> {
  const client = createSupabaseServiceRoleClient();

  return ensureInitialDeck({
    playerId,
    repository: createSupabaseInitialDeckRepository(client),
    randomSource: createCryptoRandomSource(),
    loadCatalog: loadCatalogAndPool,
  });
}
