# Carteira de Estrelas

> PRD: `docs/prds/password.md` — F01
> Pacote-alvo: `packages/shared` + `packages/rules` + `apps/web` + `supabase/migrations`

## 1. Contexto e Escopo

F01 é a Foundation do módulo Password (PRD §8, Parte 2): o recurso de estado sobre o qual o
crédito por vitória (F02) e a liberação por senha (F04) operam. Esta spec **não constrói uma
carteira nova** — ela **adota formalmente** a carteira que `free-duel/F07` já entregou sob a
unificação recomendada por `docs/arquitetura.md` §5.3 e ADR-006, e fecha as lacunas que
sobraram entre o que está no código e o que o bloco Capabilities/Error Handling de F01 exige.

O que já existe no repositório e **não** é redesenhado aqui:

| Entrega de F01 | Onde já está | Origem |
|---|---|---|
| Tabela `wallets` (`player_id` PK, `stars int ≥ 0`, RLS select-own, grants) | `supabase/migrations/0008_create_wallets_and_apply_victory_reward.sql` | `free-duel/F07` |
| Crédito atômico e idempotente por `duel_id` (carta + estrelas na mesma transação) | RPC `apply_victory_reward` (`0008`) + `reward_ledger` (`0005`) | `free-duel/F07` = **PRD password F02** |
| Contratos `WalletBalance`, `LoadedWalletBalance`, `PendingVictoryReward` + schemas zod | `packages/shared/src/economy/wallet.ts`, `wallet-schema.ts` | `free-duel/F07` |
| Validação pura de `stars` | `packages/rules/src/economy/victory-reward.ts` | `free-duel/F07` |
| Leitura servidor→cache e cache IndexedDB do saldo | `apps/web/src/lib/wallet/` (`load-wallet.ts`, `supabase-repository.ts`, `indexeddb-cache.ts`) | `free-duel/F07` |
| Fila offline de créditos e sincronização ao reconectar | `apps/web/src/lib/reward/victory-reward-queue.ts`, `sync-victory-reward-queue.ts` | `free-duel/F07` |

Com isso, o item de `docs/arquitetura.md` §10 *"Unificar carteira e handler `onVictory` entre
`free-duel` e `password`"* passa a estar resolvido no código e **registrado por escrito nesta
spec** (Decisão 1) — ADR-006 permanece formalmente "Proposto".

O que **falta**, e é o que esta spec entrega:

1. **A carteira não é criada no cadastro.** `onAccountCreated` semeia deck e coleção
   (`build-deck/F02`) mas nunca toca `wallets`; a linha só nasce no `upsert` da primeira
   vitória. Funciona por acidente para saldo inicial `0` (o adaptador devolve `{ stars: 0 }`
   quando a linha não existe), mas **não há ponto único onde o saldo inicial de balanceamento
   possa ser aplicado** quando ele for definido.
