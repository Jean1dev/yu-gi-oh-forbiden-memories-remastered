import type { MonsterPosition, Phase } from "@yugioh/shared";

export const PHASE_LABELS: Readonly<Record<Phase, string>> = {
  draw: "Compra",
  main: "Principal",
  battle: "Batalha",
  end: "Fim",
};

export const POSITION_LABELS: Readonly<Record<MonsterPosition, string>> = {
  attack_face_up: "Ataque",
  attack_face_down: "Ataque (virada)",
  defense_face_up: "Defesa",
  defense_face_down: "Defesa (virada)",
};

export const ZONE_LABELS = {
  monster: "Zona de monstro",
  spell: "Zona de magia/armadilha",
  emptyMonster: "Vazio",
  emptySpell: "-",
  hiddenCard: "Carta virada",
} as const;

export const DUEL_SCREEN_MESSAGES = {
  terrain: "Terreno",
  noTerrain: "Nenhum",
  phase: "Fase",
  turn: "Turno",
  opponentTurn: "Vez do oponente...",
  chooseZone: "Escolha uma zona para a magia/armadilha.",
  choosePosition: "Escolha a posicao.",
  chooseAttacker: "Escolha o atacante.",
  chooseTarget: "Escolha o alvo.",
  choosePositionChange: "Escolha um monstro para mudar de posicao.",
  idle: "Selecione uma carta ou escolha uma acao.",
  exitDuel: "Sair do Duelo",
} as const;
