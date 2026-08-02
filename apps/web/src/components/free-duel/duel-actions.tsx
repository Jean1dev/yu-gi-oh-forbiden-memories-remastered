import type { ActionSlot, ActionSlotId } from "../../lib/free-duel/duel-interaction.ts";
import styles from "./duel-actions.module.css";

export type DuelActionsProps = Readonly<{
  slots: readonly [ActionSlot, ActionSlot, ActionSlot];
  onInvoke: (id: ActionSlotId) => void;
}>;

export function DuelActions({ slots, onInvoke }: DuelActionsProps) {
  return (
    <div className={styles.actions} aria-label="Acoes do duelo">
      {slots.map((slot, index) => (
        <button
          key={`${slot.id}-${index}`}
          type="button"
          className={`${styles.button} ${slot.variant === "primary" ? styles.primary : styles.secondary}`}
          disabled={slot.disabled || slot.id === "none"}
          onClick={() => onInvoke(slot.id)}
        >
          {slot.label}
        </button>
      ))}
    </div>
  );
}
