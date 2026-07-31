import type { ObtainedArtReference, PasswordResolution } from "@yugioh/shared";

import { CardArt } from "../library/card-art.tsx";
import { PASSWORD_MESSAGES } from "./messages.ts";
import styles from "./password.module.css";

export type CardPreviewProps = Readonly<{
  resolution: Extract<PasswordResolution, { status: "resolved" }>;
  art: ObtainedArtReference;
}>;

export function CardPreview({ resolution, art }: CardPreviewProps) {
  const { card, price, affordability } = resolution;
  return (
    <section className={styles.preview} aria-label={`Preview de ${card.nome}`}>
      <div className={styles.art}><CardArt art={art} label={card.nome} /></div>
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
        <button type="button" disabled title={PASSWORD_MESSAGES.releaseUnavailable}>
          Liberar (custa {price.stars.toLocaleString("pt-BR")}⭐)
        </button>
      </div>
    </section>
  );
}
