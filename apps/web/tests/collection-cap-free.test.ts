import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("password redemption collection", () => {
  it("does not apply a copy ceiling", async () => {
    const migration = await readFile(resolve("../../supabase/migrations/0010_create_card_prices_and_password_releases.sql"), "utf8");
    expect(migration).toContain("quantity=public.collections.quantity+1");
    expect(migration).not.toMatch(/least\s*\(/i);
  });
});
