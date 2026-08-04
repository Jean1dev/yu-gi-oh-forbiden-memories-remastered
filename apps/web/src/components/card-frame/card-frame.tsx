"use client";

import type { ArtReference, Card } from "@yugioh/shared";

import { MonsterCardFrame } from "./monster-card-frame.tsx";
import { SpellTrapCardFrame } from "./spell-trap-card-frame.tsx";

export type CardFrameProps = Readonly<{
  card: Card;
  art: ArtReference;
  size?: "completo" | "compacto";
}>;

/** Picks `MonsterCardFrame` or `SpellTrapCardFrame` by `card.tipo` (spec F06, Incluído). */
export function CardFrame({ card, art, size = "completo" }: CardFrameProps) {
  if (card.tipo === "monstro") {
    return <MonsterCardFrame card={card} art={art} size={size} />;
  }
  return <SpellTrapCardFrame card={card} art={art} size={size} />;
}
