import type { DomainError } from "@yugioh/shared";

const REFUSAL_MESSAGES: Readonly<Record<string, string>> = {
  wrong_phase: "Essa jogada nao pode ser feita nesta fase.",
  not_active_player: "Apenas o jogador ativo pode fazer essa jogada.",
  reaction_window_open: "Aguarde a resolucao da jogada atual.",
  duel_already_ended: "O duelo ja terminou.",
  hand_play_already_used: "Voce ja usou uma carta da mao neste turno.",
  card_not_in_hand: "Essa carta nao esta mais na sua mao.",
  card_unavailable: "Essa carta nao esta disponivel agora.",
  monster_zone_occupied: "Essa zona de monstro ja esta ocupada.",
  no_free_monster_zone: "Nao ha zona de monstro livre.",
  unsummonable_card_type: "Essa carta nao pode ser invocada como monstro.",
  invalid_spell_trap_card_type: "Essa carta nao pode ser colocada na fileira de tras.",
  zone_occupied: "Essa zona ja esta ocupada.",
  no_space_for_card: "Nao ha espaco livre para essa carta.",
  zone_empty: "Essa zona esta vazia.",
  zone_not_monster: "Escolha uma zona de monstro.",
  zone_not_owned_by_active_player: "Escolha um monstro do jogador ativo.",
  already_changed_position: "Esse monstro ja mudou de posicao neste turno.",
  already_attacked: "Esse monstro ja atacou neste turno e nao pode mudar de posicao.",
  attacker_zone_empty: "Nao ha monstro nessa zona para atacar.",
  attacker_not_in_attack_position: "Apenas monstros em posicao de ataque podem atacar.",
  attacker_already_attacked: "Esse monstro ja atacou neste turno.",
  first_turn_attack_forbidden: "Nao e permitido atacar no primeiro turno do duelo.",
  direct_attack_blocked_by_monsters: "Nao e possivel atacar diretamente enquanto ha monstros no campo adversario.",
  target_zone_empty: "Nao ha monstro nessa zona alvo.",
  no_pending_attack_to_resolve: "Nao ha ataque pendente para resolver.",
  not_your_turn: "Ainda nao e sua vez.",
};

export function getRefusalMessage(error: DomainError): string {
  return REFUSAL_MESSAGES[error.code] ?? "Nao foi possivel fazer essa jogada agora.";
}

export const KNOWN_REFUSAL_CODES = Object.keys(REFUSAL_MESSAGES);
