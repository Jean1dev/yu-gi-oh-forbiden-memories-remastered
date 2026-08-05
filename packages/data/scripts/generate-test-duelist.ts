import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DomainError,
  MAX_COPIES_PER_CARD,
  REQUIRED_DECK_SIZE,
  err,
  ok,
  type Card,
  type CardNumber,
  type Duelist,
  type Result,
} from "@yugioh/shared";

import { createMulberry32 } from "../src/roster/deterministic-random.ts";
import type { DuelistSource } from "../src/roster/duelist-source.ts";
import { loadCatalogFromDisk } from "./load-catalog-from-disk.ts";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SEED = 20260801;
const TEST_DUELIST_ID = "test-duelist";
const TEST_DUELIST_DROP_TIER = "common";
const MONSTER_CARD_COUNT = 34;
const SUPPORT_CARD_COUNT = REQUIRED_DECK_SIZE - MONSTER_CARD_COUNT;
const DROP_POOL_SIZE = 8;

export type BuildTestDuelistOptions = Readonly<{
  seed: number;
}>;

function compareByNumero(left: Card, right: Card): number {
  return left.numero.localeCompare(right.numero);
}

function drawCards(
  pool: readonly Card[],
  count: number,
  random: () => number,
  copyCounts: Map<CardNumber, number>,
): Result<CardNumber[], DomainError> {
  const deck: CardNumber[] = [];
  let attempts = 0;
  const maxAttempts = Math.max(pool.length * MAX_COPIES_PER_CARD * 8, count * 16);

  while (deck.length < count && attempts < maxAttempts) {
    attempts += 1;
    const card = pool[Math.floor(random() * pool.length)];
    if (card === undefined) {
      break;
    }

    const currentCopies = copyCounts.get(card.numero) ?? 0;
    if (currentCopies >= MAX_COPIES_PER_CARD) {
      continue;
    }

    copyCounts.set(card.numero, currentCopies + 1);
    deck.push(card.numero);
  }

  if (deck.length !== count) {
    return err(
      new DomainError("Not enough distinct cards to build the test duelist deck.", "catalog_insufficient", {
        requested: count,
        available: pool.length,
      }),
    );
  }

  return ok(deck);
}

function shuffleDeck(deck: readonly CardNumber[], random: () => number): CardNumber[] {
  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index]!;
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

function pickDropPool(deck: readonly CardNumber[]): readonly CardNumber[] {
  return [...new Set(deck)].slice(0, DROP_POOL_SIZE);
}

export function buildTestDuelist(
  cards: readonly Card[],
  options: BuildTestDuelistOptions,
): Result<Duelist, DomainError> {
  const monsterCards = cards
    .filter((card) => card.tipo === "monstro" || card.tipo === "ritual")
    .sort(compareByNumero);
  const supportCards = cards
    .filter((card) => card.tipo !== "monstro" && card.tipo !== "ritual")
    .sort(compareByNumero);

  if (monsterCards.length === 0 || supportCards.length === 0) {
    return err(
      new DomainError("Catalog does not have enough card types for the test duelist.", "catalog_insufficient", {
        monsters: monsterCards.length,
        support: supportCards.length,
      }),
    );
  }

  const random = createMulberry32(options.seed);
  const copyCounts = new Map<CardNumber, number>();
  const monsters = drawCards(monsterCards, MONSTER_CARD_COUNT, random, copyCounts);
  if (!monsters.ok) {
    return monsters;
  }
  const support = drawCards(supportCards, SUPPORT_CARD_COUNT, random, copyCounts);
  if (!support.ok) {
    return support;
  }

  const deck = shuffleDeck([...monsters.value, ...support.value], random);
  const dropPoolCards = pickDropPool(deck);
  if (dropPoolCards.length === 0) {
    return err(new DomainError("Generated test duelist drop pool is empty.", "empty_drop_tier"));
  }

  return ok({
    id: TEST_DUELIST_ID,
    name: "Duelista de Teste",
    portrait: "cards-data/001.jpg",
    difficulty: "easy",
    profile: { strategy: "passive", parameters: {} },
    deck,
    dropPool: [{ tier: TEST_DUELIST_DROP_TIER, cardNumbers: dropPoolCards }],
  });
}

function parseSeed(argv: readonly string[]): number {
  const seedArg = argv.find((arg) => arg.startsWith("--seed="));
  if (seedArg === undefined) {
    return DEFAULT_SEED;
  }

  const seed = Number(seedArg.slice("--seed=".length));
  return Number.isInteger(seed) ? seed : DEFAULT_SEED;
}

async function main(): Promise<number> {
  const catalog = await loadCatalogFromDisk();
  if (!catalog.ok) {
    console.error(`Catalog unavailable (${catalog.error.code}): ${catalog.error.message}`);
    return 1;
  }

  const cards = [
    ...catalog.value.listByTipo("monstro"),
    ...catalog.value.listByTipo("ritual"),
    ...catalog.value.listByTipo("magica"),
    ...catalog.value.listByTipo("armadilha"),
    ...catalog.value.listByTipo("equipamento"),
  ];
  const duelist = buildTestDuelist(cards, { seed: parseSeed(process.argv.slice(2)) });
  if (!duelist.ok) {
    console.error(`Test duelist generation failed (${duelist.error.code}): ${duelist.error.message}`);
    return 1;
  }

  // Writes the duelist's own source file, never `roster.json` itself: the
  // roster is composed from every file in `data/duelists/` by
  // `scripts/build-roster.ts`, and overwriting it here would delete the real
  // duelists. The deck travels as an explicit list because this duelist is
  // sampled from the catalog and belongs to no weighted pool.
  const source: DuelistSource = {
    id: duelist.value.id,
    name: duelist.value.name,
    difficulty: duelist.value.difficulty,
    portrait: duelist.value.portrait,
    profile: duelist.value.profile,
    deck: duelist.value.deck,
    dropPools: duelist.value.dropPool.map((tier) => ({
      tier: tier.tier,
      entries: tier.cardNumbers.map((cardNumber) => ({ cardNumber, weight: 1 })),
    })),
  };

  const directory = join(PACKAGE_ROOT, "data", "duelists");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, `${TEST_DUELIST_ID}.json`),
    `${JSON.stringify(source, null, 2)}\n`,
    "utf8",
  );
  console.log(`Wrote data/duelists/${TEST_DUELIST_ID}.json. Run data:build-roster to publish it.`);
  return 0;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await main();
}
