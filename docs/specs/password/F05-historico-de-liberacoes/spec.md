# Histórico de Liberações

> PRD: `docs/prds/password.md` — F05
> Pacote-alvo: `packages/shared` + `packages/rules` + `apps/web` + `supabase/migrations`

## 1. Contexto e Escopo

F05 é o extrato **somente leitura** das liberações por senha do jogador: para cada liberação
bem-sucedida, qual carta entrou na coleção, quantas estrelas saíram da carteira e quando. É a
última feature do módulo Password (PRD §8, Wave 3, prioridade 3) e a única que **não escreve**
em nenhum recurso — nem carteira, nem coleção, nem `password_releases`. Toda a escrita já
aconteceu dentro da transação atômica de F04; F05 apenas lê o que aquela transação registrou.

Isso torna F05 estruturalmente barata: a tabela `password_releases`, o índice
`(player_id, created_at desc)` e a política RLS `select`-own são **entregas de F04**
(`arquitetura.md` §5.1; spec `password/F04` §5). F05 acrescenta a leitura paginada, a
reconciliação com as liberações que ainda estão na fila offline, o agregado de total gasto e a
aba de UI. No roadmap (`arquitetura.md` §9) isto é Fase 2, cujas demais entregas
(`wallets`, `apply_victory_reward`, coleção, Library, Build Deck) já estão no repositório.

O ponto de projeto que carrega peso aqui é o mesmo que `password/F01` já resolveu para o saldo:
**um extrato que "esquece" o que o jogador acabou de fazer offline é pior do que um extrato
ausente**. F04 enfileira intenções de liberação em `pendingPasswordRedemptions` sem aplicar
débito local (spec `password/F04` Decisão 8); se F05 espelhasse apenas `password_releases`, uma
liberação pedida offline sumiria da tela até a fila drenar. F05 portanto **une** as linhas
confirmadas do servidor com os itens pendentes da fila, reconciliando por `redemptionId` —
reconciliação por identificador, nunca soma cega (mesma regra de `password/F01` Decisão 4).

### Incluído

- Leitura paginada de `password_releases` do próprio jogador, em ordem cronológica decrescente,
  por **cursor keyset** sobre `created_at`, servida pelo índice que F04 já cria
- Reconciliação do extrato com a fila `pendingPasswordRedemptions` (F04): itens pendentes
  aparecem no topo marcados como **pendentes**, e desaparecem da marcação quando a linha
  confirmada correspondente chega, deduplicada por `redemptionId`
- Agregado autoritativo de **total de liberações** e **total de estrelas gastas** via nova RPC
  `get_password_release_totals`, independente da página carregada; o total pendente é um
  segundo número, **nunca** somado ao confirmado
- Cache local IndexedDB da primeira página confirmada + dos totais, com fallback e aviso quando
  o servidor está inalcançável — mesmo contrato de `origin: "server" | "cache"` que
  `LoadedWalletBalance` e `LoadedCollection` já usam
- Resolução de `numero → nome`/`tipo` contra o `PasswordCatalogPayload` que a rota `/password`
  já carrega, sem segunda leitura de disco e sem persistir o nome no banco
- Aba "Histórico" dentro de `/password`, com lista, resumo de totais, estado vazio, estado de
  falha e ação "Carregar mais"

### Adiado

O PRD não divide F05 em `Core Scope` / `Full Scope additions`; o escopo desta spec é a feature
completa.

Ficam fora por decisão explícita, e não por corte de escopo: filtro/busca dentro do extrato,
exportação, e agrupamento por período. Nenhum é pedido pelo PRD.

### Fronteiras

- **Produzir as linhas de `password_releases`**, criar a tabela, o índice e a RPC de débito é
  **F04**. F05 não cria nem altera `redeem_card_by_password`, `password_releases` ou
  `card_prices`. — PRD §6 F04 Provides.
- **Saldo de estrelas** é F01 (`wallets`, `useWalletBalance`). F05 exibe o cabeçalho de saldo já
  entregue por F03; o extrato **não** recalcula saldo a partir do histórico, e o total gasto do
  extrato não é uma fonte alternativa de saldo. — PRD §6 F01 ("fonte única da verdade").
- **Coleção e quantidade possuída** são do **Build Deck** (cross-PRD). O extrato mostra o que foi
  liberado, não o que o jogador possui: uma carta liberada 3× aparece 3× no extrato e uma vez em
  `collections` com `quantity = 3`. — PRD §7 ("Coleção e deck").
- **Cartas obtidas por drop de duelo** não entram neste extrato. `reward_ledger` registra
  vitórias; `password_releases` registra liberações por senha. São dois registros distintos e F05
  lê apenas o segundo. — PRD §7 ("Seleção da carta de drop").
- **Resolver e exibir a senha de cada carta** é `library/F05` (cross-PRD, já implementada) e
  `password/F03`. O extrato **não** exibe a senha usada — persistir ou reexibir a senha não é
  pedido pelo PRD e `password_releases` não a guarda. — PRD §7 ("Descoberta/consulta das senhas").
- **Sincronização da fila offline** (drenar `pendingPasswordRedemptions` ao reconectar) é F04
  (`syncRedemptionQueue`, `use-redemption-sync.ts`). F05 **lê** a fila; nunca a drena, nunca a
  altera, nunca remove item dela.
