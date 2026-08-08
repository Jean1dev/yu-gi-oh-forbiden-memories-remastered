import { EVENT_TYPES, INITIAL_LP, type DuelState, type PlayerId } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createEvent } from "./create-event.ts";
import { closeReactionWindow, openReactionWindow } from "./reaction-window.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

const emptyZone = { occupied: false } as const;

function emptyState(): DuelState {
  const field = {
    monsters: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
    spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
  } as const;

  return {
    players: {
      P1: { lp: INITIAL_LP, hand: [], deck: [], field, handPlayUsed: false },
      P2: { lp: INITIAL_LP, hand: [], deck: [], field, handPlayUsed: false },
    },
    activeField: null,
    activePlayer: "P1",
    turn: 1,
    phase: "main",
    seed: 1753617600,
    stats: emptyDuelStatsByPlayer(),
  };
}

const playerIdArbitrary = fc.constantFrom<PlayerId>("P1", "P2");
const eventTypeArbitrary = fc.constantFrom(...EVENT_TYPES);
const contextArbitrary = fc.dictionary(
  fc.string(),
  fc.oneof(fc.string(), fc.integer(), fc.boolean()),
);

const eventArbitrary = fc
  .record({ type: eventTypeArbitrary, originPlayer: playerIdArbitrary, context: contextArbitrary })
  .map(({ type, originPlayer, context }) => createEvent({ type, originPlayer, context }));

describe("reaction window round-trip", () => {
  it("closing a just-opened window always restores the original state", () => {
    fc.assert(
      fc.property(eventArbitrary, playerIdArbitrary, (event, reactingPlayer) => {
        const state = emptyState();

        const opened = openReactionWindow(state, event, reactingPlayer);
        if (!opened.ok) throw new Error("expected ok");
        const closed = closeReactionWindow(opened.value);
        if (!closed.ok) throw new Error("expected ok");

        expect(closed.value).toEqual(state);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("a second reaction window always fails", () => {
  it("opening a window while one is already pending always fails, regardless of event content", () => {
    fc.assert(
      fc.property(
        eventArbitrary,
        eventArbitrary,
        playerIdArbitrary,
        playerIdArbitrary,
        (firstEvent, secondEvent, firstPlayer, secondPlayer) => {
          const state = emptyState();

          const first = openReactionWindow(state, firstEvent, firstPlayer);
          if (!first.ok) throw new Error("expected ok");
          const second = openReactionWindow(first.value, secondEvent, secondPlayer);

          expect(second.ok).toBe(false);
          if (second.ok) throw new Error("expected error");
          expect(second.error.code).toBe("reaction_window_already_open");
        },
      ),
      { numRuns: 1000 },
    );
  });
});
