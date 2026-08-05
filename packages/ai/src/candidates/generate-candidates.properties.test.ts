import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { PublicDuelState, PublicPlayerState } from "@yugioh/shared";
import { generateCandidates } from "./generate-candidates.ts";

const emptyPlayer = (visible: boolean): PublicPlayerState => ({
  lp: 8000,
  hand: visible ? { visible: true as const, cards: [] } : { visible: false as const, count: 0 },
  remainingDeck: 35,
  field: {
    monsters: [{ occupied: false }, { occupied: false }, { occupied: false }, { occupied: false }, { occupied: false }],
    spells: [{ occupied: false }, { occupied: false }, { occupied: false }, { occupied: false }, { occupied: false }],
  },
});

describe("generateCandidates properties", () => {
  it("is deterministic and always has a terminal fallback", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 1000 }), (turn) => {
      const input: PublicDuelState = {
        players: { P1: emptyPlayer(false), P2: emptyPlayer(true) },
        activeField: null,
        activePlayer: "P2",
        turn,
        phase: "main",
      };
      const actions = generateCandidates(input, "P2");
      expect(actions).toEqual(generateCandidates(input, "P2"));
      expect(actions.at(-1)).toEqual({ type: "advance_phase" });
    }), { numRuns: 100 });
  });
});
