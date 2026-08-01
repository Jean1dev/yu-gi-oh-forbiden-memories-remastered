import { loadRoster } from "@yugioh/data/roster";
import { buildReadyDeck, getPublicDuelState } from "@yugioh/rules";
import {
  ok,
  type Card,
  type CardCatalogLookup,
  type CardNumber,
  type DuelState,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { buildMatchInput } from "../src/lib/free-duel/build-match-input.ts";
import { advanceCpuDecisions, createDuelSession } from "../src/lib/free-duel/duel-session.ts";

function card(number: CardNumber): Card {
  return {
    id: Number(number),
    numero: number,
    nome: `Card ${number}`,
    img: null,
    classe: "Dragon",
    atk: 1000,
    def: 1000,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

describe("free duel F01 -> F02 -> F03", () => {
  it("starts a validated match and yields control after the CPU action", async () => {
    const numbers = Array.from({ length: 14 }, (_, index) => String(index + 1).padStart(3, "0"));
    const deck = [...numbers.flatMap((number) => [number, number, number])].slice(0, 40);
    const catalog: CardCatalogLookup = (number) =>
      numbers.includes(number) ? card(number) : undefined;
    const roster = loadRoster(
      {
        rosterVersion: "1.0.0",
        duelists: [
          {
            id: "seto",
            name: "Seto",
            portrait: "portraits/seto.png",
            difficulty: "hard",
            profile: { strategy: "aggressive", parameters: {} },
            deck,
            dropPool: [{ tier: "s", cardNumbers: ["001"] }],
          },
        ],
      },
      catalog,
    );
    expect(roster.ok).toBe(true);
    if (!roster.ok) return;
    const duelist = roster.value.duelists[0];
    if (!duelist) throw new Error("Expected a validated duelist");
    const ready = buildReadyDeck({
      composition: Object.fromEntries(
        numbers.map((number) => [number, deck.filter((n) => n === number).length]),
      ),
      catalog,
    });
    expect(ready.ok).toBe(true);
    if (!ready.ok) return;
    const input = buildMatchInput({ duelistId: duelist.id, playerDeck: ready.value, duelist });
    const initialState: DuelState = {
      players: {
        P1: {
          lp: 8000,
          hand: deck.slice(0, 5).map(card),
          deck: deck.slice(5).map(card),
          field: {
            monsters: [
              { occupied: false },
              { occupied: false },
              { occupied: false },
              { occupied: false },
              { occupied: false },
            ],
            spells: [
              { occupied: false },
              { occupied: false },
              { occupied: false },
              { occupied: false },
              { occupied: false },
            ],
          },
          handPlayUsed: false,
        },
        P2: {
          lp: 8000,
          hand: deck.slice(0, 5).map(card),
          deck: deck.slice(5).map(card),
          field: {
            monsters: [
              { occupied: false },
              { occupied: false },
              { occupied: false },
              { occupied: false },
              { occupied: false },
            ],
            spells: [
              { occupied: false },
              { occupied: false },
              { occupied: false },
              { occupied: false },
              { occupied: false },
            ],
          },
          handPlayUsed: false,
        },
      },
      activeField: null,
      activePlayer: "P2",
      turn: 1,
      phase: "main",
      seed: 42,
    };
    const session = createDuelSession(input, {
      buildInitializationInput: () =>
        ok({ players: { P1: { cards: [] }, P2: { cards: [] } }, seed: 42 }),
      initDuel: () => initialState,
      seedGenerator: () => 42,
      catalog,
      validateDeck: {},
      generateSessionId: () => "duel-1",
    });
    if (session.status !== "in_progress") throw new Error("Expected an active session");
    const advanced = await advanceCpuDecisions(session, {
      apply: (current) => ({
        state: { ...current, activePlayer: "P1" },
        events: [],
      }),
      aiAgent: { decide: async () => ({ type: "advance_phase" }) },
      getPublicDuelState,
      cpuProfile: duelist.profile,
    });
    expect(advanced).toMatchObject({
      status: "in_progress",
      duelSessionId: "duel-1",
      currentDecider: "P1",
    });
  });
});
