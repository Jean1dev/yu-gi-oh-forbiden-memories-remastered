import {
  ok,
  type Card,
  type DuelState,
  type MatchOrchestrationInput,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { createDuelSession } from "../src/lib/free-duel/duel-session.ts";

const input: MatchOrchestrationInput = {
  duelistId: "seto",
  playerComposition: {},
  cpuComposition: {},
};

describe("free duel rematch independence integration", () => {
  it("creates independent sessions without residual state", () => {
    let sessionSequence = 0;
    let seedSequence = 40;
    const dependencies = {
      buildInitializationInput: (
        _input: unknown,
        { seedGenerator }: { readonly seedGenerator: () => number },
      ) =>
        ok({
          players: { P1: { cards: [] }, P2: { cards: [] } },
          seed: seedGenerator(),
        }),
      initDuel: (initialization: { readonly seed: number }): DuelState => ({
        players: {
          P1: { lp: 8000, hand: [], deck: [], field: emptyField() },
          P2: { lp: 8000, hand: [], deck: [], field: emptyField() },
        },
        activeField: null,
        activePlayer: "P1",
        turn: 1,
        phase: "main",
        seed: initialization.seed,
      }),
      seedGenerator: () => {
        seedSequence += 1;
        return seedSequence;
      },
      catalog: (): Card | undefined => undefined,
      validateDeck: {},
      generateSessionId: () => {
        sessionSequence += 1;
        return `session-${sessionSequence}`;
      },
    };

    const original = createDuelSession(input, dependencies);
    if (original.status !== "in_progress") throw new Error("Expected an active original session.");
    const rematch = createDuelSession(input, dependencies);
    if (rematch.status !== "in_progress") throw new Error("Expected an active rematch session.");

    expect(rematch.duelistId).toBe(original.duelistId);
    expect(rematch.duelSessionId).not.toBe(original.duelSessionId);
    expect(rematch.state.seed).not.toBe(original.state.seed);
    expect(rematch.state.players.P1.lp).toBe(8000);
    expect(rematch.state).not.toBe(original.state);
    expect(rematch.state.players.P1).not.toBe(original.state.players.P1);
  });
});

function emptyField() {
  return {
    monsters: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
    spells: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
  };
}
