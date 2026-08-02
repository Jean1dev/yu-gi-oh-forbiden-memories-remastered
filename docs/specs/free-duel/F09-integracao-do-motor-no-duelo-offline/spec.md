# Integração do Motor no Duelo Offline

> PRD: `docs/prds/free-duel.md` — F09
> Pacote-alvo: `apps/web` (+ `packages/data` para o duelista de teste)

## 1. Contexto e Escopo

F01–F08 do Free Duel foram implementadas **contra os contratos do motor, não contra o motor**: a
orquestração de F03 roda inteira sobre fakes (`apps/web/tests/fakes/engine-fake.ts`), o `applyAction`
da tela de duelo é um `unavailableApply` que lança, o `startMatch` padrão devolve
`status:"failed"/ai_unavailable`, e `packages/engine` — hoje completo (motor-duelo-1x1 F01–F12) —
**nunca foi importado por `apps/web`**. O `roster.json` está vazio (`duelists: []`), então `/free-duel`
sequer lista um oponente. F09 é a **wave de realização** declarada na Parte 3 da Seção 8 do PRD: troca
os fakes pelo motor real e fecha o marco jogável mínimo da Fase 3 do roadmap (`docs/arquitetura.md`
§9 — "Free Duel vs IA / primeiro loop jogável completo offline").

A feature entrega quatro coisas: (a) um **duelista de teste** com deck de 40 cartas válido no roster,
cumprindo no nível mínimo a pendência de balanceamento declarada em F01; (b) uma **fronteira
verificável** que autoriza exatamente um módulo do app a importar `@yugioh/engine`; (c) a **correção
do contrato da porta `apply`**, que hoje ignora que o motor devolve `Result<ApplyResult, DomainError>`
e transforma qualquer recusa em morte de sessão, mais a **liquidação da janela de reação** no
orquestrador; e (d) o **ponto único de composição** (`duel-runtime.ts`) que instancia o motor com o
catálogo lido no servidor, o deck do jogador (F02) e o deck do NPC (F01), ligado à tela de duelo. A
renderização do tabuleiro em si é de **F10** — F09 mantém a casca existente e apenas a alimenta com
uma sessão real.

### Incluído

- **Duelista de teste no roster** (`test-duelist`): deck de 40 cartas (34 monstros/rituais + 6
  magias/armadilhas, ≤ 3 cópias, todas existentes no banco), pool de drops não vazio, retrato reusando
  um arquivo já servido, gerado por script determinístico e **commitado** — PRD F09 Capabilities,
  critério "o roster expõe um duelista de teste com deck de 40 cartas válido".
- **Portão de fronteira do motor**: um script próprio (`scripts/check-duel-engine-boundary.mjs`)
  encadeado no `lint`, que falha se qualquer módulo do app além de `duel-runtime.ts` importar
  `@yugioh/engine`, e se qualquer módulo `"use client"` alcançar o catálogo de disco — PRD F09
  Capabilities, critério "exatamente um módulo do app importa o motor".
- **Porta `apply` corrigida para `Result`**: uma ação recusada pelo motor vira **valor** (`refusal`),
  com o estado e a sessão referencialmente intactos e o status seguindo `in_progress` — PRD F09
  Capabilities/Error Handling.
- **Liquidação da janela de reação no orquestrador**: invocação, magia/armadilha e declaração de
  ataque abrem `state.pending`; F09 fecha a janela no mesmo despacho, encadeando `resolve_attack`
  para a janela de ataque e `closeReactionWindow` para as demais.
- **Agente passivo da CPU** com ritmo perceptível e publicação por passo (`onStep`), substituível
  pelo agente real de `packages/ai` sem tocar na sessão nem na tela.
- **Store da sessão como escritor único**, com `runToken` que fecha a corrida entre a rendição (F04) e
  o laço da CPU.
- **Composition root** (`duel-runtime.ts`) + **catálogo entregue pelo servidor** à rota do duelo, com
  ramo de catálogo indisponível.
- **Correções de dois bugs verificados** na casca atual: o efeito de início de partida que trava sob
  React StrictMode, e a corrida rendição-vs-laço-da-CPU.

### Adiado

Nada é adiado por escolha de escopo — o PRD não divide F09 em Core/Full. Os itens abaixo são
**lacunas declaradas pelo próprio PRD** (critério "(Lacuna declarada)" da Seção 9) ou pertencem a F10:

- **Renderização do tabuleiro, animações, prévia de carta, seleção de zona/posição e alvo de ataque**
  → **F10**. F09 mantém `DuelBoard`/`PlayerHand`/`LpIndicator` como estão e acrescenta apenas o
  controle mínimo necessário para dirigir a partida manualmente ("Passar Fase").
- **`grantVictoryReward` (F06 — drop) e o crédito de estrelas (F07)** ficam **desligados** nesta
  feature: a tela de resultado informa a recompensa como pendente. Religá-los exige `playerId` e as
  dependências de Supabase que a rota de duelo não recebe hoje.
- **`play_field_spell`** (terreno jogado da mão) fica fora: o motor a suporta, mas nenhuma
  afordância a expõe nesta feature nem em F10.

### Fronteiras

Delimitadas pela Seção 7 do PRD e pelos blocos vizinhos:

- **Regras de duelo** (combate, turno, invocação, legalidade, desfecho) → **Motor de Duelo 1x1**.
  F09 não reimplementa nenhuma checagem: tudo que decide é *quando* chamar `apply`, nunca *se* a
  jogada é legal.
- **Estratégia da CPU** → **IA de NPCs (cross-PRD)**. O agente passivo é andaime declarado; ele não
  decide jogada nenhuma, apenas devolve a vez.
- **Nota do duelo e tabela nota→recompensa** → **Rating Engine (cross-PRD)**, inexistente. F05 já
  trata a ausência com o fallback mínimo; F09 apenas fornece o dado de política.
- **Concessão de carta e crédito de estrelas** → **F06/F07**, desligadas aqui (lacuna declarada).
- **Aparência da tela de duelo** → **F10**.
- **Retomar duelo em andamento após refresh** → fora desta versão (PRD §7): recarregar `/duel` perde
  o handoff e redireciona para `/free-duel`, comportamento já especificado por F03.
- **Composição definitiva do roster** (quais duelistas, decks, pools) → dado de balanceamento
  pendente (PRD §7). O duelista de teste é o mínimo jogável, não a composição final.

### Contratos externos assumidos

- **`packages/ai` (IA de NPCs)** — não existe e **não é criado por esta feature**. F09 implementa um
  `AiAgent` passivo dentro de `apps/web/src/lib/free-duel/`, satisfazendo o mesmo contrato
  (`AiAgent.decide(state, profile): Promise<DuelAction>`, `packages/shared/src/duel/orchestration.ts`).
  A regra `free-duel-does-not-import-ai` do dependency-cruiser continua valendo sem alteração.
  *A ser fornecido por `packages/ai`.*
- **Rating Engine** — sem escala de notas nem tabela nota→recompensa (`docs/arquitetura.md` §10).
  F09 fornece um `RatingEngine` indisponível e um `MINIMUM_RATING_REWARD` neutro; toda vitória cai no
  `minimum_fallback` que F05 já implementa. *A ser fornecido pelo Rating Engine (cross-PRD).*
