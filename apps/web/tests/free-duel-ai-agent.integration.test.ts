import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card } from "@yugioh/shared";
import { createDuelRuntime } from "../src/lib/free-duel/duel-runtime.ts";

const card: Card = {
  id: 1,
  numero: "001",
  nome: "Test Dragon",
  img: null,
  classe: "Dragon",
  atk: 1000,
  def: 1000,
  guardiao1: "Sun",
  guardiao2: "Moon",
  password: null,
  estrelas: null,
  tipo: "monstro",
};

afterEach(() => vi.restoreAllMocks());

describe("Free Duel NPC AI composition", () => {
  it("uses the package agent with the existing AiAgent contract", async () => {
    const runtime = createDuelRuntime({ cards: [card], sleep: async () => undefined });
    await expect(
      runtime.advanceDependencies.aiAgent.decide({} as never, {
        strategy: "passive",
        parameters: {},
      }),
    ).resolves.toEqual({ type: "advance_phase" });
  });

  it("keeps an unknown roster strategy safe and observable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const runtime = createDuelRuntime({ cards: [card], sleep: async () => undefined });
    await expect(
      runtime.advanceDependencies.aiAgent.decide({} as never, {
        strategy: "fm-baisc",
        parameters: {},
      }),
    ).resolves.toEqual({ type: "advance_phase" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ai_strategy_fallback"));
  });
});
