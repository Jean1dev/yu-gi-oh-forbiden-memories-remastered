# Seleção de Oponente (Roster de Duelistas)

> PRD: `docs/prds/free-duel.md` — F01
> Pacote-alvo: `packages/data` (+ `packages/shared`, `apps/web`)

## 1. Contexto e Escopo

Esta feature entrega a **fonte de dados dos oponentes NPC** do Free Duel e a **tela de seleção**
que a apresenta ao jogador. Do lado de dados: o schema do roster (duelista → nome, retrato,
deck de 40 cartas, perfil de dificuldade/estratégia e pool de drops por faixa de raridade), o
loader que valida esse arquivo contra o catálogo canônico de cartas, e as consultas que F03
(orquestração) e F06 (drop) vão consumir. Do lado de interface: a tela que lista os duelistas
com retrato, nome e indicador de dificuldade, e a confirmação que entrega o oponente escolhido
ao fluxo de preparação da partida.

É a **Foundation** do módulo (PRD §8, Parte 2) e pertence à **Fase 3** do roadmap
(`docs/arquitetura.md` §9 — "Free Duel vs IA"), com `Dependências: None` na tabela do PRD §8.
O desenho segue três decisões já travadas: o roster é **dado, não código** (PRD §1 e F01
Capabilities; pilar 3 de `arquitetura.md` §1; ADR-003), a validação vive num pacote puro e a UI
apenas apresenta (`arquitetura.md` §7 "UI **não** contém regra"; ADR-004), e valores de
balanceamento **não são inventados** — o roster viaja vazio até o dado oficial chegar, com
comportamento neutro e legível (`arquitetura.md` §4.3 e §10; ADR-003 §6).

O par "dado + tela" fica em pacotes diferentes de propósito: toda regra de integridade do roster
(40 cartas, ≤ 3 cópias, carta existente, ocultação de duelista inválido) é de `packages/data`;
`apps/web` apenas consome o resultado já validado e o renderiza. Isso mantém a regra fora da UI
e permite que a Campanha (cross-PRD) e `apps/server` reusem a mesma validação sem tocar em React.

### Incluído

- Contrato canônico de duelista e de roster (tipos + schemas zod) em `packages/shared`, consumido
  por `data`, `ai` (via F03) e `web`
- Arquivo de dados do roster versionado, autorado à mão, **fora do código** — adicionar duelista é
  edição de dados (PRD F01 Capabilities e Experience)
- Loader puro do roster: parse, validação de schema, validação cruzada contra o catálogo de cartas
  e agregação em roster utilizável
- Validação por duelista dos invariantes da Fase 0: deck de **exatamente 40 cartas**, **máximo 3
  cópias** do mesmo `numero`, e **apenas cartas existentes** no catálogo
- Ocultação de duelista inconsistente com registro estruturado da inconsistência, sem derrubar a
  tela nem contaminar os duelistas válidos
- Consulta do **deck do NPC** e do **perfil de dificuldade/estratégia** (contrato consumido por F03)
- Consulta do **pool de drops** do duelista por faixa de raridade (contrato consumido por F06),
  com pool vazio como resposta válida
- Cache local do último roster validado e recuperação a partir dele quando a leitura falhar,
  com sinalização ao jogador (PRD F01 Error Handling)
- Tela de seleção: grade de duelistas com retrato, nome e indicador de dificuldade; seleção,
  confirmação e navegação para a preparação da partida (PRD F01 Experience)
- Estados degradados legíveis: roster vazio, roster vindo do cache, catálogo indisponível,
  retrato ausente
- Script de validação do roster em tempo de build, para que erro de balanceamento apareça no CI e
  não só em runtime

### Fronteiras

Delimitadas pela Seção 7 do PRD (Fora de Escopo) e pelos blocos Consumes das features vizinhas:

- **Decisão de jogadas da CPU** → **IA de NPCs (cross-PRD)**. F01 apenas **provê** o perfil de
  dificuldade/estratégia; não interpreta, não pontua e não importa `packages/ai`.
- **Validação e resolução de regras de duelo** → **Motor de Duelo 1x1 (cross-PRD)**. F01 não
  chama `initDuel` nem monta partida; isso é F03.
- **Sorteio da carta de drop e pesos de raridade por nota** → **F06** e **Rating Engine
  (cross-PRD)**. F01 só devolve o pool de candidatas; quem sorteia e quem pondera são outros.
- **Cálculo de nota** → **Rating Engine (cross-PRD)** via **F05**.
- **Deck do jogador** → **F02** (que o lê de `BuildDeck/F07`, cross-PRD). F01 valida apenas decks
  de NPC.
- **Seletor de dificuldade independente do oponente** → fora desta versão (PRD §7). A dificuldade
  é atributo fixo do duelista.
- **Composição do roster** (quais duelistas, seus decks, dificuldades e pools) → **dado de
  balanceamento a definir** (PRD §7 e §9; `arquitetura.md` §10). F01 entrega schema, loader,
  validação e caminho neutro — nunca valores.
- **Empacotamento do bundle de dados, `version` e `hash`** → **banco-de-cartas F09/F10**
  (cross-PRD). O roster é **entrada** desse bundle; F01 não versiona nem assina o pacote.
- **Renderização fina, animação e som** → camada de apresentação (PRD §7). Esta spec descreve
  estrutura de tela, estados e limites, não estética.

### Contratos externos assumidos

- **`packages/data` / banco-de-cartas (cross-PRD)** — catálogo canônico de 722 cartas no schema da
  Fase 0 (`id, numero, nome, img, classe, atk, def, guardiao1, guardiao2, password, estrelas,
  tipo`), com **consulta por `numero`** (banco-de-cartas F03) e o **manifesto de artes**
  (banco-de-cartas F04). F01 usa o catálogo exclusivamente para provar que **cada `numero`** do
  deck de NPC e do pool de drops **existe**. Detalhe em §4.
- **`packages/ai` / IA de NPCs (cross-PRD)** — consumidor do perfil de dificuldade que F01
  fornece, via F03. O **conjunto de identificadores de estratégia válidos** pertence a esse
  módulo; F01 valida forma, não semântica.
- **Motor de Duelo 1x1 (cross-PRD)** — `initDuel` (`arquitetura.md` §3.1) recebe os dois decks +
  seed. F01 se compromete apenas com o formato do deck de NPC entregue a F03.
- **banco-de-cartas F09/F10 (cross-PRD)** — bundle versionado com `version` + `hash`, que
  transporta o roster junto do catálogo e habilita a invalidação do cache local.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O roster (duelistas, decks de NPC e pools de drop) é uma **tabela de dados hospedada em `packages/data`**, e não em `apps/web` nem em `packages/ai`. Motivos: a validação exige o catálogo, que vive em `data`; a regra de integridade não pode viver na UI; e Campanha (cross-PRD) e `apps/server` precisam da mesma validação sem depender de React. | `arquitetura.md` §2, §4.3, §7; guidelines §3.2; PRD §1 ("roster, decks de NPC e pools de drop vivem em dados") | confirmada |
