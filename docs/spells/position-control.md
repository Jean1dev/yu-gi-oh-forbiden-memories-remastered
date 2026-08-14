# Controle de Posição

> Carta: 320 Stop Defense
> Efeito: `force_attack_position` — ver [`README.md`](./README.md) §3

## 1. A carta

| Nº | Nome | Lado | Filtro | Alcance |
| --- | --- | --- | --- | --- |
| 320 | Stop Defense | oponente | qualquer | **um** monstro, escolhido pelo lançador |

*"Forces **an** opponent's monster card positioned for defense into the attack position."* Singular
e do oponente — é a única carta das 67 que pede um alvo.

## 2. Comportamento

**Ação:** `activate_spell { handIndex, targetZone }`. Consome a jogada da mão; a carta resolve e
sai de jogo.

**Sem varredura.** O lançador escolhe a zona, e `activateSpell` valida as três condições que o
texto declara antes de consumir qualquer coisa: é zona de monstro, está num lado que o efeito
alcança, e o monstro está em defesa. Os códigos de recusa estão em
[`README.md`](./README.md) §4.

A transição reusa `nextPosition` (`packages/engine/src/position/next-position.ts`), que já mapeia
`defense_face_up → attack_face_up` e `defense_face_down → attack_face_up`.

**Muda a postura e revela junto**, quando o alvo estava virado. Isso é o oposto de
[`reveal.md`](./reveal.md), que vira a face para cima e **preserva** a postura — a diferença entre
as duas famílias é exatamente essa, e cada uma tem sua própria tabela de posições.

### A UI e o AI

`apps/web` ganha o intent `choosing_spell_target`, e o AI enumera uma jogada por zona legal, do
mesmo jeito que o braço de equipamento enumera hospedeiros. Os dois roteiam por
`requiresSpellTarget(effect)`, nunca por número de carta, então uma carta alvejável futura não
pede mudança nenhuma nos dois lados. Quando não há nenhum monstro em defesa para atingir, a carta
fica **desabilitada** em vez de virar uma recusa depois do clique.

## 3. Decisão — `hasChangedPosition` não é consumido

Um monstro afetado por Stop Defense **mantém** `hasChangedPosition: false`, e portanto o dono
ainda pode usar sua mudança voluntária de posição no turno dele.

A justificativa: `hasChangedPosition` existe para limitar a mudança *voluntária* do dono, uma vez
por turno (`motor-duelo-1x1/F10`). Um flip forçado pela carta de outro jogador não é essa jogada.
O FM é ambíguo aqui; a decisão está fixada num teste (`"nao consome a mudanca de posicao do turno
do dono"`) para que a escolha seja deliberada e não acidental.

Pelo mesmo motivo, `hasAttacked` também fica intocado.

## 4. Eventos

No monstro escolhido:

- `onFlip` — **apenas** se ele estava virado para baixo, com `involvedCards: [carta]`
- `onPositionChange` — sempre

É exatamente o par que `changePosition` já emite (`packages/engine/src/position/change-position.ts`),
na mesma ordem. Um consumidor de eventos não distingue um flip forçado de um voluntário, e não
precisa.

## 5. Recusas

As de [`destruction.md`](./destruction.md) §4, mais as seis de alvo listadas em
[`README.md`](./README.md) §4.
