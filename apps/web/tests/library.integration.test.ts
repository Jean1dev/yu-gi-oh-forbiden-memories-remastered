// The Supabase-gated suite below exercises the offline cache fallback, and this
// file runs in the Node environment. Same first line as
// `collection.integration.test.ts` and `reward.integration.test.ts`, which use
// the cache for the same reason.
import "fake-indexeddb/auto";

import { randomUUID } from "node:crypto";

import { buildLibraryIndex } from "@yugioh/rules";
import { DomainError, err } from "@yugioh/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createIndexedDbCollectionCache } from "../src/lib/collection/indexeddb-cache.ts";
import { loadCollection } from "../src/lib/collection/load-collection.ts";
import {
  createSupabaseCollectionRepository,
  type CollectionRepository,
} from "../src/lib/collection/supabase-repository.ts";
import { getLibraryCatalog } from "../src/lib/library/catalog-library.ts";
import { loadLibrary } from "../src/lib/library/load-library.ts";

/**
 * Only needs the real dataset from `pnpm --filter @yugioh/data data:ingest`
 * + `data:validate` (a turbo dependency of this package's `test:integration`
 * task) — no Supabase involved. Proves `getLibraryCatalog` resolves the real
 * 722-card catalog and every card's art for real, the smoke check this
 * feature's own new catalog wiring needs regardless of Supabase
 * availability.
 */
describe("getLibraryCatalog against the real ingested dataset", () => {
  it("resolves the canonical 722-card catalog", async () => {
    const result = await getLibraryCatalog();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.listing.totalCount()).toBe(722);
    expect(result.value.listing.listAll()).toHaveLength(722);
  });

  it("builds a 722-entry index with renderable art for every obtained card", async () => {
    const catalogResult = await getLibraryCatalog();
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const allNumbers = catalogResult.value.listing.listAll().map((card) => card.numero);
    const index = buildLibraryIndex({
      catalog: catalogResult.value.listing,
      obtainedCardNumbers: new Set(allNumbers),
      artLookup: catalogResult.value.artLookup,
    });

    expect(index.entries).toHaveLength(722);
    expect(index.obtained).toBe(722);
    for (const entry of index.entries) {
      expect(entry.obtained).toBe(true);
      if (!entry.obtained) continue;
      expect(
        catalogResult.value.cropArtLookup(entry.card.numero).kind === "art" ||
          entry.art.kind === "art",
      ).toBe(true);
    }
  });
});

/**
 * Requires a Supabase instance (local via `supabase start`, or a real
 * project) with every migration under `supabase/migrations/` applied, plus
 * `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` in the
 * environment — the same three `collection.integration.test.ts` reads. Skips
 * cleanly (skill soft-fail rule for external test dependencies) whenever
 * those three aren't set.
 */
const SUPABASE_URL = process.env["SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON_KEY = process.env["SUPABASE_ANON_KEY"];
const hasSupabaseEnv =
  SUPABASE_URL !== undefined && SERVICE_ROLE_KEY !== undefined && ANON_KEY !== undefined;

async function createTestUserClient(
  admin: SupabaseClient,
  url: string,
  anonKey: string,
): Promise<{ client: SupabaseClient; playerId: string }> {
  const email = `${randomUUID()}@example.test`;
  const password = randomUUID();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || created.user === null) {
    throw new Error(`failed to create test user: ${createError?.message ?? "unknown error"}`);
  }

  const client = createClient(url, anonKey);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`failed to sign in test user: ${signInError.message}`);
  }

  return { client, playerId: created.user.id };
}

async function cleanupPlayer(admin: SupabaseClient, playerId: string): Promise<void> {
  await admin.from("collections").delete().eq("player_id", playerId);
  await admin.auth.admin.deleteUser(playerId);
}

function loadLibraryFor(client: SupabaseClient, playerId: string) {
  return loadLibrary({
    getCatalog: getLibraryCatalog,
    loadCollection: () =>
      loadCollection({
        playerId,
        repository: createSupabaseCollectionRepository(client),
        cache: createIndexedDbCollectionCache(),
        clock: { now: () => new Date() },
      }),
  });
}