- **Composição final do roster** — dado de balanceamento externo (`docs/arquitetura.md` §10, PRD §7).
  *A ser fornecido pelo usuário.*

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A **janela de reação é liquidada no orquestrador** (`apps/web/src/lib/free-duel/duel-session.ts`), não no motor e não no React. `closeReactionWindow` entra como **porta injetada**, mantendo o módulo importando só `@yugioh/shared`. Motivo: motor-duelo-1x1/F02 tornou a janela **estado externo explícito de propósito** (`docs/arquitetura.md` §3.2 — o duelo online precisa segurá-la por um round trip), então fechá-la dentro de `apply` destruiria o contrato online; e a UI não conhece regra (`arquitetura.md` §7). `duel-session.ts` já é o único módulo do app que lê `state.pending` (em `nextDecider`), então é onde a decisão pertence. | plano aprovado; `arquitetura.md` §3.2, §7; ADR-002 | confirmada |
| 2 | **`declare_attack` encadeia `resolve_attack` no mesmo despacho.** A janela de `onAttackDeclared` é a única que o motor consome por ação própria; as demais fecham por `closeReactionWindow`. Consequência a registrar: **uma intenção do jogador = um dispatch**, e F10 recebe declaração + dano + destruição como um lote ordenado de eventos. | plano aprovado; `packages/shared/src/duel/action.ts` (`ResolveAttackAction`) | confirmada |
| 3 | A porta **`ApplyAction` devolve `Result<ApplyResult, DomainError>`** — hoje está tipada como `(state, action) => ApplyResult`, o que **não corresponde ao motor real**. Recusa é **valor**: `{ session (idêntica por referência), events: [], refusal }`, sessão segue `in_progress`. Nunca vira `status:"failed"`. | plano aprovado; `packages/engine/src/turn/apply.ts`; PRD F09 Capabilities | confirmada |
| 4 | O **`try/catch` encolhe para um único call site**: `dependencies.aiAgent.decide(...)`. Uma exceção do agente continua virando `failed/ai_unavailable`, como F03 prescreve. Uma ação da CPU **recusada pelo motor** também vira `failed/ai_unavailable` — com o agente passivo isso só pode ser bug, e F03 já define esse desfecho. | plano aprovado; spec F03 (Decisão 12) | confirmada |
| 5 | **Duelista de teste gerado por script e commitado**, não sorteado em runtime: `packages/data/scripts/generate-test-duelist.ts` exporta `buildTestDuelist` puro + um `main()` que lê o catálogo selado e grava `packages/data/data/roster.json`. Fica em `scripts/` porque `packages/*/src/` é livre de I/O (`arquitetura.md` §2, regra `domain-cores-are-pure`). PRNG mulberry32 próprio dentro do script — `packages/data` não pode importar `packages/engine`. | plano aprovado; `.dependency-cruiser.cjs`; precedente `generate-card-prices-seed.ts` | confirmada |
| 6 | **Composição do deck de teste: 34 monstros/rituais + 6 magias/armadilhas**, ≤ 3 cópias. Não são 40 cartas uniformemente aleatórias: um deck majoritariamente de magias não invocaria nada e deixaria a tela impossível de testar. **Isto é dado de teste declarado, não valor de lore do FM original** — a composição definitiva do roster segue pendente (Fase 0.4). | plano aprovado; auto-aceite: tabela de dado externo pendente | pendente — aguarda dado de balanceamento |
| 7 | **Retrato do duelista reusa `cards-data/001.jpg`**: casa com o regex do validador (`/^[a-z0-9/_-]+\.(jpg\|png\|webp)$/` em `packages/data/src/roster/validate-duelist.ts`), `DuelistCard` renderiza `src={"/" + portrait}` e `app/cards-data/[file]/route.ts` já serve esse caminho. **Sem asset binário novo e sem criar `public/`** (que não existe em `apps/web`). | plano aprovado | confirmada |
| 8 | **Pool de drops do teste**: um único tier não vazio (o validador rejeita tier vazio) com 8 cartas do próprio deck, e `tier` igual ao `dropTier` do `MINIMUM_RATING_REWARD` para que o caminho de F06 seja coerente quando for religado. | plano aprovado; `packages/data/src/roster/drop-pool.ts` | confirmada |
| 9 | **IA passiva**: `decide` sempre devolve `{ type: "advance_phase" }`. O **delay de ritmo mora dentro do agente** (`sleep` injetável, padrão 650 ms), não no laço — assim `advanceCpuDecisions` segue determinístico e os testes injetam `sleep: async () => {}`. Vive em `apps/web/src/lib/free-duel/passive-ai-agent.ts`; **`packages/ai` não é criado**. | plano aprovado; auto-aceite: dependência cross-PRD inexistente vira contrato externo | confirmada |
| 10 | **Um único módulo do app importa `@yugioh/engine`**: `apps/web/src/lib/free-duel/duel-runtime.ts`. O portão é um **script próprio** (`scripts/check-duel-engine-boundary.mjs`), não o dependency-cruiser: os 239 imports `@yugioh/*` do repositório resolvem como `couldNotResolve`, deixando **inertes** todas as regras ancoradas em `^packages/...`. Não reportar "lint verde" como evidência de confinamento do motor. | plano aprovado; CLAUDE.md; precedentes `scripts/check-build-deck-f04-boundaries.mjs`, `f05` | confirmada |
| 11 | **Catálogo entregue pelo Server Component**: `app/free-duel/[duelistId]/duel/page.tsx` chama `getSealedCatalog`/`listAllCards` e passa `readonly Card[]` como prop, exatamente como `app/build-deck/page.tsx`. `next.config.mjs` ganha a rota em `outputFileTracingIncludes` e `@yugioh/engine` em `transpilePackages`. | plano aprovado; precedente `app/build-deck/page.tsx`; CLAUDE.md (fronteira servidor/cliente) | confirmada |
| 12 | **Catálogo indisponível tem ramo próprio** (`duel-unavailable-notice.tsx`, PT-BR, com retry via `router.refresh()`), e não é mapeado para `OrchestrationFailureReason` — a união fechada (`deck_rejected_by_engine \| ai_unavailable \| no_progress_loop`) não tem código honesto para "catálogo ausente", e inventar um mentiria sobre a causa. | plano aprovado; `packages/shared/src/duel/orchestration.ts` | confirmada |
| 13 | **`grantVictoryReward` e o Rating Engine ficam desligados**: a vitória cai no fallback mínimo `MINIMUM_RATING_REWARD`, declarado em `lib/free-duel/rating-policy.ts` e documentado como **dado de balanceamento pendente**, no mesmo estilo de `INITIAL_WALLET_STARS` (`packages/shared/src/economy/constants.ts`). Nenhum valor de lore é inventado. | plano aprovado; Fase 0.4; PRD §9 F09 ("Lacuna declarada") | pendente — aguarda Rating Engine |
| 14 | **Magias/armadilhas podem ser baixadas** no campo sem efeito, consumindo a jogada da mão do turno (o motor já se comporta assim). **`play_field_spell` fica fora de escopo**, documentado e não implementado. | plano aprovado; PRD F10 Capabilities | confirmada |
| 15 | **Correção do travamento sob React StrictMode** em `duel-screen.tsx` (~linhas 135–157): o guarda `matchStarted.current` convive com um flag `active` cujo cleanup roda entre as duas invocações do StrictMode — a execução A marca `active=false`, a B sai cedo pelo ref, e `setSession` nunca dispara. `reactStrictMode` é padrão no Next 16, então isso quebra no primeiro `make dev`. Correção: **remover o flag `active`, manter o ref**. | plano aprovado (bug verificado) | confirmada |
| 16 | **Correção da corrida rendição-vs-laço-da-CPU**: `useSurrender` escreve a sessão enquanto `advanceCpuDecisions` pode estar em laço, e o resultado do laço sobrescreveria a sessão encerrada. Resolvida com um **`runToken` no store**, incrementado a cada `start`/`interrupt`; callbacks com token velho são descartados. O store passa a ser o **único escritor** de `session`. | plano aprovado (bug verificado) | confirmada |
| 17 | **`interruptDuelSession` fica `Result`-aware**: recusa do motor vira **no-op** (devolve a mesma sessão). Render após o duelo terminado já é bloqueado por `canSurrender` (F04) e, mesmo se chegasse, o motor recusa com `duel_already_ended` — os dois níveis concordam. | plano aprovado; PRD F04 critério "render após o duelo terminado não tem efeito" | confirmada |
| 18 | **`useSurrender` não muda de lógica** — importa `ApplyAction` de `duel-session.ts` e herda a nova assinatura. Só o fake do teste muda (passa a devolver `ok({state, events})`). | plano aprovado | confirmada |
| 19 | **`ai-agent-port.ts` é apagado**: registro module-global (`connectAiAgent`/`getAiAgent`) que nunca foi conectado — código morto substituído pela injeção explícita via `DuelRuntime`. | plano aprovado | confirmada |
| 20 | **`buildReadyDeck` (`@yugioh/rules`) satisfaz estruturalmente o port `DeckValidator` do motor**, substituindo o `validateDeck: unknown` atual por uma porta tipada (`ValidateDeck`) declarada em `duel-session.ts` — declarada localmente para o módulo continuar importando só `@yugioh/shared`. Isso resolve, no que esta feature precisa, a pendência "DeckValidator forward-declared" registrada desde motor-duelo-1x1/F03. | plano aprovado; `packages/engine/src/initialization/index.ts` | confirmada |
| 21 | **`getPublicDuelState` (`@yugioh/rules`) já existe** e é reusado sem redefinição; `initDuel` **sorteia quem começa**, então a CPU pode ter o turno 1 e o laço da CPU precisa ser disparado logo após `start()`. | código existente (`packages/rules/src/visibility`); `packages/engine/src/initialization/init-duel.ts` | confirmada |
| 22 | **O plano tem 6 fases**, acima do teto de 5 do skill para complexidade "complexa". Divergência **autorizada** e aprovada pelo usuário: as fases são independentemente verificáveis e cada uma corresponde a um commit (dado, fronteira, contrato, runtime da CPU, composição, tela). | plano aprovado pelo usuário; divergência explícita do SKILL Passo 4 | confirmada |
| 23 | F09 **não tem divisão Core/Full Scope** no PRD — a spec cobre o escopo completo da feature. | PRD §6 F09; auto-aceite: escopo | confirmada |
| 24 | **Nenhuma tabela Postgres, migração, RPC ou fila offline** é criada ou alterada por F09 — a sessão vive em memória, como F03 já decidiu (Decisão 15 daquela spec). Nenhuma economia é tocada (F06/F07 desligadas). | precedente spec F03 (Decisão 15); PRD §9 F09 | confirmada |
| 25 | O teste do gerador do duelista vive em `packages/data/scripts/`, onde **`pnpm test` não o executa** (`vitest run --dir src`) — mesma situação já existente de `generate-card-prices-seed.test.ts`. O **portão real** do duelista de teste é `pnpm --filter @yugioh/data roster:validate` (script e task de turbo já existem). Seguir o precedente em vez de mover o script para `src/` (o que violaria `domain-cores-are-pure`). | `packages/data/package.json`; `.dependency-cruiser.cjs`; auto-aceite: padrão existente | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/scripts/generate-test-duelist.ts` | data | novo | `buildTestDuelist` (puro) + `main()` que lê o catálogo selado e grava o roster |
| `packages/data/scripts/generate-test-duelist.test.ts` | data | novo | Unitários do gerador puro (não roda em `pnpm test` — Decisão 25) |
| `packages/data/package.json` | data | alterado | Script `data:test-duelist` |
| `packages/data/data/roster.json` | data | alterado | Roster regerado com o duelista de teste, commitado |
| `scripts/check-duel-engine-boundary.mjs` | raiz | novo | Portão de fronteira do motor e do catálogo de servidor (Decisão 10) |
| `package.json` (raiz) | raiz | alterado | Encadeia o novo portão no script `lint` |
| `.dependency-cruiser.cjs` | raiz | alterado | Troca `web-has-no-engine-or-ai-dependency-yet` por `web-has-no-ai-dependency-yet` + regra que só libera `duel-runtime.ts` |
| `apps/web/package.json` | web | alterado | Adiciona `@yugioh/engine: workspace:*` |
| `apps/web/next.config.mjs` | web | alterado | `transpilePackages` ganha `@yugioh/engine`; `outputFileTracingIncludes` ganha a rota do duelo |
| `apps/web/src/lib/free-duel/duel-session.ts` | web | alterado | Portas `ApplyAction`/`CloseReactionWindow`/`ValidateDeck` tipadas; `settlePendingWindow`; `PlayerActionOutcome`; `onStep` |
| `apps/web/src/lib/free-duel/duel-session.test.ts` | web | alterado | Recusa como valor, liquidação da janela, encadeamento do ataque, `onStep` |
| `apps/web/src/lib/free-duel/passive-ai-agent.ts` | web | novo | `createPassiveAiAgent` — sempre `advance_phase`, com `sleep` injetável |
| `apps/web/src/lib/free-duel/passive-ai-agent.test.ts` | web | novo | Ação devolvida, delay aplicado, `sleep` injetado |
| `apps/web/src/lib/free-duel/ai-agent-port.ts` | web | **removido** | Registro module-global morto (Decisão 19) |
| `apps/web/src/lib/free-duel/duel-runtime.ts` | web | novo | **Único módulo do app que importa `@yugioh/engine`**; monta `DuelRuntime` |
| `apps/web/src/lib/free-duel/duel-runtime.test.ts` | web | novo | Composição do runtime contra o catálogo real |
| `apps/web/src/lib/free-duel/rating-policy.ts` | web | novo | `readDuelOutcome`, `createDuelSnapshot`, `unavailableRatingEngine`, `MINIMUM_RATING_REWARD` |
| `apps/web/src/lib/free-duel/rating-policy.test.ts` | web | novo | Desfecho lido do estado; engine indisponível cai no fallback |
| `apps/web/src/stores/free-duel/duel-session-store.ts` | web | alterado | `busy`, `lastRefusal`, `runToken`, `onEvents`, `interrupt`; escritor único da sessão |
| `apps/web/src/stores/free-duel/duel-session-store.test.ts` | web | alterado | Turno completo da CPU, descarte por token, rendição no meio do laço |
| `apps/web/src/hooks/use-duel-session.ts` | web | novo | Liga o store à tela: cria por mount, dispara `start`, expõe view state |
| `apps/web/src/hooks/use-duel-session.test.ts` | web | novo | Início, avanço, recusa, encerramento |
| `apps/web/src/app/free-duel/[duelistId]/duel/page.tsx` | web | alterado | Server Component: carrega o catálogo e o repassa como prop |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.tsx` | web | alterado | Consome o runtime; corrige o bug do StrictMode; controle "Passar Fase"; liga `resolveResult` |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.test.tsx` | web | alterado | Novas props, catálogo indisponível, partida real |
| `apps/web/src/components/free-duel/duel-unavailable-notice.tsx` (+ `.module.css`) | web | novo | Aviso PT-BR de catálogo indisponível com recarregar |
| `apps/web/src/hooks/use-surrender.test.tsx` | web | alterado | Fake de `apply` passa a devolver `Result` |
| `apps/web/tests/fakes/engine-fake.ts` | web | alterado | `apply` em `Result`; `closeReactionWindow` fake; recusas programáveis |
| `apps/web/tests/free-duel-orchestration.integration.test.ts` | web | alterado | Adequação ao novo contrato |
| `apps/web/tests/surrender.integration.test.tsx` | web | alterado | Adequação ao novo contrato |
| `apps/web/tests/free-duel-engine-match.integration.test.ts` | web | novo | Partida ponta a ponta **contra o motor real**, sem fakes |

**Verificação da direção de dependências:**

- `packages/data` continua importando **apenas** `packages/shared`. O gerador do duelista vive em
  `scripts/` (I/O permitido na borda) e traz seu próprio PRNG — nada de `packages/engine`.
- `packages/shared`, `packages/rules` e `packages/engine` **não são alterados** por esta feature.
  Nenhum arquivo novo entra em `packages/engine`; `apply`, `closeReactionWindow`,
  `buildInitializationInput`, `initDuel` e `serialize` são reusados do barrel `@yugioh/engine`.
- `apps/web` passa a depender de `shared`, `rules`, `data` **e `engine`** — direção válida
  (`shared ← data ← rules ← engine`; `web` no topo). A dependência entra por **um único módulo**
  (`lib/free-duel/duel-runtime.ts`), verificado por script (Decisão 10).
- `apps/web` **não** importa `packages/ai` — o pacote não existe e a regra
  `free-duel-does-not-import-ai` continua ativa.
- `duel-session.ts`, `passive-ai-agent.ts` e o store continuam importando **apenas
  `@yugioh/shared`**: recebem `apply`/`closeReactionWindow`/`validateDeck` por injeção. É isso que
  mantém o confinamento do motor em um módulo só.
- Nenhum módulo `"use client"` alcança `lib/catalog/sealed-catalog.ts` nem `lib/server/**` — o
  catálogo desce por prop serializável do Server Component (`arquitetura.md` §7; CLAUDE.md).

## 3. Design Técnico

### Estruturas de dados

**Portas do orquestrador** (`apps/web/src/lib/free-duel/duel-session.ts`, declaradas localmente para
o módulo continuar importando só `@yugioh/shared`):

| Porta | Forma | Semântica |
|---|---|---|
| `ApplyAction` | `(state, action) => Result<ApplyResult, DomainError>` | O `apply` do motor. **Corrige** a assinatura atual, que ignora o `Result` |
| `CloseReactionWindow` | `(state) => Result<DuelState, DomainError>` | Fecha uma janela de reação aberta; erro quando não há janela |
| `ValidateDeck` | `({ composition, catalog }) => Result<ReadyDeck, DomainError>` | Substitui `validateDeck: unknown`; estruturalmente igual ao `DeckValidator` do motor (Decisão 20) |

**`PlayerActionOutcome`** — o que `submitPlayerAction` devolve:

| Campo | Tipo | Semântica |
|---|---|---|
| `session` | `DuelSession` | **Referencialmente idêntica à entrada quando a ação é recusada** |
| `events` | `readonly DuelEvent[]` | Somente os eventos da ação do jogador (ordenados); os da CPU chegam por `onStep` |
| `refusal` | `DomainError \| undefined` | O motivo da recusa, quando houver — a UI traduz por `code` |

**`AdvanceCpuDependencies`** ganha dois campos além dos atuais (`apply`, `aiAgent`,
`getPublicDuelState`, `cpuProfile`, `logIncident`):

| Campo | Tipo | Semântica |
|---|---|---|
| `closeReactionWindow` | `CloseReactionWindow` | Porta de liquidação (Decisão 1) |
| `onStep` | `((step: { session; events }) => void) \| undefined` | Publicado **depois de cada ação da CPU aplicada e liquidada** — sem isso os estados intermediários do turno do oponente são invisíveis |

**`DuelRuntime`** (`lib/free-duel/duel-runtime.ts`) — o composition root:

| Membro | Forma | Semântica |
|---|---|---|
| `start` | `(input: MatchOrchestrationInput, duelist: Duelist) => DuelSession` | `buildInitializationInput` + `initDuel` já ligados ao catálogo, ao `ValidateDeck` e ao gerador de seed |
| `applyAction` | `ApplyAction` | O `apply` do motor, ponta a ponta |
| `advanceDependencies` | `Omit<AdvanceCpuDependencies, "cpuProfile" \| "onStep">` | `apply`, `closeReactionWindow`, `getPublicDuelState`, agente passivo |
| `resolveResult` | `ResolveEndedDuelResult` | `resolveDuelResult` já ligado à política de rating |

**Estado do store da sessão** (`stores/free-duel/duel-session-store.ts`), acrescentando ao `session`
atual:

| Campo | Tipo | Semântica |
|---|---|---|
| `busy` | `boolean` | Verdadeiro enquanto um despacho (jogador ou CPU) está em curso; desabilita a mão e as zonas |
| `lastRefusal` | `DomainError \| undefined` | Última recusa do motor, limpa no despacho seguinte |
| `runToken` | `number` | Incrementado a cada `start`/`interrupt`; callbacks com token velho são **descartados** (Decisão 16) |
| `onEvents` | `((events) => void) \| undefined` | Assinatura opcional para F10 alimentar as cues |

**Duelista de teste** (`packages/data/data/roster.json`) — usa apenas o schema existente de
`Duelist` (`packages/shared/src/duelist/types.ts`); **nenhum campo novo**.

### Fluxo

**Geração do duelista de teste** (offline, uma vez, commitado):

1. `main()` lê o catálogo selado do disco (`loadCatalogFromDisk`), colhendo as 722 cartas.
2. `buildTestDuelist(cards, { seed })` — puro — particiona o catálogo por `tipo`, sorteia com um
   mulberry32 próprio **34** cartas de `tipo ∈ {monstro, ritual}` e **6** de magia/armadilha,
   respeitando o máximo de **3 cópias** (invariante da Fase 0.3) e o total de **40**.
3. Monta o pool de drops com **8** cartas do próprio deck em um único tier, cujo id é o `dropTier` do
   `MINIMUM_RATING_REWARD`.
4. Escreve `roster.json` com `rosterVersion`, `id: "test-duelist"`, nome PT-BR, `difficulty: "easy"`,
   `profile: { strategy: "passive", parameters: {} }` e `portrait: "cards-data/001.jpg"`.
5. `pnpm --filter @yugioh/data roster:validate` deve reportar **1 disponível / 0 escondido**.

**Entrada na rota do duelo:**

6. `page.tsx` (Server Component) carrega o catálogo selado e o projeta em `readonly Card[]`; em falha,
   devolve `{ status: "error" }` como prop.
7. `duel-screen.tsx` (Client) com `catalogResult.status === "error"` renderiza
   `duel-unavailable-notice` e **não tenta iniciar a partida** (PRD F09 Error Handling).
8. Caso contrário, cria o `DuelRuntime` uma vez por mount e o store uma vez por mount
   (`useState(() => createDuelSessionStore(deps))`).
9. O efeito de início carrega o contexto (handoff de F02 + duelista do roster de F01) sob o guarda
   `matchStarted.current`, **sem o flag `active`** (Decisão 15), e chama `start`.

**Início da partida:**

10. `createDuelSession` chama `buildInitializationInput` com o catálogo, o `ValidateDeck`
    (`buildReadyDeck`) e o gerador de seed cripto; recusa ⇒ `failed/deck_rejected_by_engine`.
11. `initDuel` produz o estado inicial (8000 LP, 5 cartas na mão, 5+5 zonas) e **sorteia quem começa**.
12. Se `currentDecider === "P2"`, o store dispara imediatamente `advanceCpuDecisions` (Decisão 21).

**Ação do jogador** (`submitPlayerAction`):

13. `nextDecider(state) !== "P1"` ⇒ devolve `{ session (mesma referência), events: [], refusal:
    not_your_turn }`.
14. `applyAndSettle`: chama `apply`; se recusar, devolve o `refusal` sem tocar em nada.
15. Sucesso ⇒ `settlePendingWindow`: enquanto `state.pending !== undefined`, se a janela é
    `onAttackDeclared`, submete `resolve_attack`; caso contrário, chama `closeReactionWindow`.
    Os eventos são **acumulados em ordem**. Qualquer recusa nesse laço interrompe e sobe como
    `refusal`.
16. Estado com `outcome` definido ⇒ sessão `ended`. Caso contrário, delega a `advanceCpuDecisions`.

**Turno da CPU** (`advanceCpuDecisions`):

17. Enquanto `nextDecider === "P2"`, `outcome === undefined` e o contador < `MAX_CPU_ACTIONS_PER_ADVANCE`
    (**100**): projeta `getPublicDuelState(state, "P2")`, chama `aiAgent.decide` (que dorme ~650 ms
    dentro de si), aplica via `applyAndSettle` e publica `onStep({ session, events })`.
18. O agente passivo termina o turno em **≤ 4 ações** (draw → main → battle → end → passa a vez), bem
    abaixo do teto de 100.
19. Exceção do agente **ou** recusa do motor a uma ação da CPU ⇒ `failed/ai_unavailable`; teto
    estourado ⇒ `failed/no_progress_loop` (comportamento de F03 preservado).

**Rendição e fim:**

20. `interruptDuelSession` aplica a ação sem checar o decisor (canal de F04); recusa ⇒ no-op.
21. O store incrementa `runToken` em `start` e em `interrupt`; o `advanceCpuDecisions` em voo compara
    o token ao terminar e **descarta** o resultado se ele mudou — a sessão encerrada pela rendição
    sobrevive (Decisão 16).
22. Sessão `ended` ⇒ a tela resolve o resultado por `resolveResult` (F05), que cai no
    `minimum_fallback` (Rating Engine indisponível) e não concede recompensa (F06/F07 desligadas).

### Regras de negócio

**Invariantes da Fase 0.3 respeitados (herdados do motor, nunca recalculados aqui):** 40 cartas por
deck, máximo 3 cópias, 8000 LP, 5+5 zonas, 1 jogada da mão por turno, 1 ataque por monstro por turno,
quem joga o primeiro turno não ataca, deck zerado = derrota. F09 **não verifica** nenhum deles; o
duelista de teste é validado contra os dois primeiros pelo `roster:validate` já existente.

**Regras próprias desta feature:**

- **Recusa não muda estado.** Ao receber `!result.ok`, `submitPlayerAction` devolve a **mesma
  referência** de sessão. Isso é observável e testado — não é apenas "estado equivalente".
- **A janela de reação nunca sobrevive a um despacho.** Ao fim de `applyAndSettle`,
  `state.pending === undefined` sempre. Sem isso, uma invocação do jogador entregaria a vez à CPU,
  que responderia `advance_phase`, que o motor recusaria com `reaction_window_open` — sessão morta.
- **Um despacho por intenção.** `declare_attack` + `resolve_attack` formam um único despacho, com os
  eventos concatenados na ordem de emissão.
- **A CPU publica por passo.** Cada ação da CPU gera exatamente um `onStep`; nenhum lote agregado.
- **O store é o único escritor de `session`.** Rendição, laço da CPU e ação do jogador passam todos
  por ele, arbitrados pelo `runToken`.
- **Nenhuma regra de jogo em `apps/web`.** O único conhecimento de domínio que a camada acrescenta é
  *quando* liquidar a janela — mecânica de orquestração, não de regra.
- **Nenhuma escrita em Postgres, IndexedDB ou fila offline** (Decisão 24).

### Eventos

F09 **não define nenhum evento novo**. Consome os 10 tipos que o motor emite — `onTurnStart`,
`onDraw`, `onSummon`, `onSet`, `onFlip`, `onPositionChange`, `onAttackDeclared`, `onDamage`,
`onDestroy`, `onTurnEnd` (`arquitetura.md` §3.3) — e apenas os **transporta em ordem**: eventos da
ação do jogador em `PlayerActionOutcome.events`, eventos de cada ação da CPU em `onStep`.

**Não existe `onDuelEnd`.** O fim do duelo é lido exclusivamente de `state.outcome`, que
motor-duelo-1x1/F12 carimba e congela — é o que `finishOrContinue` já faz e continua fazendo. F09 não
introduz uma segunda forma de saber que a partida acabou.

A ordem de emissão é do motor; a ordem de **resolução** de efeitos seria do Effect System, que não
existe — por isso as janelas de reação fecham vazias (Decisão 1).

### Determinismo e pureza

Esta feature **não altera `packages/engine`**, mas o consome, então herda e preserva suas garantias:

- **Nenhum `Math.random()`**: o PRNG semeado vive dentro de `DuelState`; a única entropia da feature é
  `createCryptoSeedGenerator`/`generateDuelSessionId`, já isolada na borda desde F03. O gerador do
  duelista de teste usa mulberry32 com `--seed` explícito, e seu resultado é **commitado** — o dado
  em produção é determinístico por construção.
- **`buildTestDuelist` é puro e total**: recebe as cartas, devolve o duelista; toda I/O fica no
  `main()` do script.
- **O laço da CPU é determinístico**: o delay de ritmo está dentro do agente atrás de um `sleep`
  injetável, então injetar `async () => {}` torna a sequência de ações reprodutível nos testes
  (Decisão 9).
- **`settlePendingWindow` é uma função pura por composição**: sua única impureza vem das portas
  injetadas; não lê relógio nem gera aleatoriedade.
- O `DuelState` continua **JSON-serializável** e passa pelo round-trip `load(serialize(s))` que o
  motor já garante — usado pelo caminho de snapshot de F05.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

**Nenhum tipo ou schema novo em `packages/shared`.** F09 reusa sem redefinir: `DuelAction` (`Action`,
8 variantes), `ApplyResult`, `DuelEvent`, `DuelState`, `PublicDuelState`, `DuelSession`,
`MatchOrchestrationInput`, `OrchestrationFailureReason`, `AiAgent`, `GetPublicDuelState`,
`MAX_CPU_ACTIONS_PER_ADVANCE`, `DuelOutcome`, `MinimumRatingReward`, `RatingEngine`, `ReadDuelOutcome`,
`CreateDuelSnapshot`, `ConsolidatedDuelResult`, `Duelist`, `DropPool`, `ReadyDeck`, `DeckComposition`,
`CardCatalogLookup`, `Result`, `DomainError`.

As três portas novas (`ApplyAction`, `CloseReactionWindow`, `ValidateDeck`) são **locais a
`apps/web/src/lib/free-duel/duel-session.ts`** de propósito: promovê-las a `shared` faria o pacote raiz
carregar o vocabulário de um adaptador de app.

### Funções públicas

```
// packages/data/scripts/generate-test-duelist.ts

buildTestDuelist(cards: readonly Card[], options: { seed: number }): Result<Duelist, DomainError>
  // puro e total; erro quando o catálogo não tem cartas suficientes de algum tipo
  // pós: deck com 40 numeros, <= 3 copias de cada, todos presentes em `cards`
  //      dropPool com exatamente 1 tier nao vazio
```

```
// apps/web/src/lib/free-duel/duel-session.ts

submitPlayerAction(
  session: ActiveDuelSession,
  action: DuelAction,
  dependencies: AdvanceCpuDependencies,
): Promise<PlayerActionOutcome>
  // decisor != P1  => { session (mesma referencia), events: [], refusal: not_your_turn }
  // apply recusa   => { session (mesma referencia), events: [], refusal: erro do motor }
  // sucesso        => aplica, liquida a janela, delega a CPU; events = os da acao do jogador

advanceCpuDecisions(
  session: ActiveDuelSession,
  dependencies: AdvanceCpuDependencies,
): Promise<DuelSession>
  // publica onStep apos cada acao da CPU aplicada e liquidada
  // try/catch restrito a aiAgent.decide; recusa do motor => failed/ai_unavailable

interruptDuelSession(
  session: ActiveDuelSession,
  action: DuelAction,
  dependencies: Pick<AdvanceCpuDependencies, "apply">,
): DuelSession
  // recusa do motor => no-op (devolve a mesma sessao)
```

```
// apps/web/src/lib/free-duel/passive-ai-agent.ts

createPassiveAiAgent(options?: {
  sleep?: (ms: number) => Promise<void>;
  delayMs?: number;
}): AiAgent
  // decide() aguarda `sleep(delayMs ?? 650)` e devolve { type: "advance_phase" }
```

```
// apps/web/src/lib/free-duel/duel-runtime.ts   (unico modulo do app que importa @yugioh/engine)

createDuelRuntime(input: {
  cards: readonly Card[];
  sleep?: (ms: number) => Promise<void>;
}): DuelRuntime
```

```
// apps/web/src/lib/free-duel/rating-policy.ts

readDuelOutcome: ReadDuelOutcome        // le state.outcome; ausente => erro de dominio
createDuelSnapshot: CreateDuelSnapshot  // serialize do motor, via duel-runtime
unavailableRatingEngine: RatingEngine   // sempre indisponivel enquanto o Rating Engine nao existir
MINIMUM_RATING_REWARD: MinimumRatingReward  // dado de balanceamento PENDENTE (Decisao 13)
```

### Endpoints / RPC / mensagens de rede

**Não aplicável.** F09 é 100% offline: nenhuma rota de API nova, nenhuma RPC, nenhuma migração,
nenhum payload de rede. A única fronteira servidor/cliente é o Server Component da rota do duelo,
que entrega o catálogo como prop serializável (Decisão 11).

### Formato do duelista de teste (`packages/data/data/roster.json`)

```json
{
  "rosterVersion": "1.0.0",
  "duelists": [
    {
      "id": "test-duelist",
      "name": "Duelista de Teste",
      "portrait": "cards-data/001.jpg",
      "difficulty": "easy",
      "profile": { "strategy": "passive", "parameters": {} },
      "deck": ["012", "012", "047", "…40 números no total…"],
      "dropPool": [{ "tier": "common", "cardNumbers": ["012", "047", "…8 no total…"] }]
    }
  ]
}
```

### Contratos externos (cross-PRD)

**A ser fornecido por `packages/ai` (IA de NPCs):** a implementação real de `AiAgent` por perfil de
dificuldade. F09 entrega um agente passivo que satisfaz o **mesmo** contrato e é substituível trocando
uma linha do `duel-runtime.ts` — sem tocar em `duel-session.ts`, no store nem na tela (critério
Cross-PRD do PRD §9).

**A ser fornecido pelo Rating Engine:** escala de notas e tabela nota→recompensa. Enquanto não existir,
`unavailableRatingEngine` faz toda vitória cair no `minimum_fallback` que F05 já implementa, e
`MINIMUM_RATING_REWARD` é **placeholder declarado** — nenhum valor de lore do FM é inventado.

**A ser fornecido pelo usuário (balanceamento):** a composição definitiva do roster. O duelista de
teste é explicitamente o mínimo jogável.

## 5. Modelo de Dados

### Postgres / Supabase

**Nenhuma tabela, coluna, índice, constraint, política de RLS, RPC ou migração é criada ou alterada.**
A sessão de duelo vive em memória (spec F03, Decisão 15) e a economia permanece intocada porque F06 e
F07 estão desligadas nesta feature (Decisão 13). Não há valor sensível vindo do cliente nem crédito a
tornar idempotente.

### Cache local / fila offline

Nenhuma estrutura nova. O roster continua sendo carregado no cliente por `loadClientRoster()`,
preservando o cache e o aviso de degradação que F01 já implementa.

### Arquivos de dados versionados

**`packages/data/data/roster.json`** — arquivo já existente, hoje com `duelists: []`. Passa a conter
um duelista, com `rosterVersion` promovido a `"1.0.0"`. Regras que continuam valendo, verificadas por
`loadRoster`/`validateDuelist`:

| Regra | Fonte |
|---|---|
| Deck com exatamente 40 números de carta | `REQUIRED_DECK_SIZE`, Fase 0.3 |
| No máximo 3 cópias por carta | `MAX_COPIES_PER_CARD`, Fase 0.3 |
| Todo `numero` existe no catálogo selado | `CatalogLookup` injetado |
| `portrait` casa `/^[a-z0-9/_-]+\.(jpg\|png\|webp)$/` | `validate-duelist.ts` |
| Nenhum tier de drop vazio | `drop-pool.ts` |
| Duelista inválido é **ocultado** com registro, não quebra a tela | F01 |

**Comportamento com o arquivo vazio** (estado atual, que deixa de ser o padrão mas continua suportado):
`/free-duel` mostra o estado de roster vazio de F01 — o caminho neutro nunca deixa de existir.

**Bundle do catálogo:** `packages/data/generated/` continua sendo pré-requisito de build
(`data:validate` grava o `dataset-seal.json` que o loader lê primeiro). A rota do duelo entra no
`outputFileTracingIncludes` junto das demais que leem o catálogo em runtime.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Catálogo indisponível na rota do duelo | `getSealedCatalog()` devolve `!ok` no Server Component | `catalogResult: { status: "error" }`; a tela **não** inicia a partida | `duel-unavailable-notice` PT-BR com botão de recarregar (`router.refresh()`) |
| Motor recusa a inicialização (deck inválido) | `buildInitializationInput` devolve `!ok` | Sessão `failed/deck_rejected_by_engine` | `OrchestrationFailureNotice` (mensagem específica de F03) |
| Motor recusa uma ação do jogador | `apply` devolve `!ok` | `refusal` com o `DomainError`; **estado e sessão intactos**, partida segue `in_progress` | Linha de aviso traduzida do `code` (F10 detalha a superfície) |
| Não é a vez do jogador | `nextDecider(state) !== "P1"` | Mesmo tratamento de recusa, com código `not_your_turn` | Aviso de que é a vez do oponente |
| Janela de reação não fecha (recusa de `closeReactionWindow` ou `resolve_attack`) | Laço de `settlePendingWindow` recebe `!ok` | Interrompe o laço e sobe como `refusal`; o estado permanece o **anterior ao despacho** | Mesma linha de recusa |
| Agente da CPU lança ou rejeita | `try/catch` em torno de `aiAgent.decide` | Sessão `failed/ai_unavailable`, incidente registrado | Mensagem de falha da IA (F03) |
| Motor recusa uma ação da CPU | `apply` devolve `!ok` dentro do laço da CPU | Sessão `failed/ai_unavailable` (com o agente passivo, só pode ser bug) | Mensagem de falha da IA (F03) |
| CPU sem progresso | Contador atinge `MAX_CPU_ACTIONS_PER_ADVANCE` (100) | Sessão `failed/no_progress_loop`, incidente registrado | Mensagem de falha da IA (F03) |
| Rendição durante o laço da CPU | `runToken` divergente ao término do laço | O resultado do laço é **descartado**; a sessão encerrada pela rendição prevalece | Resultado do duelo (derrota por rendição) |
| Rendição após o duelo terminado | `canSurrender` (F04) e, em profundidade, `duel_already_ended` do motor | No-op nos dois níveis | Nenhuma — o botão já não está disponível |
| Duelo termina no meio do turno da CPU | `state.outcome` definido | O laço sai e a sessão vira `ended`; a tela congela e resolve o resultado | Tela de resultado (F05) + navegação (F08) |
| Duelista de teste com deck inválido no roster | `validateDuelist` no carregamento | Duelista **ocultado** com registro de inconsistência (F01) | Estado de roster vazio |
| Retrato ausente no disco | Rota `/cards-data/[file]` devolve 404 | Imagem quebra; a lista de oponentes segue navegável (comportamento de F01) | Nenhuma mensagem nova |
| Refresh em `/duel` | Handoff de F02 já consumido | Redireciona para `/free-duel` | Nenhuma — comportamento documentado em F03 e no PRD §7 |
| Rating Engine indisponível na vitória | `unavailableRatingEngine` sempre falha | `minimum_fallback` com `MINIMUM_RATING_REWARD`; incidente registrado (F05) | Resultado com recompensa mínima |
| Recompensa (F06/F07) desligada | `grantVictoryReward` ausente | `useVictoryReward` cai no caminho "não foi possível conceder" já implementado | Aviso de recompensa pendente (lacuna declarada) |
| Efeito de início rodando duas vezes (StrictMode) | `matchStarted.current` | A segunda invocação sai cedo; a primeira **completa** e chama `setSession` (Decisão 15) | Nenhuma — o duelo simplesmente inicia |

## 7. Estratégia de Testes

### Unitários (Vitest)

**`packages/data/scripts/generate-test-duelist.test.ts`** (ambiente node; não roda em `pnpm test` —
Decisão 25):

- `buildTestDuelist devolve 40 numeros de carta` — total exato.
- `buildTestDuelist respeita o limite de 3 copias` — nenhum `numero` aparece 4×.
- `buildTestDuelist sorteia 34 monstros e 6 magias/armadilhas` — a composição da Decisão 6.
- `buildTestDuelist e deterministico por seed` — mesma seed ⇒ deck idêntico.
- `buildTestDuelist so usa cartas do catalogo recebido` — todo `numero` está na entrada.
- `buildTestDuelist devolve erro quando faltam monstros no catalogo` — catálogo insuficiente ⇒ `!ok`.
- `dropPool tem exatamente um tier nao vazio com cartas do deck`.

**`apps/web/src/lib/free-duel/duel-session.test.ts`** (ambiente node):

- `submitPlayerAction devolve a mesma sessao quando o motor recusa` — igualdade **referencial**,
  `refusal` presente, `status` continua `in_progress`.
- `submitPlayerAction recusa com not_your_turn quando o decisor e P2`.
- `submitPlayerAction fecha a janela de reacao antes de calcular o proximo decisor` — depois de uma
  invocação, `state.pending` é `undefined`.
- `submitPlayerAction encadeia resolve_attack apos declare_attack` — as duas ações chegam ao `apply`
  na ordem, e os eventos das duas vêm concatenados.
- `submitPlayerAction acumula os eventos da liquidacao na ordem de emissao`.
- `settlePendingWindow interrompe e devolve refusal quando o fechamento e recusado`.
- `advanceCpuDecisions publica onStep uma vez por acao da CPU`.
- `advanceCpuDecisions encerra em ai_unavailable quando o motor recusa uma acao da CPU`.
- `advanceCpuDecisions encerra em ai_unavailable quando o agente lanca`.
- `advanceCpuDecisions encerra em no_progress_loop ao atingir MAX_CPU_ACTIONS_PER_ADVANCE`.
- `interruptDuelSession e no-op quando o motor recusa`.
- `submitPlayerAction encerra a sessao quando o estado passa a ter outcome`.

**`apps/web/src/lib/free-duel/passive-ai-agent.test.ts`**:

- `createPassiveAiAgent sempre devolve advance_phase`.
- `createPassiveAiAgent aguarda o sleep injetado antes de decidir`.
- `createPassiveAiAgent usa 650ms como delay padrao`.

**`apps/web/src/lib/free-duel/rating-policy.test.ts`**:

- `readDuelOutcome le state.outcome do estado encerrado`.
- `readDuelOutcome falha quando o duelo nao terminou`.
- `unavailableRatingEngine sempre devolve indisponivel` — garante o `minimum_fallback`.

**`apps/web/src/lib/free-duel/duel-runtime.test.ts`**:

- `createDuelRuntime inicia uma sessao com dois decks reais do catalogo`.
- `createDuelRuntime recusa a inicializacao quando a composicao nao tem 40 cartas`.

**`apps/web/src/stores/free-duel/duel-session-store.test.ts`**:

- `start dispara o laco da CPU quando o sorteio da o turno 1 a P2`.
- `um turno completo da CPU publica 4 onStep` — o agente passivo fecha o turno em ≤ 4 ações.
- `submitAction marca busy durante o despacho e limpa ao final`.
- `submitAction guarda lastRefusal quando o motor recusa`.
- `interrupt no meio do laco da CPU preserva a sessao encerrada` — o resultado do laço com token
  velho é descartado (a corrida da Decisão 16).
- `start incrementa runToken e descarta o laco anterior`.

**`apps/web/src/hooks/use-duel-session.test.ts`** e **`duel-screen.test.tsx`** (jsdom, via docblock
`// @vitest-environment jsdom` por arquivo; sem `jest-dom` e sem `user-event` — `fireEvent` e asserts
simples):

- `a tela inicia a partida uma unica vez sob StrictMode` — renderiza dentro de `<StrictMode>` e afirma
  que a sessão chega a `in_progress` (o bug da Decisão 15 falharia aqui).
- `a tela mostra o aviso de catalogo indisponivel e nao inicia a partida`.
- `passar fase avanca a fase do duelo` — o controle temporário de F09.
- `a mao e desabilitada enquanto o decisor e P2`.
- `uma recusa do motor exibe a linha de aviso e mantem o tabuleiro`.

### Property-based (fast-check)

- `settlePendingWindow sempre termina com pending indefinido` — sobre sequências arbitrárias de
  estados com e sem janela aberta, o pós-estado nunca tem `state.pending` definido, ou o resultado é
  um `refusal`. Cobre a invariante que impede o travamento do duelo.
- `submitPlayerAction preserva a sessao sob qualquer recusa` — para qualquer `DuelAction` arbitrária
  gerada da união de 8 variantes, quando o motor recusa, a sessão devolvida é referencialmente a
  mesma e `status` continua `in_progress`.
- `buildTestDuelist e deterministico` — para 1.000 seeds arbitrárias, duas execuções com a mesma seed
  produzem o mesmo deck (`packages/data`).

### Integração

- **`apps/web/tests/free-duel-engine-match.integration.test.ts` (novo, sem fakes do motor):** monta
  dois decks reais de 40 cartas a partir do catálogo selado, cria o `DuelRuntime` e dirige
  invocação → avanço de fase → turno da CPU → ataque → queda de LP → rendição, afirmando
  `outcome.reason === "surrender"`. É o teste que prova o critério "o duelo roda contra o motor real".
- **`apps/web/tests/free-duel-orchestration.integration.test.ts` (atualizado):** o mesmo fluxo
  F01→F02→F03 sobre o `engine-fake` agora em `Result`, cobrindo também a recusa como valor.
- **`apps/web/tests/surrender.integration.test.tsx` (atualizado):** rendição durante o turno da CPU
  encerra a partida e o laço não ressuscita a sessão.

### Análise estática

- **`scripts/check-duel-engine-boundary.mjs`** (novo, encadeado em `pnpm lint`) — o portão real
  (Decisão 10). Falha quando: (a) qualquer arquivo de `apps/web/src/` que não seja
  `lib/free-duel/duel-runtime.ts` importa `@yugioh/engine`; (b) qualquer arquivo sob
  `src/components/free-duel/` ou `src/app/free-duel/**` importa o motor; (c) qualquer módulo com a
  diretiva `"use client"` importa `lib/catalog/sealed-catalog.ts` ou algo de `lib/server/`.
  **Verificação do próprio portão:** acrescentar temporariamente um import do motor em um componente
  e confirmar que o script falha.
- **`.dependency-cruiser.cjs`** — a regra `web-has-no-engine-or-ai-dependency-yet` é substituída por
  `web-has-no-ai-dependency-yet`; documenta a intenção, mas **não é evidência** (as regras de
  workspace estão inertes).
- As regras existentes `domain-cores-are-pure` e `free-duel-does-not-import-ai` continuam ativas e
  cobrem, respectivamente, o script do duelista (que fica em `scripts/`, fora de `src/`) e a ausência
  de `packages/ai`.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9, F09) | Teste |
|---|---|
| Duelo roda contra o motor real (compra, invocação, magia/armadilha, posição, ataque, desfecho por `apply`) | `free-duel-engine-match.integration.test.ts` |
| Exatamente um módulo do app importa o motor; portão de lint dedicado falha se outro importar | `scripts/check-duel-engine-boundary.mjs` + verificação manual do portão |
| Ação recusada devolve o motivo e não altera estado nem status | `submitPlayerAction devolve a mesma sessao quando o motor recusa` |
| Janela de reação fechada no mesmo despacho; nenhuma sequência legal trava o duelo | `submitPlayerAction fecha a janela…`, `submitPlayerAction encadeia resolve_attack…`, property `settlePendingWindow sempre termina com pending indefinido` |
| Turno da CPU avança as fases e publica cada ação individualmente | `um turno completo da CPU publica 4 onStep` |
| Catálogo lido no servidor e entregue como dado serializável; nenhum módulo cliente alcança o FS | `scripts/check-duel-engine-boundary.mjs` (regra c) + `duel-screen.test.tsx` |
| Catálogo indisponível mostra aviso próprio com recarregar, sem iniciar a partida | `a tela mostra o aviso de catalogo indisponivel e nao inicia a partida` |
| Roster expõe um duelista de teste com deck de 40 cartas válido e pool não vazio | `pnpm --filter @yugioh/data roster:validate` (1 disponível / 0 escondido) + unitários de `buildTestDuelist` |
| (Lacuna declarada) F06/F07 desligadas; recompensa informada como pendente | `duel-screen.test.tsx` afirma o aviso de recompensa pendente na vitória |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Cross-Feature: em derrota/empate (inclusive rendição de F04), F06 e F07 não disparam | `surrender.integration.test.tsx` — resultado sem bloco de recompensa |
| Cross-Feature: fluxo completo F01→F02→F03→F05→F08 sem estado inconsistente | `free-duel-engine-match.integration.test.ts` + `free-duel-post-duel-navigation.integration.test.tsx` (existente, deve seguir verde) |
| Cross-PRD (Motor de Duelo): todo desfecho vem de `state.outcome`; o Free Duel não reimplementa regra | `readDuelOutcome le state.outcome…` + ausência de qualquer checagem de legalidade em `apps/web` (portão de fronteira) |
| Cross-PRD (IA de NPCs, andaime de F09): o agente passivo satisfaz o mesmo contrato e é substituível sem tocar na sessão nem na tela | `passive-ai-agent.test.ts` + `duel-session.test.ts` injetando um agente alternativo com o mesmo tipo, sem alterar `duel-session.ts` |
| Cross-PRD (Rating Engine): a nota reflete as definições oficiais quando fornecidas — pendência registrada | `unavailableRatingEngine sempre devolve indisponivel` (caminho neutro) |
| Cross-PRD (Banco de Cartas): os 80 números de carta dos dois decks resolvem em cartas reais do catálogo | `free-duel-engine-match.integration.test.ts` (catálogo selado, sem fixture sintética) |
