# Recompensa: Adicionar Carta à Coleção

> PRD: `docs/prds/build-deck.md` — F03
> Pacote-alvo: `packages/rules` (+ `packages/shared`, `apps/web`, migração Supabase)

## 1. Contexto e Escopo

Esta feature é o **sink de recompensa** da coleção: o ponto único onde uma carta concedida por
vencer um duelo (Free Duel, Online Duel ou Campanha — todos cross-PRD) entra na coleção do
jogador estabelecida por **F01**. F03 não decide *qual* carta é premiada nem calcula tabela de
drop — isso pertence ao módulo de duelo que gera o evento; F03 apenas recebe o `numero` já
escolhido e o identificador de recompensa/duelo, e soma `+1` à quantidade possuída, exatamente uma
vez por identificador (PRD §6 F03 Capabilities).

A feature pertence à **Wave 2** do módulo (PRD §8, Parte 3), junto de F02 e F04, todas dependentes
apenas de F01 (Foundation, já com spec em `docs/specs/build-deck/F01-colecao-do-jogador-bau/`).
Diferente de F01 — que é somente-leitura — F03 é a **primeira escrita** na tabela `collections`,
e por isso o desenho central da spec é a **idempotência e a atomicidade** dessa escrita
(`arquitetura.md` §5.2, ADR-006), combinadas com o comportamento **offline-first** de crédito
(`arquitetura.md` §5.4, ADR-005: "créditos offline são seguros: enfileira e sobe idempotente").
A feature pertence à **Fase 2** do roadmap (`arquitetura.md` §9), a mesma fase de F01.

Como orientado pelo lote: esta spec **não implementa a economia de estrelas** nem o handler
unificado `onVictory` (`arquitetura.md` §5.3, ADR-006, pendência needs-input) — apenas a
concessão da carta. A tabela `reward_ledger` de `arquitetura.md` §5.1 já reserva uma coluna
`stars`; F03 cria essa tabela (é o mecanismo de idempotência de recompensa que o PRD exige) mas
**nunca escreve nem lê `stars`**, deixando-a em seu valor-padrão para a feature que, no futuro,
unificar o crédito de estrelas ao mesmo evento de vitória.

### Incluído

- Contrato de entrada do evento de recompensa (`EventoRecompensaCarta`: jogador, identificador de
  recompensa/duelo, número da carta) em `packages/shared` — PRD F03 Consumes
- Validação pura do `numero` contra o catálogo antes de qualquer escrita, reaproveitando
  `ConsultaCatalogo` de F01 — PRD F03 Error Handling
- Incremento puro de coleção (`+1` a uma carta, criando a entrada com quantidade 1 se ausente) em
  `packages/rules` — PRD F03 Capabilities
- Aplicação atômica e idempotente por identificador de recompensa/duelo via função Postgres
  `SECURITY DEFINER`, com tabela `reward_ledger` e `UNIQUE` em `duel_id` — PRD F03 Capabilities
  ("cada evento de recompensa é aplicado exatamente uma vez")
- Caminho offline: incremento otimista no cache local da coleção (reaproveitando o snapshot de
  F01) e fila de sincronização idempotente por `duelId`, drenada ao reconectar — PRD F03 Error
  Handling ("falha ao persistir... aplica no cache local e enfileira")
- Tratamento explícito dos três casos de erro do PRD: falha de persistência, recompensa duplicada,
  `numero` inexistente
- Função de entrada (`registrarRecompensaDeCarta`) que os módulos de duelo (cross-PRD) chamam ao
  conceder a carta de vitória

### Fronteiras

- **Seleção da carta / tabela de drop** → módulo de duelo (Free Duel/F06, Online Duel, Campanha —
  todos cross-PRD). F03 só recebe o `numero` já decidido. — PRD §7
- **Crédito de estrelas por vitória e a carteira** → `free-duel`/F07 e `password` (cross-PRD);
  a unificação do handler `onVictory` é pendência de arquitetura (`arquitetura.md` §5.3, §10) fora
  desta feature. — instrução do lote
- **Leitura da coleção, enriquecimento com o catálogo e o teto de 3 cópias** → **F01**. F03 só
  escreve; quem expõe a coleção enriquecida continua sendo F01. — PRD §6 F01
- **Busca, filtro, ordenação e exibição da carta recém-conquistada** → **F04/F05**. F03 apenas
  garante que a linha em `collections` reflita a nova quantidade a tempo de a próxima leitura
  (F01) já enxergá-la. — PRD §6 F04/F05
- **Compra por `estrelas` e desbloqueio por Password** → fora desta versão; quando existirem, elas
  reusarão este mesmo mecanismo de incremento (`incrementarQuantidade` + RPC de aplicação), não uma
  tabela paralela. — PRD §7

### Contratos externos assumidos

- **Free Duel/F06 — Concessão de Carta (Drop por Vitória).** Tem PRD (`docs/prds/free-duel.md`
  §6 F06) mas ainda **não tem spec nem implementação**. Espera-se que, ao sortear a carta do pool
  de drops, F06 chame `registrarRecompensaDeCarta({ playerId, duelId, numeroCarta })` — o
  `numero` já escolhido e um identificador estável do duelo/recompensa. F06 descreve seu próprio
  fallback de rede ("registra a recompensa localmente e enfileira o envio"); esta spec trata esse
  fallback como **redundante e substituído** pelo mecanismo de fila desta feature — é aqui, não em
  F06, que a idempotência por identificador é garantida. *A ser fornecido por `free-duel`.*
