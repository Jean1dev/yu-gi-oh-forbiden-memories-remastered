import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Requires a Supabase instance (local via `supabase start`, or a real
 * project) with every migration under `supabase/migrations/` applied,
 * including `0005_create_reward_ledger.sql`, plus `SUPABASE_URL`,
 * `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` in the environment —
 * the same three `collection.integration.test.ts` reads. Skips cleanly
 * (skill soft-fail rule for external test dependencies) whenever those three
 * aren't set. Confirmed green against the project's real test Supabase
 * instance (2026-07-28).
 */
const SUPABASE_URL = process.env["SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON_KEY = process.env["SUPABASE_ANON_KEY"];
const hasSupabaseEnv = SUPABASE_URL !== undefined && SERVICE_ROLE_KEY !== undefined && ANON_KEY !== undefined;

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
  await admin.from("reward_ledger").delete().eq("player_id", playerId);
  await admin.from("collections").delete().eq("player_id", playerId);
  await admin.auth.admin.deleteUser(playerId);
}

describe.skipIf(!hasSupabaseEnv)("build-deck/F03 reward ledger against a real Supabase instance", () => {
  const url = SUPABASE_URL as string;
  const serviceRoleKey = SERVICE_ROLE_KEY as string;
  const anonKey = ANON_KEY as string;

  let admin: SupabaseClient;
  let playerA: { client: SupabaseClient; playerId: string };

  beforeAll(async () => {
    admin = createClient(url, serviceRoleKey);
    playerA = await createTestUserClient(admin, url, anonKey);
  });

  afterAll(async () => {
    await cleanupPlayer(admin, playerA.playerId);
  });

  it("migration creates reward_ledger with duel_id as primary key", async () => {
    const duelId = `test:${randomUUID()}`;
    const { error: first } = await admin
      .from("reward_ledger")
      .insert([{ duel_id: duelId, player_id: playerA.playerId, card_numero: "001" }]);
    expect(first).toBeNull();

    const { error: second } = await admin
      .from("reward_ledger")
      .insert([{ duel_id: duelId, player_id: playerA.playerId, card_numero: "002" }]);
    expect(second).not.toBeNull();
  });

  it("RLS refuses a direct client insert into reward_ledger", async () => {
    const { error } = await playerA.client
      .from("reward_ledger")
      .insert([{ duel_id: `test:${randomUUID()}`, player_id: playerA.playerId, card_numero: "001" }]);
    expect(error).not.toBeNull();
  });

  it("apply_card_reward inserts reward_ledger and increments collections in the same transaction", async () => {
    const duelId = `test:${randomUUID()}`;
    const { data, error } = await admin.rpc("apply_card_reward", {
      p_player_id: playerA.playerId,
      p_duel_id: duelId,
      p_card_numero: "003",
    });
    expect(error).toBeNull();
    const row = Array.isArray(data) ? data[0] : data;
    expect(row?.applied).toBe(true);
    expect(row?.current_quantity).toBe(1);

    const { data: ledgerRow } = await admin
      .from("reward_ledger")
      .select("player_id,card_numero")
      .eq("duel_id", duelId)
      .single();
    expect(ledgerRow?.card_numero).toBe("003");

    const { data: collectionRow } = await admin
      .from("collections")
      .select("quantity")
      .eq("player_id", playerA.playerId)
      .eq("numero", "003")
      .single();
    expect(collectionRow?.quantity).toBe(1);
  });

  it("apply_card_reward called twice with the same duel_id increments collections only once", async () => {
    const duelId = `test:${randomUUID()}`;
    const first = await admin.rpc("apply_card_reward", {
      p_player_id: playerA.playerId,
      p_duel_id: duelId,
      p_card_numero: "004",
    });
    const second = await admin.rpc("apply_card_reward", {
      p_player_id: playerA.playerId,
      p_duel_id: duelId,
      p_card_numero: "004",
    });

    const firstRow = Array.isArray(first.data) ? first.data[0] : first.data;
    const secondRow = Array.isArray(second.data) ? second.data[0] : second.data;
    expect(firstRow?.applied).toBe(true);
    expect(secondRow?.applied).toBe(false);
    expect(secondRow?.current_quantity).toBe(1);

    const { data: collectionRow } = await admin
      .from("collections")
      .select("quantity")
      .eq("player_id", playerA.playerId)
      .eq("numero", "004")
      .single();
    expect(collectionRow?.quantity).toBe(1);
  });

  it("apply_card_reward for a card not yet owned creates the collections row with quantity one", async () => {
    const duelId = `test:${randomUUID()}`;
    const { data } = await admin.rpc("apply_card_reward", {
      p_player_id: playerA.playerId,
      p_duel_id: duelId,
      p_card_numero: "005",
    });
    const row = Array.isArray(data) ? data[0] : data;
    expect(row?.current_quantity).toBe(1);
  });

  it("the authenticated role can execute apply_card_reward directly under its own session", async () => {
    const duelId = `test:${randomUUID()}`;
    const { data, error } = await playerA.client.rpc("apply_card_reward", {
      p_player_id: playerA.playerId,
      p_duel_id: duelId,
      p_card_numero: "006",
    });
    expect(error).toBeNull();
    const row = Array.isArray(data) ? data[0] : data;
    expect(row?.applied).toBe(true);
  });

  it("removing the user from auth.users cascades to their reward_ledger rows", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    const duelId = `test:${randomUUID()}`;
    await admin.rpc("apply_card_reward", {
      p_player_id: fresh.playerId,
      p_duel_id: duelId,
      p_card_numero: "007",
    });

    await admin.auth.admin.deleteUser(fresh.playerId);

    const { data } = await admin.from("reward_ledger").select("duel_id").eq("player_id", fresh.playerId);
    expect(data).toEqual([]);
  });
});
