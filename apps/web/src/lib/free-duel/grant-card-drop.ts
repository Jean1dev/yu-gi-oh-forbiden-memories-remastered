import { selectDropCardNumber } from "@yugioh/rules";
import {
  CardRewardEventSchema,
  ok,
  type ConsolidatedDuelResult,
  type DefaultCommonDropPool,
  type DomainError,
  type DropPool,
  type DropRewardOutcome,
  type Result,
  type RewardResult,
} from "@yugioh/shared";

import type { RegisterCardRewardDeps } from "../reward/register-card-reward.ts";
import { registerCardReward } from "../reward/register-card-reward.ts";

export type GrantCardDropContext = Readonly<{
  playerId: string;
  dropPool: DropPool;
}>;

export type GrantedCardDrop = Readonly<{
  outcome: DropRewardOutcome;
  reward: RewardResult;
}>;

/** In-memory cache by `duelSessionId`, same pattern as `resolveDuelResult` (F05). */
export type GrantCardDropCache = Readonly<{
  get(duelSessionId: string): GrantedCardDrop | undefined;
  set(duelSessionId: string, granted: GrantedCardDrop): void;
}>;

export type GrantCardDropDeps = RegisterCardRewardDeps &
  Readonly<{
    defaultCommonDropPool: DefaultCommonDropPool;
    cache?: GrantCardDropCache | undefined;
  }>;

export function createGrantCardDropCache(): GrantCardDropCache {
  const grants = new Map<string, GrantedCardDrop>();
  return {
    get: (duelSessionId) => grants.get(duelSessionId),
    set: (duelSessionId, granted) => {
      grants.set(duelSessionId, granted);
    },
  };
}

const defaultCache = createGrantCardDropCache();

/**
 * Orchestrates the drop reward for one victory (spec free-duel/F06 §3):
 * selects the card with the pure, deterministic `selectDropCardNumber`, then
 * delegates the credit entirely to `registerCardReward` (`build-deck/F03`,
 * unchanged). Cached in memory by `duelSessionId` so re-rendering the result
 * screen or resuming the tab never re-selects a card nor calls
 * `registerCardReward` a second time (Decision 6/12) — a new `duelSessionId`
 * (a rematch) never reuses a previous entry.
 */
export async function grantCardDrop(
  result: Extract<ConsolidatedDuelResult, { status: "victory" }>,
  context: GrantCardDropContext,
  deps: GrantCardDropDeps,
): Promise<Result<GrantedCardDrop, DomainError>> {
  const cache = deps.cache ?? defaultCache;
  const cached = cache.get(result.duelSessionId);
  if (cached) return ok(cached);

  const selection = selectDropCardNumber(
    context.dropPool,
    result.rating.reward.dropTier,
    deps.defaultCommonDropPool,
    result.duelSessionId,
  );
  if (!selection.ok) return selection;

  const event = CardRewardEventSchema.parse({
    playerId: context.playerId,
    duelId: result.duelSessionId,
    cardNumber: selection.value.cardNumber,
  });

  const registered = await registerCardReward(event, deps);
  if (!registered.ok) return registered;

  const granted: GrantedCardDrop = { outcome: selection.value, reward: registered.value };
  cache.set(result.duelSessionId, granted);
  return ok(granted);
}
