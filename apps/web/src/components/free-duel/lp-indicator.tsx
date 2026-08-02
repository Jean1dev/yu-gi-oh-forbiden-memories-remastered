import styles from "./lp-indicator.module.css";

export function LpIndicator({
  label,
  lp,
  cue,
}: {
  readonly label: string;
  readonly lp: number;
  readonly cue?: "damage" | undefined;
}) {
  return (
    <p className={styles.indicator} aria-label={`${label} pontos de vida`} data-cue={cue}>
      {label}: <strong className={styles.value}>{lp} LP</strong>
    </p>
  );
}
