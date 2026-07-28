import "fake-indexeddb/auto";

import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createIndexedDbCollectionCache } from "../src/lib/collection/indexeddb-cache.ts";
import { loadCollection } from "../src/lib/collection/load-collection.ts";
import { createSupabaseCollectionRepository } from "../src/lib/collection/supabase-repository.ts";

/**
 * Requires a Supabase instance (local via `supabase start`, or a real
 * project) with every migration under `supabase/migrations/` applied, plus
 * `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` in the
 * environment. Confirmed green against the project's real test Supabase
 * instance (2026-07-28); skips cleanly (skill soft-fail rule for external
 * test dependencies) whenever those three aren't set, e.g. a fresh clone
 * with no `.env.local`.
 */
const SUPABASE_URL = process.env["SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON_KEY = process.env["SUPABASE_ANON_KEY"];
const hasSupabaseEnv = SUPABASE_URL !== undefined && SERVICE_ROLE_KEY !== undefined && ANON_KEY !== undefined;

async function createTestUserClient(admin: SupabaseClient, url: string, anonKey: string): Promise<{
  client: SupabaseClient;
  playerId: string;
}> {
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

describe.skipIf(!hasSupabaseEnv)("collections against a real local Supabase instance", () => {
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

    await admin
      .from("collections")
      .insert([{ player_id: playerA.playerId, numero: "001", quantity: 3 }]);
  });

  afterAll(async () => {
    await admin.from("collections").delete().eq("player_id", playerA.playerId);
    await admin.from("collections").delete().eq("player_id", playerB.playerId);
    await admin.auth.admin.deleteUser(playerA.playerId);
    await admin.auth.admin.deleteUser(playerB.playerId);
  });

  it("migration creates collections with a composite primary key of player_id and numero", async () => {
    const { error } = await admin
      .from("collections")
      .insert([{ player_id: playerA.playerId, numero: "001", quantity: 1 }]);
    expect(error).not.toBeNull();
  });

  it("collections rejects a negative quantity via the constraint", async () => {
    const { error } = await admin
      .from("collections")
      .insert([{ player_id: playerA.playerId, numero: "999", quantity: -1 }]);
    expect(error).not.toBeNull();
  });

  it("collections rejects a numero outside the three-digit format via the constraint", async () => {
    const { error } = await admin
      .from("collections")
      .insert([{ player_id: playerA.playerId, numero: "1", quantity: 1 }]);
    expect(error).not.toBeNull();
  });

  it("collections rejects a second row with the same player_id and numero pair", async () => {
    const { error } = await admin
      .from("collections")
      .insert([{ player_id: playerA.playerId, numero: "001", quantity: 1 }]);
    expect(error).not.toBeNull();
  });

  it("RLS prevents player A from reading player B's rows", async () => {
    const { data, error } = await playerB.client
      .from("collections")
      .select("player_id,numero,quantity,updated_at")
      .eq("player_id", playerA.playerId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("RLS refuses a direct client insert into the collections table", async () => {
    const { error } = await playerA.client
      .from("collections")
      .insert([{ player_id: playerA.playerId, numero: "555", quantity: 1 }]);
    expect(error).not.toBeNull();
  });

  it("removing the user from auth.users cascades to their collections rows", async () => {
    const { client, playerId } = await createTestUserClient(admin, url, anonKey);
    await admin.from("collections").insert([{ player_id: playerId, numero: "010", quantity: 1 }]);

    await admin.auth.admin.deleteUser(playerId);

    const { data } = await admin.from("collections").select("numero").eq("player_id", playerId);
    expect(data).toEqual([]);
    await client.auth.signOut();
  });

  it("loadCollection against the real database returns the authenticated player's rows", async () => {
    const result = await loadCollection({
      playerId: playerA.playerId,
      repository: createSupabaseCollectionRepository(playerA.client),
      cache: createIndexedDbCollectionCache(),
      clock: { now: () => new Date() },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origin).toBe("server");
    expect(result.value.collection.get("001")).toBe(3);
  });

  it("loadCollection against the real database writes and reads back the IndexedDB snapshot", async () => {
    const cache = createIndexedDbCollectionCache();
    await loadCollection({
      playerId: playerA.playerId,
      repository: createSupabaseCollectionRepository(playerA.client),
      cache,
      clock: { now: () => new Date() },
    });

    const snapshot = await cache.loadSnapshot(playerA.playerId);
    expect(snapshot?.entries["001"]).toBe(3);
  });

  it("loadCollection proceeds with origin server when IndexedDB is unavailable", async () => {
    const unavailableCache = {
      loadSnapshot: async () => {
        throw new Error("IndexedDB unavailable in this context");
      },
      saveSnapshot: async () => {
        throw new Error("IndexedDB unavailable in this context");
      },
    };

    const result = await loadCollection({
      playerId: playerA.playerId,
      repository: createSupabaseCollectionRepository(playerA.client),
      cache: unavailableCache,
      clock: { now: () => new Date() },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origin).toBe("server");
  });
});
