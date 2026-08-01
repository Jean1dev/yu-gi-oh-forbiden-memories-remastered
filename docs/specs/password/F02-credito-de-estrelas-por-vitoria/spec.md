# Crédito de Estrelas por Vitória

> PRD: `docs/prds/password.md` — F02
> Pacote-alvo: `apps/web` (consome `packages/shared` e `packages/rules` sem alterá-los;
> `supabase/migrations` sem migração nova)

## 1. Contexto e Escopo

F02 é a segunda feature da Wave 2 do módulo Password (PRD §8, Parte 3) e a **fonte de entrada**
da economia: sem ela a carteira de F01 nunca cresce e a liberação por senha de F04 nunca tem
saldo para gastar. Tecnicamente, F02 é o handler que reage ao **evento de vitória em duelo** e
credita `+N` estrelas na carteira única, exatamente uma vez por `id` de duelo, na **mesma
transação** em que `BuildDeck/F03` concede a carta de drop.

Esta spec **não constrói esse handler** — ela **adota formalmente** o handler `onVictory`
unificado que `free-duel/F07` já entregou sob a recomendação de `docs/arquitetura.md` §5.3 e
ADR-006 §4, e fecha as lacunas que sobraram entre o código existente e o bloco
Capabilities/Experience/Error Handling que o PRD `password` F02 exige. É o mesmo padrão adotado
por `docs/specs/password/F01-carteira-de-estrelas/spec.md`, cuja Decisão 1 já registra que
"F01 e F02 do PRD `password` estão satisfeitas por `free-duel/F07`". Esta spec é a metade F02
daquela afirmação: prova item a item o que está satisfeito, e especifica o que **não** está.

No roadmap (`arquitetura.md` §9) isto é Fase 2 (economia) alimentada por Fase 3 (Free Duel),
ambas já parcialmente no repositório.

### Rastreabilidade — o que `free-duel/F07` já entrega para o PRD `password` F02

| Item do PRD `password` F02 | Situação | Evidência no repositório |
|---|---|---|
| **Consumes** — F01: carteira de estrelas | ✅ coberto | Tabela `wallets` (`player_id` PK, `stars int ≥ 0`, RLS select-own) — `supabase/migrations/0008_create_wallets_and_apply_victory_reward.sql`. É a carteira única adotada por `password/F01` (Decisão 1 daquela spec) |
| **Consumes** — evento de vitória com `id` único do duelo (cross-PRD) | ⚠️ parcial | `VictoryRewardEvent`/`VictoryRewardEventSchema` (`packages/shared/src/economy/wallet.ts`, `wallet-schema.ts`) com `duelId: string().min(1)`; produzido por `apps/web/src/lib/free-duel/grant-victory-reward.ts` a partir de `result.duelSessionId`. **Só `free-duel` dispara hoje** — Online Duel e Campanha não existem (contrato externo, Seção 4) |
| **Provides** — carteira atualizada com `+N` estrelas | ✅ coberto | `apply_victory_reward` faz `insert ... on conflict (player_id) do update set stars = wallets.stars + excluded.stars` e devolve `wallet_stars` (`0008`) |
| **C1** — cada vitória credita `+N`, `N` tunável | ⚠️ parcial | `N` chega por injeção em `result.rating.reward.stars` (`free-duel/F05`, `ConsolidatedRating`, `packages/shared/src/duel/result.ts`) e é repassado sem transformação por `grantVictoryReward`. **Nenhum valor de balanceamento existe** — a política `minimumReward` não tem provedor de produção (Decisão 4) |
| **C2** — coexiste com `BuildDeck/F03`: carta **e** estrelas, mesmo evento | ✅ coberto | `apply_victory_reward` insere `reward_ledger`, incrementa `collections` **e** `wallets` na mesma transação (`0008`, linhas 42-57) — a unificação `onVictory` de `arquitetura.md` §5.3 |
| **C3** — idempotente por duelo, identificado pelo `id`; reprocessar não soma | ✅ coberto | `reward_ledger.duel_id` é PK (`0005`); `insert ... on conflict (duel_id) do nothing` + guarda `if found` (`0008`). Segunda camada local: `applyVictoryReward` consulta a fila antes de qualquer rede (`apps/web/src/lib/reward/apply-victory-reward.ts`) |
| **C4** — não decide a carta de drop nem a tabela de drops | ✅ coberto | A seleção é `selectDropCardNumber` (`packages/rules`, `free-duel/F06`); F02 só recebe o `cardNumber` já escolhido |
| **C5** — não define derrota/empate; só reage à vitória | ✅ coberto | `grantVictoryReward` recebe `Extract<ConsolidatedDuelResult, { status: "victory" }>`; o tipo torna derrota/empate inalcançáveis |
| **E1/E3** — "+N estrelas" e saldo ao lado da carta conquistada, na tela de vitória | ✅ coberto | `apps/web/src/components/free-duel/stars-reward-badge.tsx` renderiza `+{stars} estrelas` e `Saldo: {walletStars} estrelas`, montado junto de `card-drop-reward.tsx` |
| **E2** — ao abrir o Password o saldo já reflete o crédito | ✅ coberto (por F01) | `loadWalletBalance` + `useWalletStore`/`useWalletBalance` — entrega de `password/F01`; F02 não duplica leitura |
| **EH1** — falha ao persistir → cache local + fila; sinaliza "Estrelas creditadas localmente; sincronizando…" | ⚠️ parcial | Mensagem **literal** já existe: `STARS_REWARD_OFFLINE_MESSAGE` em `stars-reward-badge.tsx`; fila e escrita local em `apply-offline-victory-reward.ts` + `victory-reward-queue.ts`. **Mas a fila nunca drena em produção**: `useVictoryRewardSync` não tem nenhum consumidor (Lacuna 4) |
| **EH2** — evento duplicado → ignora sem creditar, **registrando** "Recompensa de estrelas já aplicada." | ❌ lacuna | O RPC **distingue** os dois casos (`applied boolean`) e `applyVictoryReward` mapeia para `status: "already_applied"`; a UI mostra `STARS_REWARD_ALREADY_APPLIED_MESSAGE`. O que falta é o **registro**: `apply-victory-reward.ts` não emite nenhuma linha de log, ao contrário do seu irmão `register-card-reward.ts` (Lacuna 1) |
| **EH3** — evento sem `id` ou malformado → não credita e **registra inconsistência**, sem alterar o saldo | ❌ lacuna | A validação existe e roda **antes de qualquer I/O** (`VictoryRewardEventSchema.safeParse` → `malformed_victory_reward_event`), então o saldo de fato não muda. Faltam o **registro** e, na origem, a não-explosão: `grant-victory-reward.ts` usa `.parse`, que **lança** em vez de devolver `Result` (Lacunas 1 e 2) |
| **§9** — "vencer credita `+N` além da carta de drop" | ✅ coberto | Mesma transação do RPC `0008` |
| **§9** — "crédito exatamente uma vez; reprocessar não duplica" | ✅ coberto | PK `duel_id` + `on conflict do nothing`; propriedade já testada em `apply-victory-reward.properties.test.ts` |
| **§9** — "evento duplicado é ignorado **com registro**" | ❌ lacuna | Ignorado sim, registrado não (Lacuna 1) |
| **§9** — "evento sem `id`/malformado não altera o saldo" | ⚠️ parcial | Não altera; falta o registro e o tratamento como valor na origem (Lacunas 1 e 2) |
| **§9 Cross-PRD** — "o evento que dispara o drop também dispara o crédito, com o mesmo `id`, sem duplicação" | ✅ coberto | Um único evento, um único RPC, uma única linha de `reward_ledger` |

