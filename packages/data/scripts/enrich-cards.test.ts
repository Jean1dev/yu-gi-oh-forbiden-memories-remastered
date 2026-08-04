import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DomainError, err, ok } from "@yugioh/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sourceFile } from "../tests/fixtures/source-records.ts";
import type { CardEnrichmentTable } from "../src/ingestion/enrichment.ts";
import type { YgoprodeckCardResponse } from "../src/ygoprodeck/types.ts";
import { runEnrichment, type EnrichmentOptions, type YgoprodeckClient } from "./enrich-cards.ts";

function apiRecord(overrides: Partial<YgoprodeckCardResponse> = {}): YgoprodeckCardResponse {
  return {
    id: 89_631_139,
    name: "Blue-Eyes White Dragon",
    attribute: "LIGHT",
    level: 8,
    desc: "This legendary dragon is a powerful engine of destruction.",
    card_images: [{ image_url_cropped: "https://images.ygoprodeck.com/images/cards_cropped/89631139.jpg" }],
    ...overrides,
  };
}

function stubClient(overrides: Partial<YgoprodeckClient> = {}): YgoprodeckClient {
  return {
    fetchById: vi.fn(async () => ok<readonly YgoprodeckCardResponse[]>([])),
    fetchByName: vi.fn(async () => ok<readonly YgoprodeckCardResponse[]>([])),
    ...overrides,
  };
}

let workDir = "";

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "yugioh-enrich-"));
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(workDir, { recursive: true, force: true });
});

async function writeSourceCard(
  sourceDir: string,
  numero: string,
  overrides: Parameters<typeof sourceFile>[1] = {},
): Promise<void> {
  await mkdir(sourceDir, { recursive: true });
  const file = sourceFile(numero, overrides);
  await writeFile(join(sourceDir, file.name), file.content, "utf8");
}

function optionsFor(
  targetNumbers: readonly string[],
  client: YgoprodeckClient,
  extra: Partial<EnrichmentOptions> = {},
): EnrichmentOptions {
  return {
    sourceDir: join(workDir, "dados"),
    enrichmentTablePath: join(workDir, "enriquecimento-ygoprodeck.json"),
    overridesPath: join(workDir, "overrides-nomes-ygoprodeck.json"),
    artUrlsPath: join(workDir, "generated", "ygoprodeck-art-urls.json"),
    targetNumbers,
    client,
    ...extra,
  };
}

async function readTable(path: string): Promise<CardEnrichmentTable> {
  return JSON.parse(await readFile(path, "utf8")) as CardEnrichmentTable;
}

describe("runEnrichment", () => {
  it("matches by id when the card has a password", async () => {
    await writeSourceCard(join(workDir, "dados"), "001", { password: "89 63 11 39" });
    const client = stubClient({
      fetchById: vi.fn(async (id: number) => {
        expect(id).toBe(89_631_139);
        return ok<readonly YgoprodeckCardResponse[]>([apiRecord()]);
      }),
    });

    await runEnrichment(optionsFor(["001"], client));

    const table = await readTable(join(workDir, "enriquecimento-ygoprodeck.json"));
    expect(table["001"]).toEqual({ atributo: "LIGHT", nivel: 8, descricao: apiRecord().desc });
  });

  it("matches by name via override when the card has no password", async () => {
    await writeSourceCard(join(workDir, "dados"), "999", { password: "Indisponível", tipo: "magica" });
    await writeFile(
      join(workDir, "overrides-nomes-ygoprodeck.json"),
      JSON.stringify({ "999": "Raigeki" }),
      "utf8",
    );
    const client = stubClient({
      fetchByName: vi.fn(async (name: string) => {
        expect(name).toBe("Raigeki");
        return ok<readonly YgoprodeckCardResponse[]>([
          apiRecord({ name: "Raigeki", attribute: undefined, level: undefined }),
        ]);
      }),
    });

    await runEnrichment(optionsFor(["999"], client));

    const table = await readTable(join(workDir, "enriquecimento-ygoprodeck.json"));
    expect(table["999"]?.nivel).toBeNull();
  });

  it("marks no_password_no_override without calling the API", async () => {
    await writeSourceCard(join(workDir, "dados"), "999", { password: "Indisponível" });
    const client = stubClient();

    await runEnrichment(optionsFor(["999"], client));

    expect(client.fetchById).not.toHaveBeenCalled();
    expect(client.fetchByName).not.toHaveBeenCalled();
    const table = await readTable(join(workDir, "enriquecimento-ygoprodeck.json"));
    expect(table["999"]).toBeUndefined();
  });

  it("marks ambiguous when the name resolves to more than one result, picking neither", async () => {
    await writeSourceCard(join(workDir, "dados"), "999", { password: "Indisponível" });
    await writeFile(
      join(workDir, "overrides-nomes-ygoprodeck.json"),
      JSON.stringify({ "999": "Some Card" }),
      "utf8",
    );
    const client = stubClient({
      fetchByName: vi.fn(async () =>
        ok<readonly YgoprodeckCardResponse[]>([apiRecord(), apiRecord({ id: 2 })]),
      ),
    });

    await runEnrichment(optionsFor(["999"], client));

    const table = await readTable(join(workDir, "enriquecimento-ygoprodeck.json"));
    expect(table["999"]).toBeUndefined();
  });

  it("marks http_error and continues to the next card when a call fails", async () => {
    await writeSourceCard(join(workDir, "dados"), "001", { password: "89 63 11 39" });
    await writeSourceCard(join(workDir, "dados"), "002", { password: "15 02 58 44" });
    const client = stubClient({
      fetchById: vi
        .fn()
        .mockResolvedValueOnce(err(new DomainError("boom", "http_error")))
        .mockResolvedValueOnce(ok<readonly YgoprodeckCardResponse[]>([apiRecord({ id: 15_025_844 })])),
    });

    await runEnrichment(optionsFor(["001", "002"], client));

    const table = await readTable(join(workDir, "enriquecimento-ygoprodeck.json"));
    expect(table["001"]).toBeUndefined();
    expect(table["002"]).toBeDefined();
  });

  it("overwrites an existing entry when run again (idempotency)", async () => {
    await writeSourceCard(join(workDir, "dados"), "001", { password: "89 63 11 39" });
    await writeFile(
      join(workDir, "enriquecimento-ygoprodeck.json"),
      JSON.stringify({ "001": { atributo: "DARK", nivel: 1, descricao: "stale" } }),
      "utf8",
    );
    const client = stubClient({
      fetchById: vi.fn(async () => ok<readonly YgoprodeckCardResponse[]>([apiRecord()])),
    });

    await runEnrichment(optionsFor(["001"], client));

    const table = await readTable(join(workDir, "enriquecimento-ygoprodeck.json"));
    expect(table["001"]).toEqual({ atributo: "LIGHT", nivel: 8, descricao: apiRecord().desc });
  });

  it("writes only the target numero, even with more cards in the local dataset", async () => {
    await writeSourceCard(join(workDir, "dados"), "001", { password: "89 63 11 39" });
    await writeSourceCard(join(workDir, "dados"), "002", { password: "15 02 58 44" });
    const client = stubClient({
      fetchById: vi.fn(async () => ok<readonly YgoprodeckCardResponse[]>([apiRecord()])),
    });

    await runEnrichment(optionsFor(["001"], client));

    const table = await readTable(join(workDir, "enriquecimento-ygoprodeck.json"));
    expect(Object.keys(table)).toEqual(["001"]);
  });
});
