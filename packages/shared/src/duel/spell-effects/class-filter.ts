import type { Card } from "../../card/types.ts";
import type { CardClassFilter } from "./types.ts";

/**
 * True when `card` satisfies `filter`. Shared by the equip bonus and by every
 * field-sweeping effect, so the one place that knows what "of class X" means
 * is this function.
 */
export function matchesClassFilter(card: Card, filter: CardClassFilter): boolean {
  return filter.kind === "any" || card.classe === filter.classe;
}
