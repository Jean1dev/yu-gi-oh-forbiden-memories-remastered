import type { ArtReference, CardArtLookup, CardNumber, ObtainedArtReference } from "@yugioh/shared";

/**
 * Decides between the three art situations of a Library entry (spec
 * library/F01, Decision 3). A not-obtained card never reaches `artLookup` —
 * there is no path to resolve for a card that must not reveal its art, so
 * skipping the call is the enforcement, not an optimization.
 *
 * Overloaded on the literal `obtained` argument so a caller that already
 * knows which branch it is in (e.g. {@link buildLibraryIndex}) gets back the
 * narrower {@link ObtainedArtReference} instead of the full three-case union.
 */
export function resolveArtReference(
  cardNumber: CardNumber,
  obtained: true,
  artLookup: CardArtLookup,
): ObtainedArtReference;
export function resolveArtReference(
  cardNumber: CardNumber,
  obtained: false,
  artLookup: CardArtLookup,
): Readonly<{ kind: "silhouette" }>;
export function resolveArtReference(
  cardNumber: CardNumber,
  obtained: boolean,
  artLookup: CardArtLookup,
): ArtReference;
export function resolveArtReference(
  cardNumber: CardNumber,
  obtained: boolean,
  artLookup: CardArtLookup,
): ArtReference {
  if (!obtained) {
    return Object.freeze({ kind: "silhouette" as const });
  }
  return artLookup(cardNumber);
}
