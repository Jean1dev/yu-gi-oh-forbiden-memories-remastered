import type {
  DuelAction,
  DuelSession,
  PlayerId,
  SurrenderAction as EngineSurrenderAction,
} from "@yugioh/shared";
import {
  interruptDuelSession,
  type ApplyAction,
} from "./duel-session.ts";

export type SurrenderAction = EngineSurrenderAction;

export function canSurrender(session: DuelSession): session is Extract<
  DuelSession,
  { status: "in_progress" }
> {
  return session.status === "in_progress";
}

export function createSurrenderAction(playerId: PlayerId): SurrenderAction {
  return { type: "surrender", player: playerId };
}

export function surrender(
  session: DuelSession,
  playerId: PlayerId,
  dependencies: Readonly<{ apply: ApplyAction }>,
): DuelSession {
  if (!canSurrender(session)) return session;

  return interruptDuelSession(
    session,
    createSurrenderAction(playerId) satisfies DuelAction,
    dependencies,
  );
}
