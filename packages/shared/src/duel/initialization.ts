import type { Card } from "../card/types.ts";
import type { PlayerId } from "./player.ts";

/**
 * One player's side of the duel, already validated and resolved to full
 * cards — always exactly 40 entries, in the deterministic `numero`-ascending
 * order that deck expansion produces. Not yet shuffled.
 */
export type InitializationPlayerInput = Readonly<{
  cards: readonly Card[];
}>;

/**
 * The sole input `initDuel` accepts. By construction it is only ever produced
 * by `buildInitializationInput` (`@yugioh/engine`), so it is always valid —
 * `initDuel` itself has no failure path.
 */
export type InitializationInput = Readonly<{
  players: Readonly<Record<PlayerId, InitializationPlayerInput>>;
  seed: number;
}>;
