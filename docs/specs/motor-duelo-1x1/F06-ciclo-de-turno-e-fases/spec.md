# Ciclo de Turno e Fases

> PRD: `docs/prds/motor-duelo-1x1.md` — F06
> Pacote-alvo: `packages/engine` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta feature entrega o **ciclo de turno** do duelo: a sequência de fases Compra → Principal →
Batalha → Fim, a alternância do jogador ativo ao encerrar o turno, e o reset das flags por-monstro
ao final de cada turno. É a Foundation da Wave 3 (`docs/prds/motor-duelo-1x1.md` §8 Parte 2) e a
feature que introduz, pela primeira vez neste pacote, o **dispatcher central `apply(state,
action)`** e a união de ações do motor (`docs/arquitetura.md` §3.1) — até aqui (F01–F05) o motor só
tinha estado, eventos, inicialização, cálculo de ATK/DEF efetivo e serialização, nenhuma ação de
jogador.

F06 é deliberadamente estreita: cobre só a **navegação entre fases e turnos**, não as ações que
acontecem dentro de cada fase. Compra real de cartas (F07), invocar monstro (F08), jogar
magia/armadilha/terreno (F09), mudar posição (F10) e atacar (F11) são todas features futuras que
vão **estender a mesma união `Action`** com suas próprias variantes, no mesmo arquivo que esta spec
cria. A fase de Compra, em particular, não tem nenhuma lógica de compra ainda — `advance_phase`
salta direto de `"draw"` para `"main"` sem puxar nenhuma carta; é o ponto de extensão que F07 vai
interceptar depois.

### Incluído

- União `Action` (`packages/shared`) com a primeira variante: `{ type: "advance_phase" }` (PRD F06
  Capabilities — "sequência de fases por turno")
- `apply(state, action): ApplyResult` (`packages/engine`) — o dispatcher central citado em
  `arquitetura.md` §3.1, hoje só tratando `advance_phase`
- Transições de fase dentro do mesmo turno: `"draw"` → `"main"` (automática, sem evento, sem
  lógica de compra) → `"battle"` → `"end"` (PRD F06 Capabilities)
- Transição de turno ao avançar a partir de `"end"`: alterna `activePlayer`, incrementa `turn`,
  volta `phase` para `"draw"`, reseta `hasAttacked`/`hasChangedPosition` dos monstros do jogador
  cujo turno terminou, emite `onTurnEnd` e depois `onTurnStart` (PRD F06 Capabilities e critério
  de aceite 1 e 4)
- Bloqueio de ataque no primeiro turno do duelo, exposto como predicado derivado de `turn === 1`
  (decisão já travada em F03 — PRD F06 Capabilities; critério de aceite 3, consumido por F11)
