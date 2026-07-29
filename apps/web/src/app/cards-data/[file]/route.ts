import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { cardsDataDir } from "../../../lib/server/repo-root.ts";

/**
 * Serves the card arts from `cards-data/` at the `/cards-data/NNN.jpg` URLs the
 * UI already asks for (`components/build-deck/collection-card-item.tsx`, and
 * `components/library/card-art.tsx` via the art manifest).
 *
 * A route handler rather than `public/`: the arts are repository data shared
 * with the ingestion pipeline, ~20MB of it, and copying them into the app would
 * fork the manifest's source of truth. The manifest stores paths relative to the
 * repository root — this endpoint is the web layer's translation of that
 * coordinate system into a URL.
 *
 * The file name is matched against an exact pattern instead of being sanitized:
 * every card number is three digits by construction (`CardNumber`), so anything
 * else is not a card and never reaches `join`. That rules out traversal rather
 * than trying to strip it.
 */
const CARD_ART_FILE = /^[0-9]{3}\.jpg$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await context.params;
  if (!CARD_ART_FILE.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(join(cardsDataDir(), file));
  } catch {
    // A card with no art on disk is a known dataset state (`placeholder.jpg` is
    // still a pending asset): 404 lets `CardArt`'s `onError` fall back to the
    // neutral placeholder, the same markup a missing manifest entry produces.
    return new Response("Not found", { status: 404 });
  }

  // A view over the bytes already read, not a copy: `Buffer` is a `Uint8Array`
  // subclass, but the DOM `BodyInit` type does not accept its `ArrayBufferLike`
  // backing store, and `new Uint8Array(bytes)` would duplicate every art on
  // every request.
  const body = new Uint8Array(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);

  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      // The dataset is sealed and content-addressed by card number: an art file
      // never changes meaning, only the dataset version around it does.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
