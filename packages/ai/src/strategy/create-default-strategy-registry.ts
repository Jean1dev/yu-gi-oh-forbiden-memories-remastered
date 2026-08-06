import { createStrategyRegistry } from "./create-strategy-registry.ts";
import {
  createFmBasicPolicy,
  type FmBasicPolicyDependencies,
} from "./fm-basic/create-fm-basic-policy.ts";
import { passivePolicy } from "./passive-policy.ts";

export function createDefaultStrategyRegistry(dependencies: FmBasicPolicyDependencies) {
  return createStrategyRegistry([passivePolicy, createFmBasicPolicy(dependencies)]);
}
