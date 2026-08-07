import { INITIAL_LP } from "@yugioh/shared";
import styles from "./lp-indicator.module.css";

export type LpIndicatorProps = Readonly<{
  /**
   * The player's *role* ("Jogador" / "Oponente"). It is the accessible name of
   * the panel, so it stays stable even when a duelist's name is shown — the
   * duel screen and its tests address the panel by role, not by who is sitting
   * behind it.
   */
  label: string;
  lp: number;
  /** The visible display name; defaults to the role. */
  name?: string | undefined;
  /** Which half of the LP bar this panel sits in; drives the mirroring. */
  side?: "me" | "opponent" | undefined;
  cue?: "damage" | undefined;
}>;

export function LpIndicator({ label, lp, name, side = "me", cue }: LpIndicatorProps) {
  // Clamped rather than assumed: spells can push a player above the starting
  // total, and a >100% track would overflow the panel.
  const filled = Math.min(100, Math.max(0, (lp / INITIAL_LP) * 100));

  return (
    <div
      className={styles.panel}
      data-side={side}
      data-cue={cue}
      aria-label={`${label} pontos de vida`}
    >
      <p className={styles.name}>{name ?? label}</p>
      <p className={styles.value}>{lp} LP</p>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${filled}%` }} />
      </span>
    </div>
  );
}
