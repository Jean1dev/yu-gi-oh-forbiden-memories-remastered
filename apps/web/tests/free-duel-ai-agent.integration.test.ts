import { afterEach, describe, expect, it, vi } from "vitest";
import { groupIntoComposition } from "@yugioh/rules";
import type { Card, Duelist } from "@yugioh/shared";
import { createDuelRuntime } from "../src/lib/free-duel/duel-runtime.ts";

const cards: Card[] = Array.from({ length: 14 }, (_, i) => {
  const num = String(i + 1).padStart(3, "0");
  const isMonster = i < 12;
  return {
    id: i + 1,
    numero: num,
    nome: `Card ${num}`,
    img: null,
    classe: "Dragon",
    atk: 1000,
    def: 1000,
    guardiao1: "Sun",
    guardiao2: "Moon",
    password: null,
    estrelas: null,
    tipo: isMonster ? "monstro" : "magica",
  };
});

const deckCardNumbers = [
  ...cards.slice(0, 12).flatMap((c) => [c.numero, c.numero, c.numero]), // 36 monsters
  ...cards.slice(12, 14).flatMap((c) => [c.numero, c.numero]), // 4 support
];

const duelist: Duelist = {
  id: "test-duelist",
  name: "Test Duelist",
  portrait: "cards-data/001.jpg",
  difficulty: "easy",
  profile: { strategy: "passive", parameters: {} },
  deck: deckCardNumbers,
  dropPool: [{ tier: "common", cardNumbers: deckCardNumbers.slice(0, 8) }],
};

function getTestState(runtime: ReturnType<typeof createDuelRuntime>) {
  const composition = groupIntoComposition(deckCardNumbers);
  const session = runtime.start(
    {
      duelistId: duelist.id,
      playerComposition: composition,
      cpuComposition: composition,
      seed: 1,
    },
    duelist,
  );
  if (session.status !== "in_progress") {
    throw new Error(`Expected session to be in_progress, got ${session.status}`);
  }
  return runtime.advanceDependencies.getPublicDuelState(session.state, "P2");
}

afterEach(() => vi.restoreAllMocks());

describe("Free Duel NPC AI composition", () => {
  it("uses the package agent with the existing AiAgent contract", async () => {
    const runtime = createDuelRuntime({ cards, sleep: async () => undefined });
    const state = getTestState(runtime);
    await expect(
      runtime.advanceDependencies.aiAgent.decide(state, {
        strategy: "passive",
        parameters: {},
      }),
    ).resolves.toEqual({ type: "advance_phase" });
  });

  it("keeps an unknown roster strategy safe and observable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const runtime = createDuelRuntime({ cards, sleep: async () => undefined });
    const state = getTestState(runtime);
    await expect(
      runtime.advanceDependencies.aiAgent.decide(state, {
        strategy: "fm-baisc",
        parameters: {},
      }),
    ).resolves.toEqual({ type: "advance_phase" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ai_strategy_fallback"));
  });
});
