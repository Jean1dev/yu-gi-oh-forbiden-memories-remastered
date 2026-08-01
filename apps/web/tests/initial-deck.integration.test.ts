import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadCatalogAndPool } from "../src/lib/initial-deck/catalog-adapter.ts";
import { createCryptoRandomSource } from "../src/lib/initial-deck/crypto-random-source.ts";
import { ensureDuelEntry } from "../src/lib/initial-deck/ensure-duel-entry.ts";
import { ensureInitialDeck } from "../src/lib/initial-deck/ensure-initial-deck.ts";
import { onAccountCreated } from "../src/lib/initial-deck/on-account-created.ts";
import { createSupabaseInitialDeckRepository } from "../src/lib/initial-deck/supabase-repository.ts";

/**
 * Requires a Supabase instance (local via `supabase start`, or a real
 * project) with every migration under `supabase/migrations/` applied,
 * including `0004_create_active_decks_and_rpc_persist_initial_deck.sql`,
 * plus `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` in
 * the environment — the same three `collection.integration.test.ts` reads.
 * `onAccountCreated`/`ensureDuelEntry` build their own service-role client
 * from these same variable names, so no extra wiring is needed here. Skips
 * cleanly (skill soft-fail rule for external test dependencies) whenever
 * those three aren't set. Confirmed green against the project's real test
 * Supabase instance (2026-07-28).
 */
