# Invocar e Posicionar Monstro

> PRD: `docs/prds/motor-duelo-1x1.md` — F08
> Pacote-alvo: `packages/engine` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta feature entrega a primeira jogada real da mão que o motor aceita: invocar um monstro da mão
do jogador ativo para uma das 5 zonas de monstro, escolhendo uma das 4 posições (ataque/defesa ×
face-cima/face-baixo), sem tributo — fiel ao Forbidden Memories original. É a primeira consumidora
concreta do mecanismo "1 jogada da mão por turno" que F06 (Ciclo de Turno e Fases) introduz: F08
consome e marca esse sinalizador, e compete por ele com F09 (Jogar Magia/Armadilha/Terreno), que
pertence à mesma wave de execução.

F08 depende de F06 (turno ativo com jogada da mão disponível) e de F02 (emissão de evento +
janela de reação), ambas já especificadas: F02 tem spec e implementação (`packages/engine/src/
events`); F06 tem spec segundo o briefing deste lote, mas **o arquivo `docs/specs/motor-duelo-1x1/
F06-ciclo-de-turno-e-fases/spec.md` não foi encontrado neste worktree no momento em que esta spec
foi gerada** — o mais provável é que esteja sendo produzido em paralelo por outro sub-agente do
mesmo lote batch, num worktree isolado ainda não mesclado. Esta spec assume o contrato de F06
exatamente como descrito no briefing do orquestrador (união `Action`, `packages/engine/src/turn/
apply.ts`, `PlayerState.handPlayUsed`, `hasUsedHandPlay`/`markHandPlayUsed` em `packages/engine/
src/turn/hand-play.ts`) e marca cada uma dessas peças como "a confirmar" contra o `spec.md` real de
F06 assim que ele existir neste worktree (ver Decisão 8).

### Incluído

- Nova variante da união `Action` (criada por F06) que identifica o jogador, a carta na mão, a
  zona de destino e a posição desejada (PRD F08 Capabilities)
- Invocação de exatamente 1 monstro por turno, consumindo a jogada da mão do turno (PRD F08
  Capabilities; Consumes F06)
- Escolha entre as 4 posições no momento da invocação — `attack_face_up`, `attack_face_down`,
  `defense_face_up`, `defense_face_down` (PRD F08 Capabilities)
- Ausência de tributo/sacrifício: qualquer monstro pode ser invocado independentemente de
  ATK/DEF/estrelas (PRD F08 Capabilities, fiel ao FM)
- Emissão de `onSummon` (face-cima) ou `onSet` (face-baixo) com abertura de janela de reação
  (PRD F08 Capabilities; Consumes F02)
- Os 4 casos de recusa do PRD Error Handling, cada um com seu próprio código de erro

### Fronteiras

- **Fusion System (cross-PRD, opcional):** um monstro resultante de fusão preenchendo o slot de
  invocação é citado no PRD (Consumes e critério de aceite), mas o subsistema não existe
  (`docs/arquitetura.md` §7 Fora de Escopo lista Fusion System como PRD próprio ainda não escrito).
  Ver "Contratos externos assumidos" abaixo e Decisão 9 — não bloqueia esta spec.
- **Resolução do evento na janela de reação** (o que uma armadilha faz ao reagir a `onSummon`) é
  do Effect System (cross-PRD), fora de escopo — F08 só abre a janela (PRD Fora de Escopo;
  `arquitetura.md` §3.4).
- **Ciclo de turno em si** (fases, quando a jogada da mão fica disponível, reset de flags no fim
  do turno) é de F06, não desta feature — F08 só consome a garantia "jogada da mão disponível".
- **Ataque e mudança de posição** de um monstro já em campo são de F11 e F10, não desta feature.

### Contratos externos assumidos

- **F06 (Ciclo de Turno e Fases, interno ao mesmo PRD):** `Action` (união, com `AdvancePhaseAction`
  hoje); `apply(state, action): Result<ApplyResult, DomainError>` em `packages/engine/src/turn/
  apply.ts`, com um `switch` exaustivo sobre `action.type`; `PlayerState.handPlayUsed: boolean`;
  `hasUsedHandPlay(state, player): boolean` e `markHandPlayUsed(state, player): DuelState` em
  `packages/engine/src/turn/hand-play.ts`. Tratado como pré-requisito de implementação (ver
  `plan.md`), não redefinido por esta spec.
