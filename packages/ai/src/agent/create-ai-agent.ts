import { PublicDuelStateSchema, type AiAgent, type DuelAction } from "@yugioh/shared";
import type { AiLogger, StrategyRegistry } from "../strategy/types.ts";

const DEFAULT_AI_DELAY_MS = 650;

export type CreateAiAgentOptions = Readonly<{
  registry: StrategyRegistry;
  logger: AiLogger;
  sleep?: ((ms: number) => Promise<void>) | undefined;
  delayMs?: number | undefined;
  validateState?: boolean | undefined;
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
  const safeLog = (
    level: "warn" | "error",
    event: string,
    context: Readonly<Record<string, unknown>>,
  ) => {
    try {
      options.logger[level]?.(event, context);
    } catch {
      // Observability is best-effort and must never break a duel.
    }
  };
  return Object.freeze({
    async decide(state, profile) {
      if ((options.validateState ?? true) && !PublicDuelStateSchema.safeParse(state).success) {
        safeLog("warn", "ai_invalid_public_state", {});
        return { type: "advance_phase" };
      }
      const requested = profile.strategy;
      const blank = requested.trim().length === 0;
      const selected = blank ? undefined : options.registry.resolve(requested);
      const policy = selected ?? passive;
      if (selected === undefined) {
        safeLog("warn", "ai_strategy_fallback", {
          requestedStrategy: requested,
          fallbackStrategy: "passive",
          reason: blank ? "empty_strategy" : "unknown_strategy",
        });
      }
      let action: DuelAction = { type: "advance_phase" };
      try {
        action = await policy.decide({ state, parameters: profile.parameters });
      } catch (error) {
        safeLog("error", "ai_decision_failed", {
          message: error instanceof Error ? error.message : "unknown error",
          strategy: policy.name,
        });
      }
      try {
        await sleep(delayMs);
      } catch (error) {
        safeLog("error", "ai_presentation_delay_failed", {
          message: error instanceof Error ? error.message : "unknown error",
        });
      }
      return action;
    },
  });
}
