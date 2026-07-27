# Geração do Deck Inicial no Cadastro

> PRD: `docs/prds/build-deck.md` — F02
> Pacote-alvo: `packages/shared` + `packages/rules` (+ `apps/web`, + migração Supabase)

## 1. Contexto e Escopo

Esta feature garante que **toda conta recém-criada** receba, sem nenhuma ação do jogador, um
**deck ativo válido de 40 cartas** que é simultaneamente a sua **coleção inicial**
(PRD §6 F02 Capabilities: "coleção == deck no dia 0"). É a ponte entre o contrato externo
Auth/Cadastro (evento "conta criada") e a Foundation do módulo (F01 — Coleção do Jogador),
semeando pela primeira vez a tabela que F01 apenas lê e criando a primeira linha da tabela de
deck ativo que F07 mais tarde vai sobrescrever a cada save. Pertence à **Fase 2** do roadmap
(`arquitetura.md` §9) e à **Wave 2** do PRD (junto de F03 e F04), mas com prioridade 1
("essencial") — sem ela nenhuma conta consegue duelar.

O desenho segue a mesma separação de camadas de F01 (guidelines §3.2, ADR-004): os **contratos**
(schema do pool, tipos do resultado) vivem em `packages/shared`; o **algoritmo de sorteio** —
puro, sem I/O, testável isoladamente — vive em `packages/rules/src/deck-inicial/`, como um
subsistema irmão de `packages/rules/src/colecao/` (criado por F01); e a **orquestração com
efeito colateral** (ler/escrever Supabase, decidir se já existe deck, expor o handler que
Auth/Cadastro dispara) fica confinada a `apps/web`. Isso mantém o pilar "motor de regras
desacoplado da UI" mesmo fora do `packages/engine`: a regra "como sortear 40 cartas respeitando
no máximo 3 cópias" não deveria viver espalhada entre um Route Handler e uma função Postgres.

Esta feature **não toca `packages/engine`**: não há estado de duelo, não há replay, e a operação
roda **uma única vez por conta**, nunca dentro de uma partida. As garantias de determinismo por
seed persistido no estado (`arquitetura.md` §3.1) são um invariante do motor de duelo, não desta
feature — ver "Determinismo e pureza" abaixo para a distinção explícita.

### Incluído

- Geração de um deck **aleatório** de exatamente 40 cartas, com no máximo 3 cópias por carta
  (Fase 0.3), a partir de um **pool inicial** — PRD §6 F02 Capabilities
- As 40 cartas sorteadas tornam-se **também** a coleção inicial do jogador (mesma quantidade em
  ambas as estruturas) — PRD §6 F02 Capabilities
- O deck gerado é marcado como o **deck ativo único** do jogador e persistido no servidor —
  PRD §6 F02 Capabilities
- Contrato de entrada esperado do evento externo "conta criada" (Auth/Cadastro), tolerante a
  entrega duplicada (at-least-once) — PRD §6 F02 Consumes
- Schema, loader e validação do **pool inicial configurável**, com **fallback neutro** = catálogo
  de cartas jogáveis inteiro, sem inventar a composição de balanceamento ainda não fornecida —
  Fase 0.4 / PRD §7 ("dado de balanceamento, pendência")
- Idempotência de ponta a ponta: reprocessar o evento de criação de conta, ou repetir a operação
  após falha, nunca produz um segundo deck nem duplica a coleção — PRD §6 F02 Error Handling
- Guarda defensiva para pontos de entrada que dependem de um deck ativo (Build Deck, e
  Free Duel/Online Duel cross-PRD) reprocessarem a geração quando ela ainda não foi concluída —
  PRD §6 F02 Error Handling ("bloqueia a entrada em duelos com 'Preparando seu deck inicial…'")

### Fronteiras

- **Edição do deck (adicionar/remover cartas)** → **F05**. F02 entrega o estado inicial; a
  edição posterior não é desta feature. — PRD §6 F05
- **Validação contínua/contador do deck** → **F06**. F02 garante que o deck nasce válido; não
  recalcula validade continuamente. — PRD §6 F06
- **Salvar/sobrescrever o deck ativo, resolução de conflito entre dispositivos e fila offline de
  edições** → **F07**. F02 só escreve a **primeira** versão, uma única vez; toda sobrescrita
  posterior é de F07. — PRD §6 F07
- **Seleção de qual carta é a recompensa de vitória e tabela de drops** → módulo de duelo
  (cross-PRD); nada disso é relevante para o sorteio do deck inicial. — PRD §7
- **Busca, filtro e ordenação da coleção** → **F04**. — PRD §6 F04
- **Mecanismo exato de disparo do evento "conta criada"** (webhook, trigger em `auth.users`,
  fila) → Auth/Cadastro (cross-PRD). F02 define o contrato que espera receber, não como ele é
  emitido. — PRD §6 F02 Consumes
- **Renderização da tela "Preparando seu deck inicial…"** → camada de UI. Esta spec descreve o
  estado lógico que a UI consome, não sua aparência. — PRD §7

### Contratos externos assumidos

Nenhum dos módulos abaixo está implementado. A spec os trata como contrato externo e o
`plan.md` os lista como pré-requisito.

- **`banco-de-cartas`/F03 — Serviço de Catálogo.** F02 consome a mesma `ConsultaCatalogo` de F01
  e acrescenta uma segunda capacidade, `ConsultaPoolCartas.listarNumeros()`, necessária para o
  fallback "pool = catálogo inteiro". *A ser fornecido por `banco-de-cartas`.*
- **`build-deck`/F01 — Coleção do Jogador.** Já tem spec em
  `docs/specs/build-deck/F01-colecao-do-jogador-bau/`. F02 reusa os tipos `Colecao`,
  `ColecaoSerializada` e as funções `serializarColecao`/`desserializarColecao` de
  `packages/rules/src/colecao/`, sem redefini-los. A tabela `collections` (migração de F01) é
  onde F02 escreve pela primeira vez. *Reusado, não redefinido.*
- **Auth/Cadastro (cross-PRD).** Espera-se que, ao criar a conta, Auth/Cadastro invoque o
  handler `aoContaCriada(playerId)` (Seção 4) exatamente uma vez — mas F02 tolera entrega
  duplicada (at-least-once) por construção, então não exige exatamente-uma-vez do lado do
  chamador. *A ser fornecido por Auth/Cadastro.*
