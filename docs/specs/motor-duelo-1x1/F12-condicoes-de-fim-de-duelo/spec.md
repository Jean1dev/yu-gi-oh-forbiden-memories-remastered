# Condições de Fim de Duelo

> PRD: `docs/prds/motor-duelo-1x1.md` — F12
> Pacote-alvo: `packages/engine` (+ `packages/shared`, `apps/web`)

## 1. Contexto e Escopo

F12 é a última feature do módulo (wave 5) e a única que fecha o ciclo: até aqui o motor sabe
executar todas as transições de um duelo — inicializar (F03), conduzir turnos (F06), comprar (F07),
invocar (F08), jogar magia/armadilha/terreno (F09), mudar posição (F10) e resolver combate (F11) —
mas **nada declara vencedor**. Hoje `resolve-attack.ts` já aplica dano com piso em 0
(F11 Decisão 11) e `draw-phase.ts` já marca `deckOutPlayer` (F07), e ambos os sinais morrem no
estado sem consumidor: `getDeckOutPlayer`/`hasDeckedOut` só são chamados por testes. F12 é quem
consome esses dois sinais, acrescenta o terceiro (rendição), consolida o resultado e **congela o
estado**.

A feature também **completa dois contratos que foram forward-declared** justamente à espera dela.
`packages/shared/src/duel/orchestration.ts` declara `DuelAction = unknown` com o comentário
"Opaque until the engine action vocabulary is delivered by motor-duelo-1x1/F06-F12" — F12 é o
último item dessa lista, então o vocabulário fecha aqui. E `packages/shared/src/duel/result.ts`
declara `DuelOutcome` desde a wave do `free-duel`, consumido por
`apps/web/src/lib/free-duel/consolidate-duel-result.ts`, sem nenhum produtor no motor. F12 é o
produtor.

### Incluído

- Campo `outcome` em `DuelState` — ausente durante o duelo, presente e imutável depois do fim
  (PRD F12 Provides; "o motor congela o estado ... e o expõe para serialização (F05)")
- `checkDuelEnd(state)` — função pura que deriva o `DuelOutcome` das condições observáveis no
  estado: LP zerado dos dois lados (`draw`), LP zerado de um lado (`lp_depleted`), deck-out
  (`deck_out`) (PRD F12 Capabilities)
