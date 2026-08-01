import { INITIAL_WALLET_STARS, ok, type DomainError, type Result } from "@yugioh/shared";

import { createSupabaseServiceRoleClient } from "../supabase/client.ts";
import { loadCatalogAndPool } from "./catalog-adapter.ts";
import { createCryptoRandomSource } from "./crypto-random-source.ts";
import { ensureInitialDeck } from "./ensure-initial-deck.ts";
import { createSupabaseInitialDeckRepository, type InitialDeckResult } from "./supabase-repository.ts";
import { createSupabaseEnsureWalletRepository, type EnsuredWallet } from "../wallet/ensure-wallet.ts";

export type AccountBootstrapResult = Readonly<{
  initialDeck: InitialDeckResult;
  wallet: EnsuredWallet;
}>;

/**
 * The contract expected by Auth/Cadastro (cross-PRD, spec build-deck/F02 §3
 * step 15; extended by spec password/F01 §3 steps 9-11 to also guarantee the
 * wallet). Invoked once after account creation. Tolerates at-least-once
 * redelivery by construction — a second call with the same `playerId` is an
 * observable no-op on both the deck (`initialDeck.createdNow: false`) and the
 * wallet (`wallet.createdNow: false`), never an error, so Auth/Cadastro does
 * not need to guarantee exactly-once delivery on its side.
 *
 * Builds its own production dependencies (real Supabase service-role client,
 * real catalog, real `crypto`-backed randomness) the same way
 * `useCollection` builds F01's — `ensureInitialDeck` itself stays a pure
 * dependency-injected orchestrator, easy to test with fakes.
 */
export async function onAccountCreated(playerId: string): Promise<Result<AccountBootstrapResult, DomainError>> {
  const client = createSupabaseServiceRoleClient();

  const initialDeck = await ensureInitialDeck({
    playerId,
    repository: createSupabaseInitialDeckRepository(client),
    randomSource: createCryptoRandomSource(),
    loadCatalog: loadCatalogAndPool,
  });
  if (!initialDeck.ok) {
    return initialDeck;
  }

  const wallet = await createSupabaseEnsureWalletRepository(client).ensure(playerId, INITIAL_WALLET_STARS);
  if (!wallet.ok) {
    return wallet;
  }

  return ok({ initialDeck: initialDeck.value, wallet: wallet.value });
}
