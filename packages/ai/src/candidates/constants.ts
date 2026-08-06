import type { MonsterPosition, ZoneIndex } from "@yugioh/shared";

export const ZONE_INDICES: readonly ZoneIndex[] = Object.freeze([0, 1, 2, 3, 4]);
export const MONSTER_POSITIONS: readonly MonsterPosition[] = Object.freeze([
  "attack_face_up",
  "attack_face_down",
  "defense_face_up",
  "defense_face_down",
]);