- `SurrenderAction` — nova variante da união `Action`, aceita **a qualquer momento** por qualquer
  um dos dois jogadores, inclusive com janela de reação aberta (PRD F12 Experience: "A rendição
  pode ser acionada a qualquer momento pelo jogador")
- Congelamento: depois de `outcome` carimbado, **toda** ação é recusada com `duel_already_ended`
  (PRD F12 Error Handling: "O duelo já terminou.")
- Renomeação dos códigos de motivo de `DuelOutcome` para inglês —
  `lp_zerado → lp_depleted`, `rendicao → surrender`, `empate → draw`, `deck_out` inalterado — e a
  propagação disso pelos consumidores já existentes no `free-duel`
- Reconciliação do `apps/web`: `finishOrContinue` passa a encerrar a sessão por `state.outcome`
  em vez de `state.phase === "end"`, e `surrender.ts` passa a emitir o campo `player`

### Fronteiras

- **Timeout e abandono por desconexão** → PRD Online Duel (cross-PRD). O PRD F12 exclui
  explicitamente: "Timeout/abandono por desconexão não são tratados aqui".
- **Tela de fim de partida, Rating Engine, recompensa por vitória** → `free-duel` F05–F07
  (cross-PRD, já implementados contra `DuelOutcome`). F12 produz o `DuelOutcome`; quem o
  transforma em `ConsolidatedDuelResult` continua sendo
  `apps/web/src/lib/free-duel/consolidate-duel-result.ts`.
- **Fiação do motor real na UI** (`apps/web` não depende de `@yugioh/engine`; `startMatch` e
  `applyAction` caem em stubs que falham) → integração do `free-duel`, fora desta spec. Ver
  Decisão 12 e a pendência registrada ali.
- **Empate por dano mútuo** só se torna alcançável quando o Effect System (cross-PRD) existir — a
  tabela de combate de F11 nunca causa dano aos dois lados no mesmo `resolve_attack`
  (`ResolveCombatTableResult.damage`: "Exactly one side is ever non-zero"). F12 implementa e
  testa o caminho mesmo assim, porque o PRD o exige (Decisão 8).

### Contratos externos assumidos

Nenhum cross-PRD novo. As dependências de F12 na tabela do PRD §8 são `F07, F11, F01` — todas
internas e já implementadas.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **Checagem centralizada em `apply`, não distribuída pelas ações.** `apply` ganha duas responsabilidades novas em volta do `switch` existente: (a) um *pré-guard* que recusa qualquer ação quando `state.outcome` já está definido, e (b) um *pós-passo* que passa o estado resultante por `checkDuelEnd` e carimba o `outcome`. `resolveAttack`, `drawUpToHandSize` e as demais transições **não mudam**. Alternativa descartada: cada ação detectar seu próprio fim (LP em `resolveAttack`, deck-out em `drawUpToHandSize`), o que espalharia a regra por 3+ arquivos e faria toda ação futura precisar lembrar de checar. | Entrevista (escolha do usuário) | confirmada |
| 2 | **O pré-guard é a primeira instrução de `apply`, antes do desvio de `resolve_attack`.** `apply` hoje trata `resolve_attack` acima do guard genérico de janela de reação (F11 Decisão 3), retornando cedo. Se o guard de `outcome` ficasse depois, um `resolve_attack` pendente ainda seria aceito num duelo já encerrado. Pelo mesmo motivo, o pós-passo de carimbo envolve **também** o retorno antecipado de `resolve_attack`. | Leitura de `packages/engine/src/turn/apply.ts` (código real, F11) | confirmada |
| 3 | **`stampOutcome` é idempotente e não sobrescreve.** Se o estado devolvido pela ação já traz `outcome` definido, o pós-passo o preserva. É o que permite conciliar a Decisão 1 com a rendição: `checkDuelEnd` deriva fim *observável* (LP, deck), mas rendição é uma **declaração**, não uma derivação — não há nada no estado de onde inferi-la. O handler de `surrender` carimba seu próprio `outcome`, e o pós-passo central o respeita, mantendo um único ponto de congelamento. Alternativa descartada: gravar um campo `surrenderedBy` no estado só para `checkDuelEnd` derivar dele — acrescentaria estado redundante que sobreviveria no snapshot sem uso. | Design — reconciliação entre Decisão 1 e a natureza declarativa da rendição | confirmada |
| 4 | **Nenhum evento novo é emitido.** `EVENT_TYPES` (`packages/shared/src/duel/constants.ts`) é um **vocabulário fechado de 10 tipos** — PRD F02 Capabilities e `arquitetura.md` §3.3 — e nenhum deles significa "duelo terminou". O `Provides` de F12 no PRD é "Resultado do duelo: vencedor, perdedor e motivo", um **dado**, não um gatilho; nenhum efeito de carta do FM reage ao fim do duelo. O fim é observável por `state.outcome`, que já viaja no snapshot (F05). Acrescentar `onDuelEnd` violaria o vocabulário fechado que F02 estabeleceu e que F06–F11 respeitaram sem exceção. | `packages/shared/src/duel/constants.ts` (código real, F02); PRD F02 Capabilities; `arquitetura.md` §3.3 | confirmada |
| 5 | **Códigos de motivo renomeados para inglês:** `lp_zerado → lp_depleted`, `rendicao → surrender`, `empate → draw`; `deck_out` já estava em inglês e fica. Alinha com a regra do `CLAUDE.md` ("code, comments and identifiers are in English") antes que o contrato ganhe mais consumidores. Custo aceito: o rename atravessa `packages/shared` e ~12 arquivos do `free-duel` em `apps/web` (Seção 2). As **mensagens** ao jogador continuam em português — só os códigos mudam. | Entrevista (escolha do usuário) | confirmada |
| 6 | **`{ status: "draw", reason: "draw" }` é redundante mas mantido.** Depois do rename, o outcome de empate repete a palavra em dois campos. Descartado inventar um motivo diferente (`mutual_destruction`) só para evitar a repetição: o `status` é a forma da união discriminada e o `reason` é o vocabulário compartilhado com `DuelEndReason` — são eixos diferentes que coincidem neste único caso. | Design — consequência direta da Decisão 5 | confirmada |
| 7 | **Precedência entre condições, quando mais de uma vale no mesmo estado:** (a) LP de **ambos** em 0 → `draw`; (b) LP de **um** em 0 → `lp_depleted`, vencedor é o outro; (c) `deckOutPlayer` definido → `deck_out`, vencedor é o oponente do que ficou sem deck. LP vem antes de deck-out porque o PRD chama LP de "condição principal de vitória" (F12 User Stories). Na prática a coincidência é inalcançável — com o congelamento da Decisão 1, o duelo termina na transição em que a primeira condição aparece — mas a ordem precisa ser total para `checkDuelEnd` ser uma função determinística de qualquer estado, inclusive de um snapshot construído à mão (F05). | PRD F12 User Stories ("condição principal de vitória"); Auto-Aceite — o PRD não define a precedência | confirmada |
| 8 | **Empate implementado embora hoje inalcançável.** A tabela de F11 nunca produz dano simultâneo (`ResolveCombatTableResult.damage` documenta "Exactly one side is ever non-zero"), e nenhuma outra ação causa dano. O PRD F12 exige o caso mesmo assim ("Se ambos os jogadores chegam a 0 de LP simultaneamente (via dano mútuo/efeito), o resultado é empate"), pensando no Effect System (cross-PRD). `checkDuelEnd` é testado por estados montados diretamente, sem depender de uma ação que os produza. | PRD F12 Capabilities; Fase 0.5 (dependência cross-PRD inexistente) | confirmada |
| 9 | **`SurrenderAction` usa `player`, não `playerId`.** A união `Action` já tem precedente: `SummonMonsterAction` carrega `player`, e `apply` compara `state.activePlayer !== action.player`. `apps/web/src/lib/free-duel/surrender.ts` hoje emite `{ type: "surrender", playerId }` — escrito contra `DuelAction = unknown`, portanto nunca verificado por tipo. O motor é a fonte da verdade do vocabulário; o `apps/web` migra para `player` (Seção 2). | `packages/shared/src/duel/summon-monster-action.ts` e `packages/engine/src/turn/apply.ts` (código real); entrevista (escopo inclui o `apps/web`) | confirmada |
| 10 | **Rendição ignora o guard de janela de reação**, como `resolve_attack` (F11 Decisão 3) e ao contrário de todas as demais ações. Motivo literal do PRD: "A rendição pode ser acionada a qualquer momento pelo jogador". Um jogador preso numa janela de reação aberta que ninguém vai resolver precisa poder sair do duelo. Rendição também **não** exige ser o jogador ativo — o PRD Consumes diz "Ação de rendição do jogador ativo/inativo". | PRD F12 Experience e Consumes (citações literais) | confirmada |
| 11 | **"Rendição inválida" é aplicada pelo schema, não por um `if`.** O PRD prevê "Rendição de jogador não participante → recusa". Com `PlayerId = "P1" \| "P2"` (união fechada de F01), um não-participante é irrepresentável em TypeScript; o caso só pode chegar por uma fronteira não tipada (payload de rede do Online Duel, cross-PRD), e ali quem recusa é `ActionSchema`/`SurrenderActionSchema` via `PlayerIdSchema`. Não há checagem redundante em runtime dentro de `surrender`. | PRD F12 Error Handling; `packages/shared/src/duel/schema.ts` (`PlayerIdSchema`, código real de F01) | confirmada |
| 12 | **`DuelAction` deixa de ser `unknown` e passa a ser `Action`.** O próprio comentário em `orchestration.ts` condiciona isso a F06–F12, e F12 fecha a lista. É essa narrowing que transforma a divergência `playerId`/`player` da Decisão 9 em erro de compilação em vez de deriva silenciosa. **Pendência registrada, fora do escopo:** `ApplyAction` em `apps/web/src/lib/free-duel/duel-session.ts` continua tipada como `(state, action) => ApplyResult`, enquanto o `apply` real devolve `Result<ApplyResult, DomainError>`. Reconciliar isso é fiar o motor na UI — trabalho do `free-duel`, não de F12. | `packages/shared/src/duel/orchestration.ts` (comentário literal no código) | confirmada (pendência documentada) |
| 13 | **`finishOrContinue` (`apps/web`) passa a testar `state.outcome !== undefined`.** Hoje testa `state.phase === "end"`, mas `"end"` é a última fase de **todo** turno (`advance-phase.ts`: draw→main→battle→end→draw), então a sessão encerraria no fim do turno 1 assim que o motor real fosse fiado. É um defeito pré-existente que só não se manifesta porque `applyAction` é um stub que lança. F12 é a primeira feature que oferece o sinal correto. | Leitura de `apps/web/src/lib/free-duel/duel-session.ts` e `packages/engine/src/turn/advance-phase.ts` (código real); entrevista (escopo inclui o `apps/web`) | confirmada |
| 14 | **Os schemas de outcome migram para `schema.ts`.** `DecisiveDuelEndReasonSchema`, `DuelEndReasonSchema` e `DuelOutcomeSchema` vivem hoje em `result-schema.ts`, que importa `PlayerIdSchema` de `schema.ts`. Como `DuelStateSchema` (em `schema.ts`) precisa validar o novo campo `outcome`, importá-los de volta criaria um ciclo de import entre os dois arquivos — armadilha conhecida deste pacote. Solução: os três descem para `schema.ts`, ao lado de `PlayerIdSchema` e `DuelStateSchema`, e `result-schema.ts` os **reexporta**, preservando o caminho de import de `packages/shared/src/index.ts` e de todo o `free-duel`. | `packages/shared/src/duel/result-schema.ts` e `schema.ts` (grafo de import real); armadilha zod/tsconfig já registrada neste pacote | confirmada |
| 15 | **`DuelStateSchema` é `z.strictObject`**, então acrescentar `outcome` ao tipo **obriga** a acrescentá-lo ao schema: sem isso, `load()` (F05) rejeitaria o snapshot de qualquer duelo encerrado. O campo entra como `DuelOutcomeSchema.optional()`, mesmo padrão de `pending` e `deckOutPlayer`. | `packages/shared/src/duel/schema.ts` (código real); F05 (round-trip) | confirmada |
| 16 | `checkDuelEnd` é uma função **separada** do carimbo (`stampOutcome`), recebendo e devolvendo dados simples (`DuelState → DuelOutcome \| undefined`), para ser testada exaustivamente sem `apply` — mesmo padrão que F11 aplicou ao separar `resolveCombatTable` de `resolveAttack` (F11 Decisão 10). | Padrão observado em `packages/engine/src/combat/resolve-combat-table.ts` (F11) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/duel/result.ts` | shared | alterado | Renomeia os motivos (Decisão 5); nenhum tipo novo |
| `packages/shared/src/duel/schema.ts` | shared | alterado | Recebe `DecisiveDuelEndReasonSchema`/`DuelEndReasonSchema`/`DuelOutcomeSchema` (Decisão 14) e acrescenta `outcome` a `DuelStateSchema` (Decisão 15) |
| `packages/shared/src/duel/result-schema.ts` | shared | alterado | Passa a reexportar os três schemas de outcome de `schema.ts`; mantém os schemas de rating/resultado consolidado |
| `packages/shared/src/duel/types.ts` | shared | alterado | Acrescenta `outcome?: DuelOutcome \| undefined` a `DuelState` |
| `packages/shared/src/duel/action.ts` | shared | alterado | Acrescenta `SurrenderAction` à união `Action` |
| `packages/shared/src/duel/action.schema.ts` | shared | alterado | Acrescenta `SurrenderActionSchema` à união `ActionSchema` |
| `packages/shared/src/duel/orchestration.ts` | shared | alterado | `DuelAction = unknown` → `DuelAction = Action` (Decisão 12) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta `SurrenderAction`/`SurrenderActionSchema` |
| `packages/engine/src/end/check-duel-end.ts` | engine | novo | `checkDuelEnd(state)` — deriva o outcome de LP/deck-out (Decisão 16) |
| `packages/engine/src/end/surrender.ts` | engine | novo | `surrender(state, action)` — carimba o outcome declarativo de rendição |
| `packages/engine/src/end/stamp-outcome.ts` | engine | novo | `stampOutcome(result)` — pós-passo idempotente de `apply` (Decisão 3) |
| `packages/engine/src/end/index.ts` | engine | novo | Barril do subsistema `end` |
| `packages/engine/src/turn/apply.ts` | engine | alterado | Pré-guard de `duel_already_ended`, `case "surrender"`, pós-passo de carimbo (Decisões 1, 2) |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta `checkDuelEnd`, `surrender`, `isDuelOver` |
| `packages/engine/README.md` | engine | alterado | Documenta o subsistema `end` |
| `apps/web/src/lib/free-duel/duel-session.ts` | web | alterado | `finishOrContinue` encerra por `state.outcome` (Decisão 13) |
| `apps/web/src/lib/free-duel/surrender.ts` | web | alterado | Emite `player` em vez de `playerId` (Decisão 9) |
| `apps/web/src/lib/free-duel/consolidate-duel-result.ts` | web | alterado | `"empate"` → `"draw"` (Decisão 5) |
| `apps/web/src/lib/free-duel/duel-result-messages.ts` | web | alterado | Compara `"surrender"`/`"deck_out"`; mensagens seguem em português |
| `packages/engine/src/end/check-duel-end.test.ts` | engine | novo | Unitários: as três condições, precedência, estado em andamento |
| `packages/engine/src/end/surrender.test.ts` | engine | novo | Unitários: rendição de cada lado, com janela aberta, fora do turno |
| `packages/engine/src/end/duel-frozen.properties.test.ts` | engine | novo | Propriedade: estado com `outcome` é imutável sob qualquer ação |
| `packages/engine/src/turn/apply.test.ts` | engine | alterado | Roteamento de `surrender`, `duel_already_ended` por ação, carimbo pós-ação |
| `packages/engine/src/serialization/round-trip.properties.test.ts` | engine | alterado | Round-trip preserva `outcome` (F05 × F12) |
| `apps/web/src/**` (≈10 arquivos de teste) e `apps/web/tests/**` | web | alterado | Fixtures migram para os motivos em inglês |

**Verificação da direção de dependências:** `packages/engine/src/end/**` importa apenas de
`packages/shared` (`DuelState`, `DuelOutcome`, `Action`, `PlayerId`, `ApplyResult`, `Result`,
`DomainError`) e de subsistemas internos do próprio `engine` (`spells`: `getOpponent`). **Nenhum
import de `packages/rules`, `data`, `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase** —
mesma garantia dos demais subsistemas (pilar 1, `arquitetura.md` §1). As alterações em `apps/web`
são na direção permitida (`web` → `shared`) e **não** acrescentam dependência de `@yugioh/engine`.

## 3. Design Técnico

### Estruturas de dados

**`DuelState.outcome`** — o único campo novo do estado em toda a feature:

```ts
export type DuelState = Readonly<{
  // ... players, activeField, activePlayer, turn, phase, pending, seed, deckOutPlayer
  /** Absent = duel in progress; present = duel over and state frozen (F12). */
  outcome?: DuelOutcome | undefined;
}>;
```

**`SurrenderAction`** (`packages/shared`):

```ts
export type SurrenderAction = Readonly<{ type: "surrender"; player: PlayerId }>;
```

**`DuelOutcome`** — reusado de `packages/shared/src/duel/result.ts` com os motivos renomeados
(Decisão 5); a forma da união discriminada não muda:

```ts
export type DecisiveDuelEndReason = "lp_depleted" | "deck_out" | "surrender";
export type DuelEndReason = DecisiveDuelEndReason | "draw";
```

### Fluxo — `apply` com fim de duelo (Decisões 1, 2, 3)

1. **Pré-guard.** Se `state.outcome !== undefined`, recusa imediatamente com `duel_already_ended`,
   qualquer que seja `action.type` — inclusive `resolve_attack` e `surrender`. É a primeira
   instrução da função, antes do desvio antecipado de `resolve_attack` (Decisão 2).
2. **Desvio de `resolve_attack`** — inalterado (F11 Decisão 3), mas seu retorno passa pelo passo 5.
3. **Desvio de `surrender`** — a segunda ação que ignora o guard de janela de reação (Decisão 10);
   não exige ser o jogador ativo.
4. **Guard de janela de reação e `switch`** — inalterados.
5. **Pós-passo (`stampOutcome`).** Todo retorno bem-sucedido de qualquer ramo acima passa por
   `stampOutcome`: se `result.state.outcome` já está definido, devolve como veio (caso da
   rendição); senão chama `checkDuelEnd(result.state)` e, havendo outcome, devolve o estado com o
   campo carimbado. Retornos de erro não são tocados.

### Fluxo — `checkDuelEnd(state)` (Decisão 7)

1. `state.players.P1.lp === 0 && state.players.P2.lp === 0` →
   `{ status: "draw", winner: null, loser: null, reason: "draw" }`.
2. `state.players[p].lp === 0` para exatamente um `p` →
   `{ status: "decisive", winner: getOpponent(p), loser: p, reason: "lp_depleted" }`.
3. `state.deckOutPlayer !== undefined` →
   `{ status: "decisive", winner: getOpponent(deckOutPlayer), loser: deckOutPlayer,
   reason: "deck_out" }`.
4. Nenhuma das condições → `undefined` (duelo em andamento).

### Fluxo — `surrender(state, action)`

1. Pré-condições já garantidas por `apply`: duelo não encerrado (passo 1 acima) e `action.player`
   é um `PlayerId` válido (Decisão 11).
2. Devolve o estado com
   `outcome = { status: "decisive", winner: getOpponent(action.player), loser: action.player,
   reason: "surrender" }` e `events: []` (Decisão 4).
3. Nenhuma outra parte do estado é tocada: campo, mão, LP, fase e turno ficam exatamente como
   estavam no instante da rendição — o estado congelado precisa ser um retrato fiel para o
   snapshot (F05) e para a tela de resultado do `free-duel`.

### Regras de negócio

- **8000 LP iniciais**, piso em 0 (F11 Decisão 11) — "LP chega a 0" é `=== 0`, nunca `<= 0`.
- **Deck-out**: perde quem **não conseguiu completar** a compra (`deckOutPlayer`, F07), não quem
  tem menos cartas.
- **Rendição**: perde quem se rende, sempre; não existe rendição do oponente.
- **Empate**: só quando os dois LP são 0 no mesmo estado observado (Decisão 8).
- **Congelamento**: uma vez definido, `outcome` nunca é sobrescrito nem removido por nenhuma ação
  — a única forma de um estado voltar a ser jogável é iniciar outro duelo (`initDuel`, F03).

### Eventos

Nenhum evento novo, nenhuma janela de reação aberta ou fechada por esta feature (Decisão 4).
`surrender` devolve `events: []`; o carimbo do pós-passo não acrescenta eventos aos que a ação
original já emitiu. Um `resolve_attack` letal, por exemplo, continua emitindo exatamente
`onDamage`/`onDestroy` — só que o estado devolvido já vem com `outcome`.

### Determinismo e pureza

- `checkDuelEnd` é **pura, total e sem estado**: lê três campos de `DuelState` e devolve um valor;
  sem relógio, sem `Math.random()`, sem I/O.
- `surrender` e `stampOutcome` são puras e totais; nenhuma consome o PRNG semeado.
- `outcome` é 100% JSON-serializável (strings e `null`), preservando o round-trip idempotente de
  F05 — com a alteração obrigatória de `DuelStateSchema` (Decisão 15).
- `atk`/`def` base nunca são tocados; F12 não lê carta nenhuma.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duel/result.ts — renomeações (Decisão 5)
export type DecisiveDuelEndReason = "lp_depleted" | "deck_out" | "surrender";
export type DuelEndReason = DecisiveDuelEndReason | "draw";
// DuelOutcome, ConsolidatedDuelResult: forma inalterada, motivos renomeados

// packages/shared/src/duel/schema.ts — schemas migrados (Decisão 14) + campo novo (Decisão 15)
export const DecisiveDuelEndReasonSchema = z.enum(["lp_depleted", "deck_out", "surrender"]);
export const DuelEndReasonSchema = z.enum(["lp_depleted", "deck_out", "surrender", "draw"]);
export const DuelOutcomeSchema = z.union([DecisiveDuelOutcomeSchema, DrawDuelOutcomeSchema]);

export const DuelStateSchema = z.strictObject({
  // ... campos existentes
  outcome: DuelOutcomeSchema.optional(),
});

// packages/shared/src/duel/action.ts
export type SurrenderAction = Readonly<{ type: "surrender"; player: PlayerId }>;
export type Action = /* ...as sete variantes existentes... */ | SurrenderAction;

// packages/shared/src/duel/action.schema.ts
export const SurrenderActionSchema = z.strictObject({
  type: z.literal("surrender"),
  player: PlayerIdSchema,
});

// packages/shared/src/duel/orchestration.ts (Decisão 12)
export type DuelAction = Action;
```

