import { serializeCollection } from "@yugioh/rules";
import { ok, type DeckComposition, type DomainError, type Result } from "@yugioh/shared";
import type { ActiveDeckRepository } from "../active-deck/supabase-repository.ts";

export type DuelActiveDeckRepository = Readonly<{
  read(
    playerId: string,
  ): Promise<Result<{ composition: DeckComposition; updatedAt: string } | undefined, DomainError>>;
}>;

export function createDuelActiveDeckRepository(
  repository: ActiveDeckRepository,
): DuelActiveDeckRepository {
  return {
    async read(playerId) {
      const result = await repository.readActiveDeck(playerId);
      if (!result.ok) return result;
      if (result.value === undefined) return ok(undefined);
      return ok({
        ...result.value,
        composition: serializeCollection(result.value.composition),
      });
    },
  };
}