- **Layout responsivo concreto, animações e sons** — camada de UI, PRD §7 ("Interface e
  apresentação"). Esta spec descreve estrutura, estados e mensagens em nível lógico.

### Contratos externos assumidos

Nenhum dos quatro está implementado hoje; todos são **pré-requisito declarado** no `plan.md`.

| Dependência | Onde estará | O que F05 usa |
|---|---|---|
| **`password/F04`** (spec escrita, sem código) | `supabase/migrations/0009_…`, `apps/web/src/lib/redemption/` | Tabela `password_releases` (colunas `redemption_id, player_id, numero, stars_spent, dataset_version, created_at`), índice `(player_id, created_at desc)`, RLS `password_releases_select_own`, `GRANT select` a `authenticated`; store IndexedDB `pendingPasswordRedemptions` e o tipo `PendingCardRedemption` |
| **`password/F03`** (spec escrita, sem código) | `apps/web/src/app/password/`, `apps/web/src/lib/password/` | Rota `/password`, `PasswordCatalogPayload` (698 cartas com senha), `fromPasswordPayload`, `components/password/messages.ts`, `star-balance.tsx` |
| **`password/F01`** (spec escrita, sem código) | `apps/web/src/stores/wallet-store.ts`, `hooks/use-wallet-balance.ts` | Nada é consumido diretamente. F05 declara apenas a invariante de que o extrato **não** é fonte de saldo (Decisão 8) |
| **Save / persistência** (cross-PRD, sem PRD próprio) | Supabase (Postgres + Auth + RLS), já configurado | Conta autenticada, RLS select-own, padrão de RPC `SECURITY DEFINER` com guard `p_player_id = auth.uid()` |

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|---|---|---|
| 1 | **O extrato vive como aba cliente dentro de `/password`**, não como rota `/password/historico`. A Experience do PRD descreve literalmente *"uma aba/painel 'Histórico' na tela Password"*; e a aba reaproveita o `PasswordCatalogPayload` que `page.tsx` já monta para resolver `numero → nome`, evitando um segundo Server Component que leria o catálogo selado de novo. Custo aceito: o extrato não tem URL própria nem deep-link. | entrevista; PRD §6 F05 Experience; spec `password/F03` §3 | confirmada |
| 2 | **Liberações pendentes offline aparecem no extrato, marcadas como pendentes, e são reconciliadas por `redemptionId`.** É o mesmo mecanismo que `password/F01` Decisão 4 adotou para o saldo efetivo: nunca somar a fila cegamente, sempre descontar o que o servidor já confirmou. Um item de `pendingPasswordRedemptions` cujo `redemptionId` aparece entre as linhas confirmadas carregadas é descartado da fila **na exibição** — F05 não o remove do IndexedDB, o que é responsabilidade de `syncRedemptionQueue` (F04). | entrevista; spec `password/F01` Decisão 4; spec `password/F04` Decisão 3/8 | confirmada |
| 3 | **A reconciliação da fila só acontece na primeira página.** Como a ordem é `created_at desc` e itens pendentes são, por construção, os mais recentes do jogador, uma liberação pendente já confirmada pelo servidor cai na página 1. Reconciliar contra páginas subsequentes não acrescentaria informação e faria a dedup depender de quanto o jogador rolou. Ao carregar mais páginas, o bloco de pendentes do topo permanece inalterado. | entrevista (consequência da paginação); spec `password/F04` §5 (índice `(player_id, created_at desc)`) | confirmada |
| 4 | **Paginação por cursor keyset sobre `created_at`, não por `offset`/`range`.** Um `offset` desloca quando uma liberação nova entra no topo entre dois cliques em "Carregar mais", o que duplicaria ou puliria linhas. O keyset (`created_at < cursor`) é estável e usa exatamente o índice `(player_id, created_at desc)` de F04. O cursor é o `created_at` da última linha da página. **Por que `created_at` sozinho basta como cursor:** F04 serializa toda liberação de um jogador pelo `for update` na linha de `wallets` (spec `password/F04` Decisão 10), então duas liberações do mesmo jogador nunca compartilham o instante de commit; `(player_id, created_at)` é efetivamente único. A ordenação declara o desempate por `redemption_id` mesmo assim, para que a ordem seja total e determinística em teste. | entrevista; spec `password/F04` Decisão 10 e §5 | confirmada |
| 5 | **O tamanho de página é `RELEASE_HISTORY_PAGE_SIZE = 20`**, constante única em `packages/shared`. Não é dado de balanceamento de jogo (não afeta economia, custo nem progressão) — é um parâmetro de UI, escolhido pelo mesmo critério de "uma tela cheia sem rolagem infinita" e trocável num só ponto. | entrevista (detalhe não especificado pelo PRD; auto-preenchido como default de boa prática) | confirmada |
| 6 | **O total gasto é um agregado autoritativo do servidor**, entregue por uma RPC nova `get_password_release_totals(p_player_id uuid)`, `SECURITY DEFINER`, com o guard `p_player_id = auth.uid()` obrigatório neste projeto. A alternativa "somar as linhas carregadas" daria um número que muda a cada clique em "Carregar mais" e mentiria sobre o total de vida do jogador, que é o que a Experience do PRD pede. | entrevista; PRD §6 F05 Experience; `CLAUDE.md` (todo RPC client-callable precisa do guard `p_player_id = auth.uid()`) | confirmada |
| 7 | **`total_stars_spent` é `bigint`, não `integer`.** Uma carta em `999999⭐` (`UNPRICED_CARD_STARS`, spec `password/F03`) liberada ~2.148 vezes já estoura `int4`. O total é o único lugar do módulo onde uma soma sem teto existe — `wallets.stars` e `stars_spent` individuais continuam `integer`. | análise do domínio (`UNPRICED_CARD_STARS = 999999`, PRD §6 F04 Capabilities: "cópias ilimitadas") | confirmada |
| 8 | **O extrato nunca é fonte de saldo.** O total gasto de F05 e o saldo de F01 são números independentes: `saldo = créditos(F02) − débitos(F04)`, e o extrato só conhece a metade dos débitos por senha. Nenhum componente de F05 escreve em `useWalletStore`, e um teste trava isso. Reforça a Capability de F01 *"é a fonte única da verdade sobre poder de compra; nenhum outro módulo mantém saldo paralelo"*. | PRD §6 F01 Capabilities; ADR-006 §4/§6 | confirmada |
| 9 | **O nome da carta não é persistido; é resolvido pelo `numero` contra o catálogo.** Decisão herdada de F04 (§4, "Contrato publicado para `password/F05`") e coerente com `collections` e `reward_ledger`, que também guardam só `numero`. Consequência: se o dataset mudar o nome de uma carta, o extrato mostra o nome **atual**, não o vigente na compra. Isso é desejado — o extrato descreve a carta, e a versão contra a qual o preço foi cobrado fica auditável em `password_releases.dataset_version`. | spec `password/F04` §4; `arquitetura.md` §5.1 | confirmada |
| 10 | **Um `numero` que não resolve no catálogo não derruba o extrato.** A linha é renderizada com o `numero` como rótulo e uma marcação de carta desconhecida. Só pode acontecer por divergência de dataset (`password_releases.numero` tem FK para `card_prices`, então a linha existiu num dataset válido). Falhar a lista inteira por uma linha seria pior do que degradar uma. | `arquitetura.md` §4.3 (ausência tratada como neutro); precedente `fromPasswordPayload` (arte faltante → placeholder) | confirmada |
| 11 | **`fromPasswordPayload` (F03) ganha um índice por `numero`.** Hoje a spec de F03 declara que ele reconstrói um `Map` chaveado pela **senha**; o extrato precisa de `numero → Card`. A alteração é aditiva — F03 continua usando o índice por senha — e vive no arquivo de F03 em vez de duplicar a reconstrução em F05. Como F03 ainda não foi implementada, isto é uma nota para a implementação dela, não uma retificação de código existente. | spec `password/F03` §3 passo 3 | confirmada — requer nota na spec de F03 |
| 12 | **Cache local guarda só a primeira página confirmada + os totais.** Guardar todas as páginas roladas transformaria o IndexedDB num espelho ilimitado de `password_releases`. Offline, o jogador vê a primeira página, os totais do último sync e os pendentes da fila; "Carregar mais" fica indisponível com a razão explicada. Coerente com `WalletCache`, que guarda um snapshot pontual, não um log. | entrevista; precedente `apps/web/src/lib/wallet/indexeddb-cache.ts` | confirmada |
| 13 | **A store IndexedDB nova sobe `DATABASE_VERSION` de 6 para 7.** F04 já sobe de 5 para 6 (`pendingPasswordRedemptions`). A ordem de implementação F04 → F05 fixa isso; se F05 for implementada antes de F04, a numeração precisa ser reavaliada. Registrado como dependência de ordem no `plan.md`. | `apps/web/src/lib/collection/indexeddb-cache.ts` (hoje `5`); spec `password/F04` §5 | confirmada |
| 14 | **Migrações já aplicadas não são editadas.** F05 acrescenta `0011_create_release_history_totals.sql`. `0009`/`0010` (F04) e `0008` permanecem byte-idênticas. Mesmo precedente de `0006` corrigindo `0005` por migração nova. | `TypeScript-development-guidelines.md` §22.3; precedente `0006`; `CLAUDE.md` | confirmada |
| 15 | **RPC em vez de view com `security_invoker`.** Uma view sobre `password_releases` com `security_invoker = true` herdaria a RLS e dispensaria a migração de função. Foi descartada porque o repositório não tem nenhum precedente de view e tem quatro de RPC `SECURITY DEFINER` com guard explícito (`0004`, `0006`, `0007`, `0008`); seguir o padrão dominante custa menos revisão do que introduzir uma segunda forma de leitura privilegiada. | Política de padrões conflitantes (escolher o mais frequente); `supabase/migrations/*` | confirmada |
| 16 | **Nenhum dado de balanceamento é lido, escrito ou inventado.** F05 não conhece preço de carta, `N` estrelas por vitória, saldo inicial nem limiar de liberação cara. Nenhuma tabela pendente da Fase 0.4 (guardiões, terrenos, fusões, drops, rating) é tocada. | Fase 0.4 do skill; `arquitetura.md` §10 | confirmada |
| 17 | Identificadores e comentários em inglês, mensagens de UI em Português — convenção do `CLAUDE.md`, seguida por todas as features anteriores. | `CLAUDE.md` | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---|---|---|---|
| `packages/shared/src/economy/constants.ts` | shared | alterado (criado por F01/F03) | Acrescenta `RELEASE_HISTORY_PAGE_SIZE` (Decisão 5) |
| `packages/shared/src/economy/release-history.ts` | shared | novo | Tipos `CardReleaseRecord`, `ReleaseHistoryEntry`, `ReleaseHistoryTotals`, `ReleaseHistoryPage`, `LoadedReleaseHistory`, `CachedReleaseHistory` |
| `packages/shared/src/economy/release-history-schema.ts` | shared | novo | Schemas zod: `CardReleaseRowSchema` (linha snake_case do PostgREST), `ReleaseHistoryTotalsResponseSchema` (resposta snake_case da RPC), `CachedReleaseHistorySchema` (registro lido do IndexedDB) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos tipos, schemas e a constante |
| `packages/rules/src/password/release-history.ts` | rules | novo | Puras: `mergeReleaseHistory`, `summarizeReleaseHistory`, `nextHistoryCursor` |
| `packages/rules/src/password/release-history.test.ts` | rules | novo | Unitários table-driven da união, da dedup por `redemptionId` e da ordenação |
| `packages/rules/src/password/release-history.properties.test.ts` | rules | novo | Propriedades: ordenação total, idempotência da união, totais não negativos, pendente nunca somado ao confirmado |
| `packages/rules/src/password/index.ts` | rules | alterado (criado por F03) | Reexporta o subdomínio de extrato |
| `supabase/migrations/0011_create_release_history_totals.sql` | supabase | novo | RPC `get_password_release_totals`, `SECURITY DEFINER`, guard `p_player_id = auth.uid()`, `GRANT EXECUTE` a `authenticated`/`service_role` |
| `apps/web/src/lib/release-history/supabase-repository.ts` | web | novo | Porta `ReleaseHistoryRepository` + adaptador Supabase: página keyset de `password_releases` e chamada da RPC de totais, ambas validadas por zod |
| `apps/web/src/lib/release-history/supabase-repository.test.ts` | web | novo | Cliente Supabase falso: página cheia/parcial/vazia, cursor, resposta malformada, erro de rede |
| `apps/web/src/lib/release-history/indexeddb-cache.ts` | web | novo | Porta `ReleaseHistoryCache` + adaptador IndexedDB da store `releaseHistory` |
| `apps/web/src/lib/release-history/indexeddb-cache.test.ts` | web | novo | Round-trip do snapshot, registro corrompido, ausência de snapshot |
| `apps/web/src/lib/release-history/load-release-history.ts` | web | novo | `loadReleaseHistory` (primeira página + totais + fila, reconciliados) e `loadMoreReleaseHistory` (páginas seguintes, sem fila) |
| `apps/web/src/lib/release-history/load-release-history.test.ts` | web | novo | Ramos `origin: "server"` / `"cache"`, fila vazia, item pendente já confirmado, servidor e cache indisponíveis |
| `apps/web/src/lib/collection/indexeddb-cache.ts` | web | alterado | Sobe `DATABASE_VERSION` de `6` para `7` e cria a store `releaseHistory` (Decisão 13) |
| `apps/web/src/lib/password/catalog-payload.ts` | web | alterado (criado por F03) | `fromPasswordPayload` passa a expor também o índice `numero → Card` (Decisão 11) |
| `apps/web/src/hooks/use-release-history.ts` | web | novo | Estado da aba: carga inicial, `loadMore`, estados `loading` / `ready` / `unavailable` |
| `apps/web/src/hooks/use-release-history.test.ts` | web | novo | Carga única, paginação incremental, falha na página seguinte não descarta as já carregadas |
| `apps/web/src/app/password/password-client.tsx` | web | alterado (criado por F03) | Estado da aba ativa e montagem do painel de histórico |
| `apps/web/src/app/password/password-client.test.tsx` | web | alterado (criado por F03) | Alternância entre as abas preserva o estado da busca de F03 |
| `apps/web/src/components/password/messages.ts` | web | alterado (criado por F03) | Acrescenta as mensagens do extrato, em Português |
| `apps/web/src/components/password/password-tabs.tsx` | web | novo | Alternância acessível "Liberar" / "Histórico" (`role="tablist"`) |
| `apps/web/src/components/password/password-tabs.test.tsx` | web | novo | Seleção por clique e por teclado, `aria-selected`, painel associado |
| `apps/web/src/components/password/release-history-panel.tsx` | web | novo | Painel: resumo, lista, "Carregar mais", estados vazio e de falha |
| `apps/web/src/components/password/release-history-panel.test.tsx` | web | novo | Cada estado do painel, incluindo a ordem de renderização |
| `apps/web/src/components/password/release-history-entry.tsx` | web | novo | Uma linha do extrato: nome/`numero`, `−X⭐`, data/hora, marcação de pendente |
| `apps/web/src/components/password/release-history-entry.test.tsx` | web | novo | Confirmada, pendente, carta desconhecida (Decisão 10) |
| `apps/web/src/components/password/release-history-summary.tsx` | web | novo | `N liberações · total X⭐` + `(+Y⭐ pendente)` quando houver fila |
| `apps/web/src/components/password/release-history-summary.test.tsx` | web | novo | Com e sem pendentes; zero liberações |
| `apps/web/tests/release-history.integration.test.ts` | web | novo | RLS, paginação e totais contra o Supabase local |
| `apps/web/tests/release-history-read-only.test.ts` | web | novo | Trava que F05 não escreve em carteira, coleção nem `password_releases` (Decisão 8) |

**Verificação da direção de dependências** (`shared ← data ← rules ← engine ← ai`, com
`web`/`server` no topo):

- `packages/shared/src/economy/release-history*.ts` — importa apenas `zod` e módulos do próprio
  `shared` (`CardNumberSchema`). É a raiz do grafo.
- `packages/rules/src/password/release-history.ts` — importa **apenas** `@yugioh/shared`. Sem
  `@yugioh/data`, sem `@yugioh/engine`, sem React, DOM, `fetch`, `node:*` ou Supabase. As linhas
  confirmadas e os pendentes entram como **valores**; a função não lê nada por conta própria —
  mesmo padrão de injeção que `CardCatalogLookup` estabelece. Respeita
  `rules-depends-only-on-shared` e `domain-cores-are-pure`.
- `apps/web` importa `@yugioh/shared` e `@yugioh/rules`; nada importa `apps/web` de volta.
- `apps/web/src/lib/release-history/**` não importa `lib/redemption/**` a não ser pelo **tipo**
  `PendingCardRedemption` e pela **porta** de leitura da fila, injetada; não importa
  `lib/reward/**` nem `lib/free-duel/**`, preservando a fronteira herdada de `free-duel/F07`.
- Nenhum arquivo desta feature importa `packages/engine` ou `packages/ai`: F05 não participa do
  motor de duelo. Por isso **não há seção de determinismo/PRNG de duelo** — o único determinismo
  relevante é a ordenação total das funções puras de `packages/rules`, declarada na Seção 3.
- As migrações vivem em `supabase/`, fora do grafo de pacotes TypeScript.

**Fronteira servidor/cliente em `apps/web` (regra crítica do `CLAUDE.md`):** todo o código de F05
é de cliente. Nenhum módulo sob `lib/release-history/`, `hooks/` ou `components/password/` importa
`lib/catalog/sealed-catalog.ts`, `lib/password/catalog-password.ts` ou qualquer coisa em
`lib/server/` — o que arrastaria `node:fs` para o bundle do browser e quebraria a rota. A única
leitura de disco da rota `/password` continua sendo a de `page.tsx`, entregue por F03; F05
consome o payload já serializado. `lib/password/catalog-payload.ts` (alterado na Decisão 11) já
existe separado de `catalog-password.ts` exatamente por essa razão.

## 3. Design Técnico

### Estruturas de dados

**`CardReleaseRecord`** (`shared`) — uma linha confirmada de `password_releases`, já em
camelCase, depois de validada na fronteira:

| Campo | Tipo | Semântica |
|---|---|---|
| `redemptionId` | `string` (uuid) | PK da liberação em `password_releases`; a chave de reconciliação com a fila |
| `cardNumber` | `CardNumber` | `numero` da carta liberada; resolve o nome contra o catálogo (Decisão 9) |
| `starsSpent` | `number` | Inteiro `≥ 0`; o preço efetivamente cobrado pela transação de F04 |
| `createdAt` | `string` (ISO) | Instante do commit da liberação; também o cursor da paginação |

**`ReleaseHistoryEntry`** (`shared`) — o que a lista renderiza, união de dois ramos com a mesma
forma exceto pelo discriminante:

- `{ status: "confirmed"; redemptionId; cardNumber; starsSpent; occurredAt }` — veio do servidor
- `{ status: "pending"; redemptionId; cardNumber; starsSpent; occurredAt }` — veio da fila
  `pendingPasswordRedemptions`; `starsSpent` é o `expectedStars` da intenção e `occurredAt` é o
  `createdAt` dela. **É uma expectativa, não um fato cobrado** — a UI marca isso explicitamente,
  e o número nunca entra no total confirmado.

**`ReleaseHistoryTotals`** (`shared`) — quatro contadores mantidos deliberadamente separados,
para que nenhum consumidor possa somar confirmado com pendente por acidente:

| Campo | Tipo | Origem |
|---|---|---|
| `confirmedCount` | `number` | RPC `get_password_release_totals` |
| `confirmedStars` | `number` | RPC `get_password_release_totals` (soma `bigint` no banco, ver Decisão 7) |
| `pendingCount` | `number` | fila local, após a dedup |
| `pendingStars` | `number` | fila local, após a dedup |

**`ReleaseHistoryPage`** (`shared`) — `{ records: readonly CardReleaseRecord[]; nextCursor: string | undefined }`.
`nextCursor` é `undefined` quando a página veio incompleta (menos de `RELEASE_HISTORY_PAGE_SIZE`
linhas), que é o sinal de fim de lista.

**`LoadedReleaseHistory`** (`shared`) — o resultado que o hook expõe:

```
{ origin: "server" | "cache";
  entries: readonly ReleaseHistoryEntry[];
  totals: ReleaseHistoryTotals;
  nextCursor: string | undefined;
  syncedAt: string }
```

`origin: "cache"` implica `nextCursor: undefined` — offline não há como buscar a próxima página
(Decisão 12).

**`CachedReleaseHistory`** (`shared`) — o snapshot do IndexedDB:
`{ playerId; records: readonly CardReleaseRecord[]; totals: { confirmedCount; confirmedStars }; syncedAt }`.
Guarda **apenas** linhas confirmadas e os dois totais confirmados: os pendentes já vivem na store
`pendingPasswordRedemptions` de F04 e duplicá-los aqui criaria duas verdades para o mesmo item.

**`ReleaseHistoryViewState`** (`apps/web`, no hook) — a máquina de estados da aba:

```
| { status: "loading" }
| { status: "ready"; history: LoadedReleaseHistory; loadingMore: boolean; loadMoreFailed: boolean }
| { status: "unavailable"; error: DomainError }
```

### Fluxo — abrir a aba Histórico (caminho feliz e seus desvios)

1. O jogador está em `/password` (rota de F03) e aciona a aba "Histórico". `PasswordTabs` troca
   o painel visível; o estado da busca de senha de F03 **não** é descartado — voltar para
   "Liberar" reencontra o preview onde estava.
2. `useReleaseHistory` dispara `loadReleaseHistory` **uma única vez** por sessão de tela, no
   primeiro acesso à aba. Abrir e fechar a aba não recarrega; a recarga acontece quando F04
   sinaliza uma liberação bem-sucedida (passo 11).
3. `loadReleaseHistory` pede, em paralelo: a primeira página de `password_releases`
   (`RELEASE_HISTORY_PAGE_SIZE + 1` linhas — a linha extra detecta "há mais" sem uma segunda
   consulta), o agregado da RPC de totais, e a lista de pendentes do jogador na store
   `pendingPasswordRedemptions`.
4. Cada linha do PostgREST passa por `CardReleaseRowSchema` antes de virar `CardReleaseRecord`; a
   resposta da RPC passa por `ReleaseHistoryTotalsResponseSchema`; cada registro do IndexedDB
   passa por `PendingCardRedemptionSchema` (o schema de F04). As três são fronteiras não
   confiáveis e recebem o mesmo tratamento — `TypeScript-development-guidelines.md` (validação em
   fronteira) e `arquitetura.md` §0.
5. `mergeReleaseHistory` (pura, `packages/rules`) recebe as linhas confirmadas e os pendentes e
   devolve `ReleaseHistoryEntry[]`: descarta o pendente cujo `redemptionId` está entre os
   confirmados (Decisão 2), converte o restante em entradas `pending`, concatena com as
   `confirmed` e ordena por `occurredAt` decrescente, desempatando por `redemptionId` crescente
   (Decisão 4).
6. `summarizeReleaseHistory` combina os totais do servidor com a contagem/soma dos pendentes que
   sobreviveram à dedup, mantendo os quatro números separados.
7. A primeira página confirmada e os totais confirmados são gravados no cache IndexedDB. Uma
   falha de cache **não** invalida um resultado de servidor já obtido — mesma tolerância que
   `loadWalletBalance` já aplica.
8. Falha do servidor (rede, RLS, sessão): `loadReleaseHistory` tenta o cache. Havendo snapshot,
   devolve `origin: "cache"` com os pendentes ainda mesclados por cima e `nextCursor: undefined`.
   Não havendo, devolve `err(DomainError)` e a aba entra em `unavailable`.
9. "Carregar mais" chama `loadMoreReleaseHistory(cursor)`, que busca **somente** a página
   seguinte — sem fila, sem totais, sem cache (Decisões 3 e 12) — e concatena ao fim da lista. O
   botão só existe quando `nextCursor` está definido, e some quando a página volta incompleta.
10. Falha ao carregar a página seguinte não descarta o que já está na tela: a lista permanece,
    `loadMoreFailed` liga e a mensagem convida a tentar de novo.
11. Quando F04 conclui uma liberação com `status: "applied"`, a aba de histórico é marcada como
    obsoleta e recarrega a primeira página no próximo acesso. F05 **não** insere a liberação na
    lista por conta própria: o extrato reflete o que o servidor registrou, e a releitura é a
    única forma de garantir isso sem manter um segundo modelo do banco no cliente.

### Regras de negócio

- **Somente leitura, sem exceção.** F05 não executa `insert`, `update`, `delete` nem RPC de
  escrita. A única RPC que chama, `get_password_release_totals`, é declarada `stable` e não
  escreve. — PRD §6 F05 Capabilities.
- **Ordem cronológica decrescente**, do mais recente para o mais antigo, com desempate
  determinístico por `redemptionId` crescente. — PRD §6 F05 Capabilities e §9 F05.
- **Uma linha por liberação.** Liberar a mesma carta 3× produz 3 entradas distintas, com
  `redemptionId` distintos, e `collections.quantity = 3`. O extrato **não** agrupa por carta:
  agrupar esconderia o custo de cada aquisição, que é o que a feature existe para mostrar. — PRD
  §6 F04 Capabilities ("cópias ilimitadas").
- **Pendente nunca conta como gasto.** `pendingStars` e `confirmedStars` são exibidos como dois
  números e jamais somados. Uma liberação enfileirada offline ainda pode falhar por saldo
  insuficiente no servidor (spec `password/F04` §6) — apresentá-la como gasto seria afirmar um
  débito que não ocorreu.
- **Uma liberação bloqueada por saldo insuficiente não aparece no extrato**, em nenhum dos dois
  estados: F04 bloqueia antes de enviar (`blocked_insufficient`) e não enfileira, e o servidor,
  se chegar a ser chamado, devolve `insufficient_stars` sem escrever linha em
  `password_releases`. Não há caminho que produza uma entrada. — PRD §9 Cross-Feature.
- **Sem senha no extrato.** `password_releases` não guarda a senha usada e F05 não a reconstrói.
- **Contagem de página:** a consulta pede `RELEASE_HISTORY_PAGE_SIZE + 1` linhas e exibe no
  máximo `RELEASE_HISTORY_PAGE_SIZE`; a existência da linha extra é o sinal de `nextCursor`.
- **Carta não resolvida** é renderizada com o `numero` cru e marcação de indisponibilidade, nunca
  derruba a lista (Decisão 10).

### Determinismo e pureza

F05 não toca `packages/engine`, então não há PRNG, seed nem snapshot de duelo. O determinismo
relevante é o das três funções de `packages/rules`:

- `mergeReleaseHistory` é **total e determinística**: a ordenação por `(occurredAt desc,
  redemptionId asc)` é uma ordem total sobre entradas com `redemptionId` único, então a mesma
  entrada nunca produz duas saídas diferentes. Não lê relógio, rede nem `Math.random()`.
- `mergeReleaseHistory` é **idempotente sob reaplicação**: mesclar um resultado já mesclado com a
  mesma fila devolve exatamente a mesma lista.
- `summarizeReleaseHistory` é pura e monotônica: nenhum total pode ser negativo, e
  `confirmedStars` nunca é alterado pelos pendentes.
- Nenhuma das três muta os arrays de entrada.

## 4. Contratos

### Tipos, schemas e constantes (`packages/shared`)

```
// economy/constants.ts (acrescentado ao arquivo que F01/F03 criam)
RELEASE_HISTORY_PAGE_SIZE: number = 20
  // Parâmetro de UI, não de balanceamento (Decisão 5). Ponto único de troca.

// economy/release-history.ts
type CardReleaseRecord = Readonly<{
  redemptionId: string; cardNumber: CardNumber; starsSpent: number; createdAt: string;
}>;

type ReleaseHistoryEntry =
  | { status: "confirmed"; redemptionId: string; cardNumber: CardNumber;
      starsSpent: number; occurredAt: string }
  | { status: "pending";   redemptionId: string; cardNumber: CardNumber;
      starsSpent: number; occurredAt: string };

type ReleaseHistoryTotals = Readonly<{
  confirmedCount: number; confirmedStars: number;
  pendingCount: number;   pendingStars: number;
}>;

type ReleaseHistoryPage = Readonly<{
  records: readonly CardReleaseRecord[]; nextCursor: string | undefined;
}>;

type LoadedReleaseHistory = Readonly<{
  origin: "server" | "cache";
  entries: readonly ReleaseHistoryEntry[];
  totals: ReleaseHistoryTotals;
  nextCursor: string | undefined;
  syncedAt: string;
}>;

type CachedReleaseHistory = Readonly<{
  playerId: string;
  records: readonly CardReleaseRecord[];
  totals: Readonly<{ confirmedCount: number; confirmedStars: number }>;
  syncedAt: string;
}>;
```

```
// economy/release-history-schema.ts (zod, fronteiras não confiáveis)
CardReleaseRowSchema
  // valida a linha snake_case do PostgREST:
  // { redemption_id: uuid, numero: CardNumber, stars_spent: int >= 0, created_at: string }
ReleaseHistoryTotalsResponseSchema
  // valida a resposta snake_case da RPC:
  // { total_releases: int >= 0, total_stars_spent: int >= 0 }
  // O `bigint` do Postgres chega como number ou string via PostgREST; o schema aceita ambos e
  // normaliza para number, rejeitando o que não for inteiro seguro.
CachedReleaseHistorySchema
  // valida o registro lido do IndexedDB, mesmo tratamento que PendingVictoryRewardSchema recebe
```

Novos códigos de `DomainError`: `release_history_unavailable` (servidor e cache inalcançáveis),
`release_history_response_invalid` (linha ou resposta de RPC reprovada pelo schema),
`release_history_page_unavailable` (falha somente na página seguinte, com a lista atual
preservada). Reusados sem redefinição: `session_missing`.

### Funções públicas (`packages/rules` — puras)

```
mergeReleaseHistory(input: {
  confirmed: readonly CardReleaseRecord[];
  pending: readonly PendingCardRedemption[];
}): readonly ReleaseHistoryEntry[]
  // Pura, total e determinística. Não lança, não muta as entradas.
  // pré: os elementos de `confirmed` têm redemptionId único entre si (garantido pela PK)
  // pós: nenhum redemptionId aparece duas vezes na saída
  //      todo pending cujo redemptionId consta em `confirmed` é descartado (Decisão 2)
  //      saída ordenada por (occurredAt desc, redemptionId asc) — ordem total
  //      |saída| === |confirmed| + |pending não deduplicados|
  //      chamada com pending: [] devolve exatamente `confirmed` mapeado, na mesma ordem

summarizeReleaseHistory(input: {
  serverTotals: { confirmedCount: number; confirmedStars: number };
  pendingEntries: readonly ReleaseHistoryEntry[];   // já deduplicados por mergeReleaseHistory
}): ReleaseHistoryTotals
  // Pura e total.
  // pós: confirmedCount/confirmedStars são repassados sem alteração — jamais recalculados a
  //      partir das linhas carregadas, que são só uma página (Decisão 6)
  //      pendingCount = |pendingEntries|; pendingStars = soma de starsSpent deles
  //      todos os quatro campos são inteiros >= 0

nextHistoryCursor(
  records: readonly CardReleaseRecord[],
  pageSize: number,
): string | undefined
  // Pura e total.
  // pós: |records| > pageSize ⇒ createdAt do último registro dentro do limite de pageSize
  //      |records| <= pageSize ⇒ undefined (fim da lista)
```

### Fronteira de I/O (`apps/web` — portas e orquestração)

```
type ReleaseHistoryRepository = Readonly<{
  loadPage(playerId: string, options: { limit: number; before: string | undefined }):
    Promise<Result<ReleaseHistoryPage, DomainError>>;
  loadTotals(playerId: string):
    Promise<Result<{ confirmedCount: number; confirmedStars: number }, DomainError>>;
}>;

type ReleaseHistoryCache = Readonly<{
  loadSnapshot(playerId: string): Promise<CachedReleaseHistory | undefined>;
  saveSnapshot(snapshot: CachedReleaseHistory): Promise<void>;
}>;

type PendingRedemptionReader = Readonly<{
  list(playerId: string): Promise<readonly PendingCardRedemption[]>;
}>;
  // Porta de leitura da store `pendingPasswordRedemptions` de F04. Deliberadamente sem
  // `remove`/`enqueue`: F05 lê a fila e nunca a altera (Seção 1, Fronteiras).

loadReleaseHistory(deps: {
  playerId: string | undefined;
  repository: ReleaseHistoryRepository;
  cache: ReleaseHistoryCache;
  pending: PendingRedemptionReader;
  clock: Clock;
}): Promise<Result<LoadedReleaseHistory, DomainError>>

loadMoreReleaseHistory(deps: {
  playerId: string;
  repository: ReleaseHistoryRepository;
  cursor: string;
}): Promise<Result<ReleaseHistoryPage, DomainError>>
```

`Clock` é o tipo já exportado por `apps/web/src/lib/collection/load-collection.ts` e reusado por
`loadWalletBalance`; nenhuma porta de tempo nova é introduzida.

### RPC `get_password_release_totals` (Postgres, `SECURITY DEFINER`)

Assinatura: `get_password_release_totals(p_player_id uuid)`, retornando
`table (total_releases integer, total_stars_spent bigint)`. Declarada `stable` — não escreve.

Comportamento:

1. Rejeita com exceção quando `p_player_id <> auth.uid()`, exatamente como
   `apply_victory_reward` (`migrations/0008`). Sem esse guard, um jogador autenticado poderia
   ler o total de outro, já que `SECURITY DEFINER` contorna a RLS. — `CLAUDE.md`.
2. Devolve `count(*)` e `coalesce(sum(stars_spent), 0)` sobre `password_releases` filtrada por
   `player_id = p_player_id`.
3. Jogador sem nenhuma liberação recebe `(0, 0)`, nunca `null` — o `coalesce` é o que garante
   que a tela de extrato vazio não precise tratar ausência de linha.

Chamada:

```json
{ "p_player_id": "3f2c1a9e-5b6d-4e7f-8a90-1b2c3d4e5f60" }
```

Resposta (jogador com histórico):

```json
{ "total_releases": 47, "total_stars_spent": 128400 }
```

Resposta (jogador sem nenhuma liberação):

```json
{ "total_releases": 0, "total_stars_spent": 0 }
```

### Leitura paginada de `password_releases`

Consulta do adaptador Supabase, sobre o índice `(player_id, created_at desc)` de F04:

- `select("redemption_id,numero,stars_spent,created_at")`
- `.eq("player_id", playerId)` — redundante com a RLS, mantido porque torna a intenção explícita
  e permite ao planejador usar o índice composto
- `.order("created_at", { ascending: false }).order("redemption_id", { ascending: true })`
- `.lt("created_at", cursor)` quando há cursor (primeira página não tem)
- `.limit(RELEASE_HISTORY_PAGE_SIZE + 1)`

Página exemplo (primeira, com mais linhas disponíveis — apenas as duas primeiras mostradas):

```json
[
  {
    "redemption_id": "7c9a1b2d-3e4f-4a5b-8c9d-0e1f2a3b4c5d",
    "numero": "001",
    "stars_spent": 999999,
    "created_at": "2026-07-31T14:02:11.492Z"
  },
  {
    "redemption_id": "1a2b3c4d-5e6f-4071-8293-a4b5c6d7e8f9",
    "numero": "215",
    "stars_spent": 800,
    "created_at": "2026-07-30T09:41:07.118Z"
  }
]
```

> Os valores de estrelas destes exemplos ilustram a **forma** da resposta; não são valores de
> balanceamento.

### Contratos externos consumidos

- **`password/F04`** (a ser fornecido por `password/F04`) — F05 consome a tabela
  `password_releases` com as colunas, o índice e a RLS declarados na Seção 5 daquela spec, e o
  tipo `PendingCardRedemption` + a store `pendingPasswordRedemptions`. F05 **não** redefine
  nenhum dos dois e **não** chama `redeem_card_by_password`.
- **`password/F03`** (a ser fornecido por `password/F03`) — F05 consome a rota `/password`, o
  `PasswordCatalogPayload` e `fromPasswordPayload` (com o índice por `numero` da Decisão 11), e
  acrescenta ao mapa `PASSWORD_MESSAGES` em vez de criar um segundo mapa de mensagens.
- **`build-deck/F03`** — nenhuma interação. A carta já entrou na coleção dentro da transação de
  F04; F05 não lê `collections`.

## 5. Modelo de Dados

### Postgres — migração `0011_create_release_history_totals.sql`

**Nenhuma tabela nova.** `password_releases` e seu índice são criados por
`0009_create_card_prices_and_password_releases.sql` (F04) e não são alterados aqui — Decisão 14.
F05 depende das seguintes propriedades daquela migração, e o `plan.md` as declara como
pré-requisito:

| Propriedade exigida de `password_releases` | Por quê |
|---|---|
| Índice `(player_id, created_at desc)` | Serve a ordenação e o keyset sem sort em memória |
| RLS `password_releases_select_own` (`player_id = auth.uid()`) | É o que torna a leitura direta do cliente segura |
| `GRANT select` a `authenticated` | Sem ele a RLS nem é alcançada — `CLAUDE.md` |
| `redemption_id` como PK | Garante a unicidade de que `mergeReleaseHistory` depende |
| `stars_spent integer not null check (>= 0)` | Garante que a soma não tem parcelas negativas |

**Função `get_password_release_totals(p_player_id uuid)`**

| Aspecto | Definição |
|---|---|
| Retorno | `table (total_releases integer, total_stars_spent bigint)` |
| Volatilidade | `stable` — leitura pura, sem escrita |
| Segurança | `security definer`, `set search_path = public, pg_temp` |
| Guard | `if p_player_id <> auth.uid() then raise exception` — obrigatório neste projeto (`CLAUDE.md`) |
| Agregação | `count(*)` e `coalesce(sum(stars_spent), 0)::bigint` filtrados por `player_id` |
| Privilégios | `revoke execute … from public, anon`; `grant execute … to authenticated, service_role` |

`total_stars_spent` é `bigint` (Decisão 7). `count(*)` é `bigint` no Postgres e é convertido para
`integer` no retorno: a contagem de liberações de um jogador não se aproxima de `int4`, enquanto a
soma sim.

**Atomicidade e idempotência:** não se aplicam a F05 no sentido de escrita — a feature não muta
economia. A propriedade que importa aqui é a **consistência de leitura**: a RPC devolve a soma
autoritativa do servidor, nunca uma soma parcial calculada no cliente (Decisão 6), e nenhum valor
sensível vem do cliente (o `p_player_id` é validado contra `auth.uid()`). A atomicidade do débito
continua sendo integralmente responsabilidade de `redeem_card_by_password` (F04, `arquitetura.md`
§5.2, ADR-006 §4).

### Cache local / fila offline (IndexedDB)

`DATABASE_VERSION` em `apps/web/src/lib/collection/indexeddb-cache.ts` sobe de `6` (deixado por
F04) para `7`, com uma object store nova no mesmo banco `yugioh-build-deck`:

| Store | Key path | Conteúdo |
|---|---|---|
| `releaseHistory` | `playerId` | `CachedReleaseHistory` — um snapshot por jogador: primeira página confirmada + totais confirmados |

A store `pendingPasswordRedemptions` (F04) é **lida** por F05 através da porta
`PendingRedemptionReader` e nunca escrita — a porta não expõe operação de escrita justamente para
tornar isso verificável por tipo, e não só por convenção.

Não há transação IndexedDB abrangendo múltiplas stores: F05 grava um único snapshot e lê a fila
numa transação `readonly` separada. Diferente de `applyOfflineVictoryReward` (`free-duel/F07`),
que precisa de transação única porque aplica um crédito local em três stores de uma vez, aqui não
existe nenhuma escrita cruzada a proteger.

O registro lido do IndexedDB é validado por `CachedReleaseHistorySchema` antes do uso — o
IndexedDB é fronteira não confiável como a rede, mesma regra que `createIndexedDbWalletCache` e
`createIndexedDbVictoryRewardQueue` já seguem.

### Arquivos de dados versionados

Nenhum artefato novo em `packages/data/generated/`. F05 não lê `cards.json` nem
`dataset-seal.json` diretamente: o nome da carta vem do `PasswordCatalogPayload` que `page.tsx`
(F03) já serializou. O hash do dataset não é alterado. `password_releases.dataset_version`
continua sendo escrito por F04 e não é exibido pelo extrato nesta versão — permanece disponível
para auditoria.

### Dado de balanceamento pendente

Nenhum. F05 não introduz, lê ou escreve nenhum valor de balanceamento, e nenhuma das tabelas
pendentes da Fase 0.4 (guardiões, terrenos, fusões, drops, rating) é tocada.
`RELEASE_HISTORY_PAGE_SIZE = 20` é parâmetro de UI, não de economia (Decisão 5).

## 6. Tratamento de Erros e Casos de Borda

O PRD não declara bloco `Error Handling` para F05 — é a única feature do módulo sem ele, coerente
com uma feature somente leitura. As mensagens abaixo são novas e seguem o tom das já fixadas por
F01–F04 e por `LIBRARY_MESSAGES`; a de cache espelha deliberadamente
`"Coleção carregada do cache; algumas cartas podem estar desatualizadas."` e
`"Saldo carregado do cache; sincronizando…"` (PRD §6 F01 Error Handling), para que o jogador
reconheça o mesmo estado nas três telas.

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Sem sessão autenticada | `playerId === undefined` em `loadReleaseHistory` | Não consulta servidor nem cache; aba entra em `unavailable` | "Faça login para ver seu histórico de liberações." |
| Servidor inalcançável, cache presente | `repository.loadPage` ou `loadTotals` devolve `err` e `cache.loadSnapshot` devolve snapshot | Renderiza `origin: "cache"` com os pendentes mesclados por cima; "Carregar mais" ausente (`nextCursor: undefined`) | "Histórico carregado do cache; sincronizando…" |
| Servidor inalcançável, sem cache | Ambos falham | `err('release_history_unavailable')`; aba em `unavailable` com ação de tentar novamente | "Não foi possível carregar seu histórico. Tente novamente." |
| Linha do PostgREST reprovada pelo schema | `CardReleaseRowSchema` falha | `err('release_history_response_invalid')`; **a página inteira é descartada**, não parcialmente aceita — uma resposta malformada indica divergência de contrato, não uma linha ruim isolada; registra no log estruturado | "Não foi possível carregar seu histórico. Tente novamente." |
| Resposta da RPC de totais reprovada pelo schema | `ReleaseHistoryTotalsResponseSchema` falha | Mesmo tratamento da linha acima | "Não foi possível carregar seu histórico. Tente novamente." |
| Registro corrompido na fila `pendingPasswordRedemptions` | `PendingCardRedemptionSchema` (F04) falha | O item é **ignorado individualmente** e registrado no log; os demais pendentes e todas as linhas confirmadas seguem. Aqui o descarte é por item porque o IndexedDB é armazenamento local sujeito a versão antiga, não um contrato de rede | Nenhuma — degradação silenciosa com log |
| Snapshot corrompido no cache IndexedDB | `CachedReleaseHistorySchema` falha | Tratado como "sem cache"; segue para o ramo de indisponibilidade | "Não foi possível carregar seu histórico. Tente novamente." |
| Falha ao gravar o cache após leitura bem-sucedida do servidor | Exceção em `cache.saveSnapshot` | Capturada e ignorada: um resultado de servidor continua utilizável sem cache. Mesma tolerância de `loadWalletBalance` | Nenhuma |
| Falha ao carregar a página seguinte | `loadMoreReleaseHistory` devolve `err` | A lista já carregada **permanece**; `loadMoreFailed` liga e o botão continua disponível | "Não foi possível carregar mais liberações. Tente novamente." |
| Jogador sem nenhuma liberação | Página vazia e `total_releases = 0` | Estado vazio; sem "Carregar mais"; sem resumo de totais | "Você ainda não liberou nenhuma carta por senha." |
| `numero` que não resolve no catálogo | `Object.hasOwn` no índice por `numero` devolve falso | A linha renderiza com o `numero` cru e marcação de indisponibilidade; a lista não quebra (Decisão 10); registra no log | "Carta {numero} indisponível no catálogo atual." |
| Liberação pendente que o servidor já confirmou | `redemptionId` do pendente consta entre os confirmados | O pendente é descartado da exibição; a linha confirmada é a única exibida. F05 **não** remove o item da fila — quem drena é `syncRedemptionQueue` (F04) | Nenhuma — a marcação "pendente" simplesmente some |
| Liberação pendente que nunca vai ser confirmada (saldo insuficiente no servidor) | Fora do alcance de F05: F04 remove o item da fila ao receber `insufficient_stars` | A entrada `pending` some do extrato no próximo carregamento; nenhum total confirmado foi alterado | Tratada por F04 |
| Sessão expira entre a primeira página e "Carregar mais" | `loadPage` devolve erro de autenticação | Tratado como falha de página seguinte; a lista atual permanece | "Não foi possível carregar mais liberações. Tente novamente." |
| Duas liberações do mesmo jogador com `created_at` idêntico | Impossível na prática (Decisão 4: `for update` em `wallets` serializa), mas coberto | O desempate por `redemption_id` mantém a ordem total e o cursor não pula linhas | Nenhuma |

## 7. Estratégia de Testes

### Unitários (Vitest)

`packages/rules/src/password/release-history.test.ts`:
- `mergeReleaseHistory returns confirmed records in descending chronological order`
- `mergeReleaseHistory places a pending redemption above older confirmed rows`
- `mergeReleaseHistory drops a pending redemption whose redemptionId is already confirmed`
- `mergeReleaseHistory keeps a pending redemption whose redemptionId is absent from the page`
- `mergeReleaseHistory breaks a created_at tie by ascending redemptionId`
- `mergeReleaseHistory with an empty pending queue returns exactly the confirmed records`
- `mergeReleaseHistory with an empty confirmed page returns only pending entries`
- `mergeReleaseHistory does not mutate its input arrays`
- `summarizeReleaseHistory passes server totals through without recomputing them from the page`
- `summarizeReleaseHistory counts pending stars separately from confirmed stars`
- `summarizeReleaseHistory returns four zeroes for a player with no releases`
- `nextHistoryCursor returns undefined when the page came back short`
- `nextHistoryCursor returns the createdAt of the last in-range record when an extra row exists`

`apps/web/src/lib/release-history/supabase-repository.test.ts` (cliente Supabase falso):
- `loadPage requests one row beyond the page size to detect a next page`
- `loadPage applies the keyset filter only when a cursor is given`
- `loadPage orders by created_at descending and redemption_id ascending`
- `loadPage maps snake_case rows to CardReleaseRecord`
- `loadPage rejects the whole page when one row fails CardReleaseRowSchema`
- `loadPage reports release_history_unavailable on a transport error`
- `loadTotals passes the player id to the RPC and normalises a bigint returned as a string`
- `loadTotals returns zeroes for a player with no releases`
- `loadTotals rejects a response that fails ReleaseHistoryTotalsResponseSchema`

`apps/web/src/lib/release-history/indexeddb-cache.test.ts`:
- `saveSnapshot then loadSnapshot round-trips a CachedReleaseHistory`
- `loadSnapshot returns undefined for a player with no snapshot`
- `loadSnapshot returns undefined for a corrupted record`

`apps/web/src/lib/release-history/load-release-history.test.ts`:
- `loadReleaseHistory returns origin server and caches the confirmed page and totals`
- `loadReleaseHistory merges the pending queue on top of the server page`
- `loadReleaseHistory falls back to the cache with origin cache and no next cursor`
- `loadReleaseHistory still merges pending redemptions when serving from cache`
- `loadReleaseHistory reports release_history_unavailable when server and cache both fail`
- `loadReleaseHistory reports session_missing without touching server or cache`
- `loadReleaseHistory keeps the server result when writing the cache throws`
- `loadReleaseHistory skips a corrupted pending record and keeps the others`
- `loadMoreReleaseHistory queries only the next page and never touches queue, totals or cache`

`apps/web/src/hooks/use-release-history.test.ts`:
- `use-release-history loads once and does not reload when the tab is reopened`
- `use-release-history appends the next page and clears the previous loadMoreFailed flag`
- `use-release-history keeps the loaded list when the next page fails`
- `use-release-history hides load-more once a short page arrives`
- `use-release-history reloads the first page after F04 reports an applied redemption`

Componentes (`// @vitest-environment jsdom`):
- `release-history-entry renders the card name resolved from the catalog`
- `release-history-entry renders the raw numero and an unavailable mark for an unresolved card`
- `release-history-entry marks a pending entry as pending`
- `release-history-summary renders the confirmed total and omits the pending line when the queue is empty`
- `release-history-summary renders the pending total as a separate number`
- `release-history-panel renders the empty state for a player with no releases`
- `release-history-panel renders the cache notice when origin is cache`
- `release-history-panel renders a retry action when the history is unavailable`
- `password-tabs switches panels by click and by keyboard and keeps aria-selected in sync`
- `password-client preserves the password lookup state when switching tabs`

### Property-based (fast-check)

`packages/rules/src/password/release-history.properties.test.ts` — o determinismo relevante fora
do `engine` é a ordenação total e a não-duplicação da união:

- `mergeReleaseHistory output is sorted by occurredAt descending and redemptionId ascending`
  — para qualquer par de listas geradas
- `mergeReleaseHistory never emits the same redemptionId twice`
- `mergeReleaseHistory is idempotent under re-merge` — remesclar a saída com a mesma fila
  devolve exatamente a mesma lista
- `mergeReleaseHistory output length equals confirmed length plus non-duplicated pending length`
- `mergeReleaseHistory is invariant to the input order of both lists` — embaralhar entrada não
  muda a saída
- `summarizeReleaseHistory never returns a negative total`
- `summarizeReleaseHistory never folds pending stars into confirmed stars` — `confirmedStars` da
  saída é sempre idêntico ao `confirmedStars` da entrada, para qualquer fila
- `nextHistoryCursor returns a cursor strictly greater than every createdAt of the next page` —
  garante que o keyset não pula nem repete linhas

Os geradores devem produzir `createdAt` repetidos e `redemptionId` colidentes entre as duas
listas de propósito: são exatamente os casos que a dedup e o desempate existem para cobrir.

### Integração

`apps/web/tests/release-history.integration.test.ts` — contra o Supabase local; lembrar que estes
testes são `describe.skipIf(!hasSupabaseEnv)` e **passam em verde sem rodar** se `SUPABASE_URL`,
`SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` não estiverem exportados (`CLAUDE.md`):

- `password_releases is readable only by its owner under RLS` — um segundo jogador autenticado
  não vê nenhuma linha do primeiro
- `get_password_release_totals rejects a p_player_id that is not the caller` — o guard de
  `auth.uid()` levanta exceção
- `get_password_release_totals returns zero counts for a player with no releases`
- `get_password_release_totals sums every release, not just the first page` — mais de
  `RELEASE_HISTORY_PAGE_SIZE` linhas
- `get_password_release_totals survives a sum beyond int4` — várias liberações em
  `UNPRICED_CARD_STARS`, provando o `bigint` da Decisão 7
- `the keyset cursor pages through every release exactly once` — insere N linhas, pagina até o
  fim e compara o conjunto obtido com o inserido
- `a release inserted between two pages does not duplicate or skip a row` — a prova concreta da
  Decisão 4 contra `offset`
- `the release history reflects a redemption applied by redeem_card_by_password` — encadeia a RPC
  de F04 e relê o extrato
- `the history names a card exactly as the library does` — monta o payload de `/password` a
  partir do catálogo selado (o mesmo `getSealedCatalog` que `/library` consome) e compara o nome
  resolvido pelo índice por `numero` com o do catálogo. Roda em Node, fora do bundle do
  navegador — o teste de componente equivalente usa fixture e não alcança o disco

`apps/web/tests/release-history-read-only.test.ts`:
- `the release history module never writes to wallets, collections or password_releases` — um
  cliente Supabase falso que falha em qualquer `insert`/`update`/`delete`/`upsert` e em qualquer
  RPC diferente de `get_password_release_totals`; trava a Decisão 8
- `the pending redemption reader port exposes no write operation` — trava por tipo que F05 não
  drena a fila de F04

### Análise estática

- `packages/rules/src/password/release-history.ts` não importa `node:*`, `@yugioh/data`,
  `@yugioh/engine`, React, DOM, `fetch` nem Supabase — pilar 1 de `arquitetura.md` e regra
  `domain-cores-are-pure` do `.dependency-cruiser.cjs` (uma das poucas que ainda funcionam neste
  repositório, segundo o `CLAUDE.md`; as regras keyed em `^packages/...` estão mortas, então a
  direção de dependências é verificada por leitura de imports, não por `pnpm lint` verde)
- Nenhum módulo sob `apps/web/src/lib/release-history/`, `hooks/use-release-history.ts` ou
  `components/password/` importa `lib/server/`, `lib/catalog/sealed-catalog.ts` ou
  `lib/password/catalog-password.ts` — a regra de fronteira servidor/cliente do `CLAUDE.md`
- `apps/web/src/lib/release-history/**` não importa `lib/reward/**` nem `lib/free-duel/**`

### Testes de aceitação (critérios do PRD §9, F05)

| Critério (Seção 9 do PRD) | Teste |
|---|---|
| Cada liberação bem-sucedida é registrada com `numero`/`nome`, estrelas gastas e data/hora | `the release history reflects a redemption applied by redeem_card_by_password` cobre `numero`, estrelas gastas e data/hora, que vêm da própria linha; `release-history-entry renders the card name resolved from the catalog` cobre o `nome`, que é resolvido pelo catálogo e não persistido (Decisão 9) |
| O histórico é exibido em ordem cronológica decrescente | `mergeReleaseHistory returns confirmed records in descending chronological order` + `mergeReleaseHistory output is sorted by occurredAt descending and redemptionId ascending` (property) + `loadPage orders by created_at descending and redemption_id ascending` |
| O histórico é somente leitura (não altera saldo nem coleção) | `the release history module never writes to wallets, collections or password_releases` + `the pending redemption reader port exposes no write operation` |
| O histórico persiste na conta de forma consistente com a carteira | `password_releases is readable only by its owner under RLS` + `loadReleaseHistory returns origin server and caches the confirmed page and totals` + `loadReleaseHistory falls back to the cache with origin cache and no next cursor` |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Cross-Feature: fluxo completo F02 → F03 → F04 → F05 sem estado inconsistente entre saldo e coleção | `the release history reflects a redemption applied by redeem_card_by_password`, encadeado após um `apply_victory_reward`: credita estrelas, libera a carta e verifica que o saldo em `wallets`, a `quantity` em `collections` e a linha lida pelo extrato descrevem a **mesma** transação |
| Cross-Feature: uma liberação bloqueada por saldo insuficiente (F04) não gera registro em F05 nem altera F01 | Reusa `redeem_card_by_password leaves no password_releases row after an insufficient_stars attempt` (spec F04 §7) e acrescenta a releitura pelo extrato: a lista continua vazia e `get_password_release_totals` continua em `(0, 0)` |
| Cross-Feature: o saldo exibido (F01) sempre reflete créditos menos débitos, sem divergência | `the release history module never writes to wallets…` — o extrato não é caminho de escrita de saldo; a soma do extrato e o saldo são verificados como números **independentes**, e o teste falha se algum componente de F05 tentar derivar um do outro (Decisão 8) |
| Cross-PRD (**Build Deck**): a carta liberada entra na coleção e fica disponível no editor de deck | Coberto por F04 (`redeem_card_by_password debits the wallet and increments the collection in one transaction`). F05 acrescenta apenas a verificação de que o extrato registra a mesma liberação, sem duplicar a asserção de coleção |
| Cross-PRD (**Library**): cartas liberadas passam a constar como obtidas | Coberto por F04 via `collections`. F05 verifica a outra direção — que extrato e Library nomeiam a mesma carta identicamente — em `apps/web/tests/release-history.integration.test.ts`, com o caso `the history names a card exactly as the library does`: o teste roda em Node, monta o payload de `/password` a partir do catálogo selado (o mesmo `getSealedCatalog` que `/library` consome) e compara o nome resolvido pelo índice por `numero` com o do catálogo. O teste de componente permanece em jsdom e recebe um payload de fixture, **sem** alcançar `getSealedCatalog` — a fronteira servidor/cliente da Seção 2 continua intacta |
| Cross-PRD (**Save/persistência**): saldo, liberações e coleção sobrevivem à troca de dispositivo | `password_releases is readable only by its owner under RLS` + releitura do extrato e dos totais por um segundo cliente autenticado da mesma conta, com o IndexedDB vazio (simula o segundo dispositivo) |
| Cross-PRD (**módulos de duelo**): o evento de vitória credita estrelas sem gerar entrada no extrato | `the release history reflects a redemption applied by redeem_card_by_password` verifica, antes da liberação, que um `apply_victory_reward` isolado deixa o extrato vazio — a fronteira `reward_ledger` vs. `password_releases` da Seção 1 |
