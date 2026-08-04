import {
  AttributeSchema,
  CardNumberSchema,
  CardSchema,
  DomainError,
  err,
  ok,
  type Card,
  type CardNumber,
  type Result,
} from "@yugioh/shared";
import { z } from "zod";

/**
 * One card's worth of external enrichment data — the fields `CardSchema`
 * cannot get from the source dataset (spec `renderizacao-cartas/F01`,
 * Decision 1). Produced by `renderizacao-cartas/F02`, consumed here.
 */
export const CardEnrichmentEntrySchema = z.strictObject({
  atributo: AttributeSchema.nullable(),
  nivel: z.number().int().nullable(),
  descricao: z.string().min(1).nullable(),
});

export type CardEnrichmentEntry = z.infer<typeof CardEnrichmentEntrySchema>;

/**
 * Contract of `cards-data/enriquecimento-ygoprodeck.json` when read back
 * from disk: a sparse map, keyed by `numero`, covering only the cards a run of
 * F02/F07 has enriched so far. An absent key is a valid, expected state — not
 * every card has to be present (spec F01, Decisions 1 and 4).
 */
export const CardEnrichmentTableSchema = z.record(CardNumberSchema, CardEnrichmentEntrySchema);

export type CardEnrichmentTable = Readonly<Record<CardNumber, CardEnrichmentEntry>>;

/**
 * Merges one enrichment entry into an already-normalized card, revalidating
 * the result against `CardSchema` (spec F01, Design Técnico §3).
 *
 * Pure and total: a `numero` absent from the table is not an error — it is
 * the expected state for every card outside the current rollout batch, so the
 * card comes back unchanged. An entry that would violate the schema (e.g.
 * `nivel` on a non-monster) is also not fatal to the batch: it is reported and
 * the card is returned unchanged, exactly like a missing entry (spec F01 §6).
 */
export function applyEnrichment(
  card: Card,
  table: CardEnrichmentTable,
): Result<Card, DomainError> {
  const entry = table[card.numero];
  if (entry === undefined) {
    return ok(card);
  }

  const candidate = {
    ...card,
    atributo: entry.atributo,
    nivel: entry.nivel,
    descricao: entry.descricao,
  };

  const validated = CardSchema.safeParse(candidate);
  if (!validated.success) {
    const details = validated.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ");
    return err(
      new DomainError(
        `enrichment entry for ${card.numero} does not match the canonical schema: ${details}`,
        "invalid_enrichment_entry",
        { numero: card.numero },
      ),
    );
  }

  return ok(validated.data);
}
