import type { Card, PlayerId, PublicPlayerState, ZoneIndex, ZoneReference } from "@yugioh/shared";
import type { DuelCue } from "../../lib/free-duel/duel-cues.ts";
import type { ZoneAffordance } from "../../lib/free-duel/duel-interaction.ts";
import { ZONE_LABELS } from "../../lib/free-duel/duel-screen-messages.ts";
import { DuelZone } from "./duel-zone.tsx";
import styles from "./duel-side.module.css";

export type DuelSideProps = Readonly<{
  player: PlayerId;
  state: PublicPlayerState;
  label: string;
  interactive: boolean;
  zoneAffordance: (reference: ZoneReference) => ZoneAffordance;
  cueFor: (reference: ZoneReference) => DuelCue["kind"] | undefined;
  onZoneActivate: (reference: ZoneReference) => void;
  onInspect?: ((card: Card) => void) | undefined;
}>;

function zoneRef(
  player: PlayerId,
  zoneType: ZoneReference["zoneType"],
  index: number,
): ZoneReference {
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
  onInspect,
}: Readonly<{
  player: PlayerId;
  zoneType: ZoneReference["zoneType"];
  label: string;
  zones:
    | readonly PublicPlayerState["field"]["monsters"][number][]
    | readonly PublicPlayerState["field"]["spells"][number][];
  interactive: boolean;
  zoneAffordance: (reference: ZoneReference) => ZoneAffordance;
  cueFor: (reference: ZoneReference) => DuelCue["kind"] | undefined;
  onZoneActivate: (reference: ZoneReference) => void;
  onInspect?: ((card: Card) => void) | undefined;
}>) {
  return (
    <ul className={styles.row} aria-label={label}>
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
            onInspect={onInspect}
          />
        );
      })}
    </ul>
  );
}

/**
 * One player's half of the board.
 *
 * Both halves are laid out the same way — monsters on top, spells/traps
 * underneath — rather than being mirrored around the centre. That is what the
 * approved layout asks for: a player reads their own monsters as the front
 * line of their half, and mirroring used to put the player's backrow above
 * their own monsters.
 */
export function DuelSide({
  player,
  state,
  label,
  interactive,
  zoneAffordance,
  cueFor,
  onZoneActivate,
  onInspect,
}: DuelSideProps) {
  return (
    <section className={styles.side} aria-label={`Campo ${label}`}>
      <ZoneRow
        player={player}
        zoneType="monster"
        label={`${ZONE_LABELS.monster} ${label}`}
        zones={state.field.monsters}
        interactive={interactive}
        zoneAffordance={zoneAffordance}
        cueFor={cueFor}
        onZoneActivate={onZoneActivate}
        onInspect={onInspect}
      />
      <ZoneRow
        player={player}
        zoneType="spell"
        label={`${ZONE_LABELS.spell} ${label}`}
        zones={state.field.spells}
        interactive={interactive}
        zoneAffordance={zoneAffordance}
        cueFor={cueFor}
        onZoneActivate={onZoneActivate}
        onInspect={onInspect}
      />
    </section>
  );
}
