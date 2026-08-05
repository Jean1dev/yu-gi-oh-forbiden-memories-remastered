import type { Attribute } from "@yugioh/shared";

import styles from "./attribute-badge.module.css";

export type AttributeBadgeProps = Readonly<{
  attribute: Attribute | null;
}>;

const ATTRIBUTE_LABEL: Readonly<Record<Attribute, string>> = {
  DARK: "DA",
  LIGHT: "LI",
  EARTH: "EA",
  WATER: "WA",
  FIRE: "FI",
  WIND: "WI",
  DIVINE: "DI",
};

/** Original badge, not licensed TCG art (spec F04, Decision 1). */
export function AttributeBadge({ attribute }: AttributeBadgeProps) {
  if (attribute === null) {
    return null;
  }

  return (
    <span
      className={styles.badge}
      data-attribute={attribute}
      role="img"
      aria-label={attribute}
    >
      {ATTRIBUTE_LABEL[attribute]}
    </span>
  );
}
