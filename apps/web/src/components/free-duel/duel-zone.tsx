import type { PublicMonsterZone, PublicSpellZone, ZoneReference } from "@yugioh/shared";
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
}>;

function isMonsterZone(zone: PublicMonsterZone | PublicSpellZone): zone is PublicMonsterZone {
  return "position" in zone || !("faceUp" in zone);
}

function visibleStats(zone: PublicMonsterZone | PublicSpellZone): string | null {
  if (!zone.occupied || !isMonsterZone(zone) || !zone.card.visible) return null;
  return `${zone.card.card.atk ?? "-"} / ${zone.card.card.def ?? "-"}`;
}

export function DuelZone({
  zone,
  label,
  emptyLabel,
  affordance,
  cue,
  onActivate,
}: DuelZoneProps) {
  const disabled = onActivate === undefined;
  const stats = visibleStats(zone);

  let content = <span className={styles.empty}>{emptyLabel}</span>;
  let ariaLabel = `${label}, ${emptyLabel}`;

  if (zone.occupied) {
    if (zone.card.visible) {
      ariaLabel = `${label}, ${zone.card.card.nome}`;
      content = (
        <>
          <DuelCardArt cardNumber={zone.card.card.numero} label={zone.card.card.nome} />
          <span className={styles.name} aria-hidden="true">
            {zone.card.card.nome}
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
      content = <DuelCardArt hidden label={ZONE_LABELS.hiddenCard} />;
    }
  }

  return (
    <li className={styles.item}>
      <button
        type="button"
        className={styles.button}
        aria-label={ariaLabel}
        disabled={disabled}
        data-affordance={affordance}
        data-cue={cue}
        onClick={onActivate}
      >
        {content}
      </button>
    </li>
  );
}