**Reusados sem redefinir:** `DuelOutcome`, `DecisiveDuelEndReason`, `ConsolidatedDuelResult`
(`free-duel`); `DuelState`, `PlayerId`, `ApplyResult`, `Result`, `DomainError` (F01);
`getOpponent` (F09); `getDeckOutPlayer` (F07 — primeiro consumidor real).

### Funções públicas

```
// packages/engine/src/end

checkDuelEnd(state: DuelState): DuelOutcome | undefined
  // pós: outcome derivado de LP/deck-out na precedência da Decisão 7; undefined se em andamento
  // total, puro, sem estado; não considera rendição (Decisão 3)

surrender(state: DuelState, action: SurrenderAction): Result<ApplyResult, DomainError>
  // pré: apply já confirmou que o duelo não terminou
  // pós: outcome decisivo com reason "surrender"; nenhum outro campo do estado alterado
  // total: nunca lança

stampOutcome(result: ApplyResult): ApplyResult
  // pós: preserva um outcome já presente; senão aplica checkDuelEnd; idempotente
  // total, puro

isDuelOver(state: DuelState): boolean
  // pós: state.outcome !== undefined — leitura de conveniência para a UI e para a IA
```

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01–F11. `SurrenderAction` entra no mesmo contrato
`Action`/`apply` que o Online Duel (cross-PRD, Fase 5) vai transportar por WebSocket, e
`DuelAction = Action` (Decisão 12) é justamente o que torna esse transporte tipado.

