import type { MonsterPosition } from "@yugioh/shared";

const NEXT_POSITION: Readonly<Record<MonsterPosition, MonsterPosition>> = {
  attack_face_up: "defense_face_up",
  defense_face_up: "attack_face_up",
  defense_face_down: "attack_face_up",
  attack_face_down: "defense_face_up",
};

/**
 * The deterministic position a manual position change moves to: posture
 * (attack/defense) always alternates, and the face always turns up if it
 * was down — never the reverse (motor-duelo-1x1 F10 spec Decision 3).
 */
export function nextPosition(position: MonsterPosition): MonsterPosition {
  return NEXT_POSITION[position];
}

/** Whether `position` is one of the two face-down variants. */
export function isFaceDown(position: MonsterPosition): boolean {
  return position === "attack_face_down" || position === "defense_face_down";
}
