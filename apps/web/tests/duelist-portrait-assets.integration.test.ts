import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const REAL_DUELIST_IDS = ["forest-mage", "jono", "nitemare", "teana"] as const;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("Free Duel portrait assets", () => {
  for (const id of REAL_DUELIST_IDS) {
    it(`${id} declares and ships its own PNG portrait`, async () => {
      const sourcePath = join(
        process.cwd(),
        "..",
        "..",
        "packages",
        "data",
        "data",
        "duelists",
        `${id}.json`,
      );
      const source = JSON.parse(await readFile(sourcePath, "utf8")) as { portrait?: unknown };
      const portrait = `duelists/${id}.png`;

      expect(source.portrait).toBe(portrait);

      const assetPath = join(process.cwd(), "public", portrait);
      const [bytes, metadata] = await Promise.all([readFile(assetPath), stat(assetPath)]);
      expect(metadata.isFile()).toBe(true);
      expect(metadata.size).toBeGreaterThan(PNG_SIGNATURE.length);
      expect(bytes.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);
    });
  }
});