### Contratos externos (cross-PRD)

Nenhum novo. `DuelOutcome` já era o contrato acordado com o `free-duel`; F12 apenas passa a
produzi-lo, e o rename da Decisão 5 é propagado aos consumidores dentro desta mesma spec.

### Exemplo — rendição de P1

```json
{
  "action": { "type": "surrender", "player": "P1" },
  "result": {
    "events": [],
    "state": {
      "outcome": { "status": "decisive", "winner": "P2", "loser": "P1", "reason": "surrender" }
    }
  }
}
```

### Exemplo — ataque letal carimbando o outcome no pós-passo

```json
{
  "action": { "type": "resolve_attack" },
  "result": {
    "events": [{ "type": "onDamage", "originPlayer": "P1", "context": { "toPlayer": "P2", "amount": 2000 } }],
    "state": {
      "players": { "P2": { "lp": 0 } },
      "outcome": { "status": "decisive", "winner": "P1", "loser": "P2", "reason": "lp_depleted" }
    }
  }
}
```

### Exemplo — ação recusada depois do fim

```json
{
  "ok": false,
  "error": {
    "code": "duel_already_ended",
    "message": "O duelo já terminou.",
    "details": { "reason": "lp_depleted", "winner": "P1" }
  }
}
```

## 5. Modelo de Dados

