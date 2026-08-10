import type { Card } from "@yugioh/shared";
import { DUEL_SCREEN_MESSAGES } from "../../lib/free-duel/duel-screen-messages.ts";
import { DuelCardArt } from "./duel-card-art.tsx";
import styles from "./field-slot.module.css";

export type FieldSlotProps = Readonly<{
  card: Card | null;
  onInspect?: ((card: Card) => void) | undefined;
}>;

/**
 * The terrain slot at the centre of the LP bar. It is the only place the
 * active field spell is shown now that the duel has no top bar, so it renders
 * the `Terreno: <nome>` line the top bar used to own.
 */
export function FieldSlot({ card, onInspect }: FieldSlotProps) {
  if (!card) {
    return (
      <div className={styles.slot} data-empty="true">
        <span className={styles.caption}>{DUEL_SCREEN_MESSAGES.terrain}</span>
        <span className={styles.label}>{DUEL_SCREEN_MESSAGES.noTerrain}</span>
      </div>
    );
  }

  return (
    // The slot is 78px wide, so only the terrain's name fits on it; the word
    // "Terreno" survives in the accessible name.
    <button
      type="button"
      className={styles.slot}
      aria-label={`${DUEL_SCREEN_MESSAGES.terrain}: ${card.nome}`}
      onClick={() => onInspect?.(card)}
      onPointerEnter={() => onInspect?.(card)}
      onFocus={() => onInspect?.(card)}
    >
      <span className={styles.art}>
        <DuelCardArt cardNumber={card.numero} label={card.nome} crop fill />
      </span>
      <span className={styles.label} aria-hidden="true">
        {card.nome}
      </span>
    </button>
  );
}
