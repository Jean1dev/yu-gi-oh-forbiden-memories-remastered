import type { PlayerId, PublicDuelState, PublicPlayerState } from "@yugioh/shared";

export type PlayerView = Readonly<{
  selfPlayerId: PlayerId;
  opponentPlayerId: PlayerId;
  self: PublicPlayerState;
  opponent: PublicPlayerState;
}>;

export function resolvePlayerView(state: PublicDuelState, player: PlayerId): PlayerView {
  const opponentPlayerId: PlayerId = player === "P1" ? "P2" : "P1";
  return {
    selfPlayerId: player,
    opponentPlayerId,
    self: state.players[player],
    opponent: state.players[opponentPlayerId],
  };
}
