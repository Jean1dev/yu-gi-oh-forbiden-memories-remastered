import type { CardNumber } from "../../card/types.ts";
import type { SpellEffect } from "./types.ts";

/**
 * What each specified card does, keyed by `numero` (`docs/spells/README.md`).
 *
 * The dataset carries no effect text and no effect identifier — the 722 cards
 * are `nome + password + preco` records — so this table is authored data, not
 * derived. It is the single source of truth for both the engine (which
 * resolves the effect) and `apps/web` (which routes the intent state machine).
 *
 * A card absent from this table is inert: it is placed in a spell zone by
 * `play_spell_or_trap` and does nothing, exactly as every magic card does
 * today. That fallback is what keeps the other 42 magic/equip cards and all
 * 10 traps working unchanged.
 */
export const SPELL_EFFECTS: Readonly<Record<CardNumber, SpellEffect>> = Object.freeze({
  // Equip buffs — attach to one monster, bonus derived at combat time.
  // 303 and 307 read "Dark"/"Luz" in the source list; the dataset has no
  // attribute field, so they map to the class each card boosts in the original
  // game (`docs/spells/equip-buffs.md` §2).
  "301": {
    type: "equip_buff",
    atk: 500,
    def: 500,
    requires: { kind: "classe", classe: "Warrior" },
  },
  "303": { type: "equip_buff", atk: 500, def: 500, requires: { kind: "classe", classe: "Fiend" } },
  "304": { type: "equip_buff", atk: 1000, def: 1000, requires: { kind: "any" } },
  "305": { type: "equip_buff", atk: 0, def: 500, requires: { kind: "any" } },
  "307": {
    type: "equip_buff",
    atk: 500,
    def: 500,
    requires: { kind: "classe", classe: "Spellcaster" },
  },
  "308": { type: "equip_buff", atk: 500, def: 500, requires: { kind: "classe", classe: "Beast" } },
  "311": { type: "equip_buff", atk: 500, def: 500, requires: { kind: "any" } },
  "314": { type: "equip_buff", atk: 700, def: 700, requires: { kind: "any" } },
  "315": { type: "equip_buff", atk: 500, def: 500, requires: { kind: "classe", classe: "Dragon" } },
  "657": { type: "equip_buff", atk: 1000, def: 0, requires: { kind: "any" } },

  // Immediate effects printed on `tipo: "equipamento"` cards. A deliberate
  // divergence from the original game, recorded in `docs/spells/README.md` §7:
  // the table decides the routing, not `tipo`.
  "302": {
    type: "destroy_monsters",
    targets: { side: "opponent", filter: { kind: "classe", classe: "Warrior" } },
  },
  "306": { type: "life_points", side: "opponent", delta: -500 },

  // Immediate magic. "todos os monstros" without a stated owner reaches both
  // players (320, 329, 336); only 337 says "do oponente".
  "320": { type: "force_attack_position", targets: { side: "both", filter: { kind: "any" } } },
  "329": {
    type: "destroy_monsters",
    targets: { side: "both", filter: { kind: "classe", classe: "Dragon" } },
  },
  "336": { type: "destroy_monsters", targets: { side: "both", filter: { kind: "any" } } },
  "337": { type: "destroy_monsters", targets: { side: "opponent", filter: { kind: "any" } } },
  "342": { type: "life_points", side: "caster", delta: 1000 },
  "348": { type: "attack_lock", side: "opponent", turns: 3 },
  "672": { type: "destroy_spells", targets: { side: "opponent", filter: { kind: "any" } } },

  // Terrains. Indistinguishable from Raigeki in the dataset (both are
  // `tipo: "magica"`, `classe: "Magic"`) — this table is the only discriminator.
  "330": { type: "terrain" },
  "331": { type: "terrain" },
  "332": { type: "terrain" },
  "333": { type: "terrain" },
  "334": { type: "terrain" },
  "335": { type: "terrain" },
});

/**
 * The effect of `cardNumber`, or `undefined` when the card has none.
 *
 * Guards with `Object.hasOwn` rather than indexing directly, so a prototype
 * key (`__proto__`, `valueOf`, `toString`) never resolves to a function
 * masquerading as an effect — the bug that still makes
 * `packages/data/src/art/resolve-art.test.ts` flaky.
 */
export function getSpellEffect(cardNumber: CardNumber): SpellEffect | undefined {
  return Object.hasOwn(SPELL_EFFECTS, cardNumber) ? SPELL_EFFECTS[cardNumber] : undefined;
}
