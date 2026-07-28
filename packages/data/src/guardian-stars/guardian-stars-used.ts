import { GUARDIAN_STARS, type GuardianStar } from "@yugioh/shared";

import type { CardCatalog } from "../catalog/types.ts";

/**
 * Derives the Guardian Stars actually used by the catalog, in `GUARDIAN_STARS`
 * order.
 *
 * `GUARDIAN_STARS` is only the universe to search — never the expected
 * coverage set on its own: if a future dataset dropped a Guardian Star, the
 * set this returns would shrink with it, with no code to edit (spec F06,
 * Decision 6).
 */
export function getUsedGuardianStars(catalog: CardCatalog): readonly GuardianStar[] {
  return Object.freeze(
    GUARDIAN_STARS.filter((guardiao) => catalog.listByGuardiao(guardiao).length > 0),
  );
}
