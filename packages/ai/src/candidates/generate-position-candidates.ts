import type { DuelAction } from "@yugioh/shared";
import { ZONE_INDICES } from "./constants.ts";
import type { PlayerView } from "./player-view.ts";

export function generatePositionCandidates(view: PlayerView): readonly DuelAction[] {
  return ZONE_INDICES.flatMap((index) =>
    view.self.field.monsters[index].occupied
      ? [
          {
            type: "change_position",
            zone: { player: view.selfPlayerId, zoneType: "monster", index },
          } as const,
        ]
      : [],
  );
}