- **Online Duel e Campanha (cross-PRD).** Nenhum dos dois tem PRD neste repositório ainda. Assumem
  o mesmo contrato de entrada de F06. *A ser fornecido por esses módulos quando existirem.*
- **F01 — Coleção do Jogador (Baú).** Já tem spec. F03 reusa `Colecao`, `NumeroCarta`,
  `ConsultaCatalogo`, `Result`, `DomainError` e a tabela `collections` (com sua PK composta e sem
  política de escrita para o cliente) definidos lá — nada é redefinido.
- **`banco-de-cartas`/F03 — Serviço de Catálogo.** Mesmo contrato externo já assumido por F01
  (`getByNumero(numero): Carta | undefined`); F03 de Build Deck não o redefine.
- **Auth/Cadastro (cross-PRD).** Fornece a sessão autenticada da qual sai `playerId`, igual a F01.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | F03 não tem blocos Core/Full no PRD — escopo completo desta spec cobre toda a Seção 6 F03. | PRD §6 F03 (sem divisão) | confirmada |
| 2 | Pacote-alvo: a validação e o incremento puros vivem em `packages/rules/src/colecao/` (estendendo o módulo já aberto por F01), não em `apps/web`; a mesma justificativa de F01 Decisão 1 (regra de jogo, não de interface) se aplica ao "somar 1 cópia". A orquestração de I/O (RPC, fila, cache) vive em `apps/web`, e a migração/RPC em `supabase/`. | auto-aceite: "Decisão técnica com recomendação clara" + precedente F01 §2 | confirmada |
| 3 | A tabela `reward_ledger` de `arquitetura.md` §5.1 é criada por esta feature (é o mecanismo de idempotência que a Capability de F03 exige), mas apenas as colunas `duel_id`, `player_id`, `card_numero`, `applied_at` são escritas. A coluna `stars` fica com `DEFAULT 0` e não é lida nem escrita por F03: crédito de estrelas é de outra feature (cross-PRD), que reaproveitará a mesma linha por `duel_id` quando o handler `onVictory` for unificado (ADR-006, needs-input). | auto-aceite: "Pendência de decisão em aberto do §10 / ADR needs-input" — adota a recomendação já registrada em `arquitetura.md` §5.1/§5.3 | a confirmar quando a unificação `onVictory` for decidida |
| 4 | Idempotência em duas camadas: `UNIQUE (duel_id)` em `reward_ledger` no servidor (garante corretude mesmo com dois dispositivos ou reprocessamento) e checagem de `duelId` já enfileirado no cliente antes de tentar rede (evita round-trip desnecessário e soma dupla se `registrarRecompensaDeCarta` for chamada duas vezes offline). Nenhuma das duas depende exclusivamente da outra. | `arquitetura.md` §5.2, ADR-006 | confirmada |
| 5 | A função de aplicação é uma **função Postgres `SECURITY DEFINER`** (RPC), não um `UPDATE` direto do cliente em `collections`. Isso cumpre a Decisão 8 de F01 ("F02 e F03 escreverão por RPC `SECURITY DEFINER`") e o requisito de `arquitetura.md` §5.2 de nunca confiar em valor de economia vindo do cliente — mesmo não sendo estrelas, a contagem de cópias possuídas é dado sensível ao balanceamento do deck. | `arquitetura.md` §5.2; spec F01 Decisão 8 | confirmada |
| 6 | O contrato reutilizável entre `apps/web` (Free Duel offline) e um futuro `apps/server` (Online Duel) é a **função Postgres**, não um módulo TypeScript de `apps/web`. Isso evita que o Online Duel precise importar código de `apps/web` (o que violaria a direção de dependências) — ele chamaria a mesma RPC a partir do seu próprio cliente Supabase autorizado. | `arquitetura.md` §2 (direção de dependências); `arquitetura.md` §6 | confirmada — decisão de forward-compatibility, sem código de `apps/server` nesta feature |
| 7 | O `numero` da carta é validado contra o catálogo **antes** de qualquer escrita em `reward_ledger` ou `collections`. Uma carta inexistente nunca gera linha em nenhuma das duas tabelas — não há "recompensa fantasma" a limpar depois. | PRD §6 F03 Error Handling | confirmada |
| 8 | Sem tabela de dado externo pendente consumida por F03 (quem decide a carta é cross-PRD); nenhuma tabela de drop, guardião, terreno, fusão, rating ou balanceamento é lida aqui. | PRD §7; `arquitetura.md` §10 | não se aplica |
| 9 | O identificador de idempotência é nomeado `duelId` (TypeScript) / `duel_id` (Postgres), alinhado ao nome já usado em `arquitetura.md` §5.1 e no PRD ("identificador do duelo/recompensa"), mesmo quando a origem for uma Campanha ou um duelo online — o nome descreve a chave de idempotência, não o modo de jogo. | `arquitetura.md` §5.1; PRD §6 F03 Capabilities | confirmada |
| 10 | O `numeroCarta` do evento é tratado como valor de **crédito**, não de débito: mesmo vindo de um módulo que pode ter decidido o drop inteiramente no cliente (Free Duel offline contra a CPU), aplicá-lo é seguro porque só soma posse — nunca gasta um saldo nem decide vitória/derrota. Isso é exatamente a distinção que `arquitetura.md` §5.4/ADR-005 traça entre "créditos offline são seguros" e "débitos exigem autoridade mais forte". A única verificação que esta feature aplica ao valor recebido é a existência do `numero` no catálogo (Decisão 7) — a legitimidade de *qual* carta foi sorteada é responsabilidade do módulo de duelo, não desta feature. | `arquitetura.md` §5.2/§5.4; ADR-005 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/colecao/tipos.ts` | shared | alterado | Acrescenta `EventoRecompensaCarta`, `ResultadoRecompensa`, `RecompensaPendente` |
| `packages/shared/src/colecao/schema.ts` | shared | alterado | Acrescenta `EventoRecompensaCartaSchema`, `RecompensaPendenteSchema` (zod) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos contratos |
| `packages/rules/src/colecao/recompensa.ts` | rules | novo | `incrementarQuantidade`, `validarNumeroRecompensa` — puro |
| `packages/rules/src/colecao/recompensa.test.ts` | rules | novo | Unitários e propriedades do incremento e da validação |
| `packages/rules/src/colecao/index.ts` | rules | alterado | Reexporta as novas funções puras |
| `supabase/migrations/0002_create_reward_ledger.sql` | raiz | novo | Tabela `reward_ledger`, constraints, RLS, RPC `aplicar_recompensa_carta` |
| `apps/web/src/lib/recompensa/repositorio-supabase.ts` | web | novo | Chama a RPC via cliente Supabase autenticado |
| `apps/web/src/lib/recompensa/fila-offline.ts` | web | novo | Store IndexedDB `recompensas_pendentes`: enfileirar/listar/remover, chave `duelId` |
| `apps/web/src/lib/recompensa/aplicar-recompensa.ts` | web | novo | `registrarRecompensaDeCarta` — orquestra validação, RPC, fila e cache local |
| `apps/web/src/lib/recompensa/sincronizar-fila.ts` | web | novo | `sincronizarFilaDeRecompensas` — drena a fila ao reconectar |
| `apps/web/src/lib/colecao/cache-indexeddb.ts` | web | alterado | Acrescenta gravação de incremento pontual no snapshot de F01, na mesma transação que a fila |
| `apps/web/src/hooks/use-sincronizacao-recompensas.ts` | web | novo | Dispara `sincronizarFilaDeRecompensas` no evento `online` do navegador |
| `apps/web/tests/recompensa.integration.test.ts` | web | novo | Integração da RPC, RLS e fluxo offline→sincronização |

**Verificação da direção de dependências:** `packages/rules/src/colecao/recompensa.ts` importa
apenas `packages/shared` (a mesma regra de F01) — nenhum import de Supabase, IndexedDB, React ou
`fetch`. `apps/web` importa `shared`, `rules` e `data` (via `ConsultaCatalogo`), sem importar
`engine`, `ai` ou `server`. A migração e a RPC vivem em `supabase/`, fora do grafo de pacotes
TypeScript. Esta feature **não toca `packages/engine`**: nenhuma garantia de PRNG ou de estado de
duelo serializável se aplica; a fronteira de I/O relevante é a mesma de F01 — `packages/rules`
puro, `apps/web` como único ponto com Supabase/IndexedDB.

## 3. Design Técnico

### Estruturas de dados

**`EventoRecompensaCarta`** — o que os módulos de duelo (cross-PRD) entregam:

| Campo | Tipo | Semântica |
|---|---|---|
| `playerId` | `string` (uuid) | Jogador vencedor |
| `duelId` | `string` não vazia | Identificador único da recompensa/duelo — chave de idempotência |
| `numeroCarta` | `NumeroCarta` | A carta já escolhida pelo módulo de duelo (drop) |

**`ResultadoRecompensa`** — união discriminada por `status`, devolvida a quem chamou:

```
| { status: 'aplicada'; quantidadeAtual: number }
| { status: 'aplicada_offline'; quantidadeLocalAtual: number }
| { status: 'ja_aplicada'; quantidadeAtual?: number }
```

`aplicada` = incrementou no servidor nesta chamada; `aplicada_offline` = incrementou apenas no
cache local e enfileirou; `ja_aplicada` = o `duelId` já havia sido processado (localmente ou no
servidor) — nenhuma soma adicional ocorreu.

**`RecompensaPendente`** — registro da fila offline:

| Campo | Tipo | Semântica |
|---|---|---|
| `duelId` | `string` | Chave primária da fila — reenfileirar o mesmo valor substitui, nunca duplica |
| `playerId` | `string` | Dono da pendência |
| `numeroCarta` | `NumeroCarta` | Carta a aplicar quando sincronizar |
| `enfileiradaEm` | `string` (ISO 8601) | Para preservar a ordem de sincronização |

### Fluxo

**Registro da recompensa** (`registrarRecompensaDeCarta`, em `apps/web`):

1. **Validar o formato do evento** via `EventoRecompensaCartaSchema`. Evento malformado (campo
   ausente ou vazio) ⇒ erro `evento_recompensa_malformado`, sem tocar em rede, fila ou cache.
2. **Validar o `numero` contra o catálogo** (`validarNumeroRecompensa`, puro, em
   `packages/rules`). `numero` sem carta correspondente ⇒ erro `recompensa_invalida`; nenhuma
   escrita em `reward_ledger` ou `collections` acontece (Decisão 7). — PRD Error Handling, caso 3.
3. **Checar a fila local primeiro.** Se `duelId` já está em `recompensas_pendentes`, devolve
   `status: 'ja_aplicada'` sem round-trip de rede — a chamada já está registrada e será
   sincronizada. — PRD Error Handling, caso 2 (ramo local).
4. **Tentar o caminho online.** Chama a RPC `aplicar_recompensa_carta(playerId, duelId,
   numeroCarta)` com um timeout explícito (`AbortController`).
   - RPC devolve `aplicada = true` ⇒ sucesso desta chamada: soma a quantidade no servidor.
     Devolve `status: 'aplicada'` com `quantidadeAtual` vinda da RPC.
   - RPC devolve `aplicada = false` ⇒ o `duel_id` já existia em `reward_ledger` (aplicado antes,
     por este dispositivo ou outro). Devolve `status: 'ja_aplicada'`, e usa `quantidadeAtual` da
     RPC para reconciliar o snapshot local, caso este dispositivo estivesse desatualizado. — PRD
     Error Handling, caso 2 (ramo remoto).
5. **Falha de rede/timeout ao chamar a RPC** ⇒ aplica `incrementarQuantidade` (puro) sobre o
   snapshot local da coleção e grava o resultado, **na mesma transação IndexedDB** que enfileira o
   evento em `recompensas_pendentes` (chave `duelId`) — as duas escritas locais nunca divergem
   entre si. Devolve `status: 'aplicada_offline'`. — PRD Error Handling, caso 1.
6. Todo o percurso é registrado (`reward_apply_started` / `reward_apply_finished` /
   `reward_apply_failed`) com `duelId` e `playerId` no contexto — guidelines §23.3.

**Sincronização da fila** (`sincronizarFilaDeRecompensas`, disparada ao reconectar):

7. Lista as pendências do jogador em ordem de `enfileiradaEm` (FIFO).
8. Para cada pendência, chama a mesma RPC `aplicar_recompensa_carta`. Sucesso — `aplicada` `true`
   **ou** `false` — remove o item da fila: em ambos os casos o servidor já processou aquele
   `duelId`, então não há mais nada a sincronizar para ele.
9. Falha de rede numa pendência interrompe o processamento **daquele item**, mas não descarta os
   demais; o item permanece na fila para a próxima tentativa. A ordem nunca é alterada.
10. Revalida o `numero` de cada pendência contra o catálogo atual antes de reenviar; se o `numero`
    se tornou inexistente (dessincronia do catálogo local), remove a pendência e registra
    `recompensa_invalida` em vez de tentar indefinidamente.

### Regras de negócio

- **`+1` exato por vitória, nunca mais.** O mesmo `duelId` nunca soma duas vezes, seja por
  reprocessamento local ou por reenvio da fila. — PRD §6 F03 Capabilities
- **Sem teto de posse.** Reforça F01 Decisão 10: o limite de 3 é regra de deck, não de coleção.
- **`numero` inexistente nunca é escrito**, nem em `reward_ledger` nem em `collections` — falha
  antes de qualquer efeito colateral (Decisão 7).
- **A idempotência do servidor é a autoridade final.** O cache local e a fila são um atalho de
  experiência offline; se o servidor diz que o `duelId` já foi aplicado, o cliente reconcilia com
  o valor do servidor em vez de insistir na sua própria contagem local.
- **A fila nunca reordena nem descarta silenciosamente** uma pendência — só sai da fila quando o
  servidor confirma o processamento (aplicado ou já aplicado) ou quando a validação de `numero`
  falha de forma definitiva.
- **`numeroCarta` é um valor de crédito, nunca de débito** (Decisão 10): a RPC nunca subtrai
  estrelas nem qualquer saldo com base neste evento; a única checagem de legitimidade é a
  existência do `numero` no catálogo — quem escolheu aquela carta específica já foi validado
  pelo módulo de duelo (cross-PRD), fora desta feature.

### Eventos

Não se aplica ao `packages/engine` — esta feature não emite nem consome eventos de duelo
(`onSummon`, `onAttackDeclared`, …) e não participa do Effect System. O "evento" aqui é o
`EventoRecompensaCarta` de entrada cross-PRD, um dado de aplicação, não um evento do motor.

### Determinismo e pureza

Não se aplica a `packages/engine` — F03 não produz estado de duelo nem usa PRNG. As garantias
relevantes são de **pureza de `packages/rules`**, na mesma linha de F01:

- `incrementarQuantidade` e `validarNumeroRecompensa` não fazem I/O, não leem relógio nem
  ambiente, e não mutam a coleção recebida — devolvem uma nova `Colecao`.
- `incrementarQuantidade(colecao, numero)` aplicado à mesma dupla sempre devolve o mesmo resultado
  (mesma quantidade final), independentemente de quantas vezes a função pura em si for chamada —
  é a camada de orquestração (fila + `reward_ledger`) que garante que ela só seja **efetivamente
  aplicada** uma vez por `duelId`, não a pureza da função em si.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`EventoRecompensaCartaSchema`** — `playerId` (uuid), `duelId` (string não vazia), `numeroCarta`
  via `NumeroCartaSchema` (reusado de F01). Tipo derivado `EventoRecompensaCarta`.
- **`RecompensaPendenteSchema`** — `duelId`, `playerId`, `numeroCarta` (via `NumeroCartaSchema`),
  `enfileiradaEm` (ISO 8601). Valida o que é lido de volta da fila offline, tratando o
  armazenamento local como fronteira não confiável (mesmo princípio de F01 para `SnapshotColecao`).
- **`ResultadoRecompensa`** — união discriminada por `status`, descrita na Seção 3. Não é uma
  fronteira de rede (não precisa de schema zod de entrada), mas é validada em teste.
- **`Colecao`, `NumeroCarta`, `ConsultaCatalogo`, `Result`, `DomainError`** — reusados de F01,
  **não redefinidos**.

Novos códigos de `DomainError`: `recompensa_invalida`, `evento_recompensa_malformado`. Reusados de
F01: `sessao_ausente`, `catalogo_indisponivel`.

### Funções públicas

```
// packages/rules/src/colecao — puro, sem I/O

