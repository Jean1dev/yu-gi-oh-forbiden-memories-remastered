import styles from "./lp-indicator.module.css";

export function LpIndicator({ label, lp }: { readonly label: string; readonly lp: number }) {
  return (
    <p className={styles.indicator} aria-label={`${label} pontos de vida`}>
      {label}: <strong className={styles.value}>{lp} LP</strong>
    </p>
  );
}