const SUPABASE_URL = process.env["SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON_KEY = process.env["SUPABASE_ANON_KEY"];
const hasSupabaseEnv = SUPABASE_URL !== undefined && SERVICE_ROLE_KEY !== undefined && ANON_KEY !== undefined;

function fortyCardDeck(): Record<string, number> {
  const cards: Record<string, number> = {};
  for (let i = 1; i <= 13; i += 1) {
    cards[String(i).padStart(3, "0")] = 3;
  }
  cards["014"] = 1;
  return cards;
}

async function createTestUserClient(
  admin: SupabaseClient,
  url: string,
  anonKey: string,
): Promise<{ client: SupabaseClient; playerId: string }> {
  const email = `${randomUUID()}@example.com`;
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
  await admin.from("active_decks").delete().eq("player_id", playerId);
  await admin.from("collections").delete().eq("player_id", playerId);
  await admin.auth.admin.deleteUser(playerId);
}

describe.skipIf(!hasSupabaseEnv)("build-deck/F02 initial deck against a real Supabase instance", () => {
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

    const { error } = await admin.rpc("persist_initial_deck", {
      p_player_id: playerA.playerId,
      p_cards: fortyCardDeck(),
    });
    if (error) {
      throw new Error(`failed to seed playerA's active deck: ${error.message}`);
    }
  });

  afterAll(async () => {
    await cleanupPlayer(admin, playerA.playerId);
    await cleanupPlayer(admin, playerB.playerId);
  });

  it("migration creates active_decks with a primary key on player_id", async () => {
    const { error } = await admin
      .from("active_decks")
      .insert([{ player_id: playerA.playerId, cards: fortyCardDeck() }]);
    expect(error).not.toBeNull();
  });

  it("RLS lets the player read only their own row in active_decks", async () => {
    const { data, error } = await playerB.client
      .from("active_decks")
      .select("player_id,cards")
      .eq("player_id", playerA.playerId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("RLS exposes no insert or update policy for the client on active_decks", async () => {
    const insertAttempt = await playerA.client
      .from("active_decks")
      .insert([{ player_id: playerA.playerId, cards: fortyCardDeck() }]);
    expect(insertAttempt.error).not.toBeNull();

    const updateAttempt = await playerA.client
      .from("active_decks")
      .update({ cards: fortyCardDeck() })
      .eq("player_id", playerA.playerId);
    expect(updateAttempt.error).not.toBeNull();
  });

  it("the authenticated role cannot execute persist_initial_deck directly", async () => {
    const { error } = await playerA.client.rpc("persist_initial_deck", {
      p_player_id: playerA.playerId,
      p_cards: fortyCardDeck(),
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/permission denied/i);
  });

  it("persist_initial_deck refuses a payload whose card total differs from forty", async () => {
    const { error } = await admin.rpc("persist_initial_deck", {
      p_player_id: randomUUID(),
      p_cards: { "001": 3 },
    });
    expect(error).not.toBeNull();
  });

  it("persist_initial_deck refuses a payload with more than three copies of one card", async () => {
    const deck = fortyCardDeck();
    deck["001"] = 4;
    const { error } = await admin.rpc("persist_initial_deck", {
      p_player_id: randomUUID(),
      p_cards: deck,
    });
    expect(error).not.toBeNull();
  });

  it("persist_initial_deck writes active_decks and collections in the same transaction", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    try {
      const deck = fortyCardDeck();
      const { data, error } = await admin.rpc("persist_initial_deck", {
        p_player_id: fresh.playerId,
        p_cards: deck,
      });
      expect(error).toBeNull();
      expect(data?.[0]?.created_now).toBe(true);

      const { data: deckRow } = await admin
        .from("active_decks")
        .select("cards")
        .eq("player_id", fresh.playerId)
        .single();
      expect(deckRow?.cards).toEqual(deck);

      const { data: collectionRows } = await admin
        .from("collections")
        .select("numero,quantity")
        .eq("player_id", fresh.playerId);
      const total = (collectionRows ?? []).reduce((sum, row) => sum + row.quantity, 0);
      expect(total).toBe(40);
    } finally {
      await cleanupPlayer(admin, fresh.playerId);
    }
  });

  it("persist_initial_deck is a no-op when called twice for the same player_id", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    try {
      const deck = fortyCardDeck();
      const first = await admin.rpc("persist_initial_deck", { p_player_id: fresh.playerId, p_cards: deck });
      const second = await admin.rpc("persist_initial_deck", {
        p_player_id: fresh.playerId,
        p_cards: deck,
      });

      expect(first.data?.[0]?.created_now).toBe(true);
      expect(second.data?.[0]?.created_now).toBe(false);
      expect(second.data?.[0]?.cards).toEqual(deck);

      const { data: rows } = await admin.from("active_decks").select("player_id").eq("player_id", fresh.playerId);
      expect(rows).toHaveLength(1);
    } finally {
      await cleanupPlayer(admin, fresh.playerId);
    }
  });

  it("persist_initial_deck sums onto the existing quantity in collections instead of overwriting", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    try {
      await admin.from("collections").insert([{ player_id: fresh.playerId, numero: "001", quantity: 2 }]);

      const deck = fortyCardDeck();
      await admin.rpc("persist_initial_deck", { p_player_id: fresh.playerId, p_cards: deck });

      const { data: row } = await admin
        .from("collections")
        .select("quantity")
        .eq("player_id", fresh.playerId)
        .eq("numero", "001")
        .single();
      expect(row?.quantity).toBe(2 + (deck["001"] as number));
    } finally {
      await cleanupPlayer(admin, fresh.playerId);
    }
  });

  it("removing the user from auth.users cascades to their active_decks row", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    await admin.rpc("persist_initial_deck", { p_player_id: fresh.playerId, p_cards: fortyCardDeck() });

    await admin.auth.admin.deleteUser(fresh.playerId);

    const { data } = await admin.from("active_decks").select("player_id").eq("player_id", fresh.playerId);
    expect(data).toEqual([]);
  });

  it("ensureInitialDeck against the real database persists a valid deck readable through RLS", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    try {
      const result = await ensureInitialDeck({
        playerId: fresh.playerId,
        repository: createSupabaseInitialDeckRepository(admin),
        randomSource: createCryptoRandomSource(),
        loadCatalog: loadCatalogAndPool,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.createdNow).toBe(true);
      const total = [...result.value.deck.values()].reduce((sum, quantity) => sum + quantity, 0);
      expect(total).toBe(40);

      const { data, error } = await fresh.client
        .from("active_decks")
        .select("player_id,cards")
        .eq("player_id", fresh.playerId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    } finally {
      await cleanupPlayer(admin, fresh.playerId);
    }
  });

  it("onAccountCreated is an observable no-op on the second call with the same playerId", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    try {
      const first = await onAccountCreated(fresh.playerId);
      const second = await onAccountCreated(fresh.playerId);

      expect(first.ok && second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.value.initialDeck.createdNow).toBe(true);
      expect(second.value.initialDeck.createdNow).toBe(false);
      expect(first.value.wallet).toEqual({ stars: 0, createdNow: true });
      expect(second.value.wallet).toEqual({ stars: 0, createdNow: false });
      expect([...second.value.initialDeck.deck.entries()].sort()).toEqual(
        [...first.value.initialDeck.deck.entries()].sort(),
      );
      const { data: wallet, error } = await fresh.client
        .from("wallets")
        .select("player_id,stars")
        .eq("player_id", fresh.playerId)
        .single();
      expect(error).toBeNull();
      expect(wallet).toEqual({ player_id: fresh.playerId, stars: 0 });
    } finally {
      await cleanupPlayer(admin, fresh.playerId);
    }
  });

  it("ensureDuelEntry returns the existing deck without regenerating it when active_decks already exists", async () => {
    const result = await ensureDuelEntry(playerA.playerId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const total = [...result.value.values()].reduce((sum, quantity) => sum + quantity, 0);
    expect(total).toBe(40);
  });

  it("ensureDuelEntry calls ensureInitialDeck when active_decks is absent", async () => {
    const fresh = await createTestUserClient(admin, url, anonKey);
    try {
      const { data: before } = await admin
        .from("active_decks")
        .select("player_id")
        .eq("player_id", fresh.playerId);
      expect(before).toEqual([]);

      const result = await ensureDuelEntry(fresh.playerId);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const total = [...result.value.values()].reduce((sum, quantity) => sum + quantity, 0);
      expect(total).toBe(40);

      const { data: after } = await admin
        .from("active_decks")
        .select("player_id")
        .eq("player_id", fresh.playerId);
      expect(after).toHaveLength(1);
    } finally {
      await cleanupPlayer(admin, fresh.playerId);
    }
  });
});
