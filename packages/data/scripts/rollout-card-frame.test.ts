import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CardNumber } from "@yugioh/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  runCardFrameRollout,
  type CardFrameRolloutOptions,
} from "./rollout-card-frame.ts";

function validJpeg(width = 300, height = 400): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
    ...new Array(14).fill(0),
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03,
    ...new Array(9).fill(0),
  ]);
}

let workDir = "";

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "yugioh-rollout-"));
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(workDir, { recursive: true, force: true });
});

function options(apply: boolean): CardFrameRolloutOptions {
  return {
    enrichmentPath: join(workDir, "enrichment.json"),
    cropArtDir: join(workDir, "art"),
    legacyArtDir: join(workDir, "legacy"),
    reportPath: join(workDir, "generated", "coverage.json"),
    cardNumbers: ["001", "002"],
    apply,
  };
}

async function seed(enriched: readonly CardNumber[] = ["001"]): Promise<void> {
  await Promise.all([
    mkdir(join(workDir, "art"), { recursive: true }),
    mkdir(join(workDir, "legacy"), { recursive: true }),
  ]);
  const enrichment = Object.fromEntries(
    enriched.map((numero) => [numero, { atributo: "LIGHT", nivel: 1, descricao: "Valid" }]),
  );
  await Promise.all([
    writeFile(join(workDir, "enrichment.json"), JSON.stringify(enrichment), "utf8"),
    writeFile(join(workDir, "art", "001.jpg"), validJpeg()),
    writeFile(join(workDir, "legacy", "001.jpg"), validJpeg()),
    writeFile(join(workDir, "legacy", "002.jpg"), validJpeg()),
  ]);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("runCardFrameRollout", () => {
  it("writes a report in dry-run without removing files", async () => {
    await seed();

    expect(await runCardFrameRollout(options(false))).toBe(0);

    const report = JSON.parse(await readFile(join(workDir, "generated", "coverage.json"), "utf8"));
    expect(report.migrated).toEqual(["001"]);
    expect(report.legacyFallback).toEqual(["002"]);
    expect(await exists(join(workDir, "legacy", "001.jpg"))).toBe(true);
  });

  it("removes migrated legacy art and preserves pending fallback with --apply", async () => {
    await seed();

    expect(await runCardFrameRollout(options(true))).toBe(0);

    expect(await exists(join(workDir, "legacy", "001.jpg"))).toBe(false);
    expect(await exists(join(workDir, "legacy", "002.jpg"))).toBe(true);
  });

  it("does not remove anything when coverage is inconsistent", async () => {
    await seed(["001", "002"]);

    expect(await runCardFrameRollout(options(true))).toBe(1);

    expect(await exists(join(workDir, "legacy", "001.jpg"))).toBe(true);
    expect(await exists(join(workDir, "legacy", "002.jpg"))).toBe(true);
  });

  it("is idempotent when apply runs twice", async () => {
    await seed();

    expect(await runCardFrameRollout(options(true))).toBe(0);
    expect(await runCardFrameRollout(options(true))).toBe(0);
    expect(await exists(join(workDir, "legacy", "002.jpg"))).toBe(true);
  });
});