incrementarQuantidade(colecao: Colecao, numero: NumeroCarta): Colecao
  // pós: nova Colecao com quantidade(numero) = quantidade anterior + 1 (ou 1, se ausente);
  //      todas as demais entradas preservadas; a coleção recebida não é mutada

validarNumeroRecompensa(numero: NumeroCarta, catalogo: ConsultaCatalogo): Result<NumeroCarta, DomainError>
  // pós: ok quando catalogo.getByNumero(numero) existe; erro recompensa_invalida caso contrário
```

```
// apps/web/src/lib/recompensa — fronteira de I/O

registrarRecompensaDeCarta(evento: EventoRecompensaCarta, deps: DependenciasRecompensa): Promise<Result<ResultadoRecompensa, DomainError>>
  // deps: { catalogo, repositorioRecompensa, filaOffline, cacheColecao, relogio }
  // pós: numero inexistente ou evento malformado nunca escrevem em reward_ledger/collections;
  //      duelId já enfileirado ou já aplicado no servidor ⇒ status ja_aplicada, sem soma extra;
  //      falha de rede ⇒ status aplicada_offline, incremento local + enfileiramento atômicos;
  //      sucesso online ⇒ status aplicada, quantidadeAtual refletindo o servidor

sincronizarFilaDeRecompensas(deps: DependenciasRecompensa): Promise<SincronizacaoResumo>
  // pós: drena recompensas_pendentes do jogador em ordem de enfileiramento;
  //      item processado (aplicado ou já aplicado) sai da fila; falha de rede o mantém;
  //      numero invalidado no meio tempo é removido com recompensa_invalida, não retenta para sempre
