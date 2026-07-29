import type { DeckComposition } from "@yugioh/shared";
import type { ActiveDeckCache } from "../active-deck/cache.ts";

export type DuelActiveDeckCache = Readonly<{
  read(
    playerId: string,
  ): Promise<Readonly<{ composition: DeckComposition; updatedAt: string }> | undefined>;
}>;

export function createDuelActiveDeckCache(cache: ActiveDeckCache): DuelActiveDeckCache {
  return {
    async read(playerId) {
      const record = await cache.read(playerId);
      return record === undefined
        ? undefined
        : { composition: record.cards, updatedAt: record.updatedAt };
    },
  };
}
