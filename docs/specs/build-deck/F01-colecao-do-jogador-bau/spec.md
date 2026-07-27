# Coleção do Jogador (Baú)

> PRD: `docs/prds/build-deck.md` — F01
> Pacote-alvo: `packages/shared` + `packages/rules` (+ `apps/web`, + migração Supabase)

## 1. Contexto e Escopo

Esta feature estabelece a **coleção do jogador** — o conjunto de cartas possuídas com a
quantidade de cada uma — como fonte única da verdade sobre o que pode entrar no deck. É a
**Foundation** do módulo (PRD §8, Parte 2): F02 a semeia, F03 a incrementa, F04 a exibe, F05 a
consome e F06 lê suas quantidades para validar. Fora do módulo, é ela que o **Library** cruza com
o catálogo para distinguir cartas obtidas de não obtidas (PRD §6 F01 Provides; `library.md` §6
F01 Consumes).

O desenho separa três camadas conforme `arquitetura.md` §2 e guidelines §3.2: os **contratos**
(tipos e schemas zod) vivem em `packages/shared`; a **regra de posse** — quem está na coleção,
quanto pode ir para o deck, como a coleção cruza com o catálogo — é composta de funções puras em
`packages/rules`; e o **I/O** (Supabase, IndexedDB, React) fica confinado a `apps/web`. Isso
mantém ADR-004 ("a UI reflete o estado, não implementa regra") e permite que `apps/server`
reuse a mesma regra quando o Online Duel precisar validar um deck contra a coleção, sem
reescrevê-la. A feature pertence à **Fase 2** do roadmap (`arquitetura.md` §9), a primeira que
toca Supabase.

Esta spec é **somente-leitura sobre a coleção**: ela cria o modelo de dados, o caminho de
carregamento e a regra derivada, mas nenhuma escrita. Toda mutação chega pelas features que a
originam.

### Incluído

- Contratos canônicos da coleção — tipos e schemas zod — em `packages/shared`, consumidos por
  Build Deck e Library (PRD F01 Provides)
- Regra pura de posse em `packages/rules`: filtrar cartas com quantidade ≥ 1, calcular o limite
  efetivo `min(quantidade, 3)`, derivar o booleano "obtida", ordenar deterministicamente
- Enriquecimento de cada entrada com os campos do schema canônico da carta, obtidos do catálogo,
  sem inventar campos novos (PRD F01 Capabilities)
- Descarte e registro de `numero` sem correspondência no catálogo (PRD F01 Error Handling)
- Migração Postgres da tabela `collections` com PK composta, constraints e RLS
  (`arquitetura.md` §5.1)
- Store IndexedDB da coleção, gravado a cada leitura bem-sucedida do servidor
  (`arquitetura.md` §5.4)
- Caminho de carregamento servidor → cache com **procedência explícita**, que sustenta o aviso
  "Coleção carregada do cache" exigido pelo PRD
- Hook React fino de consumo, sem store global e sem regra

### Fronteiras

- **Semeadura das 40 cartas iniciais** → **F02**. F01 define onde a coleção mora; quem a
  popula no cadastro é F02. — PRD §6 F02
- **Incremento de +1 por vitória e idempotência por identificador de recompensa** → **F03**.
  A escrita e o `reward_ledger` são de lá. — PRD §6 F03
- **Busca, filtros, ordenação por atributo, virtualização e paginação** → **F04**. F01 entrega a
  estrutura e uma ordenação padrão por `numero`; toda navegação é de F04. — PRD §6 F04
- **Deck em edição, contador "no deck M" e movimentação de cópias** → **F05**. F01 não conhece
  o deck. — PRD §6 F05
- **Validação de 40 cartas e do teto de 3 cópias no deck** → **F06**. F01 expõe o teto por carta
  (`min(qtd,3)`); quem avalia o deck inteiro é F06. — PRD §6 F06
- **Persistência do deck ativo, fila de sincronização offline e conflito entre dispositivos** →
  **F07**. F01 não cria fila de mutações. — PRD §6 F07
- **Lista completa das 722 cartas, incluindo as não obtidas** → **Library** (cross-PRD). A
  coleção contém apenas cartas possuídas. — PRD §7
- **Compra por `estrelas` e desbloqueio por Password** como fontes de crescimento → fora desta
  versão; quando existirem, usarão o mesmo "sink" de F03. — PRD §7
- **Renderização, layout responsivo concreto, animação e som** → camada de UI. — PRD §7

### Contratos externos assumidos

Nenhum dos módulos abaixo está implementado. A spec os trata como contrato externo e o
`plan.md` os lista como pré-requisito.

- **`banco-de-cartas`/F03 — Serviço de Catálogo.** Espera-se `getByNumero(numero): Carta |
  undefined` sobre o dataset selado de 722 cartas, com o schema canônico de 12 campos. F01 o
  consome através da interface `ConsultaCatalogo` (Seção 4), injetada — nunca importado
  diretamente pela regra pura. *A ser fornecido por `banco-de-cartas`.*
- **`banco-de-cartas`/F01 — Ingestão.** Já tem spec em
  `docs/specs/banco-de-cartas/F01-ingestao-e-normalizacao-da-fonte/`, mas não implementação.
  F01 de Build Deck reusa dela `Carta`, `NumeroCarta`, `Result` e `DomainError` em
  `packages/shared`, sem redefinir nenhum. *A ser fornecido por `banco-de-cartas`.*