```

```
// apps/web/src/lib/recompensa/fila-offline — fronteira de I/O (IndexedDB)

enfileirarRecompensa(pendente: RecompensaPendente): Promise<void>
  // pós: chave duelId — reenfileirar o mesmo duelId substitui, nunca duplica a entrada
listarRecompensasPendentes(playerId: string): Promise<readonly RecompensaPendente[]>
  // pós: ordenado por enfileiradaEm crescente
removerRecompensaPendente(duelId: string): Promise<void>
```

### Endpoints / RPC / mensagens de rede

RPC Postgres `aplicar_recompensa_carta` — `SECURITY DEFINER`, transação única: tenta inserir em
`reward_ledger`; se inserida (não havia `duel_id` antes), incrementa `collections` via
`UPSERT`; se não inserida (já existia), não altera `collections`. Devolve, em ambos os casos, se
aplicou nesta chamada e a quantidade atual da carta na coleção.

Chamada — `supabase.rpc('aplicar_recompensa_carta', { p_player_id, p_duel_id, p_card_numero })`:

```json
{ "p_player_id": "6f1c9e10-...", "p_duel_id": "free-duel:2026-07-27T12:00:00Z:9f21", "p_card_numero": "045" }
```

Resposta — primeira aplicação:

```json
{ "aplicada": true, "quantidade_atual": 2 }
```

Resposta — reprocessamento do mesmo `duel_id`:

```json
{ "aplicada": false, "quantidade_atual": 2 }
```

Registro na fila offline (IndexedDB), chaveado por `duelId`:

```json
{
  "duelId": "free-duel:2026-07-27T12:00:00Z:9f21",
  "playerId": "6f1c9e10-...",
  "numeroCarta": "045",
  "enfileiradaEm": "2026-07-27T12:00:03.500Z"
}
```

### Contratos externos (cross-PRD)

- **Free Duel/F06 — Concessão de Carta (Drop por Vitória).** *A ser fornecido por `free-duel`.*
  Espera-se a chamada de `registrarRecompensaDeCarta({ playerId, duelId, numeroCarta })` assim que
  o pool de drops decidir a carta. Enquanto F06 não existe, os testes desta feature usam um evento
  falso respeitando `EventoRecompensaCartaSchema`.
- **Online Duel e Campanha.** *A ser fornecido quando esses módulos/PRDs existirem.* Mesmo
  contrato de entrada; um servidor de Online Duel (`apps/server`, Fase 5) pode alternativamente
  chamar a mesma RPC diretamente pelo seu próprio cliente Supabase, sem depender de código de
  `apps/web` (Decisão 6).
- **Handler unificado `onVictory` (futuro, cross-PRD, `arquitetura.md` §5.3/ADR-006 needs-input).**
  Quando a concessão de estrelas for unificada ao mesmo evento de vitória, a feature responsável
  reaproveitará a mesma linha de `reward_ledger` por `duel_id` para também gravar `stars` — F03
  não implementa essa escrita, apenas não a impede (coluna já existe com `DEFAULT 0`).
- **Library (cross-PRD).** Não consumido diretamente por F03, mas a carta que F03 grava em
  `collections` é a mesma que `derivarObtidas` (F01) expõe ao Library — nenhuma tabela paralela.

## 5. Modelo de Dados

### Postgres / Supabase

| Tabela | Coluna | Tipo | Constraints / Índices |
|--------|--------|------|------------------------|
| `reward_ledger` | `duel_id` | `text` | `PRIMARY KEY` — chave de idempotência |
| `reward_ledger` | `player_id` | `uuid` | `NOT NULL`, FK → `auth.users(id)` `ON DELETE CASCADE` |
| `reward_ledger` | `card_numero` | `text` | `NOT NULL`, `CHECK (card_numero ~ '^[0-9]{3}$')` |
| `reward_ledger` | `stars` | `integer` | `NOT NULL`, `DEFAULT 0`, `CHECK (stars >= 0)` — não escrita por F03 (Decisão 3) |
| `reward_ledger` | `applied_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

