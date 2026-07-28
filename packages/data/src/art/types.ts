import type { Card, CardNumber } from "@yugioh/shared";

/**
 * Resolved reference to a card's art. `caminho` is always a usable value in
 * both branches — never empty — so a consumer never has to branch on `tipo`
 * before rendering (spec F04, Decision 4).
 *
 * The field names `tipo`/`caminho` and the `"arte"`/`"placeholder"` values are
 * kept exactly as the spec defines them on purpose: `library/F01` already
 * assumed a provisional interface with these same names before this feature
 * existed, and this shape is a structural superset of it (spec F04,
 * Decision 5).
 */
export type ResolvedArtReference = Readonly<{
  numero: CardNumber;
  tipo: "arte" | "placeholder";
  caminho: string;
}>;

/** Injectable capability, same spirit as `CardCatalog` (spec F04, Section 3). */
export interface ArtResolver {
  resolve(entrada: Card | CardNumber): ResolvedArtReference;
}
