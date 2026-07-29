import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Requires a Supabase instance (local via `supabase start`, or a real
 * project) with every migration under `supabase/migrations/` applied,
 * including `0007_create_rpc_save_active_deck.sql`, plus `SUPABASE_URL`,
 * `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` in the environment —
 * the same three `reward.integration.test.ts`/`collection.integration.test.ts`
 * read. Skips cleanly (skill soft-fail rule for external test dependencies)
 * whenever those three aren't set. Confirmed green against the project's real
 * test Supabase instance (2026-07-29).
 */
const SUPABASE_URL = process.env["SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON_KEY = process.env["SUPABASE_ANON_KEY"];
const hasSupabaseEnv = SUPABASE_URL !== undefined && SERVICE_ROLE_KEY !== undefined && ANON_KEY !== undefined;

/** The 14 card numbers every seeded test collection owns 3 copies of. */
const DECK_CARD_POOL = Array.from({ length: 14 }, (_, index) => String(index + 1).padStart(3, "0"));

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

async function seedFullPoolCollection(admin: SupabaseClient, playerId: string): Promise<void> {
  const rows = DECK_CARD_POOL.map((numero) => ({ player_id: playerId, numero, quantity: 3 }));
  const { error } = await admin.from("collections").insert(rows);
  if (error) {
    throw new Error(`failed to seed collection: ${error.message}`);
  }
}

async function cleanupPlayer(admin: SupabaseClient, playerId: string): Promise<void> {
  await admin.from("active_decks").delete().eq("player_id", playerId);
  await admin.from("collections").delete().eq("player_id", playerId);
  await admin.auth.admin.deleteUser(playerId);
}

/**
 * 13 of the 14 pool cards at 3 copies, the 14th (`singleCopyCard`) at 1 copy
 * — sums to exactly 40, structurally valid, and within the 3-per-card
 * ownership every test player is seeded with.
 */
function deckComposition(singleCopyCard: string): Record<string, number> {
  const composition: Record<string, number> = {};
  for (const numero of DECK_CARD_POOL) {
    composition[numero] = numero === singleCopyCard ? 1 : 3;
  }
  return composition;
}

describe.skipIf(!hasSupabaseEnv)("build-deck/F07 save_active_deck RPC against a real Supabase instance", () => {
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
    await seedFullPoolCollection(admin, playerA.playerId);
    await seedFullPoolCollection(admin, playerB.playerId);
  });

  afterAll(async () => {
    await cleanupPlayer(admin, playerA.playerId);
    await cleanupPlayer(admin, playerB.playerId);
  });

  it("save_active_deck refuses cards whose total differs from forty", async () => {
    const incomplete = deckComposition("014");
    delete incomplete["014"];

    const { data, error } = await admin.rpc("save_active_deck", {
      p_player_id: playerA.playerId,
      p_cards: incomplete,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/invalid deck/i);
    expect(data).toBeNull();

    const { data: row } = await admin
      .from("active_decks")
      .select("player_id")
      .eq("player_id", playerA.playerId)
      .maybeSingle();
    expect(row).toBeNull();
  });

  it("save_active_deck refuses a card quantity beyond what the player owns in collections", async () => {
    const overOwned = deckComposition("014");
    delete overOwned["014"];
    overOwned["999"] = 1;

    const { data, error } = await admin.rpc("save_active_deck", {
      p_player_id: playerA.playerId,
      p_cards: overOwned,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/exceeds owned quantity/i);
    expect(data).toBeNull();
  });

  it("save_active_deck upserts active_decks, overwriting the existing row under the same primary key", async () => {
    const first = deckComposition("014");
    const { error: firstError } = await admin.rpc("save_active_deck", {
      p_player_id: playerA.playerId,
      p_cards: first,
    });
    expect(firstError).toBeNull();

    const second = deckComposition("001");
    const { data, error: secondError } = await admin.rpc("save_active_deck", {
      p_player_id: playerA.playerId,
      p_cards: second,
    });
    expect(secondError).toBeNull();
    const row = Array.isArray(data) ? data[0] : data;
    expect(row?.updated_at).toBeTruthy();

    const { data: rows } = await admin
      .from("active_decks")
      .select("player_id,cards")
      .eq("player_id", playerA.playerId);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.cards).toEqual(second);
  });

  it("the authenticated role can execute save_active_deck directly under its own session", async () => {
    const { data, error } = await playerA.client.rpc("save_active_deck", {
      p_player_id: playerA.playerId,
      p_cards: deckComposition("014"),
    });
    expect(error).toBeNull();
    const row = Array.isArray(data) ? data[0] : data;
    expect(row?.updated_at).toBeTruthy();
  });

  it("the authenticated role cannot execute save_active_deck for another player's p_player_id", async () => {
    const forged = deckComposition("002");

    const { data, error } = await playerB.client.rpc("save_active_deck", {
      p_player_id: playerA.playerId,
      p_cards: forged,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/permission denied/i);
    expect(data).toBeNull();

    const { data: row } = await admin
      .from("active_decks")
      .select("cards")
      .eq("player_id", playerA.playerId)
      .maybeSingle();
    expect(row?.cards).not.toEqual(forged);
  });
});