- **Free Duel / Online Duel (cross-PRD).** Espera-se que, antes de liberar a entrada em duelo,
  cada módulo verifique a existência do deck ativo e, na ausência dele, chame a guarda
  defensiva desta feature. *Contrato oferecido a esses módulos, a ser consumido por eles.*

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O PRD não tem os blocos `Core Scope`/`Full Scope additions` para F02 — a spec cobre o **escopo completo** da feature, sem divisão. | PRD §6 F02 (ausência dos blocos); regra do skill "se só um bloco existir, ou nenhum, assuma escopo completo" | confirmada |
| 2 | O algoritmo de sorteio vive em `packages/rules/src/deck-inicial/`, não em `packages/engine`. `engine` é exclusivamente o reducer do motor de duelo 1x1 (`arquitetura.md` §2/§3); gerar um deck no cadastro não é uma ação de duelo. `rules` já teve seu charter ampliado por F01 (Decisão 1) para cobrir regra de montagem além de Guardian Star/Terrain/Fusion, e o sorteio inicial é a mesma família de regra. | `arquitetura.md` §2/§3; spec F01 Decisão 1 | confirmada |
| 3 | O deck sorteado é representado pelo mesmo tipo `Colecao` (`ReadonlyMap<NumeroCarta, number>`) definido por F01, em vez de um tipo novo — reflete estruturalmente que "coleção inicial == deck inicial" sem duplicar formato. | PRD §6 F02 Capabilities; spec F01 (`packages/shared/src/colecao/tipos.ts`) | confirmada |
| 4 | `ConsultaCatalogo.getByNumero` (de F01) não permite enumerar todo o catálogo, necessário para o fallback "pool = catálogo inteiro". F02 declara uma capacidade adicional, `ConsultaPoolCartas.listarNumeros()`, em vez de alterar a interface já publicada por F01. Interfaces pequenas e nomeadas por capacidade (guidelines §10.1), não uma interface "de tudo" do catálogo. | guidelines §10.1; necessidade desta feature | confirmada — **a ser fornecida por `banco-de-cartas`/F03 junto de `ConsultaCatalogo`** |
| 5 | Algoritmo de sorteio: expandir o pool repetindo cada `numero` até 3 vezes, embaralhar (Fisher–Yates) com uma fonte aleatória **injetada**, e tomar as 40 primeiras posições. Isso garante **estruturalmente** exatamente 40 cartas e no máximo 3 cópias — sem laço de rejeição — desde que o pool tenha ao menos 14 números distintos (`ceil(40/3) = 14`). | Fase 0.3 (invariantes de deck); guidelines §12.2 (injeção de fonte de aleatoriedade, exemplo `RandomSource`) | confirmada |
| 6 | O invariante "PRNG semeado no estado, nunca `Math.random()`" de `arquitetura.md` §3.1 é um invariante de **`packages/engine`** (replay determinístico de duelo). F02 não toca o motor, não participa de replay e roda uma única vez por conta — o invariante não se aplica literalmente aqui. Ainda assim, a fonte de aleatoriedade é **injetada** (`FonteAleatoria`), nunca `Math.random()` cru dentro da regra pura, por testabilidade (guidelines §12.2) e para manter `packages/rules` livre de I/O. A implementação de produção usa uma fonte de aleatoriedade real (não semeada) e vive em `apps/web`, fora da regra pura. | `arquitetura.md` §3.1 (escopo do invariante); guidelines §12.2 | confirmada |
| 7 | **Pendência de dado externo** (Fase 0.4 / PRD §7): a composição exata do pool inicial de balanceamento não existe no repositório. Tratamento: schema `PoolInicialConfig` opcional + loader com **fallback neutro** = todo o catálogo jogável (via `ConsultaPoolCartas.listarNumeros()`). Nenhum valor de balanceamento é inventado. Quando o dado chegar, basta popular `PoolInicialConfig.numeros`; o loader e o algoritmo não mudam. | Fase 0.4; PRD §7; auto-aceite: "tabela de dado externo pendente" | pendente — aguarda dado |
| 8 | O pool mínimo utilizável é **14 números distintos** — matematicamente o menor conjunto que permite 40 cartas com no máximo 3 cópias (`13×3 + 1 = 40`). Um pool (configurado ou o catálogo inteiro) com menos que isso é erro de configuração, nunca um deck incompleto. | Fase 0.3 (derivação matemática do invariante 40/≤3) | confirmada |
| 9 | Nenhum filtro por `tipo` de carta é aplicado ao pool default. `product.md` não distingue cartas "elegíveis para deck" de outras — monstro, magia, armadilha, equipamento e ritual entram todos no baralho de 40 no jogo original. O catálogo inteiro (722, todos os tipos) é o fallback. | `product.md` (schema de carta e regras); ausência de exclusão explícita no PRD | confirmada — revisitar se o dado de balanceamento (item 7) restringir tipos |
| 10 | F02 introduz a tabela `active_decks` (já prevista em `arquitetura.md` §5.1, mas ainda não criada por nenhuma feature) porque é a primeira a precisar dela — a ordem das waves do PRD (F02 na Wave 2, F07 na Wave 5) exige que exista um deck ativo muito antes de F07 existir. F07 herda a mesma tabela e o mesmo formato de coluna `cards jsonb`, sem redesenhá-la. | `arquitetura.md` §5.1; PRD §8 Parte 3 (Execution Waves) | confirmada |
| 11 | A escrita em `collections` e `active_decks` acontece por uma **única função Postgres `SECURITY DEFINER`** (`persistir_deck_inicial`), nunca por INSERT direto do cliente — mesmo padrão de F01 Decisão 8. Adicionalmente, o **privilégio de execução (`GRANT EXECUTE`)** dessa função é restrito a um papel de execução confiável (não `authenticated`/`anon`), porque, diferente de uma recompensa (F03, onde o servidor decide a carta), aqui o *conteúdo* do deck é calculado antes da chamada — sem essa restrição, um cliente poderia chamar a RPC diretamente com um deck forjado (não aleatório) que ainda passa nas checagens estruturais de 40/≤3. A função ainda valida a estrutura do payload como defesa em profundidade. | `arquitetura.md` §5.2 ("nunca confiar em valor vindo do cliente"); ADR-006 (mesmo espírito de integridade que a economia) | confirmada — **a confirmar o papel exato de execução quando Auth/Cadastro definir seu mecanismo de disparo** |
| 12 | Idempotência em duas camadas: (a) em TypeScript, `garantirDeckInicial` verifica se já existe `active_decks` para o jogador antes de sortear; (b) na mesma transação da RPC, `INSERT ... ON CONFLICT (player_id) DO NOTHING` garante que, mesmo sob corrida entre duas chamadas simultâneas, apenas uma persiste. A segunda chamada (seja por reentrega do evento externo, seja pela guarda defensiva) devolve o deck já existente em vez de erro. | PRD §6 F02 Error Handling ("repete a geração (idempotente) até obter um deck válido persistido"); `arquitetura.md` §5 (idempotência por identificador) | confirmada |
| 13 | Se a coleção do jogador já tiver sido incrementada por F03 antes de F02 rodar (ordem anômala de eventos, não esperada mas possível sob falha/reentrega), a RPC faz `UPSERT` **somando** à quantidade existente em `collections`, nunca sobrescrevendo — para não apagar um crédito de recompensa já aplicado. | PRD §6 F03 Capabilities (a coleção soma, nunca substitui); consistência com ADR-006 | confirmada |
| 14 | A guarda defensiva de reprocessamento (chamada por qualquer tela que exija deck ativo e não o encontre) é síncrona e sob demanda nesta versão — não há fila/worker dedicado. Isso é suficiente porque a mesma operação idempotente pode ser chamada quantas vezes forem necessárias sem custo de correção. | PRD §6 F02 Error Handling; simplicidade preferida na ausência de um requisito explícito de fila para este caso | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/deck-inicial/tipos.ts` | shared | novo | `PoolInicialConfig` |
| `packages/shared/src/deck-inicial/schema.ts` | shared | novo | `PoolInicialConfigSchema` (zod) |
| `packages/shared/src/deck-inicial/catalogo.ts` | shared | novo | Interface `ConsultaPoolCartas` — capacidade adicional sobre o catálogo, implementada por `banco-de-cartas`/F03 |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos contratos de `deck-inicial` |
| `packages/rules/src/deck-inicial/pool.ts` | rules | novo | `resolverPoolInicial` — loader + fallback neutro + validação do tamanho mínimo |
| `packages/rules/src/deck-inicial/sorteio.ts` | rules | novo | `FonteAleatoria`, `sortearDeckInicial` — algoritmo puro de sorteio |
| `packages/rules/src/deck-inicial/validacao.ts` | rules | novo | `verificarInvariantesDeckGerado` — rede de proteção pós-sorteio |
| `packages/rules/src/deck-inicial/gerar.ts` | rules | novo | `gerarDeckInicial` — composição pura de pool + sorteio + verificação |
| `packages/rules/src/deck-inicial/index.ts` | rules | novo | Export público do subsistema |
| `packages/rules/README.md` | rules | alterado | Acrescenta `deck-inicial` ao escopo documentado do pacote |
| `packages/rules/src/deck-inicial/pool.test.ts` | rules | novo | Unitários de `resolverPoolInicial` |
| `packages/rules/src/deck-inicial/sorteio.test.ts` | rules | novo | Unitários + property-based de `sortearDeckInicial` |
| `packages/rules/src/deck-inicial/validacao.test.ts` | rules | novo | Unitários de `verificarInvariantesDeckGerado` |
| `packages/rules/src/deck-inicial/gerar.test.ts` | rules | novo | Unitários e propriedades da composição completa |
| `supabase/migrations/0002_create_active_decks_and_rpc_gerar_deck_inicial.sql` | raiz | novo | Tabela `active_decks`, RLS, RPC `persistir_deck_inicial`, restrição de `GRANT EXECUTE` |
| `apps/web/src/lib/deck-inicial/fonte-aleatoria-criptografica.ts` | web | novo | Implementação de produção de `FonteAleatoria` (não semeada) |
| `apps/web/src/lib/deck-inicial/repositorio-supabase.ts` | web | novo | Chamada da RPC e leitura de `active_decks` |
| `apps/web/src/lib/deck-inicial/garantir-deck-inicial.ts` | web | novo | Orquestrador idempotente: pool + sorteio + persistência |
| `apps/web/src/lib/deck-inicial/ao-conta-criada.ts` | web | novo | Handler do contrato externo esperado por Auth/Cadastro |
| `apps/web/src/lib/deck-inicial/guardar-entrada-duelo.ts` | web | novo | Guarda defensiva para telas que exigem deck ativo (Build Deck; Free Duel/Online Duel cross-PRD) |
| `apps/web/tests/deck-inicial.integration.test.ts` | web | novo | Integração de migração, RPC, RLS e idempotência |

**Verificação da direção de dependências:** `packages/shared` continua sem importar nenhum
pacote do monorepo. `packages/rules/src/deck-inicial/` importa **apenas** `packages/shared` e,
internamente ao mesmo pacote, as funções de serialização já existentes em
`packages/rules/src/colecao/` — nenhum import de `packages/data` (o catálogo entra por injeção,
mesmo padrão de F01 Decisão 12). `apps/web` importa `shared`, `rules` e `data` (para instanciar o
adaptador concreto do catálogo). Nenhum deles importa `engine`, `ai` ou `server`. A direção
`shared ← data ← rules` de `arquitetura.md` §2 é respeitada.

Esta feature **não toca `packages/engine`**, então as garantias de PRNG semeado no estado de
duelo não se aplicam (ver Decisão 6). A fronteira de I/O permanece explícita e verificável por
análise estática, no mesmo padrão de F01:

- `packages/rules/src/deck-inicial/**` não importa React, DOM, `fetch`, Supabase, `node:crypto`
  nem qualquer API de I/O — recebe o pool, a fonte aleatória e o catálogo como argumentos.
- `apps/web/src/lib/deck-inicial/**` é o único ponto com Supabase e com a implementação real de
  `FonteAleatoria`.
- Nenhum arquivo de `apps/web` reimplementa o algoritmo de sorteio ou o cálculo de "40/≤3"; ambos
  vêm de `packages/rules`.

## 3. Design Técnico

### Estruturas de dados

**`PoolInicialConfig`** — configuração opcional e tunável do pool de sorteio:

| Campo | Tipo | Semântica |
|---|---|---|
| `versao` | `string` | Identificador da versão da configuração de pool (rastreabilidade, `arquitetura.md` §4.1) |
| `numeros` | `readonly NumeroCarta[]` (opcional) | Lista explícita de cartas elegíveis ao sorteio. Ausente ou vazia ⇒ fallback (ver Fluxo) |

Enquanto o dado de balanceamento (Decisão 7) não é fornecido, nenhuma instância concreta de
`PoolInicialConfig` com `numeros` preenchido existe no repositório — o loader é chamado sem
configuração e sempre cai no fallback.

**Reuso de F01** — o resultado do sorteio e a coleção inicial usam os mesmos tipos já definidos
por F01, sem redefinição:
- `Colecao` — `ReadonlyMap<NumeroCarta, number>`, a forma em memória do deck/coleção gerados.
- `ColecaoSerializada` — `Readonly<Record<NumeroCarta, number>>`, a forma de transporte para a
  RPC e para a coluna `cards jsonb` de `active_decks`.

**`FonteAleatoria`** — interface injetável de aleatoriedade (guidelines §12.2), com um único
método `proximoInteiro(limiteExclusivo: number): number`, devolvendo um inteiro em
`[0, limiteExclusivo)`. Testes usam uma fonte determinística (sequência fixa); a produção usa
uma fonte real baseada em `crypto` (fora de `packages/rules`).

**`ResultadoGeracao`** — o que `garantirDeckInicial` devolve ao chamador:

| Campo | Tipo | Semântica |
|---|---|---|
| `deck` | `Colecao` | O deck ativo inicial, 40 cartas, ≤3 cópias |
| `criadoAgora` | `boolean` | `true` se esta chamada gerou e persistiu o deck; `false` se já existia (idempotência) |

### Fluxo

**Resolução do pool** (`resolverPoolInicial`, em `packages/rules` — puro):

1. Se `config` está ausente, ou `config.numeros` está vazio, o pool resolvido é **todo** o
   catálogo — `catalogo.listarNumeros()` — sem filtro por `tipo` (Decisão 9).
2. Se `config.numeros` está presente, cada `numero` é checado contra o catálogo
   (`ConsultaCatalogo.getByNumero`, reusada de F01): `numero` sem carta correspondente é
   descartado e registrado, na mesma convenção de F01 ("desconhecidas").
3. `numero` duplicado dentro de `config.numeros` é descartado, mantendo a primeira ocorrência, e
   registrado como duplicata.
4. O pool resolvido (fallback ou configurado e filtrado) precisa ter **ao menos 14** números
   distintos (Decisão 8). Menos que isso ⇒ `Result` de erro `pool_inicial_insuficiente` —
   nenhum deck é gerado, e a mensagem "Pool inicial insuficiente para gerar deck válido." é
   propagada (PRD §6 F02 Error Handling).

**Sorteio** (`sortearDeckInicial`, em `packages/rules` — puro):

5. Expande o pool: cada `numero` aparece **exatamente 3 vezes** num array de trabalho — o
   máximo de cópias possível para aquele número.
6. Embaralha o array de trabalho por Fisher–Yates, usando `FonteAleatoria.proximoInteiro` a cada
   troca — nunca `Math.random()` dentro da função pura.
7. Toma as **40 primeiras** posições do array embaralhado.
8. Reduz a lista de 40 elementos (com repetições) a um `Colecao` — `numero → quantidade`. Como
   cada `numero` aparecia no máximo 3 vezes no array de origem, a quantidade de qualquer `numero`
   no resultado nunca excede 3, e a soma das quantidades é sempre 40, por construção — sem laço
   de rejeição.

**Verificação** (`verificarInvariantesDeckGerado`, em `packages/rules` — puro, rede de proteção):

9. Confirma que a soma das quantidades é exatamente 40 e que nenhuma quantidade excede 3. Como o
   passo 8 já garante isso estruturalmente, esta função nunca deveria falhar em produção — existe
   como assertiva testável e como defesa contra uma futura mudança no algoritmo de sorteio que
   quebre a garantia estrutural sem que ninguém perceba.

**Composição pura** (`gerarDeckInicial`, em `packages/rules`):

10. Encadeia os passos 1–9: `resolverPoolInicial` → `sortearDeckInicial` →
    `verificarInvariantesDeckGerado`, devolvendo `Result<Colecao, DomainError>` numa única
    chamada. É a função que a orquestração impura consome.

**Orquestração idempotente** (`garantirDeckInicial`, em `apps/web` — impuro):

11. Verifica, por leitura direta, se já existe uma linha em `active_decks` para o `playerId`. Se
    existir, devolve `{ deck, criadoAgora: false }` sem tocar em pool, sorteio ou escrita — a
    checagem em TypeScript da idempotência (Decisão 12-a).
12. Se não existir, chama `gerarDeckInicial` com a fonte aleatória de produção e o adaptador
    concreto do catálogo.
13. Chama a RPC `persistir_deck_inicial(player_id, cartas)` (Seção 4/5), que, na mesma transação:
    tenta inserir a linha em `active_decks` com `ON CONFLICT (player_id) DO NOTHING`; só se a
    inserção realmente aconteceu, faz `UPSERT` somando as quantidades em `collections`
    (Decisão 13); devolve `criado_agora` e o `cards` persistido (seja o recém-criado, seja o
    já existente encontrado na corrida).
14. Devolve `{ deck, criadoAgora }` ao chamador, usando o `cards` que a RPC efetivamente
    persistiu — nunca o calculado localmente, para nunca divergir do que está no banco em caso
    de corrida (Decisão 12-b).

**Handler do contrato externo** (`aoContaCriada`, em `apps/web`):

15. Recebe `playerId` do evento "conta criada" (Auth/Cadastro, cross-PRD) e chama
    `garantirDeckInicial`. Tolera reentrega: uma segunda chamada com o mesmo `playerId` é um
    no-op observável (`criadoAgora: false`), nunca um erro.

**Guarda defensiva** (`garantirEntradaDuelo`, em `apps/web`):

16. Chamada por qualquer tela que precise do deck ativo (Build Deck ao abrir; Free Duel/Online
    Duel cross-PRD ao iniciar). Lê `active_decks`; se ausente, chama `garantirDeckInicial`
    novamente (mesma operação idempotente do handler) e expõe um estado "preparando" enquanto a
    chamada está em voo, sustentando a mensagem "Preparando seu deck inicial…" do PRD.

### Regras de negócio

- **Exatamente 40 cartas, no máximo 3 cópias por carta** — invariante de Fase 0.3, garantido
  estruturalmente pelo algoritmo de sorteio (passo 8), não por validação a posteriori.
- **Coleção inicial == deck inicial**: a quantidade possuída de cada carta sorteada é igual à
  quantidade no deck — não há carta "sobrando" fora do deck no dia 0. — PRD §6 F02 Capabilities
- **Disparada uma única vez por conta**: garantido por idempotência em duas camadas (Decisão 12),
  não por confiar que o evento externo chega exatamente uma vez. — PRD §6 F02 Capabilities
- **Pool mínimo de 14 números distintos** — derivação matemática do invariante 40/≤3
  (Decisão 8).
- **Nenhum valor de balanceamento inventado**: na ausência de configuração, o fallback é o
  catálogo inteiro, nunca uma lista arbitrária de cartas "boas" ou "ruins" escolhida por esta
  spec. — Fase 0.4
- **Crédito de F03 nunca é apagado**: se a coleção já tiver quantidade de uma carta antes de F02
  rodar, a persistência soma, não substitui (Decisão 13).

### Eventos

Não se aplica ao Effect System do motor de duelo (`onSummon`, `onAttackDeclared`, …) — esta
feature não emite nem consome eventos de duelo. O único "evento" relevante é o contrato externo
"conta criada" (Auth/Cadastro), tratado como uma chamada de função (`aoContaCriada`), não como um
evento do motor.

### Determinismo e pureza

Não se aplica o invariante de PRNG semeado **no estado de duelo** (`arquitetura.md` §3.1) — essa
garantia existe para permitir replay de partidas em `packages/engine`, e esta feature não produz
nem consome `EstadoDuelo`. As garantias relevantes aqui são de **pureza de `packages/rules`**,
mesmo padrão de F01:

- `resolverPoolInicial`, `sortearDeckInicial`, `verificarInvariantesDeckGerado` e
  `gerarDeckInicial` não executam I/O, não leem relógio nem ambiente, e não chamam
  `Math.random()` diretamente — toda aleatoriedade entra pela `FonteAleatoria` injetada
  (guidelines §12.2).
- Dado o mesmo pool e a mesma sequência de `FonteAleatoria.proximoInteiro`, `sortearDeckInicial`
  devolve sempre o mesmo `Colecao` — útil para testes determinísticos, não para replay de
  jogador.
- As estruturas devolvidas são imutáveis (`Readonly`, guidelines §6.3).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`PoolInicialConfigSchema`** — `{ versao: string; numeros?: NumeroCartaSchema[] }` (zod).
  Tipo derivado `PoolInicialConfig`. Existe para validar a fronteira caso a configuração venha de
  um arquivo de dados versionado ou de uma tabela de configuração — nenhum dos dois existe ainda
  (Decisão 7).
- **`ConsultaPoolCartas`** — interface de capacidade adicional sobre o catálogo:
  `listarNumeros(): readonly NumeroCarta[]`. Implementada por `banco-de-cartas`/F03, ao lado de
  `ConsultaCatalogo` (F01). Falsificável em teste por uma lista fixa em memória.
- **`Colecao`, `ColecaoSerializada`, `NumeroCarta`, `Carta`, `Result`, `DomainError`** — reusados
  de `packages/shared` conforme a spec de F01. **Não são redefinidos aqui.**

Códigos de `DomainError` introduzidos por esta feature: `pool_inicial_insuficiente`,
`deck_inicial_invalido` (falha da rede de proteção — nunca esperada em produção),
`deck_inicial_indisponivel` (falha de persistência após a tentativa atual, retomável).
Reusa `catalogo_indisponivel` e `sessao_ausente` de F01 onde aplicável.

### Funções públicas

```
// packages/rules/src/deck-inicial — puro, sem I/O

resolverPoolInicial(
  config: PoolInicialConfig | undefined,
  catalogo: ConsultaCatalogo & ConsultaPoolCartas,
): Result<readonly NumeroCarta[], DomainError>
  // pós: ok ⇒ lista de numero distintos, tamanho >= 14
  //      erro pool_inicial_insuficiente ⇒ menos de 14 numeros distintos após resolver e filtrar

sortearDeckInicial(
  pool: readonly NumeroCarta[],
  fonteAleatoria: FonteAleatoria,
): Result<Colecao, DomainError>
  // pré: pool com numeros distintos e tamanho >= 14
  // pós: ok ⇒ soma das quantidades === 40; nenhuma quantidade > 3; todo numero pertence ao pool

verificarInvariantesDeckGerado(deck: Colecao): Result<Colecao, DomainError>
  // pós: ok ⇒ o mesmo deck recebido; erro deck_inicial_invalido ⇒ soma != 40 ou alguma
  //      quantidade > 3 (nunca esperado após sortearDeckInicial)

gerarDeckInicial(
  config: PoolInicialConfig | undefined,
  catalogo: ConsultaCatalogo & ConsultaPoolCartas,
  fonteAleatoria: FonteAleatoria,
): Result<Colecao, DomainError>
  // pós: composição de resolverPoolInicial -> sortearDeckInicial -> verificarInvariantesDeckGerado
```

```
// apps/web/src/lib/deck-inicial — fronteira de I/O

garantirDeckInicial(playerId: string): Promise<Result<ResultadoGeracao, DomainError>>
  // pós: ok, criadoAgora=true ⇒ deck recem-gerado e persistido nesta chamada
  //      ok, criadoAgora=false ⇒ deck ja existia (idempotencia); nenhuma escrita nova
  //      erro ⇒ pool_inicial_insuficiente | catalogo_indisponivel | deck_inicial_indisponivel

aoContaCriada(playerId: string): Promise<Result<ResultadoGeracao, DomainError>>
  // contrato esperado por Auth/Cadastro; tolera reentrega (at-least-once)
  // pós: equivalente a garantirDeckInicial(playerId)

garantirEntradaDuelo(playerId: string): Promise<Result<Colecao, DomainError>>
  // pós: ok ⇒ deck ativo existente (apos garantir, se necessario)
  //      erro ⇒ mesma familia de garantirDeckInicial; UI exibe "Preparando seu deck inicial…"
  //      enquanto a promise nao resolve
```

### Endpoints / RPC / mensagens de rede

RPC Postgres `persistir_deck_inicial(player_id uuid, cartas jsonb) RETURNS TABLE(criado_agora
boolean, cartas jsonb)`, `SECURITY DEFINER`, com `GRANT EXECUTE` restrito a um papel de execução
confiável (Decisão 11) — **não** concedida a `authenticated`/`anon`. Dentro da mesma transação:

1. Valida a estrutura de `cartas`: toda chave casa `^[0-9]{3}$`, todo valor é inteiro entre 1 e 3,
   e a soma dos valores é exatamente 40. Payload fora disso é rejeitado sem escrever nada
   (defesa em profundidade, mesmo com o `GRANT` restrito).
2. `INSERT INTO active_decks (player_id, cards) VALUES (...) ON CONFLICT (player_id) DO NOTHING`.
3. Se a linha 2 inseriu (`FOUND`), faz `UPSERT` em `collections` somando cada quantidade de
   `cartas` à quantidade existente (Decisão 13) e devolve `criado_agora = true` com o `cartas`
   recém-inserido.
4. Se a linha 2 **não** inseriu (conflito — já existia), lê o `cards` já persistido em
   `active_decks` e devolve `criado_agora = false` com esse valor, **sem** tocar em
   `collections`.

Requisição (chamada apenas pelo contexto server-side confiável, nunca pelo navegador):

```json
{
  "player_id": "6f1c2e10-...-9a3b",
  "cartas": { "001": 3, "045": 2, "128": 3, "333": 1 }
}
```

Resposta na primeira chamada:

```json
{
  "criado_agora": true,
  "cartas": { "001": 3, "045": 2, "128": 3, "333": 1 }
}
```

Resposta numa segunda chamada (idempotência — mesmo `player_id`):

```json
{
  "criado_agora": false,
  "cartas": { "001": 3, "045": 2, "128": 3, "333": 1 }
}
```

### Contratos externos (cross-PRD)

- **`ConsultaCatalogo` / `ConsultaPoolCartas`** — *a serem fornecidas por `banco-de-cartas`/F03.*
  Enquanto não existem, os testes de `packages/rules` usam um catálogo falso em memória
  (guidelines §12.1), e `apps/web` não consegue instanciar o adaptador real — a chamada falha
  explicitamente com `catalogo_indisponivel`, nunca gera um deck parcial.
- **Auth/Cadastro** — *a ser fornecido por Auth/Cadastro.* Espera-se a invocação de
  `aoContaCriada(playerId)` exatamente uma vez após o cadastro; F02 tolera reentrega. O
  mecanismo exato (webhook pós-signup, trigger em `auth.users`, fila) é decisão de Auth/Cadastro,
  não desta spec.
- **Free Duel / Online Duel (cross-PRD)** — *contrato oferecido a esses módulos.* Antes de
  liberar a entrada em duelo, cada um deve chamar `garantirEntradaDuelo(playerId)` e aguardar o
  resultado antes de consumir o deck ativo — nunca assumir que ele já existe.
- **F07 — Salvar e Persistir o Deck Ativo** — *contrato oferecido a F07.* A tabela
  `active_decks` e o formato `cards jsonb` (`numero → quantidade`) criados por esta feature são
  os que F07 vai ler e sobrescrever a cada save; F07 não recria a tabela.

## 5. Modelo de Dados

### Postgres / Supabase

| Tabela | Coluna | Tipo | Constraints / Índices |
|--------|--------|------|------------------------|
| `active_decks` | `player_id` | `uuid` | `PRIMARY KEY`, FK → `auth.users(id)` `ON DELETE CASCADE` |
| `active_decks` | `cards` | `jsonb` | `NOT NULL` |
| `active_decks` | `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

- **Chave primária simples:** `player_id`. Cada jogador tem **exatamente uma** linha — reflete o
  "deck único" do PRD (§6 F05 Capabilities: "slot único") e é o que faz
  `ON CONFLICT (player_id) DO NOTHING` funcionar como guarda de idempotência (Decisão 12-b).
- **Sem CHECK declarativo sobre o conteúdo de `cards`:** validar "soma == 40 e cada valor ≤ 3"
  dentro de um `jsonb` exigiria uma função `CHECK` não trivial em SQL puro. A integridade dessa
  regra é responsabilidade **procedural** da RPC `persistir_deck_inicial` (única gravadora desta
  tabela nesta feature) e, mais tarde, da RPC de F07 quando ela passar a sobrescrever `cards`. Um
  `CHECK` futuro pode ser adicionado se uma função imutável de validação for introduzida; não é
  bloqueante para esta feature.
- **Sem FK para uma tabela de cartas:** mesma razão de `collections` em F01 — o catálogo é um
  artefato de build versionado (`arquitetura.md` §4.1), não uma tabela Postgres.

**RLS:** habilitada em `active_decks`. Política única nesta migração — `SELECT` permitido quando
`player_id = auth.uid()`. **Nenhuma política de `INSERT`/`UPDATE`/`DELETE`** é criada: toda
escrita passa pela RPC `SECURITY DEFINER` (Decisão 11), e o `GRANT EXECUTE` dessa RPC é restrito
a um papel de execução confiável — nem o cliente autenticado comum consegue chamá-la
diretamente. Isso fecha duas portas ao mesmo tempo: escrita direta na tabela (bloqueada pela
ausência de política) e chamada direta da RPC com um deck forjado (bloqueada pelo `GRANT`).

**Migração:** `supabase/migrations/0002_create_active_decks_and_rpc_gerar_deck_inicial.sql` cria
a tabela `active_decks`, habilita RLS, cria a política de leitura, e cria a função
`persistir_deck_inicial` com seu `GRANT EXECUTE` restrito. É aditiva e não destrutiva
(guidelines §22.3) — não altera a migração `0001_create_collections.sql` de F01.

**Atomicidade e idempotência:** a função `persistir_deck_inicial` executa como uma única
transação Postgres. A tentativa de inserção em `active_decks` com `ON CONFLICT DO NOTHING` é o
ponto de corte: se ela não inserir, nenhuma escrita em `collections` acontece — não existe estado
intermediário onde `active_decks` tem uma linha nova mas `collections` não foi atualizado, nem
vice-versa (`arquitetura.md` §5.2).

### Cache local / fila offline

Não se aplica a esta feature. A operação acontece uma única vez, do lado do servidor, disparada
por um evento de conta — não há rascunho local nem fila de mutações do jogador envolvida. O
cache local do deck ativo (para leitura offline) e a fila de sincronização de edições pertencem a
F07.

### Arquivos de dados versionados

Nenhum arquivo de dado versionado é criado por esta feature. `PoolInicialConfig` é, por ora, um
parâmetro injetável sem fonte concreta — quando o dado de balanceamento (Decisão 7) for
fornecido, ele deverá chegar como um artefato versionado (formato a decidir: arquivo em
`packages/data` ou tabela de configuração; fora do escopo definir agora), mas o loader
(`resolverPoolInicial`) já está pronto para recebê-lo sem mudança de assinatura.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Falha ao gerar (catálogo indisponível) ou ao persistir (rede/DB) o deck inicial | `catch` em `garantirDeckInicial`/`aoContaCriada` | Operação é idempotente: nova tentativa (via reentrega do evento ou via guarda defensiva) refaz o processo do zero, sem duplicar | `Preparando seu deck inicial…` |
| Pool inicial insuficiente (< 14 números distintos após resolver config + fallback) | `resolverPoolInicial` | Erro de configuração; nenhum deck é gerado; repetir não ajuda até a configuração ser corrigida | `Pool inicial insuficiente para gerar deck válido.` |
| Evento "conta criada" entregue mais de uma vez (at-least-once) | `garantirDeckInicial` encontra `active_decks` já existente, ou `ON CONFLICT` na RPC | No-op: devolve o deck já existente com `criadoAgora: false`; nenhuma escrita nova | — (sem mensagem de erro; entrada normal para quem já tem deck) |
| `numero` configurado em `PoolInicialConfig.numeros` sem carta correspondente no catálogo | `resolverPoolInicial` | Descarta o `numero` do pool resolvido, registra inconsistência, segue com o restante | — (registro técnico) |
| `numero` duplicado em `PoolInicialConfig.numeros` | `resolverPoolInicial` | Mantém a primeira ocorrência, descarta a repetição, registra | — (registro técnico) |
| Serviço de catálogo indisponível (`banco-de-cartas`/F03 não subiu) | Guarda em `garantirDeckInicial` | Falha explícita `catalogo_indisponivel`; nenhum deck parcial ou vazio é persistido | `Preparando seu deck inicial…` (mesma mensagem de bloqueio; reprocessa quando o catálogo voltar) |
| Duas chamadas concorrentes de `garantirDeckInicial` para o mesmo jogador (evento externo duplicado e guarda defensiva disparando ao mesmo tempo) | `ON CONFLICT (player_id)` na RPC | Apenas uma persiste; a outra lê o resultado já gravado — sem exceção, sem deck duplicado | — |
| Coleção já tinha quantidade da carta sorteada antes de F02 rodar (ex.: F03 creditou antes, ordem anômala) | RPC `persistir_deck_inicial` | `UPSERT` **soma** à quantidade existente, nunca sobrescreve — preserva o crédito de F03 | — |
| Chamada direta e não autorizada da RPC por um cliente comum, com deck forjado | `GRANT EXECUTE` restrito + validação estrutural na função | Recusada em dois níveis: permissão negada antes de qualquer lógica; e, mesmo que o `GRANT` fosse concedido por engano, a validação de soma=40/≤3 rejeitaria payload malformado | `Não foi possível preparar seu deck. Tente novamente.` |
| `playerId` inexistente em `auth.users` no momento da persistência (conta removida entre o evento e o processamento) | FK `ON DELETE CASCADE` / falha de FK na inserção | A escrita falha por violação de FK; registrada como inconsistência; nenhuma linha órfã é criada | — (cenário técnico, sem jogador ativo para receber mensagem) |
| Tentativa de entrar em Free Duel/Online Duel/Build Deck antes do deck inicial existir | `garantirEntradaDuelo` não encontra `active_decks` | Dispara `garantirDeckInicial` novamente e bloqueia a navegação enquanto a promise está pendente | `Preparando seu deck inicial…` |

Todo descarte é **registrado**, nunca silencioso (guidelines §8.3), com `playerId` e `numero` no
contexto dos logs estruturados, sem dado sensível (guidelines §23.3).

## 7. Estratégia de Testes

### Unitários (Vitest)

`resolverPoolInicial`:
- `resolverPoolInicial devolve o catalogo inteiro quando a configuracao esta ausente`
- `resolverPoolInicial devolve o catalogo inteiro quando numeros esta vazio`
- `resolverPoolInicial usa a lista configurada quando presente e valida contra o catalogo`
- `resolverPoolInicial descarta numero configurado sem carta no catalogo e registra`
- `resolverPoolInicial descarta numero duplicado mantendo a primeira ocorrencia`
- `resolverPoolInicial falha com pool_inicial_insuficiente quando ha menos de catorze numeros distintos`
- `resolverPoolInicial aceita pool com exatamente catorze numeros distintos`

`sortearDeckInicial`:
- `sortearDeckInicial devolve exatamente quarenta cartas para um pool de catorze numeros`
- `sortearDeckInicial nunca produz mais de tres copias de um mesmo numero`
- `sortearDeckInicial usa apenas numeros presentes no pool recebido`
- `sortearDeckInicial e deterministico para a mesma fonte aleatoria e o mesmo pool`
- `sortearDeckInicial falha quando o pool recebido tem menos de catorze numeros distintos`

`verificarInvariantesDeckGerado`:
- `verificarInvariantesDeckGerado aceita deck com quarenta cartas e no maximo tres copias`
- `verificarInvariantesDeckGerado rejeita deck com total diferente de quarenta`
- `verificarInvariantesDeckGerado rejeita deck com quatro ou mais copias de uma carta`

`gerarDeckInicial` (composição):
- `gerarDeckInicial devolve um deck valido de quarenta cartas usando o fallback do catalogo inteiro`
- `gerarDeckInicial propaga pool_inicial_insuficiente quando o pool configurado e pequeno demais`
- `gerarDeckInicial propaga catalogo_indisponivel quando a consulta ao catalogo falha`

`garantirDeckInicial` / `aoContaCriada` (com repositório e fonte aleatória falsos, guidelines
§12.1):
- `garantirDeckInicial gera e persiste um deck quando nao existe active_decks para o jogador`
- `garantirDeckInicial devolve criadoAgora falso quando ja existe active_decks para o jogador`
- `garantirDeckInicial nao chama o sorteio quando o deck ja existe`
- `aoContaCriada e um no-op observavel na segunda chamada com o mesmo playerId`

`garantirEntradaDuelo`:
- `garantirEntradaDuelo devolve o deck existente sem chamar garantirDeckInicial quando ja existe active_decks`
- `garantirEntradaDuelo chama garantirDeckInicial quando active_decks esta ausente`

### Property-based (fast-check)

- **Invariante estrutural do sorteio:** para qualquer pool gerado com 14 a 200 números distintos
  e qualquer sequência de `FonteAleatoria.proximoInteiro`, `sortearDeckInicial` sempre devolve um
  `Colecao` cuja soma de quantidades é 40 e nenhuma quantidade excede 3. 1.000 execuções — prova
  o invariante de Fase 0.3 sem enumerar casos.
- **Conservação de origem:** para qualquer pool e qualquer sequência de sorteio, todo `numero`
  presente no `Colecao` resultante pertence ao pool de entrada — nenhuma carta fora do pool
  escapa para o deck.
- **Domínio mínimo do pool:** para todo pool com menos de 14 números distintos,
  `resolverPoolInicial` e `sortearDeckInicial` sempre falham com `pool_inicial_insuficiente`,
  nunca devolvem um deck parcial.
- **Idempotência da composição:** para qualquer `PoolInicialConfig` e catálogo fixos,
  `verificarInvariantesDeckGerado(sortearDeckInicial(...))` nunca rejeita o resultado de
  `sortearDeckInicial` — a rede de proteção e o gerador nunca discordam entre si.

### Integração

`apps/web/tests/deck-inicial.integration.test.ts`, contra uma instância Supabase local com as
migrações de F01 e desta feature aplicadas:

- `migracao cria active_decks com chave primaria em player_id`
- `RLS permite ao jogador ler apenas sua propria linha em active_decks`
- `RLS nao expoe uma politica de insert ou update para o cliente em active_decks`
- `o papel authenticated nao consegue executar persistir_deck_inicial diretamente`
- `persistir_deck_inicial recusa payload cujo total de cartas e diferente de quarenta`
- `persistir_deck_inicial recusa payload com mais de tres copias de uma carta`
- `persistir_deck_inicial grava active_decks e collections na mesma transacao`
- `persistir_deck_inicial e um no-op quando chamada duas vezes para o mesmo player_id`
- `persistir_deck_inicial soma a quantidade existente em collections em vez de sobrescrever`
- `remover o usuario em auth.users remove sua linha de active_decks em cascata`
- `garantirDeckInicial contra o banco real persiste um deck valido e legivel por RLS`

### Análise estática

- `packages/rules/src/deck-inicial/**` não importa React, DOM, `fetch`, Supabase, `node:crypto`
  nem `node:process` — a regra de geração é pura e testável sem navegador nem banco
  (guidelines §3.3, §12).
- `packages/rules` continua importando apenas `packages/shared` (mais o subsistema `colecao`
  interno ao próprio pacote); nenhum import de `engine`, `ai`, `web` ou `server`.
- `packages/shared` continua sem importar nenhum outro pacote do monorepo.
- Nenhum arquivo de `apps/web` reimplementa o algoritmo de expansão/embaralhamento do pool nem o
  cálculo de 40/≤3 — ambos vêm exclusivamente de `packages/rules` (ADR-004).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD, F02) | Teste |
|---|---|
| Ao criar a conta, um deck de exatamente 40 cartas com ≤ 3 cópias é gerado e marcado como ativo em até 2 s | `sortearDeckInicial devolve exatamente quarenta cartas para um pool de catorze numeros` + a propriedade de invariante estrutural + `persistir_deck_inicial grava active_decks e collections na mesma transacao` (transação única local não introduz latência de rede adicional) |
| As 40 cartas geradas são também a coleção inicial (coleção == deck no dia 0) | `persistir_deck_inicial grava active_decks e collections na mesma transacao` — mesmo `cartas` escrito nas duas tabelas |
| 100% das contas criadas terminam com um deck ativo válido; falha na geração é reprocessada até persistir um deck válido | `garantirDeckInicial gera e persiste um deck quando nao existe active_decks para o jogador` + `garantirEntradaDuelo chama garantirDeckInicial quando active_decks esta ausente` (a guarda defensiva é o mecanismo de reprocessamento) |
| (Pendente — dado de balanceamento) Quando o pool inicial for definido, o sorteio respeita esse pool | `resolverPoolInicial usa a lista configurada quando presente e valida contra o catalogo` + `sortearDeckInicial usa apenas numeros presentes no pool recebido` — o caminho já está coberto; falta apenas popular `PoolInicialConfig.numeros` quando o dado chegar |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Cross-Feature: fluxo F02 → F04 → F05 → F06 → F07 sem estado inconsistente entre coleção e deck | `persistir_deck_inicial grava active_decks e collections na mesma transacao` — estabelece a base consistente de onde F04/F05/F06 partem; a chave primária simples de `active_decks` e a composta de `collections` (F01) impedem divergência estrutural |
| Cross-Feature: uma carta já creditada por F03 antes de F02 rodar não é perdida | `persistir_deck_inicial soma a quantidade existente em collections em vez de sobrescrever` |
| Cross-PRD (Auth/Cadastro): o evento de criação de conta dispara F02 exatamente uma vez por conta, mesmo sob reentrega | `aoContaCriada e um no-op observavel na segunda chamada com o mesmo playerId` + `persistir_deck_inicial e um no-op quando chamada duas vezes para o mesmo player_id` |
| Cross-PRD (Free Duel / Online Duel): nenhum módulo de duelo recebe deck ausente ou forjado pelo cliente | `garantirEntradaDuelo chama garantirDeckInicial quando active_decks esta ausente` + `o papel authenticated nao consegue executar persistir_deck_inicial diretamente` |
| Cross-PRD (F07 herda a tabela/formato): `active_decks.cards` já nasce no formato `numero → quantidade` que F07 vai consumir | `migracao cria active_decks com chave primaria em player_id` — o esquema criado por esta feature é o mesmo que F07 assume, sem migração adicional de formato |
