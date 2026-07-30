# Compra e Deck-out

> PRD: `docs/prds/motor-duelo-1x1.md` — F07
> Pacote-alvo: `packages/engine` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta feature entrega a **lógica de compra automática** que F06 (Ciclo de Turno e Fases)
deliberadamente deixou como um salto vazio: a transição `"draw"` → `"main"` de
`advancePhase` hoje (spec F06, Decisão 4) não puxa nenhuma carta. F07 intercepta exatamente
esse ponto — completa a mão do jogador ativo até 5 cartas no início do turno, emite `onDraw`
por carta comprada, e sinaliza **deck-out** quando o deck se esgota no meio de uma compra
obrigatória.

F07 não introduz uma nova variante de `Action`: comprar não é uma escolha do jogador, é
automático "no início do turno" (PRD F07 Capabilities). Por isso esta spec descreve uma
**alteração** ao arquivo que F06 criou (`packages/engine/src/turn/advance-phase.ts`), seguindo
o mesmo padrão incremental que `DuelState` já viveu desde F01 (F02 acrescentou `pending`, F06
acrescentou `handPlayUsed` a `PlayerState`) — aqui o acréscimo é um campo global novo em
`DuelState` para o sinal de deck-out.

Esta é a primeira feature da Wave 4 (`docs/prds/motor-duelo-1x1.md` §8 Parte 3) e cobre a
segunda das quatro fases descritas por F06 (Compra); F08–F11 cobrem Principal e Batalha na
mesma wave.

### Incluído

- Compra automática no início do turno: completa a mão do `activePlayer` até
  `INITIAL_HAND_SIZE` (5) cartas, puxando do topo do deck (índice 0), uma carta por vez (PRD F07
  Capabilities)
- Compra 0 cartas quando a mão já tem 5 (PRD F07 Capabilities; critério de aceite 1)
- Emissão de `onDraw` por carta comprada, uma por carta — não em lote (PRD F07 Capabilities;
  critério de aceite 2)
- Sinalização de **deck-out**: quando o deck do jogador ativo se esgota no meio de uma compra
  ainda necessária, a compra para naquele ponto e um campo novo em `DuelState` marca qual
  jogador não conseguiu completar a compra, para F12 consumir (PRD F07 Capabilities e Provides;
  critério de aceite 3)
- Guarda de fronteira: recusa (via `Result` de erro) uma solicitação de compra fora da fase de
  Compra, para qualquer chamador que invoque a função de compra diretamente sem passar pelo ciclo
  de turno (PRD F07 Error Handling)
- Determinismo: a compra não consome nenhum PRNG (o deck já foi embaralhado por F03 na
  inicialização); puxar sempre do topo (`deck[0]`) é a única regra, e é totalmente determinística
  dado o estado

### Fronteiras

- **A transição de fase em si** (`"draw"` → `"main"` completar, `"main"` → `"battle"`, etc.) e o
  ciclo de turno (troca de jogador ativo, reset de flags, `onTurnStart`/`onTurnEnd`) são de
  **F06** — esta feature só insere a compra *dentro* da transição já definida por F06, sem
  redesenhar a máquina de turno.
- **Consolidação do resultado do duelo** (declarar vencedor/perdedor/motivo, congelar o estado
  após o fim) é de **F12** — esta feature apenas expõe o sinal de deck-out; não declara
  vencedor, não impede novas ações, e não congela o estado (PRD Fora de Escopo implícito: F07
  "Provides" diz textualmente "flag... usado por F12", não o resultado em si).
- **Qualquer outra ação de jogo** (invocar monstro, jogar magia/armadilha/terreno, mudar posição,
  atacar) pertence a F08–F11, que ainda vão estender a mesma união `Action` que F06 criou; F07
  não adiciona nenhuma variante a `Action`.

### Contratos externos assumidos

