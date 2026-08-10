import { getSealedCatalog, listAllCards } from "../src/lib/catalog/sealed-catalog.ts";
import { loadRoster } from "@yugioh/data/roster";
import { buildReadyDeck, groupIntoComposition } from "@yugioh/rules";
import type { Card, DuelAction, DuelSession, Duelist, ReadyDeck } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import rawRoster from "../../../packages/data/data/roster.json" with { type: "json" };
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
    const advanced = await submitPlayerAction(
      current,
      { type: "advance_phase" },
      {
        ...runtime.advanceDependencies,
        cpuProfile: duelist.profile,
      },
    );
    current = advanced.session;
  }
  return current;
}

describe("free duel with real engine", () => {
  it("lets fm-basic complete a CPU turn with a legal summon", async () => {
    const catalog = await getSealedCatalog();
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const cards = listAllCards(catalog.value);
    const deck = buildDeck(cards);
    const duelist: Duelist = {
      id: "fm-basic-test",
      name: "FM Basic Test",
      portrait: "cards-data/001.jpg",
      difficulty: "easy",
      profile: { strategy: "fm-basic", parameters: {} },
      deck: deck.cardNumbers,
      dropPool: [{ tier: "common", cardNumbers: deck.cardNumbers.slice(0, 8) }],
    };
    const runtime = createDuelRuntime({ cards, sleep: async () => undefined });
    let started: DuelSession = { status: "not_started" };
    for (let seed = 1; seed <= 20; seed += 1) {
      started = runtime.start(
        {
          duelistId: duelist.id,
          playerComposition: deck.composition,
          cpuComposition: deck.composition,
          seed,
        },
        duelist,
      );
      if (started.status === "in_progress" && started.currentDecider === "P2") break;
    }
    expect(started).toMatchObject({ status: "in_progress", currentDecider: "P2" });
    if (started.status !== "in_progress") return;
    const advanced = await advanceCpuDecisions(started, {
      ...runtime.advanceDependencies,
      cpuProfile: duelist.profile,
    });
    expect(advanced.status).toBe("in_progress");
    if (advanced.status === "in_progress") {
      expect(advanced.state.players.P2.field.monsters.some((zone) => zone.occupied)).toBe(true);
      expect(advanced.currentDecider).toBe("P1");
    }
  });

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

  it("runs Nitemare through a real CPU turn with a summon and attack", async () => {
    const catalog = await getSealedCatalog();
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;

    const loaded = loadRoster(rawRoster, (number) => catalog.value.getByNumero(number));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const nitemare = loaded.value.duelists.find((duelist) => duelist.id === "nitemare");
    expect(nitemare).toBeDefined();
    if (nitemare === undefined) return;

    const cards = listAllCards(catalog.value);
    const weakMonsters = cards
      .filter((card) => card.tipo === "monstro" || card.tipo === "ritual")
      .sort((left, right) => (left.atk ?? 0) - (right.atk ?? 0))
      .slice(0, 14);
    const playerNumbers = weakMonsters
      .flatMap((card) => [card.numero, card.numero, card.numero])
      .slice(0, 40);
    const playerDeck = buildReadyDeck({
      composition: groupIntoComposition(playerNumbers),
      catalog: (number) => catalog.value.getByNumero(number),
    });
    expect(playerDeck.ok).toBe(true);
    if (!playerDeck.ok) return;

    const cpuSteps: Array<Readonly<{ events: readonly { type: string }[] }>> = [];
    const incidents: string[] = [];
    const runtime = createDuelRuntime({ cards, sleep: async () => undefined });
    const dependencies = {
      ...runtime.advanceDependencies,
      cpuProfile: nitemare.profile,
      onStep: (step: { readonly events: readonly { type: string }[] }) => cpuSteps.push(step),
      logIncident: ({ code }: { readonly code: string }) => incidents.push(code),
    };
    const started = runtime.start(
      {
        duelistId: nitemare.id,
        playerComposition: playerDeck.value.composition,
        cpuComposition: groupIntoComposition(nitemare.deck),
        seed: 2,
      },
      nitemare,
    );
    expect(started).toMatchObject({ status: "in_progress", currentDecider: "P2" });
    if (started.status !== "in_progress") return;

    let session = await advanceCpuDecisions(started, dependencies);
    expect(session).toMatchObject({ status: "in_progress", currentDecider: "P1" });
    if (session.status !== "in_progress") return;

    const playerActions: readonly DuelAction[] = [
      { type: "advance_phase" as const },
      {
        type: "summon_monster" as const,
        player: "P1" as const,
        handIndex: session.state.players.P1.hand.findIndex(
          (card) => card.tipo === "monstro" || card.tipo === "ritual",
        ),
        zoneIndex: 0,
        position: "attack_face_up" as const,
      },
      { type: "advance_phase" as const },
      { type: "advance_phase" as const },
      { type: "advance_phase" as const },
    ];
    for (const action of playerActions) {
      if (session.status !== "in_progress") break;
      const applied = await submitPlayerAction(session, action, dependencies);
      expect(applied.refusal).toBeUndefined();
      session = applied.session;
    }

    expect(session).toMatchObject({ status: "in_progress", currentDecider: "P1" });
    expect(incidents).toEqual([]);
    expect(cpuSteps.length).toBeGreaterThan(0);
    expect(cpuSteps.length).toBeLessThan(100);
    const eventTypes = cpuSteps.flatMap((step) => step.events.map((event) => event.type));
    expect(eventTypes).toContain("onSummon");
    expect(eventTypes).toContain("onAttackDeclared");

    if (session.status !== "in_progress") return;
    const ended = await submitPlayerAction(
      session,
      { type: "surrender", player: "P1" },
      dependencies,
    );
    expect(ended.refusal).toBeUndefined();
    expect(ended.session).toMatchObject({
      status: "ended",
      finalState: { outcome: { reason: "surrender", winner: "P2" } },
    });
  });
});
