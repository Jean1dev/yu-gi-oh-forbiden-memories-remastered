import {
  DomainError,
  err,
  type Card,
  type CardCatalogLookup,
  type ConsolidatedDuelResult,
  type DefaultCommonDropPool,
  type DropPool,
  type Result,
} from "@yugioh/shared";

import { createIndexedDbCollectionCache } from "../collection/indexeddb-cache.ts";
import { applyOfflineVictoryReward } from "../reward/apply-offline-victory-reward.ts";
import { createIndexedDbVictoryRewardQueue } from "../reward/victory-reward-queue.ts";
import { createSupabaseVictoryRewardRepository } from "../reward/victory-reward-repository.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../supabase/client.ts";
import { createIndexedDbWalletCache } from "../wallet/indexeddb-cache.ts";
import {
  grantVictoryReward,
  type GrantedVictoryReward,
  type GrantVictoryRewardDeps,
} from "./grant-victory-reward.ts";

/**
 * The pool a drop falls back to when the grade's tier has no candidates for
 * this duelist (`free-duel/F06` Error Handling).
 *
 * Derived from the defeated duelist's own `common` tier rather than declared as
 * a literal list: the balancing data for a global fallback pool does not exist,
 * and picking cards for one here would be exactly the invented value the PRDs
 * forbid. Using the opponent's common tier keeps the reward thematically theirs
 * and needs no new data.
 */
export function defaultCommonDropPoolFor(dropPool: DropPool): DefaultCommonDropPool {
  return dropPool.find((tier) => tier.tier === "common")?.cardNumbers ?? [];
}

function catalogFrom(cards: readonly Card[]): CardCatalogLookup {
  const byNumber = new Map(cards.map((card) => [card.numero, card]));
  return (cardNumber) => byNumber.get(cardNumber);
}

/**
 * Builds the browser-side reward chain and returns the function the duel screen
 * hands to the result overlay.
 *
 * Everything here is I/O-bound composition — Supabase, IndexedDB, the session's
 * player id. The decisions (which card, how many stars) were already made by
 * pure code before any of this runs.
 */
export function createGrantVictoryReward(cards: readonly Card[]) {
  const catalog = catalogFrom(cards);

  return async (
    result: Extract<ConsolidatedDuelResult, { status: "victory" }>,
    dropPool: DropPool,
  ): Promise<Result<GrantedVictoryReward, DomainError>> => {
    const client = createSupabaseClient();
    const playerId = await getAuthenticatedPlayerId(client);
    if (playerId === undefined) {
      return err(
        new DomainError(
          "The player session expired before the reward could be applied.",
          "reward_apply_unauthenticated",
        ),
      );
    }

    const deps: GrantVictoryRewardDeps = {
      catalog,
      victoryRewardRepository: createSupabaseVictoryRewardRepository(client),
      victoryRewardQueue: createIndexedDbVictoryRewardQueue(),
      collectionCache: createIndexedDbCollectionCache(),
      walletCache: createIndexedDbWalletCache(),
      applyOfflineVictoryReward,
      clock: { now: () => new Date() },
      defaultCommonDropPool: defaultCommonDropPoolFor(dropPool),
    };

    return grantVictoryReward(result, { playerId, dropPool }, deps);
  };
}
