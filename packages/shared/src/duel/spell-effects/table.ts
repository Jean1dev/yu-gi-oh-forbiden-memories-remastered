import type { CardNumber } from "../../card/types.ts";
import type { SpellEffect } from "./types.ts";

/** Every equip in the original game grants this, and only Megamorph doubles it. */
const EQUIP_BUFF = { type: "equip_buff", atk: 500, def: 500 } as const;

/** `{ side, filter }` for the two shapes that repeat across the destruction cards. */
const OPPONENT_ANY = { side: "opponent", filter: { kind: "any" } } as const;
const BOTH_ANY = { side: "both", filter: { kind: "any" } } as const;

function opponentClass(classe: string) {
  return { side: "opponent", filter: { kind: "classe", classe } } as const;
}

/**
 * What each of the 67 magic/equip cards does, keyed by `numero`.
 *
 * The values come from the original game, not from the modern TCG text: the
 * effects are extracted from the `cardinfo` descriptions of
 * `sg4e/YGOFM-gamedata`, the same datamine `packages/data/scripts/extract-fm-*`
 * reads (`docs/spells/README.md` §7). Where the two rulesets disagree, this
 * table follows the original — 343 Sparks deals 50 and not 200, 341 Soul of
 * the Pure heals 2000 and not 800 — and `cards-data/enriquecimento-ygoprodeck.json`
 * carries the matching text so the card frame agrees with the resolution.
 *
 * A card absent from this table is inert: it is placed in a spell zone by
 * `play_spell_or_trap` and does nothing. That is now only the 10 traps and the
 * 24 ritual cards, neither of which has an activation mechanic in the engine.
 *
 * Side rule: when the card text names the owner ("an opponent's Machine
 * monsters") the effect is `opponent`; when it does not ("Eliminates all
 * Zombie creatures") it reaches `both`.
 */
