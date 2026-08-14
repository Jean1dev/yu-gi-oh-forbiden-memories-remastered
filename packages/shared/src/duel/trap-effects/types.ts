/** Data-driven effects for the ten Forbidden Memories trap cards. */
export type TrapEffect =
  | Readonly<{ type: "destroy_attacker"; maxAtk: number | null }>
  | Readonly<{ type: "reflect_effect_damage" }>
  | Readonly<{ type: "invert_effect_heal" }>
  | Readonly<{ type: "reverse_equip" }>
  | Readonly<{ type: "decoy" }>;
