import type { Phase } from "@yugioh/shared";
import { DUEL_SCREEN_MESSAGES, PHASE_LABELS } from "../../lib/free-duel/duel-screen-messages.ts";
import styles from "./turn-chip.module.css";

/** Turn and phase readout, inherited from the duel's former top bar. */
export function TurnChip({ turn, phase }: Readonly<{ turn: number; phase: Phase }>) {
  return (
    <p className={styles.chip}>
      <span>
        {DUEL_SCREEN_MESSAGES.turn}: {turn}
      </span>
      <span>
        {DUEL_SCREEN_MESSAGES.phase}: {PHASE_LABELS[phase]}
      </span>
    </p>
  );
}
