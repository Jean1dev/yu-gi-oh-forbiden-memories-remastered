# Remoção de Magias e Armadilhas

> Carta: 672 Harpie's Feather Duster
> Efeito: `destroy_spells` — ver [`README.md`](./README.md) §3

## 1. A carta

| Nº | Nome | Lado | Filtro |
| --- | --- | --- | --- |
| 672 | Harpie's Feather Duster | oponente | qualquer |

Destrói **todas** as cartas nas cinco zonas de magia/armadilha do oponente. Fiel ao FM.

## 2. Comportamento

**Ação:** `activate_spell { handIndex }`. Consome a jogada da mão do turno; a carta resolve e sai
de jogo sem ocupar zona.

**Varredura:** as cinco zonas de magia do oponente, `0 → 4`. Cada zona ocupada vira
`{ occupied: false }`. As zonas do lançador não são tocadas.

**Alcança cartas viradas para baixo.** Armadilhas são posicionadas face-baixo
(`playSpellOrTrap` seta `faceUp = card.tipo !== "armadilha"`), e o efeito não distingue — remove
tudo. O `onDestroy` emitido revela a carta, que é o comportamento esperado: ela deixou o campo.

**Não afeta o terreno.** `activeField` é um slot global e único, não uma zona de magia de nenhum
jogador. Trocar o terreno é assunto de `play_field_spell` (ver [`terrains.md`](./terrains.md)).

**Não afeta equipamentos.** Equipamentos vivem em `MonsterZone.equips`, não numa zona de magia
(ver [`equip-buffs.md`](./equip-buffs.md) §3). Um monstro equipado sai ileso de um Feather Duster
— consequência direta de onde os equipamentos moram, e vale um teste explícito.

**Eventos:** um `onDestroy` por zona limpa, na ordem `0 → 4`, com
`context: { cause: "spell", by: "672" }`.

Campo de magias vazio é jogada legal: gasta o turno, emite só o `onSet`.

## 3. Recusas

Idênticas às de [`destruction.md`](./destruction.md) §3.
