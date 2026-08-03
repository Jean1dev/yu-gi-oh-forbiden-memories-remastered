# Controle de Posição

> Carta: 320 Stop Defense
> Efeito: `force_attack_position` — ver [`README.md`](./README.md) §3

## 1. A carta

| Nº | Nome | Lado | Filtro |
| --- | --- | --- | --- |
| 320 | Stop Defense | ambos | qualquer |

Todo monstro em posição de defesa, **dos dois jogadores**, passa para posição de ataque.

**Divergência do FM:** no jogo original, Stop Defense muda um único monstro do oponente. A
descrição fornecida diz "todos os monstros em modo de defesa" sem nomear dono, e a regra geral
deste projeto é que isso alcança os dois lados. Ver [`README.md`](./README.md) §7.

## 2. Comportamento

**Ação:** `activate_spell { handIndex }`. Consome a jogada da mão; a carta resolve e sai de jogo.

**Varredura:** `P1` e depois `P2`, zonas `0 → 4`. Cada zona ocupada cuja posição seja
`defense_face_up` ou `defense_face_down` passa a `attack_face_up`.

A transição reusa `nextPosition` (`packages/engine/src/position/next-position.ts`), que já mapeia
`defense_face_up → attack_face_up` e `defense_face_down → attack_face_up`. Não existe segunda
tabela de posições no repositório.

Monstros já em ataque não são tocados — nem `attack_face_down`, que continua virado. A carta muda
postura, não revela.

## 3. Decisão — `hasChangedPosition` não é consumido

Um monstro afetado por Stop Defense **mantém** `hasChangedPosition: false`, e portanto o dono
ainda pode usar sua mudança voluntária de posição no turno dele.

A justificativa: `hasChangedPosition` existe para limitar a mudança *voluntária* do dono, uma vez
por turno (`motor-duelo-1x1/F10`). Um flip forçado pela carta de outro jogador não é essa jogada.
O FM é ambíguo aqui; a decisão está fixada num teste (`"Stop Defense nao consome a mudanca de
posicao do turno"`) para que a escolha seja deliberada e não acidental.

Pelo mesmo motivo, `hasAttacked` também fica intocado.

## 4. Eventos

Por monstro afetado, na ordem da varredura:

- `onFlip` — **apenas** se o monstro estava `defense_face_down`, com `involvedCards: [carta]`
- `onPositionChange` — sempre

É exatamente o par que `changePosition` já emite (`packages/engine/src/position/change-position.ts`),
na mesma ordem. Um consumidor de eventos não distingue um flip forçado de um voluntário, e não
precisa.

Campo sem nenhum monstro em defesa é jogada legal: gasta o turno, emite só o `onSet`.

## 5. Recusas

Idênticas às de [`destruction.md`](./destruction.md) §3.