Não aplicável. F12 não cria tabela Postgres nem estrutura IndexedDB — opera inteiramente sobre
`DuelState` em memória, igual F01–F11. O `outcome` viaja no snapshot de F05 e é isso que o
`free-duel` (cross-PRD) já consome para persistir recompensa.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Código | Mensagem ao jogador |
|---|---|---|---|
| Qualquer ação depois do duelo encerrado | `state.outcome !== undefined` no pré-guard de `apply` | `duel_already_ended` | "O duelo já terminou." |
| `resolve_attack` pendente num duelo já encerrado | Mesmo pré-guard, posicionado antes do desvio de `resolve_attack` (Decisão 2) | `duel_already_ended` | "O duelo já terminou." |
| Rendição de jogador não participante | `SurrenderActionSchema`/`PlayerIdSchema` na fronteira (Decisão 11) | erro de parse zod | "Rendição inválida." |
| Rendição com janela de reação aberta | Permitida por desenho (Decisão 10) — não é erro | — | — |
| Rendição pelo jogador não ativo | Permitida por desenho (PRD Consumes) — não é erro | — | — |
| Snapshot de duelo encerrado recarregado por `load` (F05) | `DuelStateSchema` com `outcome` opcional (Decisão 15) | — | — |
| Snapshot com `outcome` malformado (winner === loser) | `DecisiveDuelOutcomeSchema.refine` já existente | erro de parse zod | Tratado por `load` (F05) |
| Deck-out e LP zerado no mesmo estado montado à mão | Precedência total da Decisão 7 | — | — |
| Duelo em andamento consultado por `checkDuelEnd` | Retorno `undefined` | — | — |

