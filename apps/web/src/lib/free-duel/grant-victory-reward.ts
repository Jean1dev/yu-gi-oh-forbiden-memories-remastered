import { selectDropCardNumber } from "@yugioh/rules";
import {
  VictoryRewardEventSchema,
  DomainError,
  err,
  ok,
  type CardWeightLookup,
  type ConsolidatedDuelResult,
  type DefaultCommonDropPool,
  type DropPool,
  type DropRewardOutcome,
  type DropTierId,
  type Result,
  type VictoryRewardResult,
} from "@yugioh/shared";

import {
  applyVictoryReward,
  type ApplyVictoryRewardDeps,
} from "../reward/apply-victory-reward.ts";
import { log } from "../logging.ts";

export type GrantVictoryRewardContext = Readonly<{ playerId: string; dropPool: DropPool }>;
export type GrantedVictoryReward = Readonly<{
  outcome: DropRewardOutcome;
  reward: VictoryRewardResult;
}>;
export type GrantVictoryRewardCache = Readonly<{
  get(duelSessionId: string): GrantedVictoryReward | undefined;
  set(duelSessionId: string, granted: GrantedVictoryReward): void;
}>;
export type GrantVictoryRewardDeps = ApplyVictoryRewardDeps &
  Readonly<{
    defaultCommonDropPool: DefaultCommonDropPool;
    cache?: GrantVictoryRewardCache | undefined;
  }>;

export function createGrantVictoryRewardCache(): GrantVictoryRewardCache {
  const grants = new Map<string, GrantedVictoryReward>();
  return {
    get: (duelSessionId) => grants.get(duelSessionId),
    set: (duelSessionId, granted) => void grants.set(duelSessionId, granted),
  };
}

const defaultCache = createGrantVictoryRewardCache();

/**
 * The original's per-card chances out of 2048 for the resolved tier, as the
 * lookup `selectDropCardNumber` expects.
 *
 * `undefined` when the tier carries no weights — a duelist this project
 * invented, or the fallback common pool — which leaves the draw uniform, the
 * same behaviour as before the weights were carried through the roster.
 */
function weightLookupFor(pool: DropPool, tier: DropTierId): CardWeightLookup | undefined {
  const weights = pool.find((entry) => entry.tier === tier)?.weights;
  return weights === undefined ? undefined : (cardNumber) => weights[cardNumber] ?? 1;
}

export async function grantVictoryReward(
  result: Extract<ConsolidatedDuelResult, { status: "victory" }>,
  context: GrantVictoryRewardContext,
  deps: GrantVictoryRewardDeps,
): Promise<Result<GrantedVictoryReward, DomainError>> {
  const cache = deps.cache ?? defaultCache;
  const cached = cache.get(result.duelSessionId);
  if (cached !== undefined) return ok(cached);

  const selection = selectDropCardNumber(
    context.dropPool,
    result.rating.reward.dropTier,
    deps.defaultCommonDropPool,
    result.duelSessionId,
    weightLookupFor(context.dropPool, result.rating.reward.dropTier),
  );
  if (!selection.ok) return selection;
  const event = VictoryRewardEventSchema.safeParse({
    playerId: context.playerId,
    duelId: result.duelSessionId,
    cardNumber: selection.value.cardNumber,
    stars: result.rating.reward.stars,
  });
  if (!event.success) {
    log("warn", "victory_reward_event_malformed", { issues: event.error.issues });
    return err(
      new DomainError("Victory reward event failed validation.", "malformed_victory_reward_event", {
        issues: event.error.issues,
      }),
    );
  }
  const applied = await applyVictoryReward(event.data, deps);
  if (!applied.ok) return applied;
  const granted = { outcome: selection.value, reward: applied.value };
  cache.set(result.duelSessionId, granted);
  return ok(granted);
}
