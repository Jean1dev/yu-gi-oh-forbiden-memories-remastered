import { INITIAL_LP, type DuelState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createEvent } from "./create-event.ts";
import { closeReactionWindow, hasOpenReactionWindow, openReactionWindow } from "./reaction-window.ts";

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
  };
}

describe("openReactionWindow", () => {
  it("sets pending from the event and the reacting player", () => {
    const state = emptyState();
    const event = createEvent({ type: "onAttackDeclared", originPlayer: "P1" });

    const result = openReactionWindow(state, event, "P2");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.pending).toEqual({
      type: "reaction_window",
      event,
      reactingPlayer: "P2",
    });
  });

  it("does not mutate the received state object", () => {
    const state = emptyState();
    const event = createEvent({ type: "onAttackDeclared", originPlayer: "P1" });

    openReactionWindow(state, event, "P2");

    expect(state.pending).toBeUndefined();
  });

  it("fails with reaction_window_already_open when pending already exists", () => {
    const state = emptyState();
    const event = createEvent({ type: "onAttackDeclared", originPlayer: "P1" });
    const opened = openReactionWindow(state, event, "P2");
    if (!opened.ok) throw new Error("expected ok");

    const result = openReactionWindow(opened.value, event, "P2");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error.code).toBe("reaction_window_already_open");
  });
});

describe("closeReactionWindow", () => {
  it("removes pending from a state with an open window", () => {
    const state = emptyState();
    const event = createEvent({ type: "onAttackDeclared", originPlayer: "P1" });
    const opened = openReactionWindow(state, event, "P2");
    if (!opened.ok) throw new Error("expected ok");

    const result = closeReactionWindow(opened.value);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.pending).toBeUndefined();
  });

  it("does not mutate the received state object", () => {
    const state = emptyState();
    const event = createEvent({ type: "onAttackDeclared", originPlayer: "P1" });
    const opened = openReactionWindow(state, event, "P2");
    if (!opened.ok) throw new Error("expected ok");

    closeReactionWindow(opened.value);

    expect(opened.value.pending).toBeDefined();
  });

  it("fails with no_reaction_window_open when pending is undefined", () => {
    const result = closeReactionWindow(emptyState());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error.code).toBe("no_reaction_window_open");
  });
});

describe("hasOpenReactionWindow", () => {
  it("returns false for a state without pending", () => {
    expect(hasOpenReactionWindow(emptyState())).toBe(false);
  });

  it("returns true after openReactionWindow", () => {
    const state = emptyState();
    const event = createEvent({ type: "onAttackDeclared", originPlayer: "P1" });
    const opened = openReactionWindow(state, event, "P2");
    if (!opened.ok) throw new Error("expected ok");

    expect(hasOpenReactionWindow(opened.value)).toBe(true);
  });
});