## 7. Estratégia de Testes

### Unitários (Vitest)

`packages/engine/src/end/check-duel-end.test.ts`
- `retorna undefined quando os dois jogadores têm LP acima de 0 e nenhum deck acabou`
- `declara lp_depleted com vencedor P2 quando o LP de P1 chega a 0`
- `declara lp_depleted com vencedor P1 quando o LP de P2 chega a 0`
- `declara draw quando os dois LP são 0`
- `declara deck_out com vencedor no oponente de deckOutPlayer`
- `dá precedência a LP zerado sobre deck-out quando as duas condições valem`
- `não considera LP negativo` (piso em 0 de F11 — LP nunca é `< 0`)

`packages/engine/src/end/surrender.test.ts`
- `rendição de P1 declara P2 vencedor com motivo surrender`
- `rendição de P2 declara P1 vencedor com motivo surrender`
- `rendição preserva LP, campo, mão, turno e fase do instante da rendição`
- `rendição não emite eventos`
- `rendição funciona com janela de reação aberta`
- `rendição funciona quando quem se rende não é o jogador ativo`

`packages/engine/src/turn/apply.test.ts` (acréscimos)
- `roteia surrender para o handler de rendição`
- `recusa advance_phase com duel_already_ended depois do fim`
- `recusa resolve_attack com duel_already_ended depois do fim` (Decisão 2)
- `recusa uma segunda rendição com duel_already_ended`
- `carimba lp_depleted no estado devolvido por um resolve_attack letal`
- `carimba deck_out no estado devolvido pelo advance_phase que esvazia o deck`
- `não carimba outcome enquanto nenhuma condição de fim vale`

