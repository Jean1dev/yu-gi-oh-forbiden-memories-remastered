import type { DuelAction, DuelSession, PlayerId } from "@yugioh/shared";
import {
  interruptDuelSession,
  type ApplyAction,
} from "./duel-session.ts";

export type SurrenderAction = Readonly<{
  type: "surrender";
  playerId: PlayerId;
}>;

export function canSurrender(session: DuelSession): session is Extract<
  DuelSession,
  { status: "in_progress" }
> {
  return session.status === "in_progress";
}

export function createSurrenderAction(playerId: PlayerId): SurrenderAction {
  return { type: "surrender", playerId };
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