- Campo novo `handPlayUsed: boolean` em `PlayerState`, resetado para `false` no jogador que inicia
  cada novo turno, mais o guard `hasUsedHandPlay` e o marcador `markHandPlayUsed` — mecanismo
  pronto para F08/F09 consumirem, sem nenhum consumidor ainda (PRD F06 Capabilities — "1 jogada
  vinda da mão por turno"; critério de aceite 2, parcialmente coberto — ver Decisão 6)
- `advance_phase` recusa com `DomainError` quando `state.pending` está definido (janela de reação
  de F02 aberta) — guard `hasOpenReactionWindow` já exposto por F02 para F06–F12 consultarem

### Adiado

Não aplicável — o PRD não declara blocos `Core Scope`/`Full Scope additions` para F06; a feature
não tem divisão de escopo, então esta spec cobre a íntegra das Capabilities descritas.

### Fronteiras

- **Compra de cartas em si** (puxar do deck, completar a mão até 5, deck-out) → **F07**, que vai
  interceptar a transição `"draw"` → `"main"` que esta spec deixa como um salto automático sem
  efeito.
- **Invocar monstro, jogar magia/armadilha/terreno** → **F08/F09**, que vão adicionar suas próprias
  variantes a `Action` e chamar `markHandPlayUsed`/`hasUsedHandPlay` (mecanismo que esta spec só
  prepara).
- **Mudança de posição, declaração/resolução de ataque** → **F10/F11**, que vão adicionar variantes
  a `Action` e ler `hasAttacked`/`hasChangedPosition` (já existentes desde F01) e o predicado de
  primeiro turno que esta spec expõe.
- **Condição de fim de duelo** → **F12**. `advance_phase` não verifica se o duelo já terminou
  (nenhum campo de resultado existe em `DuelState` ainda); essa checagem é acrescentada por F12
  quando existir.
- **Quantas vezes um monstro pode atacar/mudar de posição por turno, e a tabela de combate** → F10
  e F11, que leem os campos `hasAttacked`/`hasChangedPosition` já definidos em F01, mas F06 não os
  usa nem os reseta a não ser no encerramento de turno.

### Contratos externos assumidos

Nenhum. F06 tem `Dependências: F01, F02, F03` na tabela do PRD §8 (todas já implementadas nesta
wave/wave anterior) — nenhuma dependência cross-PRD.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | `Action` é uma união discriminada em `packages/shared`, criada por esta feature (a primeira a existir). Contém hoje só `{ type: "advance_phase" }`; F07–F12 acrescentam variantes ao **mesmo arquivo**, nunca redefinindo o tipo — mesmo padrão que F01→F02→F03→F04→F05 já aplicaram a `DuelState`. | `docs/specs/motor-duelo-1x1/F02-.../spec.md` ("o dispatcher apply em si e a união Acao emergem de F06–F12, cada uma contribuindo sua própria variante"); `arquitetura.md` §3.1 | confirmada (entrevista) |
| 2 | `apply(state: DuelState, action: Action): ApplyResult` é o dispatcher central citado em `arquitetura.md` §3.1, implementado como um `switch` exaustivo sobre `action.type` (não um registry — o padrão de registry é reservado ao Effect System, `arquitetura.md` §3.4, que é um subsistema `cross-PRD` diferente). F07–F12 acrescentam `case`s ao mesmo `switch`. | `arquitetura.md` §3.1 vs §3.4 (registry só para efeitos) | confirmada (entrevista) |
| 3 | Uma única ação `advance_phase` cobre as quatro transições de fase e a transição de turno — o motor decide o destino a partir da fase atual; não há uma ação por transição (`goToMainPhase`, `endTurn`, etc.). | Entrevista (recomendação aceita) | confirmada |
| 4 | A fase `"draw"` nunca ganha lógica própria nesta feature: `advance_phase` chamado com `phase === "draw"` transita direto para `"main"`, sem emitir evento e sem puxar carta nenhuma. `initDuel` (F03, já implementado) continua entregando `phase: "draw"` no estado inicial sem alteração — o "pulo automático" acontece na primeira chamada de `advance_phase` daquele turno, não no próprio `initDuel`. Uniforme para o turno 1 e para todos os turnos seguintes. F07, quando existir, altera esta mesma transição para de fato comprar cartas antes de completar o salto para `"main"`. | Entrevista (recomendação aceita); preserva o contrato já implementado de F03 sem alterar seu comportamento testado | confirmada |
| 5 | "Primeiro turno do duelo" continua **sem flag própria** — é `turn === 1`, decisão já travada por `docs/specs/motor-duelo-1x1/F03-.../spec.md` Decisão 8. F06 só expõe o predicado (`isFirstDuelTurn(state)`) para F11 consumir; não adiciona campo novo para isso. | `docs/specs/motor-duelo-1x1/F03-.../spec.md` Decisão 8 | confirmada (precedente, não reaberta) |
| 6 | `handPlayUsed: boolean` é acrescentado a `PlayerState` **alterando o arquivo criado por F01** (`packages/shared/src/duel/types.ts` e `schema.ts`), no mesmo espírito do guard `hasOpenReactionWindow` que F02 deixou pronto sem nenhuma ação ainda o consultando. F06 garante: o campo existe, é resetado para `false` no jogador que inicia cada turno, e expõe `hasUsedHandPlay`/`markHandPlayUsed` puros. **Nenhuma ação desta feature chama `markHandPlayUsed`** — o critério de aceite do PRD "a 2ª jogada é recusada" só fecha end-to-end quando F08/F09 existirem e chamarem esse guard antes de aceitar sua própria ação; esta spec cobre o mecanismo isoladamente (Seção 7). | Entrevista (recomendação aceita); paralelo direto ao padrão já estabelecido por F02 com a janela de reação | confirmada |
| 7 | `advance_phase` consulta `hasOpenReactionWindow(state)` (já exposto por F02) e recusa com `DomainError` se uma janela estiver aberta — mesma disciplina que F02 definiu como guard obrigatório para "F06–F12 antes de aceitar uma nova ação de jogador". | `packages/engine/src/events/reaction-window.ts` (comentário "Guard that F06-F12 must consult"); entrevista (recomendação aceita) | confirmada |
| 8 | Identificadores de código em **inglês** (`DuelState`, `Phase`, `Action`, `apply`, `advancePhase`, `handPlayUsed`), mesmo com a prosa desta spec em português. F02/F05 (specs anteriores) descreveram contratos com nomes em português (`EstadoDuelo`, `serializar`) que **não correspondem** ao código de fato implementado (`DuelState`, `serialize`) — esta spec segue o código real (Camada 1), não a nomenclatura textual das specs anteriores. | Leitura de `packages/shared/src/duel/*.ts` e `packages/engine/src/**` (código implementado); `CLAUDE.md` ("Code, comments and identifiers are in English") | confirmada (correção de precedente) |
| 9 | Reset de `hasAttacked`/`hasChangedPosition` (F01) atinge as 5 zonas de monstro do jogador **cujo turno está terminando** (o `activePlayer` no momento da chamada, antes de trocar) — texto literal do critério de aceite 4 do PRD. Não afeta as zonas do oponente, que nunca tiveram flag setada por não terem agido. | PRD §9 F06, critério de aceite 4 (leitura literal) | confirmada |
| 10 | `onTurnEnd` é emitido para o jogador cujo turno terminou, **antes** do reset de flags e da troca de jogador ativo; `onTurnStart` é emitido **depois**, já com o novo `activePlayer`/`turn`. Ordem determinística, coerente com "emite `onTurnStart` ao abrir o turno e `onTurnEnd` ao fechá-lo" (PRD) e com F02 Decisão 5 (só uma janela de reação por vez — nenhum dos dois eventos abre janela, ver Decisão 12). | PRD §6 F06 Capabilities; `docs/specs/motor-duelo-1x1/F02-.../spec.md` | confirmada |
| 11 | Estrutura de arquivos segue o padrão de nomenclatura já usado por `combat/`, `events/`, `initialization/`, `serialization/` (substantivo em inglês, singular, kebab-case dentro): novo subsistema `packages/engine/src/turn/`. | Padrão observado em `packages/engine/src/*` (Camada 1) | confirmada |
| 12 | Nem `advance_phase` nem a transição de turno abrem janela de reação (`onAttackDeclared` é o único evento com janela até agora, e pertence a F11). `onTurnStart`/`onTurnEnd` são emitidos sem `pending` — o Effect System (cross-PRD) pode reagir a eles fora de uma janela suspensiva, se algum dia precisar; o PRD não pede pausa nesses dois eventos. | PRD §6 F02 Capabilities ("ao emitir um evento **com janela de reação**") — `onTurnStart`/`onTurnEnd` não estão na lista de eventos com janela citada no exemplo de F02 (só `onAttackDeclared`) | confirmada |
| 13 | `advance_phase` não verifica se o duelo já terminou — não há campo de resultado em `DuelState` até F12 existir. Quando F12 for especificada, ela acrescenta esse guard ao mesmo `switch` de `apply`. | Fronteiras desta spec; PRD §8 (F12 depende de F07, F11, F01 — não de F06) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duel/types.ts` | shared | alterado | Acrescenta `handPlayUsed: boolean` a `PlayerState` (Decisão 6) |
| `packages/shared/src/duel/schema.ts` | shared | alterado | Acrescenta `handPlayUsed: z.boolean()` a `PlayerStateSchema` |
| `packages/shared/src/duel/action.ts` | shared | novo | Declara a união `Action` com a variante `AdvancePhaseAction` (Decisão 1) |
| `packages/shared/src/duel/action.schema.ts` | shared | novo | `ActionSchema` (zod), espelhando `Action` — validação de fronteira para ações vindas de UI/IA/rede |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta `Action`, `ActionSchema` e os tipos/campos novos |
| `packages/engine/src/turn/advance-phase.ts` | engine | novo | Lógica pura de transição: decide o próximo `{ phase, turn, activePlayer }` a partir do estado atual e monta os eventos emitidos |
| `packages/engine/src/turn/hand-play.ts` | engine | novo | `hasUsedHandPlay(state, player)`, `markHandPlayUsed(state, player)` (Decisão 6) |
| `packages/engine/src/turn/first-turn.ts` | engine | novo | `isFirstDuelTurn(state)` — predicado `turn === 1` (Decisão 5) |
| `packages/engine/src/turn/apply.ts` | engine | novo | `apply(state, action): ApplyResult` — dispatcher central (Decisão 2), hoje só o `case "advance_phase"` |
| `packages/engine/src/turn/index.ts` | engine | novo | Export público do subsistema `turn` |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta `turn` (`apply`, `isFirstDuelTurn`, `hasUsedHandPlay`, `markHandPlayUsed`) ao lado dos subsistemas existentes |
| `packages/engine/README.md` | engine | alterado | Acrescenta o subsistema `turn` ao propósito e aos exports públicos |
| `packages/engine/src/turn/advance-phase.test.ts` | engine | novo | Unitários: as quatro transições de fase, transição de turno, reset de flags, ordem de eventos |
| `packages/engine/src/turn/advance-phase.properties.test.ts` | engine | novo | Propriedade: para qualquer estado válido e qualquer sequência de `advance_phase`, `turn` e `phase` avançam de forma monotônica e determinística |
| `packages/engine/src/turn/hand-play.test.ts` | engine | novo | Unitários: marcar, consultar, resetar `handPlayUsed` |
| `packages/engine/src/turn/first-turn.test.ts` | engine | novo | Unitários: `isFirstDuelTurn` verdadeiro só em `turn === 1` |
| `packages/engine/src/turn/apply.test.ts` | engine | novo | Unitários: dispatcher recusa com janela aberta; roteia `advance_phase` corretamente |

**Verificação da direção de dependências:** `packages/engine/src/turn/**` importa apenas de
`packages/shared` (`DuelState`, `Action`, `ApplyResult`, `DuelEvent`, `PlayerId`, `Result`,
`DomainError`) e de `packages/engine/src/events` (`createEvent`, `hasOpenReactionWindow`) — ambos
já internos ao próprio pacote `engine`. Nenhum import de `data`, `rules`, `ai`, `web`, `server`,
React, DOM, `fetch` ou Supabase — mesma garantia já verificada para `combat`, `events`,
`initialization`, `serialization`.

## 3. Design Técnico

### Estruturas de dados

**`PlayerState.handPlayUsed: boolean`** (`packages/shared`) — um por jogador, `false` por padrão a
cada turno que aquele jogador inicia. Não existe campo global único: cada lado tem o seu, coerente
com o resto de `PlayerState` (LP, mão, deck, campo já são per-player).

**`Action`** (`packages/shared`, novo arquivo):

```ts
export type AdvancePhaseAction = Readonly<{ type: "advance_phase" }>;
export type Action = AdvancePhaseAction; // F07-F12 estendem esta união
```

### Fluxo — `advance_phase`

1. `apply(state, { type: "advance_phase" })` primeiro consulta `hasOpenReactionWindow(state)`
   (Decisão 7). Se `true`, devolve erro sem tocar o estado.
2. Caso contrário, delega a `advancePhase(state)` (`packages/engine/src/turn/advance-phase.ts`),
   que decide a transição a partir de `state.phase`:
   - `"draw"` → `{ phase: "main" }`, sem evento (Decisão 4).
   - `"main"` → `{ phase: "battle" }`, sem evento.
   - `"battle"` → `{ phase: "end" }`, sem evento.
   - `"end"` → transição de turno completa (passo 3).
3. **Transição de turno** (só a partir de `"end"`):
   a. Emite `onTurnEnd` com `originPlayer = state.activePlayer` (o turno que está fechando).
   b. Reseta, nas 5 zonas de monstro do `activePlayer` atual, `hasAttacked = false` e
      `hasChangedPosition = false` (Decisão 9); zonas vazias não são tocadas.
   c. Reseta `handPlayUsed = false` para o **novo** `activePlayer` (o que vai começar a jogar).
   d. Troca `activePlayer` para o outro `PlayerId`; incrementa `turn` em 1; volta `phase` para
      `"draw"`.
   e. Emite `onTurnStart` com `originPlayer` = o novo `activePlayer` (Decisão 10).
4. `apply` devolve `{ state: <novo estado>, events: [...] }` — vazio nos três primeiros hops,
   `[onTurnEnd, onTurnStart]` na transição de turno.

### Regras de negócio

- **Sequência fixa de fases** (PRD F06 Capabilities; critério de aceite 1): `draw → main → battle →
  end → (turno seguinte) draw`, sempre nessa ordem, nunca pulando `main` ou `battle`.
- **Alternância de jogador ativo** só acontece na transição de turno (a partir de `"end"`), nunca
  no meio de um turno.
- **1 jogada da mão por turno** (PRD F06 Capabilities; critério de aceite 2): mecanismo
  (`handPlayUsed`, `hasUsedHandPlay`, `markHandPlayUsed`) entregue por esta feature; a recusa da 2ª
  jogada em si é responsabilidade de F08/F09 (Decisão 6, Fronteiras).
- **Ataque proibido no primeiro turno do duelo** (PRD F06 Capabilities; critério de aceite 3):
  `isFirstDuelTurn(state)` devolve `true` sse `state.turn === 1`; consumido por F11, não por esta
  feature.
- **Reset de flags de turno ao encerrar** (PRD F06 Capabilities; critério de aceite 4): ver Fluxo
  passo 3b.

### Eventos

- `onTurnEnd` e `onTurnStart` (ambos já no vocabulário fechado de F02/`EVENT_TYPES`) são os únicos
  eventos que esta feature emite — nas transições intermediárias de fase (draw→main, main→battle,
  battle→end) nenhum evento é emitido, porque não há tipo de evento de mudança de fase no
  vocabulário fechado (Decisão 12; `docs/arquitetura.md` §3.3 lista só os 10 tipos existentes).
- Nenhuma janela de reação é aberta por esta feature (Decisão 12).

### Determinismo e pureza

- `advancePhase` e `apply` são **puros e totais**: nenhuma leitura de relógio, nenhum
  `Math.random()`, nenhuma exceção — toda recusa é um `Result` de erro.
- A transição depende só de `state` e `action`; a mesma entrada sempre produz a mesma saída (pilar
  2 da Fase 0.3; critério de determinismo do PRD §4).
- Nenhum campo é removido ou tem seu tipo alterado em `DuelState`/`PlayerState` — só o campo novo
  `handPlayUsed` é acrescentado, seguindo a mesma disciplina aditiva de F02–F05.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duel/action.ts
export type AdvancePhaseAction = Readonly<{ type: "advance_phase" }>;
export type Action = AdvancePhaseAction;

// packages/shared/src/duel/action.schema.ts
export const AdvancePhaseActionSchema = z.strictObject({ type: z.literal("advance_phase") });
export const ActionSchema = AdvancePhaseActionSchema; // z.discriminatedUnion quando houver 2+ variantes

// packages/shared/src/duel/types.ts (PlayerState, alterado)
export type PlayerState = Readonly<{
  lp: number;
  hand: readonly Card[];
  deck: readonly Card[];
  field: PlayerField;
  handPlayUsed: boolean; // novo (F06)
}>;
```

**Reusados sem redefinir:** `DuelState`, `Phase`, `PlayerId`, `MonsterZone`, `DuelEvent`,
`ApplyResult`, `Result`, `DomainError` (F01–F05); `createEvent`, `hasOpenReactionWindow` (F02).

### Funções públicas

```
// packages/engine/src/turn — núcleo puro

apply(state: DuelState, action: Action): Result<ApplyResult, DomainError>
  // pré: nenhuma (action já validada por ActionSchema na fronteira externa, se vier de fora)
  // pós: ok ⇒ { state, events } com a transição aplicada
  //      erro ⇒ code 'reaction_window_open' se state.pending estiver definido
  // total: nunca lança

advancePhase(state: DuelState): ApplyResult
  // pré: hasOpenReactionWindow(state) === false (verificado por apply antes de chamar)
  // pós: par { state, events } com a fase/turno seguinte (Fluxo, passos 2-3)
  // total: nunca lança; não é exportado publicamente (uso interno de apply)

isFirstDuelTurn(state: DuelState): boolean
  // pós: true sse state.turn === 1

hasUsedHandPlay(state: DuelState, player: PlayerId): boolean
  // pós: state.players[player].handPlayUsed

markHandPlayUsed(state: DuelState, player: PlayerId): DuelState
  // pós: cópia de state com players[player].handPlayUsed = true
  // pré: nenhuma; idempotente (marcar de novo não muda nada)
```

**Nota de tipo de retorno:** `apply` devolve `Result<ApplyResult, DomainError>` (não `ApplyResult`
puro), porque a única forma desta feature de recusar uma ação (janela de reação aberta) precisa de
um canal de erro explícito — consistente com "falhas viajam como valores"
(`TypeScript-development-guidelines.md`). Isso já antecipa a forma que F07–F12 vão usar para suas
próprias recusas (zona ocupada, jogada já usada, etc.), evitando uma mudança de assinatura de
`apply` no meio da wave 4.

### Endpoints / RPC / mensagens de rede

Não aplicável nesta feature — mesma justificativa de F01–F05. `Action`/`apply` são o contrato que o
Online Duel (cross-PRD, Fase 5) vai transportar por WebSocket, mas o transporte em si não existe
ainda.

### Contratos externos (cross-PRD)

Nenhum novo. `Action`/`apply` são consumidos internamente pelas próprias features F07–F12 desta
wave e da wave 5, não por um PRD externo ainda existente.

### Exemplo — avanço de fase dentro do turno

```json
{
  "estadoAntes": { "turn": 3, "phase": "main", "activePlayer": "P1" },
  "acao": { "type": "advance_phase" },
  "resultado": {
    "state": { "turn": 3, "phase": "battle", "activePlayer": "P1" },
    "events": []
  }
}
```

### Exemplo — transição de turno (a partir de "end")

```json
{
  "estadoAntes": { "turn": 3, "phase": "end", "activePlayer": "P1" },
  "acao": { "type": "advance_phase" },
  "resultado": {
    "state": { "turn": 4, "phase": "draw", "activePlayer": "P2" },
    "events": [
      { "type": "onTurnEnd", "originPlayer": "P1", "involvedCards": [], "involvedZones": [], "context": {} },
      { "type": "onTurnStart", "originPlayer": "P2", "involvedCards": [], "involvedZones": [], "context": {} }
    ]
  }
}
```

### Exemplo — recusa por janela de reação aberta

```json
{
  "ok": false,
  "error": {
    "code": "reaction_window_open",
    "message": "Não é possível avançar de fase com uma janela de reação aberta.",
    "details": { "pendingEventType": "onAttackDeclared" }
  }
}
```

## 5. Modelo de Dados

Não aplicável. F06 não cria tabela Postgres nem estrutura IndexedDB — opera inteiramente sobre
`DuelState` em memória, igual F01–F05.

## 6. Tratamento de Erros e Casos de Borda

F06 não tem bloco `Error Handling` próprio no PRD (a Seção 6 do PRD lista erros nas features de
ação — F07 a F12); os casos abaixo cobrem o que esta feature especificamente pode recusar ou
precisa decidir.

| Cenário | Detecção | Comportamento | Código |
|---|---|---|---|
| `advance_phase` chamado com `state.pending` definido | `hasOpenReactionWindow(state)` | `Result` de erro, estado inalterado | `reaction_window_open` |
| `advance_phase` chamado em qualquer uma das 4 fases sem janela pendente | `state.phase` | Sempre aceito — não há pré-condição de "todas as ações da fase concluídas" no PRD (ex.: pode avançar de `battle` para `end` sem ter atacado) | — |
| Transição de turno com o próximo `activePlayer` já tendo `handPlayUsed: true` de um turno anterior não resetado | Não ocorre por construção — passo 3c reseta sempre antes da troca | — | — |
| Duelo já teria terminado (LP zerado, deck-out) | Fora de escopo — `DuelState` não tem campo de resultado até F12 existir (Decisão 13/Fronteiras) | `advance_phase` continua aceito; F12 acrescenta o guard quando existir | — |
| `Action` recebida de fora (rede/UI) não corresponde a nenhuma variante conhecida | `ActionSchema.safeParse` na fronteira (fora do `engine`, que já recebe `Action` tipado) | Rejeição de schema antes de chegar a `apply` — mesmo padrão de `DuelStateSchema` em F05 | erro de validação zod padrão |

## 7. Estratégia de Testes

### Unitários (Vitest)

`advancePhase`/`apply` (`turn/advance-phase.test.ts`, `turn/apply.test.ts`):
- `advance_phase de draw vai para main sem emitir evento`
- `advance_phase de main vai para battle sem emitir evento`
- `advance_phase de battle vai para end sem emitir evento`
- `advance_phase de end troca o jogador ativo, incrementa o turno e volta a fase para draw`
- `advance_phase de end emite onTurnEnd com originPlayer igual ao jogador que estava ativo`
- `advance_phase de end emite onTurnStart com originPlayer igual ao novo jogador ativo`
- `advance_phase de end reseta hasAttacked e hasChangedPosition de todas as zonas ocupadas do jogador cujo turno terminou`
- `advance_phase de end não altera as flags de turno das zonas do oponente`
- `advance_phase de end reseta handPlayUsed do novo jogador ativo para false`
- `apply recusa advance_phase quando state.pending está definido, devolvendo code reaction_window_open`
- `apply não altera o estado quando recusa por janela de reação aberta`

`hand-play` (`turn/hand-play.test.ts`):
- `hasUsedHandPlay devolve false para um jogador que ainda não jogou da mão neste turno`
- `markHandPlayUsed marca o jogador informado como tendo jogado da mão`
- `markHandPlayUsed não altera a flag do outro jogador`
- `markHandPlayUsed é idempotente — chamar duas vezes não muda o resultado`

`first-turn` (`turn/first-turn.test.ts`):
- `isFirstDuelTurn devolve true quando turn é 1`
- `isFirstDuelTurn devolve false quando turn é maior que 1`

### Property-based (fast-check)

- **Monotonicidade e determinismo do avanço de fase:** para qualquer `DuelState` válido sem
  `pending` e qualquer sequência de N chamadas de `advance_phase`, a sequência de fases observada é
  sempre um sufixo cíclico de `draw, main, battle, end` e `turn` nunca decresce; repetir a mesma
  sequência a partir do mesmo estado inicial produz sempre o mesmo estado final (pilar de
  determinismo, PRD §4). 1.000 execuções.
- **Preservação de campos não tocados:** para qualquer estado e qualquer transição de fase que não
  seja a de fim de turno (`draw→main`, `main→battle`, `battle→end`), `lp`, `hand`, `deck`,
  `activeField` e `seed` de ambos os jogadores permanecem estruturalmente idênticos.

### Integração

Não aplicável ainda — uma partida completa ponta-a-ponta (critério de Cross-Feature Integration do
PRD) só é exercível quando F07–F12 existirem. Esta feature testa a máquina de turno isoladamente.

### Análise estática

- `packages/engine/src/turn/**` importa apenas `packages/shared` e `packages/engine/src/events` —
  nunca `data`, `rules`, `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.
- O `switch` de `apply` sobre `action.type` é exaustivo (`never` no `default`), garantindo que
  adicionar uma nova variante a `Action` sem tratá-la no `switch` quebra o build — trava de
  segurança para F07–F12.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F06) | Teste |
|---|---|
| As fases seguem Compra → Principal → Batalha → Fim, alternando o jogador ativo ao encerrar | Os quatro testes `advance_phase de <fase> vai para <próxima fase>` + `advance_phase de end troca o jogador ativo...` |
| Apenas 1 jogada vinda da mão é aceita por turno; a 2ª é recusada | Mecanismo (`hasUsedHandPlay`/`markHandPlayUsed`) coberto pelos testes de `hand-play.test.ts`; a recusa end-to-end da 2ª jogada fecha só quando F08/F09 existirem (Decisão 6) |
| No 1º turno do duelo, a declaração de ataque é bloqueada; nos demais, um monstro pode atacar no mesmo turno em que foi invocado | `isFirstDuelTurn` coberto por `first-turn.test.ts`; o bloqueio de ataque em si é F11, que consome este predicado |
| Ao encerrar o turno, as flags "já atacou" e "já mudou de posição" dos monstros do jogador ativo são resetadas | `advance_phase de end reseta hasAttacked e hasChangedPosition...` + `...não altera as flags...do oponente` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Todos os eventos emitidos pelas ações (F06–F11) passam por F02 e abrem janela de reação quando aplicável" | `onTurnEnd`/`onTurnStart` usam `createEvent` (F02) e deliberadamente **não** abrem janela (Decisão 12, documentada); a asserção de "quando aplicável" é satisfeita por essa mesma decisão — nenhum dos dois exige janela |
| Cross-Feature: "Uma partida completa roda de ponta a ponta: F03 inicializa → F06 conduz turnos → ..." | Não testável nesta feature isoladamente; o estado que `initDuel` (F03) produz (`turn: 1, phase: "draw"`) é a entrada válida que os testes de `advance_phase` usam como ponto de partida, fechando a costura com F03 |
| Cross-Feature: "O mesmo estado inicial + mesma sequência de ações + mesmo seed produz o mesmo resultado final em execuções repetidas" | Propriedade `Monotonicidade e determinismo do avanço de fase` desta feature é o primeiro mecanismo de `apply`/`Action` a exercer esse critério |
