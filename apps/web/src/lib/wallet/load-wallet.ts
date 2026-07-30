import { DomainError, err, ok, type LoadedWalletBalance, type Result } from "@yugioh/shared";

import type { Clock } from "../collection/load-collection.ts";
import type { WalletCache } from "./indexeddb-cache.ts";
import type { WalletRepository } from "./supabase-repository.ts";

export type LoadWalletBalanceDeps = Readonly<{
  playerId: string | undefined;
  repository: WalletRepository;
  cache: WalletCache;
  clock: Clock;
}>;

export async function loadWalletBalance(
  deps: LoadWalletBalanceDeps,
): Promise<Result<LoadedWalletBalance, DomainError>> {
  if (deps.playerId === undefined) {
    return err(new DomainError("No authenticated session.", "session_missing"));
  }
  const server = await deps.repository.load(deps.playerId);
  if (server.ok) {
    const syncedAt = deps.clock.now().toISOString();
    try {
      await deps.cache.saveSnapshot({ ...server.value, syncedAt });
    } catch {
      // A server result remains usable when the cache is unavailable.
    }
    return ok({ origin: "server", stars: server.value.stars, syncedAt });
  }
  try {
    const cached = await deps.cache.loadSnapshot(deps.playerId);
    if (cached !== undefined) {
      return ok({ origin: "cache", stars: cached.stars, syncedAt: cached.syncedAt });
    }
  } catch {
    // Report one stable boundary error below.
  }
  return err(new DomainError("Wallet unavailable.", "wallet_unavailable", { playerId: deps.playerId }));
}