### As lacunas residuais que esta spec entrega

1. **O caminho de crédito de estrelas é mudo.** `apps/web/src/lib/reward/apply-victory-reward.ts`
   não emite **nenhuma** linha de log, enquanto `apps/web/src/lib/reward/register-card-reward.ts`
   — o irmão que trata o lado *carta* do mesmo evento — instrumenta todos os ramos
   (`reward_event_malformed`, `reward_apply_started`, `reward_apply_finished`,
   `reward_apply_failed`) via `apps/web/src/lib/logging.ts`. O PRD `password` F02 é o único dos
   dois PRDs que exige explicitamente o **registro** ("registrando…", "registra inconsistência"),
   e é por isso que a lacuna sobreviveu a `free-duel/F07`: o PRD `free-duel` F07 pedia só as
   mensagens de UI, que estão lá.
2. **A origem do evento lança em vez de devolver valor.** `grant-victory-reward.ts` monta o
   evento com `VictoryRewardEventSchema.parse(...)`. Se o Rating Engine devolver uma nota com
   `stars` inválido, `parse` **lança** — a exceção escapa de `grantVictoryReward`, é engolida pelo
   `.catch` genérico de `use-victory-reward.ts` e vira "não foi possível creditar", sem registro
   e sem código de erro. Contraria "failures travel as values" (`CLAUDE.md`, guidelines §8.1) e
   o EH3 do PRD.
3. **A leitura da fila local pode derrubar o crédito inteiro.** `applyVictoryReward` faz
   `await deps.victoryRewardQueue.listPendingRewards(playerId)` sem guarda; com IndexedDB
   indisponível (aba privada, quota), a promessa rejeita **antes** da chamada ao servidor e um
   crédito que teria funcionado online é perdido. `password/F01` já adotou a política oposta
   ("falha de IndexedDB é tratada como fila vazia") para a leitura de saldo — F02 alinha o
   caminho de escrita à mesma política.
4. **A fila offline nunca drena.** `apps/web/src/hooks/use-victory-reward-sync.ts` existe,
   está testado, e **não tem nenhum consumidor** no repositório. Enquanto ninguém o montar, o
   EH1 ("enfileira sincronização") entrega a primeira metade e nunca a segunda: as estrelas
   ficam só no cache local, e a reconciliação de `password/F01` as mantém como "pendentes" para
   sempre.
5. **O descarte silencioso na sincronização.** `syncVictoryRewardQueue` remove da fila, sem
   registro algum, itens cuja carta o catálogo não reconhece mais ou cujo `stars` é inválido —
   uma perda de crédito do jogador que hoje não deixa rastro. É exatamente a "inconsistência"
   que o EH3 manda registrar.
6. **`N` não está travado contra hard-coding.** Nenhum teste garante que o valor creditado é
   exatamente `rating.reward.stars`; nada impediria uma futura constante local de virar a fonte
   do `N`, criando o "valor de balanceamento" que o PRD proíbe de inventar.

### Incluído

- Adoção formal do handler `onVictory` unificado (`apply_victory_reward` + `applyVictoryReward`
  + `grantVictoryReward`) como a implementação de `password` F02, com a rastreabilidade acima
- Instrumentação estruturada de todo o caminho de crédito de estrelas, cobrindo os três ramos
  que o Error Handling do PRD manda registrar (duplicado, malformado, falha de persistência)
- Conversão da montagem do evento na origem para `Result` — nenhuma exceção atravessa a
  fronteira de crédito
- Degradação segura da leitura da fila local: IndexedDB indisponível não impede o crédito online
- Registro de descarte na drenagem da fila, e montagem de `useVictoryRewardSync` num
  composition root real, para que o crédito enfileirado efetivamente chegue ao servidor
- Trava por propriedade de que o valor creditado é sempre e apenas o `N` injetado pelo
  resultado do duelo

### Adiado

O PRD não divide F02 em `Core Scope` / `Full Scope additions`; o escopo desta spec é a feature
completa.

### Fronteiras

