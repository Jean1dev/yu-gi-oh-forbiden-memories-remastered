import type { Card, CardNumber, CardType, GuardianStar } from "@yugioh/shared";

import type { CatalogIndexes } from "./types.ts";

/**
 * Groups a card under a key, opening the bucket on first use.
 *
 * Buckets are filled in `numero` order because the caller walks the cards in
 * that order, which is what makes the lists deterministic without a second
 * sort per bucket.
 */
function pushInto<K>(index: Map<K, Card[]>, key: K, card: Card): void {
  const bucket = index.get(key);
  if (bucket === undefined) {
    index.set(key, [card]);
    return;
  }
  bucket.push(card);
}

/**
 * Seals the buckets. The arrays leave this module straight into consumer hands,
 * so they are frozen here rather than trusted to stay untouched.
 */
function sealBuckets<K>(index: Map<K, Card[]>): ReadonlyMap<K, readonly Card[]> {
  const sealed = new Map<K, readonly Card[]>();
  for (const [key, bucket] of index) {
    sealed.set(key, Object.freeze(bucket));
  }
  return sealed;
}

/**
 * Builds the five catalog indexes in a single pass over the cards.
 *
 * The input is sorted first rather than assumed sorted: F01 does emit the
 * dataset ascending by `numero`, but the catalog's answers must not depend on
 * that promise being kept by whoever hands the cards over — the same set of
 * cards in any order must produce byte-identical lists (spec F03, Decision 7).
 *
 * A card with two distinct Guardian Stars is listed under both; a card that
 * repeats the same star is listed once, because `listByGuardiao` answers "which
 * cards carry this star", not "how many slots hold it". Cards without a
 * password stay out of `byPassword` entirely, so a lookup can never match on
 * absence.
 */
export function buildIndexes(cards: readonly Card[]): CatalogIndexes {
  const ordered = [...cards].sort((left, right) => left.numero.localeCompare(right.numero));

  const byNumero = new Map<CardNumber, Card>();
  const byTipo = new Map<CardType, Card[]>();
  const byClasse = new Map<string, Card[]>();
  const byGuardiao = new Map<GuardianStar, Card[]>();
  const byPassword = new Map<string, Card>();

  for (const card of ordered) {
    byNumero.set(card.numero, card);
    pushInto(byTipo, card.tipo, card);
    pushInto(byClasse, card.classe, card);

    if (card.guardiao1 !== null) {
      pushInto(byGuardiao, card.guardiao1, card);
    }
    if (card.guardiao2 !== null && card.guardiao2 !== card.guardiao1) {
      pushInto(byGuardiao, card.guardiao2, card);
    }

    if (card.password !== null) {
      byPassword.set(card.password, card);
    }
  }

  return Object.freeze({
    byNumero,
    byTipo: sealBuckets(byTipo),
    byClasse: sealBuckets(byClasse),
    byGuardiao: sealBuckets(byGuardiao),
    byPassword,
  });
}
