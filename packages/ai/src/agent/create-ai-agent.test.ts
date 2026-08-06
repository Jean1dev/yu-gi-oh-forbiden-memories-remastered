import { describe, expect, it, vi } from "vitest";
import { createStrategyRegistry } from "../strategy/create-strategy-registry.ts";
import { passivePolicy } from "../strategy/passive-policy.ts";
import type { StrategyPolicy } from "../strategy/types.ts";
import { createAiAgent } from "./create-ai-agent.ts";

const state = {} as never;

function setup(extra: readonly StrategyPolicy[] = []) {
  const warn = vi.fn();
  const sleep = vi.fn(async () => undefined);
  const agent = createAiAgent({
    registry: createStrategyRegistry([passivePolicy, ...extra]),
    logger: { warn },
    sleep,
    validateState: false,
  });
  return { agent, warn, sleep };
}

describe("createAiAgent", () => {
  it("delegates a known strategy and waits 650ms", async () => {
    const decide = vi.fn(() => ({ type: "advance_phase" }) as const);
    const parameters = { custom: true };
    const { agent, sleep, warn } = setup([{ name: "known", decide }]);
    await expect(agent.decide(state, { strategy: "known", parameters })).resolves.toEqual({
      type: "advance_phase",
    });
    expect(decide).toHaveBeenCalledWith({ state, parameters });
    expect(sleep).toHaveBeenCalledWith(650);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown", "unknown_strategy"],
    ["  ", "empty_strategy"],
  ])("falls back safely for %j", async (strategy, reason) => {
    const { agent, warn } = setup();
    await expect(agent.decide(state, { strategy, parameters: {} })).resolves.toEqual({
      type: "advance_phase",
    });
    expect(warn).toHaveBeenCalledWith("ai_strategy_fallback", {
      requestedStrategy: strategy,
      fallbackStrategy: "passive",
      reason,
    });
  });

  it("accepts zero delay and rejects invalid delays", async () => {
    const registry = createStrategyRegistry([passivePolicy]);
    const logger = { warn: vi.fn() };
    await expect(
      createAiAgent({ registry, logger, delayMs: 0, validateState: false }).decide(state, {
        strategy: "passive",
        parameters: {},
      }),
    ).resolves.toEqual({ type: "advance_phase" });
    expect(() => createAiAgent({ registry, logger, delayMs: -1 })).toThrow(/delay/);
    expect(() => createAiAgent({ registry, logger, delayMs: Number.NaN })).toThrow(/delay/);
  });

  it("never rejects for malformed state, policy, logger, or sleep failures", async () => {
    const throwing = {
      name: "throwing",
      decide: () => {
        throw new Error("boom");
      },
    };
    const agent = createAiAgent({
      registry: createStrategyRegistry([passivePolicy, throwing]),
      logger: {
        warn: () => {
          throw new Error("logger");
        },
        error: () => {
          throw new Error("logger");
        },
      },
      sleep: async () => {
        throw new Error("timer");
      },
      delayMs: 0,
      validateState: false,
    });
    await expect(agent.decide(state, { strategy: "throwing", parameters: {} })).resolves.toEqual({
      type: "advance_phase",
    });
    await expect(
      createAiAgent({
        registry: createStrategyRegistry([passivePolicy]),
        logger: {
          warn: () => {
            throw new Error("logger");
          },
        },
        delayMs: 0,
      }).decide({} as never, { strategy: "passive", parameters: {} }),
    ).resolves.toEqual({ type: "advance_phase" });
  });
});