### Property-based (fast-check)

`packages/engine/src/end/duel-frozen.properties.test.ts`
- **Congelamento total:** para qualquer `outcome` e qualquer ação da união `Action`, `apply` devolve
  erro `duel_already_ended` e o estado permanece byte a byte idêntico — a propriedade que sustenta
  "nenhuma ação adicional é aceita" do PRD.
- **Idempotência do carimbo:** `stampOutcome(stampOutcome(r))` ≡ `stampOutcome(r)` (Decisão 3).
- **Totalidade de `checkDuelEnd`:** para LP arbitrários em `[0, 8000]` e `deckOutPlayer` arbitrário,
  `checkDuelEnd` nunca lança e devolve `undefined` ou um outcome cujo `winner !== loser`.

`packages/engine/src/serialization/round-trip.properties.test.ts` (acréscimo)
- **Round-trip com outcome:** `load(serialize(state))` preserva `outcome` para os quatro motivos —
  o cruzamento F05 × F12 que a Decisão 15 torna obrigatório.

### Integração

- `apps/web/src/lib/free-duel/duel-session.test.ts` — `finishOrContinue` mantém a sessão
  `in_progress` ao atravessar a fase `end` de um turno, e só encerra quando o estado traz `outcome`
  (Decisão 13; é o teste que trava o defeito pré-existente).
