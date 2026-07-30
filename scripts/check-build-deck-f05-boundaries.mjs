import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const deckRulesDirectory = "packages/rules/src/deck";

async function listProductionSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const sources = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      sources.push(...(await listProductionSources(path)));
    } else if (
      /\.(?:ts|tsx)$/.test(entry.name) &&
      !/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name)
    ) {
      sources.push(path);
    }
  }

  return sources;
}

const forbiddenSourcePatterns = [
  {
    pattern: /(?:from\s+|import\s*\()\s*["'](?:react|react-dom|next)(?:\/[^"']*)?["']/,
    reason: "deck rules must not import React, React DOM, or Next.js.",
  },
  {
    pattern: /(?:from\s+|import\s*\()\s*["']@supabase(?:\/[^"']*)?["']/,
    reason: "deck rules must not import Supabase.",
  },
  {
    pattern: /\b(?:window|document|navigator|HTMLElement|EventTarget)\b/,
    reason: "deck rules must not access DOM globals.",
  },
  {
    pattern: /\bfetch\s*\(/,
    reason: "deck rules must not perform network I/O with fetch.",
  },
];

const violations = [];
const sourceFiles = await listProductionSources(deckRulesDirectory);

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  for (const check of forbiddenSourcePatterns) {
    if (check.pattern.test(source)) {
      violations.push(`${file}: ${check.reason}`);
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("build-deck/F05 boundaries passed\n");
}
