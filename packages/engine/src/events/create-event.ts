import type { Card, DuelEvent, EventType, JsonValue, PlayerId, ZoneReference } from "@yugioh/shared";

/**
 * Minimum information needed to build a `DuelEvent`. Omitted fields are filled
 * with their neutral value by `createEvent` — never left `undefined`.
 */
export type CreateEventInput = Readonly<{
  type: EventType;
  originPlayer: PlayerId;
  involvedCards?: readonly Card[];
  involvedZones?: readonly ZoneReference[];
  context?: Record<string, JsonValue>;
}>;

/**
 * Pure constructor of a well-formed `DuelEvent`. Does not validate the result
 * against `DuelEventSchema` — it trusts the caller's typing. Boundary
 * validation (e.g. an event deserialized from a network message) is a
 * separate concern for whoever crosses that boundary.
 */
export function createEvent(input: CreateEventInput): DuelEvent {
  return {
    type: input.type,
    originPlayer: input.originPlayer,
    involvedCards: input.involvedCards ?? [],
    involvedZones: input.involvedZones ?? [],
    context: input.context ?? {},
  };
}
