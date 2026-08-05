import { writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const databasePath = process.argv[2];
if (databasePath === undefined) {
  throw new Error("Usage: node import-fusion-source.ts <YFM.db>");
}

const database = new DatabaseSync(databasePath, { readOnly: true });
const rows = database
  .prepare("SELECT Material1, Material2, Result FROM Fusions ORDER BY Material1, Material2")
  .all() as Array<{ Material1: number; Material2: number; Result: string }>;

if (rows.length !== 50_242) {
  throw new Error(`Expected 50242 fusion pairs, received ${String(rows.length)}.`);
}

const pairs = rows.map(({ Material1, Material2, Result }) => [
  Material1.toString().padStart(3, "0"),
  Material2.toString().padStart(3, "0"),
  Result.padStart(3, "0"),
]);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(packageRoot, "rules-data/fusion-pairs.json");
await writeFile(outputPath, `${JSON.stringify(pairs)}\n`, "utf8");
console.log(`Imported ${String(pairs.length)} fusion pairs into ${outputPath}.`);