Nenhum novo cross-PRD. A tabela do PRD §8 lista `Dependências: F06` para F07 — dependência
interna ao mesmo PRD, sem cross-PRD.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | F07 **pressupõe F06 já implementada** — hoje (30/07/2026) `packages/engine/src/turn/` não existe ainda, só a spec de F06. Esta spec descreve uma alteração a `advance-phase.ts` como se F06 já existisse; o `plan.md` registra a implementação de F06 como pré-requisito de execução, não como parte do escopo desta feature. | Instrução explícita do lote (F06 tem spec mas não tem implementação); PRD §8 (`Dependências: F06`) | a confirmar — depende da implementação de F06 rodar primeiro |
| 2 | Compra é implementada como duas funções, não uma só: `drawUpToHandSize(state)` — total, pura, assume que o chamador já garantiu `state.phase === "draw"` (é isso que `advancePhase` faz por construção, no `case "draw"` do `switch`) — e `resolveDrawPhase(state)` — a função de fronteira pública, que primeiro checa `state.phase === "draw"` e devolve `Result` de erro caso contrário, senão delega a `drawUpToHandSize`. Isso evita que `advancePhase` (documentado por F06 como "total: nunca lança") precise propagar um `Result` cujo ramo de erro é comprovadamente inalcançável a partir do próprio `switch` — o guard "fora da fase de Compra" continua testável e exposto para qualquer chamador futuro (F08/IA/teste) que invoque a compra fora do ciclo normal. | Auto-Aceite — "Decisão técnica com recomendação clara do spec-writer" (Política de Auto-Aceite); preserva o contrato de `advancePhase` já fixado por `docs/specs/motor-duelo-1x1/F06-.../spec.md` (Seção 4, "total: nunca lança") | confirmada |
| 3 | O sinal de deck-out é um **campo novo em `DuelState`**, não em `PlayerState`: `deckOutPlayer?: PlayerId` (ausente = nenhum deck-out ocorreu). Alternativa considerada e descartada: uma flag booleana por jogador (`PlayerState.hasDeckedOut`), simétrica aos demais campos per-player — descartada porque o PRD fala de "flag de deck-out **do jogador**" no singular (Provides de F07), e o padrão mais próximo já existente em `DuelState` é `pending` (F02): um único campo global opcional que aponta para "o que está pendente/sinalizado" no duelo como um todo, não duplicado por lado. | PRD §6 F07 Provides ("flag de deck-out do jogador"); precedente de `DuelState.pending` (F02) | a confirmar |
| 4 | **Contrato mínimo assumido para F12 (que ainda não existe)**: F07 só marca `deckOutPlayer` no estado; não impede que `advance_phase` (ou qualquer ação futura) continue sendo aceita depois disso, e não congela o estado. "O duelo termina imediatamente" (PRD F07 Experience) só se realiza de fato quando F12 existir e acrescentar, ao mesmo `switch` de `apply` que F06 introduziu, um guard que consulta `deckOutPlayer` (par a par com LP zerado e rendição) para declarar o resultado e congelar — o mesmo padrão que a spec de F06 já previu na sua Decisão 13 para o guard de "duelo já terminado". Esta spec não implementa esse guard porque nenhum campo de resultado existe em `DuelState` ainda e inventar um sistema de resultado completo é escopo de F12, não de F07. | Instrução explícita do lote; PRD §6 F12 Capabilities ("Após declarar o resultado, o motor congela o estado"); `docs/specs/motor-duelo-1x1/F06-.../spec.md` Decisão 13 (mesmo padrão de guard adiado) | a confirmar — pendência explícita para quando F12 for especificada |
| 5 | Compra puxa exatamente `max(0, INITIAL_HAND_SIZE − mão.length)` cartas, uma de cada vez, do início do array `deck` (`deck[0]` = topo, convenção já fixada por `initDuel`, F03). Se, em qualquer iteração dessa contagem, `deck.length === 0`, a compra para naquele ponto (a mão fica parcialmente completada) e `deckOutPlayer` é setado — não é um "tudo ou nada": cartas já compradas com sucesso antes do esgotamento permanecem na mão. | PRD §6 F07 Capabilities e Error Handling ("Deck vazio no momento de uma compra obrigatória") — leitura literal de "no momento", i.e. por carta, não em lote | confirmada |
| 6 | Nenhum evento novo é criado para o deck-out em si — o vocabulário de eventos (`EVENT_TYPES`) é fechado em 10 tipos (F02) e não inclui nada como `onDeckOut`. O sinal viaja só como o campo de estado `deckOutPlayer`, consumido por leitura direta (via o predicado `hasDeckedOut`, Decisão 7), nunca por evento. | `docs/arquitetura.md` §3.3 (vocabulário fechado); instrução explícita de não inventar evento novo | confirmada |
| 7 | Um predicado de leitura `hasDeckedOut(state): boolean` é exposto ao lado do campo, no mesmo espírito de `isFirstDuelTurn`/`hasUsedHandPlay` (F06) e `hasOpenReactionWindow` (F02) — a convenção já estabelecida no pacote é nunca obrigar um consumidor externo (F12, IA, testes) a inspecionar `state.deckOutPlayer !== undefined` manualmente. | Padrão observado em `packages/engine/src/events/reaction-window.ts` e na spec de F06 (Camada 1) | confirmada |
| 8 | Estrutura de arquivos: novo subsistema `packages/engine/src/draw/` (substantivo em inglês, singular, kebab-case internamente), ao lado de `combat/`, `events/`, `initialization/`, `prng/`, `serialization/`, `turn/` (F06). Identificadores de código em inglês (`drawUpToHandSize`, `resolveDrawPhase`, `deckOutPlayer`, `hasDeckedOut`), com a prosa desta spec em português — mesma disciplina que a spec de F06 já corrigiu (Decisão 8 daquela spec). | Padrão observado em `packages/engine/src/*` (Camada 1); `docs/specs/motor-duelo-1x1/F06-.../spec.md` Decisão 8; `CLAUDE.md` | confirmada |
| 9 | `resolveDrawPhase` não é chamado por nenhum consumidor interno desta wave além do próprio teste que verifica o guard "fora da fase de Compra" — dentro do fluxo normal, só `advancePhase` (via `drawUpToHandSize`) executa a compra. Isso é aceitável: o PRD pede a recusa como comportamento de fronteira disponível, não como algo exercido pelo ciclo de turno normal (que nunca chama compra fora da fase de Compra, por construção do `switch`). | PRD §6 F07 Error Handling; leitura de F06 `advance-phase.ts` (o `switch` só invoca a lógica de compra no `case "draw"`) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duel/types.ts` | shared | alterado | Acrescenta `deckOutPlayer?: PlayerId` a `DuelState` (Decisão 3) |
| `packages/shared/src/duel/schema.ts` | shared | alterado | Acrescenta `deckOutPlayer: PlayerIdSchema.optional()` a `DuelStateSchema` |
| `packages/engine/src/draw/draw-phase.ts` | engine | novo | `drawUpToHandSize(state)` (total) e `resolveDrawPhase(state)` (guarda + `Result`), Decisão 2 |
| `packages/engine/src/draw/deck-out.ts` | engine | novo | `hasDeckedOut(state)`, `getDeckOutPlayer(state)` — predicados de leitura (Decisão 7) |
| `packages/engine/src/draw/index.ts` | engine | novo | Export público do subsistema `draw` |
| `packages/engine/src/draw/draw-phase.test.ts` | engine | novo | Unitários: compra até 5, compra 0 com mão cheia, deck-out parcial, eventos `onDraw` em ordem, guard fora da fase de Compra |
| `packages/engine/src/draw/draw-phase.properties.test.ts` | engine | novo | Propriedade: para qualquer mão/deck válidos, a compra nunca deixa a mão com mais de 5 cartas nem inventa cartas; determinismo da mesma entrada |
| `packages/engine/src/draw/deck-out.test.ts` | engine | novo | Unitários: `hasDeckedOut`/`getDeckOutPlayer` antes e depois do campo ser setado |
| `packages/engine/src/turn/advance-phase.ts` | engine | alterado (arquivo de F06) | O `case "draw"` do switch interno passa a chamar `drawUpToHandSize(state)` antes de completar a transição para `"main"` (Fluxo, Seção 3), em vez do salto vazio que F06 documentou |
| `packages/engine/src/turn/advance-phase.test.ts` | engine | alterado (arquivo de F06) | Acrescenta casos: `advance_phase de draw completa a mão até 5 e emite onDraw antes de ir para main`, `advance_phase de draw não compra quando a mão já tem 5`, `advance_phase de draw marca deckOutPlayer quando o deck esgota no meio da compra` |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta `draw` (`drawUpToHandSize`, `resolveDrawPhase`, `hasDeckedOut`, `getDeckOutPlayer`) ao lado dos subsistemas existentes |
| `packages/engine/README.md` | engine | alterado | Acrescenta o subsistema `draw` ao propósito e aos exports públicos |

**Verificação da direção de dependências:** `packages/engine/src/draw/**` importa apenas de
`packages/shared` (`DuelState`, `PlayerId`, `ApplyResult`, `DuelEvent`, `Result`, `DomainError`,
`INITIAL_HAND_SIZE`) e de `packages/engine/src/events` (`createEvent`) — ambos já internos ao
próprio pacote `engine`. `packages/engine/src/turn/advance-phase.ts` passa a importar também de
`packages/engine/src/draw`, uma dependência interna do mesmo pacote (`turn` → `draw`, sem ciclo:
`draw` não importa nada de `turn`). Nenhum import de `data`, `rules`, `ai`, `web`, `server`, React,
DOM, `fetch` ou Supabase — mesma garantia já verificada para os demais subsistemas do `engine`.

## 3. Design Técnico

### Estruturas de dados

**`DuelState.deckOutPlayer?: PlayerId`** (`packages/shared`) — campo global novo, opcional.
Ausente (`undefined`) = nenhum deck-out ocorreu ainda no duelo. Presente = o `PlayerId` do
jogador que não conseguiu completar uma compra obrigatória porque o deck esgotou. Uma vez
setado, esta feature nunca o remove (não há operação de "reset" — deck-out não é uma flag de
turno como `hasAttacked`; é um marco permanente do duelo, coerente com "o duelo termina
imediatamente" da Experience do PRD, mesmo que a consolidação em si seja de F12).

### Fluxo — compra dentro de `advance_phase`

Estende o Fluxo já descrito por F06 para o `case "draw"` do switch de `advancePhase`:

1. `apply(state, { type: "advance_phase" })` consulta `hasOpenReactionWindow(state)` (F02/F06,
   inalterado). Se aberta, recusa sem tocar o estado.
2. Se `state.phase === "draw"`: chama `drawUpToHandSize(state)` (não `resolveDrawPhase` — o
   `switch` já garantiu a fase, Decisão 2):
   a. Calcula `needed = max(0, INITIAL_HAND_SIZE − players[activePlayer].hand.length)`.
   b. Repete até `needed` vezes: se `deck.length === 0`, para o laço e marca
      `deckOutPlayer = activePlayer` no estado resultante; senão, remove `deck[0]`, acrescenta ao
      fim da mão, e empilha um evento `onDraw` (`createEvent`, F02) com `originPlayer =
      activePlayer` e `involvedCards: [carta]`.
   c. Devolve `{ state: <mão/deck atualizados, deckOutPlayer se aplicável>, events: <onDraw...> }`.
3. `advancePhase` funde o resultado do passo 2 com a transição de fase já definida por F06:
   `phase` avança para `"main"` de qualquer forma (Decisão 4 — a compra não impede o avanço de
   fase; congelar o fluxo é responsabilidade de F12, que ainda não existe). Os eventos de
   `onDraw` (0 a 5 deles) são devolvidos junto com o novo estado; nenhum outro evento é emitido
   nesta transição (nem antes nem depois, igual ao que F06 já documentou para as demais
   transições de fase intermediárias).
4. As demais transições de fase (`"main"→"battle"`, `"battle"→"end"`, transição de turno a partir
   de `"end"`) permanecem exatamente como F06 as especificou — nenhuma delas é tocada por esta
   feature.

### Regras de negócio

- **Completar até 5** (PRD F07 Capabilities; critério de aceite 1): nunca compra além de
  `INITIAL_HAND_SIZE`; se a mão já tem 5+ cartas, `needed` é 0 e nenhuma carta é puxada.
- **Uma carta por evento** (PRD F07 Capabilities; critério de aceite 2): `onDraw` é emitido uma
  vez por carta, na ordem em que são puxadas (topo primeiro) — nunca um evento único agregando
  N cartas.
- **Deck-out como sinal, não como interrupção de fluxo** (PRD F07 Capabilities/Provides; critério
  de aceite 3): ao esgotar o deck no meio da compra, a compra para naquele ponto — a mão fica
  com o que conseguiu comprar até ali — e `deckOutPlayer` é marcado. A consolidação de "o
  jogador perde" é de F12 (Decisão 4).
- **Determinismo** (pilar 2, `docs/arquitetura.md` §1): a compra não usa PRNG — o embaralhamento
  já ocorreu em `initDuel` (F03); puxar sempre `deck[0]` é uma função determinística do estado.

### Eventos

- `onDraw` (já no vocabulário fechado de F02/`EVENT_TYPES`) é o único evento emitido por esta
  feature — 0 a 5 ocorrências por transição `"draw"`→`"main"`, uma por carta puxada com sucesso.
  `originPlayer` = o jogador que está comprando (`state.activePlayer` antes da transição).
  `involvedCards` = `[carta puxada]` (nunca vazio, nunca mais de uma carta). `involvedZones` = `[]`
  (mão e deck não são zonas de campo — `ZoneReference` só cobre monstro/magia-armadilha, igual ao
  padrão já usado por F06 para `onTurnStart`/`onTurnEnd`). `context`: `{}` (nenhum dado
  suplementar necessário; a carta já está em `involvedCards`).
- Nenhuma janela de reação é aberta por `onDraw` — não está na lista de eventos com janela
  (só `onAttackDeclared`, F02/F11); mesma leitura que F06 já aplicou a `onTurnStart`/`onTurnEnd`.

### Determinismo e pureza

- `drawUpToHandSize` e `resolveDrawPhase` são **puras e totais**: nenhuma leitura de relógio,
  nenhum `Math.random()`, nenhuma exceção — a única recusa (`resolveDrawPhase` fora da fase de
  Compra) é um `Result` de erro, não uma exceção.
- A saída depende só de `state` (mão, deck, fase, jogador ativo) — a mesma entrada sempre produz
  a mesma sequência de cartas compradas e o mesmo resultado de deck-out (pilar de determinismo,
  PRD §4).
- Nenhum campo de `Card` é alterado; a compra move referências de carta entre `deck` e `hand`
  sem tocar `atk`/`def` ou qualquer outro campo do schema de carta.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duel/types.ts (DuelState, alterado)
export type DuelState = Readonly<{
  players: Readonly<Record<PlayerId, PlayerState>>;
  activeField: Card | null;
  activePlayer: PlayerId;
  turn: number;
  phase: Phase;
  pending?: ReactionWindow | undefined;
  seed: number;
  /** Set once a player fails to complete a mandatory draw (F07); consumed by F12. */
  deckOutPlayer?: PlayerId | undefined;
}>;

