import { describe, expect, it } from "vitest";
import type { Card, DeckComposition, Duelist } from "@yugioh/shared";
import { createDuelRuntime } from "./duel-runtime.ts";

function card(numero: string): Card {
  return {
    id: Number(numero),
    numero,
    nome: `Card ${numero}`,
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
}

function composition(numbers: readonly string[]): DeckComposition {
  const result: Record<string, number> = {};
  for (const number of numbers) result[number] = (result[number] ?? 0) + 1;
  return result;
}

const numbers = Array.from({ length: 40 }, (_, index) => String(index + 1).padStart(3, "0"));
const cards = numbers.map(card);
const duelist: Duelist = {
  id: "test-duelist",
  name: "Duelista de Teste",
  portrait: "cards-data/001.jpg",
  difficulty: "easy",
  profile: { strategy: "passive", parameters: {} },
  deck: numbers,
  dropPool: [{ tier: "common", cardNumbers: numbers.slice(0, 8) }],
};

describe("createDuelRuntime", () => {
  it("starts a session with two real deck compositions", () => {
    const runtime = createDuelRuntime({ cards, sleep: async () => undefined });
    const session = runtime.start(
      {
        duelistId: duelist.id,
        playerComposition: composition(numbers),
        cpuComposition: composition(numbers),
        seed: 1,
      },
      duelist,
    );

    expect(session).toMatchObject({ status: "in_progress", duelistId: "test-duelist" });
  });

  it("rejects initialization when the composition is not a 40-card deck", () => {
    const runtime = createDuelRuntime({ cards, sleep: async () => undefined });
    const session = runtime.start(
      {
        duelistId: duelist.id,
        playerComposition: {},
        cpuComposition: composition(numbers),
        seed: 1,
      },
      duelist,
    );

    expect(session).toMatchObject({ status: "failed", reason: "deck_rejected_by_engine" });
  });
});
