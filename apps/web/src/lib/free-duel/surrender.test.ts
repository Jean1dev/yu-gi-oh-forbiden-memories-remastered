import type { ApplyResult, DuelSession, DuelState } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import {
  canSurrender,
  createSurrenderAction,
  surrender,
} from "./surrender.ts";

function duelState(activePlayer: "P1" | "P2", phase: DuelState["phase"] = "main"): DuelState {
  const emptyField = {
    monsters: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
    spells: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
  };
  return {
    players: {
      P1: { lp: 8000, hand: [], deck: [], field: emptyField, handPlayUsed: false },
      P2: { lp: 8000, hand: [], deck: [], field: emptyField, handPlayUsed: false },
    },
    activeField: null,
    activePlayer,
    turn: 1,
    phase,
    seed: 1,
  };
}

function activeSession(activePlayer: "P1" | "P2"): Extract<
  DuelSession,
  { status: "in_progress" }
> {
  return {
    status: "in_progress",
    duelSessionId: "duel-1",
    duelistId: "seto",
    state: duelState(activePlayer),
    currentDecider: activePlayer,
  };
}

describe("surrender", () => {
  it.each([
    { status: "not_started" } as const,
    {
      status: "ended",
      duelSessionId: "duel-1",
      duelistId: "seto",
      finalState: duelState("P1", "end"),
    } as const,
    {
      status: "failed",
      duelSessionId: "duel-1",
      duelistId: "seto",
      reason: "ai_unavailable",
    } as const,
  ])("is unavailable and has no effect when the session is $status", (session) => {
    const apply = vi.fn();

    expect(canSurrender(session)).toBe(false);
    expect(surrender(session, "P1", { apply })).toBe(session);
    expect(apply).not.toHaveBeenCalled();
  });

  it("creates the local player's surrender intent", () => {
    expect(createSurrenderAction("P1")).toEqual({ type: "surrender", player: "P1" });
  });

  it.each(["P1", "P2"] as const)(
    "interrupts an active session when the current decider is %s",
    (currentDecider) => {
      const session = activeSession(currentDecider);
      const endedState: DuelState = {
        ...duelState(currentDecider),
        outcome: { status: "decisive", winner: "P2", loser: "P1", reason: "surrender" },
      };
      const apply = vi.fn(
        (): ApplyResult => ({ state: endedState, events: [] }),
      );

      expect(surrender(session, "P1", { apply })).toEqual({
        status: "ended",
        duelSessionId: "duel-1",
        duelistId: "seto",
        finalState: endedState,
      });
      expect(apply).toHaveBeenCalledWith(session.state, {
        type: "surrender",
        player: "P1",
      });
    },
  );
});
