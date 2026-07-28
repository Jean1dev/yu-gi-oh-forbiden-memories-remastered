import type { CARD_TYPES, GUARDIAN_STARS } from "./constants.ts";

/** One of the five card types. */
export type CardType = (typeof CARD_TYPES)[number];

/** One of the ten Guardian Stars. */
export type GuardianStar = (typeof GUARDIAN_STARS)[number];

/**
 * Card identity within the collection: a string of exactly 3 digits
 * ("001".."722"). It keys every catalog index and the art manifest.
 */
export type CardNumber = string;

/**
 * The canonical card — the shape the whole monorepo consumes. Already
 * normalized: the source `{success, card}` envelope is gone, numeric fields are
 * coerced, and the textual absence sentinels are resolved to `null`.
 *
 * Field names stay in Portuguese because they are the source dataset format.
 *
 * `null` means "absent by design" and is semantically distinct from `0`: a trap
 * card has no ATK (`null`), while a monster may well have an ATK of `0`.
 */
export type Card = Readonly<{
  /** Integer >= 1, as provided by the source. */
  id: number;
  numero: CardNumber;
  nome: string;
  /**
   * Always `null`: the source carries no embedded art. Art is resolved by
   * `numero` through the manifest (F04).
   */
  img: null;
  /** Copied verbatim from the source, with no closed enum (spec F01, Decision 8). */
  classe: string;
  /** `null` = no applicable ATK. */
  atk: number | null;
  /** `null` = no applicable DEF. */
  def: number | null;
  /** `null` = card without a Guardian Star. */
  guardiao1: GuardianStar | null;
  guardiao2: GuardianStar | null;
  /** Format `NN NN NN NN`. `null` = card without a typeable password. */
  password: string | null;
  /** Price in stars. `null` = card cannot be bought. */
  estrelas: number | null;
  tipo: CardType;
}>;
