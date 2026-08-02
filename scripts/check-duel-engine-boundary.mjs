import { readdir, readFile } from "node:fs/promises";
import { dirname, join, normalize, relative } from "node:path";
import process from "node:process";

const webSourceRoot = normalize("apps/web/src");
const authorizedEngineImporter = normalize("apps/web/src/lib/free-duel/duel-runtime.ts");
const sealedCatalogModule = normalize("apps/web/src/lib/catalog/sealed-catalog");
const serverLibRoot = normalize("apps/web/src/lib/server");

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(path)));
    } else if (/\.(?:ts|tsx)$/.test(entry.name) && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(normalize(path));
    }
  }

  return files;
}

function importSpecifiers(source) {
  const specifiers = [];
  const importPattern =
    /(?:import\s+(?:type\s+)?[\s\S]*?\s+from\s+|export\s+(?:type\s+)?[\s\S]*?\s+from\s+|import\s*\()\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function hasUseClientDirective(source) {
  const firstStatements = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
    .slice(0, 3);
  return firstStatements.some((line) => /^["']use client["'];?$/.test(line));
}

function stripExtension(path) {
  return path.replace(/\.(?:ts|tsx|js|jsx|mjs|cjs)$/, "");
}

function resolveLocalImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) {
    return specifier;
  }
  return stripExtension(normalize(join(dirname(fromFile), specifier)));
}

function importsEngine(specifier) {
  return specifier === "@yugioh/engine" || specifier.startsWith("@yugioh/engine/");
}

function isServerOnlyImport(fromFile, specifier) {
  const resolved = resolveLocalImport(fromFile, specifier);
  if (resolved === "lib/catalog/sealed-catalog" || resolved === "@/lib/catalog/sealed-catalog") {
    return true;
  }
  if (resolved === "lib/server" || resolved.startsWith("lib/server/")) {
    return true;
  }
  return (
    resolved === sealedCatalogModule ||
    resolved.startsWith(`${sealedCatalogModule}/`) ||
    resolved === serverLibRoot ||
    resolved.startsWith(`${serverLibRoot}/`)
  );
}

const violations = [];
const sourceFiles = await listSourceFiles(webSourceRoot);

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  const specifiers = importSpecifiers(source);

  for (const specifier of specifiers) {
    if (importsEngine(specifier) && file !== authorizedEngineImporter) {
      violations.push(
        `${file}: only ${authorizedEngineImporter} may import @yugioh/engine directly.`,
      );
    }
  }

  if (hasUseClientDirective(source)) {
    for (const specifier of specifiers) {
      if (isServerOnlyImport(file, specifier)) {
        violations.push(
          `${file}: client modules must receive catalog data by props and must not import ${relative(
            webSourceRoot,
            resolveLocalImport(file, specifier),
          )}.`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("free-duel/F09 engine boundary passed\n");
}
