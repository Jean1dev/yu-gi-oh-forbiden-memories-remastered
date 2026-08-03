"use client";

import type { DuelAction, Phase } from "@yugioh/shared";
import { useEffect } from "react";

const AUTO_ADVANCE_PHASES = new Set<Phase>(["draw", "end"]);
const DEFAULT_AUTO_ADVANCE_DELAY_MS = 1000;

export type UseAutoAdvancePhaseInput = Readonly<{
  phase: Phase | null;
  active: boolean;
  dispatch: (action: DuelAction) => void;
  delayMs?: number | undefined;
}>;

/**
 * Drives the Draw and End phases forward on their own, so the player never
 * has to click "Passar Fase" just to let the engine pull a card (F07) or
 * close out the turn — those two phases have no player decision in them.
 * Main/Battle stay manual because summoning, spells and attacks live there.
 */
export function useAutoAdvancePhase({
  phase,
  active,
  dispatch,
  delayMs = DEFAULT_AUTO_ADVANCE_DELAY_MS,
}: UseAutoAdvancePhaseInput): void {
  useEffect(() => {
    if (!active || phase === null || !AUTO_ADVANCE_PHASES.has(phase)) return undefined;
    const timer = setTimeout(() => dispatch({ type: "advance_phase" }), delayMs);
    return () => clearTimeout(timer);
  }, [active, phase, dispatch, delayMs]);
}
