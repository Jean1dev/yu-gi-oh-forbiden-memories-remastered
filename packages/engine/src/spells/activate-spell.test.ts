import type {
  Card,
  DuelState,
  MonsterPosition,
  MonsterZone,
  PlayerField,
  PlayerState,
  SpellZone,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { apply } from "../turn/apply.ts";
import { activateSpell } from "./activate-spell.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Test Monster",
    img: null,
    classe: "Warrior",
    atk: 1000,
    def: 800,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
    ...overrides,
  };
}

function magic(numero: string, nome: string): Card {
  return makeCard({ numero, nome, classe: "Magic", atk: null, def: null, tipo: "magica" });
}

const swordOfDarkDestruction = makeCard({
  numero: "302",
  nome: "Sword of Dark Destruction",
  classe: "Equip",
  atk: null,
  def: null,
  tipo: "equipamento",
});
const insectArmor = makeCard({
  numero: "306",
  nome: "Insect Armor with Laser Cannon",
  classe: "Equip",
  atk: null,
  def: null,
  tipo: "equipamento",
});
const stopDefense = magic("320", "Stop Defense");
const dragonCaptureJar = magic("329", "Dragon Capture Jar");
const darkHole = magic("336", "Dark Hole");
const raigeki = magic("337", "Raigeki");
const dianKeto = magic("342", "Dian Keto the Cure Master");
const swordsOfRevealingLight = magic("348", "Swords of Revealing Light");
const featherDuster = magic("672", "Harpie's Feather Duster");

const emptyMonsterZone: MonsterZone = { occupied: false };
const emptySpellZone: SpellZone = { occupied: false };

function monsterZone(
  card: Card,
  position: MonsterPosition = "attack_face_up",
): Extract<MonsterZone, { occupied: true }> {
  return { occupied: true, card, position, hasAttacked: false, hasChangedPosition: false, equips: [] };
}

function emptyField(): PlayerField {
  return {
    monsters: [
      emptyMonsterZone,
      emptyMonsterZone,
      emptyMonsterZone,
      emptyMonsterZone,
      emptyMonsterZone,
    ],
    spells: [emptySpellZone, emptySpellZone, emptySpellZone, emptySpellZone, emptySpellZone],
  };
}

/** A field whose first N monster zones hold `cards`, the rest empty. */
function fieldWithMonsters(zones: readonly MonsterZone[]): PlayerField {
  const monsters = [0, 1, 2, 3, 4].map((index) => zones[index] ?? emptyMonsterZone);
  return { ...emptyField(), monsters: monsters as unknown as PlayerField["monsters"] };
}

function fieldWithSpells(cards: readonly Card[]): PlayerField {
  const spells = [0, 1, 2, 3, 4].map((index) => {
    const card = cards[index];
    return card === undefined ? emptySpellZone : { occupied: true as const, card, faceUp: true };
  });
  return { ...emptyField(), spells: spells as unknown as PlayerField["spells"] };
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { lp: 8000, hand: [], deck: [], field: emptyField(), handPlayUsed: false, ...overrides };
}

function makeState(overrides: Partial<DuelState> = {}): DuelState {
  return {
    players: { P1: makePlayer(), P2: makePlayer() },
    activeField: null,
    activePlayer: "P1",
    turn: 3,
    phase: "main",
    seed: 1,
    stats: emptyDuelStatsByPlayer(),
    ...overrides,
  };
}

/** Activates `card` from P1's hand, asserting success, and returns the result. */
function activate(card: Card, state: DuelState) {
  const withCard: DuelState = {
    ...state,
    players: {
      ...state.players,
      P1: { ...state.players.P1, hand: [card, ...state.players.P1.hand] },
    },
  };
  const result = activateSpell(withCard, { type: "activate_spell", handIndex: 0 });
  if (!result.ok) throw new Error(`Expected activateSpell to succeed, got ${result.error.code}`);
  return result.value;
}

const warrior = makeCard({ numero: "010", nome: "Warrior A", classe: "Warrior" });
const dragon = makeCard({ numero: "011", nome: "Dragon A", classe: "Dragon" });
const aqua = makeCard({ numero: "012", nome: "Aqua A", classe: "Aqua" });

