import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Absolute path of the monorepo root, for the server-only code that has to
 * read files the app does not own: the ingested dataset under
 * `packages/data/generated` and the card arts under `cards-data/`.
 *
 * Derived by walking up from the working directory until `pnpm-workspace.yaml`
 * appears, deliberately **not** from `import.meta.url`: this module is bundled
 * by Next, and a bundler is free to rewrite that URL to the chunk's location
 * inside `.next/`, which would silently point the reads at the wrong tree. The
 * working directory is stable across `next dev`, `next build` and `next start`,
 * and turbo runs every task from its package's directory.
 *
 * Resolved once per process — the answer cannot change while the server runs.
 */
let cached: string | undefined;

const WORKSPACE_MARKER = "pnpm-workspace.yaml";

function repoRoot(): string {
  if (cached !== undefined) {
    return cached;
  }

  let current = resolve(/* turbopackIgnore: true */ process.cwd());
  for (;;) {
    if (existsSync(join(/* turbopackIgnore: true */ current, WORKSPACE_MARKER))) {
      cached = current;
      return cached;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        `Could not locate the monorepo root: no ${WORKSPACE_MARKER} above ${process.cwd()}.`,
      );
    }
    current = parent;
  }
}

/** Where `pnpm data:ingest` + `data:validate` write the catalog artifacts. */
export function generatedDataDir(): string {
  return join(repoRoot(), "packages", "data", "generated");
}

/** Where the 722 card arts live, in the same coordinate system the art manifest uses. */
export function cardsDataDir(): string {
  return join(repoRoot(), "cards-data");
}
