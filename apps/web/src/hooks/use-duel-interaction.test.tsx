// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import type { Card, DuelState, PlayerField } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { useDuelInteraction } from "./use-duel-interaction.ts";

const card: Card = {
  id: 1,
  numero: "001",
  nome: "Blue Dragon",
  img: null,
  classe: "Dragon",
  atk: 1200,
  def: 900,
  guardiao1: "Sun",
  guardiao2: "Moon",
  password: null,
  estrelas: null,
  tipo: "monstro",
};

const emptyField: PlayerField = {
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
};

const state: DuelState = {
  players: {
    P1: { lp: 8000, hand: [card], deck: [], field: emptyField, handPlayUsed: false },
    P2: { lp: 8000, hand: [], deck: [], field: emptyField, handPlayUsed: false },
  },
  activeField: null,
  activePlayer: "P1",
  turn: 2,
  phase: "main",
  seed: 1,
};

describe("useDuelInteraction", () => {
  it("dispatches one summon action after card, slot, zone and position are chosen", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useDuelInteraction({ state, isPlayerTurn: true, busy: false, dispatch }),
    );

    act(() => result.current.onSelectHandCard(0));
    act(() => result.current.onInvokeSlot("summon"));
    act(() => result.current.onZoneActivate({ player: "P1", zoneType: "monster", index: 2 }));
    act(() => result.current.onChoosePosition("attack_face_up"));

    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith({
      type: "summon_monster",
      player: "P1",
      handIndex: 0,
      zoneIndex: 2,
      position: "attack_face_up",
    });
    expect(result.current.intent).toEqual({ kind: "idle" });
  });

  it("cancels a selection without dispatching", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useDuelInteraction({ state, isPlayerTurn: true, busy: false, dispatch }),
    );

    act(() => result.current.onSelectHandCard(0));
    act(() => result.current.onInvokeSlot("cancel"));

    expect(dispatch).not.toHaveBeenCalled();
    expect(result.current.intent).toEqual({ kind: "idle" });
  });
});
