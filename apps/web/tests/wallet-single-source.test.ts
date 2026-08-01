import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe("wallet single source", () => {
  it("no module outside lib/wallet and lib/reward references the wallets table", () => {
    const violations = sourceFiles(sourceRoot)
      .filter((path) => !path.includes("/lib/wallet/") && !path.includes("/lib/reward/"))
      .filter((path) => /\.from\(["']wallets["']\)/.test(readFileSync(path, "utf8")))
      .map((path) => relative(sourceRoot, path));
    expect(violations).toEqual([]);
  });
});
