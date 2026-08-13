# Destruição de Monstros

> Cartas: 329, 336, 337, 653, 656, 660, 661, 662, 663, 664
> Efeitos: `destroy_monsters` e `destroy_by_atk` — ver [`README.md`](./README.md) §3

Dez cartas que varrem monstros do campo. Todas resolvem imediatamente e saem de jogo.

## 1. As cartas

| Nº | Nome | Lado | Filtro |
| --- | --- | --- | --- |
| 329 | Dragon Capture Jar | oponente | `classe: "Dragon"` |
| 336 | Dark Hole | ambos | qualquer |
| 337 | Raigeki | oponente | qualquer |
| 653 | Warrior Elimination | oponente | `classe: "Warrior"` |
| 656 | Eternal Rest | **ambos** | `classe: "Zombie"` |
| 660 | Stain Storm | oponente | `classe: "Machine"` |
| 662 | Eradicating Aerosol | oponente | `classe: "Insect"` |
| 663 | Breath of Light | oponente | `classe: "Rock"` |
| 664 | Eternal Draught | oponente | `classe: "Fish"` |
| 661 | Crush Card | oponente | ATK ≥ 1500 (`destroy_by_atk`) |

O lado sai do texto do jogo original: quando ele nomeia o dono ("Destroys all **opponent** Dragon
monsters", "an **opponent's** Machine monsters"), é `opponent`. Só duas cartas não nomeiam, e por
isso alcançam os dois lados — 336 Dark Hole ("Sucks up **every card in play** on the field!") e
656 Eternal Rest ("Eliminates **all** Zombie creatures").

**656 não destrói monstros equipados**, apesar do que o texto do TCG diz. No jogo original ele é
uma carta anti-Zombie, e é essa a regra aqui ([`README.md`](./README.md) §7).

## 2. `destroy_by_atk` e o ATK que conta

661 Crush Card — "Opponent monsters in play with attack factors of **1500 or more** are
eliminated" — é a única carta que filtra por número em vez de classe, e o limite é **inclusivo**.

A comparação é contra o **ATK impresso** da carta, não contra o efetivo: um monstro que só passa
de 1500 por causa de um equipamento não é destruído. É a leitura literal de "attack factor", e
evita que a resolução de uma magia dependa dos provedores de combate. Um monstro sem ATK aplicável
lê como 0, a mesma convenção de `calculateEffectiveAtkDef`.

## 3. Comportamento

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

## 4. Recusas

| Cenário | Código |
| --- | --- |
| A carta não tem efeito imediato | `invalid_activation_card_type` |
| Uma destas cartas foi jogada por `play_spell_or_trap` | `spell_requires_activation` |
| A jogada da mão do turno já foi usada | `hand_play_already_used` |
| Não há carta no `handIndex` | `card_unavailable` |
| Fora da fase principal | `wrong_phase` |
