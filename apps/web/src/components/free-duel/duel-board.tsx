import type { Card, PublicDuelState, ZoneReference } from "@yugioh/shared";
import type { ReactNode } from "react";
import type { DuelCue } from "../../lib/free-duel/duel-cues.ts";
import type { ZoneAffordance } from "../../lib/free-duel/duel-interaction.ts";
import { DuelLpBar } from "./duel-lp-bar.tsx";
import { DuelSide } from "./duel-side.tsx";
import { OpponentHand } from "./opponent-hand.tsx";
import styles from "./duel-board.module.css";

const idleZoneAffordance = () => "idle" as const;
const noCue = () => undefined;
const noPlayerCue = () => undefined;
const noop = () => undefined;

export type DuelBoardProps = Readonly<{
  view: PublicDuelState;
  /** Lets the screen place the board in its grid without owning `.board`. */
  className?: string | undefined;
  playerName?: string | undefined;
  opponentName?: string | undefined;
  zoneAffordance?: ((reference: ZoneReference) => ZoneAffordance) | undefined;
  cueFor?: ((reference: ZoneReference) => DuelCue["kind"] | undefined) | undefined;
  cueForPlayer?: ((player: "P1" | "P2") => DuelCue | undefined) | undefined;
  onZoneActivate?: ((reference: ZoneReference) => void) | undefined;
  /** Fed by hovering or focusing a card; drives the inspector column. */
  onInspect?: ((card: Card) => void) | undefined;
  interactive?: boolean | undefined;
  /** The hand strip and its controls, pinned to the bottom of the board. */
  children?: ReactNode;
}>;

/**
 * The playing field: the opponent's face-down hand, their half, the LP bar,
 * the player's half, and whatever the screen pins underneath.
 */
export function DuelBoard({
  view,
  className,
  playerName,
  opponentName,
  zoneAffordance = idleZoneAffordance,
  cueFor = noCue,
  cueForPlayer = noPlayerCue,
  onZoneActivate = noop,
  onInspect,
  interactive = false,
  children,
}: DuelBoardProps) {
  const opponentHand = view.players.P2.hand;

  return (
    <section className={`${styles.board} ${className ?? ""}`} aria-label="Tabuleiro de duelo">
      {opponentHand.visible ? null : <OpponentHand count={opponentHand.count} />}
      <DuelSide
        player="P2"
        state={view.players.P2}
        label="Oponente"
        interactive={interactive}
        zoneAffordance={zoneAffordance}
        cueFor={cueFor}
        onZoneActivate={onZoneActivate}
        onInspect={onInspect}
      />
      <DuelLpBar
        playerLp={view.players.P1.lp}
        opponentLp={view.players.P2.lp}
        playerName={playerName}
        opponentName={opponentName}
        playerCue={cueForPlayer("P1")?.kind === "damage" ? "damage" : undefined}
        opponentCue={cueForPlayer("P2")?.kind === "damage" ? "damage" : undefined}
        activeField={view.activeField}
        onInspectField={onInspect}
      />
      <DuelSide
        player="P1"
        state={view.players.P1}
        label="Jogador"
        interactive={interactive}
        zoneAffordance={zoneAffordance}
        cueFor={cueFor}
        onZoneActivate={onZoneActivate}
        onInspect={onInspect}
      />
      {children}
    </section>
  );
}
