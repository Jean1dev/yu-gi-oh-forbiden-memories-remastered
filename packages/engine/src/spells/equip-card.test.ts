import type {
  Card,
  DuelState,
  MonsterZone,
  PlayerField,
  PlayerState,
  SpellZone,
  ZoneReference,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { equipCard } from "./equip-card.ts";

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

/** Legendary Sword: +500/+500 restricted to Warrior. */
function legendarySword(): Card {
  return makeCard({
    numero: "301",
    nome: "Legendary Sword",
    classe: "Equip",
    atk: null,
    def: null,
    tipo: "equipamento",
  });
}

const emptyMonsterZone: MonsterZone = { occupied: false };
const emptySpellZone: SpellZone = { occupied: false };

function occupiedZone(
  overrides: Partial<Extract<MonsterZone, { occupied: true }>> = {},
): MonsterZone {
  return {
    occupied: true,
    card: makeCard(),
    position: "attack_face_up",
    hasAttacked: false,
    hasChangedPosition: false,
    equips: [],
    ...overrides,
  };
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

function fieldWithMonster(zone: MonsterZone = occupiedZone()): PlayerField {
  return {
    ...emptyField(),
    monsters: [zone, emptyMonsterZone, emptyMonsterZone, emptyMonsterZone, emptyMonsterZone],
  };
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
    ...overrides,
  };
}

const ownMonster: ZoneReference = { player: "P1", zoneType: "monster", index: 0 };

function stateWithEquipInHand(equip: Card = legendarySword(), host: MonsterZone = occupiedZone()) {
  return makeState({
    players: {
      P1: makePlayer({ hand: [equip], field: fieldWithMonster(host) }),
      P2: makePlayer(),
    },
  });
}

describe("equipCard — success", () => {
  it("anexa o equipamento ao monstro escolhido e remove a carta da mao", () => {
    const equip = legendarySword();
    const state = stateWithEquipInHand(equip);

    const result = equipCard(state, { type: "equip_card", handIndex: 0, targetZone: ownMonster });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const zone = result.value.state.players.P1.field.monsters[0];
    if (!zone.occupied) throw new Error("expected an occupied zone");
    expect(zone.equips).toEqual([equip]);
    expect(result.value.state.players.P1.hand).toEqual([]);
  });

  it("nao ocupa nenhuma zona de magia — o equipamento vive no monstro", () => {
    const state = stateWithEquipInHand();

    const result = equipCard(state, { type: "equip_card", handIndex: 0, targetZone: ownMonster });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players.P1.field.spells.every((zone) => !zone.occupied)).toBe(true);
  });

  it("consome a jogada da mao do turno", () => {
    const state = stateWithEquipInHand();

    const result = equipCard(state, { type: "equip_card", handIndex: 0, targetZone: ownMonster });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players.P1.handPlayUsed).toBe(true);
  });

  it("emite onSet com context.target igual a equip e abre a janela sobre o oponente", () => {
    const equip = legendarySword();
    const state = stateWithEquipInHand(equip);

    const result = equipCard(state, { type: "equip_card", handIndex: 0, targetZone: ownMonster });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.events).toEqual([
      expect.objectContaining({
        type: "onSet",
        originPlayer: "P1",
        involvedCards: [equip],
        involvedZones: [ownMonster],
        context: { target: "equip", host: "001" },
      }),
    ]);
    expect(result.value.state.pending?.reactingPlayer).toBe("P2");
  });

  it("empilha um segundo equipamento preservando a ordem de anexacao", () => {
    const first = legendarySword();
    const second = makeCard({
      numero: "304",
      nome: "Axe of Despair",
      classe: "Equip",
      atk: null,
      def: null,
      tipo: "equipamento",
    });
    const state = stateWithEquipInHand(second, occupiedZone({ equips: [first] }));

    const result = equipCard(state, { type: "equip_card", handIndex: 0, targetZone: ownMonster });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const zone = result.value.state.players.P1.field.monsters[0];
    if (!zone.occupied) throw new Error("expected an occupied zone");
    expect(zone.equips).toEqual([first, second]);
  });

  it("aceita equipar um hospedeiro que nao satisfaz a restricao de classe", () => {
    const state = stateWithEquipInHand(
      legendarySword(),
      occupiedZone({ card: makeCard({ classe: "Dragon" }) }),
    );

    const result = equipCard(state, { type: "equip_card", handIndex: 0, targetZone: ownMonster });

    expect(result.ok).toBe(true);
  });

  it("nao altera o atk e o def base da carta hospedeira", () => {
    const host = makeCard({ atk: 1000, def: 800 });
    const state = stateWithEquipInHand(legendarySword(), occupiedZone({ card: host }));

    const result = equipCard(state, { type: "equip_card", handIndex: 0, targetZone: ownMonster });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const zone = result.value.state.players.P1.field.monsters[0];
    if (!zone.occupied) throw new Error("expected an occupied zone");
    expect(zone.card.atk).toBe(1000);
    expect(zone.card.def).toBe(800);
  });
});