export const SPELL_EFFECTS: Readonly<Record<CardNumber, SpellEffect>> = Object.freeze({
  // ---------------------------------------------------------------- equips
  // All 34 grant the same +500/+500; which monsters accept each one is a
  // hand-curated list in `equip-compatibility.ts`, not a class filter
  // (`docs/spells/equip-buffs.md` §2). 302 and 306 are equips here and not
  // immediate effects: the dataset's `tipo` never decided the routing, and the
  // original game's text for both is a power-up.
  "301": EQUIP_BUFF, // Legendary Sword
  "302": EQUIP_BUFF, // Sword of Dark Destruction
  "303": EQUIP_BUFF, // Dark Energy
  "304": EQUIP_BUFF, // Axe of Despair
  "305": EQUIP_BUFF, // Laser Cannon Armor
  "306": EQUIP_BUFF, // Insect Armor with Laser Cannon
  "307": EQUIP_BUFF, // Elf's Light
  "308": EQUIP_BUFF, // Beast Fangs
  "309": EQUIP_BUFF, // Steel Shell
  "310": EQUIP_BUFF, // Vile Germs
  "311": EQUIP_BUFF, // Black Pendant
  "312": EQUIP_BUFF, // Silver Bow and Arrow
  "313": EQUIP_BUFF, // Horn of Light
  "314": EQUIP_BUFF, // Horn of the Unicorn
  "315": EQUIP_BUFF, // Dragon Treasure
  "316": EQUIP_BUFF, // Electro-whip
  "317": EQUIP_BUFF, // Cyber Shield
  "318": EQUIP_BUFF, // Elegant Egotist — only Harpie Lady accepts it
  "319": EQUIP_BUFF, // Mystical Moon
  "321": EQUIP_BUFF, // Malevolent Nuzzler
  "322": EQUIP_BUFF, // Violet Crystal
  "323": EQUIP_BUFF, // Book of Secret Arts
  "324": EQUIP_BUFF, // Invigoration
  "325": EQUIP_BUFF, // Machine Conversion Factory
  "326": EQUIP_BUFF, // Raise Body Heat
  "327": EQUIP_BUFF, // Follow Wind
  "328": EQUIP_BUFF, // Power of Kaishin
  "651": EQUIP_BUFF, // Kunai with Chain
  "652": EQUIP_BUFF, // Magical Labyrinth — only Labyrinth Wall accepts it
  "654": EQUIP_BUFF, // Salamandra
  "658": EQUIP_BUFF, // Metalmorph — only Zoa accepts it
  "659": EQUIP_BUFF, // Winged Trumpeter
  "668": EQUIP_BUFF, // Bright Castle — every monster accepts it
  // "A card that increases the power of any selected monster by 2 levels."
  // The only equip the original doubles, and the sentence that fixes
  // `POWER_PER_LEVEL` for the curse cards.
  "657": { type: "equip_buff", atk: 1000, def: 1000 }, // Megamorph

  // -------------------------------------------------------------- terrains
  "330": { type: "terrain" }, // Forest
  "331": { type: "terrain" }, // Wasteland
  "332": { type: "terrain" }, // Mountain
  "333": { type: "terrain" }, // Sogen
  "334": { type: "terrain" }, // Umi
  "335": { type: "terrain" }, // Yami

  // ----------------------------------------------------------- life points
  // The original's numbers, which are not the TCG's: Goblin's Secret Remedy
  // heals 1000 (not 600), Soul of the Pure 2000 (not 800), Dian Keto 5000
  // (not 1000), and the burn line starts at 50 rather than 200.
  "338": { type: "life_points", side: "caster", delta: 200 }, // Mooyan Curry
  "339": { type: "life_points", side: "caster", delta: 500 }, // Red Medicine
  "340": { type: "life_points", side: "caster", delta: 1000 }, // Goblin's Secret Remedy
  "341": { type: "life_points", side: "caster", delta: 2000 }, // Soul of the Pure
  "342": { type: "life_points", side: "caster", delta: 5000 }, // Dian Keto the Cure Master
  "343": { type: "life_points", side: "opponent", delta: -50 }, // Sparks
  "344": { type: "life_points", side: "opponent", delta: -100 }, // Hinotama
  "345": { type: "life_points", side: "opponent", delta: -200 }, // Final Flame
  "346": { type: "life_points", side: "opponent", delta: -500 }, // Ookazi
  "347": { type: "life_points", side: "opponent", delta: -1000 }, // Tremendous Fire

  // ------------------------------------------------------------ destruction
  "329": { type: "destroy_monsters", targets: opponentClass("Dragon") }, // Dragon Capture Jar
  "336": { type: "destroy_monsters", targets: BOTH_ANY }, // Dark Hole — "every card in play"
  "337": { type: "destroy_monsters", targets: OPPONENT_ANY }, // Raigeki
  "653": { type: "destroy_monsters", targets: opponentClass("Warrior") }, // Warrior Elimination
  "656": {
    // "Eliminates all Zombie creatures" — no owner named, so both sides.
    type: "destroy_monsters",
    targets: { side: "both", filter: { kind: "classe", classe: "Zombie" } },
  }, // Eternal Rest
  "660": { type: "destroy_monsters", targets: opponentClass("Machine") }, // Stain Storm
  "662": { type: "destroy_monsters", targets: opponentClass("Insect") }, // Eradicating Aerosol
  "663": { type: "destroy_monsters", targets: opponentClass("Rock") }, // Breath of Light
  "664": { type: "destroy_monsters", targets: opponentClass("Fish") }, // Eternal Draught
  "661": { type: "destroy_by_atk", targets: OPPONENT_ANY, minAtk: 1500 }, // Crush Card
  "672": { type: "destroy_spells", targets: OPPONENT_ANY }, // Harpie's Feather Duster

  // ------------------------------------------------------------- the curse
  // Both reduce power rather than destroy, and both reach every enemy monster
  // — the original does not target here, the TCG does
  // (`docs/spells/stat-curse.md` §1).
  "349": { type: "stat_curse", targets: OPPONENT_ANY, levels: 1 }, // Spellbinding Circle
  "669": { type: "stat_curse", targets: OPPONENT_ANY, levels: 2 }, // Shadow Spell
  "655": { type: "cleanse_curses", side: "both" }, // Cursebreaker

  // ------------------------------------------------- revealing and position
  "350": { type: "reveal_face_down", targets: BOTH_ANY }, // Dark-piercing Light
  "320": { type: "force_attack_position", targets: OPPONENT_ANY }, // Stop Defense
  "348": {
    // "Enemy monsters are revealed and your opponent cannot attack for three
    // turns." Two atomic effects, in the order the sentence gives them.
    type: "sequence",
    effects: [
      { type: "reveal_face_down", targets: OPPONENT_ANY },
      { type: "attack_lock", side: "opponent", turns: 3 },
    ],
  }, // Swords of Revealing Light
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

/**
 * Whether playing this card asks the caster to pick a monster.
 *
 * Only 320 Stop Defense does, and only at the top level: a targeted effect
 * nested inside a `sequence` would have no way to ask, which the table test
 * pins down.
 */
export function requiresSpellTarget(effect: SpellEffect): boolean {
  return effect.type === "force_attack_position";
}
