# Concessão de Carta (Drop por Vitória)

> PRD: `docs/prds/free-duel.md` — F06
> Pacote-alvo: `packages/rules` (+ `packages/shared`, `apps/web`)

## 1. Contexto e Escopo

F06 é o elo entre o resultado consolidado de F05 e o **sink de recompensa** já implementado por
`build-deck/F03`. Na vitória, F05 já resolveu uma **faixa de raridade** (`dropTier`) a partir da
nota — essa é a ponderação por desempenho que o PRD pede ("notas mais altas aumentam a
probabilidade de cair uma carta de faixa rara"): ela acontece no Rating Engine (cross-PRD), não
aqui. O que resta a F06 é mais estreito e mais mecânico: **escolher uma carta** dentre as
candidatas daquela faixa no pool do duelista derrotado (F01), **entregar** o `numero` escolhido ao
mecanismo de recompensa já existente (`registerCardReward`, `build-deck/F03`, já implementado com
RPC `apply_card_reward`, idempotência por `duel_id` e fila offline) e **exibir** a carta conquistada
na tela de resultado (F05).

A implementação atual já entrega os três contratos dos quais F06 depende: `ConsolidatedDuelResult`
(`packages/shared/src/duel/result.ts`, F05) com `rating.reward.dropTier` na vitória; `DropPool`/
`listCardNumbersForTier`/`getDropPool` (`packages/data/src/roster/drop-pool.ts`, F01); e
`registerCardReward` (`apps/web/src/lib/reward/register-card-reward.ts`, `build-deck/F03`) com a
RPC `apply_card_reward` já migrada (`supabase/migrations/0005_create_reward_ledger.sql` e
`0006_fix_apply_card_reward_auth_check.sql`). F06 não redefine nenhum desses três — apenas os
compõe.

**Achado de descoberta relevante:** existe também `packages/data/src/drops/**`
(`banco-de-cartas/F08` — "Tabelas de Drop por Duelista"), com um schema *diferente* e já com peso
por carta (`DropEntry.probabilidade`). É a mesma sobreposição que a spec de `free-duel/F01`
(Decisão 2) já sinalizou como "a confirmar — convergência com F08": o roster de F01 acabou
implementado com seu **próprio** `Duelist.dropPool` (por faixa, sem peso por carta), sem nunca
compor o schema de F08. F06 segue a instrução desta tarefa e consome o contrato **já implementado
e em uso** por F01/F03 (`Duelist.dropPool`, `getDropPool`, `listCardNumbersForTier`) — **não**
`packages/data/src/drops`. A reconciliação entre os dois sistemas de drop continua em aberto e é
registrada como premissa (Decisão 2 abaixo), não resolvida por esta spec.

### Incluído

- Sorteio puro de uma carta dentre as candidatas da faixa resolvida por F05, com **fallback neutro
  para uma faixa comum configurável** quando a faixa resolvida não tem candidatas no pool do
  duelista (PRD F06 Error Handling) — schema + algoritmo genérico, sem nenhum peso ou composição de
  pool inventados (Fase 0.4 do skill; `arquitetura.md` §4.3/§10)
- **Determinismo por `duelSessionId`**: a mesma sessão de duelo sempre produz a mesma carta
  sorteada, mesmo em nova renderização, retomada de aba ou reprocessamento — propriedade exigida
  pela integração com a idempotência por `duelId` de `build-deck/F03` (detalhado na Decisão 5)
- Orquestração que monta o evento de recompensa e delega inteiramente a `registerCardReward`
  (`build-deck/F03`, já implementado) — nenhuma nova tabela, nenhuma nova RPC, nenhuma nova fila
  offline
- Memoização em memória por `duelSessionId`, no mesmo padrão do cache de F05 (`resolveDuelResult`)
- Exibição da carta conquistada na tela de resultado (F05): arte, nome, faixa e confirmação de
  que foi somada à coleção
- Costura explícita para F07 (Carteira de Estrelas): mesma chave de idempotência
  (`duelSessionId`/`duelId`), mesmo ponto de composição na UI, e o nome da futura extensão de RPC
  que F07 deve considerar (Decisão 8)

### Fronteiras

Delimitadas pela Seção 7 do PRD (Fora de Escopo) e pelos blocos Consumes/Provides das features
vizinhas:

- **Cálculo da nota e resolução da faixa de raridade a partir dela** → **Rating Engine
  (cross-PRD)**, via **F05**. F06 recebe `dropTier` já resolvido e nunca reordena nem reinterpreta
  faixas entre si — a única "ponderação por nota" que compete a F06 é dentro da faixa já
  escolhida (ver Decisão 3).
- **Composição do pool de drops por duelista** → **F01**. F06 só lê `Duelist.dropPool` através de
  `getDropPool`/`listCardNumbersForTier`; nunca declara duelista, nunca popula pool.
- **Aplicação atômica/idempotente da recompensa, tabela `reward_ledger`, RPC `apply_card_reward`,
  fila offline `recompensas_pendentes`** → **`build-deck/F03`**, já implementado. F06 nunca grava
  em `reward_ledger` nem em `collections` diretamente, e nunca reimplementa a idempotência de rede
  — apenas garante que o *mesmo* `cardNumber` chegue a cada tentativa (Decisão 5).
- **Crédito de estrelas** → **F07**, ainda sem spec. F06 não credita nem calcula estrelas.
- **Navegação pós-duelo (revanche/trocar oponente/menu)** → **F08**, fora desta spec.
- **Regras de combate, turnos, IA** → Motor de Duelo 1x1 / IA de NPCs (cross-PRD); F06 não os toca.

### Contratos externos assumidos

- **`packages/shared/src/duel/result.ts` (F05, já implementado)** — `ConsolidatedDuelResult` com
  ramo `status: "victory"` contendo `duelSessionId`, `reason` e `rating: ConsolidatedRating`
  (`{ source: "rating_engine", grade, reward: { stars, dropTier } }` ou
  `{ source: "minimum_fallback", grade: null, reward: { stars, dropTier } }`). F06 lê apenas
  `reward.dropTier` de qualquer um dos dois ramos — a origem da nota (motor real ou fallback
  mínimo) não muda o comportamento de F06.
- **`packages/data/src/roster/drop-pool.ts` (F01, já implementado)** — `getDropPool(roster, id)`,
  `getDuelist(roster, id)`, `listCardNumbersForTier(pool, tier)`, operando sobre `DropPool`
  (`readonly DropTier[]`, `DropTier = { tier: DropTierId, cardNumbers: readonly CardNumber[] }`),
  definidos em `packages/shared/src/duelist/types.ts`.
- **`apps/web/src/lib/reward/register-card-reward.ts` (`build-deck/F03`, já implementado)** —
  `registerCardReward(event: unknown, deps: RegisterCardRewardDeps): Promise<Result<RewardResult,
  DomainError>>`, consumindo `CardRewardEvent { playerId, duelId, cardNumber }`
  (`packages/shared/src/collection/types.ts`/`schema.ts`), com a RPC `apply_card_reward` já
  migrada e com guarda `p_player_id = auth.uid()` (`supabase/migrations/0005` e `0006`). F06
  **reusa esta função inteira** — não a reimplementa nem duplica sua lógica de fila/offline.
- **`banco-de-cartas` — catálogo de cartas (`CardCatalogLookup`)** — usado indiretamente por
  `registerCardReward` (já injetado nas suas dependências); F06 não valida `numero` contra o
  catálogo de novo, apenas repassa o `cardNumber` escolhido.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | F06 não pondera entre faixas de raridade — isso já aconteceu no Rating Engine (`RatingReward.dropTier`, F05). O que F06 pondera é **apenas dentro** da faixa resolvida (e, em fallback, dentro da faixa comum configurada). Interpretação necessária porque `RatingReward`/`MinimumRatingReward` carregam uma única `dropTier` opaca, não uma distribuição sobre faixas. | `packages/shared/src/duel/result.ts` (já implementado); PRD F06 Capabilities | confirmada |
| 2 | F06 consome `Duelist.dropPool` (`packages/data/src/roster/drop-pool.ts`, F01), **não** `packages/data/src/drops/**` (`banco-de-cartas/F08`, schema `{ duelista, entradas: [{ numero, probabilidade }] }`). Os dois sistemas de drop coexistem no repositório sem terem sido reconciliados — a spec de F01 já registrou isso como "a confirmar — convergência com F08" (Decisão 2 de F01) e a instrução desta tarefa aponta explicitamente para o contrato de F01. Se a reconciliação for decidida no futuro (ex.: F01 passa a importar o schema de F08, trazendo `probabilidade` por carta), o parâmetro `weightLookup` da Decisão 3 é o ponto de extensão natural — F06 não precisa ser redesenhada, só receber pesos reais em vez do padrão uniforme. | achado desta spec; `docs/specs/free-duel/F01-.../spec.md` Decisão 2; `packages/data/src/drops/types.ts` | **a confirmar** — pendência pré-existente, não resolvida aqui |
| 3 | O sorteio dentro da faixa (e dentro do fallback comum) é **genérico e ponderável**: a função pura aceita um `weightLookup: (cardNumber) => number` opcional, com **peso uniforme (1) como padrão**. Nenhum peso concreto por carta é inventado — a Decisão 2 explica de onde um peso real viria no futuro. Sem `weightLookup`, o sorteio é equivalente a uma escolha uniforme entre as candidatas. | Fase 0.4 do skill ("nunca inventar pesos... especificar sorteio ponderado genérico"); auto-aceite | confirmada |
| 4 | **Fallback de faixa vazia/pool vazio** (PRD F06 Error Handling, "concede uma carta da faixa comum padrão do catálogo"): como o schema de carta da Fase 0 não tem nenhum campo de raridade (`product.md`), "faixa comum do catálogo" não pode ser derivada da carta em si. F06 modela isso como uma dependência **injetada e validada em tempo de composição** — `DefaultCommonDropPool` (lista não vazia de `CardNumber`, validada por zod) — análoga ao `MinimumRatingReward` de F05: um dado de balanceamento pendente (Fase 0.4), nunca um valor concreto inventado aqui. | PRD F06 Error Handling; `arquitetura.md` §4.3/§10; precedente `free-duel/F05` Decisão 4 (`MinimumRatingReward`) | pendente — aguarda dado de balanceamento |
| 5 | **Ausência da `DefaultCommonDropPool` torna a composição de F06 inválida** — nenhuma recompensa é concedida com carta adivinhada. Mesmo princípio da Decisão 5 de F05 ("ausência da política mínima torna a composição de F05 inválida"). Enquanto o dado de balanceamento não existir, o comportamento observável é: se o pool do duelista para a faixa resolvida está vazio **e** a `DefaultCommonDropPool` também está vazia/ausente, F06 devolve erro estrutural (`no_drop_candidates_available`) em vez de conceder qualquer carta — nunca uma falha silenciosa, e nunca uma exceção lançada (função pura total). | `arquitetura.md` §4.3/§10; precedente F05 Decisão 5 | confirmada |
| 6 | **Determinismo por `duelSessionId`**: o sorteio é uma função **pura** de `(dropPool, dropTier, defaultCommonDropPool, duelSessionId, weightLookup?)` — sem `RandomSource` injetado, sem `Math.random()`, sem I/O. A mesma sessão sempre resulta na mesma carta. Isso é exigido pela integração com `registerCardReward`: a RPC `apply_card_reward` é idempotente por `duel_id`, mas quando `applied = false` (já processado), ela devolve a quantidade atual da carta **que o chamador informou nesta tentativa**, não necessariamente a carta que foi de fato gravada na primeira tentativa. Se F06 sorteasse uma carta diferente a cada nova renderização/retomada, uma segunda tentativa para o mesmo `duelId` poderia exibir uma carta que nunca foi creditada. Determinismo por chave elimina esse risco sem exigir nenhuma mudança em `build-deck/F03`. `duelSessionId` é gerado por `crypto.randomUUID()` (`apps/web/src/lib/free-duel/seed-generator.ts`) — imprevisível para o jogador antes do fim do duelo, então determinismo aqui não é uma brecha de "escolher a própria carta". | achado desta spec (interação com `apply_card_reward`, `supabase/migrations/0005`); precedente conceitual: pilar de determinismo por seed do motor (`arquitetura.md` §3.1), adaptado fora do `engine` porque a exigência aqui é de idempotência de recompensa, não de regra de combate | confirmada |
| 7 | O núcleo do sorteio vive em `packages/rules`, **não** em `packages/data`, apesar de operar sobre dados de drop. Motivo: `packages/rules` só pode importar `packages/shared` (regra executável `rules-depends-only-on-shared` em `.dependency-cruiser.cjs`, e CLAUDE.md: "rules... consome o catálogo por injeção, nunca importando `data`"). A função recebe `DropPool` já resolvido como parâmetro (tipo de `packages/shared`) em vez de chamar `getDropPool`/`listCardNumbersForTier` de `@yugioh/data` — reimplementa localmente o filtro trivial por `tier` (`pool.find(...).cardNumbers`) em vez de importar a função de `data`. A busca do `DropPool` em si (via `@yugioh/data/roster`) continua acontecendo apenas em `apps/web`, que pode importar `data` livremente. | `.dependency-cruiser.cjs` regra `rules-depends-only-on-shared`; CLAUDE.md ("Consumes the catalog by injection... never by importing data") | confirmada |
| 8 | **Costura com F07 (Carteira de Estrelas):** F07 reaproveitará `duelSessionId` como a **mesma chave de idempotência** desta feature (`duelId` na tabela `reward_ledger`, coluna `stars` já existente com `DEFAULT 0`, `supabase/migrations/0005_create_reward_ledger.sql`). A extensão exata do RPC/tabela (ex.: evoluir `apply_card_reward` para um `apply_victory_reward` aceitando `p_stars`, ou uma RPC irmã) fica a cargo da spec de F07, que deve ler esta spec primeiro. F06 não implementa, não nomeia e não reserva essa extensão além de garantir que `grantCardDrop`/`registerCardReward` continuam a única escrita de carta por `duelId` — nenhuma mudança de schema é feita aqui. O ponto de plugue de UI para F07 é o mesmo componente de resultado (`duel-result.tsx`) e o mesmo componente de tela (`duel-screen.tsx`), ao lado de `CardDropReward` (Seção 2). | instrução explícita da tarefa; `arquitetura.md` §5.3, ADR-006 (needs-input); `supabase/migrations/0005_create_reward_ledger.sql` (comentário sobre `stars`) | a confirmar quando F07 tiver spec |
| 9 | F06 **não** reimplementa o fallback de rede/offline descrito no PRD F06 Error Handling ("Falha ao entregar a carta... registra localmente e enfileira"): esse comportamento já existe inteiramente em `registerCardReward` (`build-deck/F03`, já implementado com `applyOfflineReward` + `recompensas_pendentes`). A spec de `build-deck/F03` já registrou esse mesmo fallback de F06 como "redundante e substituído" pelo mecanismo dela — F06 apenas chama a função existente. | `docs/specs/build-deck/F03-.../spec.md` ("Fronteiras" e Decisão 4); PRD F06 Error Handling | confirmada |
| 10 | Identificadores de código em inglês, mensagens de UI em português — mesma convenção já aplicada por F05 (`ConsolidatedDuelResult`, `resolveDuelResult`) e divergente da nomenclatura em português usada pelas specs mais antigas de F01/`build-deck`/F03 (`obterPoolDrops`, `registrarRecompensaDeCarta`), que **não** foi o que ficou implementado (o código real usa `getDropPool`, `registerCardReward`). Esta spec segue o código real, não as specs antigas, para não propor contratos que divergirão da implementação de novo. | CLAUDE.md ("Code, comments and identifiers are in English"); achado desta spec (inspeção de `packages/data/src/roster/drop-pool.ts` e `apps/web/src/lib/reward/register-card-reward.ts`) | confirmada |
| 11 | Sem divisão Core/Full Scope no PRD para F06 — a spec cobre o escopo completo da Seção 6 F06. | PRD §6 F06 | confirmada |
| 12 | F06 não introduz nenhuma tabela Postgres, nenhuma migração e nenhum store IndexedDB novo. Reaproveita integralmente `reward_ledger`/`apply_card_reward` (`0005`, `0006`) e `recompensas_pendentes`/o cache de coleção de `build-deck/F03`. A única estrutura nova é um cache em memória por `duelSessionId`, do mesmo tipo e mesmo ciclo de vida do cache de F05 (`Map`, vive só durante a execução do app). | precedente F05 §5 ("cache é um Map... dura somente durante a execução do app") | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/duelist/drop-reward.ts` | shared | novo | Tipos `DropRewardSource`, `DropRewardOutcome`, `DefaultCommonDropPool`, `CardWeightLookup` |
| `packages/shared/src/duelist/drop-reward-schema.ts` | shared | novo | `DefaultCommonDropPoolSchema` (zod: array de `CardNumberSchema`, mínimo 1) |
| `packages/shared/src/index.ts` | shared | alterado | Exporta os novos tipos/schemas de `duelist/drop-reward*` |
| `packages/rules/src/drop-reward/deterministic-selection.ts` | rules | novo | `deriveDeterministicIndex`, `deriveWeightedSelection` — utilitário de seleção determinística por chave string, sem `Math.random()` |
| `packages/rules/src/drop-reward/select-drop-card.ts` | rules | novo | `selectDropCardNumber` — núcleo puro do sorteio, com fallback para a faixa comum |
| `packages/rules/src/drop-reward/index.ts` | rules | novo | Reexporta o subsistema |
| `packages/rules/src/index.ts` | rules | alterado | Acrescenta os exports de `drop-reward/` |
| `packages/rules/src/drop-reward/deterministic-selection.test.ts` | rules | novo | Unitários do utilitário determinístico |
| `packages/rules/src/drop-reward/deterministic-selection.properties.test.ts` | rules | novo | Propriedades: determinismo, faixa de índice válida, distribuição respeita peso relativo |
| `packages/rules/src/drop-reward/select-drop-card.test.ts` | rules | novo | Unitários table-driven de `selectDropCardNumber` |
| `packages/rules/src/drop-reward/select-drop-card.properties.test.ts` | rules | novo | Propriedades: nunca sai do conjunto de candidatas, nunca lança, determinismo ponta a ponta |
| `apps/web/src/lib/free-duel/grant-card-drop.ts` | web | novo | `grantCardDrop` — orquestra seleção + `registerCardReward`, com cache em memória por `duelSessionId` |
| `apps/web/src/lib/free-duel/grant-card-drop.test.ts` | web | novo | Unitários da orquestração com dependências falsas |
| `apps/web/src/hooks/use-card-drop-reward.ts` | web | novo | Hook fino: dispara `grantCardDrop` somente quando o resultado é vitória |
| `apps/web/src/hooks/use-card-drop-reward.test.ts` | web | novo | Unitários do hook (estados loading/resolved/indisponível) |
| `apps/web/src/components/free-duel/card-drop-reward.tsx` | web | novo | Exibe a carta conquistada: arte, nome, faixa, confirmação de coleção |
| `apps/web/src/components/free-duel/card-drop-reward.test.tsx` | web | novo | Testes dos ramos visuais (concedida, offline, indisponível, pendente) |
| `apps/web/src/components/free-duel/duel-result.tsx` | web | alterado | Renderiza `CardDropReward` dentro do ramo de vitória |
| `apps/web/src/components/free-duel/duel-result.test.tsx` | web | alterado | Cobre a composição com `CardDropReward` |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.tsx` | web | alterado | Guarda o `DuelScreenContext` carregado (hoje descartado após o efeito) em estado, para repassar `duelist.dropPool` a `EndedDuelResult`/`CardDropReward` |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.test.tsx` | web | alterado | Cobre a passagem de `dropPool` ao resultado |
| `apps/web/tests/free-duel-card-drop.integration.test.tsx` | web | novo | Fluxo F03(orquestração)→F05→F06 com portas externas controladas |

**Verificação da direção de dependências:**

- `packages/shared/src/duelist/drop-reward*.ts` importa apenas outros arquivos de
  `packages/shared` (nenhuma dependência de pacote).
- `packages/rules/src/drop-reward/**` importa **apenas** `packages/shared` — nenhum import de
  `packages/data`, `packages/engine`, `packages/ai`, React, DOM, `fetch`, `node:*` ou Supabase
  (Decisão 7; regra `rules-depends-only-on-shared` do `.dependency-cruiser.cjs`). O `DropPool` é
  recebido como parâmetro; a busca por `duelistId` continua em `apps/web`.
- `apps/web` importa `packages/shared`, `packages/rules` e `packages/data` (via
  `@yugioh/data/roster`, já usado por `load-client-roster.ts`) — nenhum import na direção
  contrária.
- Nenhum arquivo desta feature importa `packages/engine` ou `packages/ai`. F06 não produz nem
  consome estado de duelo, evento de motor ou PRNG semeado do motor — o determinismo exigido aqui
  (Decisão 6) é local à função pura de seleção, não ao `engine`.
- Nenhuma tabela Postgres nova, nenhuma RPC nova: `grantCardDrop` chama `registerCardReward`
  exatamente como está implementado hoje, sem alterar sua assinatura.

## 3. Design Técnico

### Estruturas de dados

**`DropRewardOutcome`** (`packages/shared`) — o que o sorteio devolve:

| Campo | Tipo | Semântica |
|---|---|---|
| `cardNumber` | `CardNumber` | A carta escolhida — o que segue para `registerCardReward` |
| `source` | `"duelist_pool" \| "default_common_pool"` | De onde veio a candidata: da faixa resolvida no pool do duelista, ou do fallback comum (Decisão 4) |
| `tier` | `DropTierId` | A faixa **solicitada** (a resolvida por F05), preservada mesmo quando `source` é o fallback — útil para diagnóstico e para o registro da pendência de configuração |

**`DefaultCommonDropPool`** — `readonly CardNumber[]`, não vazia quando válida (Decisão 4/5).

**`CardWeightLookup`** — `(cardNumber: CardNumber) => number`; peso relativo, finito e `> 0`.
Ausente ⇒ peso uniforme (Decisão 3).

**`GrantedCardDrop`** (`apps/web`) — o que a orquestração devolve à UI:

| Campo | Tipo | Semântica |
|---|---|---|
| `outcome` | `DropRewardOutcome` | A carta escolhida e sua origem |
| `reward` | `RewardResult` (reusado de `build-deck/F03`) | `applied` / `applied_offline` / `already_applied` — o resultado de `registerCardReward` |

### Fluxo

**Seleção pura (`packages/rules`)**

1. **Filtrar candidatas da faixa resolvida.** `candidates = dropPool.find(entry => entry.tier ===
   dropTier)?.cardNumbers ?? []` — reimplementação local trivial do que `listCardNumbersForTier`
   já faz em `packages/data` (Decisão 7); nenhuma duplicação de regra de negócio, só do
   one-liner de filtro.
2. **Se `candidates` não está vazia**, o conjunto de seleção é `candidates` e `source =
   "duelist_pool"`.
3. **Se `candidates` está vazia**, o conjunto de seleção passa a ser `defaultCommonDropPool` e
   `source = "default_common_pool"` — o fallback do PRD F06 Error Handling ("pool vazio/indefinido
   → concede carta da faixa comum padrão").
4. **Se o conjunto de seleção (após o passo 3) ainda está vazio** (faixa vazia **e**
   `defaultCommonDropPool` vazia/ausente) → erro `no_drop_candidates_available`, sem conceder
   nenhuma carta (Decisão 5). Isso só acontece antes do dado de balanceamento existir.
5. **Sortear dentro do conjunto de seleção**, determinístico por `duelSessionId` (Decisão 6):
   calcula os pesos de cada candidata via `weightLookup` (padrão: `() => 1`), deriva um índice
   determinístico ponderado a partir de `duelSessionId` (mais um sal fixo por chamada — o próprio
   `duelSessionId` já é único por sessão, então não precisa de sal adicional) e devolve a
   candidata naquele índice.
6. **Devolver `DropRewardOutcome`** com `cardNumber`, `source` e `tier` (a faixa solicitada,
   preservada mesmo em fallback).

**Orquestração (`apps/web`, `grantCardDrop`)**

7. **Consultar o cache em memória** por `duelSessionId` (mesmo padrão de F05). Se já há um
   `GrantedCardDrop` para esta sessão, devolve-o sem recalcular nem chamar `registerCardReward` de
   novo — evita um novo sorteio (ainda que determinístico, evita I/O redundante) e uma nova
   chamada de rede a cada nova renderização.
8. **Selecionar a carta** chamando `selectDropCardNumber` (passo 1-6) com o `dropPool` do
   duelista (já carregado pela tela de duelo, Seção 2), o `dropTier` de
   `result.rating.reward.dropTier`, a `defaultCommonDropPool` injetada e `result.duelSessionId`.
9. **Erro na seleção** (`no_drop_candidates_available`) → não chama `registerCardReward`; devolve
   o erro para a UI exibir o estado "recompensa pendente de configuração" (Seção 6).
10. **Montar o evento** `CardRewardEvent { playerId, duelId: result.duelSessionId, cardNumber }`
    (tipo já definido por `build-deck/F03`, reusado sem alteração).
11. **Chamar `registerCardReward`** (já implementado) com esse evento e as dependências de
    recompensa já existentes (`catalog`, `rewardRepository`, `rewardQueue`, `collectionCache`,
    `applyOfflineReward`, `clock`). F06 não interpreta o resultado além de repassá-lo — `applied`,
    `applied_offline` e `already_applied` chegam à UI exatamente como `registerCardReward` os
    produz.
12. **Guardar no cache** e devolver `{ outcome, reward }`.

**Exibição (`apps/web`, UI)**

13. `duel-screen.tsx` passa a manter o `DuelScreenContext` carregado em estado (hoje descartado
    após o `useEffect` de início de partida) e repassa `context.duelist.dropPool` a
    `EndedDuelResult`.
14. `use-card-drop-reward.ts` dispara `grantCardDrop` **somente quando** `result.status ===
    "victory"` — derrota/empate/indisponível nunca chamam a função (reforça o critério de
    integração "F06 não dispara fora da vitória").
15. `CardDropReward` renderiza a carta (arte via convenção já usada pelo Library/`cards-data/
    {numero}.jpg`, nome quando disponível pelo catálogo) e uma frase confirmando a adição à
    coleção; nos ramos degradados, as mensagens da Seção 6.

### Regras de negócio

- **Exatamente 1 carta por vitória**, nunca mais — reforçado pela Decisão 6 (mesma carta em
  qualquer retentativa) e pela idempotência já existente de `registerCardReward`.
- **F06 nunca é chamada fora de `status: "victory"`** — derrota, empate e `unavailable` não geram
  `CardRewardEvent` nenhum (critério de Cross-Feature Integration do PRD).
- **A ponderação entre faixas já aconteceu** (Decisão 1); F06 nunca reordena faixas nem escolhe
  qual faixa usar além do fallback determinístico da Decisão 4.
- **Nenhum peso concreto de carta é hard-coded** — `weightLookup` é sempre injetável e o padrão é
  uniforme (Decisão 3).
- **`numero` inexistente nunca chega a ser escrito** — a validação contra o catálogo continua
  sendo feita por `registerCardReward`/`validateRewardCardNumber` (já implementado); F06 não
  duplica essa checagem.

### Eventos

Não se aplica ao `packages/engine` — F06 não emite nem consome eventos de duelo
(`onSummon`/`onAttackDeclared`/…) e não participa do Effect System. O único "evento" é o
`CardRewardEvent` cross-PRD já definido por `build-deck/F03`, um dado de aplicação de recompensa,
não um evento de motor.

### Determinismo e pureza

Não se aplica a `packages/engine` — F06 não produz estado de duelo e não usa o PRNG semeado do
motor. As garantias relevantes são:

- **Pureza de `packages/rules/src/drop-reward/**`**: sem I/O, sem `Math.random()`, sem relógio,
  sem log — `selectDropCardNumber` e o utilitário de seleção determinística são funções totais
  (nunca lançam; toda falha vira `Result` de erro).
- **Determinismo por chave**: `selectDropCardNumber(pool, tier, defaultPool, duelSessionId,
  weightLookup)` aplicada aos mesmos argumentos sempre devolve o mesmo `DropRewardOutcome`
  (Decisão 6) — é o que substitui, aqui, o papel que o PRNG semeado do estado cumpre dentro do
  `engine`.
- `grantCardDrop` (a única parte com I/O) não faz nenhuma escolha probabilística própria — toda a
  aleatoriedade observável (`qual carta`) é decidida pela função pura antes de qualquer chamada de
  rede.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duelist/drop-reward.ts
export type DropRewardSource = "duelist_pool" | "default_common_pool";

export type DropRewardOutcome = Readonly<{
  cardNumber: CardNumber;
  source: DropRewardSource;
  tier: DropTierId;
}>;

export type DefaultCommonDropPool = readonly CardNumber[];

export type CardWeightLookup = (cardNumber: CardNumber) => number;
```

```ts
// packages/shared/src/duelist/drop-reward-schema.ts
export const DefaultCommonDropPoolSchema = z.array(CardNumberSchema).min(1);
```

Novo código de `DomainError`: `no_drop_candidates_available`. Reusados sem redefinição:
`unknown_duelist` (F01), `invalid_reward_card`/`malformed_reward_event`/`reward_apply_unavailable`
(`build-deck/F03`).

### Funções públicas

```ts
// packages/rules/src/drop-reward — puro, sem I/O

export function selectDropCardNumber(
  pool: DropPool,
  tier: DropTierId,
  defaultCommonDropPool: DefaultCommonDropPool,
  duelSessionId: string,
  weightLookup?: CardWeightLookup,
): Result<DropRewardOutcome, DomainError>;
  // pós: candidatas da faixa não vazias ⇒ source 'duelist_pool', cardNumber ∈ candidatas da faixa
  //      candidatas da faixa vazias ⇒ source 'default_common_pool', cardNumber ∈ defaultCommonDropPool
  //      ambas vazias ⇒ erro 'no_drop_candidates_available'
  //      total: nunca lança; determinístico: mesma entrada ⇒ mesma saída

export function deriveDeterministicIndex(key: string, exclusiveUpperBound: number): number;
  // pós: 0 <= resultado < exclusiveUpperBound; mesma (key, exclusiveUpperBound) ⇒ mesmo resultado
  //      exclusiveUpperBound <= 0 é erro de uso do chamador (nunca ocorre atrás de selectDropCardNumber)

export function deriveWeightedSelection(
  key: string,
  weights: readonly number[],
): number;
  // pós: 0 <= resultado < weights.length; a probabilidade observada ao variar `key`
  //      aproxima weights[i] / soma(weights); todo peso <= 0 é tratado como 1 (defensivo)
```

```ts
// apps/web/src/lib/free-duel — fronteira de I/O

export type GrantCardDropContext = Readonly<{
  playerId: string;
  dropPool: DropPool;
}>;

export type GrantCardDropDeps = RegisterCardRewardDeps & Readonly<{
  defaultCommonDropPool: DefaultCommonDropPool;
}>;

export type GrantedCardDrop = Readonly<{
  outcome: DropRewardOutcome;
  reward: RewardResult;
}>;

export async function grantCardDrop(
  result: Extract<ConsolidatedDuelResult, { status: "victory" }>,
  context: GrantCardDropContext,
  deps: GrantCardDropDeps,
): Promise<Result<GrantedCardDrop, DomainError>>;
  // pós: mesma duelSessionId ⇒ mesmo GrantedCardDrop, sem nova chamada de registerCardReward
  //      (cache em memória, passo 7); erro de seleção nunca chama registerCardReward
```

Exemplo do evento entregue a `registerCardReward` (tipo já existente, sem alteração):

```json
{
  "playerId": "6f1c9e10-...",
  "duelId": "b3f0b6b0-6b8e-4e9d-9c1a-7e6f2a1d4c9b",
  "cardNumber": "045"
}
```

`duelId` é exatamente o `duelSessionId` da sessão encerrada (`crypto.randomUUID()`,
`apps/web/src/lib/free-duel/seed-generator.ts`) — a mesma chave de idempotência que
`build-deck/F03` já usa e que F07 reaproveitará (Decisão 8).

### Contratos externos (cross-PRD e cross-feature, já implementados)

- **F05 (`ConsolidatedDuelResult`)** — F06 só é acionada com o ramo `status: "victory"`. Nenhuma
  chamada em `defeat`/`draw`/`unavailable`.
- **F01 (`DropPool`, `getDropPool`, `getDuelist`)** — F06 recebe o `DropPool` já resolvido pela
  tela (via `Duelist` carregado no início da partida); não chama `getDropPool` diretamente do
  núcleo puro (Decisão 7), só na orquestração de `apps/web`.
- **`build-deck/F03` (`registerCardReward`, `apply_card_reward`)** — reusado integralmente.
  Nenhuma mudança de assinatura, nenhuma nova migração.
- **F07 (futuro, cross-feature, ainda sem spec)** — consumirá o mesmo `duelSessionId` como chave
  de idempotência (Decisão 8). Não é implementado nem antecipado aqui além da observação de que a
  mesma linha de `reward_ledger` (coluna `stars`, `DEFAULT 0`) está reservada para essa extensão.

## 5. Modelo de Dados

### Postgres / Supabase

**Nenhuma tabela nova, nenhuma migração nova, nenhuma RPC nova.** F06 escreve em `reward_ledger`/
`collections` exclusivamente através de `registerCardReward` → `apply_card_reward`
(`supabase/migrations/0005_create_reward_ledger.sql`, corrigida por `0006_fix_apply_card_reward_
auth_check.sql`), sem alterar seu esquema ou seus grants.

### Cache local / fila offline

Nenhum store IndexedDB novo: F06 reusa `recompensas_pendentes` e o snapshot de coleção já
mantidos por `build-deck/F03` (`apps/web/src/lib/reward/offline-queue.ts`,
`apps/web/src/lib/collection/indexeddb-cache.ts`).

A única estrutura nova é em memória, não persistida: um `Map<string, GrantedCardDrop>` chaveado
por `duelSessionId`, do mesmo tipo e ciclo de vida do cache de `resolveDuelResult` (F05) — vive
somente durante a execução do app, e uma revanche (novo `duelSessionId`) nunca reaproveita a
entrada de uma sessão anterior.

### Dado de balanceamento pendente

`DefaultCommonDropPool` é **dado de balanceamento a definir** (Fase 0.4 do skill;
`arquitetura.md` §4.3/§10), no mesmo espírito de `roster.json` (F01) e de `MinimumRatingReward`
(F05): schema, loader e validação prontos, **nenhum valor concreto de carta** definido nesta spec.
Até o dado chegar, a composição de `grantCardDrop` deve ser alimentada com uma
`DefaultCommonDropPool` de teste/placeholder explicitamente marcada como tal fora de produção, ou
o app assume o estado descrito na Decisão 5 (falha estrutural documentada, não card inventado).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Faixa resolvida sem candidatas no pool do duelista | `selectDropCardNumber`, passo 3 | Sorteia da `defaultCommonDropPool` (`source: "default_common_pool"`); registra a pendência de configuração do pool | Mesma UI da carta concedida, sem aviso de erro (Decisão 4 — a troca de faixa é transparente ao jogador; a pendência é registrada em log, não exibida) |
| Faixa resolvida sem candidatas **e** `defaultCommonDropPool` vazia/ausente | `selectDropCardNumber`, passo 4 | Erro `no_drop_candidates_available`; nenhuma chamada a `registerCardReward`; nenhuma carta concedida | "Não foi possível conceder sua recompensa agora. Sua vitória foi registrada; tente novamente mais tarde." |
| Falha de rede ao entregar a carta escolhida | delegado a `registerCardReward` (já implementado) | Incrementa o cache local e enfileira (`applied_offline`) — comportamento herdado, não reimplementado (Decisão 9) | "Carta conquistada salva localmente; sincronizando…" |
| Recompensa já aplicada para o mesmo `duelId` (reprocessamento, reabertura de tela, retomada) | delegado a `registerCardReward`; garantido consistente pela Decisão 6 (mesma carta sempre) | Não concede de novo; reconcilia com a quantidade do servidor | "Recompensa já recebida." |
| `duelistId` desconhecido no momento da concessão (roster mudou entre o início e o fim do duelo) | `dropPool` chega vazio (`[]`) da camada de composição em `apps/web` | Tratado como faixa sem candidatas — cai direto no fallback comum (passo 3), sem bloquear a recompensa | Mesma UI da carta concedida via fallback |
| `CardWeightLookup` devolve peso `<= 0` ou não finito para alguma candidata | `deriveWeightedSelection` | Trata o peso inválido como `1` (defensivo, nunca derruba o sorteio) | nenhuma (registro técnico) |
| Renderização repetida da mesma sessão encerrada (F05 já resolvida) | cache por `duelSessionId` em `grantCardDrop` | Devolve o mesmo `GrantedCardDrop` sem nova seleção nem nova chamada de rede | nenhuma |
| Resultado não é vitória (`defeat`/`draw`/`unavailable`) | guarda em `use-card-drop-reward.ts` | `grantCardDrop` nunca é chamada; nenhum `CardRewardEvent` é criado | nenhuma (sem recompensa, conforme PRD) |

Todo desvio do caminho feliz é registrado (`guidelines` §8.3, mesmo princípio das specs
anteriores); a única mensagem nova ao jogador introduzida por F06 é a de
`no_drop_candidates_available` — todas as demais já existem em `registerCardReward` ou em
`duel-result-messages.ts` (F05) e são apenas herdadas.

## 7. Estratégia de Testes

### Unitários (Vitest)

`deriveDeterministicIndex` / `deriveWeightedSelection`:

- `deriveDeterministicIndex returns the same index for the same key and bound`
- `deriveDeterministicIndex always returns an index within [0, bound)`
- `deriveDeterministicIndex returns 0 when bound is 1`
- `deriveWeightedSelection returns an index within the weights array bounds`
- `deriveWeightedSelection treats a non-positive weight as 1`
- `deriveWeightedSelection is deterministic for the same key and weights`

`selectDropCardNumber` — table-driven:

- `selectDropCardNumber picks a candidate from the resolved tier when it is not empty`
- `selectDropCardNumber falls back to the default common pool when the resolved tier has no candidates`
- `selectDropCardNumber preserves the requested tier in the outcome even when falling back`
- `selectDropCardNumber returns no_drop_candidates_available when both the tier and the default pool are empty`
- `selectDropCardNumber never throws for an unknown tier id`
- `selectDropCardNumber applies the injected weightLookup instead of uniform weights`
- `selectDropCardNumber defaults to uniform weights when weightLookup is omitted`
- `selectDropCardNumber returns the same outcome for the same duelSessionId across repeated calls`
- `selectDropCardNumber can return a different card for a different duelSessionId with more than one candidate`

`grantCardDrop` (`apps/web`, com dependências falsas):

- `grantCardDrop selects a card and registers the reward via registerCardReward`
- `grantCardDrop does not call registerCardReward when the selection fails`
- `grantCardDrop reuses the cached outcome for the same duelSessionId without selecting or registering again`
- `grantCardDrop propagates the applied_offline status from registerCardReward unchanged`
- `grantCardDrop propagates the already_applied status from registerCardReward unchanged`
- `grantCardDrop builds the CardRewardEvent with duelId equal to duelSessionId`

`use-card-drop-reward` (`apps/web`, `@vitest-environment jsdom`):

- `use-card-drop-reward does not call grantCardDrop for a defeat result`
- `use-card-drop-reward does not call grantCardDrop for a draw result`
- `use-card-drop-reward does not call grantCardDrop for an unavailable result`
- `use-card-drop-reward calls grantCardDrop exactly once for a victory result`

`CardDropReward` / `DuelResult` (`apps/web`, `@vitest-environment jsdom`):

- `CardDropReward renders the granted card art, name and tier`
- `CardDropReward renders the offline-sync message when reward status is applied_offline`
- `CardDropReward renders the already-applied message without duplicating the card`
- `CardDropReward renders the reward-pending message when selection fails`
- `DuelResult renders CardDropReward only in the victory branch`
- `DuelResult does not render CardDropReward in the defeat or draw branch`

### Property-based (fast-check)

- **Fechamento do conjunto de candidatas:** para qualquer `DropPool`, `tier` e
  `defaultCommonDropPool` não vazios (em pelo menos um dos dois), `selectDropCardNumber` sempre
  devolve um `cardNumber` que pertence ao conjunto de candidatas efetivamente usado (da faixa ou
  do fallback) — nunca uma carta fora de ambos. 1.000 execuções.
- **Determinismo ponta a ponta:** para qualquer `(pool, tier, defaultPool, duelSessionId,
  weightLookup)` fixos, chamar `selectDropCardNumber` repetidamente (1 a 20 vezes) sempre produz
  resultados profundamente iguais. 1.000 execuções.
- **Totalidade:** para qualquer combinação arbitrária de `DropPool` (incluindo faixas vazias,
  faixas duplicadas, `tier` desconhecido) e `defaultCommonDropPool` (incluindo vazia),
  `selectDropCardNumber` nunca lança — sempre devolve `Result`.
- **Consistência de proporção de peso:** para um conjunto fixo de candidatas com pesos
  `[1, 2, 1]`, amostrando `deriveWeightedSelection` sobre um grande número de chaves distintas, a
  proporção de seleções do índice de peso 2 se aproxima do dobro da proporção de cada índice de
  peso 1 (tolerância estatística ampla — não é um teste de qualidade de distribuição, só de que o
  peso influencia a seleção na direção esperada).
- **Idempotência de `grantCardDrop` sob concorrência:** N chamadas concorrentes
  (`Promise.all`) de `grantCardDrop` para a mesma sessão resolvem para o mesmo `GrantedCardDrop` e
  no máximo uma chamada efetiva a `registerCardReward` chega a aplicar (a idempotência final
  continua sendo de `apply_card_reward`, mas o cache local não deve gerar chamadas redundantes
  desnecessárias) — adaptado do padrão de `build-deck/F03` (guidelines §14.3).

### Integração

`apps/web/tests/free-duel-card-drop.integration.test.tsx`:

- `victory flow grants exactly one card and displays it in the result screen`
- `defeat flow never calls grantCardDrop or registerCardReward`
- `draw flow never calls grantCardDrop or registerCardReward`
- `empty duelist drop pool falls back to the default common pool and still grants a card`
- `reopening the result screen for the same session does not duplicate the reward call`

### Análise estática

- `packages/rules/src/drop-reward/**` não importa `packages/data`, `packages/engine`,
  `packages/ai`, React, DOM, `fetch`, `node:*` nem Supabase (Decisão 7; regra
  `rules-depends-only-on-shared` do `.dependency-cruiser.cjs`).
- Nenhum arquivo de `packages/rules/src/drop-reward/**` usa `Math.random()` — toda seleção passa
  por `deriveDeterministicIndex`/`deriveWeightedSelection`.
- `packages/shared/src/duelist/drop-reward*.ts` não importa nenhum pacote do monorepo.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F06) | Teste |
|---|---|
| Concede exatamente 1 carta apenas na vitória, sorteada do pool do oponente ponderado pela faixa de raridade da nota; o jogador sempre recebe uma carta | `selectDropCardNumber picks a candidate from the resolved tier...` + `selectDropCardNumber falls back to the default common pool...` + `use-card-drop-reward calls grantCardDrop exactly once for a victory result` + teste de integração `victory flow grants exactly one card...` |
| A carta é entregue ao `BuildDeck/F03` e somada `+1` à coleção; a concessão é idempotente por duelo | `grantCardDrop selects a card and registers the reward via registerCardReward` + `grantCardDrop reuses the cached outcome...` + propriedade de determinismo ponta a ponta + reuso integral de `registerCardReward` (já validado pelos testes de `build-deck/F03`) |
| Falha de rede salva a recompensa localmente e sincroniza depois; pool vazio recai na faixa comum padrão com registro de pendência | `grantCardDrop propagates the applied_offline status...` + `selectDropCardNumber falls back to the default common pool when the resolved tier has no candidates` + `CardDropReward renders the offline-sync message...` |
| **(Pendente — dado de balanceamento)** Quando os pools e pesos de raridade forem definidos, o sorteio respeita esses dados | **Caminho neutro, sem valores inventados:** `selectDropCardNumber returns no_drop_candidates_available when both the tier and the default pool are empty` + `CardDropReward renders the reward-pending message when selection fails` + propriedade de fechamento do conjunto de candidatas (garante que, quando o dado chegar, nenhuma carta fora do pool declarado pode ser sorteada) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: fluxo completo de vitória (F01→F02→F03→F05→F06→F08) sem estado inconsistente | `victory flow grants exactly one card and displays it in the result screen` |
| Cross-Feature: em derrota/empate (inclusive rendição/abandono de F04), F06 não dispara e a tela não exibe recompensa | `defeat flow never calls grantCardDrop or registerCardReward` + `draw flow never calls grantCardDrop or registerCardReward` + `use-card-drop-reward does not call grantCardDrop for a defeat result` + `...for a draw result` + `...for an unavailable result` |
| Cross-Feature: uma mesma vitória nunca concede carta em duplicidade (idempotência compartilhada por `duelId` entre F06 e a futura F07) | `reopening the result screen for the same session does not duplicate the reward call` + propriedade de idempotência sob concorrência + Decisão 6 (determinismo) |
| Cross-PRD (Build Deck): a carta concedida por F06 é somada à coleção via `BuildDeck/F03` exatamente uma vez por vitória | Reuso direto de `registerCardReward`, já coberto pelos testes de integração de `build-deck/F03` (`RPC aplicar_recompensa_carta chamada duas vezes...incrementa...uma unica vez`) — F06 não duplica essa cobertura, só garante que chega lá com o `cardNumber` certo |
| Cross-PRD (Rating Engine, via F05): a faixa e a recompensa consumidas por F06 refletem as definições oficiais assim que fornecidas — pendência registrada até a definição | Teste de contrato: `selectDropCardNumber` trata `dropTier` como string opaca em todos os testes, nunca comparando com um valor hard-coded de negócio além dos identificadores de fixture |
