import type { SummonMonsterAction } from "./summon-monster-action.ts";

/**
 * The union of every action a player (or the system) can submit to the
 * engine's `apply` dispatcher (`docs/arquitetura.md` §3.1). Starts with a
 * single variant; motor-duelo-1x1 F07-F12 each add their own variant to this
 * same union, never redefining it (same additive discipline as `DuelState`
 * across F01-F05).
 */
export type AdvancePhaseAction = Readonly<{ type: "advance_phase" }>;

export type Action = AdvancePhaseAction | SummonMonsterAction;