// packages/shared/src/duel/schema.ts (DuelStateSchema, alterado)
export const DuelStateSchema = z.strictObject({
  // ...campos existentes inalterados...
  deckOutPlayer: PlayerIdSchema.optional(),
});
```

**Reusados sem redefinir:** `PlayerId`, `PlayerState`, `DuelEvent`, `ApplyResult`, `Result`,
`DomainError`, `INITIAL_HAND_SIZE` (F01–F06); `createEvent` (F02); `advancePhase`, `apply`
(F06, alterados por esta feature apenas na lógica interna do `case "draw"`, sem mudar suas
assinaturas públicas).

### Funções públicas

```
// packages/engine/src/draw — núcleo puro

drawUpToHandSize(state: DuelState): ApplyResult
  // pré: o chamador já garantiu state.phase === "draw" (nenhuma checagem própria)
  // pós: mão de state.players[state.activePlayer] completada até INITIAL_HAND_SIZE (5);
  //      eventos onDraw na ordem em que as cartas foram puxadas (0 a 5);
  //      se o deck esgotar antes de completar, para o laço e devolve
  //      state.deckOutPlayer === state.activePlayer
  // total: nunca lança, nunca falha

resolveDrawPhase(state: DuelState): Result<ApplyResult, DomainError>
  // pré: nenhuma
  // pós: ok ⇒ drawUpToHandSize(state)
  //      erro ⇒ code 'draw_outside_draw_phase' se state.phase !== "draw"
  // total: nunca lança

