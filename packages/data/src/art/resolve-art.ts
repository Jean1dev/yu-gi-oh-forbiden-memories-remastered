import { DEFAULT_ART_PLACEHOLDER_PATH, type Card, type CardNumber } from "@yugioh/shared";

import type { ArtManifest } from "../ingestion/art-manifest.ts";
import type { ResolvedArtReference } from "./types.ts";

function numeroOf(entrada: Card | CardNumber): CardNumber {
  return typeof entrada === "string" ? entrada : entrada.numero;
}

/**
 * Resolves the art reference for a card, given the manifest F01 built and F03
 * exposes in memory. Pure and total: a `numero` that is not a key of
 * `manifest` — art genuinely missing, or a `numero` unknown to the catalog —
 * falls back to the shared placeholder path the same way (spec F04,
 * Decision 7). Never throws, never returns an empty `caminho`.
 *
 * Never reconstructs the art path by concatenation: the manifest is the only
 * source of a real `caminho` (spec F04 Capabilities).
 */
export function resolveArt(
  entrada: Card | CardNumber,
  manifest: ArtManifest,
): ResolvedArtReference {
  const numero = numeroOf(entrada);
  const caminho = manifest[numero];

  if (caminho !== undefined) {
    return Object.freeze({ numero, tipo: "arte" as const, caminho });
  }

  return Object.freeze({
    numero,
    tipo: "placeholder" as const,
    caminho: DEFAULT_ART_PLACEHOLDER_PATH,
  });
}
