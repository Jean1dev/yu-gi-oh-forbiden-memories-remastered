import { readFile } from "node:fs/promises";
import process from "node:process";

const sourceFiles = [
  "apps/web/src/app/build-deck/build-deck-client.tsx",
  "apps/web/src/components/build-deck/collection-card-item.tsx",
  "apps/web/src/components/build-deck/collection-panel.tsx",
  "apps/web/src/components/build-deck/collection-search-field.tsx",
  "apps/web/src/components/build-deck/collection-failure.tsx",
  "apps/web/src/components/build-deck/empty-collection-state.tsx",
  "apps/web/src/components/build-deck/no-search-results.tsx",
  "apps/web/src/components/build-deck/panel-skeleton.tsx",
  "apps/web/src/hooks/use-collection-panel.ts",
  "apps/web/src/lib/build-deck/unavailable-active-deck.ts",
];

const forbiddenSourcePatterns = [
  {
    pattern: /@supabase|indexeddb|\.from\s*\(\s*["'](?:collections|active_decks)["']\s*\)/i,
    reason: "F04 must receive collection and active-deck data through injected read contracts.",
  },
  {
    pattern: /\.(?:insert|update|upsert|delete)\s*\(/,
    reason: "F04 navigation is read-only and must not expose persistence mutations.",
  },
  {
    pattern: /Math\.min\s*\([^)]*,\s*3\s*\)|\b(?:quantity|ownedQuantity)\s*[<>]=?\s*3\b/,
    reason: "F04 must reuse the copy limit computed by packages/rules instead of reimplementing it.",
  },
];

const responsiveTrackFile = "apps/web/src/components/build-deck/collection-panel.module.css";
const fixedTrackPattern = /(?:^|[;{]\s*)(?:width|min-width|max-width|grid-template-columns)\s*:[^;}]*\b\d+px\b/gim;

const violations = [];

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  for (const check of forbiddenSourcePatterns) {
    if (check.pattern.test(source)) {
      violations.push(`${file}: ${check.reason}`);
    }
  }
}

const responsiveTrack = await readFile(responsiveTrackFile, "utf8");
if (fixedTrackPattern.test(responsiveTrack)) {
  violations.push(`${responsiveTrackFile}: the responsive panel track must not use a fixed pixel width.`);
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("build-deck/F04 boundaries passed\n");
}