describe("activateSpell — destruicao de monstros", () => {
  it("Raigeki destroi todos os monstros do oponente e nenhum do lancador", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithMonsters([monsterZone(warrior)]) }),
        P2: makePlayer({ field: fieldWithMonsters([monsterZone(dragon), monsterZone(aqua)]) }),
      },
    });

    const { state: next } = activate(raigeki, state);

    expect(next.players.P2.field.monsters.every((zone) => !zone.occupied)).toBe(true);
    expect(next.players.P1.field.monsters[0].occupied).toBe(true);
  });

  it("Dark Hole destroi os monstros dos dois jogadores", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithMonsters([monsterZone(warrior)]) }),
        P2: makePlayer({ field: fieldWithMonsters([monsterZone(dragon)]) }),
      },
    });

    const { state: next } = activate(darkHole, state);

    expect(next.players.P1.field.monsters.every((zone) => !zone.occupied)).toBe(true);
    expect(next.players.P2.field.monsters.every((zone) => !zone.occupied)).toBe(true);
  });

  it("Dragon Capture Jar destroi apenas monstros da classe Dragon dos dois lados", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithMonsters([monsterZone(dragon), monsterZone(warrior)]) }),
        P2: makePlayer({ field: fieldWithMonsters([monsterZone(aqua), monsterZone(dragon)]) }),
      },
    });

    const { state: next } = activate(dragonCaptureJar, state);

    expect(next.players.P1.field.monsters[0]).toEqual({ occupied: false });
    expect(next.players.P1.field.monsters[1].occupied).toBe(true);
    expect(next.players.P2.field.monsters[0].occupied).toBe(true);
    expect(next.players.P2.field.monsters[1]).toEqual({ occupied: false });
  });

  it("Sword of Dark Destruction destroi so os Warriors do oponente", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithMonsters([monsterZone(warrior)]) }),
        P2: makePlayer({ field: fieldWithMonsters([monsterZone(warrior), monsterZone(dragon)]) }),
      },
    });

    const { state: next } = activate(swordOfDarkDestruction, state);

    expect(next.players.P1.field.monsters[0].occupied).toBe(true);
    expect(next.players.P2.field.monsters[0]).toEqual({ occupied: false });
    expect(next.players.P2.field.monsters[1].occupied).toBe(true);
  });

  it("destroi tambem um monstro virado para baixo, sem emitir onFlip", () => {
    const state = makeState({
      players: {
        P1: makePlayer(),
        P2: makePlayer({
          field: fieldWithMonsters([monsterZone(dragon, "defense_face_down")]),
        }),
      },
    });

    const { state: next, events } = activate(raigeki, state);

    expect(next.players.P2.field.monsters[0]).toEqual({ occupied: false });
    expect(events.some((event) => event.type === "onFlip")).toBe(false);
  });

  it("emite um onDestroy por zona destruida, em ordem P1 e depois P2", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithMonsters([monsterZone(warrior), monsterZone(dragon)]) }),
        P2: makePlayer({ field: fieldWithMonsters([monsterZone(aqua)]) }),
      },
    });

    const { events } = activate(darkHole, state);

    const destroyed = events.filter((event) => event.type === "onDestroy");
    expect(destroyed.map((event) => event.involvedZones[0])).toEqual([
      { player: "P1", zoneType: "monster", index: 0 },
      { player: "P1", zoneType: "monster", index: 1 },
      { player: "P2", zoneType: "monster", index: 0 },
    ]);
    expect(destroyed[0]?.context).toEqual({ cause: "spell", by: "336" });
  });

  it("um campo vazio e uma jogada legal que apenas gasta o turno", () => {
    const { state: next, events } = activate(raigeki, makeState());

    expect(next.players.P1.handPlayUsed).toBe(true);
    expect(events.filter((event) => event.type === "onDestroy")).toEqual([]);
  });
});

describe("activateSpell — remocao de magias", () => {
  it("Harpie's Feather Duster limpa as cinco zonas de magia do oponente e nenhuma do lancador", () => {
    const trap = makeCard({ numero: "700", classe: "Trap", tipo: "armadilha", atk: null, def: null });
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithSpells([trap]) }),
        P2: makePlayer({ field: fieldWithSpells([trap, trap, trap]) }),
      },
    });

    const { state: next } = activate(featherDuster, state);

    expect(next.players.P2.field.spells.every((zone) => !zone.occupied)).toBe(true);
    expect(next.players.P1.field.spells[0].occupied).toBe(true);
  });

  it("nao afeta o terreno ativo nem os equipamentos anexados a monstros", () => {
    const equippedZone: MonsterZone = { ...monsterZone(warrior), equips: [swordOfDarkDestruction] };
    const state = makeState({
      activeField: magic("334", "Umi"),
      players: {
        P1: makePlayer(),
        P2: makePlayer({ field: fieldWithMonsters([equippedZone]) }),
      },
    });

    const { state: next } = activate(featherDuster, state);

    expect(next.activeField?.numero).toBe("334");
    const zone = next.players.P2.field.monsters[0];
    if (!zone.occupied) throw new Error("expected an occupied zone");
    expect(zone.equips).toEqual([swordOfDarkDestruction]);
  });
});