- **`PRIMARY KEY (duel_id)`** é o mecanismo central de idempotência: um `INSERT` com `duel_id`
  repetido falha por violação de chave, o que a RPC trata como "já aplicada" via
  `ON CONFLICT (duel_id) DO NOTHING`, nunca como erro para o chamador.
- **Sem índice adicional em `player_id`**: não há critério de aceite que exija consulta de
  histórico de recompensas nesta versão; adicionar um agora seria especular sobre uso futuro.

**RPC `aplicar_recompensa_carta(p_player_id uuid, p_duel_id text, p_card_numero text)`** —
`SECURITY DEFINER`, corpo em uma única transação (guidelines §22.4 — "use explicit transactions
for multi-step writes"):

1. `INSERT INTO reward_ledger (duel_id, player_id, card_numero) VALUES (...) ON CONFLICT (duel_id) DO NOTHING RETURNING duel_id` — se devolveu uma linha, esta chamada é quem aplica a recompensa.
2. Se aplicou: `INSERT INTO collections (player_id, numero, quantity) VALUES (p_player_id, p_card_numero, 1) ON CONFLICT (player_id, numero) DO UPDATE SET quantity = collections.quantity + 1, updated_at = now()`.
3. Devolve `aplicada` (booleano do passo 1) e `quantidade_atual` (lida de `collections` após o
   passo 2, ou a quantidade corrente se não aplicou).

Falha em qualquer passo reverte a transação inteira — nunca fica um `reward_ledger` inserido sem o
incremento correspondente em `collections` (atomicidade, `arquitetura.md` §5.2).

**RLS:** habilitada em `reward_ledger`. Política única — `SELECT` permitido quando
`player_id = auth.uid()` (permite uma futura tela de histórico, sem ser exigida agora). **Nenhuma
política de escrita para o cliente**: a única via de escrita é a RPC `SECURITY DEFINER`, que roda
com a autoridade do dono da função, não do chamador (mesmo padrão de `arquitetura.md` §5.2 e da
Decisão 8 de F01).

**Migração:** `supabase/migrations/0002_create_reward_ledger.sql` cria `reward_ledger`, suas
constraints, RLS, a política de leitura e a função `aplicar_recompensa_carta`. É aditiva; não
altera a migração `0001_create_collections.sql` de F01.

**Atomicidade e idempotência:** exatamente o par de garantias que `arquitetura.md` §5.2 exige para
economia — "debitar/creditar numa única transação" e "crédito de vitória idempotente por `duel_id`
via `reward_ledger`" — aplicado aqui à concessão de carta (a parte de "stars" fica para a feature
que unificar `onVictory`, Decisão 3).

