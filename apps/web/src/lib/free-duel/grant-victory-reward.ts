import { selectDropCardNumber } from "@yugioh/rules";
import {
  VictoryRewardEventSchema,
  ok,
  type ConsolidatedDuelResult,
  type DefaultCommonDropPool,
  type DomainError,
  type DropPool,
  type DropRewardOutcome,
  type Result,
  type VictoryRewardResult,
} from "@yugioh/shared";

import {
  applyVictoryReward,
  type ApplyVictoryRewardDeps,
} from "../reward/apply-victory-reward.ts";

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
  );
  if (!selection.ok) return selection;
  const event = VictoryRewardEventSchema.parse({
    playerId: context.playerId,
    duelId: result.duelSessionId,
    cardNumber: selection.value.cardNumber,
    stars: result.rating.reward.stars,
  });
  const applied = await applyVictoryReward(event, deps);
  if (!applied.ok) return applied;
  const granted = { outcome: selection.value, reward: applied.value };
  cache.set(result.duelSessionId, granted);
  return ok(granted);
}
