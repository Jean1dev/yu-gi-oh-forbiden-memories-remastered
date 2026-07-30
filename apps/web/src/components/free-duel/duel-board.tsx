import type { DuelState, PlayerId } from "@yugioh/shared";
import { LpIndicator } from "./lp-indicator.tsx";

function Side({ state, player }: { readonly state: DuelState; readonly player: PlayerId }) {
  const field = state.players[player].field;
  return (
    <section aria-label={`${player} field`}>
      <LpIndicator label={player === "P1" ? "Player" : "Opponent"} lp={state.players[player].lp} />
      <div aria-label={`${player} spell zones`}>
        {field.spells.map((zone, index) => (
          <div key={index} aria-label={`Spell zone ${index + 1}`}>
            {zone.occupied && zone.faceUp ? zone.card.nome : zone.occupied ? "Set card" : "Empty"}
          </div>
        ))}
      </div>
      <div aria-label={`${player} monster zones`}>
        {field.monsters.map((zone, index) => (
          <div key={index} aria-label={`Monster zone ${index + 1}`}>
            {zone.occupied && zone.position.endsWith("_face_up")
              ? zone.card.nome
              : zone.occupied
                ? "Set monster"
                : "Empty"}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DuelBoard({ state }: { readonly state: DuelState }) {
  return (
    <section aria-label="Duel board">
      <Side state={state} player="P2" />
      <Side state={state} player="P1" />
    </section>
  );
}