describe("equipCard — rejections", () => {
  const rejections: readonly {
    name: string;
    state: DuelState;
    targetZone: ZoneReference;
    handIndex?: number;
    code: string;
  }[] = [
    {
      name: "recusa com hand_play_already_used quando a jogada do turno ja foi usada",
      state: makeState({
        players: {
          P1: makePlayer({
            hand: [legendarySword()],
            field: fieldWithMonster(),
            handPlayUsed: true,
          }),
          P2: makePlayer(),
        },
      }),
      targetZone: ownMonster,
      code: "hand_play_already_used",
    },
    {
      name: "recusa com card_unavailable quando nao ha carta no indice",
      state: stateWithEquipInHand(),
      targetZone: ownMonster,
      handIndex: 4,
      code: "card_unavailable",
    },
    {
      name: "recusa com invalid_equip_card_type para uma magia de efeito imediato",
      state: stateWithEquipInHand(
        makeCard({ numero: "337", nome: "Raigeki", classe: "Magic", tipo: "magica" }),
      ),
      targetZone: ownMonster,
      code: "invalid_equip_card_type",
    },
    {
      name: "recusa com invalid_equip_card_type para um equipamento sem entrada na tabela",
      state: stateWithEquipInHand(makeCard({ numero: "030", tipo: "equipamento" })),
      targetZone: ownMonster,
      code: "invalid_equip_card_type",
    },
    {
      name: "recusa com equip_target_not_monster_zone quando o alvo e uma zona de magia",
      state: stateWithEquipInHand(),
      targetZone: { player: "P1", zoneType: "spell", index: 0 },
      code: "equip_target_not_monster_zone",
    },
    {
      name: "recusa com equip_target_not_owned quando o alvo e um monstro do oponente",
      state: makeState({
        players: {
          P1: makePlayer({ hand: [legendarySword()] }),
          P2: makePlayer({ field: fieldWithMonster() }),
        },
      }),
      targetZone: { player: "P2", zoneType: "monster", index: 0 },
      code: "equip_target_not_owned",
    },
    {
      name: "recusa com equip_target_zone_empty quando a zona alvo esta vazia",
      state: stateWithEquipInHand(),
      targetZone: { player: "P1", zoneType: "monster", index: 3 },
      code: "equip_target_zone_empty",
    },
  ];

  for (const { name, state, targetZone, handIndex, code } of rejections) {
    it(name, () => {
      const result = equipCard(state, {
        type: "equip_card",
        handIndex: handIndex ?? 0,
        targetZone,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe(code);
    });
  }

  it("nao altera o estado em nenhum caso de recusa", () => {
    for (const { state, targetZone, handIndex } of rejections) {
      const before = JSON.parse(JSON.stringify(state)) as unknown;

      equipCard(state, { type: "equip_card", handIndex: handIndex ?? 0, targetZone });

      expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    }
  });
});
