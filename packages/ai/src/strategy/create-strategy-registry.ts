import type { StrategyPolicy, StrategyRegistry } from "./types.ts";
import { passivePolicy } from "./passive-policy.ts";

export function createStrategyRegistry(policies: readonly StrategyPolicy[]): StrategyRegistry {
  const byName = new Map<string, StrategyPolicy>();
  for (const policy of policies) {
    if (policy.name.trim().length === 0) {
      throw new Error("AI strategy names must not be empty.");
    }
    if (byName.has(policy.name)) {
      throw new Error(`Duplicate AI strategy: ${policy.name}`);
    }
    byName.set(policy.name, policy);
  }
  if (!byName.has("passive")) {
    throw new Error('The AI strategy registry must contain "passive".');
  }
  const names = Object.freeze([...byName.keys()]);
  return Object.freeze({
    resolve: (strategy: string) => byName.get(strategy),
    names: () => names,
  });
}

export function createF01StrategyRegistry(): StrategyRegistry {
  return createStrategyRegistry([passivePolicy]);
}