describe("activateSpell — life points", () => {
  it("Insect Armor with Laser Cannon tira 500 LP do oponente", () => {
    const { state: next, events } = activate(insectArmor, makeState());

    expect(next.players.P2.lp).toBe(7500);
    expect(next.players.P1.lp).toBe(8000);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "onDamage",
        context: { toPlayer: "P2", amount: 500, kind: "effect_damage" },
      }),
    );
  });

  it("Dian Keto soma 1000 LP ao lancador e emite onDamage com kind effect_heal", () => {
    const { state: next, events } = activate(dianKeto, makeState());

    expect(next.players.P1.lp).toBe(9000);
    expect(next.players.P2.lp).toBe(8000);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "onDamage",
        context: { toPlayer: "P1", amount: 1000, kind: "effect_heal" },
      }),
    );
  });

  it("o LP nunca fica negativo e o duelo termina quando zera", () => {
    const state = makeState({
      players: { P1: makePlayer(), P2: makePlayer({ lp: 300 }) },
    });
    const withCard: DuelState = {
      ...state,
      players: { ...state.players, P1: { ...state.players.P1, hand: [insectArmor] } },
    };

    const result = apply(withCard, { type: "activate_spell", handIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players.P2.lp).toBe(0);
    expect(result.value.state.outcome).toEqual({
      status: "decisive",
      winner: "P1",
      loser: "P2",
      reason: "lp_depleted",
    });
  });
});

describe("activateSpell — Stop Defense", () => {
  it("vira para ataque todo monstro em defesa dos dois lados, revelando os virados", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          field: fieldWithMonsters([
            monsterZone(warrior, "defense_face_down"),
            monsterZone(dragon, "attack_face_up"),
          ]),
        }),
        P2: makePlayer({ field: fieldWithMonsters([monsterZone(aqua, "defense_face_up")]) }),
      },
    });

    const { state: next, events } = activate(stopDefense, state);

    expect(next.players.P1.field.monsters[0]).toMatchObject({ position: "attack_face_up" });
    expect(next.players.P1.field.monsters[1]).toMatchObject({ position: "attack_face_up" });
    expect(next.players.P2.field.monsters[0]).toMatchObject({ position: "attack_face_up" });

    // Only the face-down monster produces an onFlip; both produce onPositionChange.
    expect(events.filter((event) => event.type === "onFlip")).toHaveLength(1);
    expect(events.filter((event) => event.type === "onPositionChange")).toHaveLength(2);
  });

  it("Stop Defense nao consome a mudanca de posicao do turno", () => {
    const state = makeState({
      players: {
        P1: makePlayer({ field: fieldWithMonsters([monsterZone(warrior, "defense_face_up")]) }),
        P2: makePlayer(),
      },
    });

    const { state: next } = activate(stopDefense, state);

    expect(next.players.P1.field.monsters[0]).toMatchObject({
      hasChangedPosition: false,
      hasAttacked: false,
    });
  });
});

describe("activateSpell — consumo da carta e janela", () => {
  it("a carta ativada nao ocupa nenhuma zona de magia e sai da mao", () => {
    const state = makeState();
    const { state: next } = activate(raigeki, state);

    expect(next.players.P1.hand).toEqual([]);
    expect(next.players.P1.field.spells.every((zone) => !zone.occupied)).toBe(true);
  });

  it("emite onSet de ativacao antes dos eventos da resolucao e abre a janela sobre o oponente", () => {
    const state = makeState({
      players: {
        P1: makePlayer(),
        P2: makePlayer({ field: fieldWithMonsters([monsterZone(dragon)]) }),
      },
    });

    const { state: next, events } = activate(raigeki, state);

    expect(events[0]).toMatchObject({
      type: "onSet",
      involvedCards: [raigeki],
      context: { target: "activation", effect: "destroy_monsters" },
    });
    expect(events[1]).toMatchObject({ type: "onDestroy" });
    expect(next.pending?.reactingPlayer).toBe("P2");
  });

  it("consome a jogada da mao do turno", () => {
    const { state: next } = activate(dianKeto, makeState());
    expect(next.players.P1.handPlayUsed).toBe(true);
  });
});