hasDeckedOut(state: DuelState): boolean
  // pós: state.deckOutPlayer !== undefined

getDeckOutPlayer(state: DuelState): PlayerId | undefined
  // pós: state.deckOutPlayer
```

**Nota sobre `advancePhase` (F06, alterado):** continua com a assinatura
`advancePhase(state: DuelState): ApplyResult` — total, nunca lança, como já documentado por
F06. O `case "draw"` do seu switch interno passa a chamar `drawUpToHandSize` (nunca
`resolveDrawPhase`), preservando a garantia de totalidade porque a fase já foi confirmada pelo
próprio switch antes da chamada.

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01–F06: esta feature não expõe rede, é consumida
internamente pelo próprio `engine`.

### Contratos externos (cross-PRD)

Nenhum novo.

### Exemplo — compra parcial completando a mão

```json
{
  "estadoAntes": {
    "turn": 4,
    "phase": "draw",
    "activePlayer": "P1",
    "players": { "P1": { "hand": ["cartaA", "cartaB", "cartaC"], "deck": ["cartaD", "cartaE", "..."] } }
  },
  "acao": { "type": "advance_phase" },
  "resultado": {
    "state": {
      "turn": 4,
      "phase": "main",
      "activePlayer": "P1",
      "players": { "P1": { "hand": ["cartaA", "cartaB", "cartaC", "cartaD", "cartaE"], "deck": ["..."] } }
    },
    "events": [
      { "type": "onDraw", "originPlayer": "P1", "involvedCards": ["cartaD"], "involvedZones": [], "context": {} },
      { "type": "onDraw", "originPlayer": "P1", "involvedCards": ["cartaE"], "involvedZones": [], "context": {} }
    ]
  }
}
```

### Exemplo — mão já completa, compra 0

```json
{
  "estadoAntes": { "turn": 5, "phase": "draw", "activePlayer": "P2", "players": { "P2": { "hand": ["c1","c2","c3","c4","c5"] } } },
  "acao": { "type": "advance_phase" },
  "resultado": {
    "state": { "turn": 5, "phase": "main", "activePlayer": "P2", "players": { "P2": { "hand": ["c1","c2","c3","c4","c5"] } } },
    "events": []
  }
}
```

### Exemplo — deck-out no meio da compra

```json
{
  "estadoAntes": {
    "turn": 12, "phase": "draw", "activePlayer": "P1",
    "players": { "P1": { "hand": ["cartaA", "cartaB"], "deck": ["cartaC"] } }
  },
  "acao": { "type": "advance_phase" },
  "resultado": {
    "state": {
      "turn": 12, "phase": "main", "activePlayer": "P1", "deckOutPlayer": "P1",
      "players": { "P1": { "hand": ["cartaA", "cartaB", "cartaC"], "deck": [] } }
    },
    "events": [
      { "type": "onDraw", "originPlayer": "P1", "involvedCards": ["cartaC"], "involvedZones": [], "context": {} }
    ]
  }
}
```

### Exemplo — recusa por chamada fora da fase de Compra

```json
{
  "ok": false,
  "error": {
    "code": "draw_outside_draw_phase",
    "message": "Compra solicitada fora da fase de Compra.",
    "details": { "phase": "battle" }
  }
}
```

## 5. Modelo de Dados

Não aplicável. F07 não cria tabela Postgres nem estrutura IndexedDB — opera inteiramente sobre
`DuelState` em memória, igual F01–F06.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Código |
|---|---|---|---|
| Deck vazio no momento de uma compra obrigatória | `deck.length === 0` dentro do laço de `drawUpToHandSize` | Não é erro — para o laço, marca `deckOutPlayer = activePlayer`, devolve os eventos `onDraw` já emitidos até ali; a fase ainda avança para `"main"` (Decisão 4) | `deck_out` (motivo repassado a F12 quando existir — esta feature não define um código de erro para isso, porque não é uma recusa, é um sinal) |
| `resolveDrawPhase` chamado com `state.phase !== "draw"` | checagem explícita no início da função | `Result` de erro, estado inalterado | `draw_outside_draw_phase` |
| Mão já com 5+ cartas ao entrar na fase de Compra | `needed <= 0` | Compra 0 cartas, nenhum evento, segue para `"main"` normalmente | — |
| Deck-out já sinalizado em um turno anterior (`deckOutPlayer` já definido) e o duelo continua sendo jogado (F12 ainda não existe para congelar) | Não ocorre nova checagem — o campo não é resetado nem sobrescrito por um valor diferente nesta feature | `drawUpToHandSize` do turno seguinte pode, em tese, setar `deckOutPlayer` para o outro jogador se ele também ficar sem deck — cenário só possível hoje porque F12 não existe para encerrar o duelo no primeiro deck-out; comportamento aceito e documentado (Decisão 4) | — |
| `Action` recebida de fora (rede/UI) não corresponde a nenhuma variante conhecida | `ActionSchema.safeParse` na fronteira (fora do `engine`) | Rejeição de schema antes de chegar a `apply` — inalterado desde F06 | erro de validação zod padrão |

## 7. Estratégia de Testes

### Unitários (Vitest)

`draw-phase` (`draw/draw-phase.test.ts`):
- `drawUpToHandSize completa a mão de 3 para 5 cartas puxando do topo do deck`
- `drawUpToHandSize não compra nenhuma carta quando a mão já tem 5`
- `drawUpToHandSize compra 0 quando needed é 0 e a mão tem mais de 5 cartas` (estado defensivo,
  não deveria ocorrer por construção, mas a função não deve comprar negativo)
- `drawUpToHandSize emite um evento onDraw por carta puxada, na ordem do topo do deck`
- `drawUpToHandSize remove as cartas puxadas do deck e as acrescenta ao fim da mão`
- `drawUpToHandSize marca deckOutPlayer com o jogador ativo quando o deck esgota antes de completar 5`
- `drawUpToHandSize preserva as cartas já compradas com sucesso antes do deck esgotar`
- `drawUpToHandSize não marca deckOutPlayer quando a compra é concluída sem esgotar o deck`
- `resolveDrawPhase devolve erro com code draw_outside_draw_phase quando state.phase não é draw`
- `resolveDrawPhase devolve o mesmo resultado de drawUpToHandSize quando state.phase é draw`
- `resolveDrawPhase não altera o estado quando recusa por fase incorreta`

`deck-out` (`draw/deck-out.test.ts`):
- `hasDeckedOut devolve false quando deckOutPlayer está ausente`
- `hasDeckedOut devolve true quando deckOutPlayer está definido`
- `getDeckOutPlayer devolve undefined quando nenhum deck-out ocorreu`
- `getDeckOutPlayer devolve o PlayerId marcado quando um deck-out ocorreu`

`advance-phase` (`turn/advance-phase.test.ts`, casos acrescentados a F06):
- `advance_phase de draw completa a mão até 5 e emite onDraw antes de ir para main`
- `advance_phase de draw não compra quando a mão já tem 5, e ainda assim avança para main`
- `advance_phase de draw marca deckOutPlayer quando o deck esgota no meio da compra, e ainda
  assim avança para main`

### Property-based (fast-check)

- **Mão nunca excede 5 e nunca inventa carta:** para qualquer par (mão, deck) válido de tamanhos
  arbitrários, após `drawUpToHandSize`, `hand.length` é `min(5, mãoAntes.length + deckAntes.length)`
  e o multiconjunto de cartas em `hand ∪ deck` depois é idêntico ao de antes (nenhuma carta
  criada, duplicada ou perdida). 1.000 execuções.
- **Determinismo:** para o mesmo estado inicial, `drawUpToHandSize` sempre produz a mesma mão,
  o mesmo deck resultante, a mesma sequência de eventos `onDraw` e o mesmo valor de
  `deckOutPlayer` (pilar de determinismo, PRD §4). 1.000 execuções.
- **Deck-out é monotônico dentro de uma chamada:** para qualquer deck com menos cartas do que o
  `needed`, o número de eventos `onDraw` emitidos é exatamente igual ao tamanho original do
  deck, e `deckOutPlayer` é sempre marcado.

### Integração

Não aplicável ainda — uma partida completa ponta-a-ponta (critério de Cross-Feature Integration
do PRD) só é exercível quando F08–F12 existirem. Esta feature testa a compra isoladamente e via
`advance_phase` (integração com F06).

### Análise estática

- `packages/engine/src/draw/**` importa apenas `packages/shared` e
  `packages/engine/src/events` — nunca `data`, `rules`, `ai`, `web`, `server`, React, DOM,
  `fetch` ou Supabase.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.
- `packages/engine/src/turn/advance-phase.ts` continua sem importar nada fora de `shared` e do
  próprio `engine` após acrescentar o import de `draw`.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F07) | Teste |
|---|---|
| No início do turno, a mão é completada até 5 cartas (compra 0 se já tem 5) | `drawUpToHandSize completa a mão de 3 para 5...` + `...não compra nenhuma carta quando a mão já tem 5` |
| Cada carta comprada emite onDraw | `drawUpToHandSize emite um evento onDraw por carta puxada...` |
| Deck vazio no momento de uma compra obrigatória resulta em derrota por deck-out, encaminhada a F12 com motivo deck_out | `drawUpToHandSize marca deckOutPlayer com o jogador ativo quando o deck esgota...` — a "derrota" em si (consolidação) é pendência explícita para F12 (Decisão 4), não testável nesta feature |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Uma partida completa roda de ponta a ponta: F03 inicializa → F06 conduz turnos → F07 compra → ..." | `advance_phase de draw completa a mão até 5...` fecha a costura entre F06 (`advancePhase`) e F07 (`drawUpToHandSize`) — a partida completa ponta-a-ponta só fecha quando F08–F12 existirem |
| Cross-Feature: "Todos os eventos emitidos pelas ações (F06–F11) passam por F02 e abrem janela de reação quando aplicável" | `onDraw` usa `createEvent` (F02) e deliberadamente não abre janela — mesma leitura que F06 já aplicou a `onTurnStart`/`onTurnEnd` |
| Cross-Feature: "O mesmo estado inicial + mesma sequência de ações + mesmo seed produz o mesmo resultado final em execuções repetidas" | Propriedade `Determinismo` desta feature estende a mesma garantia de F06 para a compra |
