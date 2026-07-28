import {
  CARD_TYPES,
  CardPasswordSchema,
  DomainError,
  err,
  ok,
  type Card,
  type CardType,
  type DatasetSeal,
  type Result,
} from "@yugioh/shared";

import type { ArtManifest } from "../ingestion/art-manifest.ts";
import { reparseCards } from "../validation/reparse-cards.ts";
import { buildIndexes } from "./indexes.ts";
import {
  PASSWORD_INVALID_FORMAT,
  PASSWORD_NOT_FOUND,
  passwordFound,
  type CardCatalog,
  type CatalogIndexes,
} from "./types.ts";

export type CatalogInput = Readonly<{
  /** `JSON.parse` of `cards.json`, still untrusted. */
  rawCards: unknown;
  manifest: ArtManifest;
  /** F02's verdict. Without a valid one there is no catalog at all. */
  seal: DatasetSeal;
}>;

/** Shared answer for every key with no cards, so callers never see `undefined`. */
const NO_CARDS: readonly Card[] = Object.freeze([]);

/**
 * Counts per type, all five keys present. A type nobody carries reads as `0`
 * instead of missing, so a consumer never has to tell "none" from "unknown".
 */
function countByTipo(indexes: CatalogIndexes): Readonly<Record<CardType, number>> {
  const counts = Object.fromEntries(
    CARD_TYPES.map((tipo) => [tipo, indexes.byTipo.get(tipo)?.length ?? 0]),
  ) as Record<CardType, number>;
  return Object.freeze(counts);
}

/**
 * Counts per class. Unlike types, the keys are only the classes the dataset
 * actually holds: `classe` is a free string, not a closed vocabulary
 * (spec F01, Decision 8).
 */
function countByClasse(indexes: CatalogIndexes): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const [classe, cards] of indexes.byClasse) {
    counts[classe] = cards.length;
  }
  return Object.freeze(counts);
}

/**
 * Builds the read-only card catalog from already-read artifacts.
 *
 * Two refusals, both total. A dataset F02 did not seal as valid never gets an
 * index built for it — the service does not come up degraded, it does not come
 * up at all (PRD F03 Error Handling). And a sealed dataset whose cards no
 * longer match the canonical schema is refused just as hard: `generated/` is
 * not versioned and can be edited after sealing, so a late inconsistency means
 * the seal is lying, and serving the subset that still parses would hide that
 * behind 700-odd cards that happen to work (spec F03, Decision 3).
 *
 * That is the one place F03 differs from F02 on purpose: the gate accumulates
 * violations to describe them, the catalog stops at the first sign the dataset
 * is not what it was sealed as.
 *
 * Everything the catalog hands out is frozen — each card, each list, the
 * manifest and the catalog object itself — so "immutable during the session"
 * is enforced by the runtime rather than promised by the type
 * (spec F03, Decision 6).
 */
export function createCatalog(input: CatalogInput): Result<CardCatalog, DomainError> {
  if (!input.seal.valid) {
    return err(
      new DomainError(
        "Catalog unavailable: the dataset is invalid or missing.",
        "catalog_unavailable",
        { sealedAt: input.seal.generatedAt },
      ),
    );
  }

  const { cards, violations } = reparseCards(input.rawCards);
  if (violations.length > 0) {
    return err(
      new DomainError(
        "Catalog unavailable: the sealed dataset no longer matches the canonical schema.",
        "dataset_inconsistent_with_seal",
        {
          offending: violations.length,
          numeros: violations.map((violation) => violation.numero ?? null),
        },
      ),
    );
  }

  const indexes = buildIndexes(cards.map((card) => Object.freeze(card)));
  const manifest: ArtManifest = Object.freeze({ ...input.manifest });
  const total = cards.length;
  const perTipo = countByTipo(indexes);
  const perClasse = countByClasse(indexes);

  const catalog: CardCatalog = {
    getByNumero(numero) {
      return indexes.byNumero.get(numero);
    },
    listByTipo(tipo) {
      return indexes.byTipo.get(tipo) ?? NO_CARDS;
    },
    listByClasse(classe) {
      return indexes.byClasse.get(classe) ?? NO_CARDS;
    },
    listByGuardiao(guardiao) {
      return indexes.byGuardiao.get(guardiao) ?? NO_CARDS;
    },
    findByPassword(password) {
      // A string that is not a password at all never reaches the index: the
      // format is the cheap check, and the PRD asks for the two failures to
      // stay distinguishable.
      if (!CardPasswordSchema.safeParse(password).success) {
        return PASSWORD_INVALID_FORMAT;
      }
      const card = indexes.byPassword.get(password);
      return card === undefined ? PASSWORD_NOT_FOUND : passwordFound(card);
    },
    totalCount() {
      return total;
    },
    countByTipo() {
      return perTipo;
    },
    countByClasse() {
      return perClasse;
    },
    getArtManifest() {
      return manifest;
    },
  };

  return ok(Object.freeze(catalog));
}
