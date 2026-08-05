import { DomainError, err, ok, type Card, type Result } from "@yugioh/shared";

import { aggregateCards, type CandidateCard } from "./aggregate-cards.ts";
import { buildArtManifest, type ArtManifest } from "./art-manifest.ts";
import { applyEnrichment, type CardEnrichmentTable } from "./enrichment.ts";
import { SourceEnvelopeSchema } from "./envelope.ts";
import { normalizeCard } from "./normalize-card.ts";
import {
  buildIngestionReport,
  type DiscardedEnrichment,
  type DiscardedRecord,
  type IngestionReport,
} from "./report.ts";

/** A source file already read from disk by the adapter. */
export type SourceFile = Readonly<{
  name: string;
  content: string;
}>;

export type IngestionInput = Readonly<{
  files: readonly SourceFile[];
  /** Art file paths relative to the repository root. */
  availableArts: readonly string[];
  /**
   * External enrichment (`atributo`/`nivel`/`descricao`) keyed by `numero`.
   * Absent or empty is the normal state before `renderizacao-cartas/F02`
   * covers a card — every field simply stays `null` (spec F01, Decision 4).
   */
  enrichment?: CardEnrichmentTable;
  /** Injected so the orchestrator stays pure and reproducible. */
  generatedAt: string;
}>;

export type IngestionOutput = Readonly<{
  cards: readonly Card[];
  manifest: ArtManifest;
  report: IngestionReport;
}>;

/**
 * Tells a `success:true` envelope missing its `card` apart from an envelope we
 * cannot recognize at all, so the report names the actual problem.
 */
function isMissingCardEnvelope(parsed: unknown): boolean {
  if (typeof parsed !== "object" || parsed === null) {
    return false;
  }
  const envelope = parsed as { success?: unknown; card?: unknown };
  if (envelope.success !== true) {
    return false;
  }
  return typeof envelope.card !== "object" || envelope.card === null;
}

function parseJson(content: string): Result<unknown, DomainError> {
  try {
    return ok(JSON.parse(content));
  } catch (error: unknown) {
    return err(
      new DomainError("file is not valid JSON", "invalid_envelope", {
        cause: error instanceof Error ? error.message : "unknown error",
      }),
    );
  }
}

/**
 * Turns already-read source files into the dataset, the art manifest and the
 * ingestion report, without touching the filesystem.
 *
 * Individual bad records are discarded and reported so one broken file cannot
 * stop the batch (spec F01, Decision 10). Only two things abort: an empty
 * source, and a `numero` claimed by two valid records — both leave the caller
 * with nothing to write, which is the point.
 *
 * The result does not depend on the order of `files`, so the artifacts stay
 * byte-stable no matter how the filesystem listed the directory.
 */
export function ingestSource(input: IngestionInput): Result<IngestionOutput, DomainError> {
  if (input.files.length === 0) {
    return err(new DomainError("no source file to ingest", "source_missing"));
  }

  const orderedFiles = [...input.files].sort((left, right) => left.name.localeCompare(right.name));
  const enrichment = input.enrichment ?? {};

  const candidates: CandidateCard[] = [];
  const discardedAsInvalid: DiscardedRecord[] = [];
  const discardedEnrichment: DiscardedEnrichment[] = [];
  let discardedByError = 0;

  for (const file of orderedFiles) {
    const parsed = parseJson(file.content);
    if (!parsed.ok) {
      discardedAsInvalid.push({
        file: file.name,
        reason: parsed.error.message,
        code: parsed.error.code,
      });
      continue;
    }

    const envelope = SourceEnvelopeSchema.safeParse(parsed.value);
    if (!envelope.success) {
      discardedAsInvalid.push({
        file: file.name,
        reason: isMissingCardEnvelope(parsed.value)
          ? "envelope reports success but carries no card"
          : "envelope does not match the source contract",
        code: isMissingCardEnvelope(parsed.value) ? "missing_card" : "invalid_envelope",
      });
      continue;
    }

    if (!envelope.data.success) {
      discardedByError += 1;
      continue;
    }

    const normalized = normalizeCard(envelope.data.card, file.name);
    if (!normalized.ok) {
      discardedAsInvalid.push({
        file: file.name,
        reason: normalized.error.message,
        code: normalized.error.code,
      });
      continue;
    }

    const enriched = applyEnrichment(normalized.value, enrichment);
    if (!enriched.ok) {
      discardedEnrichment.push({
        numero: normalized.value.numero,
        reason: enriched.error.message,
        code: enriched.error.code,
      });
      candidates.push({ card: normalized.value, file: file.name });
      continue;
    }

    candidates.push({ card: enriched.value, file: file.name });
  }

  const aggregation = aggregateCards(candidates);
  if (!aggregation.ok) {
    return aggregation;
  }

  const { cards, missingNumbers } = aggregation.value;
  const arts = buildArtManifest(cards, input.availableArts);

  return ok({
    cards,
    manifest: arts.manifest,
    report: buildIngestionReport({
      filesRead: input.files.length,
      discardedByError,
      discardedAsInvalid,
      cards,
      missingNumbers,
      artsFound: Object.keys(arts.manifest).length,
      missingArts: arts.missingArts,
      orphanArts: arts.orphanArts,
      discardedEnrichment,
      generatedAt: input.generatedAt,
    }),
  });
}
