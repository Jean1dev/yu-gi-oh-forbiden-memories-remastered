# Jogar Magia / Armadilha / Terreno

> PRD: `docs/prds/motor-duelo-1x1.md` — F09
> Pacote-alvo: `packages/engine` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta feature entrega a segunda das três jogadas mutuamente exclusivas da mão que F06 previu
(`docs/specs/motor-duelo-1x1/F06-ciclo-de-turno-e-fases/spec.md`, Decisão 6): colocar uma carta de
magia/armadilha/equipamento em uma das 5 zonas de magia/armadilha do jogador ativo, **ou**
jogar uma carta de terreno, substituindo o único `activeField` do estado. As duas ações consomem a
mesma jogada única da mão do turno que F08 (Invocar e Posicionar Monstro, feature irmã desta mesma
wave) também consome — as três (invocar monstro, posicionar magia/armadilha, jogar terreno) nunca
coexistem no mesmo turno.

Assim como F06 e F08, esta feature **não resolve nenhum efeito de carta**: não aplica o que uma
armadilha faz quando reage, não aplica o buff de um equipamento, não aplica o efeito de uma magia.
Isso é responsabilidade do Effect System (`packages/rules`, cross-PRD, ainda inexistente) — F09
apenas posiciona a carta (ou substitui o terreno), atualiza o estado e emite os eventos que
permitem ao Effect System reagir mais tarde.

**Achado central que molda o design desta spec:** o schema real da carta (`packages/shared/src/card/schema.ts`,
`CARD_TYPES = ["monstro", "armadilha", "equipamento", "magica", "ritual"]`) e o dataset real
(`cards-data/dados/*.json`) confirmam que **todas as 33 cartas de `tipo: "magica"` têm
`classe: "Magic"`**, sem exceção — inclusive as 6 cartas de terreno reais do FM (`Forest`,
`Wasteland`, `Mountain`, `Sogen`, `Umi`, `Yami`) e as 27 restantes, que são magias de efeito
(`Raigeki`, `Dark Hole`, `Dian Keto the Cure Master`, etc.). Isso significa que **o par
`(tipo: "magica", classe: "Magic")` que o PRD cita para identificar terreno não distingue, por si
só, uma carta de terreno de uma magia de efeito** — a distinção não existe em nenhum campo do
schema hoje. A Seção 3 e a Decisão 2 abaixo explicam a solução adotada.

### Incluído

- Colocar 1 magia/armadilha/equipamento por turno em uma das **5 zonas de magia/armadilha** livres
  do jogador ativo (PRD F09 Capabilities), consumindo a jogada da mão do turno (mecanismo de F06)
- Jogar 1 carta de terreno, substituindo o único `activeField` do estado (PRD F09 Capabilities),
  também consumindo a jogada da mão do turno
- Emissão de `onSet` (evento já existente no vocabulário fechado de F02) para as duas ações, com um
  discriminador em `context` que permite ao Effect System (cross-PRD) diferenciar "carta entrou em
  zona de magia/armadilha" de "carta entrou como terreno" (Decisão 6)
- Abertura de janela de reação (F02) nas duas ações, com o oponente do jogador ativo como
  `reactingPlayer` (Decisão 7)
- As validações de recusa do PRD (Seção 6 desta spec): zona ocupada, todas as zonas ocupadas,
  jogada da mão já usada — e as validações defensivas de tipo de carta necessárias por esta spec
  não estarem definidas no PRD (Decisão 9)

### Adiado

Não aplicável — o PRD não declara blocos `Core Scope`/`Full Scope additions` para F09; a feature
não tem divisão de escopo, então esta spec cobre a íntegra das Capabilities descritas.

### Fronteiras

- **Resolução do efeito da carta** (o que a armadilha faz ao reagir, o buff do equipamento, o
  efeito da magia, o modificador real de terreno sobre ATK/DEF) → **Effect System / Terrain
  Engine (cross-PRD)**. Esta feature só posiciona a carta, atualiza `activeField` e emite os
  eventos — PRD F09 Capabilities, item 3; PRD §7 Fora de Escopo.
- **Classificação de qual carta `tipo: magica` é especificamente um terreno** (vs. uma magia de
  efeito) → **não é resolvida pelo motor** (ver Decisão 2). Quem submete a ação (`apps/web`, IA, ou
  o futuro Online Duel) decide, ao escolher entre as duas variantes de ação desta feature, para
  qual destino a carta vai. O motor só valida que o `tipo` é compatível com o destino escolhido.
- **Cálculo de ATK/DEF efetivo sob o novo terreno** → **F04**, que lê `activeField` (já atualizado
  por esta feature) através do `TerrainModifierProvider` injetado (cross-PRD, ainda `{ atk: 0, def:
  0 }`).
- **Invocar monstro** → **F08**, feature irmã que consome o mesmo mecanismo de jogada da mão
  (`hasUsedHandPlay`/`markHandPlayUsed`, F06) por uma via de ação diferente.
- **Mudança de posição, ataque, fim de duelo** → F10, F11, F12, que não tocam esta feature.

### Contratos externos assumidos

- **Effect System (`packages/rules`, cross-PRD, ainda não implementado):** consumirá
  `state.pending.event` (o `onSet` emitido por esta feature) para decidir se alguma armadilha
  reage à colocação, e resolverá 0..N efeitos antes do orquestrador fechar a janela — mesmo
  contrato de saída que F02 já define, sem nenhuma implementação nova exigida por esta spec.
