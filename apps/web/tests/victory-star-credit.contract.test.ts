import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const rewardRoot = new URL("../src/lib/reward/", import.meta.url);
const grantPath = new URL("../src/lib/free-duel/grant-victory-reward.ts", import.meta.url);
const handlerPath = new URL("../src/lib/reward/apply-victory-reward.ts", import.meta.url);
const migrationPath = new URL("../../../supabase/migrations/0008_create_wallets_and_apply_victory_reward.sql", import.meta.url);

describe("password/F02 victory star credit contracts", () => {
  it("forwards stars from the validated event without a local reward constant", async () => {
    const [grant, handler] = await Promise.all([readFile(grantPath, "utf8"), readFile(handlerPath, "utf8")]);
    expect(grant).toContain("stars: result.rating.reward.stars");
    expect(handler).toContain("apply(playerId, duelId, cardNumber, stars)");
    expect(`${grant}\n${handler}`).not.toMatch(/(?:REWARD|VICTORY)_STARS\s*=\s*\d/);
  });

  it("keeps apply_victory_reward as the atomic wallet writer in the victory path", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toMatch(/insert into public\.reward_ledger[\s\S]*insert into public\.collections[\s\S]*insert into public\.wallets/);
    expect(migration).toContain("on conflict (duel_id) do nothing");
    expect(await readFile(handlerPath, "utf8")).not.toMatch(/\.from\(["']wallets["']\)/);
  });

  it("keeps the economy handler independent from duel, engine, ai, server-only and Node modules", async () => {
    const files = (await readdir(rewardRoot)).filter((name) => name.endsWith(".ts") && !name.includes(".test."));
    const sources = await Promise.all(files.map((name) => readFile(join(rewardRoot.pathname, name), "utf8")));
    const imports = sources.flatMap((source) => source.match(/^import .*$/gm) ?? []);
    expect(imports).not.toEqual(expect.arrayContaining([
      expect.stringMatching(/lib\/free-duel|@yugioh\/engine|@yugioh\/ai|lib\/server|["']node:/),
    ]));
  });
});
