export { err, ok, type Result } from "./result.ts";
export { DomainError } from "./errors.ts";
export {
  CANONICAL_CARD_TOTAL,
  CARD_FIELD_ORDER,
  CARD_NUMBER_LENGTH,
  CARD_TYPES,
  DEFAULT_ART_PLACEHOLDER_PATH,
  GUARDIAN_STARS,
  KNOWN_CLASSES,
} from "./card/constants.ts";
export type { Card, CardNumber, CardType, GuardianStar } from "./card/types.ts";
export { CardNumberSchema, CardSchema, CardTypeSchema, GuardianStarSchema } from "./card/schema.ts";
export {
  DatasetSealSchema,
  VIOLATION_CATEGORIES,
  ValidationReportSchema,
  ValidationViolationSchema,
  ViolationCategorySchema,
  type DatasetSeal,
  type ValidationReport,
  type ValidationViolation,
  type ViolationCategory,
} from "./card/validation-report.ts";
export { LP_INICIAL, TOTAL_ZONAS_MAGIA, TOTAL_ZONAS_MONSTRO } from "./duelo/constantes.ts";
export type {
  CampoJogador,
  EstadoDuelo,
  EstadoJogador,
  Fase,
  JogadorId,
  PosicaoMonstro,
  ZonaMagia,
  ZonaMonstro,
} from "./duelo/tipos.ts";
export {
  CampoJogadorSchema,
  EstadoDueloSchema,
  EstadoJogadorSchema,
  FaseSchema,
  JogadorIdSchema,
  PosicaoMonstroSchema,
  ZonaMagiaSchema,
  ZonaMonstroSchema,
} from "./duelo/schema.ts";
