import type { Duelist, ReadyDeck } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { buildMatchInput } from "./build-match-input.ts";

const playerDeck: ReadyDeck = {
  composition: { "001": 2 },
  cardNumbers: ["001", "001"],
  total: 2,
};
const duelist: Duelist = {
  id: "seto",
  name: "Seto",
  portrait: "/seto.png",
  difficulty: "hard",
  profile: { strategy: "aggressive", parameters: {} },
  deck: ["002", "003", "002"],
  dropPool: [],
};

describe("build match input", () => {
  it("preserves the validated player composition and groups the NPC deck", () => {
    const result = buildMatchInput({ duelistId: duelist.id, playerDeck, duelist });
    expect(result.playerComposition).toBe(playerDeck.composition);
    expect(result.cpuComposition).toEqual({ "002": 2, "003": 1 });
    expect(result).not.toHaveProperty("seed");
  });

  it("passes an explicit seed through unchanged", () => {
    expect(buildMatchInput({ duelistId: duelist.id, playerDeck, duelist, seed: 42 }).seed).toBe(42);
  });
});
