import type { CardCatalog } from "../catalog/types.ts";
import type { ArtManifest } from "../ingestion/art-manifest.ts";
import { resolveArt } from "./resolve-art.ts";
import type { ArtResolver } from "./types.ts";

/**
 * Closes over an already-loaded manifest and hands back an immutable resolver.
 * Introduces no I/O of its own — the manifest is expected to already be in
 * memory (spec F04, Decision 6).
 */
export function createArtResolver(manifest: ArtManifest): ArtResolver {
  return Object.freeze({
    resolve(entrada: Parameters<ArtResolver["resolve"]>[0]) {
      return resolveArt(entrada, manifest);
    },
  });
}

/**
 * Convenience: pulls the manifest straight off an F03 catalog so the caller
 * never has to extract it manually.
 */
export function createArtResolverFromCatalog(catalog: CardCatalog): ArtResolver {
  return createArtResolver(catalog.getArtManifest());
}
