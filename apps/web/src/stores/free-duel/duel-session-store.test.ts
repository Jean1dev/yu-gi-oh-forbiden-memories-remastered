import {
  ok,
  type Card,
  type DuelState,
  type Duelist,
  type MatchOrchestrationInput,
} from "@yugioh/shared";
import { getPublicDuelState } from "@yugioh/rules";
import { describe, expect, it } from "vitest";
import { createDuelSessionStore } from "./duel-session-store.ts";

const field = {
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
} as const;
const state: DuelState = {
  players: {
    P1: { lp: 8000, hand: [], deck: [], field, handPlayUsed: false },
    P2: { lp: 8000, hand: [], deck: [], field, handPlayUsed: false },
  },
  activeField: null,
  activePlayer: "P1",
  turn: 1,
  phase: "main",
  seed: 1,
};
const input: MatchOrchestrationInput = {
  duelistId: "seto",
  playerComposition: {},
  cpuComposition: {},
};
const duelist: Duelist = {
  id: "seto",
  name: "Seto",
  portrait: "/seto.png",
  difficulty: "hard",
  profile: { strategy: "aggressive", parameters: {} },
  deck: [],
  dropPool: [],
};

describe("duel session store", () => {
  it("starts and updates the in-memory session", async () => {
    const store = createDuelSessionStore({
      create: {
        buildInitializationInput: () =>
          ok({ players: { P1: { cards: [] }, P2: { cards: [] } }, seed: 1 }),
        initDuel: () => state,
        seedGenerator: () => 1,
        catalog: (): Card | undefined => undefined,
        validateDeck: {},
        generateSessionId: () => "session-1",
      },
      advance: {
        apply: (current) => ({ state: current, events: [] }),
        aiAgent: { decide: async () => ({ type: "advance_phase" }) },
        getPublicDuelState,
      },
    });
    expect(store.getState().session).toEqual({ status: "not_started" });
    await store.getState().start(input, duelist);
    expect(store.getState().session).toMatchObject({
      status: "in_progress",
      duelSessionId: "session-1",
    });
    await store.getState().submitAction({ type: "advance_phase" });
    expect(store.getState().session.status).toBe("in_progress");
  });
});
