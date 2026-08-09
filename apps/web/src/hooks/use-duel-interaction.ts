"use client";

import {
  DUEL_STAT_COUNTERS,
  type DuelAction,
  type DuelState,
  type DuelStats,
  type MonsterPosition,
  type ZoneReference,
} from "@yugioh/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  describeActionSlots,
  describeAffordances,
  reduceIntent,
  zoneAffordance,
  type ActionSlotId,
  type DuelIntent,
} from "../lib/free-duel/duel-interaction.ts";

/**
 * Zeroed counters for the placeholder state below. Built locally rather than
 * imported from `@yugioh/engine`: this is a `"use client"` module, and only
 * `lib/free-duel/duel-runtime.ts` may reach the engine (free-duel/F09).
 */
function zeroStats(): DuelStats {
  return Object.fromEntries(DUEL_STAT_COUNTERS.map((counter) => [counter, 0])) as DuelStats;
}

const idleIntent: DuelIntent = { kind: "idle" };
const disabledAffordances = {
  canAct: false,
  canSummon: false,
  canPlaceSpell: false,
  canEquip: false,
  canActivateSpell: false,
  canPlayTerrain: false,
  canAttack: false,
  canDirectAttack: false,
  canChangePosition: false,
  canAdvancePhase: false,
} as const;

export function useDuelInteraction(input: {
  readonly state: DuelState | null;
  readonly isPlayerTurn: boolean;
  readonly busy: boolean;
  readonly dispatch: (action: DuelAction) => void;
}) {
  const { state, isPlayerTurn, busy, dispatch } = input;
  const [intent, setIntent] = useState<DuelIntent>(idleIntent);

  useEffect(() => {
    if (state === null || !isPlayerTurn) setIntent(idleIntent);
  }, [isPlayerTurn, state]);

  const affordances = useMemo(
    () =>
      state
        ? describeAffordances({ state, isPlayerTurn, busy, intent })
        : disabledAffordances,
    [busy, intent, isPlayerTurn, state],
  );

  const slots = useMemo(
    () => (state ? describeActionSlots({ intent, state }, affordances) : describeActionSlots({ intent, state: emptyDuelState }, disabledAffordances)),
    [affordances, intent, state],
  );

  const applyEvent = useCallback(
    (event: Parameters<typeof reduceIntent>[1]) => {
      if (!state) return;
      const next = reduceIntent(intent, event, state);
      setIntent(next.intent);
      if (next.action) dispatch(next.action);
    },
    [dispatch, intent, state],
  );

  const reset = useCallback(() => setIntent(idleIntent), []);

  return {
    intent,
    slots,
    affordanceFor: useCallback(
      (reference: ZoneReference) => (state ? zoneAffordance(state, intent, reference) : "idle"),
      [intent, state],
    ),
    onZoneActivate: useCallback(
      (reference: ZoneReference) => applyEvent({ type: "activate_zone", reference }),
      [applyEvent],
    ),
    onSelectHandCard: useCallback(
      (handIndex: number) => applyEvent({ type: "select_hand_card", handIndex }),
      [applyEvent],
    ),
    onChoosePosition: useCallback(
      (position: MonsterPosition) => applyEvent({ type: "choose_position", position }),
      [applyEvent],
    ),
    onInvokeSlot: useCallback((id: ActionSlotId) => applyEvent({ type: "invoke_slot", id }), [applyEvent]),
    reset,
  } as const;
}

const emptyDuelState: DuelState = {
  players: {
    P1: {
      lp: 0,
      hand: [],
      deck: [],
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
      lp: 0,
      hand: [],
      deck: [],
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
  activePlayer: "P1",
  turn: 1,
  phase: "main",
  seed: 0,
  stats: { P1: zeroStats(), P2: zeroStats() },
};
