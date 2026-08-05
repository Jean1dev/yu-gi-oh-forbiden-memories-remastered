import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const CardNumberSchema = z.string().regex(/^\d{3}$/u);
const PairSchema = z.tuple([CardNumberSchema, CardNumberSchema, CardNumberSchema]);
const SourceSchema = z.array(PairSchema).length(50_242);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(packageRoot, "rules-data/fusion-pairs.json");
const outputPath = resolve(packageRoot, "rules-data/fusions.json");
const pairs = SourceSchema.parse(JSON.parse(await readFile(sourcePath, "utf8")));
const seen = new Map<string, string>();

const recipes = pairs.flatMap(([materialA, materialB, result]) => {
  const materials = [materialA, materialB].sort() as [string, string];
  const key = materials.join(":");
  const previousResult = seen.get(key);
  if (previousResult !== undefined) {
    if (previousResult !== result) {
      throw new Error(`Conflicting fusion pair: ${key}.`);
    }
    return [];
  }
  seen.set(key, result);
  return [{ kind: "materials" as const, materials, result }];
});

if (recipes.length !== 25_146) {
  throw new Error(`Expected 25146 canonical pairs, received ${String(recipes.length)}.`);
}

await writeFile(outputPath, `${JSON.stringify(recipes)}\n`, "utf8");
console.log(`Generated ${String(recipes.length)} fusion recipes into ${outputPath}.`);
