import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else if (entry.name.endsWith(".ts") && !entry.name.includes(".test.")) result.push(path);
  }
  return result;
}

const forbidden = ["Math.random(", "Date.now(", "crypto.randomUUID("];
const violations = [];
for (const file of await files("packages/ai/src")) {
  const source = await readFile(file, "utf8");
  for (const token of forbidden) {
    if (source.includes(token)) violations.push(`${file}: forbidden ${token}`);
  }
}
if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("ia-de-npcs deterministic boundary passed\n");
}
