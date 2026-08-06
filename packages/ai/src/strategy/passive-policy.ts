import type { StrategyPolicy } from "./types.ts";

export const passivePolicy: StrategyPolicy = Object.freeze({
  name: "passive",
  decide: () => ({ type: "advance_phase" }) as const,
});
