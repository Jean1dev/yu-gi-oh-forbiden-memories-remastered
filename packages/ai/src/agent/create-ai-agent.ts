import type { AiAgent } from "@yugioh/shared";
import type { AiLogger, StrategyRegistry } from "../strategy/types.ts";

const DEFAULT_AI_DELAY_MS = 650;

export type CreateAiAgentOptions = Readonly<{
  registry: StrategyRegistry;
  logger: AiLogger;
  sleep?: ((ms: number) => Promise<void>) | undefined;
  delayMs?: number | undefined;
}>;

async function defaultSleep(ms: number): Promise<void> {
  const schedule = (
    globalThis as unknown as Readonly<{
      setTimeout(callback: () => void, delayMs: number): unknown;
    }>
  ).setTimeout;
  await new Promise<void>((resolve) => schedule(resolve, ms));
}

export function createAiAgent(options: CreateAiAgentOptions): AiAgent {
  const delayMs = options.delayMs ?? DEFAULT_AI_DELAY_MS;
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("AI presentation delay must be a finite non-negative number.");
  }
  const passive = options.registry.resolve("passive");
  if (passive === undefined) {
    throw new Error('The AI strategy registry must contain "passive".');
  }
  const sleep = options.sleep ?? defaultSleep;
  return Object.freeze({
    async decide(state, profile) {
      const requested = profile.strategy;
      const blank = requested.trim().length === 0;
      const selected = blank ? undefined : options.registry.resolve(requested);
      const policy = selected ?? passive;
      if (selected === undefined) {
        options.logger.warn("ai_strategy_fallback", {
          requestedStrategy: requested,
          fallbackStrategy: "passive",
          reason: blank ? "empty_strategy" : "unknown_strategy",
        });
      }
      const action = await policy.decide({ state, parameters: profile.parameters });
      await sleep(delayMs);
      return action;
    },
  });
}
