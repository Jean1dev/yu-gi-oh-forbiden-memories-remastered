/**
 * Whose side of the field an effect reaches. `caster` is the player who played
 * the card, never a fixed `PlayerId` — the table has to describe an effect
 * independently of who happens to hold the card.
 */
export type EffectSide = "caster" | "opponent" | "both";

/**
 * Which cards inside the selected side an effect reaches. The dataset has no
 * attribute field, so `classe` is the only axis available (`docs/spells/README.md` §7).
 */
export type CardClassFilter =
  Readonly<{ kind: "any" }> | Readonly<{ kind: "classe"; classe: string }>;

/** The two axes every field-sweeping effect needs, as one reusable shape. */
export type EffectTargets = Readonly<{ side: EffectSide; filter: CardClassFilter }>;

/**
 * What a card does when it is played (`docs/spells/README.md` §3). Seven
 * variants cover the 25 specified cards; none of them is card-specific — what
 * separates Legendary Sword from Dragon Treasure is the class filter, not the
 * code.
 *
 * `life_points` and `attack_lock` take a bare `side` instead of
 * `EffectTargets`: a class filter is meaningless for a player-level effect, and
 * illegal states stay unrepresentable.
 *
 * `terrain` carries no payload on purpose. The terrain x class matrix in
 * `packages/data` is still `[]`, so `TerrainModifierProvider` stays neutral;
 * the variant exists only to make a card recognizable as a legal
 * `play_field_spell` target (`docs/spells/terrains.md` §4).
 */
export type SpellEffect =
  | Readonly<{ type: "equip_buff"; atk: number; def: number; requires: CardClassFilter }>
  | Readonly<{ type: "destroy_monsters"; targets: EffectTargets }>
  | Readonly<{ type: "destroy_spells"; targets: EffectTargets }>
  | Readonly<{ type: "force_attack_position"; targets: EffectTargets }>
  | Readonly<{ type: "life_points"; side: EffectSide; delta: number }>
  | Readonly<{ type: "attack_lock"; side: EffectSide; turns: number }>
  | Readonly<{ type: "terrain" }>;

/**
 * Which action a card in hand must be played with. Derived from the effect
 * table, never from `tipo` alone: cards 302 and 306 are `tipo: "equipamento"`
 * but resolve immediately (`docs/spells/README.md` §4).
 *
 * `place` is the fallback for every card without a table entry — the 42 other
 * magic/equip cards and all 10 traps keep behaving exactly as they do today.
 */
export type SpellPlayMode = "equip" | "terrain" | "one_shot" | "place";