### Cache local / fila offline

| Item | Definição |
|---|---|
| Banco | Mesmo IndexedDB da aplicação de F01, versão elevada para 2 |
| Store novo | `recompensas_pendentes` |
| Chave | `duelId` — reenfileirar o mesmo valor substitui, nunca duplica |
| Valor | `{ duelId, playerId, numeroCarta, enfileiradaEm }` |
| Escrita | Ao falhar a chamada online: grava a pendência **e** o incremento no snapshot `colecao` (store de F01) na **mesma transação IndexedDB** — as duas nunca divergem entre si |
| Leitura | Ao sincronizar (`sincronizarFilaDeRecompensas`) e ao registrar uma nova recompensa (checagem de duplicidade local, passo 3 do fluxo) |
| Remoção | Após o servidor confirmar o processamento (aplicado ou já aplicado) daquele `duelId`, ou após invalidação definitiva do `numero` |

O snapshot `colecao` de F01 recebe uma nova forma de escrita (incremento pontual via
`incrementarQuantidade`), além da substituição integral já existente — ambas coexistem porque
servem momentos diferentes: substituição integral é para leitura do servidor (F01); incremento
pontual é para o caminho offline desta feature.

### Arquivos de dados versionados

Não se aplica. F03 não produz nem versiona artefato de dado; consome o catálogo já versionado de
`banco-de-cartas` através de `ConsultaCatalogo`, exatamente como F01.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Falha de rede/timeout ao aplicar a recompensa | `catch`/`AbortController` na chamada da RPC | Incrementa o cache local e enfileira `recompensas_pendentes` (transação única) | `Carta conquistada salva localmente; sincronizando…` |
| Evento de recompensa duplicado — mesmo `duelId` ainda na fila local | Checagem da fila antes de chamar a RPC | Ignora sem somar; não chama a RPC | `Recompensa já aplicada.` |
| Evento de recompensa duplicado — mesmo `duelId` já aplicado no servidor | RPC devolve `aplicada = false` | Ignora a soma; reconcilia o cache local com `quantidade_atual` do servidor | `Recompensa já aplicada.` |
| Carta de recompensa com `numero` inexistente no catálogo | `validarNumeroRecompensa` | Não aplica; nenhuma escrita em `reward_ledger` ou `collections`; registra a inconsistência | `Recompensa inválida (numero X).` |
| Evento de recompensa malformado (campo ausente/vazio) | `EventoRecompensaCartaSchema` | Rejeita antes de qualquer I/O; registra `warn` com o payload bruto (sem dado sensível) | `Não foi possível registrar a recompensa (dado inválido).` |
| Sessão expirada/sem autorização (401/403) ao chamar a RPC | Resposta do Supabase | Mesmo fallback de cache local + fila; sinaliza necessidade de reautenticar | `Faça login novamente para sincronizar sua recompensa.` |
| IndexedDB indisponível para enfileirar (modo privativo, quota) | `catch` na fila | Sem fila local, a tentativa de rede falha vira falha definitiva desta chamada — o módulo de duelo (cross-PRD) decide se re-emite o evento; registra `warn` | `Não foi possível salvar a recompensa. Tente novamente ao reconectar.` |
| Concorrência entre dispositivos — dois clientes tentam aplicar o mesmo `duelId` quase ao mesmo tempo | `PRIMARY KEY (duel_id)` em `reward_ledger` | Apenas um `INSERT` vence; o outro recebe `aplicada = false` e reconcilia leitura — nenhuma soma dupla | — (registro técnico) |
| Sincronização da fila falha no meio (item N falha após item N-1 ter sucesso) | `sincronizarFilaDeRecompensas` | Itens anteriores já removidos permanecem aplicados; o item que falhou continua na fila para nova tentativa; itens seguintes não são pulados fora de ordem | — (registro técnico) |
| `numero` de uma pendência da fila se torna inexistente antes da sincronização | Revalidação contra o catálogo no passo de sincronização | Remove a pendência sem aplicar; registra `recompensa_invalida` | `Recompensa inválida (numero X).` |
| Falha na transação da RPC entre inserir `reward_ledger` e incrementar `collections` | Transação Postgres | Rollback integral — nenhuma linha parcial em `reward_ledger` nem incremento parcial em `collections` | — (o chamador recebe erro de RPC e trata como falha de rede, caso 1) |
| Catálogo indisponível (`banco-de-cartas`/F03 não subiu) | Guarda em `registrarRecompensaDeCarta` | Falha explícita antes de qualquer escrita; nunca aplica uma recompensa não verificável | `Não foi possível registrar a recompensa. Tente novamente.` |