- **Terrain Engine (`packages/rules`, cross-PRD, ainda não implementado):** eventualmente será o
  dono de qual `numero`/`nome` de carta `magica` é, de fato, um terreno — hoje esse conhecimento
  não existe em nenhuma tabela do repositório (nem sequer no schema de carta), e esta feature não o
  inventa (ver Decisão 2 e Decisão 9). Quando esse PRD existir, ele **não altera o contrato desta
  feature** — apenas informa, em uma camada acima do motor, qual das duas ações (`play_spell_or_trap`
  ou `play_field_spell`) deve ser submetida para uma dada carta.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | Sem blocos `Core Scope`/`Full Scope additions` no PRD para F09 → esta spec cobre a íntegra das Capabilities descritas, sem divisão. | PRD §6 F09 (ausência dos blocos) | confirmada (Auto-Aceite: sem ambos os blocos, escopo completo) |
| 2 | **Duas variantes de ação, não uma:** `PlaySpellOrTrapAction` (zona de magia/armadilha, com `zoneIndex`) e `PlayFieldSpellAction` (substitui `activeField`, sem `zoneIndex`). O motor não infere sozinho se uma carta `tipo: magica` é terreno ou efeito — essa distinção não existe em nenhum campo do schema real (ver achado na abertura desta seção: as 33 cartas `magica` têm `classe: "Magic"` sem exceção). Quem monta a ação (UI/IA/servidor) escolhe a variante correta a partir de conhecimento externo ao motor (ex.: metadado da Library, ou futuramente o Terrain Engine). O motor só valida que o `tipo` da carta é **compatível** com a variante escolhida (`magica` para as duas; `armadilha`/`equipamento` só para a primeira) — nunca valida se a carta é *especificamente* um dos 6 terrenos reais do FM. Alternativa descartada: injetar um classificador `Card → boolean` em `apply`, no mesmo espírito de `GuardianModifierProvider`/`TerrainModifierProvider` (F04) — descartada porque `apply(state, action)` precisa permanecer uma função de exatamente dois parâmetros para preservar reprodutibilidade determinística entre nós (servidor autoritativo revalidando uma ação não pode depender de um terceiro parâmetro que varie entre quem a construiu e quem a revalida). | Leitura do schema real (`packages/shared/src/card/schema.ts`, `constants.ts`) e do dataset real (`cards-data/dados/*.json`); PRD F09 Capabilities item 4 ("distingue os tipos do schema... para rotear"); `arquitetura.md` §3.1 (`apply` como função pura de dois parâmetros) | confirmada (Auto-Aceite: especificação parcial no PRD — o PRD assume uma distinção que o schema não sustenta; resolvida por desenho, documentada como pendência residual, ver Decisão 9) |
| 3 | Cartas na mão são referenciadas por **`handIndex`** (posição no array `hand` do jogador ativo no momento da ação), não por `numero`/`id` — porque um jogador pode ter até 3 cópias da mesma carta na mão (máx. 3 cópias por deck, Fase 0.3), o que tornaria `numero`/`id` ambíguo para escolher *qual* cópia jogar. Mesma decisão que F08 (feature irmã) precisa tomar independentemente, por não haver especificação anterior nem coordenação direta entre sub-agentes do mesmo lote — **pendência de alinhamento**: confirmar que F08 adota o mesmo esquema de endereçamento antes da implementação de ambas (ver plan.md, Pré-requisitos). | Fase 0.3 (máx. 3 cópias por carta); ausência de um identificador de instância por carta na mão em F01–F06 | confirmada (Auto-Aceite: especificação parcial no PRD; documentada como pendência de coordenação) |
| 4 | `faceUp` da carta colocada em zona de magia/armadilha: **`false` (face-baixo) quando `tipo === "armadilha"`; `true` (face-cima) para `equipamento` e `magica`** — leitura literal da Experience do PRD F09: "a carta ocupa a zona (face-baixo, no caso de armadilha)", que por exclusão implica face-cima nos demais casos. | PRD §6 F09 Experience (citação literal) | confirmada |
| 5 | `PlayFieldSpellAction` não carrega `zoneIndex`: o terreno ativo é um único slot global (`DuelState.activeField: Card \| null`, já definido por F01), não uma das 5 zonas indexadas — não há "zona de terreno" a escolher. | `packages/shared/src/duel/types.ts` (`DuelState.activeField`, campo único) | confirmada |
| 6 | As duas ações emitem **`onSet`** — o mesmo tipo de evento já usado por F08 para monstro colocado face-baixo — em vez de um evento novo. O vocabulário de `EVENT_TYPES` é fechado em 10 tipos (F02) e não há espaço para um "evento de troca de terreno" dedicado sem alterar esse vocabulário, o que esta spec não faz. A distinção entre as duas colocações (zona de magia/armadilha vs. terreno) fica em `context.target` (`"spell_trap_zone"` ou `"field"`), já que `involvedZones` não pode representar o terreno (o `ZoneReference` de F02 só aponta para `zoneType: "monster" \| "spell"`, ambas indexadas 0–4 por jogador — o terreno não é uma dessas dez zonas). Para a colocação em terreno, `involvedZones` é sempre `[]`. | PRD §6 F09 Consumes ("emissão de onSet... e do gatilho de troca de terreno" — lido como uma única emissão de onSet com contexto diferenciado, não dois eventos distintos, para não violar o vocabulário fechado); `packages/shared/src/duel/events.ts` (`ZoneType = "monster" \| "spell"`) | confirmada (Auto-Aceite: resolução do PRD §9, Cross-Feature, sem inventar tipo novo) |
| 7 | As duas ações abrem janela de reação (F02), com `reactingPlayer` igual ao **oponente** do jogador ativo — estende a mesma disciplina que F08 já aplica a `onSummon`/`onSet` (carta entrando no campo é o momento canônico em que o Effect System quer poder reagir, ex.: uma armadilha reagindo à colocação de uma magia). Não há citação literal do PRD F09 para "abre janela" (diferente de F08, que a cita explicitamente) — decisão por consistência arquitetural, documentada aqui como inferência, não como transcrição do PRD. | Consistência com o padrão já estabelecido em F08 (mesma wave); `arquitetura.md` §3.2 | confirmada (Auto-Aceite: especificação parcial no PRD) |
| 8 | Substituir um terreno já ativo **não emite nenhum evento sobre o terreno anterior** (nem `onDestroy`, nem qualquer outro) — o PRD descreve a ação como "substitui" (`activeField` antigo é simplesmente sobrescrito), não como uma destruição do terreno anterior; `onDestroy` no vocabulário fechado é usado por F11 para monstros destruídos em combate, um conceito diferente que esta feature não reutiliza. | PRD §6 F09 Capabilities ("substitui o único terreno ativo"); PRD §9 F09 critério 2 (linguagem de substituição, não de destruição) | confirmada |
| 9 | **Pendência residual explícita:** como o motor não pode validar (Decisão 2) se uma carta `tipo: magica` submetida via `PlaySpellOrTrapAction` é "na verdade" um terreno, nem se uma carta submetida via `PlayFieldSpellAction` é "na verdade" uma magia de efeito, essa responsabilidade fica inteiramente com quem monta a ação. Diferente das pendências de tabela numérica (guardião, terreno×classe, fusão — Fase 0.4), que recebem schema+loader+fallback neutro dentro do próprio motor, esta é uma pendência de **classificação categórica na camada acima do motor** (Library/UI hoje; Terrain Engine cross-PRD no futuro) — não é modelada como tabela dentro de `packages/engine` porque faria `apply` deixar de ser uma função pura de dois parâmetros (Decisão 2). Registrada aqui para que a implementação futura do Terrain Engine e/ou da tela de Build Deck/Free Duel que monta a ação feche esta lacuna. | Leitura do schema real + Fase 0.4 (regra dura: nunca inventar valor de tabela pendente) — aqui adaptada porque a pendência não é um valor numérico, é uma classificação categórica sem campo de schema | confirmada (documentação de pendência, não bloqueio) |
| 10 | A checagem de janela de reação aberta (`hasOpenReactionWindow`) permanece **centralizada em `apply`** (F06), antes do `switch` delegar para qualquer handler — interpretação do contrato de `advancePhase` em F06 ("pré: hasOpenReactionWindow(state) === false, verificado por apply antes de chamar"), estendida às duas novas variantes desta feature. `playSpellOrTrap`/`playFieldSpell` **não repetem** essa checagem internamente; assumem-na como pré-condição já satisfeita por `apply`. | `docs/specs/motor-duelo-1x1/F06-.../spec.md` §4 (contrato de `advancePhase`) | confirmada (interpretação de contrato ambíguo em F06, documentada explicitamente) |
| 11 | `getOpponent(player: PlayerId): PlayerId` é uma função auxiliar pura nova, local a `packages/engine/src/spells/`, porque nenhuma feature anterior precisou inverter o jogador ativo. Pode ser duplicada por F08/F10/F11 (mesma wave, sem coordenação direta) — pendência de consolidação para uma futura limpeza (`simplify`), não bloqueante para esta spec. | Ausência de utilitário equivalente em `packages/engine`/`packages/shared` (Camada 1) | confirmada (Auto-Aceite: sem padrão prévio, decisão nova documentada) |
| 12 | Estrutura de arquivos: novo subsistema `packages/engine/src/spells/`, ao lado de `combat/`, `events/`, `initialization/`, `serialization/`, `turn/` — mesmo padrão de nomenclatura (substantivo em inglês, singular conceitual, kebab-case interno). | Padrão observado em `packages/engine/src/*` (Camada 1) | confirmada |
| 13 | Identificadores de código em **inglês** (`PlaySpellOrTrapAction`, `playFieldSpell`, `getOpponent`), mesmo com a prosa desta spec em português — mesma correção de precedente que F06 já aplicou (Decisão 8 daquela spec) em vez de repetir a nomenclatura em português usada por F02/F05. | `packages/shared/src/duel/*.ts`, `packages/engine/src/**` (código real); `CLAUDE.md` ("identifiers are in English") | confirmada |
| 14 | `ActionSchema`, hoje `= AdvancePhaseActionSchema` (F06, com o comentário "z.discriminatedUnion quando houver 2+ variantes"), passa a ser de fato um `z.discriminatedUnion("type", [...])` com as 3 variantes conhecidas até esta wave — esta spec exerce a extensão que o próprio comentário de F06 já previa. | `docs/specs/motor-duelo-1x1/F06-.../spec.md` §4 (comentário explícito) | confirmada |
| 15 | Nem `playSpellOrTrap` nem `playFieldSpell` tocam `packages/rules`/`packages/data` — os modificadores de terreno (F04) e a resolução de efeito (Effect System) permanecem consumidos por outras features via os pontos de extensão já existentes (`TerrainModifierProvider` injetado em `calculateEffectiveAtkDef`), nunca importados por esta feature. | `arquitetura.md` §2 (direção de dependência); `packages/shared/src/duel/combat-modifiers.ts` | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duel/action.ts` | shared | alterado (arquivo criado por F06) | Acrescenta `PlaySpellOrTrapAction`, `PlayFieldSpellAction` à união `Action` |
| `packages/shared/src/duel/action.schema.ts` | shared | alterado (arquivo criado por F06) | Acrescenta os schemas das duas novas variantes; troca `ActionSchema` para `z.discriminatedUnion` (Decisão 14) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta `PlaySpellOrTrapAction`, `PlayFieldSpellAction` e seus schemas junto dos tipos já reexportados por F06 |
| `packages/engine/src/spells/play-spell-or-trap.ts` | engine | novo | `playSpellOrTrap(state, action)` — valida, posiciona a carta na zona de magia/armadilha, emite `onSet`, abre janela |
| `packages/engine/src/spells/play-field-spell.ts` | engine | novo | `playFieldSpell(state, action)` — valida, substitui `activeField`, emite `onSet`, abre janela |
| `packages/engine/src/spells/opponent.ts` | engine | novo | `getOpponent(player)` — inverte `PlayerId` (Decisão 11) |
| `packages/engine/src/spells/index.ts` | engine | novo | Export público do subsistema `spells` |
| `packages/engine/src/turn/apply.ts` | engine | alterado (arquivo criado por F06) | Acrescenta os `case`s `"play_spell_or_trap"` e `"play_field_spell"` ao `switch` exaustivo |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta `playSpellOrTrap`, `playFieldSpell`, `getOpponent` ao lado dos subsistemas existentes |
| `packages/engine/README.md` | engine | alterado | Acrescenta o subsistema `spells` ao propósito e aos exports públicos |
| `packages/engine/src/spells/play-spell-or-trap.test.ts` | engine | novo | Unitários: posicionamento, faceUp por tipo, eventos, todas as recusas |
| `packages/engine/src/spells/play-field-spell.test.ts` | engine | novo | Unitários: substituição de terreno, eventos, todas as recusas |
| `packages/engine/src/spells/opponent.test.ts` | engine | novo | Unitários: `getOpponent` para os dois `PlayerId` |
| `packages/engine/src/spells/play-spell-or-trap.properties.test.ts` | engine | novo | Propriedade: determinismo e preservação de campos não tocados |
| `packages/engine/src/turn/apply.test.ts` | engine | alterado (arquivo criado por F06) | Novos casos: roteamento e recusa por janela aberta para as duas ações desta feature |

**Verificação da direção de dependências:** `packages/engine/src/spells/**` importa apenas de
`packages/shared` (`DuelState`, `PlaySpellOrTrapAction`, `PlayFieldSpellAction`, `PlayerId`,
`ZoneIndex`, `Result`, `DomainError`, `ApplyResult`) e de subsistemas internos de `packages/engine`
já existentes (`events`: `createEvent`, `openReactionWindow`; `turn`: `hasUsedHandPlay`,
`markHandPlayUsed`). Nenhum import de `data`, `rules`, `ai`, `web`, `server`, React, DOM, `fetch`
ou Supabase — mesma garantia já verificada para `combat`, `events`, `initialization`,
`serialization`, `turn`.

## 3. Design Técnico

### Estruturas de dados

Nenhuma estrutura nova em `DuelState`/`PlayerState`/`PlayerField` — esta feature só **escreve** em
campos já existentes desde F01/F06: `PlayerField.spells` (tupla de 5 `SpellZone`), `PlayerState.hand`
(remove a carta jogada), `PlayerState.handPlayUsed` (F06, marcado via `markHandPlayUsed`), e
`DuelState.activeField` (substituído).

**`PlaySpellOrTrapAction`** e **`PlayFieldSpellAction`** (`packages/shared`, acrescentadas ao
arquivo `action.ts` de F06):

```ts
export type PlaySpellOrTrapAction = Readonly<{
  type: "play_spell_or_trap";
  handIndex: number;
  zoneIndex: ZoneIndex;
}>;

export type PlayFieldSpellAction = Readonly<{
  type: "play_field_spell";
  handIndex: number;
}>;

export type Action =
  | AdvancePhaseAction
  | PlaySpellOrTrapAction
  | PlayFieldSpellAction; // F07/F08/F10/F11/F12 estendem esta união
```

### Fluxo — `play_spell_or_trap`

Pré-condição já garantida por `apply` antes de chamar (Decisão 10): `hasOpenReactionWindow(state)
=== false`.

1. `hasUsedHandPlay(state, state.activePlayer)` — se `true`, recusa com
   `hand_play_already_used` (estado inalterado).
2. `state.players[state.activePlayer].hand[action.handIndex]` deve existir — se `undefined`
   (índice fora de alcance), recusa com `card_unavailable`.
3. A carta resolvida deve ter `tipo` em `{"armadilha", "equipamento", "magica"}` — caso contrário
   (`monstro`, `ritual`), recusa com `invalid_spell_trap_card_type`.
4. Se **todas** as 5 zonas de `spells` do jogador ativo estão ocupadas, recusa com
   `no_space_for_card` — **independentemente** do `zoneIndex` pedido (esta checagem vem antes da
   checagem de zona específica, para dar a mensagem mais correta quando não sobra nenhuma opção).
5. Caso contrário, se `state.players[state.activePlayer].field.spells[action.zoneIndex].occupied
   === true`, recusa com `zone_occupied`.
6. Sucesso: computa `faceUp = card.tipo !== "armadilha"` (Decisão 4); remove a carta do índice
   `handIndex` da mão; escreve `{ occupied: true, card, faceUp }` na zona `zoneIndex`; chama
   `markHandPlayUsed`; monta o evento `onSet` com `originPlayer = activePlayer`, `involvedCards =
   [card]`, `involvedZones = [{ player: activePlayer, zoneType: "spell", index: zoneIndex }]`,
   `context = { target: "spell_trap_zone", faceUp }`; abre janela de reação com `reactingPlayer =
   getOpponent(activePlayer)`; devolve `{ state: <novo estado, com pending>, events: [onSet] }`.

### Fluxo — `play_field_spell`

Mesma pré-condição de janela fechada, garantida por `apply`.

1. `hasUsedHandPlay(state, state.activePlayer)` — se `true`, recusa com `hand_play_already_used`.
2. `state.players[state.activePlayer].hand[action.handIndex]` deve existir — se não, recusa com
   `card_unavailable`.
3. A carta resolvida deve ter `tipo === "magica"` **e** `classe === "Magic"` (checagem redundante
   pelo dataset real, mantida por defesa em profundidade e por fidelidade literal ao texto do PRD)
   — caso contrário, recusa com `invalid_field_spell_card_type`.
4. Sucesso (não há checagem de "zona ocupada": o slot de terreno é sempre substituível): remove a
   carta do índice `handIndex` da mão; escreve `card` em `state.activeField` (descartando o valor
   anterior, sem emitir evento sobre ele — Decisão 8); chama `markHandPlayUsed`; monta o evento
   `onSet` com `originPlayer = activePlayer`, `involvedCards = [card]`, `involvedZones = []`
   (Decisão 6), `context = { target: "field" }`; abre janela de reação com `reactingPlayer =
   getOpponent(activePlayer)`; devolve `{ state: <novo estado, com pending>, events: [onSet] }`.

### Regras de negócio

- **1 jogada da mão por turno** (PRD F06/F09 Capabilities): as duas ações desta feature consomem o
  mesmo `handPlayUsed` que F08 também consome — nenhuma das três (invocar, magia/armadilha,
  terreno) é aceita se qualquer uma das outras já rodou naquele turno.
- **5 zonas de magia/armadilha livres** (PRD F09 Capabilities; Fase 0.3): validado antes de
  escrever qualquer campo do estado.
- **1 terreno ativo por vez** (Fase 0.3): `activeField` é sempre um único `Card | null`; jogar um
  novo terreno sempre o substitui, nunca falha por "já existir terreno".
- **Sem tributo/sacrifício aplicável aqui** — regra específica de invocação de monstro (F08), não
  toca esta feature.
- **Nenhuma resolução de efeito** (PRD F09 Capabilities item 3; Fronteiras): esta feature nunca
  aplica o que a carta faz, apenas a posiciona/ativa o terreno e emite o evento.

### Eventos

- `onSet` é o único tipo de evento emitido por esta feature, reaproveitado do vocabulário fechado
  de F02 (já usado por F08 para monstro colocado face-baixo) — nenhum tipo novo é introduzido
  (Decisão 6).
- As duas ações abrem janela de reação (Decisão 7), com `reactingPlayer = getOpponent(activePlayer)`.
- `context.target` (`"spell_trap_zone" | "field"`) é o único discriminador necessário para o
  Effect System (cross-PRD) diferenciar as duas colocações — não é validado por schema (é um
  `Record<string, JsonValue>` livre, já definido por F02), mas é um contrato de fato que esta spec
  fixa e os testes de aceitação verificam.

### Determinismo e pureza

- `playSpellOrTrap`, `playFieldSpell` e `getOpponent` são **puras e totais**: nenhuma leitura de
  relógio, nenhum `Math.random()`, nenhuma exceção — toda recusa é um `Result` de erro.
- A mesma entrada (`state`, `action`) sempre produz a mesma saída — pilar de determinismo (PRD §4;
  `arquitetura.md` §3.1).
- Nenhum campo é removido ou tem seu tipo alterado em `DuelState`/`PlayerState`/`PlayerField`; só os
  campos já existentes (`hand`, `field.spells`, `handPlayUsed`, `activeField`, `pending`) são
  escritos, nunca o `atk`/`def` base da carta.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duel/action.ts (acréscimo ao arquivo de F06)
export type PlaySpellOrTrapAction = Readonly<{
  type: "play_spell_or_trap";
  handIndex: number;
  zoneIndex: ZoneIndex;
}>;

export type PlayFieldSpellAction = Readonly<{
  type: "play_field_spell";
  handIndex: number;
}>;

// packages/shared/src/duel/action.schema.ts (acréscimo ao arquivo de F06)
export const PlaySpellOrTrapActionSchema = z.strictObject({
  type: z.literal("play_spell_or_trap"),
  handIndex: z.number().int().min(0),
  zoneIndex: ZoneIndexSchema,
});

export const PlayFieldSpellActionSchema = z.strictObject({
  type: z.literal("play_field_spell"),
  handIndex: z.number().int().min(0),
});

export const ActionSchema = z.discriminatedUnion("type", [
  AdvancePhaseActionSchema,
  PlaySpellOrTrapActionSchema,
  PlayFieldSpellActionSchema,
]);
```

**Reusados sem redefinir:** `DuelState`, `PlayerId`, `ZoneIndex`, `ZoneReference`, `SpellZone`,
`Card`, `DuelEvent`, `ApplyResult`, `Result`, `DomainError` (F01–F06); `createEvent`,
`openReactionWindow`, `hasOpenReactionWindow` (F02); `hasUsedHandPlay`, `markHandPlayUsed` (F06).

### Funções públicas

```
// packages/engine/src/spells — núcleo puro

playSpellOrTrap(state: DuelState, action: PlaySpellOrTrapAction): Result<ApplyResult, DomainError>
  // pré: hasOpenReactionWindow(state) === false (verificado por apply antes de chamar, Decisão 10)
  // pós: ok ⇒ { state, events: [onSet] } com a carta posicionada e a jogada da mão marcada
  //      erro ⇒ code em {hand_play_already_used, card_unavailable,
  //              invalid_spell_trap_card_type, no_space_for_card, zone_occupied}
  // total: nunca lança

playFieldSpell(state: DuelState, action: PlayFieldSpellAction): Result<ApplyResult, DomainError>
  // pré: hasOpenReactionWindow(state) === false (verificado por apply antes de chamar, Decisão 10)
  // pós: ok ⇒ { state, events: [onSet] } com activeField substituído e a jogada da mão marcada
  //      erro ⇒ code em {hand_play_already_used, card_unavailable, invalid_field_spell_card_type}
  // total: nunca lança

getOpponent(player: PlayerId): PlayerId
  // pós: "P2" quando player === "P1"; "P1" quando player === "P2"
  // total; puro
```

**Nota de composição com `apply` (F06):** o `switch` de `apply` ganha:

```
case "play_spell_or_trap": return ok(playSpellOrTrapResult) // delega diretamente, propaga Result
case "play_field_spell": return ok(playFieldSpellResult)    // idem
```

sem lógica adicional — a checagem de janela de reação já aconteceu antes do `switch` (Decisão 10).

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01–F06. `PlaySpellOrTrapAction`/`PlayFieldSpellAction` são
parte do mesmo contrato `Action`/`apply` que o Online Duel (cross-PRD, Fase 5) vai transportar por
WebSocket; o transporte em si não existe ainda.

### Contratos externos (cross-PRD)

- **Effect System:** consome `state.pending.event` (o `onSet` com `context.target`) para decidir
  reações — contrato já fornecido por F02; nenhuma implementação nova aqui.
- **Terrain Engine:** eventualmente será quem sabe, fora do motor, quais cartas `magica` são
  terrenos de fato — hoje essa responsabilidade recai sobre quem monta a ação (Decisão 2, Decisão
  9). Este PRD não bloqueia por isso.

### Exemplo — colocar uma armadilha (sucesso)

```json
{
  "estadoAntes": {
    "activePlayer": "P1",
    "players": { "P1": { "handPlayUsed": false, "hand": ["<Spellbinding Circle, handIndex 2>"] } }
  },
  "acao": { "type": "play_spell_or_trap", "handIndex": 2, "zoneIndex": 0 },
  "resultado": {
    "state": {
      "players": {
        "P1": {
          "handPlayUsed": true,
          "field": { "spells": [{ "occupied": true, "card": "<Spellbinding Circle>", "faceUp": false }] }
        }
      },
      "pending": {
        "type": "reaction_window",
        "reactingPlayer": "P2",
        "event": {
          "type": "onSet",
          "originPlayer": "P1",
          "involvedCards": ["<Spellbinding Circle>"],
          "involvedZones": [{ "player": "P1", "zoneType": "spell", "index": 0 }],
          "context": { "target": "spell_trap_zone", "faceUp": false }
        }
      }
    },
    "events": [
      {
        "type": "onSet",
        "originPlayer": "P1",
        "involvedCards": ["<Spellbinding Circle>"],
        "involvedZones": [{ "player": "P1", "zoneType": "spell", "index": 0 }],
        "context": { "target": "spell_trap_zone", "faceUp": false }
      }
    ]
  }
}
```

### Exemplo — jogar terreno (sucesso, substituindo terreno anterior)

```json
{
  "estadoAntes": { "activeField": "<Wasteland>", "activePlayer": "P1" },
  "acao": { "type": "play_field_spell", "handIndex": 4 },
  "resultado": {
    "state": { "activeField": "<Umi>" },
    "events": [
      {
        "type": "onSet",
        "originPlayer": "P1",
        "involvedCards": ["<Umi>"],
        "involvedZones": [],
        "context": { "target": "field" }
      }
    ]
  }
}
```

### Exemplo — recusa por zona ocupada

```json
{
  "ok": false,
  "error": {
    "code": "zone_occupied",
    "message": "Zona ocupada — escolha outra.",
    "details": { "zoneIndex": 0 }
  }
}
```

### Exemplo — recusa por todas as zonas ocupadas

```json
{
  "ok": false,
  "error": {
    "code": "no_space_for_card",
    "message": "Sem espaço para esta carta.",
    "details": {}
  }
}
```

### Exemplo — recusa por jogada da mão já usada

```json
{
  "ok": false,
  "error": {
    "code": "hand_play_already_used",
    "message": "Você já fez sua jogada neste turno.",
    "details": {}
  }
}
```

## 5. Modelo de Dados

Não aplicável. F09 não cria tabela Postgres nem estrutura IndexedDB — opera inteiramente sobre
`DuelState` em memória, igual F01–F06.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Código | Mensagem |
|---|---|---|---|---|
| Zona de magia/armadilha escolhida já ocupada (mas há outras livres) | `field.spells[zoneIndex].occupied === true` | `Result` de erro, estado inalterado | `zone_occupied` | "Zona ocupada — escolha outra." (PRD F09 Error Handling, citação literal) |
| Todas as 5 zonas de magia/armadilha ocupadas | Todas as 5 posições de `field.spells` com `occupied === true` | `Result` de erro, estado inalterado; prevalece sobre `zone_occupied` mesmo que o `zoneIndex` pedido também estivesse ocupado | `no_space_for_card` | "Sem espaço para esta carta." (PRD F09 Error Handling, citação literal) |
| Jogada da mão já usada neste turno | `hasUsedHandPlay(state, activePlayer) === true` | `Result` de erro, estado inalterado | `hand_play_already_used` | "Você já fez sua jogada neste turno." (PRD F09 Error Handling, citação literal) |
| `handIndex` não corresponde a nenhuma carta na mão | `hand[handIndex] === undefined` | `Result` de erro, estado inalterado | `card_unavailable` | "Carta indisponível." (mensagem reaproveitada do caso análogo de F08 — não está no bloco Error Handling de F09; Auto-Aceite documentado, Decisão de defesa em profundidade) |
| Carta com `tipo` fora de `{armadilha, equipamento, magica}` submetida via `play_spell_or_trap` | `card.tipo` | `Result` de erro, estado inalterado | `invalid_spell_trap_card_type` | "Esta carta não pode ser colocada em uma zona de magia/armadilha." (validação defensiva não citada literalmente pelo PRD F09; Auto-Aceite documentado) |
| Carta com `tipo !== "magica"` (ou `classe !== "Magic"`) submetida via `play_field_spell` | `card.tipo`/`card.classe` | `Result` de erro, estado inalterado | `invalid_field_spell_card_type` | "Esta carta não é uma carta de terreno." (validação defensiva não citada literalmente pelo PRD F09; Auto-Aceite documentado) |
| Ação recebida com `state.pending` definido (janela de reação aberta) | `hasOpenReactionWindow(state)`, checado por `apply` antes de delegar (Decisão 10) | `Result` de erro, estado inalterado — mesmo código que F06 já define | `reaction_window_open` | Mesma mensagem de F06 |
| **Pendência residual não coberta por validação alguma:** uma carta `magica` que é, de fato, um terreno real do FM (ex.: "Umi") é submetida via `play_spell_or_trap` em vez de `play_field_spell` (ou o inverso, uma magia de efeito submetida via `play_field_spell`) | Não detectável pelo motor — o schema não distingue as duas (achado desta spec, Decisão 2/9) | Aceito como uma ação válida do ponto de vista do motor; a inconsistência de regra fica na camada que montou a ação | — | Pendência documentada (Decisão 9), não um erro de execução desta feature |
| `Action` recebida de fora (rede/UI) não corresponde a nenhuma variante conhecida, ou tem `handIndex`/`zoneIndex` de tipo/forma inválida | `ActionSchema.safeParse` na fronteira (fora do `engine`) | Rejeição de schema antes de chegar a `apply` — mesmo padrão de F06 | erro de validação zod padrão | — |

## 7. Estratégia de Testes

### Unitários (Vitest)

`playSpellOrTrap` (`spells/play-spell-or-trap.test.ts`):
- `playSpellOrTrap coloca uma armadilha face-baixo na zona escolhida e remove a carta da mão`
- `playSpellOrTrap coloca uma magia de efeito face-cima na zona escolhida`
- `playSpellOrTrap coloca um equipamento face-cima na zona escolhida`
- `playSpellOrTrap marca a jogada da mão como usada após posicionar a carta`
- `playSpellOrTrap emite onSet com a carta e a zona envolvidas, e context.target igual a spell_trap_zone`
- `playSpellOrTrap abre janela de reação com o oponente do jogador ativo podendo reagir`
- `playSpellOrTrap recusa com hand_play_already_used quando a jogada da mão já foi usada`
- `playSpellOrTrap recusa com card_unavailable quando o handIndex não corresponde a nenhuma carta`
- `playSpellOrTrap recusa com invalid_spell_trap_card_type para uma carta do tipo monstro`
- `playSpellOrTrap recusa com invalid_spell_trap_card_type para uma carta do tipo ritual`
- `playSpellOrTrap recusa com zone_occupied quando a zona escolhida está ocupada e outras estão livres`
- `playSpellOrTrap recusa com no_space_for_card quando todas as 5 zonas estão ocupadas`
- `playSpellOrTrap não altera o estado em nenhum dos casos de recusa`

`playFieldSpell` (`spells/play-field-spell.test.ts`):
- `playFieldSpell substitui o terreno ativo pela carta jogada`
- `playFieldSpell substitui um terreno já ativo sem emitir nenhum evento sobre o terreno anterior`
- `playFieldSpell remove a carta da mão`
- `playFieldSpell marca a jogada da mão como usada`
- `playFieldSpell emite onSet com involvedZones vazio e context.target igual a field`
- `playFieldSpell abre janela de reação com o oponente do jogador ativo podendo reagir`
- `playFieldSpell recusa com hand_play_already_used quando a jogada da mão já foi usada`
- `playFieldSpell recusa com card_unavailable quando o handIndex não corresponde a nenhuma carta`
- `playFieldSpell recusa com invalid_field_spell_card_type para uma carta do tipo armadilha`
- `playFieldSpell recusa com invalid_field_spell_card_type para uma carta do tipo monstro`
- `playFieldSpell não altera o estado em nenhum dos casos de recusa`

`getOpponent` (`spells/opponent.test.ts`):
- `getOpponent devolve P2 quando o jogador é P1`
- `getOpponent devolve P1 quando o jogador é P2`

`apply` (extensão de `turn/apply.test.ts`, arquivo criado por F06):
- `apply roteia play_spell_or_trap para playSpellOrTrap`
- `apply roteia play_field_spell para playFieldSpell`
- `apply recusa play_spell_or_trap quando state.pending está definido, devolvendo reaction_window_open`
- `apply recusa play_field_spell quando state.pending está definido, devolvendo reaction_window_open`

### Property-based (fast-check)

- **Determinismo:** para qualquer `DuelState` válido sem `pending`, com pelo menos uma carta
  `armadilha`/`equipamento`/`magica` na mão do jogador ativo e ao menos uma zona de magia/armadilha
  livre, chamar `playSpellOrTrap` duas vezes a partir do mesmo estado inicial e mesma ação produz
  sempre o mesmo estado resultante (pilar de determinismo, PRD §4). 1.000 execuções.
- **Preservação de campos não tocados:** para qualquer estado e ação válidos, `lp`, `deck`,
  `activeField` (no caso de `playSpellOrTrap`) ou o resto do `field` (no caso de `playFieldSpell`),
  e o `atk`/`def` base da carta colocada permanecem estruturalmente idênticos ao valor de entrada.

### Integração

Não aplicável ainda — uma partida completa ponta-a-ponta (critério de Cross-Feature Integration do
PRD) só é exercível quando F07, F08, F10, F11 e F12 existirem. Esta feature testa as duas ações
isoladamente, a partir de um `DuelState` fixture com jogador ativo já definido e mão populada.

### Análise estática

- `packages/engine/src/spells/**` importa apenas `packages/shared`, `packages/engine/src/events` e
  `packages/engine/src/turn` — nunca `data`, `rules`, `ai`, `web`, `server`, React, DOM, `fetch` ou
  Supabase.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.
- O `switch` de `apply` sobre `action.type` permanece exaustivo (`never` no `default`) após as duas
  novas variantes — garantia herdada de F06.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F09) | Teste |
|---|---|
| Coloca 1 magia/armadilha por turno em zona livre; recusa se a zona/todas as zonas estiverem ocupadas ou a jogada já tiver sido usada | Os testes de sucesso e as três recusas (`zone_occupied`, `no_space_for_card`, `hand_play_already_used`) de `play-spell-or-trap.test.ts` |
| Jogar carta de terreno substitui o único terreno ativo no estado | `playFieldSpell substitui o terreno ativo pela carta jogada` + `...substitui um terreno já ativo sem emitir nenhum evento...` |
| O motor não resolve o efeito da carta (delegado ao Effect System, cross-PRD), apenas posiciona e emite o evento | Ausência de qualquer lógica de resolução de efeito em `spells/**` (verificação por leitura de código/análise estática); nenhum teste desta feature assume um resultado de efeito aplicado |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Todos os eventos emitidos pelas ações (F06–F11) passam por F02 e abrem janela de reação quando aplicável" | `playSpellOrTrap emite onSet...` + `playSpellOrTrap abre janela de reação...` + os dois testes equivalentes de `playFieldSpell` — ambos usam `createEvent`/`openReactionWindow` (F02) |
| Cross-Feature: "O mesmo estado inicial + mesma sequência de ações + mesmo seed produz o mesmo resultado final em execuções repetidas" | Propriedade `Determinismo` desta feature |
| Cross-Feature: "Nenhuma capacidade do motor depende de UI" | Análise estática de `packages/engine/src/spells/**` |
| Cross-PRD: "Effect System: armadilhas/magias posicionadas por F09 reagem aos eventos emitidos por F02 na janela de reação" | Contrato externo declarado na Seção 4 (`onSet` + `context.target` + `ReactionWindow`) — fornecido por esta feature, a ser consumido pelo Effect System quando aquele PRD existir |
