import type { LibraryEntry } from "@yugioh/shared";

import { CardDetailArt } from "./card-detail-art.tsx";
import { CardDetailBlock, type CardDetailField } from "./card-detail-block.tsx";
import styles from "./card-detail.module.css";
import { LibraryBackAction } from "./library-back-action.tsx";

export type ObtainedLibraryEntry = Extract<LibraryEntry, Readonly<{ obtained: true }>>;

export type CardDetailProps = Readonly<{
  entry: ObtainedLibraryEntry;
  returnDestination: string;
  returnMode?: "link" | "history";
}>;

function optionalField(label: string, value: string | number | null): CardDetailField | undefined {
  return value === null ? undefined : { label, value };
}

function presentFields(fields: readonly (CardDetailField | undefined)[]): CardDetailField[] {
  return fields.filter((field): field is CardDetailField => field !== undefined);
}

export function CardDetail({ entry, returnDestination, returnMode = "link" }: CardDetailProps) {
  const { card } = entry;
  const combatFields = presentFields([
    optionalField("ATK", card.atk),
    optionalField("DEF", card.def),
  ]);
  const guardianFields = presentFields([
    optionalField("Guardião 1", card.guardiao1),
    optionalField("Guardião 2", card.guardiao2),
  ]);

  return (
    <article className={styles.detail} aria-labelledby="card-detail-title">
      <LibraryBackAction returnDestination={returnDestination} mode={returnMode} />
      <div className={styles.layout}>
        <CardDetailArt card={card} art={entry.art} cropArt={entry.cropArt} label={card.nome} />
        <div className={styles.content}>
          <header>
            <p className={styles.number}>#{entry.cardNumber}</p>
            <h1 id="card-detail-title">{card.nome}</h1>
          </header>
          <CardDetailBlock
            title="Identificação"
            fields={[
              { label: "Número", value: entry.cardNumber },
              { label: "Classe", value: card.classe },
              { label: "Tipo", value: card.tipo },
            ]}
          />
          <CardDetailBlock title="Combate" fields={combatFields} />
          <CardDetailBlock title="Guardiões Estelares" fields={guardianFields} />
          <CardDetailBlock
            title="Liberação"
            fields={[
              {
                label: "Senha",
                value: card.password ?? "Senha indisponível.",
              },
              {
                label: "Estrelas",
                value: card.estrelas ?? "Preço indisponível.",
              },
            ]}
          />
        </div>
      </div>
    </article>
  );
}
