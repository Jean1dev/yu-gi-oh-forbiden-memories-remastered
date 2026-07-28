import type { Card } from "../card/types.ts";
import type { EVENT_TYPES } from "./constants.ts";
import type { PlayerId } from "./player.ts";

/**
 * One of the ten duel trigger events (`EVENT_TYPES`). Names stay in English
 * exactly as they appear in the PRD and in `docs/arquitetura.md` §3.3, even
 * though the rest of the domain is named in Portuguese in the product
 * documentation.
 */
export type EventType = (typeof EVENT_TYPES)[number];

/** Which of a player's two zone tuples (`monsters` or `spells`) a `ZoneReference` points to. */
export type ZoneType = "monster" | "spell";

/** A zone's position within its 5-slot tuple. Closed union, not `number`. */
export type ZoneIndex = 0 | 1 | 2 | 3 | 4;

/** Points at one of a player's ten field zones without duplicating the card there. */
export type ZoneReference = Readonly<{
  player: PlayerId;
  zoneType: ZoneType;
  index: ZoneIndex;
}>;

/**
 * Any value serializable as JSON. Keeps `DuelEvent.context` free of functions,
 * `undefined`, `Map`/`Set` or unserialized dates.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** One occurrence of a duel trigger, ready to be consumed by the Effect System (cross-PRD). */
export type DuelEvent = Readonly<{
  type: EventType;
  /** The player whose action triggered the event — not necessarily the owner of the affected card/zone. */
  originPlayer: PlayerId;
  involvedCards: readonly Card[];
  involvedZones: readonly ZoneReference[];
  /** Free-form supplemental data; each emitting feature decides what to include. */
  context: Record<string, JsonValue>;
}>;

/**
 * A suspended reaction window: the engine pauses one action's flow, publishes
 * `event`, and waits for the Effect System (cross-PRD) to resolve 0..N
 * reactions before the orchestrator calls `closeReactionWindow`.
 *
 * `type` is a single literal today, but keeps the shape ready for other kinds
 * of suspended state later without breaking a `pending.type === "reaction_window"` check.
 */
export type ReactionWindow = Readonly<{
  type: "reaction_window";
  event: DuelEvent;
  reactingPlayer: PlayerId;
}>;
