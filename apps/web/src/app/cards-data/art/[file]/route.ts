import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { cardsDataDir } from "../../../../lib/server/repo-root.ts";

/**
 * Serves the crop arts from `cards-data/art/` (`renderizacao-cartas/F03`) at
 * `/cards-data/art/NNN.jpg` — the sibling of `app/cards-data/[file]/route.ts`,
 * which only serves the full-card images at the top level. Same rationale
 * (repository data, not `public/`) and same exact-pattern matching (spec F06
 * §6): a card number is three digits by construction, so anything else never
 * reaches `join`.
 */
const CROP_ART_FILE = /^[0-9]{3}\.jpg$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await context.params;
  if (!CROP_ART_FILE.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(join(cardsDataDir(), "art", /* turbopackIgnore: true */ file));
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const body = new Uint8Array(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);

  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