- **Qual carta é dropada e a tabela de drops** são do módulo de duelo (PRD §7, "Seleção da carta
  de drop"): `selectDropCardNumber` (`packages/rules`, `free-duel/F06`) e as tabelas de
  `banco-de-cartas/F08`. F02 recebe o `cardNumber` pronto e nunca o escolhe.
- **A nota do duelo e o valor de `N`** são `free-duel/F05` (Rating Engine). F02 **transporta**
  `rating.reward.stars`; não calcula, não arredonda, não aplica piso nem teto.
- **A tela de vitória** é do módulo de duelo (PRD §7, "Interface e apresentação"). F02 fornece
  o `VictoryRewardResult` que `StarsRewardBadge` renderiza; não desenha a tela.
- **Manter o saldo, exibi-lo e reconciliá-lo** é F01 (spec já escrita). F02 credita e devolve o
  saldo pós-crédito; não lê carteira nem mantém estado de UI de saldo.
- **Debitar estrelas** é F04. F02 é fonte, nunca sumidouro.
- **Derrota e empate** não são tratados aqui (Capability explícita do PRD).
- **Migrações e RLS de `wallets`/`reward_ledger`/`collections`** já existem (`0005`, `0008`);
  esta spec **não** cria nem edita migração alguma.

### Contratos externos assumidos

| Dependência | Onde está / estado | O que F02 espera |
|---|---|---|
| **Free Duel (cross-PRD)** — evento de vitória | `apps/web/src/lib/free-duel/grant-victory-reward.ts`, chamado via a prop `grantVictoryReward` de `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.tsx` | Um `ConsolidatedDuelResult` com `status: "victory"`, `duelSessionId` não vazio e `rating.reward.stars` inteiro `≥ 0` |
| **Online Duel (cross-PRD)** — **não existe** (`apps/server` não foi criado) | — | Deve chamar `applyVictoryReward(event, deps)` com o mesmo `VictoryRewardEvent`, usando o `id` de duelo do servidor como `duelId`. `event` é `unknown` e validado na fronteira, então um chamador novo não precisa de nenhuma mudança neste módulo |
| **Campanha (cross-PRD)** — **não existe** (sem código, PRD sem spec) | — | Mesmo contrato do Online Duel |
| **`BuildDeck/F03` (cross-PRD)** — sink de coleção | `apply_card_reward` (`0005`) e `registerCardReward` | Continuam existindo para o caso "só carta"; o caminho de vitória usa o RPC unificado `apply_victory_reward`, que escreve a **mesma** `collections` e a **mesma** linha de `reward_ledger` |
| **`free-duel/F05`** — Rating Engine | `resolveDuelResult` (`apps/web/src/lib/free-duel/resolve-duel-result.ts`) — implementado, **sem provedor de produção**: nem `ratingEngine` nem `minimumReward` são compostos por nenhuma página | Fornece `rating.reward.stars` = o `N` de F02 |
| **`motor-duelo-1x1` F06–F11** — máquina de turnos | **não existe** (`CLAUDE.md`: "não há duelo jogável") | Enquanto não existir, nenhum duelo termina em vitória: `page.tsx` do duelo não passa a prop `grantVictoryReward`, e a cadeia inteira é inalcançável em produção. F02 é verificável por teste, não por jogo (Decisão 6) |
| **`password/F01`** — carteira | spec escrita, implementação pendente | F02 escreve em `wallets` **apenas** via `apply_victory_reward`; F01 lê e reconcilia |

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|---|---|---|
| 1 | **`password` F02 é satisfeita pelo handler `onVictory` unificado de `free-duel/F07`.** A carteira é única, o evento é único, a linha de `reward_ledger` é única e a transação é única. Esta spec adota e documenta; não reimplementa nem cria um segundo caminho de crédito. O item de `arquitetura.md` §10 ("unificar carteira e handler `onVictory` entre `free-duel` e `password`") é considerado **resolvido no código**. | `arquitetura.md` §5.3 e §10; ADR-006 §4/§6; `migrations/0008`; spec `password/F01` Decisão 1; auto-aceite: "Pendência de decisão em aberto do §10 / ADR `needs-input`" | confirmada |
| 2 | **ADR-006 continua "Proposto".** Suas três entradas pendentes (confirmar carteira não duplicada; definir saldo inicial, `N` por vitória e a tabela nota→recompensa; definir confirmação para liberações caras) não são fechadas por esta spec. A premissa que F02 assume é a primeira delas — carteira e handler únicos — e ela fica **marcada para confirmação**. | ADR-006 `[PRECISA DE ENTRADA]`; auto-aceite: "adotar a recomendação já registrada em `arquitetura.md`… marcar como premissa a confirmar" | a confirmar |
| 3 | **Reconciliação das duas leituras de `N`.** O PRD `password` F02 diz "`N` é valor de balanceamento tunável… pode ser um valor fixo por vitória na versão base"; `free-duel` F05/F07 dizem que `N` vem da tabela nota→recompensa. As duas leituras são **compatíveis** e resolvidas a favor de `free-duel`: `N` é sempre `rating.reward.stars`, e o "valor fixo por vitória" do PRD `password` é o **caso degenerado** dessa mesma injeção — o ramo `minimum_fallback` de `ConsolidatedRating`, que já entrega um valor único independente da nota quando o Rating Engine não responde. Não há dois números, há um ponto de injeção. | PRD `password` §6 F02 C1; PRD `free-duel` §6 F07; `packages/shared/src/duel/result.ts`; auto-aceite: "Especificação parcial no PRD" | confirmada |
| 4 | **`N` permanece pendência de balanceamento e nenhum valor é inventado.** Não existe hoje provedor de produção nem para `ratingEngine` nem para `minimumReward` — `resolveDuelResult` só é exercitado por testes. Esta spec **não** cria constante, default nem literal de `N` em lugar algum; entrega no lugar disso uma **propriedade** que prova que o valor creditado é exatamente o injetado, qualquer que ele seja. É o análogo, para F02, do que `INITIAL_WALLET_STARS` fez em F01 — com a diferença de que o PRD sugeriu `0⭐` para o saldo inicial e **não sugeriu nada** para `N`. | `arquitetura.md` §10 ("Balanceamento: … `N` estrelas/vitória"); Fase 0.4 do skill; auto-aceite: "Tabela de dado externo pendente" | pendente — aguarda balanceamento |
| 5 | **Registro é log estruturado, não linha de banco.** O PRD manda "registrar" o evento duplicado e a inconsistência; a spec resolve isso com `apps/web/src/lib/logging.ts` (o único sink sancionado do repositório, guidelines §23.2/§23.3), com a **mesma taxonomia de eventos** que `register-card-reward.ts` já usa para o lado carta. A alternativa — uma tabela de auditoria — seria um recurso novo que o PRD não pede, e `reward_ledger` já é o registro persistente das aplicações efetivas. As mensagens do PRD ("Recompensa de estrelas já aplicada.") são **textos de diagnóstico**, não strings de UI: a UI correspondente já existe e é `STARS_REWARD_ALREADY_APPLIED_MESSAGE`. | PRD §6 F02 Error Handling; guidelines §23; `register-card-reward.ts`; auto-aceite: "Especificação parcial no PRD" | confirmada |
| 6 | **F02 é verificável por teste, não por jogo.** A cadeia `duel-screen → grantVictoryReward → applyVictoryReward → apply_victory_reward` está completa mas **inalcançável em produção**: `page.tsx` do duelo não injeta `grantVictoryReward`, e nenhum duelo pode terminar em vitória enquanto `motor-duelo-1x1` F06–F11 não existirem. Esta spec **não** faz essa fiação — ela pertence a `free-duel/F03` (orquestração) e depende do motor. O que F02 entrega é o handler correto e coberto; o critério de aceite "vencer um duelo credita `+N`" é validado por teste de integração do handler, com a fiação registrada como contrato externo. | `CLAUDE.md` ("não há duelo jogável"); leitura de `apps/web/src/app/free-duel/[duelistId]/duel/page.tsx`; auto-aceite: "Dependência cross-PRD inexistente" | confirmada |
| 7 | **`useVictoryRewardSync` é montado em `BuildDeckClient`.** É o único composition root cliente do repositório que já possui um `CardCatalogLookup` (via `buildCatalogLookup` sobre as cartas que `page.tsx` carrega do disco) e que já hospeda um sincronizador de fila do mesmo tipo (`useActiveDeckSync`, `build-deck/F07`). O `RootLayout` é Server Component e um provider global de catálogo arrastaria as 722 cartas para toda rota — custo desproporcional. Quando `/password` existir (F03/F04), ela deve montar o mesmo hook, pelo mesmo motivo pelo qual o monta aqui: é a tela em que o jogador vai *gastar* o que ganhou. | precedente `build-deck-client.tsx`; `CLAUDE.md` (fronteira servidor/cliente); auto-aceite: "Padrões conflitantes no código → o mais frequente" | confirmada |
| 8 | **Falha de IndexedDB degrada para "fila vazia", nunca para "crédito perdido".** A consulta local é apenas uma otimização de deduplicação; a idempotência **real** é o `duel_id` PK no Postgres. Portanto, se a leitura da fila falhar, o caminho correto é seguir para o servidor, não abortar. Mesma política que `password/F01` já adotou na leitura de saldo (Seção 3, passo 3 daquela spec). | spec `password/F01` §3; `migrations/0005`; guidelines §8.1 | confirmada |
| 9 | **Nenhuma migração nova.** `0005` e `0008` já entregam tabela, RPC, RLS e grants desta feature; migrações aplicadas não são editadas (guidelines §22.3, precedente de `0006` corrigindo `0005` por migração nova). Toda a lacuna de F02 é de `apps/web`. | `TypeScript-development-guidelines.md` §22.3 | confirmada |
| 10 | **Nenhum contrato de `packages/shared` ou `packages/rules` muda.** `VictoryRewardEvent`, `VictoryRewardResult`, `PendingVictoryReward`, `ApplyVictoryRewardResponseSchema` e `validateVictoryRewardStars` já têm a forma necessária; o delta é inteiramente de observabilidade e de robustez na fronteira de I/O, que por definição vive em `apps/web`. | leitura de `packages/shared/src/economy/*`, `packages/rules/src/economy/*` | confirmada |
| 11 | Identificadores, comentários e nomes de evento de log em inglês; mensagens de UI em Português — convenção do `CLAUDE.md`, seguida por todas as features anteriores. | `CLAUDE.md` | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---|---|---|---|
| `apps/web/src/lib/reward/apply-victory-reward.ts` | web | alterado | Instrumenta os cinco ramos do crédito (malformado, carta inválida, `stars` inválido, duplicado local, resultado do servidor, fallback offline, indisponível) e torna a leitura da fila tolerante a falha (Lacunas 1 e 3) |
| `apps/web/src/lib/reward/apply-victory-reward.test.ts` | web | alterado | Acrescenta os casos de registro, de evento sem `duelId` e de fila indisponível aos três já existentes |
| `apps/web/src/lib/reward/apply-victory-reward.properties.test.ts` | web | alterado | Acrescenta a propriedade "credita exatamente o `N` recebido" e a de totalidade |
| `apps/web/src/lib/free-duel/grant-victory-reward.ts` | web | alterado | Troca a montagem do evento por validação como valor (`Result`), registrando a inconsistência em vez de lançar (Lacuna 2) |
| `apps/web/src/lib/free-duel/grant-victory-reward.test.ts` | web | alterado | Acrescenta os casos de nota malformada e de repasse exato de `stars` |
| `apps/web/src/lib/reward/sync-victory-reward-queue.ts` | web | alterado | Registra a drenagem e, em especial, o **descarte** de um item inválido — hoje silencioso (Lacuna 5) |
| `apps/web/src/lib/reward/sync-victory-reward-queue.test.ts` | web | alterado | Acrescenta os casos de descarte registrado e de fila indisponível |
| `apps/web/src/app/build-deck/build-deck-client.tsx` | web | alterado | Monta `useVictoryRewardSync` com o catálogo que a tela já possui, ao lado do `useActiveDeckSync` existente (Lacuna 4, Decisão 7) |
| `apps/web/src/app/build-deck/build-deck-client.test.tsx` | web | alterado | Verifica que a sincronização de crédito de vitória é montada com o catálogo da página |
| `apps/web/tests/victory-star-credit.contract.test.ts` | web | novo | Análise estática: o único escritor de `wallets` no caminho de vitória é `apply_victory_reward`; nenhum literal numérico de recompensa no caminho de crédito; `lib/reward/**` não importa `lib/free-duel/**` |
| `apps/web/tests/victory-star-credit.integration.test.ts` | web | novo | Crédito ponta a ponta do handler: vitória → carta + estrelas na mesma transação → reprocessamento não duplica; offline → fila → drenagem |

**Nenhum arquivo novo em `packages/`** e **nenhuma migração nova** (Decisões 9 e 10).

**Verificação da direção de dependências** (`shared ← data ← rules ← engine ← ai`, com `web` no
topo):

- `apps/web/src/lib/reward/**` importa `@yugioh/shared` (tipos e schemas zod) e `@yugioh/rules`
  (`validateRewardCardNumber`, `validateVictoryRewardStars`) — ambos abaixo de `web` no grafo.
  Não importa `@yugioh/engine` nem `@yugioh/ai`.
- `apps/web/src/lib/reward/**` continua **sem importar** `apps/web/src/lib/free-duel/**` — a
  dependência é sempre a inversa (`grant-victory-reward.ts` → `apply-victory-reward.ts`),
  invariante herdada da Decisão 2 de `free-duel/F07` e verificada na Seção 7.
- Nenhum arquivo desta feature importa `packages/engine`: F02 reage ao **resultado** do duelo,
  não ao motor. Por isso não há seção de PRNG/determinismo de duelo nesta spec.
- `packages/shared` e `packages/rules` não são alterados, portanto nenhuma aresta nova entra no
  grafo dos pacotes puros.
- `apps/web/src/app/build-deck/build-deck-client.tsx` é `"use client"` e só ganha um hook que já
  é `"use client"` e que não toca `lib/server/**` nem `node:fs` — a fronteira servidor/cliente do
  `CLAUDE.md` permanece intacta.

## 3. Design Técnico

### Estruturas de dados

Nenhuma estrutura nova. As que governam a feature já existem e ficam inalteradas:

**`VictoryRewardEvent`** (`packages/shared/src/economy/wallet.ts`) — o evento de vitória, a
fronteira cross-PRD:

| Campo | Tipo | Semântica |
|---|---|---|
| `playerId` | `string` não vazio | Dono da carteira e da coleção |
| `duelId` | `string` não vazio | **A chave de idempotência.** É `duelSessionId` no Free Duel; será o id de partida do servidor no Online Duel |
| `cardNumber` | `CardNumber` (`^[0-9]{3}$`) | A carta de drop já escolhida por `free-duel/F06` |
| `stars` | inteiro `≥ 0` | O `N` desta vitória, vindo de `rating.reward.stars` |

**`VictoryRewardResult`** — o que o handler devolve, e o que distingue os três desfechos que o
Error Handling do PRD trata:

```
| { status: "applied";         cardQuantity: number; walletStars: number }
| { status: "applied_offline"; localCardQuantity: number; localWalletStars: number }
| { status: "already_applied"; cardQuantity?: number; walletStars?: number }
```

`applied` vs. `already_applied` vem diretamente da coluna `applied` que o RPC devolve — o
servidor **já distingue** "creditei agora" de "já estava creditado", e é essa distinção que
alimenta tanto a mensagem de UI quanto o registro exigido pelo EH2.

**`PendingVictoryReward`** — o item da fila offline, chaveado por `duelId` no IndexedDB
(store `pendingVictoryRewards`), com `queuedAt` para ordenação estável.

### Fluxo — crédito de estrelas por vitória (handler `onVictory`)

Passos 1–3 são a origem (`grantVictoryReward`, `apps/web/src/lib/free-duel`); 4–12 são o handler
(`applyVictoryReward`, `apps/web/src/lib/reward`).

1. Um duelo termina com `status: "victory"`. O resultado consolidado já traz `duelSessionId` e
   `rating.reward.stars` (`free-duel/F05`).
2. A carta de drop é escolhida por `selectDropCardNumber` (`packages/rules`), semeado pelo
   próprio `duelSessionId` — determinístico, sem `Math.random()`.
3. O evento é montado e **validado como valor**: sucesso ⇒ segue; falha ⇒ registra
   `victory_reward_event_malformed` e devolve `err("malformed_victory_reward_event")` **sem
   nenhuma escrita** (EH3). *Alterado por esta spec: hoje esta validação lança.*
4. Um cache em memória por `duelSessionId` evita reprocessar a mesma vitória dentro da sessão
   (protege contra o duplo efeito do React em modo estrito).
5. `applyVictoryReward` revalida o evento com o mesmo schema — a fronteira não confia no tipo
   estático do chamador (guidelines §18.3), porque Online Duel e Campanha entrarão por aqui.
   Falha ⇒ registro + `err`, saldo intacto.
6. Valida `cardNumber` contra o catálogo e `stars` como inteiro `≥ 0` (`packages/rules`). Falha
   ⇒ registro + `err`, **antes** de qualquer I/O.
7. Consulta a fila local por um item com o mesmo `duelId`. Presente ⇒ registra
   `victory_reward_apply_finished` com `status: "already_applied"`, `source: "local_queue"`, e
   devolve sem chamar a rede (EH2). *Alterado: a leitura da fila passa a ser tolerante a falha —
   erro de IndexedDB é registrado e tratado como fila vazia, e o fluxo segue para o servidor
   (Decisão 8).*
8. Chama o RPC `apply_victory_reward(playerId, duelId, cardNumber, stars)`.
9. RPC devolveu `applied: true` ⇒ registra `victory_reward_apply_finished` com
   `status: "applied"` e devolve `{ status: "applied", cardQuantity, walletStars }`. A UI
   renderiza "+N estrelas" e o saldo (E1/E3).
10. RPC devolveu `applied: false` ⇒ **é o caso do EH2**: registra
    `victory_reward_apply_finished` com `status: "already_applied"`, reconcilia os caches local
    de coleção e de carteira com os valores autoritativos que o RPC devolveu, e devolve
    `already_applied`. Nenhum incremento acontece.
11. RPC falhou (rede/servidor) ⇒ aplica o crédito no cache local e enfileira o item, tudo numa
    única transação IndexedDB; registra `victory_reward_apply_failed` com
    `fallback: "applied_offline"`; devolve `applied_offline`, e a UI exibe "Estrelas creditadas
    localmente; sincronizando…" (EH1).
12. Também o caminho offline falhou (sem IndexedDB) ⇒ registra
    `victory_reward_apply_failed` com `stage: "offline_cache_unavailable"` e devolve
    `err("victory_reward_apply_unavailable")`. Nada foi creditado em lugar nenhum.

### Fluxo — drenagem da fila

13. `useVictoryRewardSync` é montado por um composition root cliente que possui o catálogo
    (`BuildDeckClient`, Decisão 7) e escuta o evento `online` da janela. *Alterado: hoje o hook
    não é montado em lugar nenhum.*
14. Ao reconectar, resolve a sessão; sem sessão, não roda e a fila permanece intacta.
15. Para cada item pendente, revalida carta e `stars`. Inválido ⇒ **registra a inconsistência**
    (`victory_reward_queue_item_discarded`, com `duelId` e o motivo) e remove da fila.
    *Alterado: hoje o descarte é silencioso.*
16. Válido ⇒ reaplica pelo mesmo RPC. Como a idempotência é do `duel_id`, reaplicar um item que
    o servidor já registrou devolve `applied: false` e não soma nada — é o mesmo caminho do
    passo 10.
17. Ao final, registra um sumário `victory_reward_queue_synced` com `applied`, `removed` e
    `remaining`, para que a divergência de saldo de F01 tenha rastro.

### Regras de negócio

- **Uma vitória credita exatamente uma vez**, e a garantia é o `duel_id` PK de `reward_ledger`
  com `insert ... on conflict do nothing` seguido de `if found` — o incremento de `wallets` e o
  de `collections` só acontecem dentro desse ramo (`0008`). A fila local é uma segunda camada de
  conveniência, nunca a garantia.
- **Carta e estrelas são indivisíveis:** uma única transação Postgres escreve `reward_ledger`,
  `collections` e `wallets`. Não existe caminho de rede que credite estrela sem carta
  (`arquitetura.md` §5.2, ADR-006 §4).
- **Nenhum valor de economia vem do cliente sem validação server-side:** o RPC é
  `SECURITY DEFINER`, exige `p_player_id = auth.uid()` e rejeita `p_stars < 0` (`0008`).
- **O saldo nunca fica negativo:** F02 só soma; `check (stars >= 0)` em `wallets` e
  `validateVictoryRewardStars` no cliente fecham o resto.
- **Derrota e empate não creditam:** garantido pelo tipo de entrada de `grantVictoryReward`.
- **`N` nunca é literal:** o valor creditado é sempre o campo `stars` do evento, que é sempre
  `rating.reward.stars`. Travado por propriedade (Seção 7) e por análise estática (Seção 7).
- **Registro obrigatório:** todo desfecho que não seja um crédito bem-sucedido produz uma linha
  de log estruturada com `duelId` e `playerId` (Decisão 5).

### Eventos

F02 não emite eventos do motor de duelo (`onSummon`, `onAttackDeclared`, …) — ela **consome** o
resultado consolidado depois que o duelo terminou. O único "evento" desta feature é o
`VictoryRewardEvent`, que atravessa a fronteira cross-PRD e é validado por zod nos dois lados.

### Determinismo e pureza

F02 não toca `packages/engine`, portanto não há PRNG semeado nem estado de duelo a declarar
aqui. O único ponto determinístico relevante é a seleção de carta (`selectDropCardNumber`,
`packages/rules`), que já é pura e semeada pelo `duelSessionId` — F02 a consome sem alterá-la.
Os módulos de `packages/rules` usados no caminho (`validateRewardCardNumber`,
`validateVictoryRewardStars`) são funções puras e totais que recebem o catálogo por injeção.

## 4. Contratos

### Tipos e schemas (`packages/shared`) — inalterados

`VictoryRewardEventSchema`, `PendingVictoryRewardSchema`, `ApplyVictoryRewardResponseSchema`,
`WalletBalanceSchema` e os tipos correspondentes permanecem **byte-idênticos** (Decisão 10).
Nenhum código de `DomainError` novo é introduzido: `malformed_victory_reward_event`,
`invalid_stars_amount`, `unknown_reward_card` e `victory_reward_apply_unavailable` já cobrem
todos os desfechos.

### Funções públicas alteradas

```ts
// apps/web/src/lib/free-duel/grant-victory-reward.ts
export async function grantVictoryReward(
  result: Extract<ConsolidatedDuelResult, { status: "victory" }>,
  context: GrantVictoryRewardContext,
  deps: GrantVictoryRewardDeps,
): Promise<Result<GrantedVictoryReward, DomainError>>;
  // ALTERADO: a montagem do evento passa a ser validada como valor.
  // pós: rating.reward.stars inválido ⇒ err('malformed_victory_reward_event'), registro emitido,
  //      NENHUMA escrita — antes desta spec, este ramo lançava
  //      seleção de carta falha        ⇒ err (inalterado)
  //      mesmo duelSessionId na sessão ⇒ devolve o resultado em cache, sem nova chamada
  //      sempre: nunca lança; o valor creditado é exatamente result.rating.reward.stars
```

```ts
// apps/web/src/lib/reward/apply-victory-reward.ts
export async function applyVictoryReward(
  event: unknown,                       // fronteira cross-PRD: `unknown` é deliberado
  deps: ApplyVictoryRewardDeps,
): Promise<Result<VictoryRewardResult, DomainError>>;
  // pós: evento sem duelId / malformado ⇒ err('malformed_victory_reward_event') + registro,
  //                                       nenhuma leitura e nenhuma escrita
  //      duelId já na fila local         ⇒ ok('already_applied') + registro, zero chamadas de rede
  //      fila local ilegível             ⇒ ALTERADO: registro + segue para o servidor (nunca aborta)
  //      RPC applied=true                ⇒ ok('applied', cardQuantity, walletStars) + registro
  //      RPC applied=false               ⇒ ok('already_applied', …) + registro, caches reconciliados
  //      RPC indisponível                ⇒ ok('applied_offline', …) + registro, item enfileirado
  //      RPC e IndexedDB indisponíveis   ⇒ err('victory_reward_apply_unavailable') + registro
  //      sempre: nunca lança; o saldo do servidor só muda no ramo applied=true
```

```ts
// apps/web/src/lib/reward/sync-victory-reward-queue.ts
export async function syncVictoryRewardQueue(
  deps: SyncVictoryRewardQueueDeps,
): Promise<{ applied: number; removed: number; remaining: number }>;
  // ALTERADO: cada descarte de item inválido emite um registro de inconsistência com o duelId
  //           e o motivo; o retorno agregado é registrado como sumário ao final
```

### Taxonomia de registro (`apps/web/src/lib/logging.ts`)

Espelha a de `register-card-reward.ts`, trocando o prefixo `reward_` por `victory_reward_` para
que o lado *estrelas* seja filtrável separadamente do lado *carta*:

| Evento | Nível | Campos | Item do PRD |
|---|---|---|---|
| `victory_reward_event_malformed` | `warn` | `issues` | EH3 — "registra inconsistência" |
| `victory_reward_apply_started` | `debug` | `playerId`, `duelId` | diagnóstico |
| `victory_reward_apply_finished` | `info` | `playerId`, `duelId`, `status` (`applied` \| `already_applied`), `source?` (`local_queue`) | EH2 — "registrando 'Recompensa de estrelas já aplicada.'" |
| `victory_reward_apply_failed` | `warn` | `playerId`, `duelId`, `cause`, `fallback?` \| `stage?` | EH1 — falha ao persistir |
| `victory_reward_queue_unavailable` | `warn` | `playerId`, `cause` | Lacuna 3 — fila ilegível, tratada como vazia |
| `victory_reward_queue_item_discarded` | `warn` | `playerId`, `duelId`, `code` | Lacuna 5 — descarte silencioso |
| `victory_reward_queue_synced` | `info` | `playerId`, `applied`, `removed`, `remaining` | EH1 — segunda metade |

Nenhum campo de log carrega dado sensível: só identificadores e códigos.

### RPC `apply_victory_reward` (existente, `0008`) — inalterado

```
apply_victory_reward(p_player_id uuid, p_duel_id text, p_card_numero text, p_stars integer)
  returns table (applied boolean, card_quantity integer, wallet_stars integer)
```

Entrada enviada pelo adaptador (`victory-reward-repository.ts`):

```json
{
  "p_player_id": "5f2c1a80-3c7f-4a1e-9f2b-8d3a6c4e1b09",
  "p_duel_id": "9c4f1e2a-77b1-4a02-8f31-2c6d5b0a7e44",
  "p_card_numero": "001",
  "p_stars": 11
}
```

Resposta no crédito efetivo, e no reprocessamento do **mesmo** `p_duel_id`:

```json
{ "applied": true,  "card_quantity": 2, "wallet_stars": 1251 }
```
```json
{ "applied": false, "card_quantity": 2, "wallet_stars": 1251 }
```

`11`, `2` e `1251` são ilustrativos da **forma** — `p_stars` é sempre o `N` injetado pelo
resultado do duelo, nunca um valor desta spec (Decisão 4).

### Contratos externos (cross-PRD)

- **Online Duel** (a ser fornecido por `apps/server` / PRD `online-duel`): deve chamar
  `applyVictoryReward` com um `VictoryRewardEvent` cujo `duelId` seja o identificador
  autoritativo da partida no servidor. Como `event` é `unknown` e revalidado, nenhuma mudança
  neste módulo é necessária para acomodá-lo. O crédito continua sendo server-side e idempotente,
  o que é o requisito de `arquitetura.md` §6.
- **Campanha** (a ser fornecido pelo PRD `campanha`, ainda inexistente): mesmo contrato.
- **`free-duel/F03` — orquestração**: quando a máquina de turnos existir, deve injetar
  `grantVictoryReward` na prop homônima de `DuelScreen`, com o `dropPool` do duelista e o
  `playerId` da sessão. F02 **não** faz essa fiação (Decisão 6).
- **`free-duel/F05` — Rating Engine**: deve fornecer `ratingEngine` e a política `minimumReward`
  a `resolveDuelResult`. Enquanto não fornecer, `N` não tem valor de produção — é a pendência de
  balanceamento da Decisão 4.
- **`password/F01`**: consome o efeito deste crédito por `loadWalletBalance` e pela
  reconciliação com `reward_ledger`; F02 não chama F01, nem o inverso.
- **`password/F04`**: debita a **mesma linha** de `wallets` numa RPC transacional própria; a
  serialização por conta entre um crédito de F02 e um débito de F04 é o bloqueio de linha na PK
  `player_id` (spec `password/F01`, Decisão 6).

## 5. Modelo de Dados

### Postgres / Supabase — nenhuma migração nova (Decisão 9)

As duas tabelas que F02 usa já existem e permanecem exatamente como estão:

| Tabela | Colunas | Tipo | Constraints / Índices | Migração |
|---|---|---|---|---|
| `reward_ledger` | `duel_id` | `text` | **PK** — a chave de idempotência de F02 | `0005` |
| | `player_id` | `uuid` | `not null references auth.users(id) on delete cascade` | `0005` |
| | `card_numero` | `text` | `not null check (card_numero ~ '^[0-9]{3}$')` | `0005` |
| | `stars` | `integer` | `not null default 0 check (stars >= 0)` — escrita por `apply_victory_reward` | `0005` |
| | `applied_at` | `timestamptz` | `not null default now()` | `0005` |
| `wallets` | `player_id` | `uuid` | **PK** `references auth.users(id) on delete cascade` | `0008` |
| | `stars` | `integer` | `not null default 0 check (stars >= 0)` | `0008` |
| | `updated_at` | `timestamptz` | `not null default now()` | `0008` |

`collections` (`0001`) é escrita pelo mesmo RPC, e é o sink de `BuildDeck/F03` — F02 não cria
coleção paralela (PRD §7, ADR-006 §6).

**RLS:** ligada nas três tabelas, com política `select`-própria apenas
(`reward_ledger_select_own`, `wallets_select_own`). **Nenhuma política de escrita existe**: o
único escritor é o RPC `SECURITY DEFINER`, e sem política um `insert`/`update` direto do cliente
não tem como ser satisfeito. Os `GRANT` explícitos existem em `0005` e `0008` — obrigatórios
porque o schema `public` deste projeto não tem privilégios default (`CLAUDE.md`).

**Atomicidade e idempotência:** `apply_victory_reward` insere `reward_ledger` com
`on conflict (duel_id) do nothing` e só incrementa `collections` e `wallets` quando o insert de
fato ocorreu (`if found`) — uma transação, uma chave de idempotência, dois efeitos. Duas
chamadas concorrentes para o mesmo `duel_id` (dois dispositivos, ou um retry da fila) resolvem
para exatamente uma aplicando e as demais lendo de volta os valores atuais. `p_stars < 0` é
rejeitado e `p_player_id <> auth.uid()` levanta exceção: nenhum valor sensível vem do cliente
sem verificação (`arquitetura.md` §5.2, ADR-006 §4/§6).

### Cache local / fila offline

`DATABASE_VERSION` **não sobe** — nenhuma object store nova. As duas stores usadas foram criadas
por `free-duel/F07`:

| Store | Chave | Registro | Uso em F02 |
|---|---|---|---|
| `pendingVictoryRewards` | `duelId` | `PendingVictoryReward` (`playerId`, `cardNumber`, `stars`, `queuedAt`) | O `duelId` como chave torna a fila naturalmente deduplicada; é a `idempotencyKey` que `arquitetura.md` §5.4 pede |
| `walletBalance` | `playerId` | `{ playerId, stars, syncedAt }` | Snapshot do saldo após um crédito offline; lido e reconciliado por `password/F01` |

**Política de sync:** crédito é sempre seguro offline (`arquitetura.md` §5.4 — "créditos offline
são seguros: enfileira e sobe idempotente"). A escrita local de coleção, carteira e fila acontece
numa **única transação IndexedDB** (`apply-offline-victory-reward.ts`), de modo que não existe
estado local em que a estrela apareça sem a carta. A subida é disparada pelo evento `online` da
janela e é idempotente pelo mesmo `duel_id`.

### Arquivos de dados versionados

F02 não lê nem escreve o bundle de cartas além da consulta de existência do `cardNumber` pelo
`CardCatalogLookup` injetado. Nenhum valor das tabelas pendentes (guardiões, terrenos, fusões,
drops, rating) é lido ou inventado aqui.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| **EH3** — evento sem `duelId`, sem `playerId` ou com campo extra | `VictoryRewardEventSchema.safeParse` falha, antes de qualquer I/O | Registra `victory_reward_event_malformed`; devolve `err("malformed_victory_reward_event")`. **Saldo e coleção intocados** | "Não foi possível creditar suas estrelas agora. Tente novamente mais tarde." (`STARS_REWARD_UNAVAILABLE_MESSAGE`) |
| **EH3 (origem)** — nota do duelo com `stars` negativo/não inteiro | Validação na montagem do evento em `grantVictoryReward` | *Alterado:* registra e devolve `err` em vez de **lançar**; nenhuma escrita | idem |
| **EH2** — mesmo `duelId` já aplicado no servidor | RPC devolve `applied: false` | Registra `victory_reward_apply_finished` com `status: "already_applied"`; reconcilia os caches com os valores autoritativos; **não soma** | "Estrelas já creditadas." (`STARS_REWARD_ALREADY_APPLIED_MESSAGE`) |
| **EH2 (local)** — `duelId` já na fila offline | `listPendingRewards` contém o item | Registra com `source: "local_queue"`; devolve `already_applied` sem tocar a rede | idem |
| **EH1** — RPC indisponível (rede/servidor) | `victoryRewardRepository.apply` devolve `err` | Aplica coleção + carteira + fila numa transação IndexedDB; registra `victory_reward_apply_failed` com `fallback: "applied_offline"` | "Estrelas creditadas localmente; sincronizando…" (`STARS_REWARD_OFFLINE_MESSAGE`) |
| RPC e IndexedDB indisponíveis | O bloco offline lança | Registra com `stage: "offline_cache_unavailable"`; devolve `err("victory_reward_apply_unavailable")`. Nada creditado em lugar algum | "Não foi possível creditar suas estrelas agora. Tente novamente mais tarde." |
| **Lacuna 3** — fila local ilegível (aba privada, quota) na **leitura** | `listPendingRewards` rejeita | *Alterado:* registra `victory_reward_queue_unavailable` e **trata como fila vazia**, seguindo para o servidor. A idempotência real continua sendo o `duel_id` PK (Decisão 8) | nenhuma — transparente |
| `cardNumber` desconhecido pelo catálogo | `validateRewardCardNumber` | `err("unknown_reward_card")` **antes** de qualquer I/O — um número inválido nunca alcança `reward_ledger` nem `collections` | "Não foi possível creditar suas estrelas agora…" |
| Sessão expirada no momento do crédito | O RPC levanta `permission denied` (`p_player_id <> auth.uid()`) | Adaptador converte em `err`; o fluxo cai no caminho offline (EH1), e a fila sobe quando a sessão voltar | "Estrelas creditadas localmente; sincronizando…" |
| Sessão expirada no momento da **drenagem** | `getAuthenticatedPlayerId` devolve `undefined` | O hook não roda; a fila permanece **intacta** — nenhum item é descartado por falta de sessão | "Faça login novamente para sincronizar suas estrelas." (a exibir por F01/F03) |
| **Lacuna 5** — item da fila cuja carta o catálogo não reconhece mais | Revalidação em `syncVictoryRewardQueue` | *Alterado:* registra `victory_reward_queue_item_discarded` com `duelId` e código antes de remover — hoje o descarte é silencioso | nenhuma |
| Reprocessamento da fila de um item que o servidor já aplicou | RPC devolve `applied: false` | Item removido da fila, `applied` não incrementa; o saldo não muda. É o que faz `effectiveStars` de F01 convergir | nenhuma |
| Duas vitórias concorrentes na mesma conta (dois dispositivos) | Bloqueio de linha na PK de `wallets` dentro da transação | As transações serializam; nenhum incremento perdido | nenhuma |
| Mesma vitória processada duas vezes na mesma sessão (efeito duplo do React) | Cache em memória por `duelSessionId` em `grantVictoryReward` | Devolve o resultado já obtido, sem segunda chamada de rede | nenhuma |
| Duelo termina em derrota ou empate | Tipo de entrada de `grantVictoryReward` | Inalcançável por construção — não há crédito | nenhuma |
| `N` ainda sem valor de balanceamento | `minimumReward` sem provedor de produção | O crédito repassa qualquer inteiro `≥ 0` injetado; **nenhum default é inventado** (Decisão 4) | nenhuma |
| **Lacuna 4** — fila nunca drenada | `useVictoryRewardSync` sem consumidor | *Alterado:* montado em `BuildDeckClient` (Decisão 7). Sem isso, as estrelas offline ficariam pendentes indefinidamente e o `effectiveStars` de F01 divergiria para sempre do servidor | nenhuma |

## 7. Estratégia de Testes

### Unitários (Vitest)

`applyVictoryReward` (`apps/web/src/lib/reward`, dependências falsas, `log` espionado):

- `applyVictoryReward rejects an event without a duelId before any repository or queue call`
- `applyVictoryReward logs victory_reward_event_malformed for a malformed event`
- `applyVictoryReward leaves the wallet untouched when the event is malformed`
- `applyVictoryReward logs victory_reward_apply_finished with status applied on a fresh credit`
- `applyVictoryReward logs already_applied with source local_queue when the duelId is queued`
- `applyVictoryReward logs already_applied when the rpc reports applied false`
- `applyVictoryReward reconciles the wallet cache with the authoritative balance on already_applied`
- `applyVictoryReward logs victory_reward_queue_unavailable and still calls the rpc when the queue read rejects`
- `applyVictoryReward logs victory_reward_apply_failed with fallback applied_offline when the rpc fails`
- `applyVictoryReward logs stage offline_cache_unavailable when both the rpc and IndexedDB fail`
- `applyVictoryReward never throws for any of the failure branches`

`grantVictoryReward` (`apps/web/src/lib/free-duel`):

- `grantVictoryReward returns malformed_victory_reward_event instead of throwing on invalid rating stars`
- `grantVictoryReward logs the inconsistency and performs no write when the rating is invalid`
- `grantVictoryReward forwards rating.reward.stars unchanged to the repository`
- `grantVictoryReward uses duelSessionId as the idempotency key`
- `grantVictoryReward returns the cached grant for a repeated duelSessionId without a second rpc call`

`syncVictoryRewardQueue` (`apps/web/src/lib/reward`):

- `syncVictoryRewardQueue logs victory_reward_queue_item_discarded before removing an unrecognised card`
- `syncVictoryRewardQueue logs the discard reason for an item with invalid stars`
- `syncVictoryRewardQueue logs a victory_reward_queue_synced summary with applied, removed and remaining`
- `syncVictoryRewardQueue keeps an item queued when the rpc is still unavailable`
- `syncVictoryRewardQueue does not credit twice for an item the server already applied`

`BuildDeckClient` (`apps/web/src/app/build-deck`, `// @vitest-environment jsdom`):

- `BuildDeckClient mounts the victory reward sync with the catalog it already resolved`
- `BuildDeckClient does not mount the victory reward sync when the catalog failed to load`

### Property-based (fast-check)

- **O crédito é exatamente o `N` injetado.** Para qualquer inteiro `stars` em `[0, 1_000_000]` e
  qualquer `duelSessionId`, o valor que chega ao repositório é **idêntico** a
  `rating.reward.stars` — nenhuma transformação, nenhum piso, nenhum teto, nenhum default. É a
  trava que impede um valor de balanceamento de ser inventado no código (Decisão 4).
  1.000 execuções.
- **Idempotência por `duelId`.** Para qualquer sequência de 1 a 20 chamadas com o **mesmo**
  `duelId` contra um repositório falso que simula `reward_ledger`, o saldo final soma `stars`
  exatamente uma vez e a quantidade da carta sobe exatamente `1`. 1.000 execuções.
- **Carta e estrela não se separam.** Para qualquer sequência de eventos com `duelId` distintos,
  o número de incrementos de `wallets` é sempre igual ao número de incrementos de `collections`
  — nunca existe estrela sem carta nem carta sem estrela. 1.000 execuções.
- **Totalidade.** Para qualquer entrada arbitrária (incluindo `null`, `undefined`, objetos com
  campos extras, `stars` `NaN`/`Infinity`/negativo, `duelId` vazio) e qualquer combinação de
  dependências que rejeitam, `applyVictoryReward` e `grantVictoryReward` **sempre** devolvem um
  `Result` e **nunca** lançam. 1.000 execuções.
- **Monotonicidade do saldo.** Nenhum caminho de F02 produz um saldo menor que o anterior: o
  crédito é sempre `+stars` com `stars ≥ 0`. 1.000 execuções.

### Integração

`apps/web/tests/victory-star-credit.integration.test.ts` (handler completo com adaptadores
falsos, sem rede):

- `a victory credits the card and the stars in the same call and reports both values`
- `reprocessing the same duelId credits neither the card nor the stars a second time`
- `an offline victory writes collection, wallet and queue together and reports applied_offline`
- `draining the queue after reconnect applies the credit exactly once on the server`
- `draining the queue twice does not credit twice`

Testes de RPC contra o Supabase local (`pnpm test:integration`,
`describe.skipIf(!hasSupabaseEnv)` — exportar `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` antes de confiar no verde, conforme `CLAUDE.md`):

- `apply_victory_reward inserts one reward_ledger row and increments both collections and wallets`
- `apply_victory_reward returns applied false and changes nothing on the second call with the same duel_id`
- `apply_victory_reward rejects a negative p_stars`
- `apply_victory_reward rejects a p_player_id different from auth.uid()`
- `two concurrent apply_victory_reward calls for the same duel_id credit the wallet exactly once`
- `a failed apply_victory_reward leaves no partial state in reward_ledger, collections or wallets`

### Análise estática

`apps/web/tests/victory-star-credit.contract.test.ts` e verificação de imports:

- `the victory credit path contains no numeric star literal` — nenhum número de recompensa
  hard-coded em `lib/reward/apply-victory-reward.ts` nem em `lib/free-duel/grant-victory-reward.ts`;
  o `N` só pode vir do evento (Decisão 4).
- `apply_victory_reward is the only writer of wallets in the victory path` — nenhum
  `insert`/`update` direto em `wallets` fora do RPC; complementa a trava de fonte única de
  `password/F01`.
- `lib/reward/** does not import lib/free-duel/**` — invariante herdada de `free-duel/F07`
  (Decisão 2 daquela spec): o handler de economia não conhece o módulo de duelo, o que é o que
  permite Online Duel e Campanha entrarem pelo mesmo ponto.
- `lib/reward/**` não importa `packages/engine`, `packages/ai`, `node:*` nem `lib/server/**`.
- Migrações `0001`–`0008` permanecem byte-idênticas; nenhuma migração é adicionada.
- `packages/shared/src/economy/**` e `packages/rules/src/economy/**` permanecem inalterados.
- Verificado por leitura de imports, **não** por confiar no `dependency-cruiser`, que hoje não
  resolve imports de workspace (`CLAUDE.md`).
- `pnpm lint` e `pnpm typecheck` passam sem novos avisos.

### Testes de aceitação (critérios do PRD §9, F02)

| Critério | Teste |
|---|---|
| Vencer um duelo credita `+N` estrelas ao saldo, **além** da carta de drop concedida por `BuildDeck/F03` (as duas recompensas coexistem) | `a victory credits the card and the stars in the same call and reports both values` + `apply_victory_reward inserts one reward_ledger row and increments both collections and wallets` + propriedade "carta e estrela não se separam". A fiação até um duelo real é contrato externo (Decisão 6) |
| Cada evento de vitória credita estrelas **exatamente uma vez** (idempotência pelo `id` do duelo); reprocessar não duplica | Propriedade de idempotência por `duelId` + `reprocessing the same duelId credits neither the card nor the stars a second time` + `two concurrent apply_victory_reward calls for the same duel_id credit the wallet exactly once` |
| Evento duplicado é ignorado sem creditar de novo, **com registro** | `applyVictoryReward logs already_applied when the rpc reports applied false` + `applyVictoryReward logs already_applied with source local_queue when the duelId is queued` |
| Evento sem `id`/malformado **não altera o saldo** | `applyVictoryReward rejects an event without a duelId before any repository or queue call` + `applyVictoryReward leaves the wallet untouched when the event is malformed` + `grantVictoryReward returns malformed_victory_reward_event instead of throwing on invalid rating stars` + propriedade de totalidade |
| **(Pendente — balanceamento)** Quando o valor `N` por vitória for definido, o crédito usa esse valor | Propriedade "o crédito é exatamente o `N` injetado" + `the victory credit path contains no numeric star literal`: o critério fica **pré-validado** para qualquer `N` que o balanceamento venha a fixar, sem alterar teste algum (Decisão 4) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| **Cross-Feature:** fluxo completo — F02 credita na carteira (F01) → F03 valida a senha e mostra preço/saldo → F04 debita e concede → F05 registra, sem estado inconsistente | Parte de F02: `a victory credits the card and the stars in the same call…` e `draining the queue after reconnect applies the credit exactly once on the server`. O restante do fluxo pertence a F03/F04/F05 |
| **Cross-Feature:** o saldo exibido (F01) reflete todos os créditos (F02) menos todos os débitos (F04), sem divergência | `draining the queue twice does not credit twice` + a reconciliação por `reward_ledger` já especificada em `password/F01` (`reconcileWalletBalance ignores a pending credit whose duelId is already in the ledger`) |
| **Cross-PRD (módulos de duelo):** o evento de vitória que dispara o drop (`BuildDeck/F03`) também dispara o crédito de estrelas (F02), com o mesmo `id` de duelo, sem duplicação | `grantVictoryReward uses duelSessionId as the idempotency key` + `apply_victory_reward inserts one reward_ledger row and increments both collections and wallets` (uma linha, dois efeitos) |
| **Cross-PRD (Build Deck):** a carta creditada entra na coleção pelo sink existente, sem coleção paralela | `apply_victory_reward is the only writer of wallets in the victory path` + o RPC escreve `collections`, a mesma tabela de `build-deck/F01`; nenhum arquivo de F02 cria armazenamento de coleção |
| **Cross-PRD (Save/persistência):** o saldo creditado sobrevive à sessão e ao dispositivo | `a failed apply_victory_reward leaves no partial state…` + `draining the queue after reconnect applies the credit exactly once on the server` |
| **Cross-PRD (Online Duel / Campanha):** um chamador novo credita pelo mesmo ponto, com o mesmo contrato | `lib/reward/** does not import lib/free-duel/**` — teste de contrato que prova que o handler não tem dependência do módulo de duelo; pendência registrada até que Online Duel ou Campanha existam |
