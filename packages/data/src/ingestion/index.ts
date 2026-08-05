export { aggregateCards, type CandidateCard, type CardAggregation } from "./aggregate-cards.ts";
export {
  ArtManifestSchema,
  buildArtManifest,
  type ArtManifest,
  type ArtManifestResult,
} from "./art-manifest.ts";
export {
  applyEnrichment,
  CardEnrichmentEntrySchema,
  CardEnrichmentTableSchema,
  type CardEnrichmentEntry,
  type CardEnrichmentTable,
} from "./enrichment.ts";
export {
  SourceCardSchema,
  SourceEnvelopeSchema,
  type SourceCard,
  type SourceEnvelope,
} from "./envelope.ts";
export {
  ingestSource,
  type IngestionInput,
  type IngestionOutput,
  type SourceFile,
} from "./ingest-source.ts";
export { cardNumberFromFileName, normalizeCard, normalizeCardNumber } from "./normalize-card.ts";
export {
  buildIngestionReport,
  type DiscardedEnrichment,
  type DiscardedRecord,
  type IngestionReport,
  type IngestionReportInput,
} from "./report.ts";
export {
  serializeArtifacts,
  serializeArtManifest,
  type SerializedArtifacts,
} from "./serialize.ts";
