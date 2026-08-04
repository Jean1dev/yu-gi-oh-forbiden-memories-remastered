import type { MonsterPosition } from "@yugioh/shared";
import type { DuelIntent } from "../../lib/free-duel/duel-interaction.ts";
import { DUEL_SCREEN_MESSAGES, POSITION_LABELS } from "../../lib/free-duel/duel-screen-messages.ts";
import styles from "./duel-prompt.module.css";

const POSITION_ORDER: readonly MonsterPosition[] = [
  "attack_face_up",
  "attack_face_down",
  "defense_face_up",
  "defense_face_down",
];

function promptText(intent: DuelIntent): string {
  switch (intent.kind) {
    case "choosing_zone":
      return DUEL_SCREEN_MESSAGES.chooseZone;
    case "choosing_position":
      return DUEL_SCREEN_MESSAGES.choosePosition;
    case "choosing_equip_target":
      return DUEL_SCREEN_MESSAGES.chooseEquipTarget;
    case "choosing_attacker":
      return DUEL_SCREEN_MESSAGES.chooseAttacker;
    case "choosing_target":
      return DUEL_SCREEN_MESSAGES.chooseTarget;
    case "choosing_flip":
      return DUEL_SCREEN_MESSAGES.choosePositionChange;
    case "card_selected":
    case "idle":
      return DUEL_SCREEN_MESSAGES.idle;
  }
}

export function DuelPrompt({
  intent,
  onChoosePosition,
  onCancel,
}: Readonly<{
  intent: DuelIntent;
  onChoosePosition: (position: MonsterPosition) => void;
  onCancel: () => void;
}>) {
  return (
    <div className={styles.prompt}>
      <p className={styles.text}>{promptText(intent)}</p>
      {intent.kind === "choosing_position" ? (
        <div className={styles.positions} aria-label="Posicoes de invocacao">
          {POSITION_ORDER.map((position) => (
            <button key={position} type="button" onClick={() => onChoosePosition(position)}>
              {POSITION_LABELS[position]}
            </button>
          ))}
        </div>
      ) : null}
      {intent.kind !== "idle" ? (
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
      ) : null}
    </div>
  );
}
