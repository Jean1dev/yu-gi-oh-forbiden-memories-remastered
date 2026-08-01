import type { PlayerId, PublicPlayerState, ZoneIndex, ZoneReference } from "@yugioh/shared";
import type { DuelCue } from "../../lib/free-duel/duel-cues.ts";
import type { ZoneAffordance } from "../../lib/free-duel/duel-interaction.ts";
import { ZONE_LABELS } from "../../lib/free-duel/duel-screen-messages.ts";
import { DuelZone } from "./duel-zone.tsx";
import { LpIndicator } from "./lp-indicator.tsx";
import styles from "./duel-side.module.css";

export type DuelSideProps = Readonly<{
  player: PlayerId;
  state: PublicPlayerState;
  label: string;
  mirrored?: boolean | undefined;
  interactive: boolean;
  zoneAffordance: (reference: ZoneReference) => ZoneAffordance;
  cueFor: (reference: ZoneReference) => DuelCue["kind"] | undefined;
  onZoneActivate: (reference: ZoneReference) => void;
}>;

function handCount(state: PublicPlayerState): number {
  return state.hand.visible ? state.hand.cards.length : state.hand.count;
}

function zoneRef(player: PlayerId, zoneType: ZoneReference["zoneType"], index: number): ZoneReference {
  return { player, zoneType, index: index as ZoneIndex };
}

function ZoneRow({
  player,
  zoneType,
  label,
  zones,
  interactive,
  zoneAffordance,
  cueFor,
  onZoneActivate,
}: Readonly<{
  player: PlayerId;
  zoneType: ZoneReference["zoneType"];
  label: string;
  zones: readonly PublicPlayerState["field"]["monsters"][number][] | readonly PublicPlayerState["field"]["spells"][number][];
  interactive: boolean;
  zoneAffordance: (reference: ZoneReference) => ZoneAffordance;
  cueFor: (reference: ZoneReference) => DuelCue["kind"] | undefined;
  onZoneActivate: (reference: ZoneReference) => void;
}>) {
  return (
    <ul className={`${styles.row} ${zoneType === "spell" ? styles.backrow : ""}`} aria-label={label}>
      {zones.map((zone, index) => {
        const reference = zoneRef(player, zoneType, index);
        const affordance = zoneAffordance(reference);
        const active = interactive && affordance !== "idle";
        return (
          <DuelZone
            key={`${player}-${zoneType}-${index}`}
            zone={zone}
            reference={reference}
            label={`${label} ${index + 1}`}
            emptyLabel={zoneType === "monster" ? ZONE_LABELS.emptyMonster : ZONE_LABELS.emptySpell}
            affordance={affordance}
            cue={cueFor(reference)}
            onActivate={active ? () => onZoneActivate(reference) : undefined}
          />
        );
      })}
    </ul>
  );
}

export function DuelSide({
  player,
  state,
  label,
  mirrored = false,
  interactive,
  zoneAffordance,
  cueFor,
  onZoneActivate,
}: DuelSideProps) {
  const meta = (
    <div className={styles.meta}>
      <LpIndicator label={label} lp={state.lp} />
      <span className={styles.counts}>
        <span>Mao: {handCount(state)}</span>
        <span>Deck: {state.remainingDeck}</span>
      </span>
    </div>
  );
  const monsters = (
    <ZoneRow
      player={player}
      zoneType="monster"
      label={`${ZONE_LABELS.monster} ${label}`}
      zones={state.field.monsters}
      interactive={interactive}
      zoneAffordance={zoneAffordance}
      cueFor={cueFor}
      onZoneActivate={onZoneActivate}
    />
  );
  const spells = (
    <ZoneRow
      player={player}
      zoneType="spell"
      label={`${ZONE_LABELS.spell} ${label}`}
      zones={state.field.spells}
      interactive={interactive}
      zoneAffordance={zoneAffordance}
      cueFor={cueFor}
      onZoneActivate={onZoneActivate}
    />
  );

  return (
    <section className={`${styles.side} ${mirrored ? styles.player : ""}`} aria-label={`Campo ${label}`}>
      {mirrored ? (
        <>
          {spells}
          {monsters}
          {meta}
        </>
      ) : (
        <>
          {meta}
          {monsters}
          {spells}
        </>
      )}
    </section>
  );
}
