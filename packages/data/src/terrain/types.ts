/**
 * The four buckets a terrain↔class matrix violation can fall into. The values
 * stay in Portuguese for the same reason `ValidationViolation.category`
 * (banco-de-cartas/F02) and `VIOLATION_CATEGORIES` do: they name the PRD's own
 * vocabulary for the mechanic (`terreno`, `classe`), not an internal label.
 */
export const TERRAIN_VIOLATION_CATEGORIES = [
  "estrutura",
  "terreno_duplicado",
  "classe_contraditoria",
  "classe_desconhecida",
] as const;

export type TerrainViolationCategory = (typeof TERRAIN_VIOLATION_CATEGORIES)[number];

/**
 * One terrain's entry in the hand-authored matrix source. Field names stay in
 * Portuguese because this is the format the data maintainer edits directly
 * (spec F07, Decision 4), the same rule that keeps `GuardianMatrixEntry`'s
 * fields in Portuguese.
 *
 * No class may appear in both `classesFortalecidas` and `classesEnfraquecidas`
 * of the same entry (spec F07, Decision 5) — enforced by
 * `detectContradictoryClass`, not by the shape itself.
 */
export type TerrainClassRule = Readonly<{
  terreno: string;
  classesFortalecidas: readonly string[];
  classesEnfraquecidas: readonly string[];
  /** Integer >= 0. Direction never lives here — only which list a class is in. */
  magnitudeFortalecimento: number;
  /** Integer >= 0, applied as a subtraction by the consumer (spec F07, Decision 4). */
  magnitudeEnfraquecimento: number;
}>;

/**
 * One rule broken by the matrix source, same shape convention as
 * `ValidationViolation` (F02): `code` is the stable identifier tests assert
 * on, `message` is for humans. `terreno`/`classe` are omitted entirely (never
 * set to `undefined`) when a violation is not about a specific one.
 */
export type TerrainClassViolation = Readonly<{
  category: TerrainViolationCategory;
  terreno?: string;
  classe?: string;
  code: string;
  message: string;
}>;

/**
 * Coverage evidence for the data maintainer — same spirit as F06's
 * `GuardianCoverageReport`, but informational only: incompleteness never
 * blocks the build (spec F07, Decision 6).
 */
export type TerrainClassCoverageReport = Readonly<{
  /** Monster classes observed in the catalog via `deriveKnownMonsterClasses`. */
  totalKnownClasses: number;
  /** Subset that appears in at least one entry, strengthened or weakened. */
  totalCoveredClasses: number;
  /** Alphabetically sorted complement — the expected state while empty. */
  classesWithoutCoverage: readonly string[];
}>;

/**
 * Outcome of one (terreno, classe) query. Total: `classificarClasseInTerreno`
 * never throws, so `magnitude` is always defined (`0` for `"neutra"`).
 */
export type TerrainClassification = Readonly<{
  tipo: "fortalecida" | "enfraquecida" | "neutra";
  magnitude: number;
}>;

/**
 * The read-only, indexed table — mirrors `CardCatalog` (F03) and
 * `GuardianMatrix` (F06): every method answers from state built once at
 * construction, and the neutral fallback is a structural property of the API,
 * never the caller's responsibility (spec F07, Decision 8).
 */
export type TerrainClassTable = Readonly<{
  /** Alphabetical, deterministic regardless of source file order. */
  listTerrenos(): readonly string[];
  getRuleByTerreno(terreno: string): TerrainClassRule | undefined;
  classifyClasseInTerreno(terreno: string, classe: string): TerrainClassification;
  coverageReport(): TerrainClassCoverageReport;
}>;