Todo descarte é registrado, nunca silencioso (guidelines §8.3); os registros incluem `duelId` e
`playerId` no contexto, sem dado sensível (guidelines §23.3).

## 7. Estratégia de Testes

### Unitários (Vitest)

`incrementarQuantidade`:
- `incrementarQuantidade soma um a uma carta ja possuida`
- `incrementarQuantidade cria a entrada com quantidade um para carta nao possuida`
- `incrementarQuantidade nao muta a colecao recebida`
- `incrementarQuantidade preserva as demais entradas da colecao`

`validarNumeroRecompensa`:
- `validarNumeroRecompensa aceita numero presente no catalogo`
- `validarNumeroRecompensa rejeita numero ausente do catalogo com recompensa_invalida`

`registrarRecompensaDeCarta` (com RPC, fila e catálogo falsos, guidelines §12.1):
- `registrarRecompensaDeCarta aplica o incremento e devolve status aplicada quando a rpc responde aplicada verdadeiro`
- `registrarRecompensaDeCarta devolve status ja_aplicada quando a rpc responde aplicada falso`
- `registrarRecompensaDeCarta nao chama a rpc quando o duelId ja esta na fila local`
- `registrarRecompensaDeCarta aplica no cache local e enfileira quando a rpc falha por rede`
- `registrarRecompensaDeCarta grava o incremento local e o enfileiramento na mesma transacao`
- `registrarRecompensaDeCarta rejeita numero inexistente sem tocar em rede fila ou cache`
- `registrarRecompensaDeCarta rejeita evento malformado sem tocar em rede fila ou cache`
- `registrarRecompensaDeCarta nao soma duas vezes ao processar o mesmo duelId em chamadas sucessivas`

`sincronizarFilaDeRecompensas`:
- `sincronizarFilaDeRecompensas remove da fila os itens aplicados com sucesso`
- `sincronizarFilaDeRecompensas mantem na fila o item cuja chamada falha por rede`
- `sincronizarFilaDeRecompensas preserva a ordem de enfileiramento ao processar`
- `sincronizarFilaDeRecompensas nao interrompe os itens seguintes quando um item falha`
- `sincronizarFilaDeRecompensas remove da fila o item cujo numero se tornou invalido`

