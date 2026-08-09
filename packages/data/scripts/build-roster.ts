import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import {
  DomainError,
  err,
  ok,
  type DropTier,
  type Duelist,
  type Result,
  type Roster,
} from "@yugioh/shared";

import {
  deriveNpcDeck,
  totalPoolWeight,
  POOL_WEIGHT_TOTAL,
} from "../src/roster/derive-npc-deck.ts";
import { createMulberry32 } from "../src/roster/deterministic-random.ts";
import { DuelistSourceSchema, type DuelistSource } from "../src/roster/duelist-source.ts";

/**
 * Composes `data/roster.json` out of every `data/duelists/*.json`.
 *
 * The roster is a generated file with hand-authored inputs: adding a duelist
 * means dropping a source file in and re-running this, never editing the
 * roster by hand and never touching code (`free-duel` F01 — "adicionar um novo
 * duelista é uma edição de dados"). Each duelist's 40 cards are derived from
 * its weighted pool with its recorded seed, so the same inputs always produce
 * the same roster and the deck stays reviewable in a diff.
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DUELISTS_DIR = join(PACKAGE_ROOT, "data", "duelists");
const ROSTER_FILE = join(PACKAGE_ROOT, "data", "roster.json");
const ROSTER_VERSION = "1.2.0";

async function readSource(path: string): Promise<Result<DuelistSource, DomainError>> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    return err(
      new DomainError("Duelist source is unreadable.", "invalid_duelist_source", { path }),
    );
  }

  const parsed = DuelistSourceSchema.safeParse(raw);
  return parsed.success
    ? ok(parsed.data)
    : err(
        new DomainError("Duelist source failed its schema.", "invalid_duelist_source", {
          path,
          issues: parsed.error.issues,
        }),
      );
}

/**
 * Turns one source pool into a roster drop tier, keeping the original's
 * per-card chances out of `POOL_WEIGHT_TOTAL`.
 *
 * A card can appear more than once in the source entries; the weights are
 * summed so the tier lists each card once with its total chance, which is what
 * a weighted draw needs.
 */
export function toDropTier(pool: DuelistSource["dropPools"][number]): DropTier {
  const weights: Record<string, number> = {};
  for (const entry of pool.entries) {
    weights[entry.cardNumber] = (weights[entry.cardNumber] ?? 0) + entry.weight;
  }

  return {
    tier: pool.tier,
    cardNumbers: Object.keys(weights) as DropTier["cardNumbers"],
    weights,
  };
}

export function toDuelist(source: DuelistSource): Result<Duelist, DomainError> {
  const deck =
    source.deckPool === undefined
      ? ok(source.deck ?? [])
      : deriveNpcDeck(source.deckPool, createMulberry32(source.deckSeed ?? 0));
  if (!deck.ok) {
    return deck;
  }

  return ok({
    id: source.id,
    name: source.name,
    portrait: source.portrait,
    difficulty: source.difficulty,
    profile: source.profile,
    deck: deck.value,
    // The rating engine picks the *tier* (rating-engine/F03); which card falls
    // inside it is still a weighted draw, so the original's per-card chances
    // out of 2048 travel with the pool instead of being dropped here.
    dropPool: source.dropPools.map(toDropTier),
  });
}

export async function buildRoster(): Promise<Result<Roster, DomainError>> {
  let files: readonly string[];
  try {
    files = (await readdir(DUELISTS_DIR)).filter((file) => file.endsWith(".json")).sort();
  } catch {
    return err(
      new DomainError("The duelists directory is unavailable.", "artifact_missing", {
        path: DUELISTS_DIR,
      }),
    );
  }

  const duelists: Duelist[] = [];
  for (const file of files) {
    const source = await readSource(join(DUELISTS_DIR, file));
    if (!source.ok) {
      return source;
    }

    const weight = totalPoolWeight(source.value.deckPool ?? []);
    if (source.value.deckPool !== undefined && weight !== POOL_WEIGHT_TOTAL) {
      console.warn(
        `${source.value.id}: deck pool weighs ${String(weight)}, not ${String(POOL_WEIGHT_TOTAL)} — rolls past the end are skipped.`,
      );
    }

    // Same check for the drop tiers: the original's chances are out of 2048, so
    // a tier that weighs anything else is a transcription slip in the source.
    for (const pool of source.value.dropPools) {
      const tierWeight = totalPoolWeight(pool.entries);
      if (tierWeight !== POOL_WEIGHT_TOTAL) {
        console.warn(
          `${source.value.id}: drop tier "${pool.tier}" weighs ${String(tierWeight)}, not ${String(POOL_WEIGHT_TOTAL)}.`,
        );
      }
    }

    const duelist = toDuelist(source.value);
    if (!duelist.ok) {
      return duelist;
    }
    duelists.push(duelist.value);
  }

  return ok({ rosterVersion: ROSTER_VERSION, duelists });
}

async function main(): Promise<number> {
  const roster = await buildRoster();
  if (!roster.ok) {
    console.error(`Roster build failed (${roster.error.code}): ${roster.error.message}`);
    console.error(JSON.stringify(roster.error.details, null, 2));
    return 1;
  }

  await writeFile(ROSTER_FILE, `${JSON.stringify(roster.value, null, 2)}\n`, "utf8");
  for (const duelist of roster.value.duelists) {
    const distinct = new Set(duelist.deck).size;
    console.log(
      `${duelist.id}: ${String(duelist.deck.length)} cards (${String(distinct)} distinct), ` +
        `${String(duelist.dropPool.length)} drop tiers, strategy "${duelist.profile.strategy}".`,
    );
  }
  console.log(`Wrote ${String(roster.value.duelists.length)} duelists to data/roster.json.`);
  return 0;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await main();
}
