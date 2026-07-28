import { generateInitialDeck, type RandomSource } from "@yugioh/rules";
import { ok, type DomainError, type InitialPoolConfig, type Result } from "@yugioh/shared";

import type { CatalogAndPool } from "./catalog-adapter.ts";
import type { InitialDeckRepository, InitialDeckResult } from "./supabase-repository.ts";

export type EnsureInitialDeckDeps = Readonly<{
  playerId: string;
  repository: InitialDeckRepository;
  randomSource: RandomSource;
  /** Lazy: only called when no deck exists yet, so the common "already has a deck" path never loads the catalog. */
  loadCatalog(): Promise<Result<CatalogAndPool, DomainError>>;
  /** No concrete configuration ships yet (Decision 7) — `undefined` falls back to the whole catalog. */
  poolConfig?: InitialPoolConfig | undefined;
}>;

/**
 * Idempotently guarantees the player has an active deck (spec build-deck/F02
 * §3, steps 11-14). Reads `active_decks` first: if a deck already exists,
 * returns it as-is without touching pool, draw, or persistence (Decision
 * 12-a) — no catalog load, no randomness, no write. Only when absent does it
 * generate a deck and persist it, then hands back whatever the RPC actually
 * wrote (`createdNow`, `deck`), never the locally generated value, so two
 * concurrent callers racing on the same player never disagree with what
 * Postgres persisted (Decision 12-b, 14).
 */
export async function ensureInitialDeck(
  deps: EnsureInitialDeckDeps,
): Promise<Result<InitialDeckResult, DomainError>> {
  const existing = await deps.repository.readExisting(deps.playerId);
  if (!existing.ok) {
    return existing;
  }
  if (existing.value !== undefined) {
    return ok({ deck: existing.value, createdNow: false });
  }

  const catalogResult = await deps.loadCatalog();
  if (!catalogResult.ok) {
    return catalogResult;
  }

  const generated = generateInitialDeck(
    deps.poolConfig,
    catalogResult.value.catalog,
    catalogResult.value.poolLookup,
    deps.randomSource,
  );
  if (!generated.ok) {
    return generated;
  }

  return deps.repository.persist(deps.playerId, generated.value);
}