- **Fusion System (cross-PRD, opcional):** carta de monstro resultante de fusão para preencher o
  slot de invocação. Interface esperada, ainda não definida: quando esse subsistema existir, ele
  precisará entregar um `Card` já materializado por uma via alternativa a "carta presente na mão
  por `handIndex`" — provavelmente uma nova variante de `Action` (ex.: `PlaceFusionResultAction`)
  ou um campo de origem alternativo dentro da mesma ação. Esta spec não antecipa essa forma (ver
  Decisão 9).

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A carta a invocar é identificada por **`handIndex`** (posição na lista `hand` do jogador ativo no momento em que a ação é aplicada), não por `numero`/`id`. Motivo: até 3 cópias da mesma carta podem coexistir na mão (regra de deck de `build-deck`), então `numero` sozinho é ambíguo; `handIndex` é unívoco e seguro, no mesmo espírito de `deck` já usar índice 0 = topo. | Especificação parcial no PRD (Capabilities cita "a carta da mão" sem dizer como identificá-la); auto-aceite — default de mercado consistente com guidelines §7.1 (assinaturas explícitas, sem ambiguidade) | confirmada |
| 2 | Uma carta só pode ocupar zona de monstro se `tipo` for `"monstro"` **ou** `"ritual"` — os dois tipos que carregam ATK/DEF não-nulo no schema; `equipamento`/`magica`/`armadilha` pertencem às zonas de F09. Cartas rituais chegam ao campo normalmente pela mão nesta versão (a via de Fusão, quando existir, é uma alternativa, não a única). | Especificação parcial no PRD (Capabilities não lista quais `tipo`s são "monstro invocável"); auto-aceite — inferido da contagem real do dataset (`arquitetura.md` §4.2: 621 monstro + 24 ritual = únicos tipos com ATK/DEF) | confirmada |
| 3 | `onSummon` é emitido quando a posição termina em `_face_up` (`attack_face_up`, `defense_face_up`); `onSet` quando termina em `_face_down` (`attack_face_down`, `defense_face_down`). A distinção segue a **face**, não o par ataque/defesa — leitura literal do PRD Capabilities: "Emite onSummon (face-cima) ou onSet (face-baixo)". | PRD F08 Capabilities, leitura literal | confirmada |
| 4 | Ordem de validação da zona: primeiro verifica se **todas as 5 zonas** estão ocupadas (→ `no_free_monster_zone`); só depois verifica se a **zona especificamente escolhida** está ocupada (→ `monster_zone_occupied`). Essa ordem é o que torna as duas mensagens do PRD distintas e informativas: "sem espaço" quando não há alternativa nenhuma; "escolha outra" quando há zonas livres além da escolhida. | Leitura das duas mensagens de Error Handling do PRD F08, que seriam redundantes em qualquer outra ordem | confirmada |
| 5 | Ao final de `summonMonster`, a janela de reação **permanece aberta** (`state.pending` presente) — a função não a fecha sozinha. `docs/arquitetura.md` §3.2: "`apply` retorna um estado com `pendente`. O chamador... resolve com ações de follow-up; sem reações, a janela fecha e o fluxo segue." Como o Effect System (cross-PRD) ainda não existe para decidir "há 0 reações", fechar a janela é responsabilidade explícita de quem orquestra o duelo (teste, adaptador de UI, ou futuramente o Effect System), chamando `closeReactionWindow` (F02) — nunca implícito dentro de `summonMonster`. | `docs/arquitetura.md` §3.2; ADR-002 §4/§6 (motor headless orientado a eventos, janela de reação como máquina de estados explícita) | confirmada |
| 6 | `reactingPlayer` da janela de reação é o **oponente** do jogador que invoca, calculado inline (`"P1"` ↔ `"P2"`) dentro de `summonMonster` — não introduz um utilitário `opponentOf` novo em `packages/shared`, por ser uma inversão trivial de um union de 2 valores fixos (YAGNI, guidelines §19.3). | Inferência de regra de jogo (armadilhas que reagem a invocação pertencem ao oponente); guidelines §19.3 | confirmada |
| 7 | `summonMonster` **não** revalida fase (`main`), jogador ativo (`state.activePlayer === action.player`) nem ausência de janela de reação já aberta — confia que `apply` (F06) já garantiu essas três condições antes do `switch` despachar para o handler de `summon_monster`, no mesmo espírito de `initDuel` (F03) confiar em `buildInitializationInput`. `summonMonster` só valida o que é **especificamente seu**: jogada da mão ainda disponível, existência/tipo da carta, disponibilidade da zona. | Padrão observado em `packages/engine/src/initialization/init-duel.ts` (função interna confia no contrato do produtor upstream); evita duplicar o guard genérico de F06 em cada uma das 5 features de ação da wave 4 | confirmada |
| 8 | O contrato de F06 (união `Action`, `apply`, `PlayerState.handPlayUsed`, `hasUsedHandPlay`/`markHandPlayUsed`) foi adotado exatamente como descrito no briefing do orquestrador deste lote batch, por não estar visível no worktree isolado em que esta spec foi gerada (worktrees clonam do histórico git, não do arquivo ainda não commitado). **Conferido a posteriori contra `docs/specs/motor-duelo-1x1/F06-ciclo-de-turno-e-fases/spec.md` real**: o contrato bate integralmente, com uma única correção de caminho — F06 cria `packages/shared/src/duel/action.schema.ts` como arquivo **separado** de `schema.ts` para os schemas de `Action` (não uma alteração ao `schema.ts` geral); a Seção 2 desta spec já foi corrigida de acordo. | Releitura de `docs/specs/motor-duelo-1x1/F06-.../spec.md` após a geração inicial desta spec | confirmada |
| 9 | A via de invocação por **Fusion System** não é modelada nesta spec além de uma nota de extensão futura (ver "Contratos externos assumidos"). `SummonMonsterAction` cobre apenas a invocação a partir da mão (`handIndex`). Quando o Fusion System (cross-PRD) existir e tiver seu próprio PRD/spec, ele decide como estender o contrato — sem inventar essa forma agora. | Fase 0.4/1.3 (dependência cross-PRD inexistente não bloqueia; tratada como contrato externo); PRD F08 marca essa dependência como "(cross-PRD, opcional)" | pendente — aguarda Fusion System |
| 10 | F09 (Jogar Magia/Armadilha/Terreno), feature irmã da mesma wave 4, **reutiliza os mesmos** `hasUsedHandPlay`/`markHandPlayUsed` de F06 para a sua própria jogada da mão — nenhuma das duas specs duplica ou redefine esse mecanismo; ambas competem pelo mesmo sinalizador `handPlayUsed` do jogador ativo no turno corrente. | PRD F06 Capabilities ("as três são mutuamente exclusivas no mesmo turno"); coordenação explícita pedida pelo orquestrador do lote | confirmada |
| 11 | Nenhum campo novo é acrescentado ao schema de carta (`Card`) nem ao vocabulário de eventos (`EVENT_TYPES`) — `onSummon`/`onSet` já existem em `EVENT_TYPES` desde F02. | Invariante da Fase 0.3/0.4; `packages/shared/src/duel/constants.ts` já lista os 10 eventos | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duel/summon-monster-action.ts` | shared | novo | Declara `SummonMonsterAction` — a nova variante da união `Action` |
| `packages/shared/src/duel/action.ts` | shared | alterado (arquivo criado por F06; F08 só acrescenta sua variante) | Importa `SummonMonsterAction` e a inclui na união `Action` |
| `packages/shared/src/duel/action.schema.ts` | shared | alterado (arquivo criado por F06) | Acrescenta `SummonMonsterActionSchema` à união `ActionSchema` |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta `SummonMonsterAction` e `SummonMonsterActionSchema` |
| `packages/engine/src/summon/summon-monster.ts` | engine | novo | `summonMonster` — a função pura que valida e aplica a invocação |
| `packages/engine/src/summon/index.ts` | engine | novo | Export público do subsistema `summon` |
| `packages/engine/src/summon/summon-monster.test.ts` | engine | novo | Unitários: caminho de sucesso (4 posições) e as 5 recusas |
| `packages/engine/src/summon/summon-monster.properties.test.ts` | engine | novo | Propriedades: invariantes de mão/zona, preservação de atk/def, determinismo |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta `summonMonster` ao lado dos demais subsistemas |
| `packages/engine/src/turn/apply.ts` | engine | alterado (arquivo criado por F06; F08 só acrescenta seu `case`) | Acrescenta `case "summon_monster": return summonMonster(state, action);` ao switch exaustivo |
| `packages/engine/README.md` | engine | alterado | Acrescenta o subsistema `summon` à lista de exports públicos |

**Verificação da direção de dependências:** `packages/engine/src/summon/**` importa apenas de
`packages/shared` (`DuelState`, `SummonMonsterAction`, `Card`, `DomainError`, `Result`, `ok`, `err`,
`ApplyResult`, `TOTAL_MONSTER_ZONES`) e do próprio `packages/engine` (`createEvent`,
`openReactionWindow` de `../events`; `hasUsedHandPlay`/`markHandPlayUsed` de `../turn/hand-play.ts`,
assumidos de F06). Nenhum import de `data`, `rules`, `ai`, `web`, `server`, React, DOM, `fetch` ou
Supabase — a mesma garantia já verificada para os demais subsistemas de `packages/engine` desde F02.

## 3. Design Técnico

### Estruturas de dados

**`SummonMonsterAction`** (`packages/shared`) — a nova variante de `Action`:

```
SummonMonsterAction = Readonly<{
  type: "summon_monster";
  player: PlayerId;        // quem invoca — apply (F06) confirma que é o jogador ativo
  handIndex: number;       // posição da carta na lista hand do jogador, no momento da aplicação
  zoneIndex: ZoneIndex;     // 0-4, a zona de monstro de destino
  position: MonsterPosition; // uma das 4 combinações ataque/defesa x face-cima/face-baixo
}>
```

Reaproveita `PlayerId`, `ZoneIndex`, `MonsterPosition` já existentes (`packages/shared/src/duel/
{player,events,types}.ts`) — nenhum tipo novo além de `SummonMonsterAction` em si.

### Fluxo

1. `apply` (F06) despacha para `summonMonster(state, action)` já tendo confirmado fase `main`,
   jogador ativo correto e ausência de janela de reação aberta (Decisão 7).
2. `summonMonster` lê `player = state.players[action.player]`.
3. Se `hasUsedHandPlay(state, action.player)` → recusa `hand_play_already_used`.
4. Se `action.handIndex` não é um índice válido de `player.hand` (`< 0` ou `>= player.hand.length`)
   → recusa `card_not_in_hand`.
5. `card = player.hand[action.handIndex]`. Se `card.tipo` não é `"monstro"` nem `"ritual"` →
   recusa `unsummonable_card_type` (Decisão 2).
6. Se todas as 5 zonas de `player.field.monsters` têm `occupied: true` → recusa
   `no_free_monster_zone` (Decisão 4).
7. Se `player.field.monsters[action.zoneIndex].occupied` é `true` → recusa
   `monster_zone_occupied` (Decisão 4).
8. Constrói a nova mão sem a carta (`handIndex` removido), a nova zona (`{ occupied: true, card,
   position: action.position, hasAttacked: false, hasChangedPosition: false }`), e o novo
   `PlayerField` com essa zona substituída no índice `action.zoneIndex`.
9. Aplica `markHandPlayUsed` sobre o estado com o novo campo/mão do jogador.
10. Determina o tipo de evento pela face de `action.position` (Decisão 3): `onSummon` se
    face-cima, `onSet` se face-baixo.
11. Constrói o evento com `createEvent` (F02): `originPlayer: action.player`,
    `involvedCards: [card]`, `involvedZones: [{ player: action.player, zoneType: "monster",
    index: action.zoneIndex }]`, `context: { position: action.position }`.
12. Abre a janela de reação com `openReactionWindow(novoEstado, evento, oponente)`
    (`oponente = action.player === "P1" ? "P2" : "P1"`, Decisão 6).
13. Devolve `ok({ state: estadoComJanelaAberta, events: [evento] })`.

### Regras de negócio

- **1 monstro por turno** (invariante Fase 0/PRD F06 Capabilities): garantido por
  `hasUsedHandPlay`/`markHandPlayUsed` — o mesmo sinalizador que F09 também consome (Decisão 10).
- **5 zonas de monstro fixas** (invariante Fase 0.3): `TOTAL_MONSTER_ZONES` (`packages/shared/src/
  duel/constants.ts`), reaproveitado para o cálculo de "todas ocupadas".
- **4 posições, sem tributo** (PRD F08 Capabilities): nenhuma verificação de ATK/DEF/estrelas do
  monstro condiciona a invocação — qualquer carta elegível (Decisão 2) pode ocupar qualquer zona
  livre em qualquer uma das 4 posições.
- **`atk`/`def` base nunca sobrescritos** (invariante Fase 0.3/F01 Capabilities): a carta é movida
  por referência de valor imutável (`Card` é `Readonly`) da mão para a zona — nenhum campo é
  recalculado ou substituído nesta feature.

### Eventos

- `onSummon` — face-cima (`attack_face_up`, `defense_face_up`).
- `onSet` — face-baixo (`attack_face_down`, `defense_face_down`).
- Ambos abrem janela de reação (F02); a resolução de reações concretas é do Effect System
  (cross-PRD), fora de escopo.
- Ordem de emissão: um único evento por chamada de `summonMonster` — não há caso de múltiplos
  eventos nesta feature (diferente de F11, que emite `onAttackDeclared` + `onDamage`/`onDestroy`
  em sequência).

### Determinismo e pureza

- `summonMonster` é **pura e total** para entradas que respeitam o contrato de tipos: não faz
  I/O, não lê relógio, não usa `Math.random()` (não há aleatoriedade envolvida em invocar um
  monstro). Falhas de regra de negócio (zona ocupada, jogada já usada, etc.) retornam via
  `Result` de erro — nunca lança exceção.
- Não consome nem avança o PRNG do estado (`seed` intocado) — apenas F03 (embaralhar) e futuros
  efeitos aleatórios, se algum dia existirem, tocam o gerador.
- Estado 100% serializável preservado: a função só produz novos objetos com os mesmos tipos de
  campo já existentes em `DuelState`/`PlayerState`/`MonsterZone` — nenhum campo de UI, função,
  classe, `Map` ou `Set` é introduzido.
- Aplicar `summonMonster` duas vezes com o mesmo `state` e a mesma `action` produz sempre o mesmo
  `ApplyResult` (função pura sem efeito colateral observável).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`SummonMonsterAction`** (novo, `duel/summon-monster-action.ts`) — ver Estruturas de dados.
- **`Action`** (união criada por F06, `duel/action.ts`) — F08 acrescenta `SummonMonsterAction`
  como um novo membro: `Action = AdvancePhaseAction | SummonMonsterAction | ...` (demais membros
  vêm de F09-F11, fora desta spec).
- **`SummonMonsterActionSchema`** (novo, `duel/schema.ts`):

```ts
export const SummonMonsterActionSchema = z.strictObject({
  type: z.literal("summon_monster"),
  player: PlayerIdSchema,
  handIndex: z.number().int().min(0),
  zoneIndex: ZoneIndexSchema,
  position: MonsterPositionSchema,
});
```

  `handIndex` só tem limite inferior no schema (`>= 0`); o limite superior (`< hand.length`) é
  dinâmico e verificado em runtime por `summonMonster` (recusa `card_not_in_hand`), não pelo zod.

- **Reusados sem redefinir:** `PlayerId`, `PlayerIdSchema`, `ZoneIndex`, `ZoneIndexSchema`,
  `MonsterPosition`, `MonsterPositionSchema`, `Card`, `CardSchema`, `DomainError`, `Result`,
  `ApplyResult`, `TOTAL_MONSTER_ZONES`, `EVENT_TYPES` (todos de F01-F05/`banco-de-cartas`).

### Funções públicas

```
// packages/engine/src/summon — núcleo puro

summonMonster(state: DuelState, action: SummonMonsterAction): Result<ApplyResult, DomainError>
  // pré: apply (F06) já confirmou fase "main", state.activePlayer === action.player, e ausência
  //      de janela de reação aberta (Decisão 7) — summonMonster não os revalida
  // pós (sucesso): a carta em hand[action.handIndex] é removida da mão do jogador e passa a
  //      ocupar players[action.player].field.monsters[action.zoneIndex] com a posição pedida;
  //      handPlayUsed do jogador fica true; evento onSummon/onSet emitido; janela de reação
  //      aberta com o oponente como reactingPlayer
  // pós (erro): estado devolvido é o original; nenhuma mutação parcial
  // total: nunca lança
```

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01-F05. `summonMonster` é uma função de domínio pura
consumida via `apply`, sem rede envolvida nesta feature. A validação de um `SummonMonsterAction`
recebido de fora (ex.: payload de rede do Online Duel, cross-PRD, Fase 5) usa
`SummonMonsterActionSchema.safeParse` na fronteira de quem receber — fora desta spec.

### Contratos externos (cross-PRD)

**Assumido de Fusion System (cross-PRD, opcional, ainda sem PRD):** quando existir, precisará de
uma via para entregar um `Card` de monstro resultante de fusão ao slot de invocação, consumindo a
mesma jogada do turno. Esta spec não define essa forma (Decisão 9) — o Fusion System, ao ganhar
seu próprio PRD/spec, decide se estende `SummonMonsterAction` (ex.: `source: "hand" | "fusion"`)
ou introduz uma ação irmã (`PlaceFusionResultAction`). Nenhuma das duas formas é escolhida aqui
para não inventar um contrato que o dado real (regras de fusão) ainda não sustenta.

### Exemplo — invocação bem-sucedida

```json
{
  "action": {
    "type": "summon_monster",
    "player": "P1",
    "handIndex": 2,
    "zoneIndex": 0,
    "position": "attack_face_up"
  },
  "result": {
    "ok": true,
    "value": {
      "events": [
        {
          "type": "onSummon",
          "originPlayer": "P1",
          "involvedCards": ["<carta invocada>"],
          "involvedZones": [{ "player": "P1", "zoneType": "monster", "index": 0 }],
          "context": { "position": "attack_face_up" }
        }
      ]
    }
  }
}
```

### Exemplo — recusa por zona ocupada

```json
{
  "ok": false,
  "error": {
    "code": "monster_zone_occupied",
    "message": "The chosen monster zone is already occupied.",
    "details": { "player": "P1", "zoneIndex": 0 }
  }
}
```

## 5. Modelo de Dados

Não aplicável. F08 não cria tabela Postgres nem estrutura IndexedDB própria — é uma transição de
estado em memória dentro do motor, no mesmo padrão de F01-F05.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | `code` | Mensagem de referência (PRD, para `apps/web` mapear futuramente) |
|---|---|---|---|
| Jogada da mão já usada neste turno | `hasUsedHandPlay(state, action.player)` | `hand_play_already_used` | "Você já fez sua jogada neste turno." |
| `handIndex` fora dos limites da mão (carta ausente) | `action.handIndex < 0 \|\| >= hand.length` | `card_not_in_hand` | "Carta indisponível." |
| Carta na mão não é do tipo invocável (nem `monstro` nem `ritual`) | `card.tipo` fora de `{"monstro","ritual"}` | `unsummonable_card_type` | Caso não previsto pelo PRD — mensagem técnica: "Only cards of type 'monstro' or 'ritual' can occupy a monster zone." (edge case adicionado por esta spec, Decisão 2) |
| Todas as 5 zonas de monstro ocupadas | Contagem de `occupied: true` em `field.monsters` | `no_free_monster_zone` | "Sem espaço para invocar." |
| Zona escolhida (`zoneIndex`) já ocupada, havendo outras livres | `field.monsters[zoneIndex].occupied === true` | `monster_zone_occupied` | "Zona ocupada — escolha outra." |
| `SummonMonsterAction` malformada na fronteira de rede/UI (ex.: `zoneIndex` fora de 0-4) | `SummonMonsterActionSchema.safeParse` | `invalid_summon_monster_action` (zod, fora de `summonMonster` em si) | Erro técnico do zod — quem chama a fronteira decide a mensagem de UI |
| Janela de reação já aberta ao tentar invocar | Fora do escopo de `summonMonster` — responsabilidade de `apply` (F06), que não despacha a ação nesse caso (Decisão 7) | `reaction_window_already_open` (F02, reaproveitado) | N/A — nunca alcança `summonMonster` |

Todas as mensagens do PRD (coluna 4) são o texto de referência que `apps/web` (ainda sem UI de
duelo) vai associar ao `code` correspondente em seu `messages.ts`, conforme o contrato "`DomainError`
carrega um `code` que a UI mapeia para uma mensagem" (`CLAUDE.md`/arquitetura). O `message` real de
`DomainError` em código fica em inglês, técnico, para quem lê logs/testes — mesmo padrão de
`packages/engine/src/serialization/load.ts` (`"Snapshot failed validation..."`, código
`invalid_snapshot`).

## 7. Estratégia de Testes

### Unitários (Vitest)

`summonMonster` — caminho de sucesso, table-driven sobre as 4 posições:
- `places the monster in the chosen zone in the attack_face_up position and emits onSummon`
- `places the monster in the chosen zone in the attack_face_down position and emits onSet`
- `places the monster in the chosen zone in the defense_face_up position and emits onSummon`
- `places the monster in the chosen zone in the defense_face_down position and emits onSet`
- `removes the summoned card from the player's hand`
- `marks handPlayUsed as true for the summoning player after a successful summon`
- `opens a reaction window with the opponent as reactingPlayer`
- `does not overwrite the placed card's base atk/def`
- `does not mutate the state object it receives`

`summonMonster` — recusas, table-driven:
- `rejects with hand_play_already_used when the player already used this turn's hand play`
- `rejects with card_not_in_hand when handIndex is negative`
- `rejects with card_not_in_hand when handIndex is beyond the hand's length`
- `rejects with unsummonable_card_type when the card at handIndex is armadilha/equipamento/magica`
- `rejects with no_free_monster_zone when all 5 monster zones are occupied`
- `rejects with monster_zone_occupied when the chosen zone is occupied but another zone is free`
- `returns the original state unchanged on every rejection path`

### Property-based (fast-check)

- **Invariante de mão/zona:** para qualquer `DuelState` válido com mão não vazia, ao menos uma
  zona de monstro livre, `handIndex` apontando para uma carta de tipo `monstro`/`ritual` e
  `zoneIndex` livre — `summonMonster` sempre devolve um estado onde `hand.length` diminuiu
  exatamente 1 e exatamente uma zona a mais de `field.monsters` está `occupied: true`. 1.000
  execuções (mesmo volume de F01-F05).
- **Preservação de atk/def base:** para qualquer entrada válida, o `card.atk`/`card.def` da zona
  resultante é estruturalmente idêntico ao `card.atk`/`card.def` da carta original na mão — nunca
  sobrescrito.
- **Determinismo:** para qualquer par `(state, action)` válido, aplicar `summonMonster` duas vezes
  de forma independente produz sempre o mesmo `ApplyResult` (comparação estrutural).

### Integração

Não aplicável nesta feature isoladamente — mesma justificativa de F01-F05 (sem filesystem, banco
de dados ou rede). O teste de ponta a ponta "F03 inicializa → F06 conduz turnos → F08 invoca" só é
possível quando F06 (e, transitivamente, F03) estiverem implementadas neste worktree — ver
Pré-requisitos do `plan.md`.

### Análise estática

- `packages/engine/src/summon/**` importa apenas `packages/shared` e `packages/engine` (`events`,
  `turn/hand-play`) — nunca `data`, `rules`, `ai`, `web`, `server`, React, DOM, `fetch` ou
  Supabase.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F08) | Teste |
|---|---|
| Invoca 1 monstro por turno em zona livre, com escolha entre as 4 posições, sem exigir tributo | Os 4 testes table-driven de sucesso por posição; ausência de verificação de ATK/DEF/estrelas confirmada por leitura do código (nenhum teste de recusa por "monstro fraco demais") |
| Recusa invocar em zona ocupada, sem zonas livres, com jogada já usada, ou com carta ausente da mão — cada caso com a mensagem específica | Os 4 testes de recusa correspondentes (mais `unsummonable_card_type`, edge case adicional desta spec) |
| Um monstro resultante de fusão (cross-PRD) é aceito no slot de invocação e consome a jogada do turno | **Não implementável agora** — contrato declarado como externo na Seção 4; teste de contrato adiado até o Fusion System existir (Decisão 9) |
| Emite onSummon (face-cima) ou onSet (face-baixo) com janela de reação | Os 4 testes de sucesso (2 onSummon + 2 onSet) mais o teste de `reactingPlayer` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Uma partida completa roda de ponta a ponta: F03 inicializa → F06 conduz turnos → F07 compra → F08/F09 jogam da mão → F10/F11 batalham → F12 encerra" | Adiado até F06/F07/F09/F10/F11/F12 existirem neste worktree — fora do alcance de uma feature isolada da wave 4 |
| Cross-Feature: "Todos os eventos emitidos pelas ações (F06–F11) passam por F02 e abrem janela de reação quando aplicável" | Coberto pela suíte desta feature: todo caminho de sucesso de `summonMonster` passa por `createEvent` + `openReactionWindow` (F02) |
| Cross-Feature: "Nenhuma capacidade do motor depende de UI" | Análise estática (acima) |
| Cross-PRD: "Fusion System: uma carta resultante de fusão é entregue e posicionada por F08 pela via de invocação" | Contrato externo declarado (Seção 4); teste adiado até o Fusion System existir (Decisão 9) |
