"use client";

import { useState } from "react";

import type { Duelist, DuelistId } from "@yugioh/shared";

import { DifficultyIndicator } from "./difficulty-indicator.tsx";
import styles from "./duelist-card.module.css";

export function DuelistCard({
  duelist,
  selected,
  onSelect,
}: {
  duelist: Duelist;
  selected: boolean;
  onSelect(id: DuelistId): void;
}) {
  const [portraitFailed, setPortraitFailed] = useState(false);
  return (
    <div role="listitem">
      <button
        className={styles.card}
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(duelist.id)}
      >
        {portraitFailed ? (
          <span className={styles.placeholder} aria-label="Portrait unavailable">
            ?
          </span>
        ) : (
          // A roster portrait is content data. A missing pending asset switches to the neutral placeholder.
          <img
            className={styles.portrait}
            src={`/${duelist.portrait}`}
            alt=""
            onError={() => setPortraitFailed(true)}
          />
        )}
        <strong>{duelist.name}</strong>
        <DifficultyIndicator difficulty={duelist.difficulty} />
      </button>
    </div>
  );
}
