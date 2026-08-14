/**
 * Whose side of the field an effect reaches. `caster` is the player who played
 * the card, never a fixed `PlayerId` — the table has to describe an effect
 * independently of who happens to hold the card.
 */
export type EffectSide = "caster" | "opponent" | "both";

/**
 * Which cards inside the selected side an effect reaches. `classe` is the only
 * axis the sweeping effects need: every class-restricted destruction card in
 * the original game names a monster class ("an opponent's Machine monsters"),
 * never an attribute.
 */
export type CardClassFilter =
  Readonly<{ kind: "any" }> | Readonly<{ kind: "classe"; classe: string }>;

/** The two axes every field-sweeping effect needs, as one reusable shape. */
export type EffectTargets = Readonly<{ side: EffectSide; filter: CardClassFilter }>;

/**
 * One ATK/DEF step in the original game's own units. Megamorph's card text —
 * "increases the power of any selected monster by 2 levels" — against its
 * known +1000/+1000 is what fixes the conversion, and it is the same unit
 * Shadow Spell ("decreases by two levels") and Cursebreaker ("sets them at
 * level 0") are written in (`docs/spells/stat-curse.md` §2).
 */
export const POWER_PER_LEVEL = 500;

/**
 * What a card does when it is played (`docs/spells/README.md` §3). Eleven
 * atomic variants cover the 67 magic/equip cards, and **none of them is
 * card-specific** — what separates Warrior Elimination from Stain Storm is the
 * class filter, not the code.
 *
 * `equip_buff` carries no restriction of its own: which monsters accept an
 * equip is a per-card list the original game curates by hand, and it lives in
 * `equip-compatibility.ts` (`docs/spells/equip-buffs.md` §2).
 *
 * `life_points`, `attack_lock` and `cleanse_curses` take a bare `side` instead
 * of `EffectTargets`: a class filter is meaningless for an effect that reaches
 * a player rather than a card, and illegal states stay unrepresentable.
 *
 * `terrain` carries no payload on purpose. The terrain x class matrix in
 * `packages/data` is still `[]`, so `TerrainModifierProvider` stays neutral;
 * the variant exists only to make a card recognizable as a legal
 * `play_field_spell` target (`docs/spells/terrains.md` §4).
 */
export type AtomicSpellEffect =
  | Readonly<{ type: "equip_buff"; atk: number; def: number }>
  | Readonly<{ type: "destroy_monsters"; targets: EffectTargets }>
  | Readonly<{ type: "destroy_spells"; targets: EffectTargets }>
  | Readonly<{ type: "destroy_by_atk"; targets: EffectTargets; minAtk: number }>
  | Readonly<{ type: "force_attack_position"; targets: EffectTargets }>
  | Readonly<{ type: "reveal_face_down"; targets: EffectTargets }>
  | Readonly<{ type: "stat_curse"; targets: EffectTargets; levels: number }>
  | Readonly<{ type: "cleanse_curses"; side: EffectSide }>
  | Readonly<{ type: "life_points"; side: EffectSide; delta: number }>
  | Readonly<{ type: "attack_lock"; side: EffectSide; turns: number }>
  | Readonly<{ type: "terrain" }>;

/**
 * An effect, possibly composed. Only 348 Swords of Revealing Light needs the
 * composition — "Enemy monsters are revealed **and** your opponent cannot
 * attack for three turns" is two atomic effects, and inventing a
 * `reveal_and_lock` variant for one card is exactly the card-specific coupling
 * this vocabulary avoids.
 *
 * `sequence` holds `AtomicSpellEffect`, not `SpellEffect`, so the union stays
 * **non-recursive** and `z.discriminatedUnion` keeps working without `z.lazy`.
 * A sequence of sequences buys nothing anyway.
 */
export type SpellEffect =
  | AtomicSpellEffect
  | Readonly<{ type: "sequence"; effects: readonly AtomicSpellEffect[] }>;

/**
 * Which action a card in hand must be played with. Derived from the effect
 * table, never from `tipo` alone: the dataset cannot tell 337 Raigeki from
 * 330 Forest — both are `tipo: "magica"`, `classe: "Magic"` — and this table
 * is the only discriminator (`docs/spells/README.md` §4).
 *
 * `place` is the fallback for every card without a table entry: the 10 traps
 * and the 24 ritual cards, which have no activation mechanic in the engine.
 */
export type SpellPlayMode = "equip" | "terrain" | "one_shot" | "place";
