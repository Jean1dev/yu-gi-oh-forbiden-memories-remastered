# Carteira de Estrelas

> PRD: `docs/prds/free-duel.md` — F07
> Pacote-alvo: `packages/shared` + `packages/rules` (+ `apps/web`, `supabase/migrations`)

## 1. Contexto e Escopo

F07 fecha o segundo efeito do evento de vitória: enquanto F06 escolhe e credita **uma carta**,
F07 credita **N estrelas** — a quantidade que F05 já resolveu em `rating.reward.stars` — numa
**carteira única** (`wallets`), persistida em conta, com o mesmo rigor de idempotência e
atomicidade que `build-deck/F03` já provou para cartas.

O achado central desta spec, obrigatório antes de desenhar qualquer schema (instrução da tarefa):
`docs/specs/free-duel/F06-concessao-de-carta-drop-por-vitoria/spec.md`, na sua Decisão 8, já
registra que F07 **reaproveita `duelSessionId` como a mesma chave de idempotência de F06**
(`duel_id` em `reward_ledger`) e que a coluna `stars` dessa tabela já existe com `DEFAULT 0`,
**reservada e nunca escrita** por F06 (`supabase/migrations/0005_create_reward_ledger.sql`,
comentário explícito). `docs/arquitetura.md` §5.3 vai além e recomenda que os dois efeitos sejam
unificados num único handler `onVictory`, reaproveitando a mesma linha de `reward_ledger`/`duel_id`
— exatamente o que a Política de Auto-Aceite deste skill instrui a adotar diante de uma pendência
do §10/ADR `needs-input` (ADR-006, ainda "Proposto"): "adotar a recomendação já registrada em
`arquitetura.md`... marcar como premissa a confirmar".

### Decisão central: unificação com F06 (não duplicar idempotência por `duel_id`)

Das duas opções levantadas pela tarefa, esta spec adota a **opção (a): evoluir o RPC para um
`apply_victory_reward` único** que insere a **mesma linha** de `reward_ledger` já com `stars`
preenchido e incrementa `collections` **e** `wallets` na mesma transação — em vez da opção (b)
(uma segunda RPC lendo se a linha já tem `stars > 0` aplicado). Motivos:

