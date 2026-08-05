import type { Attribute, CardNumber } from "@yugioh/shared";
import { z } from "zod";

/**
 * Only the fields this project reads from a YGOPRODeck `cardinfo.php` record.
 * The real response carries many more (card sets, prices, banlist status...)
 * that nothing here needs, so they are left unvalidated rather than mirrored.
 */
export const YgoprodeckCardResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  attribute: z.string().optional(),
  level: z.number().int().optional(),
  desc: z.string(),
  card_images: z.array(z.object({ image_url_cropped: z.string().url() })).min(1),
});

export type YgoprodeckCardResponse = z.infer<typeof YgoprodeckCardResponseSchema>;

export const YgoprodeckApiResponseSchema = z.object({
  data: z.array(YgoprodeckCardResponseSchema).optional(),
});

/** The subset of a matched card this feature needs, already mapped to local vocabulary. */
export type YgoprodeckMatch = Readonly<{
  numero: CardNumber;
  atributo: Attribute | null;
  nivel: number | null;
  descricao: string;
  artCropUrl: string;
}>;

/** Why a card was not matched — reported, never silently dropped (spec F02 §6). */
export type UnmatchedReason =
  | "no_password_no_override"
  | "not_found"
  | "ambiguous"
  | "http_error"
  | "invalid_response";

export type MatchOutcome =
  | Readonly<{ kind: "matched"; match: YgoprodeckMatch }>
  | Readonly<{ kind: "unmatched"; numero: CardNumber; reason: UnmatchedReason; detail?: string }>;