- **Auth/Cadastro (cross-PRD).** Espera-se uma sessão Supabase Auth autenticada da qual se
  obtém o identificador do jogador; no banco, `player_id` corresponde a `auth.uid()`.
  *A ser fornecido por Auth/Cadastro.*

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A regra pura de posse vive em `packages/rules/src/colecao/`, não em `apps/web`. `arquitetura.md` §2 define `shared` como "schemas e tipos, sem lógica", e guidelines §3.2 define `rules` como "pure rule helpers" — "no máximo 3 cópias" é regra de jogo de `product.md`, não de interface. Consequência aceita: o charter de `packages/rules` passa a cobrir regra de montagem além de Guardian Star/Terrain/Fusion. | entrevista; guidelines §3.2; ADR-004 | confirmada — **registrar a ampliação do charter em `arquitetura.md` §2** |
| 2 | F01 é **somente-leitura** sobre a coleção: entrega migração, RLS, cache e caminho de leitura; toda escrita pertence a quem a origina (F02 semeia, F03 incrementa, F07 persiste o deck). | entrevista; PRD §6 F01 Capabilities ("ver F07") | confirmada |
| 3 | O carregamento devolve uma união discriminada por `origem` (`'servidor' \| 'cache'`) com `sincronizadaEm`, em vez de uma flag booleana. O consumidor não consegue ignorar a procedência sem ler o campo, e a UI decide quando exibir o aviso do PRD. | entrevista; PRD §6 F01 Error Handling | confirmada |
| 4 | Falha de servidor **e** ausência de cache devolvem `Result` de erro, **nunca** uma coleção vazia. Coleção vazia é um estado legítimo (jogador antes de F02 semear) e confundi-lo com falha faria o Library marcar tudo como não obtido. | `library.md` §6 F01 Error Handling ("fail-safe: nenhuma marcada como obtida até carregar") | confirmada |
| 5 | F01 **não** escolhe o adaptador de estado React. Entrega um loader agnóstico de framework e um hook fino; a decisão entre Zustand e `useReducer`+context (aberta em `arquitetura.md` §7) fica para F05, onde existe estado mutável real (rascunho do deck) para justificá-la. | entrevista; `arquitetura.md` §7 | confirmada |
| 6 | O cache local guarda **um registro-snapshot por jogador**, não um registro por carta. A coleção é sempre lida por inteiro (≤ 722 entradas) e a substituição atômica evita uma coleção local meio-atualizada se a escrita falhar no meio. | entrevista; `arquitetura.md` §5.4 | confirmada |
| 7 | A tabela `collections` permite `quantity = 0` (constraint `>= 0` conforme `arquitetura.md` §5.1) e a **leitura** filtra `quantity >= 1`. Nesta versão nenhum caminho decrementa a posse — remover uma carta do deck devolve a cópia ao pool disponível, não à quantidade possuída (PRD §6 F05) — então `0` é um caso defensivo, não um fluxo ativo. | `arquitetura.md` §5.1; PRD §6 F01 e F05 Capabilities | confirmada |
| 8 | Escrita direta do cliente em `collections` **não** recebe política RLS. F01 cria apenas a política de `SELECT`; F02 e F03 escreverão por RPC `SECURITY DEFINER`, conforme a exigência de `arquitetura.md` §5.2 de nunca confiar em valor vindo do cliente. | `arquitetura.md` §5.2; ADR-006 | confirmada |
| 9 | Library e Build Deck consomem **a mesma estrutura**: `quantity` é a fonte única e o booleano "obtida" é derivado como `quantity >= 1`. Isso resolve a divergência entre `library.md` §6 F01 (que pede modelo booleano) e este PRD (que pede quantidade) sem duplicar armazenamento. | `arquitetura.md` §5.1 | confirmada |
| 10 | Não há limite superior de **posse** de uma carta; o teto de 3 é regra de **deck**. A única constraint numérica é `quantity >= 0`. | PRD §6 F03 Capabilities | confirmada |
| 11 | A coleção em memória é um `ReadonlyMap` (busca por chave em O(1), guidelines §17.2) e o formato de transporte/cache é um objeto simples serializável em JSON. As duas formas têm conversão explícita e round-trip verificado. | guidelines §17.2, §6.3 | confirmada |
| 12 | O consumo do catálogo é **injetado** como interface `ConsultaCatalogo`, não importado de `packages/data` pela regra. A direção `data ← rules` permitiria o import direto, mas a injeção mantém os testes de `rules` livres do dataset real (guidelines §12.2). | guidelines §12.2, §10.1 | confirmada |
| 13 | O monorepo ainda não existe. Esta feature assume o scaffolding criado por `banco-de-cartas`/F01 (pnpm workspaces, Turborepo, tsconfig strict, Node.js 24 LTS) e acrescenta os pacotes `rules` e `web`. | spec `banco-de-cartas/F01` Decisão 14; ADR-001 | confirmada |
| 14 | Nenhuma tabela de dado externo pendente (guardiões, terrenos, fusões, drops, rating, balanceamento) é consumida por F01. O pool inicial de balanceamento é pendência de **F02**, não desta feature. | PRD §7; `arquitetura.md` §10 | não se aplica |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/colecao/tipos.ts` | shared | novo | `Colecao`, `ColecaoSerializada`, `EntradaColecao`, `ItemColecao`, `ColecaoEnriquecida`, `ColecaoCarregada`, `OrigemColecao` |
| `packages/shared/src/colecao/schema.ts` | shared | novo | `ColecaoSerializadaSchema`, `LinhaColecaoSchema`, `SnapshotColecaoSchema` (zod) |
| `packages/shared/src/colecao/catalogo.ts` | shared | novo | Interface `ConsultaCatalogo` — contrato de leitura do catálogo, implementado por `banco-de-cartas`/F03 |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os contratos da coleção no export público do pacote |
| `packages/rules/package.json` | rules | novo | Pacote com dependência `workspace:` em `shared` |
| `packages/rules/README.md` | rules | novo | Propósito, exports públicos, direção de dependência (guidelines §21.3) |
| `packages/rules/src/colecao/serializacao.ts` | rules | novo | `serializarColecao` / `desserializarColecao` entre `ReadonlyMap` e objeto JSON |
| `packages/rules/src/colecao/posse.ts` | rules | novo | `entradasPossuidas`, `quantidadePossuida`, `possui`, `limiteCopias` |
| `packages/rules/src/colecao/enriquecer.ts` | rules | novo | `enriquecerColecao` — cruza a coleção com o catálogo e separa `numero` desconhecido |
| `packages/rules/src/colecao/library.ts` | rules | novo | `derivarObtidas` — leitura booleana consumida pelo Library (cross-PRD) |
| `packages/rules/src/colecao/index.ts` | rules | novo | Export público do subsistema de coleção |
| `packages/rules/src/index.ts` | rules | novo | Export público estável do pacote (guidelines §5.1) |
| `packages/rules/src/colecao/posse.test.ts` | rules | novo | Unitários de posse e limite, table-driven (guidelines §11.2) |
| `packages/rules/src/colecao/enriquecer.test.ts` | rules | novo | Unitários de enriquecimento e descarte de desconhecidas |
| `packages/rules/src/colecao/serializacao.test.ts` | rules | novo | Unitários de conversão + propriedades de round-trip (fast-check) |
| `packages/rules/src/colecao/library.test.ts` | rules | novo | Unitários da leitura booleana |
| `supabase/migrations/0001_create_collections.sql` | raiz | novo | Tabela `collections`, constraints, RLS e política de `SELECT` |
| `apps/web/package.json` | web | novo | App Next.js com dependências `workspace:` em `shared`, `rules`, `data` |
| `apps/web/src/lib/supabase/cliente.ts` | web | novo | Criação do cliente Supabase a partir da sessão autenticada |
| `apps/web/src/lib/colecao/repositorio-supabase.ts` | web | novo | Leitura de `collections` por `player_id` e validação zod da resposta |
| `apps/web/src/lib/colecao/cache-indexeddb.ts` | web | novo | Store `colecao`: leitura e gravação do snapshot por jogador |
| `apps/web/src/lib/colecao/carregar-colecao.ts` | web | novo | Orquestra servidor → cache, define `origem`, grava o snapshot |
| `apps/web/src/hooks/use-colecao.ts` | web | novo | Hook fino: dispara o carregamento e expõe carregando/pronto/erro |
| `apps/web/tests/colecao.integration.test.ts` | web | novo | Integração do carregamento, fallback de cache e RLS |
| `.dependency-cruiser.cjs` | raiz | alterado | Acrescenta as regras de fronteira de `rules` e `web` |

**Verificação da direção de dependências:** `packages/shared` continua sem importar nenhum
pacote do monorepo. `packages/rules` importa **apenas** `packages/shared` — o catálogo entra por
injeção (Decisão 12), então não há import de `packages/data` nesta feature. `apps/web` importa
`shared`, `rules` e `data`. Nenhum deles importa `engine`, `ai` ou `server`. A direção
`shared ← data ← rules` de `arquitetura.md` §2 é respeitada.

Esta feature **não toca `packages/engine`**, portanto as garantias de PRNG semeado e de estado de
duelo serializável não se aplicam. A fronteira de I/O, no entanto, é explícita e verificada por
análise estática:

- `packages/rules/src/**` não importa React, DOM, `fetch`, Supabase, `node:fs` nem qualquer API
  de I/O — recebe a coleção e o catálogo como argumentos e devolve estruturas em memória.
- `apps/web/src/lib/**` é o **único** ponto com Supabase e IndexedDB, conforme guidelines §7.3
  ("keep async functions at I/O boundaries") e §19.2.
- Nenhum arquivo de `apps/web` recalcula `min(quantidade, 3)` ou o predicado "obtida" por conta
  própria; ambos vêm de `packages/rules`.

## 3. Design Técnico

### Estruturas de dados

**`Colecao`** — forma em memória: `ReadonlyMap<NumeroCarta, number>`, de `numero` para
quantidade possuída. Busca por chave em O(1) (guidelines §17.2), que é o acesso dominante em
F05/F06 ao checar se uma carta pode entrar no deck.

**`ColecaoSerializada`** — forma de transporte e de cache: objeto simples
`Readonly<Record<NumeroCarta, number>>`, serializável em JSON sem perda. É o que trafega no
IndexedDB e o que a leitura do Postgres monta a partir das linhas.

**`EntradaColecao`** — par possuído, já filtrado:

| Campo | Tipo | Semântica |
|---|---|---|
| `numero` | `NumeroCarta` | String `^[0-9]{3}$`, identidade da carta |
| `quantidade` | `number` | Inteiro ≥ 1. Entradas com 0 não chegam aqui |

**`ItemColecao`** — entrada enriquecida, o que o editor e o Library consomem:

| Campo | Tipo | Semântica |
|---|---|---|
| `carta` | `Carta` | Os 12 campos do schema canônico, vindos do catálogo. Nenhum campo novo |
| `quantidade` | `number` | Inteiro ≥ 1, quantidade possuída |
| `limiteCopias` | `number` | `min(quantidade, 3)` — teto de cópias desta carta no deck |

**`ColecaoEnriquecida`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `itens` | `readonly ItemColecao[]` | Ordenado por `numero` crescente |
| `desconhecidas` | `readonly NumeroCarta[]` | `numero` possuído sem carta no catálogo; ocultado do editor e registrado |

**`ColecaoCarregada`** — união discriminada por procedência (Decisão 3):

```
| { origem: 'servidor'; colecao: Colecao; sincronizadaEm: string }
| { origem: 'cache';    colecao: Colecao; sincronizadaEm: string }
```

`sincronizadaEm` é ISO 8601 e indica quando o dado saiu do servidor — no ramo `'cache'`, é o
carimbo gravado na última leitura bem-sucedida, não o instante da leitura local.

**`SnapshotColecao`** — o registro no IndexedDB: `{ playerId, entradas: ColecaoSerializada,
sincronizadaEm }`.

### Fluxo

**Carregamento da coleção** (`carregarColecao`, em `apps/web`):

1. **Resolver o jogador.** Obtém o identificador da sessão Supabase Auth (contrato externo).
   Sem sessão autenticada, devolve erro `sessao_ausente` sem tocar em rede ou cache.
2. **Ler do servidor.** Consulta `collections` filtrando por `player_id`; a RLS já restringe o
   resultado às linhas do próprio jogador, e o filtro explícito é defesa em profundidade.
3. **Validar a resposta.** Cada linha passa por `LinhaColecaoSchema`. Linha inválida (quantidade
   negativa, `numero` fora do formato) é descartada e registrada, sem derrubar o carregamento.
4. **Gravar o snapshot.** Sucesso na leitura ⇒ substitui o registro do jogador no IndexedDB por
   inteiro, com `sincronizadaEm` do instante da leitura. Falha ao gravar não invalida o dado do
   servidor: registra `warn` e segue.
5. **Devolver com procedência `'servidor'`.**
6. **Fallback.** Falha na etapa 2 (rede, timeout, erro do serviço, sessão expirada) ⇒ lê o
   snapshot do IndexedDB e devolve com procedência `'cache'`, preservando o `sincronizadaEm`
   gravado. É este ramo que habilita o aviso "Coleção carregada do cache" do PRD.
7. **Sem cache.** Falha na etapa 2 **e** ausência de snapshot ⇒ `Result` de erro
   `colecao_indisponivel`. Nunca uma coleção vazia (Decisão 4).

**Enriquecimento** (`enriquecerColecao`, em `packages/rules` — puro):

8. Filtra as entradas com `quantidade >= 1`; as demais não existem para efeito de coleção
   (PRD F01 Capabilities).
9. Para cada entrada, consulta o catálogo por `numero`. Carta ausente ⇒ a entrada é **omitida**
   de `itens` e o `numero` vai para `desconhecidas`.
10. Calcula `limiteCopias = min(quantidade, 3)` por entrada.
11. Ordena `itens` por `numero` crescente. Como todos os `numero` são strings de 3 dígitos com
    zero à esquerda, a ordem lexicográfica coincide com a numérica.

**Consumo pelo Library** (`derivarObtidas`, em `packages/rules` — puro):

12. Devolve o conjunto de `numero` com `quantidade >= 1`, que é o modelo booleano
    obtida/não-obtida que `library.md` §6 F01 espera (Decisão 9). O Library cruza esse conjunto
    com as 722 cartas do catálogo; F01 não conhece as não obtidas.

### Regras de negócio

- **Quantidade possuída é inteiro ≥ 0** no armazenamento; a coleção **exposta** contém apenas
  entradas com quantidade ≥ 1. Carta que chega a 0 deixa a coleção. — PRD §6 F01 Capabilities
- **Limite efetivo de cópias no deck = `min(quantidade, 3)`.** O teto de 3 é invariante de regra
  do jogo (Fase 0.3 / `product.md`); o piso pela posse é regra deste módulo. F01 expõe o número;
  quem o aplica ao deck é F05/F06. — PRD §6 F01 e F05 Capabilities
- **Não há teto de posse.** Uma carta pode ser possuída em qualquer quantidade; apenas o deck é
  limitado a 3. — PRD §6 F03 Capabilities
- **`obtida` é derivado, não armazenado:** `quantidade >= 1`. — `arquitetura.md` §5.1
- **Nenhum campo novo no schema de carta.** O enriquecimento anexa os 12 campos canônicos como
  vêm do catálogo; `limiteCopias` e `quantidade` são campos do *item de coleção*, não da carta.
  — PRD §6 F01 Capabilities
- **`numero` sem carta no catálogo é ocultado, não corrigido nem inventado.** A inconsistência é
  registrada e o carregamento prossegue. — PRD §6 F01 Error Handling
- **A coleção é somente-leitura nesta feature.** Nenhuma função de F01 grava em `collections`.
  — Decisão 2

### Eventos

Não se aplica. Esta feature não toca `packages/engine` nem o Effect System, não emite eventos de
duelo (`onSummon`, `onAttackDeclared`, …) e não consome nenhum.

### Determinismo e pureza

Não se aplica a `packages/engine` — F01 não produz estado de duelo, não usa PRNG e não participa
de replay. As garantias relevantes aqui são de **pureza de `packages/rules`**:

- Nenhuma função de `packages/rules/src/colecao/` executa I/O, lê relógio, lê ambiente ou sorteia.
- A saída de `enriquecerColecao` é função apenas de (coleção, catálogo): a mesma dupla produz a
  mesma lista, na mesma ordem, independentemente da ordem de iteração da entrada.
- As estruturas devolvidas são imutáveis (`Readonly`, guidelines §6.3); nenhuma função muta a
  coleção recebida.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`OrigemColecao`** — union fechado: `'servidor' | 'cache'`.
- **`ColecaoSerializadaSchema`** — `record` de `NumeroCartaSchema` para inteiro ≥ 0. Tipo
  derivado `ColecaoSerializada`.
- **`LinhaColecaoSchema`** — forma de uma linha vinda do Postgres: `player_id` uuid, `numero` via
  `NumeroCartaSchema`, `quantity` inteiro ≥ 0, `updated_at` ISO 8601. Existe para dar erro
  explícito na fronteira (guidelines §18.3) e nunca vaza de
  `apps/web/src/lib/colecao/repositorio-supabase.ts`.
- **`SnapshotColecaoSchema`** — forma do registro no IndexedDB: `playerId` string não-vazia,
  `entradas` via `ColecaoSerializadaSchema`, `sincronizadaEm` ISO 8601. Valida o que sai do cache
  antes de virar `Colecao`, tratando o armazenamento local como fronteira não confiável.
- **`ConsultaCatalogo`** — interface de leitura do catálogo, com `getByNumero`. Nomeada por
  capacidade e não por implementação (guidelines §10.1). Implementada por `banco-de-cartas`/F03,
  falsificável em teste por um mapa em memória.
- **`Carta`, `NumeroCarta`, `Result`, `DomainError`** — reusados de `packages/shared` conforme a
  spec de `banco-de-cartas`/F01. **Não são redefinidos aqui.**

Códigos de `DomainError` introduzidos por esta feature: `sessao_ausente`,
`colecao_indisponivel`, `linha_colecao_invalida`, `snapshot_colecao_invalido`,
`catalogo_indisponivel`.

### Funções públicas

```
// packages/rules/src/colecao — puro, sem I/O

desserializarColecao(bruta: ColecaoSerializada): Result<Colecao, DomainError>
  // pré: bruta já validada por ColecaoSerializadaSchema
  // pós: ok ⇒ Map com as mesmas chaves e valores; erro ⇒ numero ou quantidade fora do domínio

serializarColecao(colecao: Colecao): ColecaoSerializada
  // pós: chaves ordenadas por numero crescente; round-trip idempotente com desserializarColecao

entradasPossuidas(colecao: Colecao): readonly EntradaColecao[]
  // pós: apenas quantidade ≥ 1, ordenado por numero crescente

quantidadePossuida(colecao: Colecao, numero: NumeroCarta): number
  // pós: 0 quando a carta não está na coleção — nunca undefined

possui(colecao: Colecao, numero: NumeroCarta): boolean
  // pós: equivalente a quantidadePossuida(colecao, numero) >= 1

limiteCopias(quantidade: number): number
  // pré: quantidade inteiro ≥ 0
  // pós: min(quantidade, 3); resultado sempre em [0, 3] e nunca maior que a quantidade

enriquecerColecao(colecao: Colecao, catalogo: ConsultaCatalogo): ColecaoEnriquecida
  // pós: |itens| + |desconhecidas| === |entradasPossuidas(colecao)|
  //      itens ordenado por numero; cada item com os 12 campos canônicos e limiteCopias

derivarObtidas(colecao: Colecao): ReadonlySet<NumeroCarta>
  // pós: exatamente os numero com quantidade ≥ 1 — leitura booleana do Library (cross-PRD)
```

```
// apps/web/src/lib/colecao — fronteira de I/O

carregarColecao(deps: DependenciasColecao): Promise<Result<ColecaoCarregada, DomainError>>
  // deps: { playerId, repositorio, cache, relogio }
  // pós: ok ⇒ origem 'servidor' (e snapshot regravado) ou 'cache' (snapshot preservado)
  //      erro ⇒ sessao_ausente | colecao_indisponivel — nunca coleção vazia por falha

lerColecaoDoServidor(playerId: string): Promise<Result<ColecaoSerializada, DomainError>>
  // pós: linhas inválidas descartadas e registradas; erro só em falha da própria leitura

lerSnapshot(playerId: string): Promise<SnapshotColecao | undefined>
gravarSnapshot(snapshot: SnapshotColecao): Promise<void>
  // pós: substituição integral do registro do jogador; falha registrada, nunca propagada
```

```
// apps/web/src/hooks — adaptador React fino, sem regra

useColecao(): EstadoColecao
  // EstadoColecao = { situacao: 'carregando' }
  //               | { situacao: 'pronta'; carregada: ColecaoCarregada }
  //               | { situacao: 'erro'; erro: DomainError }
```

### Endpoints / RPC / mensagens de rede

F01 **não introduz RPC**. A leitura é um `SELECT` sobre `collections` via PostgREST, autorizado
pela RLS. As RPCs `SECURITY DEFINER` de escrita pertencem a F02 e F03 (Decisão 8).

Leitura — `GET /rest/v1/collections?player_id=eq.<uuid>&select=player_id,numero,quantity,updated_at`

```json
[
  { "player_id": "6f1c…", "numero": "001", "quantity": 3, "updated_at": "2026-07-27T12:00:00.000Z" },
  { "player_id": "6f1c…", "numero": "045", "quantity": 1, "updated_at": "2026-07-27T12:00:00.000Z" },
  { "player_id": "6f1c…", "numero": "333", "quantity": 5, "updated_at": "2026-07-27T12:00:00.000Z" }
]
```

Snapshot no IndexedDB, chaveado por jogador:

```json
{
  "playerId": "6f1c…",
  "entradas": { "001": 3, "045": 1, "333": 5 },
  "sincronizadaEm": "2026-07-27T12:00:00.000Z"
}
```

`ColecaoCarregada` no ramo de fallback, o que sustenta o aviso do PRD:

```json
{
  "origem": "cache",
  "colecao": { "001": 3, "045": 1, "333": 5 },
  "sincronizadaEm": "2026-07-27T12:00:00.000Z"
}
```

`ColecaoEnriquecida`, já cruzada com o catálogo, com uma carta desconhecida descartada:

```json
{
  "itens": [
    {
      "carta": {
        "id": 1, "numero": "001", "nome": "Blue-eyes White Dragon", "img": null,
        "classe": "Dragon", "atk": 3000, "def": 2500,
        "guardiao1": "Sun", "guardiao2": "Mars",
        "password": "89 63 11 39", "estrelas": 999999, "tipo": "monstro"
      },
      "quantidade": 5,
      "limiteCopias": 3
    },
    {
      "carta": {
        "id": 45, "numero": "045", "nome": "Mystical Elf", "img": null,
        "classe": "Spellcaster", "atk": 800, "def": 2000,
        "guardiao1": "Moon", "guardiao2": "Jupiter",
        "password": "15 02 51 71", "estrelas": 30, "tipo": "monstro"
      },
      "quantidade": 1,
      "limiteCopias": 1
    }
  ],
  "desconhecidas": ["998"]
}
```

### Contratos externos (cross-PRD)

- **`ConsultaCatalogo`** — *a ser fornecida por `banco-de-cartas`/F03.* `getByNumero(numero:
  NumeroCarta): Carta | undefined`, sobre o dataset selado. Enquanto F03 não existe, os testes de
  `packages/rules` usam um catálogo falso em memória (guidelines §12.1), e `apps/web` não
  consegue exibir a coleção — falha explícita `catalogo_indisponivel`, nunca coleção vazia.
- **Sessão autenticada** — *a ser fornecida por Auth/Cadastro.* Fornece o identificador do
  jogador; no banco, `player_id` deve corresponder a `auth.uid()`.
- **Contrato de escrita oferecido a F02 e F03** — ambas escrevem em `collections` por RPC
  `SECURITY DEFINER`, respeitando `quantity >= 0` e a PK composta. Nenhuma delas cria tabela
  paralela nem duplica a coleção (ADR-006: "a coleção não deve ser duplicada por Password, Free
  Duel ou outros módulos").
- **Contrato de leitura oferecido ao Library** — `derivarObtidas` entrega o conjunto de `numero`
  possuídos, que o Library cruza com as 722 cartas do catálogo para calcular "X de 722 obtidas".

## 5. Modelo de Dados

### Postgres / Supabase

| Tabela | Coluna | Tipo | Constraints / Índices |
|--------|--------|------|------------------------|
| `collections` | `player_id` | `uuid` | `NOT NULL`, FK → `auth.users(id)` `ON DELETE CASCADE`, parte da PK |
| `collections` | `numero` | `text` | `NOT NULL`, `CHECK (numero ~ '^[0-9]{3}$')`, parte da PK |
| `collections` | `quantity` | `integer` | `NOT NULL`, `DEFAULT 0`, `CHECK (quantity >= 0)` |
| `collections` | `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

- **Chave primária composta:** `(player_id, numero)`. Garante uma única linha por carta por
  jogador — a estrutura que torna o incremento de F03 um `UPSERT` idempotente por natureza.
- **Índices:** nenhum índice adicional. A PK composta tem `player_id` como coluna líder, então a
  consulta de F01 (todas as linhas de um jogador) já é servida pelo índice da PK. Criar um índice
  isolado em `player_id` seria redundante.
- **`CHECK (numero ~ '^[0-9]{3}$')`** espelha no banco o `NumeroCartaSchema` do zod, impedindo
  que uma escrita futura fora do caminho validado corrompa a coleção.
- **Sem FK para uma tabela de cartas:** o catálogo é um artefato de build versionado
  (`arquitetura.md` §4.1), não uma tabela Postgres. A integridade referencial de `numero` é
  verificada em leitura, e o `numero` órfão é tratado como caso de borda (Seção 6).

**RLS:** habilitada na tabela. Política única nesta migração —
`SELECT` permitido quando `player_id = auth.uid()`. Cada jogador lê exclusivamente as próprias
linhas (`arquitetura.md` §5.1). **Nenhuma política de `INSERT`/`UPDATE`/`DELETE` é criada**: as
escritas de F02 e F03 chegarão por funções `SECURITY DEFINER`, conforme
`arquitetura.md` §5.2 e ADR-006 (Decisão 8). Com RLS habilitada e sem política de escrita, uma
tentativa de gravação direta do cliente é recusada pelo banco — o comportamento desejado.

**Migração:** `supabase/migrations/0001_create_collections.sql` cria a tabela, as constraints, a
PK composta, habilita RLS e cria a política de leitura. É aditiva e não destrutiva
(guidelines §22.3). As demais tabelas de `arquitetura.md` §5.1 (`profiles`, `active_decks`,
`wallets`, `reward_ledger`, …) **não** são criadas aqui — cada uma pertence à feature que a
possui.

**Atomicidade e idempotência:** não se aplica a F01, que não escreve. A estrutura, porém, é
desenhada para sustentá-las: a PK composta dá a F03 um alvo natural de `UPSERT`, e a ausência de
política de escrita para o cliente garante que nenhuma quantidade venha de valor não confiável
(`arquitetura.md` §5.2).

### Cache local / fila offline

| Item | Definição |
|---|---|
| Banco | IndexedDB da aplicação, versão 1 |
| Store | `colecao` |
| Chave | `playerId` — um registro-snapshot por jogador (Decisão 6) |
| Valor | `{ playerId, entradas: ColecaoSerializada, sincronizadaEm }` |
| Escrita | Substituição integral, apenas após leitura bem-sucedida do servidor |
| Leitura | Somente no ramo de fallback; validada por `SnapshotColecaoSchema` antes do uso |
| Limpeza | No logout, o registro do jogador é removido |

**Sem fila de mutações nesta feature.** A fila idempotente de `arquitetura.md` §5.4 serve às
escritas — crédito de recompensa (F03) e save do deck (F07) — e é criada por elas. F01 grava
apenas o snapshot de leitura, que é descartável por definição: perdê-lo custa um fallback
indisponível, nunca progresso do jogador.

### Arquivos de dados versionados

Nenhum. F01 **consome** o catálogo versionado produzido por `banco-de-cartas` (F09/F10) através
da interface `ConsultaCatalogo`, mas não produz nem versiona artefato de dado.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Falha de leitura no servidor (rede, timeout, 5xx) com cache presente | `catch` no repositório | Devolve o snapshot com `origem: 'cache'` e o `sincronizadaEm` gravado | `Coleção carregada do cache; algumas cartas podem estar desatualizadas.` |
| Falha de leitura no servidor **sem** cache | `carregarColecao` | `Result` de erro `colecao_indisponivel`. **Nunca** coleção vazia (Decisão 4) | `Não foi possível carregar sua coleção. Tente novamente.` |
| Sessão expirada ou sem autorização (401/403) | Resposta do Supabase | Mesmo fallback de cache, e sinaliza necessidade de reautenticar | `Faça login novamente para sincronizar sua coleção.` |
| Sem sessão autenticada ao iniciar | Guarda em `carregarColecao` | Erro `sessao_ausente` sem tocar em rede ou cache | `Faça login para ver sua coleção.` |
| Linha com `quantity` negativa ou `numero` malformado | `LinhaColecaoSchema` | Descarta a linha, registra `warn` com o `numero`, o restante da coleção carrega | — (registro técnico) |
| Snapshot de cache corrompido ou de formato antigo | `SnapshotColecaoSchema` | Trata como cache ausente, remove o registro e segue para o ramo de erro se o servidor também falhou | `Não foi possível carregar sua coleção. Tente novamente.` |
| `numero` possuído sem carta no catálogo | `enriquecerColecao` | Oculta a entrada do editor, acumula em `desconhecidas`, registra inconsistência. Não aborta | `Carta desconhecida ignorada (numero X).` |
| Catálogo indisponível (`banco-de-cartas`/F03 não subiu) | Guarda no consumidor | Falha de carregamento explícita `catalogo_indisponivel`; não exibe coleção vazia nem cartas sem dados | `Não foi possível carregar sua coleção. Tente novamente.` |
| IndexedDB indisponível (modo privativo, quota, permissão) | `catch` no cache | Segue apenas com o servidor; registra `warn`. Sem cache, uma falha posterior de rede cai no ramo de erro | — (registro técnico) |
| Falha ao gravar o snapshot após leitura bem-sucedida | `catch` no cache | **Não** invalida a leitura: devolve `origem: 'servidor'` normalmente e registra `warn` | — (registro técnico) |
| Coleção legitimamente vazia (0 linhas, antes de F02 semear) | Leitura bem-sucedida com 0 linhas | Estado **válido**, não é erro: `origem: 'servidor'` com coleção vazia | Estado vazio da tela, tratado por F04 |
| Entrada com `quantity = 0` | `entradasPossuidas` | Filtrada da coleção exposta; a carta não aparece no editor (PRD F01 Capabilities) | — |
| Troca de jogador na mesma sessão do navegador | Chave `playerId` do store | Cada jogador tem seu registro; um `playerId` diferente nunca lê o snapshot do outro | — |
| Duas abas carregando ao mesmo tempo | Substituição integral do snapshot | A última leitura bem-sucedida vence. Como F01 não escreve na coleção, não há perda de dado | — |

Todo descarte é **registrado**, nunca silencioso (guidelines §8.3). Os registros são estruturados
com `playerId` e `numero` no contexto, sem dado sensível (guidelines §23.3).

## 7. Estratégia de Testes

### Unitários (Vitest)

`limiteCopias` — table-driven (guidelines §11.2):
- `limiteCopias devolve zero quando a quantidade e zero`
- `limiteCopias devolve um quando a quantidade e um`
- `limiteCopias devolve tres quando a quantidade e exatamente tres`
- `limiteCopias satura em tres quando a quantidade e cinco`

`entradasPossuidas` / `quantidadePossuida` / `possui`:
- `entradasPossuidas omite carta com quantidade zero`
- `entradasPossuidas mantem carta com quantidade um`
- `entradasPossuidas ordena as entradas por numero crescente`
- `entradasPossuidas devolve lista vazia para colecao vazia`
- `quantidadePossuida devolve zero para carta ausente da colecao`
- `possui devolve falso para carta ausente e verdadeiro para carta com uma copia`

`enriquecerColecao`:
- `enriquecerColecao anexa os doze campos canonicos da carta a cada item`
- `enriquecerColecao calcula limiteCopias tres para carta possuida cinco vezes`
- `enriquecerColecao descarta numero sem carta no catalogo e o lista em desconhecidas`
- `enriquecerColecao nao interrompe o enriquecimento quando ha numero desconhecido`
- `enriquecerColecao ordena os itens por numero crescente`
- `enriquecerColecao nao acrescenta campo fora do schema canonico da carta`
- `enriquecerColecao devolve itens e desconhecidas vazios para colecao vazia`

`derivarObtidas`:
- `derivarObtidas inclui apenas numero com quantidade maior ou igual a um`
- `derivarObtidas exclui numero com quantidade zero`

`serializarColecao` / `desserializarColecao`:
- `serializarColecao emite as chaves em ordem crescente de numero`
- `desserializarColecao rejeita quantidade negativa com codigo linha_colecao_invalida`
- `desserializarColecao rejeita numero fora do formato de tres digitos`

`carregarColecao` (com repositório e cache falsos, guidelines §12.1):
- `carregarColecao devolve origem servidor quando a leitura remota tem sucesso`
- `carregarColecao grava o snapshot apos leitura remota bem-sucedida`
- `carregarColecao devolve origem cache quando a leitura remota falha e ha snapshot`
- `carregarColecao preserva o sincronizadaEm do snapshot no ramo de cache`
- `carregarColecao falha com colecao_indisponivel quando nao ha servidor nem cache`
- `carregarColecao nao devolve colecao vazia quando a leitura remota falha`
- `carregarColecao falha com sessao_ausente quando nao ha jogador autenticado`
- `carregarColecao devolve origem servidor mesmo quando a gravacao do snapshot falha`
- `carregarColecao trata snapshot corrompido como cache ausente`
- `carregarColecao devolve colecao vazia com origem servidor quando o jogador nao tem cartas`

### Property-based (fast-check)

- **Round-trip do formato de cache:** para qualquer coleção gerada,
  `desserializarColecao(serializarColecao(c))` é igual a `c`. É o que autoriza usar o objeto
  simples como formato de IndexedDB sem perda. 1.000 execuções.
- **Domínio de `limiteCopias`:** para todo inteiro `q` em `[0, 10_000]`, `limiteCopias(q)` está
  em `[0, 3]` e nunca é maior que `q`. Prova o invariante "no máximo 3 cópias" sem enumerar casos.
- **Conservação no enriquecimento:** para qualquer coleção e qualquer catálogo parcial,
  `|itens| + |desconhecidas| === |entradasPossuidas(colecao)|`. Nenhuma carta possuída
  desaparece em silêncio nem é contada duas vezes.
- **Ordenação independente da inserção:** para qualquer permutação da ordem de inserção das
  entradas na coleção, `enriquecerColecao` devolve `itens` na mesma ordem.
- **Idempotência de `derivarObtidas`:** o conjunto devolvido é exatamente o conjunto de chaves de
  `entradasPossuidas`, para qualquer coleção.

### Integração

`apps/web/tests/colecao.integration.test.ts`, contra uma instância Supabase local com a migração
aplicada:

- `migracao cria collections com chave primaria composta de player_id e numero`
- `collections rejeita quantity negativa pela constraint`
- `collections rejeita numero fora do formato de tres digitos pela constraint`
- `collections rejeita segunda linha com o mesmo par player_id e numero`
- `RLS impede o jogador A de ler as linhas do jogador B`
- `RLS recusa insert direto do cliente na tabela collections`
- `remover o usuario em auth.users remove suas linhas de collections em cascata`
- `carregarColecao contra o banco real devolve as linhas do jogador autenticado`
- `carregarColecao contra o banco real grava e recupera o snapshot no IndexedDB`
- `carregarColecao segue com origem servidor quando o IndexedDB esta indisponivel`

### Análise estática

- `packages/rules/src/**` não importa React, DOM, `fetch`, Supabase, `node:fs` nem
  `node:process` — a regra de posse é pura e testável sem navegador nem banco
  (guidelines §3.3, §12).
- `packages/rules` importa apenas `packages/shared`; nenhum import de `engine`, `ai`, `web` ou
  `server` (`arquitetura.md` §2).
- `packages/shared` continua sem importar nenhum outro pacote do monorepo.
- Nenhum arquivo de `apps/web` contém o literal do teto de cópias nem reimplementa o predicado
  "obtida" — ambos vêm exclusivamente de `packages/rules` (ADR-004).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F01) | Teste |
|---|---|
| A coleção expõe, por carta possuída, a quantidade (≥ 1) e os dados do schema da Fase 0, sem campos inventados | `enriquecerColecao anexa os doze campos canonicos da carta a cada item` + `enriquecerColecao nao acrescenta campo fora do schema canonico da carta` |
| Cartas com quantidade 0 não aparecem na coleção; o limite efetivo de cópias no deck é `min(possuídas, 3)` | `entradasPossuidas omite carta com quantidade zero` + a tabela completa de `limiteCopias` + a propriedade de domínio de `limiteCopias` |
| Cartas não possuídas não são listadas no editor | `derivarObtidas inclui apenas numero com quantidade maior ou igual a um` + `enriquecerColecao devolve itens e desconhecidas vazios para colecao vazia` — a coleção só contém o que o jogador possui, por construção |
| Falha de leitura recorre ao cache local com aviso, sem quebrar o editor | `carregarColecao devolve origem cache quando a leitura remota falha e ha snapshot` + `carregarColecao preserva o sincronizadaEm do snapshot no ramo de cache` + `carregarColecao nao devolve colecao vazia quando a leitura remota falha` |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Cross-Feature: somar/subtrair cartas em F05 nunca deixa "no deck + disponível" maior que a quantidade possuída registrada em F01 | Análise estática: `limiteCopias` e `quantidadePossuida` são a única fonte do teto, e `apps/web` não os reimplementa — F05/F06 são obrigadas a consumir `packages/rules`. A verificação do deck em si pertence a F06 |
| Cross-Feature: uma carta conquistada por F03 fica imediatamente utilizável em F04/F05 | `carregarColecao contra o banco real devolve as linhas do jogador autenticado` — estabelece que a leitura reflete o estado corrente de `collections`, que é onde F03 escreve. O gatilho de atualização é de F03 |
| Cross-Feature: o fluxo F02 → F04 → F05 → F06 → F07 não deixa estado inconsistente entre coleção e deck | `collections rejeita segunda linha com o mesmo par player_id e numero` — a PK composta impede duas quantidades para a mesma carta, a raiz de qualquer divergência |
| Cross-PRD (Library): as cartas e quantidades da coleção são refletidas corretamente para distinguir obtidas × não obtidas | `derivarObtidas inclui apenas numero com quantidade maior ou igual a um` + `derivarObtidas exclui numero com quantidade zero` + a propriedade de idempotência — o Library recebe o booleano derivado da mesma `quantity`, sem armazenamento paralelo (`arquitetura.md` §5.1) |
| Cross-PRD (Auth/Cadastro): a coleção pertence à conta e não vaza entre jogadores | `RLS impede o jogador A de ler as linhas do jogador B` + `remover o usuario em auth.users remove suas linhas de collections em cascata` |
| Cross-PRD (Motor de Duelo / Free Duel / Online Duel): nenhum módulo de duelo recebe dado de coleção não confiável | `RLS recusa insert direto do cliente na tabela collections` — a coleção só cresce por RPC server-side (F02/F03), então o que o duelo lê nunca veio de valor forjado pelo cliente (`arquitetura.md` §5.2) |