describe("activateSpell — rejections", () => {
  it("recusa com invalid_activation_card_type um equipamento de buff", () => {
    const legendarySword = makeCard({ numero: "301", tipo: "equipamento", atk: null, def: null });
    const state = makeState({
      players: { P1: makePlayer({ hand: [legendarySword] }), P2: makePlayer() },
    });

    const result = activateSpell(state, { type: "activate_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_activation_card_type");
  });

  it("recusa com invalid_activation_card_type um terreno", () => {
    const state = makeState({
      players: { P1: makePlayer({ hand: [magic("334", "Umi")] }), P2: makePlayer() },
    });

    const result = activateSpell(state, { type: "activate_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_activation_card_type");
  });

  it("recusa com invalid_activation_card_type uma carta sem entrada na tabela", () => {
    const state = makeState({
      players: { P1: makePlayer({ hand: [magic("030", "Sem efeito")] }), P2: makePlayer() },
    });

    const result = activateSpell(state, { type: "activate_spell", handIndex: 0 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_activation_card_type");
  });

  it("recusa com hand_play_already_used e com card_unavailable", () => {
    const used = makeState({
      players: { P1: makePlayer({ hand: [raigeki], handPlayUsed: true }), P2: makePlayer() },
    });
    expect(activateSpell(used, { type: "activate_spell", handIndex: 0 })).toMatchObject({
      ok: false,
      error: { code: "hand_play_already_used" },
    });

    const empty = makeState({ players: { P1: makePlayer({ hand: [raigeki] }), P2: makePlayer() } });
    expect(activateSpell(empty, { type: "activate_spell", handIndex: 3 })).toMatchObject({
      ok: false,
      error: { code: "card_unavailable" },
    });
  });

  it("nao altera o estado em nenhum caso de recusa", () => {
    const state = makeState({
      players: { P1: makePlayer({ hand: [magic("030", "Sem efeito")] }), P2: makePlayer() },
    });
    const before = JSON.parse(JSON.stringify(state)) as unknown;

    activateSpell(state, { type: "activate_spell", handIndex: 0 });

    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
  });
});

describe("activateSpell — determinismo", () => {
  it("a mesma entrada produz sempre o mesmo ApplyResult", () => {
    const state = makeState({
      players: {
        P1: makePlayer({
          hand: [darkHole],
          field: fieldWithMonsters([monsterZone(warrior), monsterZone(dragon)]),
        }),
        P2: makePlayer({ field: fieldWithMonsters([monsterZone(aqua, "defense_face_down")]) }),
      },
    });

    expect(activateSpell(state, { type: "activate_spell", handIndex: 0 })).toEqual(
      activateSpell(state, { type: "activate_spell", handIndex: 0 }),
    );
  });

  it("a ordem da varredura nao depende de quem lancou a carta", () => {
    const board = {
      P1: makePlayer({ field: fieldWithMonsters([monsterZone(warrior)]) }),
      P2: makePlayer({ field: fieldWithMonsters([monsterZone(dragon)]) }),
    };

    const byP1 = activate(darkHole, makeState({ players: board, activePlayer: "P1" }));
    const p2State = makeState({
      players: { P1: board.P1, P2: { ...board.P2, hand: [darkHole] } },
      activePlayer: "P2",
    });
    const byP2 = activateSpell(p2State, { type: "activate_spell", handIndex: 0 });
    if (!byP2.ok) throw new Error("expected success");

    const zonesOf = (events: readonly { type: string; involvedZones: readonly unknown[] }[]) =>
      events.filter((event) => event.type === "onDestroy").map((event) => event.involvedZones[0]);

    expect(zonesOf(byP1.events)).toEqual(zonesOf(byP2.value.events));
  });
});

describe("activateSpell - attack locks", () => {
  it("locks the opponent for their next three turns", () => {
    const { state: next } = activate(swordsOfRevealingLight, makeState({ turn: 3 }));

    expect(next.attackLocks).toEqual([{ player: "P2", untilTurn: 9 }]);
  });

  it("recasting restarts the count from the current turn", () => {
    const state = makeState({
      turn: 7,
      attackLocks: [{ player: "P2", untilTurn: 9 }],
    });

    const { state: next } = activate(swordsOfRevealingLight, state);

    expect(next.attackLocks).toEqual([{ player: "P2", untilTurn: 13 }]);
  });
});
