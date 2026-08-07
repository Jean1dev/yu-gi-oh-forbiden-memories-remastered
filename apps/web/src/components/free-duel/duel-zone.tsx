import type { Card, PublicMonsterZone, PublicSpellZone, ZoneReference } from "@yugioh/shared";
import type { DuelCue } from "../../lib/free-duel/duel-cues.ts";
import type { ZoneAffordance } from "../../lib/free-duel/duel-interaction.ts";
import { ZONE_LABELS } from "../../lib/free-duel/duel-screen-messages.ts";
import { DuelCardArt } from "./duel-card-art.tsx";
import styles from "./duel-zone.module.css";

export type DuelZoneProps = Readonly<{
  zone: PublicMonsterZone | PublicSpellZone;
  reference: ZoneReference;
  label: string;
  emptyLabel: "Vazio" | "-";
  affordance: ZoneAffordance;
  cue?: DuelCue["kind"] | undefined;
  onActivate?: (() => void) | undefined;
  /**
   * Fires when the zone is pointed at or focused, so the inspector can preview
   * a card already on the field. It cannot ride on the button's click — that
   * is the game action — and it hangs off the `<li>` because the button is
   * `disabled` outside the player's turn and would swallow the events.
   */
  onInspect?: ((card: Card) => void) | undefined;
}>;

function isMonsterZone(zone: PublicMonsterZone | PublicSpellZone): zone is PublicMonsterZone {
  return "position" in zone || !("faceUp" in zone);
}

function visibleStats(zone: PublicMonsterZone | PublicSpellZone): string | null {
  if (!zone.occupied || !isMonsterZone(zone) || !zone.card.visible) return null;
  return `${zone.card.card.atk ?? "-"} / ${zone.card.card.def ?? "-"}`;
}

/** Defense monsters lie sideways on the field, whether face-up or face-down. */
function monsterOrientation(
  zone: PublicMonsterZone | PublicSpellZone,
): "attack" | "defense" | undefined {
  if (!zone.occupied || !isMonsterZone(zone)) return undefined;
  return zone.position.startsWith("defense") ? "defense" : "attack";
}

export function DuelZone({
  zone,
  label,
  emptyLabel,
  affordance,
  cue,
  onActivate,
  onInspect,
}: DuelZoneProps) {
  const disabled = onActivate === undefined;
  const stats = visibleStats(zone);
  const orientation = monsterOrientation(zone);
  const inspectable = zone.occupied && zone.card.visible ? zone.card.card : null;

  // The empty marker is the decorative star of the slot art; the zone's own
  // `aria-label` is what says "Vazio" / "-".
  let content = <span className={styles.empty} aria-hidden="true" />;
  let ariaLabel = `${label}, ${emptyLabel}`;

  if (zone.occupied) {
    if (zone.card.visible) {
      const { card } = zone.card;
      // A zone is a slot on a board, not a card gallery cell: the art fills it
      // edge to edge with `{atk}/{def}` as the only overlay. The name lives in
      // the zone's accessible name and in the inspector column — a second
      // strip would leave a board zone with more chrome than picture. The full
      // `CardFrame` is a fixed vertical stack that cannot compress in here at
      // all, which is why the inspector owns it.
      ariaLabel = `${label}, ${card.nome}`;
      content = (
        <>
          <span className={styles.card} data-orientation={orientation}>
            <DuelCardArt cardNumber={card.numero} label={card.nome} crop fill />
          </span>
          {stats ? (
            <span className={styles.stats} aria-hidden="true">
              {stats}
            </span>
          ) : null}
        </>
      );
    } else {
      ariaLabel = `${label}, ${ZONE_LABELS.hiddenCard}`;
      content = (
        <span className={styles.card} data-orientation={orientation}>
          <DuelCardArt hidden label={ZONE_LABELS.hiddenCard} fill />
        </span>
      );
    }
  }

  const inspect = inspectable && onInspect ? () => onInspect(inspectable) : undefined;

  return (
    <li className={styles.item} onPointerEnter={inspect} onFocusCapture={inspect}>
      <button
        type="button"
        className={styles.button}
        aria-label={ariaLabel}
        disabled={disabled}
        data-occupied={zone.occupied ? "true" : undefined}
        data-affordance={affordance}
        data-cue={cue}
        data-orientation={orientation}
        onClick={onActivate}
      >
        {content}
      </button>
    </li>
  );
}
