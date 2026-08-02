import type { Action } from "./action.ts";
import type { DeckComposition } from "../deck/types.ts";
import type { DifficultyProfile, DuelistId } from "../duelist/types.ts";
import type { DuelState, PublicDuelState } from "./types.ts";
import type { PlayerId } from "./player.ts";

export const ORCHESTRATION_ERROR_CODES = [
  "deck_rejected_by_engine",
  "ai_unavailable",
  "no_progress_loop",
] as const;

export type OrchestrationFailureReason = (typeof ORCHESTRATION_ERROR_CODES)[number];

/**
 * The engine's action vocabulary, closed by motor-duelo-1x1/F12 — the last
 * feature to add a variant. Was `unknown` while F06-F12 were still landing.
 */
export type DuelAction = Action;

export type AiAgent = Readonly<{
  decide(state: PublicDuelState, profile: DifficultyProfile): Promise<DuelAction>;
}>;

export type GetPublicDuelState = (state: DuelState, forPlayer: PlayerId) => PublicDuelState;

export type MatchOrchestrationInput = Readonly<{
  duelistId: DuelistId;
  playerComposition: DeckComposition;
  cpuComposition: DeckComposition;
  seed?: number | undefined;
}>;

export type DuelSession =
  | Readonly<{ status: "not_started" }>
  | Readonly<{
      status: "in_progress";
      duelSessionId: string;
      duelistId: DuelistId;
      state: DuelState;
      currentDecider: PlayerId;
    }>
  | Readonly<{
      status: "ended";
      duelSessionId: string;
      duelistId: DuelistId;
      finalState: DuelState;
    }>
  | Readonly<{
      status: "failed";
      duelSessionId: string;
      duelistId: DuelistId;
      reason: OrchestrationFailureReason;
    }>;
