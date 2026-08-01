import type { PublicDuelState, ZoneReference } from "@yugioh/shared";
import type { DuelCue } from "../../lib/free-duel/duel-cues.ts";
import type { ZoneAffordance } from "../../lib/free-duel/duel-interaction.ts";
import { DuelSide } from "./duel-side.tsx";
import styles from "./duel-board.module.css";

const idleZoneAffordance = () => "idle" as const;
const noCue = () => undefined;
const noop = () => undefined;

export type DuelBoardProps = Readonly<{
  view: PublicDuelState;
  zoneAffordance?: ((reference: ZoneReference) => ZoneAffordance) | undefined;
  cueFor?: ((reference: ZoneReference) => DuelCue["kind"] | undefined) | undefined;
  onZoneActivate?: ((reference: ZoneReference) => void) | undefined;
  interactive?: boolean | undefined;
}>;

export function DuelBoard({
  view,
  zoneAffordance = idleZoneAffordance,
  cueFor = noCue,
  onZoneActivate = noop,
  interactive = false,
}: DuelBoardProps) {
  return (
    <section className={styles.board} aria-label="Tabuleiro de duelo">
      <DuelSide
        player="P2"
        state={view.players.P2}
        label="Oponente"
        interactive={interactive}
        zoneAffordance={zoneAffordance}
        cueFor={cueFor}
        onZoneActivate={onZoneActivate}
      />
      <DuelSide
        player="P1"
        state={view.players.P1}
        label="Jogador"
        mirrored
        interactive={interactive}
        zoneAffordance={zoneAffordance}
        cueFor={cueFor}
        onZoneActivate={onZoneActivate}
      />
    </section>
  );
}
