import type { Card } from "@yugioh/shared";

export function PlayerHand({
  cards,
  disabled,
}: {
  readonly cards: readonly Card[];
  readonly disabled: boolean;
}) {
  return (
    <section aria-label="Player hand">
      <h2>Your hand</h2>
      <div>
        {cards.map((card, index) => (
          <button key={`${card.numero}-${index}`} type="button" disabled={disabled}>
            {card.nome}
          </button>
        ))}
      </div>
    </section>
  );
}
