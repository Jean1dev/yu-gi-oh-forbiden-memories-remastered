import { getSealedCatalog, listAllCards } from "../src/lib/catalog/sealed-catalog.ts";
import { buildReadyDeck, groupIntoComposition } from "@yugioh/rules";
import type { Card, DuelSession, Duelist, ReadyDeck } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import { advanceCpuDecisions, submitPlayerAction } from "../src/lib/free-duel/duel-session.ts";
import { createDuelRuntime, type DuelRuntime } from "../src/lib/free-duel/duel-runtime.ts";

function buildDeck(cards: readonly Card[]): ReadyDeck {
  const monsters = cards
    .filter((card) => card.tipo === "monstro" || card.tipo === "ritual")
    .slice(0, 34);
  const support = cards
    .filter((card) => card.tipo !== "monstro" && card.tipo !== "ritual")
    .slice(0, 6);
  const numbers = [...monsters, ...support].map((card) => card.numero);
  const ready = buildReadyDeck({
    composition: groupIntoComposition(numbers),
    catalog: (cardNumber) => cards.find((card) => card.numero === cardNumber),
  });
  if (!ready.ok) throw new Error(`Expected test deck to be valid: ${ready.error.code}`);
  return ready.value;
}

async function advanceToPlayerMain(
  runtime: DuelRuntime,
  session: Extract<DuelSession, { status: "in_progress" }>,
  duelist: Duelist,
) {
  let current: DuelSession = session;
  if (current.status === "in_progress" && current.currentDecider === "P2") {
    current = await advanceCpuDecisions(current, {
      ...runtime.advanceDependencies,
      cpuProfile: duelist.profile,
    });
  }
  if (current.status !== "in_progress") return current;
  if (current.state.phase === "draw") {
    const advanced = await submitPlayerAction(current, { type: "advance_phase" }, {
      ...runtime.advanceDependencies,
      cpuProfile: duelist.profile,
    });
    current = advanced.session;
  }
  return current;
}

describe("free duel with real engine", () => {
  it("starts, summons through apply, settles reactions, and ends by surrender", async () => {
    const catalog = await getSealedCatalog();
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;

    const cards = listAllCards(catalog.value);
    const deck = buildDeck(cards);
    const duelist: Duelist = {
      id: "test-duelist",
      name: "Duelista de Teste",
      portrait: "cards-data/001.jpg",
      difficulty: "easy",
      profile: { strategy: "passive", parameters: {} },
      deck: deck.cardNumbers,
      dropPool: [{ tier: "common", cardNumbers: deck.cardNumbers.slice(0, 8) }],
    };
    const runtime = createDuelRuntime({ cards, sleep: async () => undefined });
    const started = runtime.start(
      {
        duelistId: duelist.id,
        playerComposition: deck.composition,
        cpuComposition: groupIntoComposition(duelist.deck),
        seed: 1,
      },
      duelist,
    );
    expect(started.status).toBe("in_progress");
    if (started.status !== "in_progress") return;

    const main = await advanceToPlayerMain(runtime, started, duelist);
    expect(main).toMatchObject({ status: "in_progress", currentDecider: "P1" });
    if (main.status !== "in_progress") return;

    const handIndex = main.state.players.P1.hand.findIndex(
      (card) => card.tipo === "monstro" || card.tipo === "ritual",
    );
    expect(handIndex).toBeGreaterThanOrEqual(0);

    const summoned = await submitPlayerAction(
      main,
      { type: "summon_monster", player: "P1", handIndex, zoneIndex: 0, position: "attack_face_up" },
      { ...runtime.advanceDependencies, cpuProfile: duelist.profile },
    );
    expect(summoned.refusal).toBeUndefined();
    expect(summoned.events.map((event) => event.type)).toContain("onSummon");
    expect(summoned.session).toMatchObject({ status: "in_progress" });
    if (summoned.session.status !== "in_progress") return;
    expect(summoned.session.state.pending).toBeUndefined();
    expect(summoned.session.state.players.P1.field.monsters[0]?.occupied).toBe(true);

    const ended = await submitPlayerAction(
      summoned.session,
      { type: "surrender", player: "P1" },
      { ...runtime.advanceDependencies, cpuProfile: duelist.profile },
    );
    expect(ended.session).toMatchObject({ status: "ended" });
    if (ended.session.status === "ended") {
      expect(ended.session.finalState.outcome).toMatchObject({
        reason: "surrender",
        winner: "P2",
      });
    }
  });
});
