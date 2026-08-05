import type { ReactNode } from "react";
import type { ObtainedArtReference, PasswordResolution } from "@yugioh/shared";

import { shouldUseCardFrame } from "../../lib/card-frame/should-use-card-frame.ts";
import { CardFrame } from "../card-frame/card-frame.tsx";
import { CardArt } from "../library/card-art.tsx";
import { PASSWORD_MESSAGES } from "./messages.ts";
import styles from "./password.module.css";

export type CardPreviewProps = Readonly<{
  resolution: Extract<PasswordResolution, { status: "resolved" }>;
  art: ObtainedArtReference;
  cropArt?: ObtainedArtReference | undefined;
  action?: ReactNode;
}>;

export function CardPreview({ resolution, art, cropArt, action }: CardPreviewProps) {
  const { card, price, affordability } = resolution;
  const useFrame = shouldUseCardFrame(card, cropArt);
  return (
    <section className={styles.preview} aria-label={`Preview de ${card.nome}`}>
      <div className={styles.art}>
        {useFrame && cropArt !== undefined ? (
          <CardFrame card={card} art={cropArt} size="completo" />
        ) : (
          <CardArt art={art} label={card.nome} />
        )}
      </div>
      <div className={styles.details}>
        <p className={styles.number}>#{card.numero}</p>
        <h2>{card.nome}</h2>
        <dl>
          <div><dt>Tipo</dt><dd>{card.tipo}</dd></div>
          <div><dt>Classe</dt><dd>{card.classe}</dd></div>
          <div><dt>Preço</dt><dd>Custa {price.stars.toLocaleString("pt-BR")}⭐</dd></div>
          <div>
            <dt>Saldo</dt>
            <dd>
              {affordability.status === "unknown"
                ? "Indisponível"
                : `${affordability.balanceStars.toLocaleString("pt-BR")}⭐`}
            </dd>
          </div>
        </dl>
        {affordability.status === "affordable" ? <p className={styles.success}>Saldo suficiente.</p> : null}
        {affordability.status === "insufficient" ? (
          <p className={styles.warning}>Faltam {affordability.missingStars.toLocaleString("pt-BR")}⭐ para liberar esta carta.</p>
        ) : null}
        {affordability.status === "unknown" ? <p>{PASSWORD_MESSAGES.walletUnavailable}</p> : null}
        {action ?? <button type="button" disabled title={PASSWORD_MESSAGES.releaseUnavailable}>Liberar (custa {price.stars.toLocaleString("pt-BR")}⭐)</button>}
      </div>
    </section>
  );
}