| 2 | O **pool de drops por duelista é declarado dentro do arquivo de roster**, e essa mesma tabela satisfaz `banco-de-cartas/F08` ("Tabelas de Drop por Duelista"): **uma fonte física, não duas**. Se F08 for implementada primeiro e publicar seu próprio schema de pool, o loader de F01 **compõe** o schema de F08 em vez de definir um concorrente. | PRD `free-duel` F01 Capabilities × PRD `banco-de-cartas` F08; `arquitetura.md` §4.3 | **a confirmar** — convergência com F08 |
| 3 | `NivelDificuldade` é um union fechado de três valores (`facil`, `medio`, `dificil`), derivado do exemplo da Experience do PRD. É **rótulo de apresentação**, não parâmetro de IA. Se o dado oficial de balanceamento exigir mais faixas, é mudança de constante em `shared` sem impacto em loader ou tela. | PRD F01 Experience; auto-aceite: "Especificação parcial no PRD" | **a confirmar** — escala pode mudar com o balanceamento |
| 4 | `estrategia` é uma **string não-vazia opaca** e não um enum fechado, porque o conjunto de estratégias válidas pertence à IA de NPCs (cross-PRD). F01 valida forma e unicidade, nunca semântica. Mesmo critério aplicado a `classe` na spec de `banco-de-cartas` F01 (Decisão 8). | PRD §7 ("lógica de decisão da IA é cross-PRD"); precedente `docs/specs/banco-de-cartas/F01-.../spec.md` | confirmada |
| 5 | A **faixa de raridade** do pool é um identificador `string` não-vazio, sem enum fechado e **sem pesos**. Nomear as faixas e ponderá-las é dado de balanceamento (PRD F06) e responsabilidade do Rating Engine (cross-PRD). F01 valida unicidade das faixas e existência das cartas. | PRD F01/F06 Capabilities; `arquitetura.md` §10; auto-aceite: tabela de dado externo pendente | pendente — aguarda dado |
| 6 | O roster é entregue **vazio** no repositório (`duelistas: []`). Roster vazio é **estado válido**, não erro: a tela mostra um estado vazio legível e a confirmação fica indisponível. Nenhum duelista, deck, dificuldade, pool ou peso é inventado. | `arquitetura.md` §4.3, §10; ADR-003 §6; auto-aceite: tabela de dado externo pendente | pendente — aguarda dado |
| 7 | Pool de drops vazio ou faixa inexistente devolve **lista vazia**, nunca erro. O fallback para a faixa comum padrão do catálogo é decisão de **F06** (PRD F06 Error Handling); F01 não escolhe carta nenhuma. | PRD F06 Error Handling; `arquitetura.md` §4.3 (ausência = neutro) | confirmada |
| 8 | **Um único schema** descreve o arquivo de roster e o roster em memória — sem par "schema de origem × schema canônico". O arquivo é autorado à mão diretamente na forma canônica, diferente de `cards-data/`, que vinha de origem externa suja e por isso exigiu dois schemas em `banco-de-cartas` F01. | precedente `banco-de-cartas` F01 §4; guidelines §24 regra 1 | confirmada |
| 9 | O núcleo do roster em `packages/data/src/roster/**` é **puro**: recebe conteúdo já lido e o catálogo por injeção, devolve `Result`, sem `node:fs`, `fetch`, IndexedDB ou `console`. Todo I/O e todo log ficam nas bordas (`apps/web`, script de build). | guidelines §3.3, §7.3, §19.2, §23.1; precedente `banco-de-cartas` F01 §2 | confirmada |
| 10 | Duelista inválido é **ocultado**, e o lote **continua**: um duelista quebrado nunca invalida os demais. Simetria com a ingestão de cartas, onde registro inválido é descartado sem abortar o lote. | PRD F01 Error Handling; precedente `banco-de-cartas` F01 (Decisão 10) | confirmada |
| 11 | **`id` de duelista duplicado**: em runtime, preserva a primeira ocorrência, oculta as seguintes e registra a inconsistência; no script de build, o duplicado gera exit code diferente de zero. Runtime prioriza o jogador nunca ver tela quebrada; CI prioriza pegar o erro de autoria antes do release. | PRD F01 Error Handling; precedente `banco-de-cartas` F01 (colisão como falha de autoria) | confirmada |
| 12 | Se o **catálogo de cartas não estiver disponível**, a tela **não exibe roster não validado** — bloqueia com mensagem e oferece nova tentativa. Exibir duelistas sem validar violaria o critério de integridade do PRD §4 ("100% dos oponentes referenciam decks válidos"). | PRD §4 Métricas; ADR-003 §6 (dados inválidos falham antes de serem servidos) | confirmada |
| 13 | O cache local do roster guarda o **último snapshot já validado** (não o arquivo bruto), em IndexedDB, invalidado por `versao` + `hash` do bundle. Guardar o bruto obrigaria a revalidar sem catálogo disponível — exatamente o cenário de falha. | `arquitetura.md` §5.4; PRD F01 Error Handling | confirmada |
| 14 | Os **retratos dos duelistas não existem no repositório** (`cards-data/` só tem artes de carta). O roster declara `retrato` como caminho relativo de asset; ausência resolve em **placeholder**, sem ocultar o duelista — mesmo tratamento que arte de carta faltante em `banco-de-cartas` F04. | `arquitetura.md` §4.1 ("faltas → placeholder"); auto-aceite: dado externo pendente | pendente — aguarda asset |
| 15 | F01 **não introduz store global de estado** (Zustand vs `useReducer`+context segue em aberto em `arquitetura.md` §7). A seleção é estado efêmero local do componente, e o handoff para F02/F03 é por **parâmetro de rota**. A decisão de store fica para F03, que é quem tem estado de runtime de duelo. | `arquitetura.md` §7 (decisão em aberto); auto-aceite: aplicar default consistente com os guidelines | **a confirmar** — reavaliar em F03 |
| 16 | A tela de seleção é **Client Component** sob uma rota fina de App Router, porque precisa funcionar offline lendo o bundle cacheado pelo service worker e o snapshot de IndexedDB. | ADR-004; `arquitetura.md` §7 (PWA) | confirmada |
| 17 | A rota de destino da confirmação (`/free-duel/[duelistaId]/preparar`) é **de F02**; F01 apenas navega para ela passando o `duelistaId`. F01 não renderiza nada dessa etapa. | PRD F01 Experience ("confirma para prosseguir à preparação (F02/F03)") | confirmada |
| 18 | `TAMANHO_DECK_OBRIGATORIO = 40` e `MAX_COPIAS_POR_CARTA = 3` são invariantes da Fase 0 compartilhados com `build-deck` e `motor-duelo-1x1`. F01 os **declara pela primeira vez** em `packages/shared/src/deck/constantes.ts`, fonte única do monorepo. Verificado: `build-deck` F01 **não** os declara — entrega apenas `limiteCopias(quantidade) = min(quantidade, 3)` (teto **por carta**, derivado da posse) e delega explicitamente a validação de 40 cartas e do teto de 3 cópias à **`build-deck` F06**, que ainda não tem spec. `free-duel` F02 já reusa este arquivo sem criar paralelo. | `product.md`; Fase 0.3 do skill; guidelines §5.2; `build-deck` F01 §1 (fronteira "validação → F06"); `free-duel` F02 (Decisão 2) | confirmada — **reavaliar quando `build-deck` F06 ganhar spec**, que deve consumir este arquivo |
| 19 | Não há tabela Postgres nem escrita de qualquer natureza nesta feature. O roster não é dado por jogador e a seleção é somente leitura (PRD F01 Capabilities), então nada entra em `arquitetura.md` §5.1 e nada entra na fila de mutações offline. | PRD F01 Capabilities ("somente leitura"); `arquitetura.md` §5.1, §5.4 | confirmada |
| 20 | Não existe código de implementação no repositório: nem `packages/` nem `apps/`. A Camada 0 (arquitetura + ADRs + guidelines + specs precedentes) é a única fonte de padrões desta spec, e o scaffolding do monorepo é pré-requisito herdado de `banco-de-cartas` F01, não recriado aqui. Precedentes aplicáveis: `banco-de-cartas` F01 (usado aqui) e `build-deck` F01 — este último **não foi consultado na redação** e deve ser lido antes de codar, porque amplia o charter de `packages/rules` para regra de montagem e fixa as convenções de `Result`/`DomainError` e de injeção do catálogo que `free-duel` F02 já seguiu. | estado do repositório; `banco-de-cartas` F01 (Decisão 14); `build-deck` F01 (Decisão 1); auto-aceite: "Sem código ainda" | confirmada |
| 21 | Esta feature não tem divisão Core/Full Scope no PRD — a spec cobre o **escopo completo** de F01. | PRD §6 F01 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/deck/constantes.ts` | shared | novo | `TAMANHO_DECK_OBRIGATORIO`, `MAX_COPIAS_POR_CARTA` — fonte única do monorepo, reusada por `free-duel` F02 e destinada a `build-deck` F06 (Decisão 18) |
| `packages/shared/src/duelista/tipos.ts` | shared | novo | `DuelistaId`, `NivelDificuldade`, `PerfilDificuldade`, `IdFaixaRaridade`, `PoolDrops`, `DeckNpc`, `Duelista`, `Roster` |
| `packages/shared/src/duelista/schema.ts` | shared | novo | `DuelistaIdSchema`, `PerfilDificuldadeSchema`, `PoolDropsSchema`, `DuelistaSchema`, `RosterSchema` |
| `packages/shared/src/duelista/constantes.ts` | shared | novo | `NIVEIS_DIFICULDADE`, códigos de erro do roster |
| `packages/shared/src/index.ts` | shared | alterado | Acrescenta os exports públicos de `duelista/` e `deck/` |
| `packages/data/data/roster.json` | data | novo | Arquivo de dados autorado do roster, versionado em git, entregue vazio (Decisão 6) |
| `packages/data/src/roster/validar-duelista.ts` | data | novo | Validação pura de um duelista: 40 cartas, ≤ 3 cópias, `numero` existente, retrato, perfil, pool |
| `packages/data/src/roster/carregar-roster.ts` | data | novo | Loader puro: parse → schema → validação cruzada → roster + relatório de inconsistências |
| `packages/data/src/roster/pool-drops.ts` | data | novo | Consulta do pool de drops por duelista e por faixa, com resposta vazia neutra |
| `packages/data/src/roster/index.ts` | data | novo | Export público do subsistema de roster |
| `packages/data/scripts/validate-roster.ts` | data | novo | Adaptador CLI de build: lê roster + catálogo, valida, imprime relatório, define exit code |
| `packages/data/src/roster/validar-duelista.test.ts` | data | novo | Unitários table-driven da validação por duelista |
| `packages/data/src/roster/carregar-roster.test.ts` | data | novo | Unitários do loader + propriedades fast-check |
| `packages/data/src/roster/pool-drops.test.ts` | data | novo | Unitários da consulta de pool, incluindo caminho neutro |
| `packages/data/tests/fixtures/roster/` | data | novo | Rosters sintéticos: válido, deck curto, 4 cópias, carta inexistente, id duplicado, vazio, malformado |
| `packages/data/tests/roster.integration.test.ts` | data | novo | Integração contra o catálogo real e o `roster.json` entregue |
| `apps/web/lib/free-duel/cache-roster.ts` | web | novo | Store IndexedDB do último roster validado (leitura, escrita, invalidação por versão/hash) |
| `apps/web/lib/free-duel/carregar-roster-cliente.ts` | web | novo | Adaptador de borda: obtém roster e catálogo do bundle, chama o loader, cai no cache em falha, loga inconsistências |
| `apps/web/app/free-duel/page.tsx` | web | novo | Rota fina do App Router para a tela de seleção |
| `apps/web/app/free-duel/selecao-oponente.tsx` | web | novo | Client Component: carrega, lista, seleciona, confirma e navega |
| `apps/web/components/free-duel/cartao-duelista.tsx` | web | novo | Retrato, nome e indicador de dificuldade de um duelista |
| `apps/web/components/free-duel/indicador-dificuldade.tsx` | web | novo | Rótulo acessível do nível de dificuldade |
| `apps/web/components/free-duel/estado-vazio-roster.tsx` | web | novo | Estado vazio legível quando não há duelista disponível |
| `apps/web/components/free-duel/aviso-roster.tsx` | web | novo | Faixa de aviso: roster do cache, catálogo indisponível |
| `apps/web/lib/free-duel/carregar-roster-cliente.test.ts` | web | novo | Unitários do adaptador: falha de leitura, cache, invalidação, catálogo ausente |
| `apps/web/app/free-duel/selecao-oponente.test.tsx` | web | novo | Unitários de tela: lista, seleção, confirmação, estados degradados |
| `.dependency-cruiser.cjs` | raiz | alterado | Regras de fronteira do subsistema de roster (§7 Análise estática) |
| `turbo.json` | raiz | alterado | Tarefa `roster:validate` dependente da ingestão de cartas |

**Verificação da direção de dependências:**

- `packages/shared` continua sem importar nada do monorepo.
- `packages/data/src/roster/**` importa **apenas** `packages/shared`; recebe o catálogo por
  injeção (uma função de consulta por `numero`), então não depende nem do formato do bundle nem
  de como o catálogo foi carregado.
- `apps/web` importa `packages/data` e `packages/shared`. Nenhum import na direção contrária.
- Nenhum arquivo desta feature importa `packages/rules`, `packages/engine`, `packages/ai`,
  `apps/server` ou Supabase. A direção `shared ← data` de `arquitetura.md` §2 é respeitada, e
  `web` aparece só como consumidor.
- Esta feature **não toca `packages/engine`** — não há estado de duelo, PRNG nem ação de motor
  aqui. As garantias de pureza/determinismo do motor não se aplicam; a pureza exigida é a de
  `data` (Decisão 9), verificada por análise estática.
- `packages/data/src/roster/**` **não** importa React, DOM, `node:fs`, `fetch`, IndexedDB nem
  `console`; `packages/data/scripts/validate-roster.ts` e `apps/web/lib/free-duel/**` são as
  únicas bordas com I/O.

## 3. Design Técnico

### Estruturas de dados

**`Duelista`** (`packages/shared`) — a forma autorada no arquivo e servida em memória:

| Campo | Tipo | Semântica e regra |
|---|---|---|
| `id` | `DuelistaId` | String `^[a-z0-9][a-z0-9-]{1,31}$`. Chave estável do duelista; keyed por F06 no ledger de recompensa e pela IA. Único no roster |
| `nome` | `string` | Não-vazia, ≤ 60 caracteres. Rótulo exibido |
| `retrato` | `string` | Caminho relativo do asset de retrato, `^[a-z0-9/_-]+\.(jpg\|png\|webp)$`. Ausência do arquivo resolve em placeholder (Decisão 14) |
| `nivel` | `NivelDificuldade` | Um de `facil`, `medio`, `dificil`. Indicador exibido antes da escolha (PRD F01 Capabilities) |
| `perfil` | `PerfilDificuldade` | Perfil consumido pela IA via F03. Opaco para F01 |
| `deck` | `DeckNpc` | Exatamente 40 `numero`, máx. 3 repetições do mesmo `numero`, todos existentes no catálogo |
| `poolDrops` | `PoolDrops` | Faixas de raridade → candidatas. Pode ser vazio (Decisão 7) |

**`PerfilDificuldade`** — o contrato que F01 **provê** e a IA de NPCs consome:

| Campo | Tipo | Semântica |
|---|---|---|
| `estrategia` | `string` | Identificador opaco de estratégia, não-vazio. Semântica pertence a `packages/ai` (Decisão 4) |
| `parametros` | `Record<string, number \| string \| boolean>` | Ajustes livres por duelista, chaves não-vazias. F01 valida forma, não significado |

**`PoolDrops`** — array de faixas, ordem preservada do arquivo:

| Campo | Tipo | Semântica |
|---|---|---|
| `faixa` | `IdFaixaRaridade` | String não-vazia, `^[a-z0-9][a-z0-9-]{0,31}$`, única dentro do pool (Decisão 5) |
| `numeros` | `readonly NumeroCarta[]` | Candidatas da faixa, ≥ 1 entrada, todas existentes no catálogo, sem `numero` repetido dentro da faixa |

**`Roster`** — envelope do arquivo de dados:

| Campo | Tipo | Semântica |
|---|---|---|
| `versaoRoster` | `string` | Versão declarada pelo autor do dado, `^\d+\.\d+\.\d+$`. Compõe a chave do cache local |
| `duelistas` | `readonly Duelista[]` | Lista na ordem de exibição. Pode ser vazia (Decisão 6) |

**`RosterCarregado`** (`packages/data`) — saída do loader:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `versaoRoster` | `string` | Copiada do envelope |
| `duelistas` | `readonly Duelista[]` | **Somente** os duelistas aprovados, na ordem do arquivo |
| `relatorio` | `RelatorioRoster` | Evidência das exclusões |

**`RelatorioRoster`** — consumido pelo script de build, pelo log de borda e pelos testes:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `duelistasDeclarados` | `number` | Total no arquivo |
| `duelistasDisponiveis` | `number` | Total aprovado |
| `ocultados` | `{ id, nome, codigo, detalhes }[]` | Um registro por duelista excluído, com o código do motivo |
| `faixasObservadas` | `readonly IdFaixaRaridade[]` | Conjunto ordenado de faixas distintas vistas nos pools — insumo para conferir a convenção do Rating Engine quando ela existir; nunca hard-coded |
| `retratosAusentes` | `readonly string[]` | Retratos declarados que o manifesto de assets não resolve (não oculta o duelista) |
| `integro` | `boolean` | `true` sse `ocultados` está vazio |

**`ConsultaCatalogo`** — porta injetada no loader, mantendo `data/roster` desacoplado do
carregamento do catálogo: uma função `(numero) => Carta | undefined`. É o que permite testar a
validação com um catálogo sintético de 5 cartas.

### Fluxo

**Carregamento e validação (`packages/data`)**

1. **Receber a carga bruta.** O loader recebe o conteúdo do roster já lido (texto ou objeto
   `unknown`) e a `ConsultaCatalogo`. Não faz I/O (Decisão 9).
2. **Validar o envelope** contra `RosterSchema`. Envelope irreconhecível, `versaoRoster` fora do
   formato ou `duelistas` não-array → **erro** `roster_invalido`, sem roster parcial. É o único
   caminho que produz erro total: um envelope quebrado significa que nem a lista dá para ler.
3. **Validar cada duelista, um a um**, na ordem do arquivo, aplicando as Regras de negócio
   abaixo. Aprovado → entra em `duelistas`. Reprovado → entra em `ocultados` com o código do
   motivo e o lote **continua** (Decisão 10).
4. **Conferir unicidade de `id`.** Primeira ocorrência prevalece; repetições vão para
   `ocultados` com `duelista_id_duplicado` (Decisão 11).
5. **Registrar retratos não resolvidos** em `retratosAusentes`, **sem** ocultar o duelista
   (Decisão 14).
6. **Derivar `faixasObservadas`** do conjunto de faixas dos pools aprovados.
7. **Devolver `RosterCarregado`.** Roster com zero duelistas aprovados é `ok`, não erro — quem
   decide como apresentar isso é a tela.

**Consulta pelas features vizinhas**

8. **F03** pede o duelista escolhido por `id` e recebe `nome`, `retrato`, `nivel`, `perfil` e
   `deck` (40 `numero`). O `deck` é o que F03 entrega ao `initDuel` do motor
   (`arquitetura.md` §3.1); F01 não monta partida.
9. **F06** pede o pool do duelista e, opcionalmente, a faixa. Duelista inexistente → erro
   `duelista_desconhecido`; faixa inexistente ou pool vazio → **lista vazia** (Decisão 7).

**Tela de seleção (`apps/web`)**

10. **Entrar no Free Duel.** O Client Component dispara o adaptador de carregamento e exibe
    estado de carregamento.
11. **Obter catálogo e roster** do bundle de dados (cacheado pelo service worker, ADR-004). Sem
    catálogo → tela bloqueada com aviso e ação de nova tentativa (Decisão 12); nenhum duelista
    não validado é exibido.
12. **Validar** chamando o loader de `packages/data`. Sucesso → grava o snapshot validado no
    cache local com `versaoRoster` + `hash` do bundle; loga cada inconsistência em nível `warn`
    com `duelistaId` e `codigo` (guidelines §23.1–23.2). A tela nunca calcula validação própria.
13. **Falha de leitura ou envelope inválido** → recupera o **último snapshot validado** do cache
    e exibe o aviso "Lista de duelistas carregada do cache; pode estar desatualizada.". Sem
    cache → estado vazio legível.
14. **Renderizar a grade**: um cartão por duelista com retrato (ou placeholder), nome e
    indicador de dificuldade. Grade responsiva de 320 px a 1920 px, sem scroll horizontal
    (`arquitetura.md` §7). Sem virtualização: o roster é da ordem de dezenas, não das 722 cartas
    da Library.
15. **Selecionar** um duelista marca o cartão como escolhido (estado local, Decisão 15) e habilita
    a confirmação. Navegação por teclado e foco visível são obrigatórios.
16. **Confirmar** navega para a rota de preparação de F02 levando o `duelistaId` (Decisão 17).
    Nada é escrito em servidor, cache de jogador ou fila offline (Decisão 19).
17. **Roster vazio** (arquivo vazio ou todos ocultados) → estado vazio com texto explícito e
    confirmação desabilitada; a tela permanece navegável e sem erro (PRD §9: "sem quebrar a
    tela").

### Regras de negócio

**Invariantes da Fase 0 reforçados no deck de cada NPC** (de `product.md`, Fase 0.3 do skill):

- **Exatamente 40 cartas.** 39 ou 41 reprovam com `deck_tamanho_invalido`. É o mesmo número que
  `MotorDuelo/F03` exige, então um roster que passa aqui não é recusado lá.
- **Máximo 3 cópias** do mesmo `numero`. A quarta cópia reprova com `deck_copias_excedidas`.
- **Toda carta existe no catálogo.** Qualquer `numero` que `ConsultaCatalogo` não resolva reprova
  com `carta_inexistente`, citando o `numero`.
- **Nenhum campo novo no schema da carta.** O roster referencia carta apenas por `numero`; não
  redeclara, não estende e não sobrescreve nada de `Carta`.

**Validações próprias do roster:**

- `id` no formato canônico e único no arquivo (`duelista_id_invalido`,
  `duelista_id_duplicado`).
- `nome` não-vazio e ≤ 60 caracteres (`duelista_nome_invalido`).
- `retrato` no formato de caminho de asset (`retrato_invalido`). **Ausência do arquivo não
  reprova** — vira placeholder.
- `nivel` dentro do union fechado (`nivel_invalido`).
- `perfil.estrategia` não-vazia; chaves de `perfil.parametros` não-vazias
  (`perfil_invalido`).
- `poolDrops`: faixas com `faixa` não-vazia e **única** no pool; cada faixa com ≥ 1 `numero`,
  sem repetição interna, todas existentes no catálogo (`pool_faixa_duplicada`,
  `pool_faixa_vazia`, `carta_inexistente`).
- **Pool ausente ou `[]` é válido** — o duelista continua disponível, e F06 aplica seu fallback
  (Decisão 7).

**Ordem e determinismo de apresentação:** a ordem exibida é exatamente a ordem do arquivo, sem
reordenação implícita por nome ou nível. O loader é uma **função pura**: mesma entrada ⇒ mesma
saída, sem estado entre chamadas e sem dependência de relógio, locale ou aleatoriedade.

**Não-regras (explicitamente ausentes):** F01 não pontua dificuldade, não escolhe carta de drop,
não pondera raridade, não valida deck de jogador, não cria sessão de duelo e não persiste nada.

### Eventos

Esta feature não emite nem consome eventos do motor ou do Effect System — não há
`onSummon`/`onAttackDeclared` aqui. O único "evento" externo é a **navegação** de confirmação,
que entrega o `duelistaId` a F02/F03 por parâmetro de rota.

### Determinismo e pureza

Não se aplica a `packages/engine` — esta feature não toca o motor, não usa PRNG e não produz
estado de duelo (o seed da partida é de F03, `arquitetura.md` §3.1). A pureza exigida é a de
`packages/data`: o núcleo do roster é livre de I/O, log e globais, e é totalmente testável com um
catálogo sintético (Decisão 9; guidelines §24 regra 4).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`DuelistaIdSchema`** — string, regex `^[a-z0-9][a-z0-9-]{1,31}$`. Tipo `DuelistaId`.
- **`NivelDificuldadeSchema`** — enum fechado: `facil`, `medio`, `dificil`. Tipo
  `NivelDificuldade`.
- **`PerfilDificuldadeSchema`** — objeto estrito: `estrategia` string mínima 1; `parametros`
  registro de chave não-vazia para `number | string | boolean`, com default `{}`.
- **`FaixaPoolSchema`** — objeto estrito: `faixa` string regex `^[a-z0-9][a-z0-9-]{0,31}$`;
  `numeros` array mínimo 1 de `NumeroCartaSchema` (reusado de `shared/src/carta/schema.ts`), sem
  duplicata interna.
- **`PoolDropsSchema`** — array de `FaixaPoolSchema`, com `faixa` única no array, default `[]`.
- **`DeckNpcSchema`** — array de `NumeroCartaSchema` com **exatamente**
  `TAMANHO_DECK_OBRIGATORIO` entradas e no máximo `MAX_COPIAS_POR_CARTA` repetições por
  `numero`. A checagem de **existência** no catálogo **não** vive no schema: depende de dado
  externo e é feita pelo validador (guidelines §18.3 — validar na fronteira, mas sem esconder
  dependência no schema).
- **`DuelistaSchema`** — objeto estrito com os 7 campos da tabela de estruturas.
- **`RosterSchema`** — objeto estrito `{ versaoRoster, duelistas }`, `duelistas` podendo ser
  vazio.
- **`CODIGOS_ERRO_ROSTER`** — conjunto fechado de códigos usados nos `DomainError` e no
  relatório: `roster_invalido`, `duelista_id_invalido`, `duelista_id_duplicado`,
  `duelista_nome_invalido`, `retrato_invalido`, `nivel_invalido`, `perfil_invalido`,
  `deck_tamanho_invalido`, `deck_copias_excedidas`, `carta_inexistente`,
  `pool_faixa_duplicada`, `pool_faixa_vazia`, `duelista_desconhecido`.

`Result<T, E>` e `DomainError` são reusados de `packages/shared` conforme a spec de
`banco-de-cartas` F01 §4 (guidelines §7.1, §8.1) — não são redefinidos aqui.

### Funções públicas

```
// packages/data/src/roster — núcleo puro, sem I/O

validarDuelista(
  bruto: unknown,
  catalogo: ConsultaCatalogo,
): Result<Duelista, DomainError>
  // pós: ok ⇒ Duelista aprovado contra DuelistaSchema e contra os invariantes da Fase 0
  //      erro ⇒ code identifica o motivo da ocultação; details traz { duelistaId, numero? }

carregarRoster(
  bruto: unknown,
  catalogo: ConsultaCatalogo,
): Result<RosterCarregado, DomainError>
  // pós: ok ⇒ apenas duelistas aprovados + relatório com os ocultados
  //      ok com duelistas: [] é resultado válido (roster vazio)
  //      erro ⇒ code 'roster_invalido' — envelope irreconhecível
  // pura: mesma entrada ⇒ mesma saída; nunca lança para entrada arbitrária

obterDuelista(
  roster: RosterCarregado,
  id: DuelistaId,
): Result<Duelista, DomainError>
  // contrato consumido por F03 e F06; erro ⇒ 'duelista_desconhecido'

obterPoolDrops(
  roster: RosterCarregado,
  id: DuelistaId,
): Result<PoolDrops, DomainError>
  // contrato consumido por F06; pool vazio é ok, não erro

listarNumerosDaFaixa(
  pool: PoolDrops,
  faixa: IdFaixaRaridade,
): readonly NumeroCarta[]
  // total: faixa desconhecida ⇒ [] (fallback é de F06)
```

```
// apps/web/lib/free-duel — bordas de I/O

carregarRosterCliente(): Promise<ResultadoRosterCliente>
  // { roster, origem: 'bundle' | 'cache', aviso?: AvisoRoster }
  // ordem: bundle → validação → grava cache; falha → cache; sem cache → roster vazio
  // catálogo indisponível ⇒ { roster: null, aviso: 'catalogo_indisponivel' }

lerCacheRoster(): Promise<RosterCarregado | null>
gravarCacheRoster(entrada: { versaoRoster; hash; roster }): Promise<void>
```

```
// packages/data/scripts/validate-roster.ts — adaptador CLI de build

executarValidacaoRoster(opcoes: OpcoesValidacaoRoster): Promise<number>
  // opcoes: { arquivoRoster, arquivoCatalogo }
  // imprime o relatório e devolve exit code: 0 quando relatorio.integro, 1 caso contrário
```

### Formato do arquivo de roster

Estado entregue no repositório (Decisão 6) — válido e vazio:

```json
{
  "versaoRoster": "0.0.0",
  "duelistas": []
}
```

Forma de um duelista, ilustrando **apenas o formato**. O deck está abreviado a 5 entradas por
legibilidade e por isso **não passaria** na validação (que exige 40); os `numero` citados são
cartas reais do catálogo usadas como exemplo de referência válida. Este bloco **não é** roster
oficial, nem deck, nem dificuldade, nem pool de balanceamento — esses valores são a pendência da
Decisão 6:

```json
{
  "versaoRoster": "1.0.0",
  "duelistas": [
    {
      "id": "duelista-exemplo",
      "nome": "Duelista de Exemplo",
      "retrato": "duelistas/duelista-exemplo.jpg",
      "nivel": "facil",
      "perfil": {
        "estrategia": "a-definir",
        "parametros": {}
      },
      "deck": ["001", "001", "001", "002", "003"],
      "poolDrops": [
        { "faixa": "a-definir", "numeros": ["001"] }
      ]
    }
  ]
}
```

### Relatório de validação

```json
{
  "duelistasDeclarados": 3,
  "duelistasDisponiveis": 2,
  "ocultados": [
    {
      "id": "duelista-c",
      "nome": "Duelista C",
      "codigo": "deck_tamanho_invalido",
      "detalhes": { "esperado": 40, "atual": 39 }
    }
  ],
  "faixasObservadas": ["comum", "rara"],
  "retratosAusentes": ["duelistas/duelista-b.jpg"],
  "integro": false
}
```

### Contratos consumidos por F03 e F06 (intra-PRD)

O que F01 **provê**, conforme PRD F01 Provides:

```json
{
  "duelistaId": "duelista-exemplo",
  "nome": "Duelista de Exemplo",
  "nivel": "facil",
  "perfil": { "estrategia": "a-definir", "parametros": {} },
  "deck": ["001", "001", "001", "002"],
  "poolDrops": [{ "faixa": "a-definir", "numeros": ["001"] }]
}
```

- **Para F03:** `deck` é a lista de 40 `numero` do lado P2, e `perfil` é o que F03 repassa ao
  agente de IA. F01 não conhece `initDuel`, seed nem estado de duelo.
- **Para F06:** `poolDrops` é a lista de candidatas por faixa. F01 não sorteia e não pondera.

### Contratos externos (cross-PRD)

**A ser fornecido por banco-de-cartas (`packages/data`, F01/F03/F04):**

- **Consulta do catálogo por `numero`** — a porta `ConsultaCatalogo`,
  `(numero: NumeroCarta) => Carta | undefined`, satisfeita pelo `getByNumero` de
  banco-de-cartas F03 sobre as 722 cartas canônicas. F01 usa **apenas** existência; não lê `atk`,
  `classe` nem qualquer outro campo.
- **`Carta` e `NumeroCarta`** — schema da Fase 0 (12 campos), já definidos em
  `packages/shared/src/carta/` pela spec de `banco-de-cartas` F01. F01 reusa sem estender.
- **Manifesto de assets para os retratos** — banco-de-cartas F04 resolve artes de carta; o
  retrato de duelista é asset novo e ainda inexistente (Decisão 14). Até existir manifesto de
  retratos, a resolução é por caminho declarado + placeholder.
- **Bundle versionado com `version` + `hash`** — banco-de-cartas F09/F10. F01 declara o roster
  como **entrada** do bundle e usa `version` + `hash` como chave de invalidação do cache local.
  Enquanto o bundle não existir, o interino é servir `roster.json` como asset estático da app,
  com `versaoRoster` sozinho como chave de cache.

**A ser fornecido por IA de NPCs (`packages/ai`):**

- **Consumo de `PerfilDificuldade`** — o agente recebe `{ estrategia, parametros }` via F03 e
  decide as jogadas. O **conjunto de `estrategia` válidos** é desse módulo; F01 valida apenas
  forma (Decisão 4) e **não importa `packages/ai`** (verificado por análise estática).

**A ser fornecido por Motor de Duelo 1x1 (`packages/engine`):**

- **`initDuel`** (`arquitetura.md` §3.1) — consumido por **F03**, não por F01. F01 só garante o
  formato do deck de NPC (40 `numero` válidos) que torna a inicialização aceitável.

## 5. Modelo de Dados

### Postgres / Supabase

**Nenhuma tabela nova e nenhuma escrita** (Decisão 19). O roster é dado de conteúdo, igual para
todos os jogadores, e a seleção é somente leitura — não há linha por jogador a criar em
`arquitetura.md` §5.1, não há RLS a definir, não há migração e não há RPC. Nada de economia é
tocado aqui: estrelas e coleção são de F06/F07.

### Cache local / fila offline

Store IndexedDB **somente leitura do ponto de vista do jogador**, alinhado a
`arquitetura.md` §5.4:

| Store | Chave | Campos | Política |
|---|---|---|---|
| `rosterCache` | `atual` (chave fixa, uma linha) | `versaoRoster`, `hash \| null`, `validadoEm`, `duelistas`, `relatorio` | Escrito após cada validação bem-sucedida. Lido quando a leitura do bundle falha. Invalidado quando `versaoRoster` ou `hash` divergem do bundle atual |

- Guarda o **snapshot já validado** (Decisão 13), então a recuperação offline não exige o
  catálogo.
- **Não participa da fila de mutações** com `idempotencyKey`: não há mutação: F01 não escreve
  dado de jogador (`arquitetura.md` §5.4 trata a fila para créditos/débitos, que são de F06/F07).
- Divergência de versão/hash descarta o cache em vez de mesclar, evitando roster antigo
  referenciando carta que saiu do catálogo.

### Arquivos de dados versionados

| Arquivo | Formato | Versionado em git | Consumidor |
|---|---|---|---|
| `packages/data/data/roster.json` | Objeto JSON `{ versaoRoster, duelistas }`, indentação 2, newline final | **sim** — é dado autorado, não artefato gerado | loader de F01, script de build, bundle de banco-de-cartas F09 |

- Diferente de `packages/data/generated/**` (não versionado, Decisão 5 da spec de
  `banco-de-cartas` F01), o roster **entra no git**: é autoria humana e mudança de balanceamento
  deve aparecer como diff de PR.
- `versaoRoster` é declarado pelo autor. O `hash` de conteúdo é atribuído pelo bundle
  (banco-de-cartas F10) — F01 não o calcula, para não duplicar essa responsabilidade.
- **Comportamento com tabela vazia:** `duelistas: []` é válido; o loader devolve `ok` com lista
  vazia, o script de build reporta `integro: true` com zero duelistas, e a tela mostra o estado
  vazio. Nenhum duelista sintético é gerado em nenhum ambiente, inclusive testes de produção de
  dado (`arquitetura.md` §4.3).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Arquivo de roster ausente (falha de leitura/404) | Adaptador de borda em `apps/web` | Recupera o último snapshot validado do cache; segue com `origem: 'cache'` | `Lista de duelistas carregada do cache; pode estar desatualizada.` |
| Roster corrompido: JSON malformado ou envelope fora de `RosterSchema` | `carregarRoster` → `roster_invalido` | Idem acima: cai no cache e loga `error` com o código | `Lista de duelistas carregada do cache; pode estar desatualizada.` |
| Roster ausente/corrompido **e** cache vazio | Adaptador de borda | Estado vazio legível; confirmação desabilitada; tela navegável | `Nenhum duelista disponível agora. Tente novamente mais tarde.` |
| Duelista com deck ≠ 40 cartas | `validarDuelista` → `deck_tamanho_invalido` | **Oculta** o duelista, registra em `ocultados`, mantém os demais | não exibido; log `warn` `Duelista {nome} indisponível (deck inválido).` |
| Duelista com 4+ cópias do mesmo `numero` | `validarDuelista` → `deck_copias_excedidas` | Oculta e registra | idem acima |
| Duelista com `numero` inexistente no catálogo (deck ou pool) | `validarDuelista` → `carta_inexistente` | Oculta e registra, citando o `numero` | idem acima |
| Duelista com `nivel`, `id`, `nome`, `retrato` ou `perfil` fora do schema | `validarDuelista` | Oculta e registra com o código do campo | idem acima |
| `id` de duelista duplicado | `carregarRoster` → `duelista_id_duplicado` | Runtime: mantém a primeira ocorrência, oculta as seguintes. Build: exit code ≠ 0 (Decisão 11) | não exibido; log `warn` |
| Todos os duelistas ocultados (ou arquivo com `duelistas: []`) | `RosterCarregado.duelistas` vazio | Estado vazio legível, sem erro; confirmação desabilitada | `Nenhum duelista disponível. A lista de oponentes ainda não foi configurada.` |
| Catálogo de cartas indisponível | Adaptador de borda, antes de validar | **Bloqueia** a tela e oferece nova tentativa. Nenhum duelista não validado é exibido (Decisão 12) | `Não foi possível carregar o banco de cartas. Tente novamente.` |
| Retrato declarado não resolve para um asset | `apps/web` no render; registrado em `retratosAusentes` | Exibe placeholder; duelista **permanece** disponível | nenhuma (silencioso para o jogador) |
| Pool de drops ausente, vazio, ou faixa inexistente | `obterPoolDrops` / `listarNumerosDaFaixa` | Devolve pool ou lista **vazia**, sem erro; a pendência de configuração é registrada. O fallback para a faixa comum é de F06 | nenhuma (tratado em F06) |
| Divergência de `versaoRoster`/`hash` entre cache e bundle | `cache-roster` na leitura | Descarta o cache e usa o bundle; se o bundle falhar, estado vazio em vez de roster obsoleto | `Nenhum duelista disponível agora. Tente novamente mais tarde.` |
| IndexedDB indisponível (modo privado, cota, permissão) | `try/catch` no adaptador | Segue sem cache: bundle funciona normalmente, e falha de leitura vira estado vazio. Nunca derruba a tela | nenhuma, salvo quando resultar em estado vazio |
| Confirmação acionada sem duelista selecionado | Guarda no componente | Ação inerte; botão permanece desabilitado | nenhuma |
| Confirmação de duelista que saiu do roster (revalidação entre seleção e confirmação) | `obterDuelista` → `duelista_desconhecido` | Retorna à grade recarregada com aviso | `Este duelista não está mais disponível. Escolha outro.` |

Nenhuma exclusão é silenciosa: todo `ocultados` é registrado com código e detalhes (guidelines
§8.3; ADR-003 §6 "dados inválidos devem falhar explicitamente"). O núcleo puro **retorna** as
inconsistências; quem **loga** é a borda, em log estruturado com `duelistaId` e `codigo`
(guidelines §23.1–23.2, §24 regra 9).

## 7. Estratégia de Testes

### Unitários (Vitest)

`validarDuelista` — table-driven (guidelines §11.2), com catálogo sintético injetado:

- `validarDuelista aceita deck de exatamente 40 cartas`
- `validarDuelista rejeita deck de 39 cartas com codigo deck_tamanho_invalido`
- `validarDuelista rejeita deck de 41 cartas com codigo deck_tamanho_invalido`
- `validarDuelista aceita tres copias do mesmo numero`
- `validarDuelista rejeita quatro copias do mesmo numero com codigo deck_copias_excedidas`
- `validarDuelista rejeita numero ausente do catalogo com codigo carta_inexistente`
- `validarDuelista rejeita numero de pool de drops ausente do catalogo`
- `validarDuelista aceita duelista sem pool de drops`
- `validarDuelista aceita duelista com pool de drops vazio`
- `validarDuelista rejeita pool com faixa duplicada com codigo pool_faixa_duplicada`
- `validarDuelista rejeita faixa de pool sem nenhuma carta com codigo pool_faixa_vazia`
- `validarDuelista rejeita numero repetido dentro da mesma faixa`
- `validarDuelista rejeita nivel fora de facil medio dificil`
- `validarDuelista rejeita id fora do formato canonico`
- `validarDuelista rejeita nome vazio`
- `validarDuelista rejeita estrategia vazia com codigo perfil_invalido`
- `validarDuelista aceita parametros de perfil vazios`
- `validarDuelista aceita retrato declarado que nao existe em disco`
- `validarDuelista rejeita campo extra no duelista`

`carregarRoster`:

- `carregarRoster aceita roster vazio como resultado valido`
- `carregarRoster falha com roster_invalido quando o envelope nao casa o schema`
- `carregarRoster falha com roster_invalido quando o conteudo nao e JSON valido`
- `carregarRoster oculta duelista invalido e mantem os validos`
- `carregarRoster registra o codigo do motivo de cada duelista ocultado`
- `carregarRoster mantem a primeira ocorrencia de id duplicado e oculta as seguintes`
- `carregarRoster preserva a ordem de exibicao declarada no arquivo`
- `carregarRoster deriva faixasObservadas apenas dos duelistas aprovados`
- `carregarRoster lista retrato nao resolvido sem ocultar o duelista`
- `carregarRoster marca integro false quando ha pelo menos um ocultado`

`obterPoolDrops` / `listarNumerosDaFaixa`:

- `obterDuelista falha com duelista_desconhecido para id ausente`
- `obterPoolDrops devolve o pool declarado do duelista`
- `obterPoolDrops devolve pool vazio para duelista sem pool sem retornar erro`
- `listarNumerosDaFaixa devolve lista vazia para faixa desconhecida`
- `listarNumerosDaFaixa devolve as candidatas da faixa na ordem declarada`

`carregarRosterCliente` (`apps/web`):

- `carregarRosterCliente valida o roster do bundle e grava o snapshot no cache`
- `carregarRosterCliente recorre ao cache quando a leitura do bundle falha`
- `carregarRosterCliente recorre ao cache quando o envelope do roster esta corrompido`
- `carregarRosterCliente devolve roster vazio quando bundle e cache falham`
- `carregarRosterCliente descarta cache com versao divergente do bundle`
- `carregarRosterCliente bloqueia quando o catalogo esta indisponivel`
- `carregarRosterCliente segue funcionando quando IndexedDB esta indisponivel`

Tela (`selecao-oponente`):

- `selecao de oponente lista um cartao por duelista disponivel`
- `selecao de oponente exibe nome e indicador de dificuldade de cada duelista`
- `selecao de oponente exibe placeholder quando o retrato nao resolve`
- `selecao de oponente nao exibe duelista ocultado pela validacao`
- `selecao de oponente habilita a confirmacao somente apos selecionar um duelista`
- `selecao de oponente navega para a preparacao levando o duelistaId ao confirmar`
- `selecao de oponente exibe estado vazio legivel quando o roster nao tem duelistas`
- `selecao de oponente exibe aviso de cache quando o roster vem do cache`
- `selecao de oponente exibe bloqueio com nova tentativa quando o catalogo falha`
- `selecao de oponente nao apresenta seletor de dificuldade independente`
- `selecao de oponente permite navegar e confirmar por teclado`

### Property-based (fast-check)

Invariantes genuínos da validação do roster, sobre decks e rosters gerados (1.000 execuções
cada):

- **Solidez do deck válido:** para todo multiset de 40 `numero` sorteados de um catálogo
  sintético com no máximo 3 repetições por `numero`, `validarDuelista` **sempre** aprova.
- **Completude do tamanho:** para todo deck de tamanho ≠ 40 (0 a 120), `validarDuelista`
  **sempre** reprova com `deck_tamanho_invalido`.
- **Completude das cópias:** para todo deck de 40 cartas que contenha ≥ 4 cópias de algum
  `numero`, `validarDuelista` **sempre** reprova com `deck_copias_excedidas`.
- **Completude da existência:** para todo deck que contenha ao menos um `numero` fora do
  catálogo, `validarDuelista` **sempre** reprova com `carta_inexistente`.
- **Composicionalidade da ocultação:** para todo roster gerado misturando duelistas válidos e
  inválidos em posições arbitrárias, o conjunto devolvido por `carregarRoster` é **exatamente** o
  conjunto dos que passam `validarDuelista` isoladamente — nenhum duelista inválido contamina um
  válido, e nenhum válido é perdido.
- **Totalidade do loader:** para qualquer entrada `unknown` arbitrária (JSON aleatório, `null`,
  números, arrays aninhados), `carregarRoster` **nunca lança** — sempre devolve `Result`.
- **Pureza/idempotência:** duas chamadas consecutivas de `carregarRoster` com a mesma entrada
  produzem resultados profundamente iguais, incluindo a ordem de `duelistas`, `ocultados` e
  `faixasObservadas`.
- **Neutralidade do pool:** para qualquer pool e qualquer faixa, `listarNumerosDaFaixa` devolve
  ou um subconjunto exato das candidatas daquela faixa, ou `[]` — nunca uma carta de outra faixa e
  nunca uma carta inventada.

### Integração

`packages/data/tests/roster.integration.test.ts`, contra o catálogo real de 722 cartas:

- `roster entregue no repositorio carrega sem erro e sem duelista disponivel` — **caminho neutro
  do dado pendente** (Decisão 6): prova que o arquivo entregue é válido e que zero duelistas é
  estado suportado, sem inventar valor de balanceamento.
- `roster de fixture com decks montados de numeros reais aprova todos os duelistas`
- `roster de fixture com numero 999 inexistente oculta apenas o duelista afetado`
- `script de validacao devolve exit code zero para o roster entregue`
- `script de validacao devolve exit code diferente de zero quando ha duelista ocultado`
- `script de validacao devolve exit code diferente de zero quando ha id duplicado`

`apps/web`, integração da tela com o adaptador e o cache:

- `tela de selecao usa o snapshot de IndexedDB quando o bundle esta inacessivel`
- `tela de selecao grava snapshot valido no IndexedDB apos carregar do bundle`
- `tela de selecao renderiza sem scroll horizontal de 320px a 1920px`

### Análise estática

- `packages/data/src/roster/**` não importa `node:fs`, `node:path`, `fetch`, `console`, React,
  DOM, IndexedDB nem Supabase (Decisão 9; guidelines §3.3).
- `packages/data` importa apenas `packages/shared` — nenhum import de `rules`, `engine`, `ai`,
  `web` ou `server` (`arquitetura.md` §2).
- **Nenhum arquivo de `apps/web` referencia os literais `40` ou `3` como regra de deck** nem
  reimplementa validação de roster: a UI só consome o loader (`arquitetura.md` §7 "UI não contém
  regra"). Enforçado por regra de lint sobre o diretório de Free Duel + revisão da fronteira.
- **Nenhum arquivo desta feature importa `packages/ai`** — o perfil é dado, não comportamento
  (Fronteiras; PRD §7).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1, incluindo
  `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F01) | Teste |
|---|---|
| O roster é carregado de um arquivo de dados; cada duelista expõe `id`, nome, retrato, deck de 40 cartas, dificuldade fixa e pool de drops | `carregarRoster preserva a ordem de exibicao declarada no arquivo` + `roster de fixture com decks montados de numeros reais aprova todos os duelistas` + `selecao de oponente exibe nome e indicador de dificuldade de cada duelista` + validação de todo o arquivo contra `RosterSchema` |
| Todos os decks de NPC e cartas dos pools referenciam apenas o schema da Fase 0 e existem no banco; duelistas com deck inválido são ocultados com registro de inconsistência | `validarDuelista rejeita numero ausente do catalogo com codigo carta_inexistente` + `validarDuelista rejeita numero de pool de drops ausente do catalogo` + `carregarRoster oculta duelista invalido e mantem os validos` + `carregarRoster registra o codigo do motivo de cada duelista ocultado` + propriedades de completude de tamanho, cópias e existência |
| A dificuldade é fixa por oponente (sem seletor separado) e é exibida ao jogador antes da escolha | `selecao de oponente exibe nome e indicador de dificuldade de cada duelista` + `selecao de oponente nao apresenta seletor de dificuldade independente` |
| Falha ao ler o roster recorre ao cache com aviso, sem quebrar a tela | `carregarRosterCliente recorre ao cache quando a leitura do bundle falha` + `carregarRosterCliente recorre ao cache quando o envelope do roster esta corrompido` + `selecao de oponente exibe aviso de cache quando o roster vem do cache` + `tela de selecao usa o snapshot de IndexedDB quando o bundle esta inacessivel` |
| **(Pendente — dado de balanceamento)** Quando a composição do roster/decks/pools for definida, a seleção reflete exatamente esses dados | **Caminho neutro, sem valores inventados:** `roster entregue no repositorio carrega sem erro e sem duelista disponivel` + `selecao de oponente exibe estado vazio legivel quando o roster nao tem duelistas` + `obterPoolDrops devolve pool vazio para duelista sem pool sem retornar erro`. O critério de fidelidade fica bloqueado até o dado oficial chegar (`arquitetura.md` §10) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: fluxo completo de vitória começa em F01 escolhendo o oponente e segue para F02/F03 sem estado inconsistente | `selecao de oponente navega para a preparacao levando o duelistaId ao confirmar` + teste de contrato verificando que o objeto provido (`deck` de 40 `numero` + `perfil`) casa o schema declarado em §4, consumível por F03 sem transformação |
| Cross-Feature: a seleção não concede nem revoga recompensa e não altera dado do jogador | Análise estática: nenhum arquivo desta feature escreve em Supabase, em `collections`/`wallets`/`reward_ledger` ou na fila de mutações; o único store tocado é `rosterCache` (leitura/escrita de conteúdo, não de progresso) |
| Cross-Feature: F06 recebe de F01 o pool do oponente derrotado e trata pool vazio pelo próprio fallback | `obterPoolDrops devolve pool vazio para duelista sem pool sem retornar erro` + `listarNumerosDaFaixa devolve lista vazia para faixa desconhecida` + propriedade de neutralidade do pool |
| Cross-PRD (banco-de-cartas): todo `numero` do roster existe no catálogo canônico de 722 cartas | `roster de fixture com numero 999 inexistente oculta apenas o duelista afetado` + `roster entregue no repositorio carrega sem erro e sem duelista disponivel`, ambos com o catálogo real injetado |
| Cross-PRD (banco-de-cartas): o roster não estende nem redefine o schema da carta da Fase 0 | Análise estática: `packages/shared/src/duelista/**` referencia `NumeroCarta` e nunca redeclara campos de `Carta`; `DuelistaSchema` é objeto estrito e rejeita campo extra (`validarDuelista rejeita campo extra no duelista`) |
| Cross-PRD (IA de NPCs): o lado CPU é conduzido pelo agente conforme o perfil do oponente do roster | Teste de contrato do `PerfilDificuldade` provido (`estrategia` + `parametros` presentes e válidos para todo duelista aprovado) + análise estática de que F01 não importa `packages/ai` |
| Cross-PRD (Motor de Duelo): o deck de NPC entregue é aceitável por `MotorDuelo/F03` | Propriedade de solidez do deck válido (40 cartas, ≤ 3 cópias, cartas existentes) — os mesmos invariantes que `initDuel` exige (`arquitetura.md` §3.1; PRD F03 Error Handling) |