- É a recomendação **explícita** de `docs/arquitetura.md` §5.3 ("Recomendo registrar isso como
  decisão nos PRDs") e de ADR-006 §4 ("um único registro idempotente de vitória"), não uma
  invenção desta spec.
- A opção (b) exigiria uma segunda condição de corrida: entre a chamada de F06 (que insere a linha
  com `stars = DEFAULT 0`) e a chamada de F07 (que tentaria fazer `UPDATE ... SET stars = ... WHERE
  duel_id = ... AND stars = 0`), duas chamadas concorrentes de F07 para o mesmo duelo poderiam ambas
  ler `stars = 0` antes de qualquer uma escrever, exigindo sua própria trava (`SELECT ... FOR
  UPDATE` ou um `UPDATE` condicional) — reimplementando, com uma superfície nova de bug, a mesma
  garantia que o `INSERT ... ON CONFLICT DO NOTHING` de `apply_card_reward` já oferece de graça.
  A opção (a) elimina essa segunda janela de corrida ao fundir os dois incrementos numa única
  inserção condicional.
- Evita que uma vitória possa, por definição de fluxo, creditar estrelas **sem** ter uma carta
  correspondente: com uma única chamada carregando `cardNumber` e `stars` juntos, não existe
  chamada de rede "só de F07" no caminho de produção (ver Decisão 6 abaixo, que trata explicitamente
  o cenário pedido pela tarefa: "linha de `reward_ledger` daquele `duel_id` não existe ainda").

O custo assumido, e a razão de esta ser a decisão mais cara desta spec: implica um **retrofit
leve na integração já implementada de F06** (`apps/web/src/lib/free-duel/grant-card-drop.ts` e seu
hook), descrito na Decisão 4 e na Seção 2. F06 não é redesenhada — sua função pura de seleção de
carta (`selectDropCardNumber`, `packages/rules`) é **reaproveitada sem alteração**; apenas o passo
de I/O que ela alimentava (chamar `registerCardReward`/`apply_card_reward`) passa a alimentar o
novo `applyVictoryReward`/`apply_victory_reward`, com `stars` como argumento adicional vindo de
`result.rating.reward.stars` (F05, já implementado, presente em ambos os ramos de
`ConsolidatedRating`).

### Incluído

- Contrato validável de carteira (`WalletBalance`), evento de recompensa de vitória unificado
  (`VictoryRewardEvent` = carta + estrelas + `duelId`) e resultado (`VictoryRewardResult`) em
  `packages/shared`
- Validação estrutural pura de `stars` (inteiro `≥ 0`) em `packages/rules`, no mesmo espírito de
  `validateRewardCardNumber` (F06/`build-deck F03`, já implementado)
- Nova tabela Postgres `wallets` (fonte única de saldo, desenhada para ser reaproveitada por
  `password`, ainda sem spec) e novo RPC `apply_victory_reward`, que **substitui** `apply_card_reward`
  como caminho de produção do evento de vitória do Free Duel, sem alterar as migrações já aplicadas
  (`0005`/`0006`)
- Orquestração `applyVictoryReward` (`apps/web`) no mesmo padrão de `registerCardReward`: validação
  de evento → deduplicação local → RPC → fallback offline enfileirado
- Fila offline dedicada (`pendingVictoryRewards`) e sincronização ao reconectar, no mesmo padrão de
  `recompensas_pendentes`/`syncRewardQueue` (`build-deck/F03`)
- Cache local de saldo (`wallets` no IndexedDB) e leitura com fallback servidor→cache
  (`loadWalletBalance`), no mesmo padrão de `loadCollection` (`build-deck/F01`)
- Retrofit do ponto de composição de F06 (`grant-card-drop.ts` → `grant-victory-reward.ts`) para
  que a mesma vitória gere **uma única chamada de rede** cobrindo carta e estrelas
- Exibição do crédito de estrelas na tela de resultado (F05), ao lado da carta conquistada (F06),
  a partir do mesmo resultado unificado — sem chamada de rede adicional

### Fronteiras

Delimitadas pela Seção 7 do PRD (Fora de Escopo) e pelos blocos Consumes/Provides das features
vizinhas:

- **Cálculo da quantidade de estrelas por nota** → **Rating Engine (cross-PRD)**, via **F05**. F07
  recebe `rating.reward.stars` já resolvido e nunca recalcula, arredonda ou reinterpreta esse
  número.
- **Escolha da carta e seu pool de drop** → **F06**. F07 não escolhe carta; apenas transporta o
  `cardNumber` que F06 já selecionou (função pura reaproveitada, Decisão 4).
- **Gasto/loja de estrelas** → módulo futuro (cross-PRD, "loja de cartas por senha"/`password`).
  F07 é **somente a fonte** de crédito; nenhuma rota de débito é criada aqui.
- **Regras de combate, turnos, IA, nota** → Motor de Duelo 1x1 / IA de NPCs / Rating Engine
  (cross-PRD); F07 não os toca.
- **Navegação pós-duelo** → F08, fora desta spec.

### Contratos externos assumidos

- **`packages/shared/src/duel/result.ts` (F05, já implementado)** — `ConsolidatedDuelResult` com
  ramo `status: "victory"` contendo `duelSessionId` e `rating: ConsolidatedRating`, cujos dois
  sub-ramos (`source: "rating_engine"` e `source: "minimum_fallback"`) carregam
  `reward: { stars: number, dropTier }`. F07 lê `rating.reward.stars` de qualquer um dos dois —
  a origem da nota não muda o comportamento de F07 (mesmo princípio já registrado por F06 para
  `dropTier`).
- **`packages/rules/src/drop-reward/select-drop-card.ts` (F06, já implementado)** —
  `selectDropCardNumber`, função pura e determinística por `duelSessionId`. F07 reaproveita esta
  função **sem alteração** para obter o `cardNumber` que acompanha o crédito unificado.
- **`apps/web/src/lib/reward/register-card-reward.ts` / RPC `apply_card_reward`
  (`build-deck/F03`, já implementado)** — permanecem no repositório **inalterados**, mas deixam de
  ser o caminho de produção do evento de vitória do Free Duel a partir desta feature (ver Decisão
  3). Continuam existindo como primitiva genérica de crédito de carta, caso outro fluxo não-vitória
  venha a precisar dela.
- **`banco-de-cartas` — catálogo de cartas (`CardCatalogLookup`)** — usado indiretamente pela
  validação de `cardNumber` dentro de `applyVictoryReward`, mesma dependência já injetada em
  `registerCardReward`.
- **`password` (cross-PRD, ainda sem spec)** — futuro consumidor/debitador da mesma tabela
  `wallets` e do mesmo `loadWalletBalance`. Não implementado aqui; a Decisão 2 explica como o
  desenho evita acoplamento ao Free Duel.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **Unificação com F06 via opção (a)**: novo RPC `apply_victory_reward(p_player_id, p_duel_id, p_card_numero, p_stars)` insere a mesma linha de `reward_ledger` (agora com `stars` preenchido) e incrementa `collections` e `wallets` na mesma transação, substituindo `apply_card_reward` como caminho de produção do evento de vitória. Ver justificativa completa acima. | `arquitetura.md` §5.3; ADR-006 (needs-input) §4/§6; F06 spec Decisão 8; instrução explícita da tarefa | a confirmar (ADR-006 segue "Proposto", não "Aceito") |
| 2 | **`wallets` é desenhada como tabela genérica e única**, sem nenhuma coluna ou nome específico de Free Duel (`player_id, stars, updated_at`), e seus adaptadores em `apps/web` vivem em `apps/web/src/lib/wallet/` — **não** em `apps/web/src/lib/free-duel/` — para que `password` (cross-PRD, ainda sem spec) possa ler/debitar o mesmo saldo sem importar nada com nome "free-duel". Apenas o RPC de **crédito por vitória** (`apply_victory_reward`) e a orquestração `grantVictoryReward` são específicos do evento de duelo; a tabela e a leitura de saldo não são. | `arquitetura.md` §5.1 ("`wallets`... unificar — ver 5.3"), §5.3; instrução explícita da tarefa | confirmada |
| 3 | **Migrações já aplicadas (`0005`, `0006`) não são editadas.** F07 adiciona uma migração nova (`0008`) que cria `wallets` e `apply_victory_reward`; `apply_card_reward`/`reward_ledger` continuam existindo exatamente como estão. `apply_card_reward` fica sem chamador de produção depois deste retrofit, mas não é removida nesta spec — decidir se/quando removê-la é uma revisão de implementação separada, fora do escopo de uma spec que não deve planejar migração destrutiva sem revisão explícita. | guidelines §22.3 ("apply migrations once", "keep destructive migrations explicit and reviewed"); precedente `0006` (nova migração para corrigir `0005`, nunca editada) | confirmada |
| 4 | **Retrofit de F06**: `apps/web/src/lib/free-duel/grant-card-drop.ts` e `apps/web/src/hooks/use-card-drop-reward.ts` (e seus testes) são substituídos por `grant-victory-reward.ts`/`use-victory-reward.ts`. A função pura `selectDropCardNumber` (`packages/rules`, F06) é reaproveitada **sem nenhuma alteração de assinatura**; o que muda é o passo de I/O, que passa a montar um `VictoryRewardEvent` (carta + `stars` de `result.rating.reward.stars`) e chamar `applyVictoryReward` em vez de `registerCardReward`. `CardDropReward.tsx` (F06) continua renderizando só a carta; um novo `StarsRewardBadge.tsx` (F07) renderiza só as estrelas — ambos a partir do **mesmo** `GrantedVictoryReward`, sem chamada de rede duplicada. | instrução explícita da tarefa ("a implementação vai precisar retroalimentar levemente a integração de F06"); F06 spec Decisão 8 | a confirmar na implementação |
| 5 | **Fonte de `stars` é `result.rating.reward.stars`** (`ConsolidatedRating`, qualquer um dos dois ramos — `rating_engine` ou `minimum_fallback`). Nenhuma quantidade de estrelas por vitória é inventada aqui — a Fase 0.4 do skill proíbe explicitamente "inventar N estrelas por vitória"; o valor sempre vem do Rating Engine (cross-PRD) via F05, já implementado. | Fase 0.4 do skill; `packages/shared/src/duel/result.ts` (já implementado, F05) | confirmada |
| 6 | **Resposta à pergunta central da tarefa** ("o que acontece se a linha de `reward_ledger` daquele `duel_id` não existir ainda"): sob o desenho unificado, **não existe caminho de produção que chame o crédito de estrelas isoladamente**. `grantVictoryReward` sempre executa a seleção de carta (pura, determinística) **antes** de chamar `applyVictoryReward`, e a chamada carrega `cardNumber` e `stars` juntos numa única inserção condicional (`ON CONFLICT (duel_id) DO NOTHING`) — não há uma "chamada de F07" que possa encontrar a linha ausente e decidir creditar estrelas sozinha. Se a seleção de carta falhar (`no_drop_candidates_available`, F06 Decisão 5), `grantVictoryReward` aborta **antes** de chamar o RPC: nem carta nem estrelas são creditadas, exatamente como F06 já faz para `registerCardReward`. A única forma de a linha nunca existir é `grantVictoryReward` nunca ter sido invocada (ex.: jogador fechou a tela antes do efeito rodar) — reabrir/re-renderizar a mesma sessão invoca a função de novo, e a chamada unificada (idempotente) aplica o crédito então; nada é perdido silenciosamente. | instrução explícita da tarefa; F06 spec Decisão 5 (fail-closed sem carta adivinhada), Decisão 6 (determinismo) | confirmada |
| 7 | **Linhas históricas** de `reward_ledger` já criadas por `apply_card_reward` antes deste retrofit existir mantêm `stars = 0` (o `DEFAULT` da coluna) permanentemente — não há reprocessamento retroativo. Um backfill, se algum dia desejado, é uma migração de dados explícita e separada, fora do escopo desta spec (nenhum valor é inventado para preencher o passado). | Fase 0.4 do skill (nunca inventar valores); `supabase/migrations/0005` (`stars integer not null default 0`) | confirmada |
| 8 | **Leitura de saldo (`loadWalletBalance`)** segue o mesmo formato servidor→cache→fallback de `loadCollection` (`build-deck/F01`, já implementado): é necessária para que o saldo seja observável fora da resposta pontual de uma vitória (PRD F07 Experience: "o saldo acompanha a conta entre sessões e dispositivos"), embora o núcleo pedido pelo PRD seja o crédito. | PRD F07 Experience/Provides ("Saldo de estrelas atualizado"); precedente `apps/web/src/lib/collection/load-collection.ts` | confirmada |
| 9 | **Fila offline dedicada** (`pendingVictoryRewards`/`PendingVictoryReward`), em vez de reaproveitar `recompensas_pendentes`/`PendingReward` (`build-deck/F03`): o schema existente não carrega `stars`, e alterá-lo quebraria o schema já validado por `PendingRewardSchema` e lido por código/testes já em produção. Nova store, `DATABASE_VERSION` de `apps/web/src/lib/collection/indexeddb-cache.ts` sobe de 4 para 5, no mesmo padrão incremental já usado por `build-deck/F07` (comentário do próprio arquivo: "adds stores alongside"). | guidelines §22.3 (migrações versionadas e determinísticas); `apps/web/src/lib/collection/indexeddb-cache.ts` (comentário de `DATABASE_VERSION`) | confirmada |
| 10 | **Mensagem de "sessão expirada" ao sincronizar** reaproveita o padrão de pré-condição já usado por `useRewardSync` (`getAuthenticatedPlayerId` retorna `undefined` → sincronização não roda) em vez de inventar uma detecção de erro de autenticação item a item dentro do laço de sincronização — `syncRewardQueue` já trata qualquer falha de item deixando-o na fila para a próxima tentativa, sem branch especial de auth. `useVictoryRewardSync` segue a mesma forma. | `apps/web/src/hooks/use-reward-sync.ts` e `apps/web/src/lib/reward/sync-reward-queue.ts` (já implementados) | confirmada |
| 11 | Sem divisão Core/Full Scope no PRD para F07 — a spec cobre o escopo completo da Seção 6 F07. | PRD §6 F07 | confirmada |
| 12 | **Concorrência**: a garantia de "no máximo uma aplicação efetiva por `duel_id`" de `apply_victory_reward` reaproveita o mesmo mecanismo já testado em `apply_card_reward` (`INSERT ... ON CONFLICT (duel_id) DO NOTHING` como porta única de decisão), estendido para também condicionar o incremento de `wallets` — não uma trava nova. | `supabase/migrations/0005_create_reward_ledger.sql`; guidelines §14.3 (testes de concorrência) | confirmada |
| 13 | Identificadores de código em inglês, mensagens de UI em português — mesma convenção de F05/F06. | CLAUDE.md; precedente F05/F06 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/economy/wallet.ts` | shared | novo | Tipos `WalletBalance`, `VictoryRewardEvent`, `VictoryRewardResult`, `PendingVictoryReward`, `LoadedWalletBalance` |
| `packages/shared/src/economy/wallet-schema.ts` | shared | novo | `WalletBalanceSchema`, `VictoryRewardEventSchema`, `PendingVictoryRewardSchema`, `ApplyVictoryRewardResponseSchema` |
| `packages/shared/src/index.ts` | shared | alterado | Exporta os novos tipos/schemas de `economy/wallet*` |
| `packages/rules/src/economy/victory-reward.ts` | rules | novo | `validateVictoryRewardStars` — validação pura estrutural de `stars` |
| `packages/rules/src/economy/index.ts` | rules | novo | Reexporta o subsistema |
| `packages/rules/src/economy/victory-reward.test.ts` | rules | novo | Unitários table-driven |
| `packages/rules/src/index.ts` | rules | alterado | Acrescenta os exports de `economy/` |
| `supabase/migrations/0008_create_wallets_and_apply_victory_reward.sql` | supabase | novo | Tabela `wallets`, RLS, grants, RPC `apply_victory_reward` (ver Seção 5) |
| `apps/web/src/lib/collection/indexeddb-cache.ts` | web | alterado | `DATABASE_VERSION` 4→5; acrescenta `WALLET_BALANCE_STORE_NAME` e `PENDING_VICTORY_REWARDS_STORE_NAME` ao upgrade |
| `apps/web/src/lib/collection/indexeddb-cache.test.ts` | web | alterado | Cobre a criação das duas novas stores no upgrade |
| `apps/web/src/lib/wallet/indexeddb-cache.ts` | web | novo | `WalletCache` (porta) + adaptador IndexedDB (`loadSnapshot`/`saveSnapshot` por `playerId`) — mesmo padrão de `collection/indexeddb-cache.ts`, deliberadamente fora de `lib/free-duel/` (Decisão 2) |
| `apps/web/src/lib/wallet/indexeddb-cache.test.ts` | web | novo | Unitários do adaptador |
| `apps/web/src/lib/wallet/supabase-repository.ts` | web | novo | `WalletRepository` (porta) + `createSupabaseWalletRepository` — leitura de `wallets` por `player_id` |
| `apps/web/src/lib/wallet/supabase-repository.test.ts` | web | novo | Unitários com cliente Supabase falso |
| `apps/web/src/lib/wallet/load-wallet.ts` | web | novo | `loadWalletBalance` — servidor → cache → fallback, espelha `load-collection.ts` |
| `apps/web/src/lib/wallet/load-wallet.test.ts` | web | novo | Unitários dos três ramos (`server`, `cache`, erro) |
| `apps/web/src/lib/reward/victory-reward-queue.ts` | web | novo | `VictoryRewardQueue` (porta) + adaptador IndexedDB para `pendingVictoryRewards` |
| `apps/web/src/lib/reward/victory-reward-queue.test.ts` | web | novo | Unitários do adaptador |
| `apps/web/src/lib/reward/victory-reward-repository.ts` | web | novo | `VictoryRewardRepository` (porta) + `createSupabaseVictoryRewardRepository`, chama o RPC `apply_victory_reward` |
| `apps/web/src/lib/reward/victory-reward-repository.test.ts` | web | novo | Unitários com cliente Supabase falso |
| `apps/web/src/lib/reward/apply-offline-victory-reward.ts` | web | novo | `applyOfflineVictoryReward` — transação IndexedDB única sobre coleção + carteira + fila pendente |
| `apps/web/src/lib/reward/apply-offline-victory-reward.test.ts` | web | novo | Unitários da transação combinada |
| `apps/web/src/lib/reward/apply-victory-reward.ts` | web | novo | `applyVictoryReward` — orquestração: validação → deduplicação local → RPC → fallback offline |
| `apps/web/src/lib/reward/apply-victory-reward.test.ts` | web | novo | Unitários table-driven, espelhando `register-card-reward.test.ts` |
| `apps/web/src/lib/reward/apply-victory-reward.properties.test.ts` | web | novo | Propriedades: nunca lança, idempotência sob concorrência |
| `apps/web/src/lib/reward/sync-victory-reward-queue.ts` | web | novo | `syncVictoryRewardQueue` — drena a fila ao reconectar, espelha `sync-reward-queue.ts` |
| `apps/web/src/lib/reward/sync-victory-reward-queue.test.ts` | web | novo | Unitários do dreno |
| `apps/web/src/hooks/use-victory-reward-sync.ts` | web | novo (substitui o papel de `use-reward-sync.ts` para o fluxo de vitória) | Dispara `syncVictoryRewardQueue` em `online`, mesmo padrão de `useRewardSync` |
| `apps/web/src/hooks/use-victory-reward-sync.test.ts` | web | novo | Unitários (`@vitest-environment jsdom`) |
| `apps/web/src/lib/free-duel/grant-victory-reward.ts` | web | novo (substitui `grant-card-drop.ts`) | Reaproveita `selectDropCardNumber` (F06) + `stars` de F05, monta `VictoryRewardEvent`, chama `applyVictoryReward`, memoiza por `duelSessionId` |
| `apps/web/src/lib/free-duel/grant-victory-reward.test.ts` | web | novo (substitui `grant-card-drop.test.ts`) | Unitários da orquestração unificada |
| `apps/web/src/lib/free-duel/grant-card-drop.ts` | web | **removido** | Superseded por `grant-victory-reward.ts` (Decisão 4) |
| `apps/web/src/lib/free-duel/grant-card-drop.test.ts` | web | **removido** | Superseded por `grant-victory-reward.test.ts` |
| `apps/web/src/hooks/use-card-drop-reward.ts` | web | **removido** | Superseded por `use-victory-reward.ts` |
| `apps/web/src/hooks/use-card-drop-reward.test.ts` | web | **removido** | Superseded por `use-victory-reward.test.ts` |
| `apps/web/src/hooks/use-victory-reward.ts` | web | novo | Dispara `grantVictoryReward` somente quando `result.status === "victory"` (mesma guarda de F06) |
| `apps/web/src/hooks/use-victory-reward.test.ts` | web | novo | Estados loading/resolved/indisponível; nunca chama fora de vitória |
| `apps/web/src/components/free-duel/stars-reward-badge.tsx` | web | novo | Exibe "+N estrelas" e o saldo atualizado; ramos offline/já-creditado |
| `apps/web/src/components/free-duel/stars-reward-badge.test.tsx` | web | novo | Testes dos ramos visuais |
| `apps/web/src/components/free-duel/card-drop-reward.tsx` | web | inalterado | F06 continua só a carta (Decisão 4) — nenhuma mudança aqui |
| `apps/web/src/components/free-duel/duel-result.tsx` | web | alterado | Passa a renderizar `StarsRewardBadge` ao lado de `CardDropReward`, ambos a partir do mesmo `GrantedVictoryReward` |
| `apps/web/src/components/free-duel/duel-result.test.tsx` | web | alterado | Cobre a composição com `StarsRewardBadge` |
| `apps/web/tests/free-duel-victory-reward.integration.test.tsx` | web | novo | Fluxo F03→F05→F06(seleção)→F07(crédito unificado) com portas externas controladas |

**Verificação da direção de dependências:**

- `packages/shared/src/economy/wallet*.ts` importa apenas outros arquivos de `packages/shared`
  (nenhuma dependência de pacote).
- `packages/rules/src/economy/victory-reward.ts` importa **apenas** `packages/shared` — nenhum
  import de `packages/data`, `packages/engine`, `packages/ai`, React, DOM, `fetch`, `node:*` ou
  Supabase (regra `rules-depends-only-on-shared` do `.dependency-cruiser.cjs`).
- `apps/web` importa `packages/shared`, `packages/rules` e `packages/data` — nenhum import na
  direção contrária. Nenhum arquivo desta feature importa `packages/engine` ou `packages/ai`.
- `apps/web/src/lib/wallet/**` não importa nada de `apps/web/src/lib/free-duel/**` nem de
  `apps/web/src/hooks/use-victory-reward*` — a leitura/cache de carteira é genérica (Decisão 2);
  é `grant-victory-reward.ts` (em `lib/free-duel/`) que importa de `lib/wallet/` e `lib/reward/`,
  nunca o inverso.
- A única migração nova (`0008`) não altera `0001`-`0007`; `apply_card_reward` e `reward_ledger`
  permanecem exatamente como estão.

## 3. Design Técnico

### Estruturas de dados

**`WalletBalance`** (`packages/shared`) — o saldo em si:

| Campo | Tipo | Semântica |
|---|---|---|
| `playerId` | `string` | Dono do saldo |
| `stars` | `number` | Inteiro `≥ 0` — saldo atual |

**`LoadedWalletBalance`** — análogo a `LoadedCollection` (F01): `{ origin: "server" \| "cache";
stars: number; syncedAt: string }`.

**`VictoryRewardEvent`** (`packages/shared`) — o evento unificado que `grantVictoryReward` monta e
`applyVictoryReward` consome:

| Campo | Tipo | Semântica |
|---|---|---|
| `playerId` | `string` | Jogador vencedor |
| `duelId` | `string` | = `duelSessionId` da sessão encerrada — a mesma chave de F06 |
| `cardNumber` | `CardNumber` | A carta já escolhida por `selectDropCardNumber` (F06, reaproveitada) |
| `stars` | `number` | Inteiro `≥ 0` — de `result.rating.reward.stars` (F05) |

**`VictoryRewardResult`** — o que `applyVictoryReward` devolve, análogo a `RewardResult` (F06) mas
cobrindo os dois efeitos:

| Status | Campos | Semântica |
|---|---|---|
| `applied` | `cardQuantity: number; walletStars: number` | Esta chamada creditou carta e estrelas no servidor |
| `applied_offline` | `localCardQuantity: number; localWalletStars: number` | Creditado apenas no cache local; enfileirado |
| `already_applied` | `cardQuantity?: number; walletStars?: number` | `duelId` já processado — nenhum incremento novo |

**`PendingVictoryReward`** — `Readonly<{ duelId: string; playerId: string; cardNumber: CardNumber;
stars: number; queuedAt: string }>` — mesma forma de `PendingReward` (F06/`build-deck F03`) mais
`stars`.

### Fluxo

**Orquestração (`apps/web`, `grantVictoryReward`, substitui `grantCardDrop` como caminho de
produção)**

1. Recebe `result: Extract<ConsolidatedDuelResult, { status: "victory" }>` e o `dropPool` do
   duelista (mesma entrada de F06).
2. Consulta o cache em memória por `duelSessionId` (mesmo padrão de F05/F06). Se já há um
   `GrantedVictoryReward`, devolve-o sem recalcular.
3. Chama `selectDropCardNumber` (F06, **inalterada**) para obter o `cardNumber`. Erro de seleção
   (`no_drop_candidates_available`) **aborta aqui**: nenhuma chamada a `applyVictoryReward`, nem
   carta nem estrelas são creditadas (Decisão 6).
4. Lê `stars = result.rating.reward.stars` (presente em ambos os ramos de `ConsolidatedRating`,
   Decisão 5).
5. Monta `VictoryRewardEvent { playerId, duelId: result.duelSessionId, cardNumber, stars }`.
6. Chama `applyVictoryReward(event, deps)` — a única chamada de rede desta feature.
7. Guarda `{ outcome: DropRewardOutcome, reward: VictoryRewardResult }` no cache por
   `duelSessionId` e devolve.

**Orquestração (`apps/web`, `applyVictoryReward`, espelha `registerCardReward` passo a passo)**

8. Valida `event` contra `VictoryRewardEventSchema`. Falha → erro `malformed_victory_reward_event`.
9. Valida `cardNumber` contra o catálogo (`validateRewardCardNumber`, F06/`build-deck F03`,
   reaproveitada sem alteração) e `stars` contra `validateVictoryRewardStars` (nova, F07). Qualquer
   falha aborta sem I/O.
10. Consulta a fila local (`victoryRewardQueue.listPendingRewards`); se `duelId` já está lá,
    devolve `already_applied` sem nova chamada.
11. Chama `victoryRewardRepository.apply(playerId, duelId, cardNumber, stars)` — o RPC
    `apply_victory_reward`.
12. Sucesso com `applied = true` → `{ status: "applied", cardQuantity, walletStars }`.
13. Sucesso com `applied = false` (já processado no servidor) → reconcilia o cache local de coleção
    e de carteira com os valores atuais devolvidos e retorna `already_applied`.
14. Falha de rede/RPC → `applyOfflineVictoryReward` grava coleção + carteira + fila pendente numa
    única transação IndexedDB e devolve `applied_offline`. Falha também do cache local → erro
    `victory_reward_apply_unavailable`.

**Sincronização (`syncVictoryRewardQueue`, espelha `syncRewardQueue`)**

15. Ao reconectar (`window.addEventListener("online", ...)`, mesmo padrão de `useRewardSync`),
    drena `pendingVictoryRewards` em ordem de `queuedAt`, tentando `victoryRewardRepository.apply`
    para cada item; sucesso (aplicado ou já aplicado) remove da fila, falha mantém o item para a
    próxima tentativa — nenhuma reordenação, nenhum item pulado (Decisão 10).
16. `useVictoryRewardSync` só dispara a sincronização quando há sessão autenticada
    (`getAuthenticatedPlayerId` ≠ `undefined`); sem sessão, a fila permanece intacta e a UI que a
    observa mostra a mensagem de reautenticação (Seção 6).

**Exibição (`apps/web`, UI)**

17. `use-victory-reward.ts` dispara `grantVictoryReward` **somente quando** `result.status ===
    "victory"` — mesma guarda de F06.
18. `duel-result.tsx` renderiza `CardDropReward` (carta, F06, inalterado) e `StarsRewardBadge`
    (estrelas + saldo, F07, novo) lado a lado, ambos lendo do mesmo `GrantedVictoryReward` — sem
    segunda chamada de rede.

### Regras de negócio

- **Estrelas só são creditadas junto com uma carta**, na mesma chamada — nunca isoladamente
  (Decisão 6). Reforça o critério de Cross-Feature Integration do PRD ("uma mesma vitória nunca
  concede carta ou estrelas em duplicidade... idempotência compartilhada por identificador de duelo
  entre F06 e F07").
- **F07 nunca é acionada fora de `status: "victory"`** — derrota, empate e `unavailable` não geram
  `VictoryRewardEvent` nenhum.
- **Nenhuma quantidade de estrelas é hard-coded** — sempre vem de `result.rating.reward.stars`
  (Decisão 5).
- **A carteira não implementa débito/gasto** — `applyVictoryReward` só incrementa; nenhuma rota de
  subtração de `stars` é criada aqui (fronteira explícita do PRD F07 Capabilities).
- **`wallets` nunca é escrita fora do RPC `apply_victory_reward`** (`SECURITY DEFINER`); nenhum
  valor de estrelas confiado ao cliente.

### Eventos

Não se aplica ao `packages/engine` — F07 não emite nem consome eventos de duelo e não participa do
Effect System. Nenhum arquivo desta feature importa `packages/engine` ou `packages/ai`.

### Determinismo e pureza

- `validateVictoryRewardStars` (`packages/rules`) é uma função pura e total: sem I/O, sem
  `Math.random()`, nunca lança — toda falha vira `Result` de erro.
- O único ponto "aleatório" observável (qual carta) já é decidido por `selectDropCardNumber` (F06),
  reaproveitada sem alteração e já determinística por `duelSessionId`. F07 não introduz nenhuma
  nova fonte de não-determinismo.
- `applyVictoryReward`/`grantVictoryReward` (a parte com I/O) não fazem escolha probabilística
  própria.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/economy/wallet.ts
export type WalletBalance = Readonly<{
  playerId: string;
  stars: number;
}>;

export type LoadedWalletBalance =
  | Readonly<{ origin: "server"; stars: number; syncedAt: string }>
  | Readonly<{ origin: "cache"; stars: number; syncedAt: string }>;

export type VictoryRewardEvent = Readonly<{
  playerId: string;
  duelId: string;
  cardNumber: CardNumber;
  stars: number;
}>;

export type VictoryRewardResult =
  | Readonly<{ status: "applied"; cardQuantity: number; walletStars: number }>
  | Readonly<{ status: "applied_offline"; localCardQuantity: number; localWalletStars: number }>
  | Readonly<{ status: "already_applied"; cardQuantity?: number; walletStars?: number }>;

export type PendingVictoryReward = Readonly<{
  duelId: string;
  playerId: string;
  cardNumber: CardNumber;
  stars: number;
  queuedAt: string;
}>;
```

```ts
// packages/shared/src/economy/wallet-schema.ts
export const WalletBalanceSchema = z.strictObject({
  playerId: z.string().min(1),
  stars: z.number().int().min(0),
});

export const VictoryRewardEventSchema = z.strictObject({
  playerId: z.string().min(1),
  duelId: z.string().min(1),
  cardNumber: CardNumberSchema,
  stars: z.number().int().min(0),
});

export const PendingVictoryRewardSchema = z.strictObject({
  duelId: z.string().min(1),
  playerId: z.string().min(1),
  cardNumber: CardNumberSchema,
  stars: z.number().int().min(0),
  queuedAt: z.string().min(1),
});

/** Shape of the `apply_victory_reward` RPC response — snake_case, mirrors ApplyCardRewardResponseSchema (F06). */
export const ApplyVictoryRewardResponseSchema = z.strictObject({
  applied: z.boolean(),
  card_quantity: z.number().int().min(0),
  wallet_stars: z.number().int().min(0),
});
```

Novo código de `DomainError`: `malformed_victory_reward_event`, `invalid_stars_amount`,
`victory_reward_apply_unavailable`. Reusados sem redefinição: `invalid_reward_card`
(`build-deck/F03`/rules), `no_drop_candidates_available` (F06).

### Funções públicas

```ts
// packages/rules/src/economy — puro, sem I/O
export function validateVictoryRewardStars(stars: number): Result<number, DomainError>;
  // pós: Number.isInteger(stars) && stars >= 0 ⇒ ok(stars)
  //      caso contrário ⇒ err('invalid_stars_amount')
  //      total: nunca lança
```

```ts
// apps/web/src/lib/reward — fronteira de I/O

export type ApplyVictoryRewardDeps = Readonly<{
  catalog: CardCatalogLookup;
  victoryRewardRepository: VictoryRewardRepository;
  victoryRewardQueue: VictoryRewardQueue;
  collectionCache: CollectionCache;
  walletCache: WalletCache;
  applyOfflineVictoryReward(application: OfflineVictoryRewardApplication): Promise<{
    collection: Collection;
    wallet: WalletBalance;
  }>;
  clock: Clock;
}>;

export async function applyVictoryReward(
  event: unknown,
  deps: ApplyVictoryRewardDeps,
): Promise<Result<VictoryRewardResult, DomainError>>;
  // pós: evento inválido ⇒ err('malformed_victory_reward_event'), sem I/O
  //      cardNumber desconhecido ⇒ err('invalid_reward_card'), sem I/O
  //      stars inválido ⇒ err('invalid_stars_amount'), sem I/O
  //      duelId já na fila local ⇒ ok({ status: 'already_applied' }), sem chamada de rede
  //      RPC aplica pela 1a vez ⇒ ok({ status: 'applied', cardQuantity, walletStars })
  //      RPC já aplicado ⇒ ok({ status: 'already_applied', cardQuantity, walletStars }), reconcilia caches
  //      RPC falha e cache local disponível ⇒ ok({ status: 'applied_offline', ... }), enfileira
  //      RPC falha e cache local indisponível ⇒ err('victory_reward_apply_unavailable')
```

```ts
// apps/web/src/lib/free-duel — orquestração de F07 sobre a seleção de F06

export type GrantVictoryRewardContext = Readonly<{
  playerId: string;
  dropPool: DropPool;
}>;

export type GrantVictoryRewardDeps = ApplyVictoryRewardDeps & Readonly<{
  defaultCommonDropPool: DefaultCommonDropPool; // mesma dependência de F06
}>;

export type GrantedVictoryReward = Readonly<{
  outcome: DropRewardOutcome; // de F06, inalterado
  reward: VictoryRewardResult;
}>;

export async function grantVictoryReward(
  result: Extract<ConsolidatedDuelResult, { status: "victory" }>,
  context: GrantVictoryRewardContext,
  deps: GrantVictoryRewardDeps,
): Promise<Result<GrantedVictoryReward, DomainError>>;
  // pós: mesma duelSessionId ⇒ mesmo GrantedVictoryReward, sem nova seleção nem nova chamada
  //      erro de seleção de carta ⇒ nunca chama applyVictoryReward (Decisão 6)
```

```ts
// apps/web/src/lib/wallet — leitura de saldo, análoga a load-collection.ts

export type LoadWalletBalanceDeps = Readonly<{
  playerId: string | undefined;
  repository: WalletRepository;
  cache: WalletCache;
  clock: Clock;
}>;

export async function loadWalletBalance(
  deps: LoadWalletBalanceDeps,
): Promise<Result<LoadedWalletBalance, DomainError>>;
```

Exemplo do evento entregue a `applyVictoryReward`:

```json
{
  "playerId": "6f1c9e10-...",
  "duelId": "b3f0b6b0-6b8e-4e9d-9c1a-7e6f2a1d4c9b",
  "cardNumber": "045",
  "stars": 12
}
```

`duelId` é exatamente o `duelSessionId` da sessão encerrada, a mesma chave de idempotência de F06
(Decisão 1). `stars: 12` é apenas ilustrativo da forma — não é um valor de balanceamento real.

Exemplo da resposta do RPC:

```json
{ "applied": true, "card_quantity": 2, "wallet_stars": 47 }
```

### RPC `apply_victory_reward` (assinatura e comportamento — Postgres, `SECURITY DEFINER`)

```
apply_victory_reward(p_player_id uuid, p_duel_id text, p_card_numero text, p_stars integer)
  returns table (applied boolean, card_quantity integer, wallet_stars integer)
```

Comportamento (algoritmo, não código — ver Seção 5 para o modelo de dados completo):

1. Rejeita se `p_player_id <> auth.uid()` (mesma guarda de segurança retrofitada em
   `apply_card_reward` pela migração `0006`).
2. Tenta inserir em `reward_ledger` a linha `(duel_id, player_id, card_numero, stars)` — agora com
   `stars` explicitamente informado, não o `DEFAULT 0` que `apply_card_reward` usa.
3. Se a inserção **aconteceu** (não houve conflito de `duel_id`): incrementa `collections` em +1
   para `card_numero` (mesma lógica de `apply_card_reward`) **e** faz upsert em `wallets`
   (`stars = wallets.stars + p_stars`), na mesma transação. Devolve `applied = true` com os valores
   atuais de ambos.
4. Se a inserção **não aconteceu** (conflito — `duel_id` já processado): não incrementa nada; lê os
   valores atuais de `collections`/`wallets` e devolve `applied = false` com esses valores.

### Contratos externos (cross-PRD e cross-feature, já implementados)

- **F05 (`ConsolidatedDuelResult`)** — F07 só é acionada com o ramo `status: "victory"`, lendo
  `rating.reward.stars` de qualquer sub-ramo.
- **F06 (`selectDropCardNumber`, `DropPool`)** — reaproveitados sem alteração de assinatura.
- **`password` (futuro, cross-PRD, ainda sem spec)** — consumirá `wallets`/`loadWalletBalance` para
  exibir saldo e, futuramente, uma RPC de débito simétrica (`redeem_password_card` ou equivalente,
  fora desta spec). O desenho de `wallets` (Decisão 2) não exige nenhuma mudança para isso.

## 5. Modelo de Dados

### Postgres / Supabase — nova migração `0008_create_wallets_and_apply_victory_reward.sql`

**Tabela `wallets`** (fonte única de saldo — `arquitetura.md` §5.1/§5.3):

| Coluna | Tipo | Constraint |
|---|---|---|
| `player_id` | `uuid` | PK, `references auth.users(id) on delete cascade` |
| `stars` | `integer` | `not null default 0 check (stars >= 0)` |
| `updated_at` | `timestamptz` | `not null default now()` |

- RLS ligado; política `wallets_select_own` (`select` para `authenticated`, `using (player_id =
  auth.uid())`) — mesmo padrão de `reward_ledger`. Nenhuma política de escrita: o único escritor é
  o RPC `SECURITY DEFINER`.
- Grants: `select` para `authenticated`; `select, insert, update, delete` para `service_role` (mesmo
  padrão de `reward_ledger`, já que este projeto não tem grants default no schema `public`).

**Alteração de `reward_ledger`**: nenhuma alteração de coluna — `stars` já existe (`0005`) e passa a
ser efetivamente escrita pelo novo RPC (antes ficava sempre em `DEFAULT 0`).

**Função `apply_victory_reward`**: descrita na Seção 4. `SECURITY DEFINER`, `SET search_path =
public, pg_temp` (mesma regra de `apply_card_reward`/`persist_initial_deck`). `EXECUTE` revogado de
`public`/`anon`, concedido a `authenticated` e `service_role` — mesma justificativa de
`apply_card_reward` (Decisão 10 de F06: é um crédito, nunca um débito; seguro conceder direto ao
jogador autenticado).

`apply_card_reward` (`0005`/`0006`) **não é alterada nem removida** por esta migração (Decisão 3).

### Cache local / fila offline (IndexedDB, `apps/web/src/lib/collection/indexeddb-cache.ts`)

`DATABASE_VERSION` sobe de 4 para 5. Duas novas object stores no mesmo banco
(`yugioh-build-deck`, já compartilhado por coleção, recompensas e deck ativo):

| Store | Key path | Conteúdo |
|---|---|---|
| `walletBalance` (`WALLET_BALANCE_STORE_NAME`) | `playerId` | Snapshot `{ playerId, stars, syncedAt }` — um registro por jogador, análogo a `collection` |
| `pendingVictoryRewards` (`PENDING_VICTORY_REWARDS_STORE_NAME`) | `duelId` | `PendingVictoryReward` — reenfileirar o mesmo `duelId` substitui, nunca duplica |

`applyOfflineVictoryReward` abre uma única transação IndexedDB abrangendo `collection`,
`walletBalance` e `pendingVictoryRewards` — mesmo padrão de atomicidade local que
`applyOfflineReward` (F06) já usa entre `collection` e `pendingRewards`.

### Dado de balanceamento

Nenhum novo dado de balanceamento pendente é introduzido por F07: a quantidade de estrelas por
vitória já é tratada como pendência externa por F05 (Rating Engine, `rating.reward.stars`) — F07
apenas transporta e persiste esse valor, nunca o inventa (Decisão 5).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Falha ao persistir o crédito no servidor | `victoryRewardRepository.apply` retorna erro | `applyOfflineVictoryReward` grava local e enfileira (`applied_offline`) | "Estrelas creditadas localmente; sincronizando…" |
| Crédito duplicado (mesmo `duelId`, reprocessamento/reabertura de tela) | RPC devolve `applied = false`, ou item já na fila local | Não credita de novo; reconcilia caches com os valores atuais | "Estrelas já creditadas." |
| Sessão expirada ao sincronizar | `getAuthenticatedPlayerId` devolve `undefined` no momento do `online` | `useVictoryRewardSync` não roda; fila permanece intacta | "Faça login novamente para sincronizar suas estrelas." |
| Seleção de carta falha (`no_drop_candidates_available`, herdado de F06) | `selectDropCardNumber` dentro de `grantVictoryReward` | Aborta **antes** de chamar `applyVictoryReward` — nem carta nem estrelas são creditadas (Decisão 6) | Mesma mensagem de F06 ("Não foi possível conceder sua recompensa agora...") |
| `stars` estruturalmente inválido (negativo/não inteiro) — nunca deveria ocorrer vindo de F05, mas validado defensivamente | `validateVictoryRewardStars` | Erro `invalid_stars_amount`; nenhuma chamada de rede | erro de integração, não mensagem de duelo (mesmo princípio de F05 Decisão 5, "política mínima inválida") |
| Resultado não é vitória (`defeat`/`draw`/`unavailable`) | guarda em `use-victory-reward.ts` | `grantVictoryReward` nunca é chamada; nenhum `VictoryRewardEvent` é criado | nenhuma (sem recompensa, conforme PRD) |
| Renderização repetida da mesma sessão encerrada | cache por `duelSessionId` em `grantVictoryReward` | Devolve o mesmo `GrantedVictoryReward` sem nova seleção, nova chamada de rede ou novo incremento | nenhuma |
| Duas chamadas concorrentes para o mesmo `duelId` (dois dispositivos, ou retry) | `INSERT ... ON CONFLICT (duel_id) DO NOTHING` no RPC | Exatamente uma aplica; as demais leem o valor já atualizado | nenhuma (transparente) |
| Linha de `reward_ledger` para o `duelId` nunca chegou a existir (F06/F07 nunca invocadas para esta sessão) | não há registro | Não é um estado de erro: reabrir/re-renderizar a sessão invoca `grantVictoryReward` de novo, que executa o fluxo completo (Decisão 6) | nenhuma até a próxima invocação |

## 7. Estratégia de Testes

### Unitários (Vitest)

`validateVictoryRewardStars` (`packages/rules`) — table-driven:

- `validateVictoryRewardStars accepts zero`
- `validateVictoryRewardStars accepts a positive integer`
- `validateVictoryRewardStars rejects a negative number`
- `validateVictoryRewardStars rejects a non-integer number`
- `validateVictoryRewardStars never throws for NaN or Infinity`

`applyVictoryReward` (`apps/web`, com dependências falsas, espelhando `register-card-reward.test.ts`):

- `applyVictoryReward returns malformed_victory_reward_event for an invalid event shape`
- `applyVictoryReward returns invalid_reward_card for an unknown card number`
- `applyVictoryReward returns invalid_stars_amount for a negative stars value`
- `applyVictoryReward returns already_applied without a network call when duelId is already queued locally`
- `applyVictoryReward applies the increment and returns status applied when the rpc responds applied true`
- `applyVictoryReward reconciles both caches and returns already_applied when the rpc responds applied false`
- `applyVictoryReward falls back to applied_offline and enqueues the pending reward when the rpc fails`
- `applyVictoryReward returns victory_reward_apply_unavailable when both the rpc and the local cache fail`

`grantVictoryReward` (`apps/web`, com dependências falsas):

- `grantVictoryReward selects a card, reads stars from the rating, and calls applyVictoryReward exactly once`
- `grantVictoryReward does not call applyVictoryReward when card selection fails`
- `grantVictoryReward reuses the cached outcome for the same duelSessionId without selecting or calling the reward again`
- `grantVictoryReward reads stars from the minimum_fallback rating branch the same way as rating_engine`
- `grantVictoryReward builds the VictoryRewardEvent with duelId equal to duelSessionId`

`loadWalletBalance` (`apps/web`):

- `loadWalletBalance returns the server balance and writes it to cache on success`
- `loadWalletBalance falls back to the cached balance when the server read fails`
- `loadWalletBalance returns wallet_unavailable when both the server and the cache fail`

`syncVictoryRewardQueue` (`apps/web`):

- `syncVictoryRewardQueue removes an item from the queue once the server confirms it applied`
- `syncVictoryRewardQueue keeps a failed item queued for the next run without reordering the rest`
- `syncVictoryRewardQueue removes an item the catalog no longer recognizes without ever applying it`

`use-victory-reward` / `use-victory-reward-sync` (`apps/web`, `@vitest-environment jsdom`):

- `use-victory-reward does not call grantVictoryReward for a defeat result`
- `use-victory-reward does not call grantVictoryReward for a draw result`
- `use-victory-reward does not call grantVictoryReward for an unavailable result`
- `use-victory-reward calls grantVictoryReward exactly once for a victory result`
- `use-victory-reward-sync does not run the sync when there is no authenticated session`

`StarsRewardBadge` / `DuelResult` (`apps/web`, `@vitest-environment jsdom`):

- `StarsRewardBadge renders the granted stars amount and the updated wallet balance`
- `StarsRewardBadge renders the offline-sync message when reward status is applied_offline`
- `StarsRewardBadge renders the already-credited message without duplicating the amount`
- `DuelResult renders StarsRewardBadge alongside CardDropReward only in the victory branch`
- `DuelResult does not render StarsRewardBadge in the defeat or draw branch`

### Property-based (fast-check)

- **Nunca credita estrelas sem carta e vice-versa:** para qualquer sequência de chamadas de
  `grantVictoryReward` (incluindo falhas simuladas de seleção), sempre que `applyVictoryReward` é
  invocada, o evento carrega `cardNumber` e `stars` simultaneamente — nunca um sem o outro. 1.000
  execuções.
- **Idempotência ponta a ponta:** para qualquer `(dropPool, tier, defaultPool, duelSessionId,
  stars)` fixos, chamar `grantVictoryReward` repetidamente (1 a 20 vezes) sempre produz o mesmo
  `GrantedVictoryReward`, sem incrementar coleção nem carteira mais de uma vez. 1.000 execuções.
- **Totalidade de `validateVictoryRewardStars`:** para qualquer número (incluindo `NaN`,
  `Infinity`, negativos, não inteiros), a função nunca lança — sempre devolve `Result`.
- **Idempotência de `applyVictoryReward` sob concorrência:** N chamadas concorrentes
  (`Promise.all`) para o mesmo `duelId` resolvem para o mesmo `VictoryRewardResult` (aplicado uma
  vez), adaptado do padrão de concorrência de `build-deck/F03` (guidelines §14.3).

### Integração

`apps/web/tests/free-duel-victory-reward.integration.test.tsx`:

- `victory flow grants exactly one card and credits the exact stars from the rating in one call`
- `defeat flow never calls grantVictoryReward or applyVictoryReward`
- `draw flow never calls grantVictoryReward or applyVictoryReward`
- `card selection failure aborts the whole victory reward call, crediting neither card nor stars`
- `reopening the result screen for the same session does not duplicate the card nor the stars credit`
- `offline rpc failure credits both locally and syncs both on reconnect`

### Análise estática

- `packages/rules/src/economy/**` não importa `packages/data`, `packages/engine`, `packages/ai`,
  React, DOM, `fetch`, `node:*` nem Supabase (regra `rules-depends-only-on-shared`).
- `packages/shared/src/economy/wallet*.ts` não importa nenhum pacote do monorepo.
- `apps/web/src/lib/wallet/**` não importa `apps/web/src/lib/free-duel/**` (Decisão 2 — verificação
  de que a carteira permanece genérica).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.
- Migrações `0001`-`0007` permanecem byte-idênticas (nenhum arquivo de migração já aplicado é
  editado) — apenas `0008` é adicionada.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F07) | Teste |
|---|---|
| A carteira é um saldo `≥ 0` persistido na conta (servidor + cache local), creditado apenas na vitória com a quantidade da tabela nota→recompensa | `applyVictoryReward applies the increment and returns status applied...` + `grantVictoryReward selects a card, reads stars from the rating...` + `loadWalletBalance returns the server balance...` |
| O crédito é idempotente por duelo (não duplica) e, em falha de rede, é enfileirado e sincronizado sem perda | `applyVictoryReward reconciles both caches and returns already_applied...` + `applyVictoryReward falls back to applied_offline...` + `syncVictoryRewardQueue removes an item from the queue once the server confirms...` + propriedade de idempotência sob concorrência |
| O módulo não implementa gasto/loja (apenas a fonte de crédito) | Análise estática: nenhuma função de débito em `apps/web/src/lib/wallet/**` ou `packages/rules/src/economy/**` |
| Sessão expirada mantém o cache local e solicita reautenticação para sincronizar | `use-victory-reward-sync does not run the sync when there is no authenticated session` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: fluxo completo de vitória (F01→F02→F03→F05→F06→F07→F08) sem estado inconsistente | `victory flow grants exactly one card and credits the exact stars from the rating in one call` |
| Cross-Feature: em derrota/empate (inclusive rendição/abandono de F04), F06 e F07 não disparam e a tela não exibe recompensa | `defeat flow never calls grantVictoryReward or applyVictoryReward` + `draw flow never calls grantVictoryReward or applyVictoryReward` + `use-victory-reward does not call grantVictoryReward for a defeat result` + `...for a draw result` + `...for an unavailable result` |
| Cross-Feature: uma mesma vitória nunca concede carta ou estrelas em duplicidade (idempotência compartilhada por identificador de duelo entre F06 e F07) | `reopening the result screen for the same session does not duplicate the card nor the stars credit` + propriedade de idempotência sob concorrência + Decisão 1/6 (unificação) |
| Cross-PRD: quando o módulo de loja/gasto de estrelas existir, ele consumirá o saldo da carteira definida em F07 | Teste de contrato: `wallets`/`loadWalletBalance` não expõem nenhuma dependência de `free-duel` em sua assinatura (verificado pela análise estática da Decisão 2) — pendência registrada até `password` existir |
