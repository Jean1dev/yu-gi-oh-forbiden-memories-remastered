import type { Card } from "@yugioh/shared";
import { FieldSlot } from "./field-slot.tsx";
import { LpIndicator } from "./lp-indicator.tsx";
import styles from "./duel-lp-bar.module.css";

export type DuelLpBarProps = Readonly<{
  playerLp: number;
  opponentLp: number;
  playerName?: string | undefined;
  opponentName?: string | undefined;
  playerCue?: "damage" | undefined;
  opponentCue?: "damage" | undefined;
  activeField: Card | null;
  onInspectField?: ((card: Card) => void) | undefined;
}>;

/** The strip that separates the two halves of the board: LP, terrain, LP. */
export function DuelLpBar({
  playerLp,
  opponentLp,
  playerName,
  opponentName,
  playerCue,
  opponentCue,
  activeField,
  onInspectField,
}: DuelLpBarProps) {
  return (
    <div className={styles.bar}>
      <LpIndicator label="Jogador" name={playerName} lp={playerLp} side="me" cue={playerCue} />
      <FieldSlot card={activeField} onInspect={onInspectField} />
      <LpIndicator
        label="Oponente"
        name={opponentName}
        lp={opponentLp}
        side="opponent"
        cue={opponentCue}
      />
    </div>
  );
}
