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

const REVEALED_POSITION: Readonly<Record<MonsterPosition, MonsterPosition>> = {
  attack_face_up: "attack_face_up",
  defense_face_up: "defense_face_up",
  defense_face_down: "defense_face_up",
  attack_face_down: "attack_face_up",
};

/**
 * The position a monster shows when something merely reveals it (350
 * Dark-piercing Light, and the first half of 348 Swords of Revealing Light).
 *
 * `nextPosition` cannot serve here: it also flips the posture, so a defending
 * monster revealed by a card would come back in attack. Revealing turns the
 * face up and leaves attack/defense exactly as it was, which is why this is a
 * second table rather than a branch — the mapping is the whole rule.
 */
export function revealPosition(position: MonsterPosition): MonsterPosition {
  return REVEALED_POSITION[position];
}
