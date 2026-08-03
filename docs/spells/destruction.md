# Destruição de Monstros

> Cartas: 302, 329, 336, 337
> Efeito: `destroy_monsters` — ver [`README.md`](./README.md) §3

Quatro cartas que varrem monstros do campo. Todas resolvem imediatamente e saem de jogo.

## 1. As cartas

| Nº | Nome | Lado | Filtro | `tipo` no dataset |
| --- | --- | --- | --- | --- |
| 302 | Sword of Dark Destruction | oponente | `classe: "Warrior"` | `equipamento` |
| 329 | Dragon Capture Jar | ambos | `classe: "Dragon"` | `magica` |
| 336 | Dark Hole | ambos | qualquer | `magica` |
| 337 | Raigeki | oponente | qualquer | `magica` |

**302 é uma divergência do FM** (lá é um equipamento de +500 ATK / −500 DEF em Fiend/Zombie) e,
apesar de ser `tipo: "equipamento"` no dataset, é roteada por `activate_spell`. O `tipo` do
dataset não decide o roteamento — a tabela decide. Ver [`README.md`](./README.md) §7.

**329 também diverge:** no FM original o Dragon Capture Jar vira todos os dragões para defesa, não
os destrói.

**"Ambos" em 329 e 336 é intencional.** A descrição não nomeia dono, então o efeito alcança os
dois jogadores — inclusive os monstros do próprio lançador. Dark Hole limpando o campo inteiro é,
aliás, o comportamento correto do FM.

## 2. Comportamento

**Ação:** `activate_spell { handIndex }`. Consome a jogada da mão do turno. A carta é removida da
mão e **não ocupa zona nenhuma** — resolve e sai de jogo. Não há cemitério em `DuelState`.

**Varredura:** `P1` e depois `P2`, zonas `0 → 4`, independente de quem lançou. Cada zona ocupada
cujo monstro casa com o filtro vira `{ occupied: false }`.

Um monstro **virado para baixo é destruído normalmente** e sem ser revelado antes: a destruição
não é combate, então não há `onFlip`. O `onDestroy` correspondente carrega a carta, o que a expõe
de qualquer forma — não há informação escondida a preservar depois que a carta deixou o campo.

**Equipamentos anexados somem junto** com a zona, sem código de limpeza.

**Eventos:** um `onDestroy` por zona destruída, na ordem da varredura, com
`involvedCards: [carta]`, `involvedZones: [zona]` e `context: { cause: "spell", by: <numero> }`.
Um evento por zona, nunca um agregado — `duel-cues.ts` monta a animação a partir de
`involvedZones[0]`.

Uma carta que não destrói nada (campo vazio, ou nenhum monstro casando com o filtro) é uma jogada
**legal**: gasta a jogada do turno, emite só o `onSet`, e não é erro.

## 3. Recusas

| Cenário | Código |
| --- | --- |
| A carta não tem efeito imediato | `invalid_activation_card_type` |
| Uma destas cartas foi jogada por `play_spell_or_trap` | `spell_requires_activation` |
| A jogada da mão do turno já foi usada | `hand_play_already_used` |
| Não há carta no `handIndex` | `card_unavailable` |
| Fora da fase principal | `wrong_phase` |
