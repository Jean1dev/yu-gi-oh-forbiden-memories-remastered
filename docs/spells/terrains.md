# Terrenos

> Cartas: 330, 331, 332, 333, 334, 335
> Efeito: `terrain` — ver [`README.md`](./README.md) §3

## 1. As cartas

| Nº | Nome |
| --- | --- |
| 330 | Forest |
| 331 | Wasteland |
| 332 | Mountain |
| 333 | Sogen |
| 334 | Umi |
| 335 | Yami |

## 2. O problema que estas seis cartas resolvem

No dataset, os seis terrenos são **indistinguíveis** de Raigeki: todos são `tipo: "magica"` e
`classe: "Magic"`. O único sinal fraco é `estrelas: 55`, que é preço de loja, não marcador.

Isso é um bug hoje. O guard de `playFieldSpell` aceita qualquer carta `tipo: "magica" && classe:
"Magic"`, então **Raigeki, Dark Hole e Swords of Revealing Light podem virar terreno ativo**. A
`PlaySpellOrTrapAction` até documenta a lacuna: "o motor não distingue uma carta de terreno de uma
carta de magia de efeito pelo schema — quem constrói a ação escolhe a variante por conhecimento
externo ao motor".

A variante `terrain` da tabela de efeitos é esse conhecimento, agora dentro do domínio. O guard
passa a exigir:

```
card.tipo === "magica" && getSpellEffect(card.numero)?.type === "terrain"
```

O check `classe !== "Magic"` desaparece — é subsumido e inútil, já que Raigeki também é
`classe: "Magic"`. O código de erro continua `invalid_field_spell_card_type`; só o `details` muda,
de `{ tipo, classe }` para `{ tipo, numero }`.

## 3. Comportamento

**Ação:** `play_field_spell { handIndex }` — a ação já existe desde `motor-duelo-1x1/F09`, e só
agora fica de fato alcançável a partir do tabuleiro: **a UI nunca a emitia**. A fase 8 liga o slot
"Campo" em `duel-interaction.ts`.

Consome a jogada da mão do turno. A carta substitui o slot único e global `activeField`; o terreno
anterior sai de jogo sem cerimônia (não há cemitério). Não existe recusa por "campo ocupado" —
trocar é sempre legal.

**Evento:** `onSet` com `context: { target: "field" }` e `involvedZones: []`, exatamente como
hoje.

## 4. Decisão — o modificador de terreno continua neutro

Estas seis cartas **trocam o terreno ativo e nada mais**. Nenhum monstro fica mais forte ou mais
fraco por causa delas.

O motivo é dado externo faltando, não escolha: `packages/data/src/terrain/data/terrain-class-matrix.json`
é `[]`. O schema, os tipos (`TerrainClassRule`, `TerrainClassTable`) e o validador existem desde
`banco-de-cartas/F07`; os valores não. `neutralTerrainModifier` retorna `{ atk: 0, def: 0 }` e
continua assim.

`docs/arquitetura.md` §4.3 registra essa pendência como intencional: o motor trata ausência como
neutro. Inventar as magnitudes da matriz aqui violaria a regra do repositório de nunca autorar
valores de guardião, terreno, fusão ou drop (`spec-writer` §0.4).

Quando a matriz for preenchida, o buff passa a valer para as seis cartas **sem mudança nenhuma
nesta feature** — `calculateEffectiveAtkDef` já lê `activeField` e chama
`providers.terrain(monster, activeField)`.

## 5. Recusas

| Cenário | Código |
| --- | --- |
| A carta não tem efeito `terrain` | `invalid_field_spell_card_type` |
| Um terreno foi jogado por `play_spell_or_trap` | `terrain_requires_field_zone` |
| A jogada da mão do turno já foi usada | `hand_play_already_used` |
| Não há carta no `handIndex` | `card_unavailable` |
| Fora da fase principal | `wrong_phase` |
