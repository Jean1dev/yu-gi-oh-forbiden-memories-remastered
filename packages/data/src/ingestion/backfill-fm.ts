import type { CardNumber } from "@yugioh/shared";

import type { CardEnrichmentEntry, CardEnrichmentTable } from "./enrichment.ts";

/**
 * One `cardinfo` row of the original game's datamine, reduced to the columns
 * the backfill reads. The adapter in `scripts/backfill-fm-enrichment.ts`
 * supplies these; nothing here touches SQLite or the filesystem.
 */
export type FmCardInfo = Readonly<{
  /** `"Magic"`, `"Equip"`, `"Trap"`, `"Ritual"`, or a monster class. */
  Type: string | null;
  Attribute: string | null;
  Level: number | null;
  Description: string | null;
}>;

/** The source's `Type` values that this project treats as `magica`/`equipamento`. */
const SPELL_SOURCE_TYPES: ReadonlySet<string> = new Set(["Magic", "Equip"]);

/**
 * The PS1 text wraps by inserting blank lines, so a description arrives as
 * `"A delicious\n\nbeef curry increases\n\nLife Points by 200!"`. The card
 * frame lays out its own paragraph, so collapse it back to one line.
 */
export function normalizeFmDescription(description: string): string {
  return description.replace(/\s+/g, " ").trim();
}

/** `"Light"` in the source, `"LIGHT"` in `CARD_ATTRIBUTES`. */
function normalizeAttribute(attribute: string): CardEnrichmentEntry["atributo"] {
  return attribute.toUpperCase() as CardEnrichmentEntry["atributo"];
}

export type BackfillReport = Readonly<{
  entriesCreated: readonly CardNumber[];
  attributesFilled: readonly CardNumber[];
  descriptionsReplaced: readonly CardNumber[];
}>;

/**
 * Merges what only the original game knows into the enrichment table, and
 * reports what changed.
 *
 * Two independent gaps, both closed from the same source:
 *
 * 1. 23 monsters carry no `atributo` — the fusion/ritual-only ones (Blue-eyes
 *    Ultimate Dragon, Meteor B. Dragon, Gate Guardian…) whose names
 *    YGOPRODeck's matcher never resolved.
 * 2. The magic/equip cards describe the TCG effect, not this game's. After
 *    `spells/F02` the resolved effect is the original's — 343 Sparks deals 50,
 *    not 200 — and `spell-trap-card-frame.tsx` renders `descricao`, so leaving
 *    the TCG text would make the card lie about what it does.
 *
 * ## The rule about `descricao`: replace, never introduce
 *
 * `checkCardFrameCoverage` treats `descricao !== null` as *the* flag for "this
 * card renders through `CardFrame`", and pairs it with the crop art: text
 * without crop art is reported as `inconsistent` and fails the ingestion. The
 * cards missing from the table are exactly the ones still on the legacy-art
 * path, and their legacy art is a scan of the original card, which already
 * carries the original text. So a `descricao` is only ever **replaced**, never
 * introduced, which leaves the migrated/legacy partition untouched. `atributo`
 * and `nivel` are free of that constraint — no rendering path keys on them.
 *
 * Monster flavour text that already exists is left alone: it makes no
 * mechanical claim, so there is nothing for it to contradict.
 */
export function backfillEnrichment(
  table: CardEnrichmentTable,
  cardInfo: ReadonlyMap<CardNumber, FmCardInfo>,
): Readonly<{ table: CardEnrichmentTable; report: BackfillReport }> {
  const patched: Record<CardNumber, CardEnrichmentEntry> = { ...table };
  const entriesCreated: CardNumber[] = [];
  const attributesFilled: CardNumber[] = [];
  const descriptionsReplaced: CardNumber[] = [];

  for (const [numero, row] of cardInfo) {
    const existing = patched[numero];

    if (existing === undefined) {
      // Worth an entry only for what the source can actually contribute here,
      // which is the attribute — the description would break coverage.
      if (row.Attribute === null) continue;
      patched[numero] = {
        atributo: normalizeAttribute(row.Attribute),
        nivel: row.Level,
        descricao: null,
      };
      entriesCreated.push(numero);
      continue;
    }

    let entry = existing;

    if (entry.atributo === null && row.Attribute !== null) {
      entry = {
        ...entry,
        atributo: normalizeAttribute(row.Attribute),
        nivel: entry.nivel ?? row.Level,
      };
      attributesFilled.push(numero);
    }

    if (
      entry.descricao !== null &&
      row.Type !== null &&
      SPELL_SOURCE_TYPES.has(row.Type) &&
      row.Description !== null
    ) {
      const descricao = normalizeFmDescription(row.Description);
      if (descricao !== entry.descricao) {
        entry = { ...entry, descricao };
        descriptionsReplaced.push(numero);
      }
    }

    patched[numero] = entry;
  }

  return {
    table: patched,
    report: { entriesCreated, attributesFilled, descriptionsReplaced },
  };
}
