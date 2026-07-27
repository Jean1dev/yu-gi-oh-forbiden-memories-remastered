# Acesso à Coleção do Jogador

> PRD: `docs/prds/library.md` — F01
> Pacote-alvo: `packages/shared` + `packages/rules` (+ `apps/web`)

## 1. Contexto e Escopo

Esta feature é a **camada de acesso a dados da Library** — a Foundation do módulo (PRD §8,
Parte 2). Ela cruza duas fontes que já pertencem a outros módulos: o **catálogo canônico** de 722
cartas (`banco-de-cartas`, cross-PRD) e o **conjunto de cartas obtidas** pelo jogador
(`build-deck`/F01, cross-PRD). O produto do cruzamento é um **índice por `numero`** em que cada
uma das 722 cartas aparece com status obtida ou não obtida, mais as contagens que sustentam o
indicador "X de 722 obtidas". F02 consome a lista, F03 e F04 a filtram, F05 lê a entrada
individual — nenhuma delas funciona sem esta.

O módulo inteiro é **somente-leitura** (PRD §7): F01 não escreve na coleção, não libera cartas e
não altera o catálogo. Isso é uma consequência direta de ADR-003 — Library "deve consumir apenas
o pacote validado, e não a origem bruta" — e de `arquitetura.md` §5.1, que estabelece
`collections.quantity` como fonte única e o booleano "obtida" como valor **derivado**
(`quantity ≥ 1`), nunca armazenado em paralelo.

O desenho segue a separação de camadas já praticada por `banco-de-cartas`/F01 e `build-deck`/F01:
os **contratos** (tipos e schemas zod) vivem em `packages/shared`; a **regra de cruzamento** é uma
função pura em `packages/rules`; e todo o **I/O** (Supabase, IndexedDB, React) fica confinado a
`apps/web`. A feature pertence à **Fase 2** do roadmap (`arquitetura.md` §9).

### Incluído

- Contratos do índice da Library — tipos e schemas zod — em `packages/shared`, consumidos por
  F02, F03, F04 e F05 (PRD F01 Provides)
- Regra pura em `packages/rules`: cruzar as 722 cartas do catálogo com o conjunto de obtidas,
  produzir a lista ordenada por `numero`, o índice de acesso O(1) e as contagens
- Projeção **redigida** das cartas não obtidas: a entrada bloqueada carrega apenas o `numero`,
  sem nenhum atributo da carta (Decisão 2)
- Resolução da referência de arte por `numero`, anexada a cada entrada, com placeholder para arte
  ausente e silhueta para carta não obtida (PRD F01 Experience e Error Handling)
- Exposição do total canônico do jogo e da contagem de obtidas (PRD F01 Provides; consumido pelo
  indicador de progresso de F02)
- Orquestração do carregamento em `apps/web`: catálogo memoizado por processo, coleção relida a
  cada abertura do módulo, mais uma ação explícita de recarregar (Decisão 5)
- Propagação da procedência da coleção (servidor ou cache) para a UI decidir sobre o aviso de dado
  desatualizado (Decisão 4)
- Falha explícita e fail-safe: nenhuma carta é marcada como obtida enquanto a coleção não carregar
  (PRD F01 Error Handling)
- Hook React fino de consumo, sem regra e sem store global

### Fronteiras

- **Grade, células, indicador de progresso renderizado, estado vazio e responsividade** → **F02**.
  F01 entrega a lista e os números; quem os desenha é F02. — PRD §6 F02
- **Campo de busca, normalização do termo, debounce e mensagem de "nenhuma carta encontrada"** →
  **F03**. — PRD §6 F03
- **Filtro por tipo, ordenação por `nome`/`atk`/`def`/`estrelas`, filtro de status e "limpar
  filtros"** → **F04**. F01 entrega uma única ordenação — `numero` crescente, a ordenação padrão
  do PRD — e o status por carta; toda a combinação de filtros é de lá. — PRD §6 F04
- **Tela de detalhe, blocos de campos, cópia de senha e navegação anterior/próxima** → **F05**.
  F01 entrega o registro por `numero`; a apresentação é de lá. — PRD §6 F05
- **Escrita na coleção** — liberação por senha, drops, recompensas → **Password / Campanha /
  Free Duel** (cross-PRD). A Library reflete, não escreve. — PRD §7
- **Modelo de posse por quantidade (trunk)** → **Build Deck**. A Library consome o booleano
  derivado; a quantidade de cópias não aparece em lugar nenhum deste módulo. — PRD §7
- **Fusões, drops por duelista e bônus de terreno por classe** → fora desta versão, por dependerem
  de tabelas inexistentes. O schema de carta não muda quando elas chegarem. — PRD §6 F05 (nota de
  pendência) e §7
- **Cálculo de vantagem/desvantagem entre Guardiões Estelares** → não existe nesta versão nem em
  versões futuras deste módulo; os guardiões são rótulos. — PRD §7
- **Ingestão, validação e selo do dataset** → `banco-de-cartas`/F01 e F02 (cross-PRD). — ADR-003

### Contratos externos assumidos

Nenhum dos módulos abaixo está implementado. A spec os trata como contrato externo e o `plan.md`
os lista como pré-requisito.

- **`banco-de-cartas`/F03 — Serviço de Catálogo.** Esperam-se duas capacidades: `getByNumero`
  (já declarada pela spec de `build-deck`/F01) e a **listagem completa do dataset selado + a
  contagem canônica**, que é o que a Library precisa para enumerar as 722 cartas e derivar o
  "de 722" do indicador. A segunda é declarada aqui como `ListagemCatalogo` (Seção 4).
  *A ser fornecido por `banco-de-cartas`.*
- **`banco-de-cartas`/F04 — Resolução de Artes.** Espera-se a resolução de `numero` → referência
  de imagem, com placeholder quando o arquivo não existir. F01 a consome pela interface
  `ResolucaoArte` (Seção 4), injetada. *A ser fornecido por `banco-de-cartas`.*
- **`banco-de-cartas`/F01 — Contratos canônicos.** `Carta`, `NumeroCarta`, `TipoCarta`,
  `GuardiaoEstelar`, `Result`, `DomainError` e `TOTAL_CARTAS_CANONICO` já têm spec em
  `docs/specs/banco-de-cartas/F01-ingestao-e-normalizacao-da-fonte/`. São **reusados, nunca
  redefinidos**. *A ser fornecido por `banco-de-cartas`.*