2. **Créditos offline somem da tela.** `loadWalletBalance` prefere o servidor sem olhar a fila
   `pendingVictoryRewards`; enquanto a fila não drena, o saldo exibido é **menor** que o real.
   É exatamente o cenário que o Error Handling de F01 proíbe (*"evitando 'criar' ou 'sumir'
   estrelas"*, com *"reconciliação por identificadores"*).
3. **Não há observável reativo de saldo.** `loadWalletBalance` não tem **nenhum consumidor** no
   repositório hoje. A Experience de F01 exige saldo *"atualizado imediatamente após qualquer
   crédito (F02) ou débito (F04)"*, e F04 precisa de um ponto por onde empurrar o saldo já
   debitado sem prop-drilling.
4. **A fonte única não está travada por teste.** Nenhuma verificação impede um módulo futuro de
   abrir um saldo paralelo.

No roadmap (`arquitetura.md` §9) isto é Fase 2, cujas demais entregas já estão no repositório.

### Incluído

- Adoção formal de `wallets` como a carteira única do jogo, com a rastreabilidade de qual
  entrega de `free-duel/F07` satisfaz cada Capability de F01 (tabela acima + Seção 7)
- Criação idempotente da carteira no cadastro via novo RPC `ensure_wallet`, chamado por
  `onAccountCreated`, com o saldo inicial vindo de uma **constante única** em
  `packages/shared` (`INITIAL_WALLET_STARS`, hoje `0` — pendência de balanceamento)
- **Saldo efetivo reconciliado por identificador**: função pura em `packages/rules` que combina
  o saldo persistido com os créditos da fila offline **que ainda não constam em
  `reward_ledger`**, e a leitura de `reward_ledger` que a alimenta
- `loadWalletBalance` estendido para devolver saldo persistido, saldo pendente e saldo efetivo,
  e para gravar no cache o **saldo efetivo** (mantendo a invariante de que o cache é sempre a
  melhor estimativa conhecida localmente)
- Store reativo de carteira (`useWalletStore`, Zustand) + hook `useWalletBalance`, com
  `setAuthoritativeBalance` para F04 refletir o saldo já debitado pelo servidor
- Testes que travam a fonte única (nenhum saldo paralelo) e a não-negatividade

### Adiado

O PRD não divide F01 em `Core Scope` / `Full Scope additions`; o escopo desta spec é a feature
completa.

### Fronteiras

- **Creditar estrelas por vitória** é F02 do PRD — **já implementado** por `free-duel/F07`
  (`apply_victory_reward`). F01 não cria nenhuma rota de crédito nova.
- **Debitar estrelas e conceder a carta** é F04. F01 **não cria nenhuma rota de débito**: expõe
  apenas o ponto (`setAuthoritativeBalance`) por onde F04 reflete o saldo que o servidor já
  devolveu, e declara a invariante de serialização por conta que a RPC de F04 deve honrar
  (Decisão 6).
- **Resolver senha, precificar e calcular "posso pagar"** é F03 (spec já escrita). F01 fornece o
  saldo; não conhece senha nem preço.
- **Extrato de liberações** é F05. F01 não registra histórico.
- **Tela `/password`, cabeçalho `star-balance.tsx` e item do menu principal** são de F03/F04
  (spec de F03, Decisões 2 e 3). F01 entrega o hook, **não** a UI — coerente com o PRD
  (*"Não há tela isolada só para a carteira"*).
- **Valor de `N` estrelas por vitória e do saldo inicial** são dado de balanceamento
  (`arquitetura.md` §10, Fase 0.4 do skill). Nenhum valor é inventado.

### Contratos externos assumidos

| Dependência | Onde está | O que F01 usa |
|---|---|---|
| Auth / Cadastro (cross-PRD, sem PRD próprio) | `apps/web/src/app/api/account/bootstrap/route.ts` + `lib/initial-deck/on-account-created.ts` | Ponto de entrada `onAccountCreated(playerId)`, já usado por `build-deck/F02` como *"o contrato esperado por Auth/Cadastro"*. F01 acrescenta a criação da carteira ao mesmo ponto. |
| Save / persistência (cross-PRD) | Supabase (Postgres + Auth + RLS) já configurado | Conta autenticada, RLS select-own, padrão de RPC `SECURITY DEFINER` |
| Módulos de duelo (cross-PRD) | `apps/web/src/lib/reward/` (`free-duel/F06`+`F07`) | `pendingVictoryRewards` e `reward_ledger` como fonte da reconciliação; F01 **lê**, nunca escreve |
| `password/F04` (ainda sem spec) | — | Consumirá `setAuthoritativeBalance` e uma RPC de débito que deve mutar **a mesma linha** de `wallets` (Decisão 6) |

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|---|---|---|
| 1 | **`wallets` é a carteira única; F01 e F02 do PRD `password` estão satisfeitas por `free-duel/F07`.** Esta spec adota e documenta, não reimplementa. O item de `arquitetura.md` §10 ("unificar carteira e handler `onVictory`") é considerado **resolvido no código**; ADR-006 segue "Proposto" até que suas três entradas pendentes sejam fechadas. | `arquitetura.md` §5.1/§5.3/§10; ADR-006 §4/§6; `migrations/0008`; spec `password/F03` Decisão 9 | confirmada (ADR ainda "Proposto") |
| 2 | **A carteira passa a ser criada no cadastro** por um RPC `ensure_wallet(p_player_id, p_initial_stars)`, `SECURITY DEFINER`, com `EXECUTE` **restrito a `service_role`** — o mesmo tratamento de `persist_initial_deck`, e pela mesma razão registrada no `CLAUDE.md`: **o chamador informa o valor**, e um cliente que pudesse escolher o próprio saldo inicial cunharia estrelas. Idempotente por construção (`on conflict (player_id) do nothing`), como `persist_initial_deck`. | entrevista; `CLAUDE.md` ("`persist_initial_deck` é restrita a `service_role`, porque seu chamador computa o conteúdo"); `migrations/0004` | confirmada |
| 3 | **O saldo inicial vive em `INITIAL_WALLET_STARS`** (`packages/shared/src/economy/constants.ts`), hoje `0`, marcado como pendência de balanceamento. É o ponto único que o PRD pede (*"valor de balanceamento tunável (sugestão inicial: `0⭐`)"*). Nenhum valor é inventado: `0` é literalmente a sugestão registrada no PRD, não um número deduzido de lore. O `default 0` da coluna permanece como rede de segurança. | PRD §6 F01 Capabilities; Fase 0.4 do skill | confirmada — valor a revisar no balanceamento |
| 4 | **Reconciliação por ledger, não por soma cega da fila.** O saldo efetivo soma ao saldo do servidor apenas os itens de `pendingVictoryRewards` cujo `duelId` **não** aparece em `reward_ledger`. `reward_ledger` tem política `select` própria (`0005`), então o cliente pode consultá-la sob RLS. A alternativa (somar toda a fila) contaria em dobro na janela entre "o servidor aplicou" e "a fila foi drenada" — criaria estrelas na tela, o oposto do que o Error Handling de F01 exige. Custo: uma consulta extra **apenas quando a fila não está vazia** (caso comum: zero consultas). | entrevista; PRD §6 F01 Error Handling ("reconciliação por identificadores"); `migrations/0005` (`reward_ledger_select_own`) | confirmada |
| 5 | **Leitura do cache não soma a fila.** `applyOfflineVictoryReward` (`free-duel/F07`) grava coleção, carteira **e** fila na mesma transação IndexedDB — ou seja, o snapshot em cache **já inclui** os créditos offline. Somar a fila de novo sobre ele duplicaria. Portanto: `origin: "server"` ⇒ efetivo = servidor + pendentes não aplicados; `origin: "cache"` ⇒ efetivo = o próprio valor em cache, e a fila serve só como sinal de "sincronizando…". Coerente também com o fato de que, offline, `reward_ledger` é inalcançável. | `free-duel/F07` spec §5 (transação IndexedDB única) e §3 passo 14 | confirmada |
| 6 | **Serialização por conta é a linha de `wallets`.** A Capability *"crédito e débito atômicos e serializados por conta"* é satisfeita pelo bloqueio de linha do Postgres na PK `player_id`: `apply_victory_reward` (crédito) e a futura RPC de débito de F04 mutam **a mesma linha** dentro de uma transação, então uma vitória e uma liberação concorrentes serializam nessa linha. F01 registra isso como **invariante que F04 deve honrar**: nenhuma tabela ou coluna de saldo alternativa, nenhum débito fora de RPC `SECURITY DEFINER`. | PRD §6 F01 Capabilities; `arquitetura.md` §5.2; ADR-006 §6 | confirmada — a verificar em F04 |
| 7 | **Débito nunca é otimista.** `setAuthoritativeBalance(stars)` só aceita um saldo **já devolvido pelo servidor**, depois que a transação de F04 concluiu; não há débito local especulativo nem rollback. Segue `arquitetura.md` §5.4 (*"débitos offline têm risco de double-spend → preferir online-autoritativo"*) e ADR-006 §5, que rejeita explicitamente a opção "economia otimista no cliente". Consequência: **liberar carta exige estar online** — restrição a herdar e declarar em F04. | entrevista; `arquitetura.md` §5.4; ADR-006 §3/§5 | confirmada |
| 8 | **Store Zustand em vez de `useState` local.** `useCollection` (`build-deck/F01`) usa `useState` porque tem um consumidor; o saldo tem no mínimo dois independentes (o cabeçalho de F03 e a ação de liberar de F04, que precisa **escrever** nele). É a mesma justificativa que `stores/deck-draft-store.ts` (`build-deck/F05`, Decisão 2) já registra para o rascunho de deck, e a única escolha que `arquitetura.md` §7 deixa em aberto ("Zustand ou `useReducer` + context") — resolvida aqui pelo precedente do repositório. | `apps/web/src/stores/deck-draft-store.ts`; `arquitetura.md` §7 | confirmada |
| 9 | **Retificação da spec de `password/F03`.** A Seção 2 de `docs/specs/password/F03-entrada-e-validacao-de-senha/spec.md` declara `apps/web/src/hooks/use-wallet-balance.ts` como arquivo **novo dela**. Sob esta spec, o hook é entrega de F01 (Foundation) e F03 passa a **consumi-lo**; `components/password/star-balance.tsx` e a rota `/password` continuam sendo de F03. F03 ainda não foi implementada, então a retificação não invalida código algum — apenas a linha correspondente da tabela de alocação dela. F03 deve exibir `effectiveStars`, não `stars`. | entrevista; spec `password/F03` §2 | confirmada — requer nota na spec de F03 |
| 10 | **`LoadedWalletBalance` é estendido, não substituído.** Ganha `effectiveStars`, `pendingStars` e `pendingDuelIds`; `origin` e `stars` mantêm exatamente o significado atual. Como `loadWalletBalance` não tem consumidor hoje, a extensão não quebra nada, e a spec de F03 (que só lê `origin`) continua válida. | `packages/shared/src/economy/wallet.ts` (implementado); grep de consumidores | confirmada |
| 11 | **Migrações já aplicadas não são editadas.** F01 adiciona `0009_create_ensure_wallet.sql`; `0008` permanece byte-idêntica. Mesmo precedente de `0006` corrigindo `0005` por migração nova. | `TypeScript-development-guidelines.md` §22.3; precedente `0006` | confirmada |
| 12 | **As 24/98/999999 e a contagem 722 vs. 698 não são assunto de F01.** F01 não conhece preço nem senha; a divergência entre PRD e dataset já foi resolvida pela spec de F03 (Decisões 4 e 5). | spec `password/F03` | confirmada |
| 13 | Identificadores e comentários em inglês, mensagens de UI em Português — convenção do `CLAUDE.md`, seguida por todas as features anteriores. | `CLAUDE.md` | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---|---|---|---|
| `packages/shared/src/economy/constants.ts` | shared | novo | `INITIAL_WALLET_STARS` — ponto único do saldo inicial (Decisão 3). A spec de F03 também prevê este arquivo para `UNPRICED_CARD_STARS`/`PASSWORD_DIGIT_COUNT`: quem chegar primeiro cria, o outro acrescenta |
| `packages/shared/src/economy/wallet.ts` | shared | alterado | Acrescenta `effectiveStars`/`pendingStars`/`pendingDuelIds` a `LoadedWalletBalance` e o tipo `ReconciledWalletBalance`; tipos existentes inalterados |
| `packages/shared/src/economy/wallet-schema.ts` | shared | alterado | Acrescenta `EnsureWalletResponseSchema` (resposta snake_case do novo RPC) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta a constante e os novos tipos/schemas |
| `packages/rules/src/economy/reconcile-balance.ts` | rules | novo | `reconcileWalletBalance` — função pura: saldo persistido + fila + `duelId`s já aplicados → `ReconciledWalletBalance` |
| `packages/rules/src/economy/reconcile-balance.test.ts` | rules | novo | Unitários table-driven dos ramos de reconciliação |
| `packages/rules/src/economy/reconcile-balance.properties.test.ts` | rules | novo | Propriedades: nunca negativo, monotônico, total |
| `packages/rules/src/economy/index.ts` | rules | alterado | Reexporta `reconcileWalletBalance` |
| `supabase/migrations/0009_create_ensure_wallet.sql` | supabase | novo | RPC `ensure_wallet`, `SECURITY DEFINER`, `EXECUTE` só para `service_role` (Seção 5) |
| `apps/web/src/lib/wallet/ensure-wallet.ts` | web | novo | `EnsureWalletRepository` (porta) + `createSupabaseEnsureWalletRepository` — chama o RPC com o cliente service-role |
| `apps/web/src/lib/wallet/ensure-wallet.test.ts` | web | novo | Unitários com cliente Supabase falso |
| `apps/web/src/lib/wallet/applied-rewards-repository.ts` | web | novo | `AppliedRewardsRepository` — lê de `reward_ledger` quais `duelId` já estão aplicados (RLS select-own), consultando **apenas** os ids pendentes |
| `apps/web/src/lib/wallet/applied-rewards-repository.test.ts` | web | novo | Unitários: conjunto vazio, subconjunto, falha de leitura |
| `apps/web/src/lib/wallet/load-wallet.ts` | web | alterado | Passa a reconciliar (`reconcileWalletBalance`) antes de devolver, e a gravar o **saldo efetivo** no cache (Decisão 5) |
| `apps/web/src/lib/wallet/load-wallet.test.ts` | web | alterado | Acrescenta os ramos de reconciliação aos três já existentes |
| `apps/web/src/lib/initial-deck/on-account-created.ts` | web | alterado | Passa a garantir a carteira além do deck inicial; devolve o resultado de ambos |
| `apps/web/src/lib/initial-deck/on-account-created.test.ts` | web | novo/alterado | Cobre carteira criada, carteira já existente, falha na carteira |
| `apps/web/src/app/api/account/bootstrap/route.ts` | web | alterado | Reporta `createdNow` do deck **e** `walletCreatedNow` |
| `apps/web/src/stores/wallet-store.ts` | web | novo | Store Zustand: estado do saldo, `load()`, `setAuthoritativeBalance(stars)` (Decisão 8) |
| `apps/web/src/stores/wallet-store.test.ts` | web | novo | Transições de estado, rejeição de saldo inválido, escrita no cache |
| `apps/web/src/hooks/use-wallet-balance.ts` | web | novo (**era de F03** — Decisão 9) | Adaptador React fino sobre o store: dispara a carga uma vez e devolve o estado |
| `apps/web/src/hooks/use-wallet-balance.test.ts` | web | novo | `loading` / `ready` / `unavailable`, carga única |
| `apps/web/tests/wallet-single-source.test.ts` | web | novo | Análise estática: nenhum módulo fora de `lib/wallet/**` e `lib/reward/**` toca `wallets` |
| `apps/web/tests/wallet-reconciliation.integration.test.ts` | web | novo | Crédito offline → saldo efetivo → sincronização → saldo sem duplicar |

**Verificação da direção de dependências** (`shared ← data ← rules ← engine ← ai`, com `web` no topo):

- `packages/shared/src/economy/*` — não importa nenhum pacote do monorepo (raiz do grafo).
- `packages/rules/src/economy/reconcile-balance.ts` — importa **apenas** `@yugioh/shared`. Sem
  `@yugioh/data`, sem `@yugioh/engine`, sem React, DOM, `fetch`, `node:*` ou Supabase; respeita
  `domain-cores-are-pure` e `rules-depends-only-on-shared`. Os `duelId`s já aplicados entram por
  **injeção** (um `ReadonlySet<string>` montado no `web`), nunca por I/O dentro de `rules` — o
  mesmo padrão de `CardCatalogLookup`.
- `apps/web` importa `@yugioh/shared` e `@yugioh/rules`; nada importa `apps/web` de volta.
- `apps/web/src/lib/wallet/**` continua sem importar `apps/web/src/lib/free-duel/**`
  (invariante da Decisão 2 de `free-duel/F07`, preservada). A dependência nova é a inversa e
  aceitável: `lib/wallet/load-wallet.ts` importa a **porta** `VictoryRewardQueue` de
  `lib/reward/victory-reward-queue.ts`, que é genérica e não conhece Free Duel.
- Nenhum arquivo desta feature importa `packages/engine` ou `packages/ai` — F01 não participa do
  motor de duelo, e por isso não há seção de PRNG/determinismo de duelo.
- `0009` não altera `0001`–`0008`.

## 3. Design Técnico

### Estruturas de dados

**`ReconciledWalletBalance`** (`packages/shared`) — a saída da função pura:

| Campo | Tipo | Semântica |
|---|---|---|
| `persistedStars` | `number` | Inteiro `≥ 0` — o saldo tal como veio da origem (servidor ou cache) |
| `pendingStars` | `number` | Inteiro `≥ 0` — soma dos créditos enfileirados ainda **não** confirmados no ledger |
| `effectiveStars` | `number` | Inteiro `≥ 0` — o saldo a exibir e a usar em `saldo ≥ preço` |
| `pendingDuelIds` | `readonly string[]` | Os `duelId` que compõem `pendingStars`, em ordem de `queuedAt` — o "identificador" da reconciliação exigida pelo PRD |

**`LoadedWalletBalance`** (estendido, Decisão 10):

```
{ origin: "server" | "cache"; stars: number; effectiveStars: number;
  pendingStars: number; pendingDuelIds: readonly string[]; syncedAt: string }
```

`stars` continua sendo o saldo da origem; `effectiveStars` é o que a UI mostra. Quando não há
fila pendente, `effectiveStars === stars` e `pendingStars === 0` — o caso comum.

**`WalletBalanceState`** (`apps/web/src/stores/wallet-store.ts`):

```
| { status: "idle" }
| { status: "loading" }
| { status: "ready"; loaded: LoadedWalletBalance }
| { status: "unavailable"; error: DomainError }
```

### Algoritmo de reconciliação (`packages/rules`, puro)

`reconcileWalletBalance({ origin, persistedStars, pending, appliedDuelIds })`:

1. Se `persistedStars` não é inteiro `≥ 0` → `err("invalid_wallet_balance")`. A função é total:
   nunca lança, mesmo para `NaN`/`Infinity`.
2. Se `origin === "cache"`: o snapshot local **já inclui** os créditos offline (Decisão 5).
   Devolve `persistedStars` como `effectiveStars`, `pendingStars = 0`, e `pendingDuelIds` com os
   ids ainda enfileirados — usados só como sinal visual de "sincronizando…".
3. Se `origin === "server"`: filtra `pending` mantendo os itens cujo `duelId` **não** está em
   `appliedDuelIds`; soma seus `stars` em `pendingStars`;
   `effectiveStars = persistedStars + pendingStars`.
4. Itens duplicados por `duelId` na fila contam **uma vez** (a fila é chaveada por `duelId` no
   IndexedDB, mas a função não confia nisso e deduplica).

Invariantes garantidas: `effectiveStars ≥ persistedStars ≥ 0`, `effectiveStars` inteiro, e
`appliedDuelIds ⊇ todos os duelId da fila ⇒ effectiveStars === persistedStars` (nenhuma estrela
criada depois que o servidor confirmou tudo).

### Fluxo — leitura do saldo (`loadWalletBalance`, alterado)

1. Sem `playerId` → `err("session_missing")` (inalterado).
2. Lê `wallets` pelo repositório Supabase (inalterado).
3. Lê a fila local `victoryRewardQueue.listPendingRewards(playerId)`. Falha de IndexedDB é
   tratada como fila vazia — degradar para "sem créditos pendentes" nunca cria estrelas.
4. **Só se a fila não estiver vazia e a leitura do servidor tiver funcionado**, consulta
   `appliedRewardsRepository.listApplied(playerId, duelIds)` — um único `select duel_id from
   reward_ledger where player_id = ? and duel_id in (?)`. Falha dessa consulta ⇒ trata o
   conjunto como **todos aplicados** (`pendingStars = 0`), o lado conservador: prefere mostrar
   menos a inventar estrelas.
5. Chama `reconcileWalletBalance` com `origin: "server"`.
6. Grava no cache o snapshot com `stars = effectiveStars` (Decisão 5), preservando a invariante
   de que o cache é sempre a melhor estimativa local. Falha de escrita não invalida o resultado.
7. Devolve `origin: "server"` com os quatro campos.
8. Se a leitura do servidor falhou: lê o snapshot do cache, chama `reconcileWalletBalance` com
   `origin: "cache"`, devolve `origin: "cache"` (a UI de F03 exibe "Saldo carregado do cache;
   sincronizando…"). Sem snapshot ⇒ `err("wallet_unavailable")` — **nunca** `0` por engano.

### Fluxo — criação da carteira no cadastro (`onAccountCreated`, alterado)

9. Semeia deck inicial e coleção como hoje (`ensureInitialDeck`, `build-deck/F02`) —
   comportamento inalterado.
10. Chama `ensureWalletRepository.ensure(playerId, INITIAL_WALLET_STARS)` com o cliente
    service-role.
11. Devolve `{ initialDeck, wallet: { stars, createdNow } }`. Falha na carteira ⇒ `Result` de
    erro e a rota responde `503`; como as duas operações são idempotentes, o cliente
    simplesmente repete a chamada de bootstrap.
12. A rota `/api/account/bootstrap` responde `{ createdNow, walletCreatedNow }`.

### Fluxo — saldo reativo (`useWalletStore` / `useWalletBalance`)

13. `useWalletBalance()` dispara `load()` na primeira montagem se o estado é `idle`; montagens
    subsequentes reaproveitam o estado já carregado — o saldo não é recarregado a cada tela.
14. `load()` resolve `playerId` (`getAuthenticatedPlayerId`) e compõe as dependências reais
    (repositório Supabase, cache IndexedDB, fila, `reward_ledger`, `clock`), no mesmo formato de
    `useCollection`.
15. `setAuthoritativeBalance(stars)` (F04, depois que a RPC de débito retornou): valida inteiro
    `≥ 0` — valor inválido é **ignorado com log**, nunca aplicado, para que o saldo exibido não
    possa ficar negativo; substitui `stars` **e** `effectiveStars` no estado e regrava o snapshot
    do cache. Não mexe em `pendingStars` (créditos pendentes seguem pendentes).

### Regras de negócio

- **O saldo nunca é negativo**, em nenhum caminho: `check (stars >= 0)` no Postgres,
  `z.number().int().min(0)` no schema, guarda em `setAuthoritativeBalance`, e
  `effectiveStars ≥ persistedStars ≥ 0` por construção na função pura.
- **`wallets` só é escrita por RPC `SECURITY DEFINER`** — nunca por `insert`/`update` direto do
  cliente (não há política de escrita na tabela). Nenhum valor de saldo é confiado ao cliente.
- **`ensure_wallet` nunca sobrescreve um saldo existente** — só insere quando não há linha.
- **F01 não credita nem debita.** Crédito é `apply_victory_reward` (F02, já implementado);
  débito é F04.
- **Fonte única:** nenhum módulo mantém saldo paralelo; travado por teste (Seção 7).

### Pureza e determinismo

`reconcileWalletBalance` é pura e total: sem I/O, sem relógio, sem `Math.random()`, saída função
apenas das entradas, nunca lança. Toda a leitura de fila e de ledger acontece em `apps/web` e
entra na função como valores — o mesmo padrão de injeção que `packages/rules` já usa para o
catálogo. F01 não toca `packages/engine`, portanto não há PRNG semeado nem estado de duelo a
declarar.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/economy/constants.ts
/**
 * Saldo com que uma conta nova nasce. PENDÊNCIA DE BALANCEAMENTO
 * (arquitetura.md §10): `0` é a sugestão registrada no PRD, não um valor final.
 * Este é o único lugar onde o número existe.
 */
export const INITIAL_WALLET_STARS = 0;
```

```ts
// packages/shared/src/economy/wallet.ts (alterado)
export type ReconciledWalletBalance = Readonly<{
  persistedStars: number;
  pendingStars: number;
  effectiveStars: number;
  pendingDuelIds: readonly string[];
}>;

export type LoadedWalletBalance = Readonly<{
  origin: "server" | "cache";
  stars: number;
  effectiveStars: number;
  pendingStars: number;
  pendingDuelIds: readonly string[];
  syncedAt: string;
}>;
```

```ts
// packages/shared/src/economy/wallet-schema.ts (alterado)
export const EnsureWalletResponseSchema = z.strictObject({
  stars: z.number().int().min(0),
  created_now: z.boolean(),
});
```

Novos códigos de `DomainError`: `invalid_wallet_balance` (reconciliação com entrada
estruturalmente inválida), `wallet_bootstrap_failed` (falha ao garantir a carteira no cadastro).
Reusado sem redefinição: `wallet_unavailable`, `session_missing`.

### Funções públicas

```ts
// packages/rules/src/economy — puro, sem I/O
export type ReconcileWalletBalanceInput = Readonly<{
  origin: "server" | "cache";
  persistedStars: number;
  pending: readonly PendingVictoryReward[];
  appliedDuelIds: ReadonlySet<string>;
}>;

export function reconcileWalletBalance(
  input: ReconcileWalletBalanceInput,
): Result<ReconciledWalletBalance, DomainError>;
  // pós: persistedStars não inteiro ou < 0  ⇒ err('invalid_wallet_balance')
  //      origin 'cache'                     ⇒ effectiveStars === persistedStars, pendingStars === 0
  //      origin 'server'                    ⇒ effectiveStars === persistedStars + soma dos pendentes não aplicados
  //      appliedDuelIds cobre toda a fila   ⇒ effectiveStars === persistedStars
  //      sempre: effectiveStars >= persistedStars >= 0, inteiro
  //      total: nunca lança (NaN, Infinity, fila vazia, duplicatas)
```

```ts
// apps/web/src/lib/wallet — fronteira de I/O

export type AppliedRewardsRepository = Readonly<{
  /** Subconjunto de `duelIds` já registrado em `reward_ledger` para este jogador. */
  listApplied(playerId: string, duelIds: readonly string[]): Promise<Result<ReadonlySet<string>, DomainError>>;
}>;

export type EnsureWalletRepository = Readonly<{
  /** Idempotente: cria a carteira com `initialStars` só se ainda não existir. */
  ensure(playerId: string, initialStars: number): Promise<Result<EnsuredWallet, DomainError>>;
}>;

export type EnsuredWallet = Readonly<{ stars: number; createdNow: boolean }>;

export type LoadWalletBalanceDeps = Readonly<{
  playerId: string | undefined;
  repository: WalletRepository;          // existente
  cache: WalletCache;                    // existente
  queue: VictoryRewardQueue;             // novo — porta já existente em lib/reward
  appliedRewards: AppliedRewardsRepository; // novo
  clock: Clock;
}>;

export async function loadWalletBalance(
  deps: LoadWalletBalanceDeps,
): Promise<Result<LoadedWalletBalance, DomainError>>;
  // pós: sem sessão                          ⇒ err('session_missing')
  //      servidor ok, fila vazia             ⇒ ok(origin 'server', effectiveStars === stars), 0 consultas ao ledger
  //      servidor ok, fila com não aplicados ⇒ ok(origin 'server', effectiveStars > stars)
  //      servidor ok, ledger indisponível    ⇒ ok(origin 'server', pendingStars === 0)  [conservador]
  //      servidor falha, cache presente      ⇒ ok(origin 'cache', effectiveStars === stars do cache)
  //      servidor e cache falham             ⇒ err('wallet_unavailable')  — nunca 0
```

```ts
// apps/web/src/stores/wallet-store.ts
export type WalletStore = Readonly<{
  state: WalletBalanceState;
  load(): Promise<void>;
  /** F04: saldo já debitado e devolvido pelo servidor. Valor inválido é ignorado com log. */
  setAuthoritativeBalance(stars: number): void;
}>;
```

Exemplo de estado devolvido por `loadWalletBalance` com um crédito offline pendente:

```json
{
  "origin": "server",
  "stars": 1240,
  "effectiveStars": 1290,
  "pendingStars": 50,
  "pendingDuelIds": ["b3f0b6b0-6b8e-4e9d-9c1a-7e6f2a1d4c9b"],
  "syncedAt": "2026-07-31T13:42:00.000Z"
}
```

Depois que a fila drena e `reward_ledger` passa a conter aquele `duelId`:

```json
{
  "origin": "server",
  "stars": 1290,
  "effectiveStars": 1290,
  "pendingStars": 0,
  "pendingDuelIds": [],
  "syncedAt": "2026-07-31T13:44:00.000Z"
}
```

Os valores `1240`/`50` são ilustrativos da forma — não são valores de balanceamento reais.

### RPC `ensure_wallet` (Postgres, `SECURITY DEFINER`)

```
ensure_wallet(p_player_id uuid, p_initial_stars integer)
  returns table (stars integer, created_now boolean)
```

Comportamento (algoritmo, não código):

1. Rejeita `p_initial_stars < 0`.
2. `insert into wallets (player_id, stars) values (p_player_id, p_initial_stars)
   on conflict (player_id) do nothing`.
3. Se inseriu ⇒ devolve `(p_initial_stars, true)`. Se não inseriu ⇒ lê o saldo atual e devolve
   `(saldo_atual, false)` — **nunca sobrescreve**.
4. **Não** há guarda `p_player_id = auth.uid()`, e é deliberado: como `persist_initial_deck`,
   esta função é executada com o cliente **service-role** a partir da rota de bootstrap, que já
   deriva o `playerId` **verificando o bearer token** (nunca do corpo da requisição). `EXECUTE`
   é revogado de `public`/`anon`/`authenticated` e concedido apenas a `service_role`, de modo
   que nenhum cliente autenticado consegue invocá-la (Decisão 2).

Resposta do RPC:

```json
{ "stars": 0, "created_now": true }
```

### Contratos externos

- **`password/F03`** — consome `useWalletBalance()` e exibe `effectiveStars`; o ramo
  `origin: "cache"` dispara a mensagem "Saldo carregado do cache; sincronizando…" e o estado
  `unavailable` mantém o veredito de pagamento como "desconhecido" (Decisão 7 da spec de F03),
  nunca habilitando a liberação.
- **`password/F04`** — chama `setAuthoritativeBalance(saldoDevolvidoPelaRPC)` depois que a
  transação de débito conclui, e deve mutar **a linha de `wallets`** dentro da mesma RPC que
  incrementa `collections` (Decisão 6).
- **`free-duel/F07`** — `apply_victory_reward`, `pendingVictoryRewards` e `syncVictoryRewardQueue`
  permanecem **inalterados**. F01 apenas **lê** a fila e o ledger.

## 5. Modelo de Dados

### Postgres — nova migração `0009_create_ensure_wallet.sql`

Nenhuma tabela nova. `wallets` (criada em `0008`) permanece exatamente como está:

| Coluna | Tipo | Constraint |
|---|---|---|
| `player_id` | `uuid` | PK, `references auth.users(id) on delete cascade` |
| `stars` | `integer` | `not null default 0 check (stars >= 0)` |
| `updated_at` | `timestamptz` | `not null default now()` |

RLS já ligada, política `wallets_select_own`, sem política de escrita (único escritor = RPC
`SECURITY DEFINER`), grants já concedidos em `0008`. A PK `player_id` é o que dá a
**serialização por conta** da Decisão 6: crédito e débito concorrentes bloqueiam na mesma linha.

A migração `0009` acrescenta apenas a função:

- `ensure_wallet(uuid, integer)`, `language plpgsql`, `security definer`,
  `set search_path = public, pg_temp` (mesma regra de `apply_victory_reward`,
  `apply_card_reward` e `persist_initial_deck`).
- `revoke execute ... from public, anon, authenticated`; `grant execute ... to service_role`
  — deliberadamente mais restrito que `apply_victory_reward`, porque o **chamador escolhe o
  valor** (Decisão 2). Sem o `GRANT` explícito a função seria inalcançável até para o
  service-role: este projeto não tem privilégios default no schema `public` (`CLAUDE.md`).

`reward_ledger` (`0005`) é apenas **lida** por F01, sob a política `reward_ledger_select_own` já
existente. Nenhuma coluna nova, nenhum índice novo: a consulta de reconciliação filtra por
`player_id` + `duel_id in (...)`, e `duel_id` já é `unique`.

### Cache local (IndexedDB)

`DATABASE_VERSION` **não sobe** — nenhuma object store nova. A store `walletBalance`
(`WALLET_BALANCE_STORE_NAME`, criada por `free-duel/F07` na versão 5) continua guardando
`{ playerId, stars, syncedAt }`; muda apenas **o que** é gravado ali: o saldo **efetivo** em vez
do saldo cru do servidor (Decisão 5). A forma do registro é idêntica, então snapshots já
gravados continuam válidos e `WalletBalanceSchema` não muda.

A fila `pendingVictoryRewards` é lida, nunca escrita por F01.

### Dado de balanceamento pendente

`INITIAL_WALLET_STARS = 0` é o **único** número de balanceamento introduzido, e é a sugestão
literal do PRD, isolada num ponto único para troca sem caça a constantes. `N` estrelas por
vitória continua fora de F01 (vem do Rating Engine via `free-duel/F05`). Nenhum valor de
guardião, terreno, fusão, drop ou rating é tocado.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Falha ao carregar o saldo do servidor | `repository.load` devolve erro | Usa o snapshot do cache; `origin: "cache"` | "Saldo carregado do cache; sincronizando…" (renderizada por F03) |
| Falha no servidor **e** ausência de snapshot | ambos falham | `err("wallet_unavailable")` — **nunca** assume `0` | "Não foi possível carregar seu saldo." + veredito de pagamento "desconhecido" (F03) |
| Créditos offline pendentes (divergência local↔servidor) | fila não vazia + `duelId` ausente de `reward_ledger` | `effectiveStars = stars + pendingStars`; nada é "criado" nem "some" | "Sincronizando N⭐ ganhas offline…" |
| Item já aplicado no servidor mas ainda na fila | `duelId` **presente** em `reward_ledger` | Não é somado — evita contagem dupla (Decisão 4) | nenhuma (transparente) |
| `reward_ledger` inacessível (rede/RLS) | `listApplied` devolve erro | Trata como "todos aplicados": `pendingStars = 0`. Lado conservador — prefere exibir menos a criar estrelas | nenhuma; a sincronização corrige na próxima leitura |
| IndexedDB indisponível (aba privada, quota) | `listPendingRewards` lança | Trata como fila vazia; a leitura do servidor segue normalmente | nenhuma |
| Sessão ausente ao carregar | `getAuthenticatedPlayerId` devolve `undefined` | `err("session_missing")`; nenhuma leitura é tentada | "Faça login novamente." (F03/F04) |
| Falha ao garantir a carteira no cadastro | `ensure` devolve erro | `onAccountCreated` devolve erro; rota responde `503`; nada fica meio-criado (as duas operações são idempotentes e o retry repara) | "Não foi possível preparar sua conta. Tente novamente." |
| Bootstrap chamado duas vezes | `on conflict do nothing` no RPC | `created_now: false`, saldo intacto — **jamais** re-credita o saldo inicial | nenhuma |
| Conta antiga, criada antes de `ensure_wallet` existir | bootstrap roda a cada login (comentário da rota) | A carteira é criada na próxima entrada, com `INITIAL_WALLET_STARS` | nenhuma |
| Carteira sem linha e sem bootstrap executado | `maybeSingle` devolve `null` | Adaptador existente já devolve `{ stars: 0 }` — comportamento preservado como rede de segurança | nenhuma |
| `setAuthoritativeBalance` com valor negativo/não inteiro | guarda no store | Ignorado com log de erro; o saldo exibido permanece o anterior — nunca negativo | nenhuma (erro de integração, não de jogo) |
| Vitória e liberação simultâneas na mesma conta | bloqueio de linha na PK de `wallets` | As transações serializam; nenhuma leitura-modificação-escrita perdida | nenhuma |
| `persistedStars` estruturalmente inválido vindo do servidor | `reconcileWalletBalance` | `err("invalid_wallet_balance")`, propagado como carteira indisponível — nunca um saldo inventado | "Não foi possível carregar seu saldo." |

## 7. Estratégia de Testes

### Unitários (Vitest)

`reconcileWalletBalance` (`packages/rules`) — table-driven:

- `reconcileWalletBalance returns the persisted balance unchanged when the queue is empty`
- `reconcileWalletBalance adds only pending credits absent from the applied ledger set`
- `reconcileWalletBalance ignores a pending credit whose duelId is already in the ledger`
- `reconcileWalletBalance counts a duplicated duelId in the queue exactly once`
- `reconcileWalletBalance does not add pending credits when origin is cache`
- `reconcileWalletBalance reports pendingDuelIds ordered by queuedAt`
- `reconcileWalletBalance rejects a negative persisted balance with invalid_wallet_balance`
- `reconcileWalletBalance rejects a non-integer persisted balance with invalid_wallet_balance`

`loadWalletBalance` (`apps/web`, dependências falsas):

- `loadWalletBalance returns the server balance and writes the effective balance to cache`
- `loadWalletBalance does not query the ledger when the pending queue is empty`
- `loadWalletBalance adds unsynced offline credits to the effective balance`
- `loadWalletBalance treats an unreachable ledger as fully applied and never inflates the balance`
- `loadWalletBalance treats an unavailable IndexedDB queue as empty`
- `loadWalletBalance falls back to the cached balance without adding the queue again`
- `loadWalletBalance returns wallet_unavailable when both the server and the cache fail`
- `loadWalletBalance returns session_missing without any read when there is no player id`

`createSupabaseEnsureWalletRepository` / `AppliedRewardsRepository` (`apps/web`, cliente falso):

- `ensureWallet returns createdNow true when the rpc inserts the row`
- `ensureWallet returns createdNow false and the existing balance when the row already exists`
- `ensureWallet returns wallet_bootstrap_failed when the rpc errors`
- `listApplied returns only the duel ids present in reward_ledger`
- `listApplied returns an empty set for an empty input without calling the database`
- `listApplied returns an error when the reward_ledger read fails`

`onAccountCreated` / rota de bootstrap (`apps/web`):

- `onAccountCreated ensures the wallet with INITIAL_WALLET_STARS after seeding the initial deck`
- `onAccountCreated reports walletCreatedNow false on a second call for the same player`
- `onAccountCreated returns an error when ensuring the wallet fails`
- `bootstrap route responds with createdNow and walletCreatedNow`

`useWalletStore` / `useWalletBalance` (`apps/web`, `// @vitest-environment jsdom`):

- `useWalletStore transitions idle to loading to ready on a successful load`
- `useWalletStore transitions to unavailable when the load fails`
- `setAuthoritativeBalance replaces stars and effectiveStars and rewrites the cache snapshot`
- `setAuthoritativeBalance ignores a negative value and keeps the previous balance`
- `setAuthoritativeBalance ignores a non-integer value and keeps the previous balance`
- `useWalletBalance triggers the load exactly once across two mounted consumers`

### Property-based (fast-check)

- **Não-negatividade e monotonicidade:** para qualquer `persistedStars` inteiro `≥ 0`, qualquer
  fila e qualquer conjunto de aplicados, `effectiveStars ≥ persistedStars ≥ 0` e
  `effectiveStars` é inteiro. 1.000 execuções.
- **Nenhuma estrela criada após a sincronização:** se `appliedDuelIds` contém todos os `duelId`
  da fila, então `effectiveStars === persistedStars` — a propriedade que fecha o risco de
  contagem dupla. 1.000 execuções.
- **Nenhuma estrela perdida antes da sincronização:** se `appliedDuelIds` está vazio,
  `effectiveStars === persistedStars + soma dos stars distintos por duelId`. 1.000 execuções.
- **Totalidade:** para qualquer número (incluindo `NaN`, `Infinity`, negativos, não inteiros) e
  qualquer fila arbitrária, `reconcileWalletBalance` nunca lança — sempre devolve `Result`.
- **Idempotência de `ensure_wallet` na orquestração:** chamar `onAccountCreated` de 1 a 20 vezes
  para o mesmo `playerId` produz exatamente uma criação de carteira. 1.000 execuções.

### Integração

`apps/web/tests/wallet-reconciliation.integration.test.ts`:

- `an offline victory credit shows in the effective balance before it syncs`
- `the same credit stops being added once reward_ledger confirms it, without changing the total`
- `draining the queue leaves the effective balance identical to the server balance`
- `a fresh account bootstraps a wallet with INITIAL_WALLET_STARS and reads it back`

Testes de RPC contra o Supabase local (`pnpm test:integration`, `describe.skipIf(!hasSupabaseEnv)`
— exportar `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` antes de confiar no
verde, conforme `CLAUDE.md`):

- `ensure_wallet creates the row once and is a no-op on the second call`
- `ensure_wallet never overwrites an existing balance`
- `ensure_wallet rejects a negative initial amount`
- `ensure_wallet is not executable by an authenticated (non service-role) client`
- `a concurrent apply_victory_reward and wallet read never observe a negative or lost balance`

### Análise estática

`apps/web/tests/wallet-single-source.test.ts` e verificação de imports:

- `no module outside lib/wallet and lib/reward references the wallets table` — trava a
  Capability "fonte única da verdade; nenhum outro módulo mantém saldo paralelo".
- `packages/rules/src/economy/**` não importa `packages/data`, `packages/engine`, `packages/ai`,
  React, DOM, `fetch`, `node:*` nem Supabase (regras `rules-depends-only-on-shared` e
  `domain-cores-are-pure`). Verificado por leitura de imports, não por confiança no
  `dependency-cruiser` — que hoje não resolve imports de workspace (`CLAUDE.md`).
- `packages/shared/src/economy/**` não importa nenhum pacote do monorepo.
- `apps/web/src/lib/wallet/**` não importa `apps/web/src/lib/free-duel/**` (invariante herdada de
  `free-duel/F07`, Decisão 2).
- Migrações `0001`–`0008` permanecem byte-idênticas; apenas `0009` é adicionada.
- `pnpm typecheck` e `pnpm lint` passam sem novos avisos.

### Testes de aceitação (critérios do PRD §9, F01)

| Critério | Teste |
|---|---|
| O saldo é um inteiro `≥ 0` e **nunca** assume valor negativo em nenhuma operação | Propriedade de não-negatividade + `setAuthoritativeBalance ignores a negative value...` + `check (stars >= 0)` exercido por `ensure_wallet rejects a negative initial amount` |
| O saldo persiste na conta (servidor + cache local) e é o mesmo em qualquer dispositivo após a sincronização | `loadWalletBalance returns the server balance and writes the effective balance to cache` + `draining the queue leaves the effective balance identical to the server balance` |
| Créditos (F02) e débitos (F04) são atômicos e serializados por conta, sem corrida entre vitória e liberação simultâneas | `a concurrent apply_victory_reward and wallet read never observe a negative or lost balance` + Decisão 6 (a mesma linha de `wallets` é o ponto de serialização; F04 herda a invariante) |
| Falha ao carregar o saldo recorre ao cache local com aviso e não assume `0` por engano | `loadWalletBalance falls back to the cached balance...` + `loadWalletBalance returns wallet_unavailable when both the server and the cache fail` |
| **(Pendente — balanceamento)** Novas contas começam com o saldo inicial definido (default sugerido `0⭐`) | `onAccountCreated ensures the wallet with INITIAL_WALLET_STARS...` + `a fresh account bootstraps a wallet with INITIAL_WALLET_STARS and reads it back` — o valor é uma constante única, revalidável sem mudar teste algum |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: o saldo exibido (F01) sempre reflete todos os créditos (F02) menos todos os débitos (F04), sem divergência | `an offline victory credit shows in the effective balance before it syncs` + `the same credit stops being added once reward_ledger confirms it...` + propriedades de "nenhuma estrela criada/perdida" |
| Cross-Feature: fluxo F02 → F03 → F04 → F05 sem estado inconsistente entre saldo e coleção | Coberto na parte de F01 por `setAuthoritativeBalance replaces stars and effectiveStars...`; o fluxo completo é teste de F04 (a RPC transacional ainda não existe) |
| Cross-PRD (**Save/persistência**): saldo persiste na conta e sobrevive à troca de dispositivo | `a fresh account bootstraps a wallet with INITIAL_WALLET_STARS and reads it back` + `ensure_wallet never overwrites an existing balance` (um segundo dispositivo não reseta o saldo) |
| Cross-PRD (**módulos de duelo**): o evento de vitória credita estrelas exatamente uma vez, com o mesmo `duel_id`, sem duplicação | Já coberto por `free-duel/F07` (`apply_victory_reward`); F01 acrescenta a garantia de que a **exibição** também não duplica: `reconcileWalletBalance ignores a pending credit whose duelId is already in the ledger` |
| Cross-PRD (**Build Deck**): a coleção não é duplicada por este módulo | Análise estática: nenhum arquivo de F01 escreve em `collections` |