`fila-offline`:
- `enfileirarRecompensa substitui sem duplicar quando o duelId ja existe na fila`
- `listarRecompensasPendentes devolve as pendencias do jogador em ordem de enfileiramento`

### Property-based (fast-check)

- **Idempotência ponta a ponta:** para qualquer coleção inicial e qualquer `numero` válido, chamar
  `registrarRecompensaDeCarta` repetidamente (1 a 50 vezes) com o **mesmo** `duelId` resulta em
  exatamente `+1` na coleção — nunca mais. É o invariante central da feature. 1.000 execuções.
- **Concorrência:** N chamadas simultâneas (`Promise.all`) de `registrarRecompensaDeCarta` com o
  mesmo `duelId` resolvem para exatamente um incremento aplicado — adaptado do exemplo de
  guidelines §14.3 ("idempotent reward can run concurrently"), usando o `reward_ledger` falso como
  oráculo de aplicações únicas.
- **Preservação de outras entradas:** para qualquer coleção e `numero`, `incrementarQuantidade`
  altera exatamente a entrada do `numero` informado; todas as demais permanecem bit-a-bit iguais.

### Integração

`apps/web/tests/recompensa.integration.test.ts`, contra uma instância Supabase local com as
migrações de F01 e F03 aplicadas:

- `migracao cria reward_ledger com duel_id como chave primaria`
- `reward_ledger rejeita segunda linha com o mesmo duel_id`
- `RPC aplicar_recompensa_carta insere reward_ledger e incrementa collections na mesma transacao`
- `RPC aplicar_recompensa_carta chamada duas vezes com o mesmo duel_id incrementa collections uma unica vez`
- `RPC aplicar_recompensa_carta para carta nao possuida cria a linha em collections com quantidade um`
- `RLS recusa insert direto do cliente em reward_ledger`
- `registrarRecompensaDeCarta contra o banco real aplica a recompensa e reflete em collections`
- `sincronizarFilaDeRecompensas contra o banco real drena a fila apos a reconexao`

### Análise estática

- `packages/rules/src/colecao/recompensa.ts` não importa Supabase, IndexedDB, React, `fetch` nem
  `node:fs` — mesma regra de fronteira de F01 (guidelines §3.3, §12).
- `packages/rules` continua importando apenas `packages/shared`.
- Nenhum arquivo de `apps/web` reimplementa a checagem de idempotência fora da fila local e da
  RPC — a soma de `+1` tem fonte única (ADR-004, mesmo princípio de F01).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F03) | Teste |
|---|---|
| Vencer um duelo adiciona exatamente `+1` à quantidade da carta recebida; carta antes não possuída passa a existir com quantidade 1 | `registrarRecompensaDeCarta aplica o incremento...` + `incrementarQuantidade cria a entrada com quantidade um...` + `RPC...para carta nao possuida cria a linha...` |
| Cada evento de recompensa é aplicado uma única vez (idempotência por identificador); reprocessar não duplica cartas | Propriedade de idempotência ponta a ponta + propriedade de concorrência + `RPC...chamada duas vezes...incrementa...uma unica vez` |
| Recompensa com `numero` inexistente é rejeitada sem alterar a coleção, com registro de inconsistência | `registrarRecompensaDeCarta rejeita numero inexistente...` + `validarNumeroRecompensa rejeita numero ausente...` |
| A carta conquistada aparece disponível no editor no acesso seguinte ao Build Deck | `registrarRecompensaDeCarta contra o banco real aplica a recompensa e reflete em collections` — a leitura de F01 (`carregarColecao`) já cobre que `collections` é a fonte que o editor lê |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Cross-Feature: uma carta conquistada por F03 fica imediatamente utilizável em F04/F05 | `registrarRecompensaDeCarta contra o banco real aplica a recompensa e reflete em collections` — a mesma linha que F01 (`carregarColecao`) e por consequência F04/F05 leem |
| Cross-Feature: o fluxo de coleção não fica inconsistente entre F01 e F03 | `reward_ledger rejeita segunda linha com o mesmo duel_id` + `collections` (F01) continua com PK composta única — nenhuma das duas tabelas permite estado duplicado |
| Cross-PRD (Free Duel/F06): F03 recebe o `numero` já escolhido e apenas soma, sem recalcular drop | Contrato declarado na Seção 4 — teste de contrato com evento falso validado por `EventoRecompensaCartaSchema`, sem qualquer lógica de sorteio em `packages/rules/src/colecao/recompensa.ts` |
| Cross-PRD (Library): a carta conquistada é refletida na leitura booleana que o Library consome | Reaproveita `derivarObtidas` de F01 contra a linha gravada por `registrarRecompensaDeCarta contra o banco real...` |
| Cross-PRD (futura unificação `onVictory`): a escrita de `stars` não é impedida por esta feature | Inspeção de schema: `reward_ledger.stars` aceita `UPDATE` fora do caminho de F03 sem violar `PRIMARY KEY (duel_id)` já estabelecida — nenhum teste de F03 assume `stars = 0` como invariante além do `DEFAULT` |
