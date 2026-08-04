import {
  AttributeSchema,
  DomainError,
  err,
  ok,
  type CardNumber,
  type CardType,
  type Result,
} from "@yugioh/shared";

import type { YgoprodeckCardResponse, YgoprodeckMatch } from "./types.ts";

/**
 * Maps one already-validated YGOPRODeck record to the local shape.
 *
 * Pure and total: nothing here calls `fetch` or touches the filesystem, so it
 * is testable without the network (spec F02, Design Técnico §"Determinismo").
 *
 * `nivel` is decided by the *local* `tipo`, never trusted from the API alone
 * (spec F02, Decision 4) — the invariant `CardSchema` enforces (nivel only on
 * `monstro`) must hold regardless of what the API happens to send.
 */
export function parseYgoprodeckMatch(
  numero: CardNumber,
  tipo: CardType,
  response: YgoprodeckCardResponse,
): Result<YgoprodeckMatch, DomainError> {
  const firstImage = response.card_images[0];
  if (firstImage === undefined) {
    return err(
      new DomainError(`response for ${numero} has no card_images`, "invalid_response", {
        numero,
      }),
    );
  }

  const attributeCandidate = AttributeSchema.safeParse(response.attribute);
  const atributo = attributeCandidate.success ? attributeCandidate.data : null;
  const nivel = tipo === "monstro" ? (response.level ?? null) : null;

  return ok({
    numero,
    atributo,
    nivel,
    descricao: response.desc,
    artCropUrl: firstImage.image_url_cropped,
  });
}
