"use client";

import type { ArtReference } from "@yugioh/shared";
import { useState } from "react";

export type CardArtProps = Readonly<{
  art: ArtReference;
  label: string;
}>;

/** Fixed aspect ratio declared up front so lazy loading never shifts the cell's layout (Decision 7). */
const ART_STYLE = {
  aspectRatio: "3 / 4",
  width: "100%",
  height: "auto",
  objectFit: "cover",
} as const;

/**
 * Three cases resolved by `library/F01`, plus a fourth handled here: a real
 * network/decoding failure of an `"art"` reference falls back to the same
 * placeholder markup as a missing file (spec library/F02 §6). Both the
 * missing-art placeholder and the not-obtained silhouette are neutral
 * markers pending final art direction (Decision 8) — no lore or asset is
 * invented.
 */
export function CardArt({ art, label }: CardArtProps) {
  const [failed, setFailed] = useState(false);

  if (art.kind === "silhouette") {
    return (
      <div role="img" aria-label={label} data-testid="card-art-silhouette" style={ART_STYLE} />
    );
  }

  if (art.kind === "placeholder" || failed) {
    return (
      <div role="img" aria-label={label} data-testid="card-art-placeholder" style={ART_STYLE} />
    );
  }

  return (
    <img
      src={art.path}
      alt={label}
      loading="lazy"
      decoding="async"
      style={ART_STYLE}
      onError={() => setFailed(true)}
    />
  );
}