describe.skipIf(!hasSupabaseEnv)("loadLibrary against a real local Supabase instance", () => {
  const url = SUPABASE_URL as string;
  const serviceRoleKey = SERVICE_ROLE_KEY as string;
  const anonKey = ANON_KEY as string;

  let admin: SupabaseClient;
  let playerA: { client: SupabaseClient; playerId: string };
  let playerB: { client: SupabaseClient; playerId: string };

  beforeAll(async () => {
    admin = createClient(url, serviceRoleKey);
    playerA = await createTestUserClient(admin, url, anonKey);
    playerB = await createTestUserClient(admin, url, anonKey);

    await admin.from("collections").insert([
      { player_id: playerA.playerId, numero: "001", quantity: 1 },
      { player_id: playerA.playerId, numero: "002", quantity: 3 },
    ]);
  });

  afterAll(async () => {
    await cleanupPlayer(admin, playerA.playerId);
    await cleanupPlayer(admin, playerB.playerId);
  });

  it("emits 722 entries against the real dataset", async () => {
    const result = await loadLibraryFor(playerA.client, playerA.playerId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.index.entries).toHaveLength(722);
  });

  it("uses total 722 from the catalog against the real dataset", async () => {
    const result = await loadLibraryFor(playerA.client, playerA.playerId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.index.total).toBe(722);
  });

  it("marks as obtained exactly the cards in collections for the authenticated player", async () => {
    const result = await loadLibraryFor(playerA.client, playerA.playerId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.index.obtained).toBe(2);
    expect(result.value.index.byCardNumber.get("001")?.obtained).toBe(true);
    expect(result.value.index.byCardNumber.get("003")?.obtained).toBe(false);
  });

  it("returns every entry locked for a player with no cards", async () => {
    const result = await loadLibraryFor(playerB.client, playerB.playerId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.index.obtained).toBe(0);
    expect(result.value.index.entries.every((entry) => !entry.obtained)).toBe(true);
  });

  it("resolves crop or legacy art for all 722 cards of the real dataset", async () => {
    const catalogResult = await getLibraryCatalog();
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const missing = catalogResult.value.listing
      .listAll()
      .map((card) => card.numero)
      .filter(
        (numero) =>
          catalogResult.value.cropArtLookup(numero).kind !== "art" &&
          catalogResult.value.artLookup(numero).kind !== "art",
      );
    expect(missing).toEqual([]);
  });

  it("does not expose card attributes on any locked entry of the real dataset", async () => {
    const result = await loadLibraryFor(playerB.client, playerB.playerId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const entry of result.value.index.entries) {
      expect(entry).not.toHaveProperty("card");
    }
  });

  it("returns collectionOrigin cache when the network is unavailable", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    try {
      const cache = createIndexedDbCollectionCache();
      await cache.saveSnapshot({
        playerId: fresh.playerId,
        entries: { "001": 1 },
        syncedAt: "2026-07-27T12:00:00.000Z",
      });

      const unavailableRepository: CollectionRepository = async () =>
        err(new DomainError("network down", "collection_unavailable"));

      const result = await loadLibrary({
        getCatalog: getLibraryCatalog,
        loadCollection: () =>
          loadCollection({
            playerId: fresh.playerId,
            repository: unavailableRepository,
            cache,
            clock: { now: () => new Date() },
          }),
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.collectionOrigin).toBe("cache");
    } finally {
      await cleanupPlayer(admin, fresh.playerId);
    }
  });

  it("reload reflects a card inserted into collections between two reads", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    try {
      const first = await loadLibraryFor(fresh.client, fresh.playerId);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.value.index.byCardNumber.get("005")?.obtained).toBe(false);

      await admin
        .from("collections")
        .insert([{ player_id: fresh.playerId, numero: "005", quantity: 1 }]);

      const second = await loadLibraryFor(fresh.client, fresh.playerId);
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.value.index.byCardNumber.get("005")?.obtained).toBe(true);
    } finally {
      await cleanupPlayer(admin, fresh.playerId);
    }
  });

  it("loadLibrary for player A does not see player B's obtained cards", async () => {
    const result = await loadLibraryFor(playerB.client, playerB.playerId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.index.byCardNumber.get("001")?.obtained).toBe(false);
  });

  it("never emits a write to collections", async () => {
    const before = await admin
      .from("collections")
      .select("numero,quantity")
      .eq("player_id", playerA.playerId);

    await loadLibraryFor(playerA.client, playerA.playerId);

    const after = await admin
      .from("collections")
      .select("numero,quantity")
      .eq("player_id", playerA.playerId);
    expect(after.data).toEqual(before.data);
  });
});
