import styles from "./duel-message.module.css";

export function DuelMessage({
  text,
  tone,
}: Readonly<{ text: string | null; tone: "info" | "refusal" }>) {
  if (!text) return null;
  return (
    <p className={`${styles.message} ${tone === "refusal" ? styles.refusal : styles.info}`} role="status" aria-live="polite">
      {text}
    </p>
  );
}
