import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = join(appDir, "../..");
const catalogRuntimeFiles = [
  "../../pnpm-workspace.yaml",
  "../../packages/data/generated/cards.json",
  "../../packages/data/generated/arts-manifest.json",
  "../../packages/data/generated/crop-arts-manifest.json",
  "../../packages/data/generated/dataset-seal.json",
];

// The roster route validates every duelist deck against the catalog, so it
// needs the dataset on top of `roster.json` itself.
const rosterRuntimeFiles = [...catalogRuntimeFiles, "../../packages/data/data/roster.json"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The workspace packages publish TypeScript source directly (their `exports`
  // point at `./src/index.ts`), so Next has to compile them like app code
  // instead of treating them as pre-built dependencies.
  transpilePackages: [
    "@yugioh/shared",
    "@yugioh/data",
    "@yugioh/rules",
    "@yugioh/engine",
    "@yugioh/ai",
  ],

  // The catalog and art routes read files through runtime-computed paths, which
  // output-file tracing cannot infer from static imports alone in Vercel's
  // Lambda bundle.
  //
  // Keys are globs, so a dynamic segment has to be escaped: unescaped
  // `[duelistId]` is a character class matching one letter, never the literal
  // directory name.
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/api/account/bootstrap": catalogRuntimeFiles,
    "/api/free-duel/roster-source": rosterRuntimeFiles,
    "/build-deck": catalogRuntimeFiles,
    "/free-duel/\\[duelistId\\]/duel": catalogRuntimeFiles,
    "/library": catalogRuntimeFiles,
    "/library/\\[cardNumber\\]": catalogRuntimeFiles,
    "/library/(.)\\[cardNumber\\]": catalogRuntimeFiles,
    "/cards-data/\\[file\\]": ["../../pnpm-workspace.yaml", "../../cards-data/*.jpg"],
    "/cards-data/art/\\[file\\]": ["../../pnpm-workspace.yaml", "../../cards-data/art/*.jpg"],
  },
};

export default nextConfig;
