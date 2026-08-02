import type { Phase } from "@yugioh/shared";
import type { ReactNode } from "react";
import { DUEL_SCREEN_MESSAGES, PHASE_LABELS } from "../../lib/free-duel/duel-screen-messages.ts";
import styles from "./duel-top-bar.module.css";

export type DuelTopBarProps = Readonly<{
  terrainName: string | null;
  phase: Phase;
  turn: number;
  onExit: () => void;
  children?: ReactNode;
}>;

export function DuelTopBar({ terrainName, phase, turn, onExit, children }: DuelTopBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.stats}>
        <span>
          {DUEL_SCREEN_MESSAGES.terrain}: {terrainName ?? DUEL_SCREEN_MESSAGES.noTerrain}
        </span>
        <span>
          {DUEL_SCREEN_MESSAGES.phase}: {PHASE_LABELS[phase]}
        </span>
        <span>
          {DUEL_SCREEN_MESSAGES.turn}: {turn}
        </span>
      </div>
      <div className={styles.actions}>
        {children}
        <button type="button" className={styles.exit} onClick={onExit}>
          {DUEL_SCREEN_MESSAGES.exitDuel}
        </button>
      </div>
    </header>
  );
}