- Suíte existente do `free-duel` (`consolidate-duel-result`, `resolve-duel-result`,
  `duel-result-messages`, `use-victory-reward`, testes de integração pós-duelo) — segue verde com
  os motivos renomeados, provando que o rename da Decisão 5 é completo.

### Análise estática

- `pnpm lint` com `.dependency-cruiser.cjs`: `packages/engine/src/end/**` sem `node:*` nem import
  de UI/I/O (regra `domain-cores-are-pure`, a única do arquivo que efetivamente pega violações).
- `pnpm typecheck`: a narrowing `DuelAction = Action` (Decisão 12) precisa compilar em todo o
  `apps/web` — é o próprio teste de que o vocabulário de ações fechou.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---|---|
| Declara resultado quando LP chega a 0 (`lp_zerado`), em deck-out (`deck_out`) ou em rendição (`rendicao`), com vencedor e perdedor corretos | `check-duel-end.test.ts` (LP e deck-out) + `surrender.test.ts` (rendição) + `apply.test.ts` (carimbo ponta a ponta). **Nota:** os códigos são `lp_depleted`/`deck_out`/`surrender` (Decisão 5) |
| LP zerado simultâneo dos dois jogadores resulta em `empate` | `declara draw quando os dois LP são 0` (código `draw`, Decisão 5) |
| Após o fim, qualquer ação de jogo é recusada com "O duelo já terminou." | `duel-frozen.properties.test.ts` (todas as ações) + os casos nominais em `apply.test.ts` |
| Timeout/abandono por desconexão não são tratados aqui | Ausência verificável: nenhum código de erro de timeout/desconexão em `packages/engine/src/end/**` (Fronteiras) |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Uma partida completa roda de ponta a ponta: F03 inicializa → F06 conduz turnos → F07 compra → F08/F09 jogam da mão → F10/F11 batalham → **F12 encerra**, sem estado inconsistente | Teste de partida completa em `apply.test.ts`: `initDuel` → sequência de ações até um `resolve_attack` letal → estado final com `outcome` e toda ação seguinte recusada |
| O mesmo estado inicial + mesma sequência de ações + mesmo seed produz o mesmo resultado final (determinismo verificado via F05) | Propriedade existente de determinismo, estendida para comparar também o `outcome` do estado final |
| Nenhuma capacidade do motor depende de UI | Análise estática acima |
| **Free Duel (cross-PRD):** o `DuelOutcome` produzido pelo motor é aceito por `consolidateDuelResult` sem adaptação | Suíte do `free-duel` verde com os motivos renomeados, sobre outcomes produzidos por `checkDuelEnd`/`surrender` em vez de fixtures escritas à mão |
| **Online Duel (cross-PRD):** o snapshot serializado por F05 é aceito pelo servidor autoritativo | Round-trip com `outcome` (property-based acima) — o snapshot de um duelo encerrado atravessa `serialize`/`load` sem perda |
