import type { CardNumber } from "../../card/types.ts";
import type { TrapEffect } from "./types.ts";

/** Authored effects for every trap card in the canonical FM dataset. */
export const TRAP_EFFECTS: Readonly<Record<CardNumber, TrapEffect>> = Object.freeze({
  "681": { type: "destroy_attacker", maxAtk: 500 },
  "682": { type: "destroy_attacker", maxAtk: 1000 },
  "683": { type: "destroy_attacker", maxAtk: 1500 },
  "684": { type: "destroy_attacker", maxAtk: 2000 },
  "685": { type: "destroy_attacker", maxAtk: 3000 },
  "686": { type: "destroy_attacker", maxAtk: null },
  "687": { type: "reflect_effect_damage" },
  "688": { type: "invert_effect_heal" },
  "689": { type: "reverse_equip" },
  "690": { type: "decoy" },
});

export function getTrapEffect(cardNumber: CardNumber): TrapEffect | undefined {
  return Object.hasOwn(TRAP_EFFECTS, cardNumber) ? TRAP_EFFECTS[cardNumber] : undefined;
}