- **`build-deck`/F01 — Coleção do Jogador.** Já tem spec em
  `docs/specs/build-deck/F01-colecao-do-jogador-bau/`, que declara explicitamente o contrato de
  leitura oferecido à Library: `derivarObtidas(colecao): ReadonlySet<NumeroCarta>`. F01 da Library
  também reusa `carregarColecao` e o tipo `ColecaoCarregada` (com `origem` e `sincronizadaEm`).
  Nenhum caminho de leitura de coleção é duplicado aqui. *A ser fornecido por `build-deck`.*
- **Auth/Cadastro (cross-PRD).** A sessão autenticada de onde sai o identificador do jogador é
  pré-requisito de `carregarColecao`, não desta feature. *A ser fornecido por Auth/Cadastro.*

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A regra de cruzamento vive em `packages/rules/src/library/`, ao lado do subsistema `colecao` que `build-deck`/F01 já alocou lá. É função pura sobre catálogo e conjunto de obtidas, testável sem React nem Supabase, e reutilizável por `apps/server`. Consequência: mantém a ampliação do charter de `packages/rules` além de Guardian Star/Terrain/Fusion/Effect System. | entrevista; guidelines §3.2; spec `build-deck/F01` Decisão 1 | confirmada — **a ampliação do charter em `arquitetura.md` §2 continua pendente de registro** |
| 2 | A entrada do índice é uma **união discriminada por `obtida`**: a variante não obtida carrega apenas `numero` e a referência de silhueta, sem nenhum campo da carta. O critério "não revelar demais campos" (PRD §9 F04 e F05) passa a ser verificável pelo compilador, não por disciplina de UI (guidelines §1.1, "make invalid states hard to represent"). Consequência aceita: F04 não pode ordenar cartas bloqueadas por `atk`/`def`/`nome`/`estrelas` — elas caem na regra que o próprio PRD já define, "cartas sem valor numérico vão para o fim da ordenação numérica". | entrevista; PRD §6 F04 e F05 Capabilities | confirmada |
| 3 | Pela mesma razão da Decisão 2, a entrada não obtida **não** recebe o caminho da arte real. Anexar `cards-data/{numero}.jpg` a uma carta bloqueada revelaria a arte na grade e derrotaria a silhueta exigida por F04. A referência de arte é uma união de três casos — arte resolvida, placeholder de arquivo ausente, silhueta de carta não obtida — e os dois últimos não carregam caminho: o asset é escolhido pela UI. | entrevista; PRD §6 F04 Capabilities | confirmada |
| 4 | A Library **reusa** `carregarColecao` de `build-deck`/F01, incluindo o fallback de cache local. `origem: 'cache'` é tratado como **sucesso** e a procedência é propagada para a UI exibir aviso de dado possivelmente desatualizado. Coerente com ADR-005 (offline-first) e evita um segundo caminho de leitura da mesma tabela. O PRD da Library não previa o caso do cache; esta decisão o acrescenta sem contrariá-lo. | entrevista; ADR-005; spec `build-deck/F01` Decisão 3 | confirmada |
| 5 | **Catálogo memoizado por processo; coleção relida a cada abertura do módulo.** O catálogo é selado e imutável em runtime (PRD `banco-de-cartas` §6 F03 Capabilities), então recarregá-lo a cada navegação Menu→Library gastaria o orçamento de 1 s do PRD §4 sem ganho. A coleção é mutável por outros módulos e recarrega a cada montagem, mais uma ação `recarregar()` explícita — é o que satisfaz o critério cross-PRD "aparece como obtida **após recarregar** o estado de coleção". | entrevista; PRD §4 Métricas; PRD §9 Cross-PRD Integration | confirmada |
| 6 | A referência de arte é resolvida **em F01** e anexada a cada entrada, e não recalculada por F02 e F05. O PRD escreve a resolução de artes na Experience da própria F01, e os dois consumidores precisam do mesmo valor — uma resolução, dois consumos. | entrevista; PRD §6 F01 Experience | confirmada |
| 7 | Falha ao carregar a coleção devolve **erro explícito**, nunca um índice com as 722 cartas marcadas como não obtidas. As duas leituras do fail-safe do PRD ficam satisfeitas: a tela mostra a mensagem de falha, e nenhuma carta é marcada como obtida enquanto isso. Um índice "tudo não obtido" seria indistinguível de um jogador legítimo sem cartas e faria o indicador reportar "0 de 722" como se fosse verdade. | PRD §6 F01 Error Handling; spec `build-deck/F01` Decisão 4 | confirmada |
| 8 | O total **não é a constante literal 722** no código da Library. Vem de `totalCanonico()` do catálogo, que `banco-de-cartas` §6 F03 define como "fonte única que corrige a divergência 821 vs 722". O "722" do texto do indicador é interpolado. Uma segunda constante na Library reintroduziria exatamente a divergência que ADR-003 elimina. | ADR-003; PRD `banco-de-cartas` §6 F03 Capabilities | confirmada |
| 9 | O modelo de posse da Library é **booleano**, derivado de `quantity ≥ 1` na origem. `library.md` §6 F01 pede modelo booleano e `build-deck` armazena quantidade; `arquitetura.md` §5.1 resolve — "uma fonte, dois consumos". A Library nunca vê nem exibe contagem de cópias (PRD §7). | `arquitetura.md` §5.1; spec `build-deck/F01` Decisão 9 | confirmada |
| 10 | `numero` presente no conjunto de obtidas mas **ausente do catálogo** é ignorado e contabilizado à parte, nunca somado às obtidas. Sem isso, `obtidas > total` seria representável e o indicador poderia exibir "725 de 722". O descarte é registrado, como manda o tratamento equivalente em `build-deck`/F01. | PRD §6 F01 Error Handling; guidelines §8.3 | confirmada |
| 11 | F01 entrega **uma** ordenação — `numero` crescente, que o PRD §6 F02 Experience define como padrão. Não entrega índices pré-ordenados por `nome`/`atk`/`def`/`estrelas`: ordenar 722 registros é trabalho trivial e F04 é quem conhece os critérios. Otimizar antes de medir contraria guidelines §17.1. | PRD §6 F02 Experience; guidelines §17.1 | confirmada |
| 12 | F01 **não** escolhe o adaptador de estado React. Entrega um carregador agnóstico de framework e um hook fino, mantendo a decisão entre Zustand e `useReducer`+context (aberta em `arquitetura.md` §7) para quando existir estado mutável real — em F03/F04, que mantêm termo de busca, filtros e ordenação. | `arquitetura.md` §7; spec `build-deck/F01` Decisão 5 | confirmada |
| 13 | **Nenhuma tabela de dado externo pendente** é consumida. Matriz de guardiões, matriz terreno↔classe, fusões, drops, rating e balanceamento não tocam esta feature: o PRD §6 F05 já exclui fusões, drops e terreno desta versão, e os guardiões aparecem apenas como rótulos, sem cálculo (PRD §7). Nenhum valor de lore é inventado nesta spec. | PRD §7; `arquitetura.md` §10 | não se aplica |
| 14 | O monorepo ainda não existe. Esta feature assume o scaffolding de `banco-de-cartas`/F01 (pnpm workspaces, Turborepo, TypeScript strict, Node.js 24 LTS, portões de análise estática) e os pacotes `rules` e `web` criados por `build-deck`/F01. Não recria nenhum dos dois. | spec `banco-de-cartas/F01` Decisão 14; spec `build-deck/F01` Decisão 13; ADR-001 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/library/tipos.ts` | shared | novo | `EntradaLibrary`, `IndiceLibrary`, `ReferenciaArte`, `ProgressoColecao`, `LibraryCarregada` |
| `packages/shared/src/library/schema.ts` | shared | novo | `EntradaLibrarySchema`, `IndiceLibrarySchema`, `ReferenciaArteSchema` (zod) |
| `packages/shared/src/library/catalogo.ts` | shared | novo | Interfaces `ListagemCatalogo` e `ResolucaoArte` — contratos externos de `banco-de-cartas`/F03 e F04 |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os contratos da Library no export público |
| `packages/rules/src/library/indice.ts` | rules | novo | `montarIndiceLibrary` — cruzamento puro catálogo × obtidas |
| `packages/rules/src/library/progresso.ts` | rules | novo | `calcularProgresso`, `estaObtida`, `buscarEntrada` |
| `packages/rules/src/library/arte.ts` | rules | novo | `referenciaArteDaEntrada` — decide entre arte, placeholder e silhueta |
| `packages/rules/src/library/index.ts` | rules | novo | Export público do subsistema Library |
| `packages/rules/src/index.ts` | rules | alterado | Reexporta o subsistema Library |
| `packages/rules/README.md` | rules | alterado | Acrescenta o subsistema Library ao propósito e aos exports públicos (guidelines §21.3) |
| `packages/rules/src/library/indice.test.ts` | rules | novo | Unitários do cruzamento, redação e descarte de `numero` desconhecido |
| `packages/rules/src/library/progresso.test.ts` | rules | novo | Unitários das contagens e do acesso por `numero` |
| `packages/rules/src/library/arte.test.ts` | rules | novo | Unitários das três variantes de referência de arte |
| `packages/rules/src/library/indice.propriedades.test.ts` | rules | novo | Propriedades fast-check: conservação, invariantes de contagem, redação |
| `apps/web/src/lib/library/catalogo-library.ts` | web | novo | Acesso memoizado por processo ao catálogo selado e ao resolvedor de artes |
| `apps/web/src/lib/library/carregar-library.ts` | web | novo | Orquestra catálogo + coleção + cruzamento; define a procedência |
| `apps/web/src/hooks/use-library.ts` | web | novo | Hook fino: carregando/pronta/erro, mais a ação `recarregar` |
| `apps/web/tests/library.integration.test.ts` | web | novo | Integração do carregamento contra dataset real e coleção do banco |
| `.dependency-cruiser.cjs` | raiz | alterado | Acrescenta a regra que impede `packages/rules/src/library/**` de importar I/O |

**Verificação da direção de dependências:** `packages/shared` continua sem importar nenhum pacote
do monorepo. `packages/rules` importa **apenas** `packages/shared` — catálogo e resolvedor de
artes entram por injeção, então não há import de `packages/data` na regra. `apps/web` importa
`shared`, `rules` e `data`. Nenhum deles importa `engine`, `ai` ou `server`. A direção
`shared ← data ← rules` de `arquitetura.md` §2 é respeitada.

Esta feature **não toca `packages/engine`**: não produz estado de duelo, não usa PRNG e não
participa de replay, então as garantias de determinismo semeado e de `atk`/`def` base não
sobrescritos não se aplicam. A fronteira de I/O, no entanto, é explícita e verificada por análise
estática:

- `packages/rules/src/library/**` não importa React, DOM, `fetch`, Supabase, `node:fs` nem relógio
  — recebe catálogo, conjunto de obtidas e resolvedor como argumentos e devolve estruturas em
  memória.
- `apps/web/src/lib/library/**` é o **único** ponto com I/O, e mesmo ele delega a leitura da
  coleção a `apps/web/src/lib/colecao/` de `build-deck`/F01 em vez de consultar `collections`
  por conta própria (guidelines §7.3, §19.2).
- Nenhum arquivo de `apps/web` recalcula o predicado "obtida", a contagem de progresso ou a
  escolha de referência de arte — os três vêm de `packages/rules` (ADR-004).
- Nenhum arquivo da Library lê `cards-data/` diretamente; todo acesso a carta passa pelo catálogo
  selado (ADR-003 §6).

## 3. Design Técnico

### Estruturas de dados

**`ReferenciaArte`** — união discriminada de três casos (Decisão 3):

| Variante | Campos | Quando |
|---|---|---|
| `{ tipo: 'arte' }` | `caminho: string` | Carta obtida com arquivo de arte resolvido por `banco-de-cartas`/F04 |
| `{ tipo: 'placeholder' }` | — | Carta obtida cujo arquivo de arte não existe (PRD F01 Error Handling) |
| `{ tipo: 'silhueta' }` | — | Carta **não obtida**. Nunca carrega caminho: revelar a arte derrotaria o bloqueio |

As duas últimas variantes não têm caminho de propósito — o asset concreto de placeholder e de
silhueta é escolhido pela camada de UI, mantendo `packages/rules` livre de referência a arquivo.

**`EntradaLibrary`** — união discriminada por `obtida` (Decisão 2):

```
| { obtida: true;  numero: NumeroCarta; carta: Carta;  arte: ReferenciaArte }
| { obtida: false; numero: NumeroCarta;                arte: ReferenciaArte }
```

A variante bloqueada não tem `carta`. Um componente que tente ler `entrada.carta.atk` sem antes
estreitar por `obtida` é erro de compilação — é assim que o critério "sem revelar demais campos"
sai da disciplina de revisão e entra no compilador.

**`IndiceLibrary`** — o que F02–F05 consomem:

| Campo | Tipo | Semântica |
|---|---|---|
| `entradas` | `readonly EntradaLibrary[]` | As `total` cartas do jogo, ordenadas por `numero` crescente (ordenação padrão do PRD §6 F02) |
| `porNumero` | `ReadonlyMap<NumeroCarta, EntradaLibrary>` | Acesso O(1) por identidade, que é o padrão de consumo de F05 (guidelines §17.2) |
| `total` | `number` | Contagem canônica vinda do catálogo, nunca literal (Decisão 8) |
| `obtidas` | `number` | Quantidade de entradas com `obtida: true` |
| `obtidasForaDoCatalogo` | `readonly NumeroCarta[]` | `numero` possuído sem carta correspondente; ignorado nas contagens e registrado (Decisão 10) |

`entradas` e `porNumero` referenciam **os mesmos objetos** de entrada — a estrutura é imutável e a
duplicação é de referência, não de dado (guidelines §17.3).

**`ProgressoColecao`** — `{ obtidas: number; total: number }`. É o que F02 interpola em
"X de 722 obtidas". Invariante: `0 ≤ obtidas ≤ total`.

**`LibraryCarregada`** — o resultado do carregamento em `apps/web`:

| Campo | Tipo | Semântica |
|---|---|---|
| `indice` | `IndiceLibrary` | O cruzamento pronto |
| `origemColecao` | `OrigemColecao` | `'servidor'` ou `'cache'`, reusado de `build-deck`/F01 |
| `sincronizadaEm` | `string` | ISO 8601 — quando a coleção saiu do servidor |

`origemColecao: 'cache'` é sucesso, não falha (Decisão 4); é ele que habilita o aviso de dado
possivelmente desatualizado.

### Fluxo

**Carregamento** (`carregarLibrary`, em `apps/web`):

1. **Obter o catálogo.** Primeira abertura no processo carrega o catálogo selado e o resolvedor de
   artes e os memoiza; aberturas seguintes reusam a instância (Decisão 5). Catálogo indisponível ou
   não selado como válido por `banco-de-cartas`/F02 ⇒ erro `catalogo_indisponivel`, sem tocar na
   coleção. É o caminho do "Não foi possível carregar as cartas" do PRD, e a grade não abre.
2. **Carregar a coleção.** Chama `carregarColecao` de `build-deck`/F01. Sucesso ⇒ segue com
   `ColecaoCarregada`, guardando `origem` e `sincronizadaEm`. Falha ⇒ erro
   `colecao_indisponivel`; **nenhum índice é construído** e nenhuma carta é marcada como obtida
   (Decisão 7).
3. **Derivar o conjunto de obtidas.** `derivarObtidas(colecao)` devolve os `numero` com
   `quantity ≥ 1` — o modelo booleano que o PRD §6 F01 Consumes descreve (Decisão 9).
4. **Cruzar** (`montarIndiceLibrary`, puro — etapas 5 a 9).
5. **Enumerar o catálogo.** Percorre `listarTodas()` — as 722 cartas do dataset selado, e não a
   coleção. É o que garante que uma carta nunca obtida ainda apareça no índice, que é o insumo do
   filtro de status de F04.
6. **Classificar cada carta.** `numero` no conjunto de obtidas ⇒ variante obtida, com os 12 campos
   canônicos como vêm do catálogo. Caso contrário ⇒ variante bloqueada, só com `numero`.
7. **Resolver a arte.** Entrada obtida consulta `ResolucaoArte`: arquivo presente ⇒
   `{ tipo: 'arte', caminho }`, ausente ⇒ `{ tipo: 'placeholder' }`. Entrada bloqueada recebe
   `{ tipo: 'silhueta' }` **sem consultar o resolvedor** — não há caminho a resolver (Decisão 3).
8. **Ordenar e indexar.** Ordena por `numero` crescente e monta o `Map`. Como todos os `numero`
   são strings de 3 dígitos com zero à esquerda, a ordem lexicográfica coincide com a numérica.
9. **Contar.** `total` = `totalCanonico()` do catálogo. `obtidas` = entradas classificadas como
   obtidas. `numero` do conjunto de obtidas ausente do catálogo vai para `obtidasForaDoCatalogo`
   e **não** entra em `obtidas` (Decisão 10).
10. **Devolver** `{ indice, origemColecao, sincronizadaEm }`.

**Recarregamento** (`recarregar`, exposto pelo hook): repete as etapas 2 a 10 reusando o catálogo
memoizado. É o caminho que o critério cross-PRD do PRD §9 exige — uma carta liberada pelo Password
ou concedida por Campanha/Free Duel aparece como obtida na próxima leitura da coleção, sem que a
Library escreva nada.

### Regras de negócio

- **O universo do índice é o catálogo, não a coleção.** As `total` cartas do jogo entram no
  índice; a coleção só decide o status de cada uma. — PRD §6 F01 Capabilities
- **"Obtida" é derivado, nunca armazenado:** `quantity ≥ 1` na origem, sem contagem de cópias em
  nenhum ponto deste módulo. — `arquitetura.md` §5.1; PRD §7
- **Carta não obtida não carrega atributo nenhum** além do `numero` e da silhueta. — PRD §6 F04 e
  F05 Capabilities
- **`0 ≤ obtidas ≤ total`, sempre.** `numero` obtido fora do catálogo é ignorado nas contagens.
  — Decisão 10
- **Nenhum campo novo no schema de carta.** A entrada obtida anexa os 12 campos canônicos como
  vêm do catálogo; `obtida` e `arte` são campos da *entrada*, não da carta. — PRD §6 F01
  Capabilities; `product.md`
- **A Library nunca escreve.** Nenhuma função desta feature grava em `collections`, no catálogo ou
  no cache da coleção. — PRD §7; §9 Cross-PRD Integration
- **Guardiões são rótulos.** `guardiao1` e `guardiao2` trafegam como vêm do catálogo, sem consulta
  a matriz de compatibilidade — que, aliás, não existe (`arquitetura.md` §10). — PRD §7
- **Ordenação padrão única:** `numero` crescente. Os demais critérios são de F04. — Decisão 11

### Determinismo e pureza

Não se aplica a `packages/engine` — esta feature não produz estado de duelo, não usa PRNG e não
participa de replay. As garantias relevantes são de **pureza de `packages/rules`**:

- Nenhuma função de `packages/rules/src/library/` executa I/O, lê relógio, lê ambiente ou sorteia.
  `Math.random()` não aparece em lugar nenhum.
- `montarIndiceLibrary` é função apenas de (catálogo, conjunto de obtidas, resolvedor): as mesmas
  entradas produzem a mesma lista, na mesma ordem, independentemente da ordem de iteração do
  conjunto de obtidas.
- As estruturas devolvidas são imutáveis (`Readonly`, `ReadonlyMap`, `readonly[]` — guidelines
  §6.3); nenhuma função muta o catálogo nem o conjunto recebido.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`ReferenciaArteSchema`** — união discriminada por `tipo` sobre os três casos; apenas `'arte'`
  tem `caminho` (string não-vazia). Tipo derivado `ReferenciaArte`.
- **`EntradaLibrarySchema`** — união discriminada por `obtida`. A variante `true` exige `numero`,
  `carta` (via `CartaSchema` de `banco-de-cartas`/F01) e `arte`; a variante `false` exige `numero`
  e `arte`, e é **estrita**: um objeto com `carta` presente é rejeitado. Isso torna a redação da
  Decisão 2 verificável também em runtime, não só por tipo.
- **`IndiceLibrarySchema`** — `entradas` (array de `EntradaLibrarySchema`), `total` e `obtidas`
  (inteiros ≥ 0), `obtidasForaDoCatalogo` (array de `NumeroCartaSchema`), com refinamento
  `obtidas ≤ total`. `porNumero` não é serializável e fica fora do schema — ele é reconstruído a
  partir de `entradas`.
- **`ProgressoColecao`** — `{ obtidas, total }`, inteiros ≥ 0 com `obtidas ≤ total`.
- **`ListagemCatalogo`** — interface de leitura do dataset completo, nomeada por capacidade
  (guidelines §10.1). Composta com a `ConsultaCatalogo` já declarada por `build-deck`/F01, no
  padrão de composição de guidelines §10.3.
- **`ResolucaoArte`** — interface de resolução de arte por `numero`.
- **`Carta`, `NumeroCarta`, `Result`, `DomainError`, `TOTAL_CARTAS_CANONICO`** — reusados de
  `packages/shared` conforme a spec de `banco-de-cartas`/F01. **Não são redefinidos aqui.**
- **`OrigemColecao`, `ColecaoCarregada`, `Colecao`** — reusados de `packages/shared` conforme a
  spec de `build-deck`/F01. **Não são redefinidos aqui.**

Códigos de `DomainError` introduzidos por esta feature: `catalogo_indisponivel`,
`colecao_indisponivel`, `indice_library_invalido`.

`catalogo_indisponivel` e `colecao_indisponivel` já aparecem na spec de `build-deck`/F01; a
Library reusa os mesmos códigos em vez de criar sinônimos, para que a camada de apresentação
tenha um único mapa de código → mensagem.

### Funções públicas

```
// packages/rules/src/library — puro, sem I/O

montarIndiceLibrary(entrada: EntradaCruzamento): IndiceLibrary
  // entrada: { catalogo: ConsultaCatalogo & ListagemCatalogo,
  //            obtidas: ReadonlySet<NumeroCarta>,
  //            artes: ResolucaoArte }
  // pós: |entradas| === catalogo.totalCanonico()
  //      entradas ordenado por numero crescente; porNumero cobre exatamente as mesmas chaves
  //      obtidas === contagem de entradas com obtida true, e obtidas <= total
  //      numero obtido ausente do catalogo vai para obtidasForaDoCatalogo, nunca para obtidas
  //      determinística: independe da ordem de iteração de `obtidas`

calcularProgresso(indice: IndiceLibrary): ProgressoColecao
  // pós: { obtidas, total } do índice, com obtidas <= total

buscarEntrada(indice: IndiceLibrary, numero: NumeroCarta): EntradaLibrary | undefined
  // pós: undefined para numero fora do catálogo — nunca uma entrada vazia silenciosa

estaObtida(indice: IndiceLibrary, numero: NumeroCarta): boolean
  // pós: falso tanto para carta não obtida quanto para numero inexistente

referenciaArteDaEntrada(
  numero: NumeroCarta,
  obtida: boolean,
  artes: ResolucaoArte,
): ReferenciaArte
  // pós: obtida false ⇒ { tipo: 'silhueta' }, sem consultar o resolvedor
  //      obtida true  ⇒ { tipo: 'arte', caminho } ou { tipo: 'placeholder' }
```

```
// apps/web/src/lib/library — fronteira de I/O

obterCatalogoLibrary(): Promise<Result<CatalogoLibrary, DomainError>>
  // CatalogoLibrary = { catalogo: ConsultaCatalogo & ListagemCatalogo; artes: ResolucaoArte }
  // pós: memoizado por processo; catálogo não selado ⇒ erro catalogo_indisponivel

carregarLibrary(deps: DependenciasLibrary): Promise<Result<LibraryCarregada, DomainError>>
  // deps: { obterCatalogo, carregarColecao }
  // pós: ok  ⇒ índice completo, com origemColecao 'servidor' ou 'cache'
  //      erro ⇒ catalogo_indisponivel (grade não abre)
  //           | colecao_indisponivel  (nenhuma carta assumida como obtida)
```

```
// apps/web/src/hooks — adaptador React fino, sem regra

useLibrary(): EstadoLibrary
  // EstadoLibrary = { situacao: 'carregando' }
  //               | { situacao: 'pronta'; carregada: LibraryCarregada; recarregar: () => void }
  //               | { situacao: 'erro';   erro: DomainError;           recarregar: () => void }
```

### Exemplos

`EntradaLibrary` obtida, com arte resolvida:

```json
{
  "obtida": true,
  "numero": "001",
  "carta": {
    "id": 1,
    "numero": "001",
    "nome": "Blue-eyes White Dragon",
    "img": null,
    "classe": "Dragon",
    "atk": 3000,
    "def": 2500,
    "guardiao1": "Sun",
    "guardiao2": "Mars",
    "password": "89 63 11 39",
    "estrelas": 999999,
    "tipo": "monstro"
  },
  "arte": { "tipo": "arte", "caminho": "cards-data/001.jpg" }
}
```

`EntradaLibrary` obtida cujo arquivo de arte não existe:

```json
{
  "obtida": true,
  "numero": "413",
  "carta": {
    "id": 413,
    "numero": "413",
    "nome": "Dark Magician Girl",
    "img": null,
    "classe": "Spellcaster",
    "atk": 2000,
    "def": 1700,
    "guardiao1": "Moon",
    "guardiao2": "Mercury",
    "password": "38 03 33 47",
    "estrelas": 60,
    "tipo": "monstro"
  },
  "arte": { "tipo": "placeholder" }
}
```

`EntradaLibrary` bloqueada — a forma inteira do objeto, sem nenhum atributo da carta:

```json
{
  "obtida": false,
  "numero": "380",
  "arte": { "tipo": "silhueta" }
}
```

`IndiceLibrary` (recortado; `porNumero` é derivado e não trafega):

```json
{
  "entradas": ["… 722 entradas ordenadas por numero …"],
  "total": 722,
  "obtidas": 47,
  "obtidasForaDoCatalogo": []
}
```

`LibraryCarregada` no ramo de cache, o que sustenta o aviso de dado desatualizado:

```json
{
  "indice": { "total": 722, "obtidas": 47, "obtidasForaDoCatalogo": [] },
  "origemColecao": "cache",
  "sincronizadaEm": "2026-07-27T12:00:00.000Z"
}
```

`IndiceLibrary` com `numero` possuído fora do catálogo — a contagem **não** o inclui:

```json
{
  "total": 722,
  "obtidas": 47,
  "obtidasForaDoCatalogo": ["998"]
}
```

### Contratos externos (cross-PRD)

- **`ConsultaCatalogo & ListagemCatalogo`** — *a ser fornecida por `banco-de-cartas`/F03.*
  `getByNumero(numero): Carta | undefined` (já declarada por `build-deck`/F01),
  `listarTodas(): readonly Carta[]` e `totalCanonico(): number`, sobre o dataset selado como
  válido por F02. Enquanto F03 não existir, os testes de `packages/rules` usam um catálogo falso
  em memória (guidelines §12.1) e `apps/web` falha com `catalogo_indisponivel` — nunca com uma
  grade vazia.
- **`ResolucaoArte`** — *a ser fornecida por `banco-de-cartas`/F04.*
  `resolver(numero): { tipo: 'arte'; caminho: string } | { tipo: 'placeholder' }`. A Library
  nunca monta o caminho `cards-data/{numero}.jpg` por conta própria — isso é convenção de F04
  (PRD `banco-de-cartas` §6 F04 Capabilities).
- **`derivarObtidas` e `carregarColecao`** — *a ser fornecida por `build-deck`/F01.* A spec
  daquele módulo já declara `derivarObtidas` como o contrato de leitura **oferecido à Library**;
  esta spec o consome sem redefinir. `carregarColecao` traz junto a procedência e o carimbo de
  sincronização.
- **Auth/Cadastro** — *a ser fornecida por Auth/Cadastro.* Pré-requisito indireto: sem sessão
  autenticada, `carregarColecao` falha com `sessao_ausente` e a Library exibe a mensagem de
  coleção indisponível.
- **Contrato oferecido a F02–F05** — `IndiceLibrary` e `ProgressoColecao` são a superfície pública
  desta feature. F02 consome `entradas` e `ProgressoColecao`; F03 e F04 filtram e reordenam
  `entradas`; F05 usa `porNumero` para o registro individual e a sequência de `entradas` já
  filtrada por F03/F04 para a navegação anterior/próxima.
- **Contrato oferecido a Password / Campanha / Free Duel** — nenhum. Esses módulos escrevem em
  `collections`; a Library apenas relê. Não há callback, invalidação nem canal de notificação
  nesta direção (Decisão 5).

## 5. Modelo de Dados

### Postgres / Supabase

Esta feature **não cria nem altera nenhuma tabela**. Ela lê `collections` exclusivamente através
de `carregarColecao` de `build-deck`/F01, que é quem possui a migração
`supabase/migrations/0001_create_collections.sql`, a política de RLS de `SELECT` e a validação de
linha.

Consequências que esta spec **herda** e das quais depende:

- **RLS ligada, com política de `SELECT` restrita a `player_id = auth.uid()`** — a Library só
  enxerga a coleção do jogador autenticado (`arquitetura.md` §5.1).
- **Nenhuma política de `INSERT`/`UPDATE`/`DELETE` para o cliente** — com RLS habilitada e sem
  política de escrita, o banco recusa qualquer gravação vinda daqui. É a garantia estrutural do
  critério "a Library nunca modifica o estado de coleção" (PRD §9 Cross-PRD Integration): não é só
  uma promessa de código, é uma permissão que não existe.
- **`quantity` é a coluna; "obtida" é derivado** — nenhuma coluna, tabela ou view booleana
  paralela é criada (Decisão 9).

### Cache local / fila offline

Nenhum store IndexedDB novo. A Library reusa o snapshot de coleção mantido por `build-deck`/F01 —
um registro por jogador, gravado a cada leitura bem-sucedida do servidor — e é dele que vem o ramo
`origemColecao: 'cache'`.

**Sem fila de mutações**, porque não há mutação: o módulo é somente-leitura de ponta a ponta
(PRD §7). O catálogo, por sua vez, não precisa de cache de aplicação — o service worker do PWA já
cacheia o bundle de cartas e as artes como parte do app shell (`arquitetura.md` §7), e a
memoização por processo da Decisão 5 cobre a releitura dentro de uma sessão.

### Arquivos de dados versionados

Nenhum produzido. A Library **consome** o bundle versionado de `banco-de-cartas` (`cards.json` e
`arts-manifest.json`, com `version` e `hash` de F09/F10) por intermédio do serviço de catálogo,
e nunca lê `cards-data/` diretamente (ADR-003 §6). O handshake de versão/hash é exigência do modo
online (`arquitetura.md` §6) e não se aplica a este módulo offline-first.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Falha ao carregar o catálogo (bundle ausente, dataset não selado por F02) | `obterCatalogoLibrary` | Erro `catalogo_indisponivel`. A coleção nem é consultada e **a grade não abre** | `Não foi possível carregar as cartas. Tente novamente.` + botão de recarregar |
| Falha ao carregar a coleção, sem cache | `carregarColecao` | Erro `colecao_indisponivel`. **Nenhum índice é construído**; nenhuma carta é marcada como obtida (Decisão 7) | `Não foi possível carregar sua coleção. Tente novamente.` |
| Falha ao carregar a coleção, **com** cache | `carregarColecao` | **Sucesso** com `origemColecao: 'cache'` e o `sincronizadaEm` gravado (Decisão 4) | `Coleção carregada do cache; algumas cartas podem estar desatualizadas.` |
| Sem sessão autenticada | `carregarColecao` (`sessao_ausente`) | Propagado como falha de coleção; a Library não abre a grade | `Faça login para ver sua coleção.` |
| Carta do catálogo sem arquivo de arte | `ResolucaoArte` | Entrada recebe `{ tipo: 'placeholder' }` e **segue exibindo os demais campos**. Não interrompe o cruzamento | — (a UI mostra o placeholder) |
| Carta com `img` nulo | Não é caso de erro | `img` é `null` nos 722 registros por construção; a arte sempre se resolve por `numero`. Nenhum ramo especial | — |
| `numero` obtido ausente do catálogo | `montarIndiceLibrary` | Ignorado nas contagens, acumulado em `obtidasForaDoCatalogo` e registrado em `warn`. Não aborta (Decisão 10) | — (registro técnico) |
| Coleção legitimamente vazia (jogador novo) | Leitura bem-sucedida com 0 obtidas | Estado **válido**, não é erro: índice com 722 entradas bloqueadas e `obtidas: 0`. O estado vazio da grade é de F02 | Tratado por F02 |
| Coleção completa (722 obtidas) | Contagem | `obtidas === total`; nenhum ramo especial, o indicador exibe "722 de 722" | — |
| Catálogo vazio ou com `totalCanonico()` igual a 0 | `montarIndiceLibrary` | Índice vazio com `total: 0`. Não é falha desta feature: dataset vazio é reprovado por `banco-de-cartas`/F02 antes de ser servido | `Não foi possível carregar as cartas. Tente novamente.` |
| Consulta a `numero` inexistente (F05 via deep link) | `buscarEntrada` | `undefined` explícito, nunca uma entrada vazia silenciosa. F05 decide a apresentação | Tratado por F05 |
| Recarregar enquanto um carregamento está em curso | `useLibrary` | A chamada em curso é descartada; vence a mais recente. Sem estado meio-atualizado, porque o índice é substituído por inteiro | — |
| Troca de jogador na mesma sessão do navegador | `carregarColecao` (chave `playerId`) | Cada jogador lê sua própria coleção; o catálogo memoizado é compartilhado porque é global e imutável | — |
| Cartas obtidas mudam enquanto a Library está aberta (outra aba) | Não detectado | Comportamento aceito: o índice reflete a leitura da abertura. A atualização vem da próxima abertura ou de `recarregar()` — é exatamente o que o critério cross-PRD do PRD §9 descreve | — |

Todo descarte é **registrado**, nunca silencioso (guidelines §8.3). Os registros são estruturados,
com `playerId` e `numero` no contexto e sem dado sensível (guidelines §23.3).

## 7. Estratégia de Testes

### Unitários (Vitest)

`montarIndiceLibrary`:
- `montarIndiceLibrary emite uma entrada para cada carta do catalogo`
- `montarIndiceLibrary marca como obtida a carta presente no conjunto de obtidas`
- `montarIndiceLibrary marca como nao obtida a carta ausente do conjunto de obtidas`
- `montarIndiceLibrary omite o campo carta na entrada nao obtida`
- `montarIndiceLibrary anexa os doze campos canonicos na entrada obtida`
- `montarIndiceLibrary nao acrescenta campo fora do schema canonico da carta`
- `montarIndiceLibrary ordena as entradas por numero crescente`
- `montarIndiceLibrary indexa porNumero com as mesmas chaves de entradas`
- `montarIndiceLibrary usa o total canonico do catalogo e nao um literal`
- `montarIndiceLibrary ignora numero obtido ausente do catalogo na contagem de obtidas`
- `montarIndiceLibrary lista numero obtido ausente do catalogo em obtidasForaDoCatalogo`
- `montarIndiceLibrary devolve obtidas zero para colecao vazia`
- `montarIndiceLibrary devolve obtidas igual a total quando todas as cartas foram obtidas`

`referenciaArteDaEntrada`:
- `referenciaArteDaEntrada devolve silhueta para carta nao obtida`
- `referenciaArteDaEntrada nao consulta o resolvedor para carta nao obtida`
- `referenciaArteDaEntrada devolve arte com caminho para carta obtida com arquivo presente`
- `referenciaArteDaEntrada devolve placeholder para carta obtida sem arquivo de arte`
- `referenciaArteDaEntrada nunca devolve caminho na variante silhueta`

`calcularProgresso` / `buscarEntrada` / `estaObtida`:
- `calcularProgresso devolve obtidas e total do indice`
- `calcularProgresso devolve obtidas menor ou igual a total`
- `buscarEntrada devolve a entrada correspondente ao numero`
- `buscarEntrada devolve undefined para numero fora do catalogo`
- `estaObtida devolve falso para carta nao obtida`
- `estaObtida devolve falso para numero inexistente no catalogo`

`carregarLibrary` (com catálogo, resolvedor e carregador de coleção falsos, guidelines §12.1):
- `carregarLibrary devolve indice completo quando catalogo e colecao carregam`
- `carregarLibrary falha com catalogo_indisponivel quando o catalogo nao carrega`
- `carregarLibrary nao consulta a colecao quando o catalogo falha`
- `carregarLibrary falha com colecao_indisponivel quando a colecao nao carrega`
- `carregarLibrary nao devolve indice com todas as cartas nao obtidas quando a colecao falha`
- `carregarLibrary propaga origemColecao servidor quando a leitura remota tem sucesso`
- `carregarLibrary propaga origemColecao cache quando a leitura remota cai no cache`
- `carregarLibrary preserva o sincronizadaEm devolvido pelo carregamento da colecao`
- `carregarLibrary reusa o catalogo memoizado na segunda chamada`
- `carregarLibrary relê a colecao a cada chamada mesmo com o catalogo memoizado`

### Property-based (fast-check)

- **Conservação do universo:** para qualquer catálogo e qualquer conjunto de obtidas,
  `|entradas| === catalogo.totalCanonico()`. Nenhuma carta do jogo desaparece do índice nem é
  contada duas vezes, independentemente do que o jogador possui. 1.000 execuções.
- **Invariante de contagem:** para qualquer entrada, `0 ≤ obtidas ≤ total`, e `obtidas` é
  exatamente `|obtidas ∩ numeros do catálogo|`. É a propriedade que impede o indicador de exibir
  "725 de 722" (Decisão 10).
- **Redação total:** para qualquer índice gerado, **nenhuma** entrada com `obtida: false` possui
  a chave `carta`, e nenhuma delas possui referência de arte com `caminho`. Prova o critério
  "sem revelar demais campos" sobre o espaço inteiro de entradas, não sobre casos escolhidos a
  dedo (Decisão 2 e 3).
- **Independência da ordem de iteração:** para qualquer permutação da ordem de inserção no
  conjunto de obtidas, `montarIndiceLibrary` devolve `entradas` idênticas, na mesma ordem.
- **Coerência entre as duas visões:** para qualquer índice, `porNumero` tem exatamente as mesmas
  chaves que os `numero` de `entradas`, e `porNumero.get(n)` é o mesmo objeto que a entrada
  correspondente na lista.
- **Idempotência do cruzamento:** aplicar `montarIndiceLibrary` duas vezes sobre as mesmas
  entradas produz índices estruturalmente iguais — a função não guarda estado entre chamadas.

### Integração

`apps/web/tests/library.integration.test.ts`, contra o dataset real ingerido e uma instância
Supabase local com a migração de `build-deck`/F01 aplicada:

- `carregarLibrary contra o dataset real emite 722 entradas`
- `carregarLibrary contra o dataset real usa total 722 vindo do catalogo`
- `carregarLibrary marca como obtidas exatamente as cartas em collections do jogador autenticado`
- `carregarLibrary devolve todas as entradas bloqueadas para jogador sem cartas`
- `carregarLibrary resolve arte para as 722 cartas do dataset real sem cair em placeholder`
- `carregarLibrary nao expoe atributos de carta em nenhuma entrada bloqueada do dataset real`
- `carregarLibrary com a rede indisponivel devolve origemColecao cache`
- `carregarLibrary falha quando o dataset nao esta selado como valido`
- `recarregar reflete uma carta inserida em collections entre as duas leituras`
- `carregarLibrary do jogador A nao enxerga as cartas obtidas do jogador B`
- `carregarLibrary nao emite nenhuma escrita em collections`

### Análise estática

- `packages/rules/src/library/**` não importa React, DOM, `fetch`, Supabase, `node:fs` nem
  `node:process` — o cruzamento é puro e testável sem navegador nem banco (guidelines §3.3, §12).
- `packages/rules` importa apenas `packages/shared`; nenhum import de `data`, `engine`, `ai`,
  `web` ou `server` (`arquitetura.md` §2).
- Nenhum arquivo da Library referencia `cards-data/` nem monta o caminho de arte por
  concatenação — a resolução vem exclusivamente de `ResolucaoArte` (ADR-003 §6; PRD
  `banco-de-cartas` §6 F04).
- Nenhum arquivo de `apps/web` reimplementa o predicado "obtida", a contagem de progresso ou a
  escolha entre arte, placeholder e silhueta — os três vêm de `packages/rules` (ADR-004).
- Nenhum arquivo da Library contém o literal `722`; a contagem vem de `totalCanonico()`
  (Decisão 8).
- Nenhum arquivo da Library executa `insert`, `update`, `upsert` ou `delete` sobre `collections`
  (PRD §7).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F01) | Teste |
|---|---|
| As 722 cartas do banco são carregadas e indexadas por `numero`, com os 12 campos do schema disponíveis | `carregarLibrary contra o dataset real emite 722 entradas` + `montarIndiceLibrary indexa porNumero com as mesmas chaves de entradas` + `montarIndiceLibrary anexa os doze campos canonicos na entrada obtida` |
| Cada carta é marcada corretamente como obtida ou não obtida, no modelo booleano, sem contagem de cópias | `montarIndiceLibrary marca como obtida a carta presente no conjunto de obtidas` + `montarIndiceLibrary marca como nao obtida a carta ausente do conjunto de obtidas` + `carregarLibrary marca como obtidas exatamente as cartas em collections do jogador autenticado`. A ausência de contagem é estrutural: `EntradaLibrary` não tem campo de quantidade |
| O total (722) e a contagem de obtidas são expostos corretamente para o indicador | `montarIndiceLibrary usa o total canonico do catalogo e nao um literal` + `calcularProgresso devolve obtidas e total do indice` + a propriedade de invariante de contagem + `carregarLibrary contra o dataset real usa total 722 vindo do catalogo` |
| Falha ao carregar o banco de cartas exibe a mensagem correspondente e **não abre a grade** | `carregarLibrary falha com catalogo_indisponivel quando o catalogo nao carrega` + `carregarLibrary nao consulta a colecao quando o catalogo falha` — sem índice, F02 não tem o que renderizar |
| Falha ao carregar a coleção exibe a mensagem correspondente e nenhuma carta é assumida como obtida (fail-safe) | `carregarLibrary falha com colecao_indisponivel quando a colecao nao carrega` + `carregarLibrary nao devolve indice com todas as cartas nao obtidas quando a colecao falha` |
| Carta com `img` nulo ou sem arquivo de arte usa placeholder, sem quebrar o carregamento | `referenciaArteDaEntrada devolve placeholder para carta obtida sem arquivo de arte` + `montarIndiceLibrary emite uma entrada para cada carta do catalogo` sob resolvedor que falha para parte das cartas |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: cartas marcadas como obtidas em F01 aparecem na grade de F02 e abrem detalhe completo em F05 | `montarIndiceLibrary marca como obtida a carta presente no conjunto de obtidas` + `buscarEntrada devolve a entrada correspondente ao numero` — F01 entrega a lista que F02 renderiza e o acesso por identidade que F05 consome; a renderização em si é testada por F02/F05 |
| Cross-Feature: o filtro de status "não obtidas"/"todas" (F04) faz surgir células bloqueadas, que mostram apenas o estado bloqueado em F05 | `montarIndiceLibrary omite o campo carta na entrada nao obtida` + `referenciaArteDaEntrada devolve silhueta para carta nao obtida` + a propriedade de redação total — F04 e F05 não *conseguem* revelar atributos, porque eles não estão na estrutura |
| Cross-Feature: o indicador "X de 722 obtidas" (F02) usa a contagem exposta por F01 e muda quando a coleção subjacente muda | `calcularProgresso devolve obtidas e total do indice` + `recarregar reflete uma carta inserida em collections entre as duas leituras` |
| Cross-Feature: busca (F03) e filtros/ordenação (F04) refletem-se na navegação de F05 | `montarIndiceLibrary ordena as entradas por numero crescente` + `montarIndiceLibrary indexa porNumero com as mesmas chaves de entradas` — F01 entrega uma sequência base estável e a mesma identidade nas duas visões, que é o que permite a F03/F04 derivarem a sequência que F05 percorre |
| Cross-PRD: carta liberada pelo Password consta como obtida na Library após recarregar o estado de coleção | `recarregar reflete uma carta inserida em collections entre as duas leituras` + `carregarLibrary relê a colecao a cada chamada mesmo com o catalogo memoizado` |
| Cross-PRD: carta concedida por Campanha/Free Duel aparece como obtida na próxima abertura da Library | Mesmo par de testes acima — o caminho é idêntico, porque ambos os módulos escrevem na mesma tabela `collections` (`arquitetura.md` §5.1) e a Library relê a cada abertura |
| Cross-PRD: a Library nunca modifica o estado de coleção mantido por Save/Password/Campanha | `carregarLibrary nao emite nenhuma escrita em collections` + a análise estática que proíbe `insert`/`update`/`upsert`/`delete` + a herança da RLS sem política de escrita para o cliente (Seção 5) — o banco recusaria a escrita mesmo que o código a tentasse |
| Cross-PRD: Library e Build Deck exibem `atk`/`def`/`classe`/`guardiões` de forma consistente | `montarIndiceLibrary nao acrescenta campo fora do schema canonico da carta` + análise estática de que nenhum arquivo da Library lê `cards-data/` — os dois módulos consomem o mesmo `ConsultaCatalogo` sobre o mesmo dataset selado (ADR-003) |
| Cross-PRD: a coleção não vaza entre jogadores | `carregarLibrary do jogador A nao enxerga as cartas obtidas do jogador B` — herdado da RLS de `build-deck`/F01 |
