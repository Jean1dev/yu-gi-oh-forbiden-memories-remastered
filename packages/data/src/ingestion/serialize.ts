import { CARD_FIELD_ORDER, type Card } from "@yugioh/shared";

import type { ArtManifest } from "./art-manifest.ts";
import type { IngestionOutput } from "./ingest-source.ts";

export type SerializedArtifacts = Readonly<{
  cardsJson: string;
  artManifestJson: string;
  ingestionReportJson: string;
}>;

const JSON_INDENTATION = 2;

/** Every artifact ends with a newline, so diffs and `cat` behave. */
function toJsonDocument(value: unknown): string {
  return `${JSON.stringify(value, null, JSON_INDENTATION)}\n`;
}

/**
 * Rebuilds the card with its keys in canonical order.
 *
 * `JSON.stringify` follows insertion order, so key order is part of the output
 * bytes and cannot be left to whoever happened to build the object.
 */
function toCanonicalRecord(card: Card): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const field of CARD_FIELD_ORDER) {
    record[field] = card[field];
  }
  return record;
}

function toSortedManifest(manifest: ArtManifest): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const numero of Object.keys(manifest).sort((left, right) => left.localeCompare(right))) {
    const path = manifest[numero];
    if (path !== undefined) {
      sorted[numero] = path;
    }
  }
  return sorted;
}

/**
 * Serializes an art manifest on its own — same byte-deterministic shape
 * `serializeArtifacts` uses for `arts-manifest.json`, reused by
 * `renderizacao-cartas/F03` for the second (crop-art) manifest so the two
 * never drift into different formats (spec F03, Decision 2).
 */
export function serializeArtManifest(manifest: ArtManifest): string {
  return toJsonDocument(toSortedManifest(manifest));
}

/**
 * Serializes the three artifacts.
 *
 * `cards.json` and `arts-manifest.json` are byte-deterministic: stable ordering,
 * fixed key order, no timestamp. That is what makes the F10 content hash mean
 * something. `ingestion-report.json` carries `generatedAt` and is therefore
 * excluded from that guarantee — it is process evidence, not distributed data.
 */
export function serializeArtifacts(output: IngestionOutput): SerializedArtifacts {
  return {
    cardsJson: toJsonDocument(output.cards.map(toCanonicalRecord)),
    artManifestJson: serializeArtManifest(output.manifest),
    ingestionReportJson: toJsonDocument(output.report),
  };
}
