import type { CardNumber } from "@yugioh/shared";

/**
 * Opaque identifier of an NPC duelist. No roster of duelists exists yet —
 * Campanha/Free Duel own that contract when they get a spec of their own
 * (spec F08, Decision 1/2) — so this is only ever a non-empty string, never
 * validated against a closed set here.
 */
export type DuelistaId = string;

/**
 * One droppable card inside a duelist's pool. Field names stay in Portuguese
 * because this is the hand-authored source dataset format the data
 * maintainer edits directly (spec F08, Decision 4), the same rule that keeps
 * `Card`'s and `TerrainClassRule`'s fields in Portuguese.
 */
export type DropEntry = Readonly<{
  /** Must exist in the catalog (F03); enforced by `validateDropReferences`. */
  numero: CardNumber;
  /** Relative weight, finite and `> 0` — not normalized to sum to 1 per pool (spec F08, Decision 5). */
  probabilidade: number;
  /** Free text, no closed vocabulary. Absent = "no condition beyond winning" (spec F08, Decision 6). */
  condicao?: string | undefined;
}>;

/** One duelist's droppable pool. `duelista` is unique within the source file (spec F08, Decision 7). */
export type DropPool = Readonly<{
  duelista: DuelistaId;
  entradas: readonly DropEntry[];
}>;

/**
 * One `numero` referenced in a pool that does not exist in the catalog (F03).
 * `duelista`/`numero` stay Portuguese (they identify domain entities, same
 * convention as `TerrainClassViolation.terreno`/`.classe`); `code`/`message`
 * are the generic structural fields, kept English.
 */
export type DropViolation = Readonly<{
  duelista: DuelistaId;
  numero: CardNumber;
  code: "numero_dropavel_inexistente";
  message: string;
}>;

/**
 * The read-only, indexed drop table — mirrors `CardCatalog` (F03),
 * `FusionTable` (F05) and `TerrainClassTable` (F07): every method answers
 * from state built once at construction.
 *
 * `getPoolByDuelista` never throws and never returns `undefined` — a
 * duelist with no declared pool answers `[]`, the neutral behavior that
 * sustains an empty table while the real drop values remain pending
 * external data (spec F08, Decision 3).
 */
export type DropTable = Readonly<{
  getPoolByDuelista(duelista: DuelistaId): readonly DropEntry[];
  /** Alphabetical by `duelista`, deterministic regardless of source file order. */
  listDuelistasWithPool(): readonly DuelistaId[];
  listDropPools(): readonly DropPool[];
  countDropPools(): number;
}>;
