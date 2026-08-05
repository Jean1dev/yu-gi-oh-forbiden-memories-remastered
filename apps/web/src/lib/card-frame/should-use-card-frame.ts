import type { ArtReference, Card } from "@yugioh/shared";

/**
 * Decides `CardFrame` vs. the legacy full-card image (spec F06, Decision 1).
 *
 * `card.descricao` is the enrichment signal: `renderizacao-cartas/F01`'s
 * merge always sets `atributo`/`nivel`/`descricao` together, so a non-null
 * `descricao` means the other two are trustworthy too. Checking both the art
 * *and* the data keeps a card that somehow has one without the other (should
 * never happen, given how F01/F02/F03 write these files) on the safe,
 * already-working legacy path instead of rendering a half-built `CardFrame`.
 */
export function shouldUseCardFrame(card: Card, cropArt: ArtReference | undefined): boolean {
  return cropArt !== undefined && cropArt.kind === "art" && card.descricao !== null && card.descricao !== undefined;
}
