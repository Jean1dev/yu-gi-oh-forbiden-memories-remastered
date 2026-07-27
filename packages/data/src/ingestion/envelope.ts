import { z } from "zod";

/**
 * The **raw** shape of a card record as the source delivers it: every scalar
 * field arrives as a string, numeric ones included, and absence is signalled by
 * an empty string or by the textual sentinel `"Indisponível"`.
 *
 * Field names stay in Portuguese because they are the source file format.
 *
 * This schema exists only to fail loudly at the boundary
 * (TypeScript-development-guidelines.md §18.3). It never leaves
 * `packages/data/src/ingestion` — what leaves is `Card`, the canonical shape.
 */
export const SourceCardSchema = z.strictObject({
  id: z.number(),
  numero: z.string(),
  nome: z.string(),
  img: z.null(),
  classe: z.string(),
  atk: z.string(),
  def: z.string(),
  guardiao1: z.string(),
  guardiao2: z.string(),
  password: z.string(),
  estrelas: z.string(),
  tipo: z.string(),
});

export type SourceCard = z.infer<typeof SourceCardSchema>;

/**
 * Source envelope, discriminated by `success`. The 99 error files in the real
 * batch are the `success:false` branch — an expected path, not a failure.
 */
export const SourceEnvelopeSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), card: SourceCardSchema }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type SourceEnvelope = z.infer<typeof SourceEnvelopeSchema>;
