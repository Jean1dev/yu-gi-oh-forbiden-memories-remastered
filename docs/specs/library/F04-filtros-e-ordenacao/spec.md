# Filtros e Ordenação

> PRD: `docs/prds/library.md` — F04
> Pacote-alvo: `packages/shared` + `packages/rules` + `apps/web`

## 1. Contexto e Escopo

Esta feature acrescenta à rota `/library` a camada de consulta interativa sobre a grade de F02:
filtro por tipo, filtro de status da coleção, ordenação por campos da carta, ação de limpar
filtros e persistência da escolha enquanto o jogador navega pela Library. Ela não carrega dados,
não renderiza uma segunda grade e não abre detalhe por conta própria; recebe o `IndiceLibrary` de
F01, produz uma sequência filtrada e ordenada, e entrega essa sequência ao contrato já definido por
F02 (`GradeColecao` renderiza exatamente o que recebe).

O desenho segue `docs/arquitetura.md` §7 e ADR-004: a UI organiza controles e interação, mas a
regra de filtro/ordenação vive em `packages/rules`, como função pura sobre `EntradaLibrary`. A
feature pertence à Fase 2 do roadmap (`docs/arquitetura.md` §9), depende internamente de F02 e
herda de F01 os contratos externos de catálogo, artes, coleção e Auth/Cadastro. Como o projeto
ainda não tem `packages/` nem `apps/`, a spec assume o scaffolding e os pacotes declarados nas
specs precedentes.

### Incluído

- Contratos compartilhados para estado de filtros, status de coleção, campo/direção de ordenação,
  seleção de tipos e resultado de consulta (PRD §6 F04 Capabilities)
- Filtro de status `obtidas` (padrão), `nao-obtidas` e `todas`, generalizando o recorte
  `somenteObtidas` de F02
- Filtro por tipo com valores do PRD: `monstro`, `magica`, `armadilha`, `equipamento`; seleção
  vazia significa "todos"
- Multiseleção de tipos, com semântica **OU** dentro do grupo de tipos e **E** entre tipo, status
  e busca (PRD §6 F04; auto-aceite da capacidade "multiseleção opcional")
- Ordenação por `numero`, `nome`, `atk`, `def` e `estrelas`, com direção crescente/decrescente e
  desempate estável por `numero`
- Regra explícita para valores ausentes: entradas sem chave ordenável ficam no fim da ordenação
  numérica e textual, inclusive cartas bloqueadas que não carregam `carta`
- Preservação dos filtros na URL enquanto o jogador navega para `/library/[numero]` e volta
  (contrato de rota de F02)
- Barra de controles acima da grade; em mobile, controles recolhíveis em uma ação "Filtros"
- Ação "limpar filtros" que restaura `tipo=todos`, `status=obtidas`, `ordenacao=numero` e
  `direcao=asc`, sem limpar o termo de busca de F03
- Estado de "nenhum resultado" quando a combinação de filtros não retorna carta alguma
- Integração contratual com F03 por predicado de busca opcional exportado pelo subsistema
  `packages/rules/src/library/busca.ts`, sem bloquear F04 na implementação de F03
- Sequência filtrada/ordenada como contrato para a navegação anterior/próxima de F05

### Fronteiras

- **Carregamento do catálogo, coleção, status de posse e redação de carta bloqueada** → **F01**.
  F04 consome `EntradaLibrary` e não consulta Supabase, IndexedDB, catálogo nem artes.
- **Grade, célula, render-skipping, responsividade base, rota do detalhe e célula bloqueada** →
  **F02**. F04 só decide quais entradas aparecem e em qual ordem.
- **Campo de busca, normalização textual e mensagem "Nenhuma carta encontrada para '{termo}'"** →
  **F03**. F04 aceita um predicado de busca opcional e preserva `q` na URL, mas não implementa a
  busca textual.
- **Conteúdo do detalhe, estado bloqueado no detalhe e navegação anterior/próxima** → **F05**.
  F04 fornece a sequência atual; F05 decide como percorrê-la.
- **Escrita na coleção, liberação por senha, drops e recompensas** → Password / Campanha /
  Free Duel. A Library continua somente-leitura (PRD §7).
- **Quantidade de cópias por carta** → Build Deck. O filtro de status usa o booleano derivado de
  F01; não exibe nem considera quantidade.
- **Filtro por valores ainda não listados no PRD**, como `ritual` → fora desta feature até revisão
  do PRD. Cartas ritual continuam aparecendo quando tipo = todos.
- **Cálculo de Guardiões, terreno, fusões, drops, rating e balanceamento** → fora desta feature e
  sem valores inventados (`docs/arquitetura.md` §10; PRD §7).

### Contratos externos assumidos

- **`library`/F02 — Grade da Coleção.** Tem spec em
  `docs/specs/library/F02-grade-da-colecao/`. F04 altera a fronteira de cliente para aplicar a
  consulta antes de chamar `GradeColecao`, mas preserva o contrato: a grade não filtra nem ordena.
  *Dependência interna precedente.*
- **`library`/F01 — Acesso à Coleção do Jogador.** Precedente indireto via F02. Fornece
  `IndiceLibrary`, `EntradaLibrary`, `ProgressoColecao` e a redação estrutural das cartas não
  obtidas. *Dependência interna precedente.*
- **`library`/F03 — Busca por Nome/Número.** Não é dependência de prontidão da tabela do PRD, mas
  há integração cross-feature. F04 espera receber de F03 um predicado puro de busca sobre
  `EntradaLibrary`, exportado pelo subsistema `rules` de F03; enquanto F03 não existir, esse
  predicado é omitido e aceita todas as entradas. *Contrato interno paralelo confirmado pela spec
  de F03.*
- **`library`/F05 — Tela de Detalhe da Carta.** Consumirá a sequência final para anterior/próxima e
  manterá o estado bloqueado quando a entrada não tiver `carta`. *Contrato interno paralelo.*
- **Contratos cross-PRD herdados de F01.** `banco-de-cartas`/F03 e F04, `build-deck`/F01 e
  Auth/Cadastro continuam a ser fornecidos fora da Library. F04 não fala diretamente com nenhum
  deles.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O estado de filtros vive na **URL** (`tipo`, `status`, `ordem`, `direcao`) e não em localStorage/IndexedDB. Isso satisfaz a persistência durante a navegação interna descrita pelo PRD, preserva ida/volta do detalhe definida por F02 e evita persistência extra para um módulo somente-leitura. | spec `library/F02` Decisão 4; PRD §6 F04 Experience | confirmada |
| 2 | A regra de filtro e ordenação vive em `packages/rules/src/library/consulta.ts`, pura e sem I/O. A UI só converte query params em estado validado e renderiza controles. | ADR-004; guidelines §3.2, §19.2; spec `library/F02` Decisão 11 | confirmada |
| 3 | A multiseleção de tipos será implementada. Dentro do grupo de tipos a semântica é OU; entre tipo, status e busca é E. O PRD marca multiseleção como opcional, e em modo batch foi aplicado o default de entregar o escopo mais útil sem dependência nova. | PRD §6 F04 Capabilities; auto-aceite: especificação parcial com recomendação clara | a confirmar |
| 4 | `tipo=todos` é representado por seleção vazia. Query params com defaults são omitidos da URL canônica; "limpar filtros" remove `tipo`, `status`, `ordem` e `direcao`. | auto-aceite: default de mercado consistente; spec `library/F02` contrato de rota | a confirmar |
| 5 | "Limpar filtros" **não limpa a busca** (`q`). F03 tem ação própria de limpar busca e o PRD diz que limpar busca preserva filtros; manter ações separadas evita efeitos colaterais entre features. | PRD §6 F03 Experience; PRD §6 F04 Capabilities | confirmada |
| 6 | Cartas bloqueadas não possuem `carta`, `nome`, `tipo`, `atk`, `def` nem `estrelas` por contrato de F01. Portanto, quando um filtro de tipo específico estiver ativo, entradas bloqueadas não satisfazem esse filtro; em `status=nao-obtidas`, o jogador deve usar tipo=todos para ver faltantes. Isso evita vazar o tipo de uma carta ainda não obtida pela presença/ausência nos resultados. | spec `library/F01` Decisão 2; PRD §6 F04/F05; guidelines §1.1 | a confirmar — consequência da redação estrutural |
| 7 | Pela mesma redação, cartas bloqueadas não são ordenadas por `nome`, `atk`, `def` ou `estrelas`; ficam no fim e empatam por `numero`. A ordenação por `numero` é a única que usa um campo público das bloqueadas. | spec `library/F01` Decisão 2; PRD §6 F04 Capabilities | confirmada |
| 8 | Cartas `ritual` aparecem em `tipo=todos`, mas não ganham filtro dedicado nesta feature porque o PRD F04 lista apenas `monstro`, `magica`, `armadilha` e `equipamento`. Adicionar `ritual` como opção é revisão de produto, não inferência da spec. | PRD §6 F04; `docs/arquitetura.md` §4.2 | a confirmar |
| 9 | Query params inválidos são normalizados para defaults válidos, sem tela de erro. A fronteira web registra o descarte em log estruturado de debug/warn e segue com uma consulta segura. | guidelines §8.3, §18.3; auto-aceite: default de mercado consistente | a confirmar |
| 10 | A ordenação é estável por `numero` crescente como desempate, inclusive quando a direção principal é decrescente. Isso evita tremulação de layout em filtros sucessivos e mantém a identidade canônica da carta como ordem final. | guidelines §17.2; spec `library/F01` Decisão 11 | confirmada |
| 11 | Nenhuma preferência de filtro é salva no servidor nem em IndexedDB. A URL é suficiente para sessão, compartilhamento e retorno do detalhe; a Library permanece sem mutação. | PRD §7; ADR-005; spec `library/F02` Seção 5 | confirmada |
| 12 | F04 não adiciona dependência de runtime para controles. Usa componentes React, HTML semântico e CSS do app; testes seguem Vitest + Testing Library já introduzidos por F02. Ícones podem ser plugados pelo design system quando existir, sem alterar contrato. | guidelines §20.1; spec `library/F02` Decisão 9 | confirmada |
| 13 | Nenhuma tabela de dado externo pendente é consumida. Guardiões, terrenos, fusões, drops, rating e balanceamento não entram em filtro nem ordenação; nenhum valor de lore é inventado. | PRD §7; `docs/arquitetura.md` §10; ADR-003 | não se aplica |
| 14 | O projeto ainda está sem `packages/` e `apps/`. Esta spec assume o monorepo, `shared`, `rules` e `web` criados pelas features fundacionais precedentes; não recria scaffolding. | ADR-001; spec `library/F01`; spec `library/F02` | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/library/filtros.ts` | shared | novo | Tipos `TipoFiltroLibrary`, `StatusFiltroColecao`, `CampoOrdenacaoLibrary`, `DirecaoOrdenacaoLibrary`, `EstadoFiltrosLibrary`, `ResultadoConsultaLibrary` |
| `packages/shared/src/library/schema.ts` | shared | alterado | Schemas zod dos filtros e refinamento de valores aceitos na fronteira da URL |
| `packages/shared/src/library/index.ts` | shared | alterado | Reexporta os contratos de filtros no subsistema Library |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos contratos públicos |
| `packages/rules/src/library/consulta.ts` | rules | novo | Pipeline puro: aplicar status, tipo, busca opcional e ordenação |
| `packages/rules/src/library/status.ts` | rules | novo | `filtrarPorStatus` e normalização do status padrão |
| `packages/rules/src/library/tipo.ts` | rules | novo | `filtrarPorTipo`, incluindo multiseleção e regra de entradas bloqueadas |
| `packages/rules/src/library/ordenacao.ts` | rules | novo | Comparadores por `numero`, `nome`, `atk`, `def`, `estrelas`, direção e desempate |
| `packages/rules/src/library/visibilidade.ts` | rules | alterado | `somenteObtidas` passa a delegar ao filtro de status, preservando contrato de F02 |
| `packages/rules/src/library/index.ts` | rules | alterado | Reexporta o pipeline e filtros |
| `packages/rules/src/library/consulta.test.ts` | rules | novo | Unitários da composição E entre grupos e integração com busca opcional |
| `packages/rules/src/library/status.test.ts` | rules | novo | Unitários dos três status |
| `packages/rules/src/library/tipo.test.ts` | rules | novo | Unitários de tipo, multiseleção, ritual e entradas bloqueadas |
| `packages/rules/src/library/ordenacao.test.ts` | rules | novo | Unitários dos campos, direções, ausentes no fim e desempate por `numero` |
| `packages/rules/src/library/consulta.propriedades.test.ts` | rules | novo | Propriedades fast-check sobre subconjunto, estabilidade, redação e idempotência |
| `apps/web/src/lib/library/filtros-url.ts` | web | novo | Parse/serialização dos query params da Library com zod e defaults canônicos |
| `apps/web/src/hooks/use-library-filtros.ts` | web | novo | Hook fino para ler/atualizar filtros na URL, preservando `q` |
| `apps/web/src/app/library/library-cliente.tsx` | web | alterado | Aplica a consulta de F04 antes de chamar `GradeColecao`; mostra controles e estado sem resultado |
| `apps/web/src/components/library/barra-filtros.tsx` | web | novo | Barra desktop/mobile que agrupa status, tipos, ordenação e limpar filtros |
| `apps/web/src/components/library/barra-filtros.module.css` | web | novo | Layout responsivo dos controles, recolhimento mobile e foco visível |
| `apps/web/src/components/library/controle-status.tsx` | web | novo | Controle de status `obtidas`, `nao-obtidas`, `todas` |
| `apps/web/src/components/library/controle-tipo.tsx` | web | novo | Controle multiseleção de tipos e estado "todos" |
| `apps/web/src/components/library/controle-ordenacao.tsx` | web | novo | Campo de ordenação e alternância de direção |
| `apps/web/src/components/library/botao-limpar-filtros.tsx` | web | novo | Ação que restaura filtros padrão sem limpar busca |
| `apps/web/src/components/library/estado-sem-resultados.tsx` | web | novo | Mensagem para filtro sem resultado, distinta da mensagem de busca de F03 |
| `apps/web/src/components/library/barra-filtros.test.tsx` | web | novo | Testes de renderização e atualização dos controles |
| `apps/web/src/components/library/controle-tipo.test.tsx` | web | novo | Testes da multiseleção e do estado "todos" |
| `apps/web/src/components/library/controle-ordenacao.test.tsx` | web | novo | Testes de campos e alternância de direção |
| `apps/web/src/lib/library/filtros-url.test.ts` | web | novo | Testes de parse, serialização, normalização de inválidos e preservação de `q` |
| `apps/web/src/app/library/library-cliente.test.tsx` | web | alterado | Cobre sequência filtrada, estado sem resultado e integração com a grade |

**Verificação da direção de dependências:** `packages/shared` não importa nenhum pacote. O novo
código de `packages/rules` importa apenas `packages/shared`, preservando a direção
`shared ← data ← rules` de `docs/arquitetura.md` §2. `apps/web` importa `shared` e `rules`, além
dos componentes próprios. Nenhum arquivo desta feature importa `engine`, `ai`, `server`, Supabase,
IndexedDB ou `cards-data/`.

Esta feature **não toca `packages/engine`**. Não há estado de duelo, PRNG, replay, ações de motor
ou cálculo de `atk`/`def` efetivo. As garantias relevantes são:

- `packages/rules/src/library/**` permanece puro, sem React, DOM, `fetch`, Supabase, relógio,
  ambiente ou aleatoriedade.
- `apps/web/src/lib/library/filtros-url.ts` é a única fronteira que interpreta query params; ela
  valida com zod antes de entregar estado ao pipeline.
- `apps/web/src/components/library/**` não decide posse, não acessa catálogo e não calcula ordem
  fora das funções de `packages/rules`.
- Nenhum arquivo desta feature escreve em `collections`; a Library segue somente-leitura.

## 3. Design Técnico

### Estruturas de dados

**`TipoFiltroLibrary`** — união dos valores expostos pelo PRD F04:

| Valor | Semântica |
|---|---|
| `monstro` | Carta obtida com `carta.tipo === 'monstro'` |
| `magica` | Carta obtida com `carta.tipo === 'magica'` |
| `armadilha` | Carta obtida com `carta.tipo === 'armadilha'` |
| `equipamento` | Carta obtida com `carta.tipo === 'equipamento'` |

O estado "todos" não é valor da união; é representado por `tipos: []`. Cartas `ritual` aparecem
quando `tipos` está vazio, mas não são selecionáveis por filtro dedicado nesta feature (Decisão 8).

**`StatusFiltroColecao`**

| Valor | Semântica |
|---|---|
| `obtidas` | Apenas entradas `obtida: true`; padrão do PRD |
| `nao-obtidas` | Apenas entradas `obtida: false`; bloqueadas por contrato de F01 |
| `todas` | Entradas obtidas e bloqueadas |

**`CampoOrdenacaoLibrary`** — `numero`, `nome`, `atk`, `def`, `estrelas`. `numero` é público em
todas as entradas; os demais campos só existem em entradas obtidas.

**`EstadoFiltrosLibrary`**

| Campo | Tipo | Padrão | Semântica |
|---|---|---|---|
| `tipos` | `readonly TipoFiltroLibrary[]` | `[]` | Seleção vazia significa todos os tipos do catálogo |
| `status` | `StatusFiltroColecao` | `obtidas` | Status da coleção a exibir |
| `ordenacao.campo` | `CampoOrdenacaoLibrary` | `numero` | Campo principal de ordenação |
| `ordenacao.direcao` | `DirecaoOrdenacaoLibrary` (`asc`/`desc`) | `asc` | Direção do campo principal |

**Predicado de busca de F03** — contrato de integração com F03: função pura exportada pelo
subsistema `packages/rules/src/library/busca.ts` que recebe `EntradaLibrary` e devolve se a entrada
satisfaz o termo de busca ativo. Quando ausente, o pipeline assume predicado "aceita todas".

**`ResultadoConsultaLibrary`**

| Campo | Tipo | Semântica |
|---|---|---|
| `entradas` | `readonly EntradaLibrary[]` | Sequência final para `GradeColecao` e F05 |
| `totalAntes` | `number` | Tamanho da sequência recebida de F01/F02 |
| `totalDepois` | `number` | Tamanho da sequência após status, tipo e busca |
| `filtrosAtivos` | `EstadoFiltrosLibrary` | Estado normalizado usado na consulta |
| `temFiltrosNaoPadrao` | `boolean` | Verdadeiro quando tipo/status/ordenação diferem do padrão |

### Fluxo

1. **Leitura da URL.** Ao montar `/library`, `useLibraryFiltros` lê `searchParams` e chama
   `parseFiltrosLibraryUrl`. Valores ausentes viram defaults; valores inválidos são descartados
   e registrados.
2. **Estado validado.** O hook entrega `EstadoFiltrosLibrary` à fronteira de cliente. A busca de
   F03, quando existir, fornece separadamente o predicado sobre `EntradaLibrary`.
3. **Consulta pura.** `consultarEntradasLibrary` recebe `indice.entradas`, filtros normalizados e
   predicado de busca opcional. O pipeline aplica status, tipo, busca e ordenação.
4. **Status.** `obtidas` mantém apenas `obtida: true`; `nao-obtidas` mantém apenas `obtida: false`;
   `todas` preserva ambas.
5. **Tipo.** Com `tipos=[]`, nada é removido por tipo. Com um ou mais tipos, apenas entradas
   obtidas cujo `carta.tipo` está no conjunto selecionado passam. Entradas bloqueadas não passam,
   porque não possuem `tipo` e usar o tipo real revelaria informação oculta.
6. **Busca.** Se F03 estiver ativo, o predicado é aplicado depois de status/tipo. Isso mantém a
   semântica E entre os grupos e reduz a quantidade de entradas avaliadas pela busca. Sem F03, o
   predicado aceita todas.
7. **Ordenação.** A sequência filtrada é ordenada pelo campo e direção escolhidos. Empates sempre
   usam `numero` crescente; entradas sem chave ordenável ficam no fim.
8. **Renderização.** `LibraryCliente` renderiza `BarraFiltros`, `IndicadorProgresso` e
   `GradeColecao` com a sequência final. A grade não filtra, não ordena e não pagina.
9. **Atualização imediata.** Alterar qualquer controle atualiza a URL via navegação client-side e
   recalcula a consulta, sem recarregar o catálogo nem a coleção.
10. **Detalhe.** Ao navegar para `/library/[numero]`, os query params seguem na URL. F05 consome a
    mesma sequência final para anterior/próxima.
11. **Limpar filtros.** A ação remove apenas os params de F04 e restaura defaults. O parâmetro `q`
    de F03 é preservado.

### Regras de negócio

- **Default do módulo:** status `obtidas`, tipo todos, ordenação por `numero` crescente. — PRD §6
  F04 Capabilities
- **Semântica E entre grupos:** uma entrada precisa satisfazer status, tipo e busca para aparecer.
  Dentro de `tipos`, qualquer tipo selecionado satisfaz o grupo.
- **Cartas bloqueadas permanecem bloqueadas.** Nenhum filtro, ordenação ou componente recupera
  `carta` para uma entrada `obtida: false`.
- **Tipo só é aplicável a carta obtida.** Como a entrada bloqueada não tem `carta.tipo`, ela só
  aparece com filtro de tipo "todos".
- **Ordenação por campos ocultos não revela dados.** Bloqueadas ficam no fim em `nome`, `atk`,
  `def` e `estrelas`.
- **Valores numéricos ausentes vão ao fim** tanto em crescente quanto em decrescente. Isso cobre
  magias/armadilhas sem `atk`/`def`, equipamentos sem `def` e qualquer dado canônico vazio.
- **Ordenação por `numero` trata `numero` como identidade canônica de 3 dígitos.** A comparação
  usa a ordem canônica; não há parsing inseguro de número sem validação.
- **Ritual não é opção de filtro.** O PRD não lista esse valor; cartas ritual seguem visíveis em
  "todos" e ordenáveis por `numero`, `nome` e `estrelas` quando obtidas.
- **Limpar filtros não muda posse, coleção nem busca.** A Library continua somente-leitura.

### Controles de interface

- **Desktop/tablet largo:** barra horizontal acima da grade com status, tipos, ordenação e limpar
  filtros. A grade permanece logo abaixo, sem card externo envolvendo tudo.
- **Mobile:** a barra se recolhe em uma ação "Filtros"; abrir mostra os mesmos controles em painel
  compacto. Fechar o painel não reverte escolhas já aplicadas.
- **Tipo:** controle multiseleção, com estado "todos" evidente quando nenhum tipo está marcado.
  Selecionar um tipo remove o estado todos; desmarcar o último tipo volta para todos.
- **Status:** controle exclusivo de três valores.
- **Ordenação:** escolha de campo + alternância de direção, com nome acessível explícito para a
  direção atual.
- **Limpar filtros:** desabilitado quando os filtros de F04 já estão no padrão; não considera `q`
  para decidir habilitação.
- **Acessibilidade:** controles têm rótulos persistentes, foco visível, alvos de toque de pelo
  menos 44 px, estado selecionado não depende só de cor e respeita `prefers-reduced-motion`
  (`docs/estetica-visual.md` §2.2).

### Determinismo e pureza

Não se aplica a `packages/engine`. As funções de `packages/rules/src/library/` são determinísticas:

- Mesma sequência de `EntradaLibrary`, mesmo `EstadoFiltrosLibrary` e mesmo predicado de busca
  produzem a mesma sequência final.
- Nenhuma função muta as entradas recebidas; a ordenação trabalha sobre uma nova sequência.
- Não há I/O, relógio, ambiente, aleatoriedade, React, DOM, Supabase ou cache.
- A regra de desempate por `numero` torna a ordem total e estável, mesmo quando vários valores de
  ordenação são ausentes ou iguais.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`TipoFiltroLibrarySchema`** — enum estrito: `monstro`, `magica`, `armadilha`, `equipamento`.
- **`StatusFiltroColecaoSchema`** — enum: `obtidas`, `nao-obtidas`, `todas`.
- **`CampoOrdenacaoLibrarySchema`** — enum: `numero`, `nome`, `atk`, `def`, `estrelas`.
- **`DirecaoOrdenacaoLibrarySchema`** — enum: `asc`, `desc`.
- **`EstadoFiltrosLibrarySchema`** — objeto com `tipos` sem duplicatas, `status`, `ordenacao` e
  refinamento de defaults. Entradas inválidas vindas da URL são tratadas pela camada de parse, não
  por exceção no componente.
- **`ResultadoConsultaLibrarySchema`** — objeto serializável sem `porNumero`, com contagens
  inteiras e `entradas` validadas por `EntradaLibrarySchema`.
Os tipos de busca continuam no subsistema `rules` de F03. F04 não cria schema zod para predicados,
porque função não cruza fronteira serializável.

### Funções públicas

```
parseFiltrosLibraryUrl(searchParams: URLSearchParams): ResultadoParseFiltros
  // pós: devolve EstadoFiltrosLibrary válido; valores inválidos são descartados e listados

serializarFiltrosLibraryUrl(estado: EstadoFiltrosLibrary, searchParamsAtuais: URLSearchParams): URLSearchParams
  // pós: remove defaults da URL; preserva params que não pertencem a F04, incluindo q de F03

filtrarPorStatus(entradas: readonly EntradaLibrary[], status: StatusFiltroColecao): readonly EntradaLibrary[]
  // pós: obtidas | nao-obtidas | todas, preservando ordem relativa

filtrarPorTipo(entradas: readonly EntradaLibrary[], tipos: readonly TipoFiltroLibrary[]): readonly EntradaLibrary[]
  // pós: tipos vazio preserva todos; tipos específicos só aceitam entradas obtidas com tipo público

ordenarEntradasLibrary(
  entradas: readonly EntradaLibrary[],
  ordenacao: OrdenacaoLibrary,
): readonly EntradaLibrary[]
  // pós: não muta a entrada; ausentes no fim; desempate por numero crescente

consultarEntradasLibrary(entrada: ConsultaLibraryInput): ResultadoConsultaLibrary
  // entrada: { entradas, filtros, busca? }
  // pós: aplica status, tipo, busca e ordenação; devolve a sequência final para F02/F05
```

### Query params da Library

| Param | Valores | Default | Observação |
|---|---|---|---|
| `tipo` | repetível: `monstro`, `magica`, `armadilha`, `equipamento` | ausente = todos | Valores duplicados são deduplicados; inválidos são ignorados |
| `status` | `obtidas`, `nao-obtidas`, `todas` | `obtidas` | `nao-obtidas` usa ASCII na URL, texto exibido pode usar acento |
| `ordem` | `numero`, `nome`, `atk`, `def`, `estrelas` | `numero` | Campo principal |
| `direcao` | `asc`, `desc` | `asc` | Direção principal |
| `q` | definido por F03 | ausente | F04 preserva, mas não interpreta |

Exemplo de URL canônica:

```json
{
  "pathname": "/library",
  "search": "?tipo=monstro&tipo=equipamento&status=todas&ordem=atk&direcao=desc&q=dragon"
}
```

Estado parseado correspondente:

```json
{
  "tipos": ["monstro", "equipamento"],
  "status": "todas",
  "ordenacao": {
    "campo": "atk",
    "direcao": "desc"
  }
}
```

Resultado de consulta recortado:

```json
{
  "totalAntes": 722,
  "totalDepois": 18,
  "filtrosAtivos": {
    "tipos": ["monstro"],
    "status": "obtidas",
    "ordenacao": { "campo": "atk", "direcao": "desc" }
  },
  "temFiltrosNaoPadrao": true,
  "entradas": ["...entradas obtidas ordenadas..."]
}
```

Entrada bloqueada preservada em `status=todas`, tipo todos, ordenação por `numero`:

```json
{
  "obtida": false,
  "numero": "380",
  "arte": { "tipo": "silhueta" }
}
```

### Contratos internos

- **Para F02:** `LibraryCliente` passa `ResultadoConsultaLibrary.entradas` para `GradeColecao`.
  A grade continua sem regra própria.
- **Para F03:** F03 pode fornecer um predicado puro de busca exportado por
  `packages/rules/src/library/busca.ts`. Esse predicado deve respeitar a redação de
  `EntradaLibrary`: busca por nome só funciona em entradas obtidas; busca por `numero` pode
  funcionar em bloqueadas porque `numero` é público.
- **Para F05:** F05 recebe a sequência final e o `numero` atual. A navegação anterior/próxima usa
  a ordem dessa sequência, não `indice.entradas` bruto.

### Contratos externos (cross-PRD)

Nenhum contrato cross-PRD novo. F04 herda de F01:

- `banco-de-cartas`/F03 e F04 fornecem catálogo e resolução de artes, encapsulados em
  `IndiceLibrary`.
- `build-deck`/F01 fornece coleção do jogador e derivação booleana de posse.
- Auth/Cadastro fornece sessão para leitura da coleção.

## 5. Modelo de Dados

### Postgres / Supabase

Esta feature **não cria nem altera tabela, view, índice, constraint, política RLS ou RPC**. Ela não
escreve em `collections`, `active_decks`, `wallets` nem qualquer tabela de progresso. A política
herdada de F01/F02 continua: Library reflete o estado de coleção que outros módulos escrevem.

**RLS:** nenhuma política nova. A leitura de coleção segue encapsulada em F01 e protegida por
`player_id = auth.uid()` conforme `docs/arquitetura.md` §5.1.

**Migração:** nenhuma.

### Cache local / fila offline

Nenhum store IndexedDB novo e nenhuma fila offline. O estado de filtros é operacional e vive na
URL; a coleção cacheada continua sob responsabilidade de F01/Build Deck. Como F04 não muta nada,
não há `idempotencyKey`, replay de mutação ou reconciliação.

### Estado de URL

A URL é o único modelo persistente desta feature:

| Param | Tipo lógico | Constraint |
|---|---|---|
| `tipo` | lista sem duplicatas | somente valores de `TipoFiltroLibrary`; ausente = todos |
| `status` | enum | inválido → `obtidas` |
| `ordem` | enum | inválido → `numero` |
| `direcao` | enum | inválido → `asc` |

Serialização canônica omite defaults para manter URLs curtas. A ordem dos params `tipo` deve ser
estável na serialização para evitar navegações redundantes.

### Arquivos de dados versionados

Nenhum arquivo de dados novo. F04 consome apenas as entradas já montadas por F01; não lê
`cards-data/`, `cards.json`, `arts-manifest.json`, matriz de guardiões, terrenos, fusões ou drops.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Query param `status`, `ordem` ou `direcao` inválido | `parseFiltrosLibraryUrl` | Normaliza para default, registra descarte e segue | — |
| Query param `tipo` inválido ou duplicado | `parseFiltrosLibraryUrl` | Ignora inválidos, deduplica válidos; se nenhum válido sobrar, tipo=todos | — |
| `tipo=ritual` | Parser de tipo | Ignorado porque não é valor do PRD; cartas ritual aparecem em tipo=todos | — |
| `status=obtidas` com coleção vazia | Resultado F01/F02 | Mantém estado vazio de F02, com indicador "0 de N obtidas" | `Você ainda não obteve nenhuma carta. Vença duelos ou use senhas para começar sua coleção.` |
| `status=nao-obtidas` com cartas faltantes | Filtro de status | Exibe células bloqueadas com silhueta, `numero` e `???` | — |
| `status=nao-obtidas` + tipo específico | Filtro por tipo | Resultado vazio, porque bloqueadas não têm tipo público | `Nenhuma carta corresponde aos filtros selecionados.` |
| `status=todas` + tipo específico | Filtro por tipo | Mostra obtidas do tipo selecionado; bloqueadas são omitidas para não vazar tipo | — |
| Ordenação por `atk`/`def` com magias, armadilhas ou equipamentos sem valor | `ordenarEntradasLibrary` | Entradas sem valor vão para o fim em asc e desc; empate por `numero` | — |
| Ordenação por `nome`/`atk`/`def`/`estrelas` com bloqueadas | Comparador detecta ausência de `carta` | Bloqueadas vão para o fim, sem consultar catálogo | — |
| Ordenação por `numero` com bloqueadas | `numero` público | Ordena normalmente; não revela atributo oculto | — |
| Todos os filtros resultam em lista vazia sem busca ativa | `ResultadoConsultaLibrary.totalDepois === 0` | Mostra estado sem resultado de F04, não estado vazio de coleção | `Nenhuma carta corresponde aos filtros selecionados.` |
| Busca de F03 ativa e lista vazia | F03 informa termo ativo | A mensagem específica da busca prevalece sobre a de filtros | `Nenhuma carta encontrada para '{termo}'.` |
| Alterar filtros durante carregamento de F01 | Estado `carregando` | Atualiza URL; consulta roda quando o índice chegar | — |
| Recarregar coleção com filtros ativos | `recarregar()` de F01 | Mantém query params e recalcula a consulta sobre o novo índice | — |
| Navegar ao detalhe e voltar | Rota de F02 com query params | Filtros e ordenação permanecem na URL; grade retorna na mesma sequência | — |
| Mobile: painel de filtros aberto e navegação ao detalhe | Estado local do painel | Fecha ao sair da grade; filtros persistem pela URL | — |
| Sequência filtrada contém carta bloqueada e F05 navega anterior/próxima | Entrada `obtida: false` | F05 mostra detalhe bloqueado, nunca detalhe completo | Tratada por F05 |
| Falha de catálogo ou coleção | `useLibrary` de F01 | Estados de erro de F02 prevalecem; F04 não tenta filtrar ausência de dados | Mensagens de F01/F02 |

## 7. Estratégia de Testes

### Unitários (Vitest)

`filtrarPorStatus`:
- `filtrarPorStatus devolve apenas obtidas para status obtidas`
- `filtrarPorStatus devolve apenas bloqueadas para status nao obtidas`
- `filtrarPorStatus preserva obtidas e bloqueadas para status todas`
- `filtrarPorStatus preserva a ordem relativa das entradas`
- `filtrarPorStatus devolve lista vazia para entrada vazia`

`filtrarPorTipo`:
- `filtrarPorTipo com tipos vazio preserva todas as entradas`
- `filtrarPorTipo com monstro devolve apenas cartas obtidas do tipo monstro`
- `filtrarPorTipo com varios tipos aplica semantica OU dentro do grupo`
- `filtrarPorTipo exclui carta obtida de tipo nao selecionado`
- `filtrarPorTipo nao inclui entrada bloqueada quando tipo especifico esta ativo`
- `filtrarPorTipo preserva carta ritual quando tipo esta vazio`
- `filtrarPorTipo exclui carta ritual quando qualquer tipo especifico do PRD esta ativo`

`ordenarEntradasLibrary`:
- `ordenarEntradasLibrary ordena por numero crescente por padrao`
- `ordenarEntradasLibrary ordena por numero decrescente quando direcao desc`
- `ordenarEntradasLibrary ordena por nome em ordem alfabetica`
- `ordenarEntradasLibrary ignora maiusculas e acentos no comparador de nome`
- `ordenarEntradasLibrary ordena por atk crescente`
- `ordenarEntradasLibrary ordena por atk decrescente`
- `ordenarEntradasLibrary ordena por def crescente`
- `ordenarEntradasLibrary ordena por estrelas crescente`
- `ordenarEntradasLibrary coloca entradas sem valor numerico no fim em asc`
- `ordenarEntradasLibrary coloca entradas sem valor numerico no fim em desc`
- `ordenarEntradasLibrary coloca entradas bloqueadas no fim para campos privados`
- `ordenarEntradasLibrary desempata sempre por numero crescente`
- `ordenarEntradasLibrary nao muta a lista recebida`

`consultarEntradasLibrary`:
- `consultarEntradasLibrary aplica status tipo busca e ordenacao em semantica E`
- `consultarEntradasLibrary usa predicado aceita todas quando busca esta ausente`
- `consultarEntradasLibrary devolve totalAntes e totalDepois corretos`
- `consultarEntradasLibrary marca temFiltrosNaoPadrao falso para defaults`
- `consultarEntradasLibrary marca temFiltrosNaoPadrao verdadeiro para tipo especifico`
- `consultarEntradasLibrary preserva a redacao de entradas bloqueadas`

`parseFiltrosLibraryUrl` / `serializarFiltrosLibraryUrl`:
- `parseFiltrosLibraryUrl devolve defaults quando nao ha parametros`
- `parseFiltrosLibraryUrl aceita multiplos parametros tipo`
- `parseFiltrosLibraryUrl deduplica tipos repetidos`
- `parseFiltrosLibraryUrl ignora tipo invalido`
- `parseFiltrosLibraryUrl normaliza status invalido para obtidas`
- `parseFiltrosLibraryUrl normaliza ordem invalida para numero`
- `parseFiltrosLibraryUrl normaliza direcao invalida para asc`
- `serializarFiltrosLibraryUrl omite filtros padrao`
- `serializarFiltrosLibraryUrl preserva q da busca`
- `serializarFiltrosLibraryUrl remove apenas parametros de F04 ao limpar filtros`

### Property-based (fast-check)

- **Subconjunto:** para qualquer lista de entradas e qualquer filtro, a saída de
  `consultarEntradasLibrary` contém apenas objetos que estavam na entrada. O pipeline nunca cria
  cartas.
- **Redação preservada:** para qualquer consulta, toda entrada `obtida: false` na saída continua
  sem chave `carta` e sem referência de arte real.
- **Sem vazamento por tipo:** para qualquer consulta com `tipos` não vazio, toda entrada de saída
  possui `obtida: true` e `carta.tipo` dentro do conjunto selecionado.
- **Ausentes no fim:** para qualquer ordenação por campo privado, entradas sem chave ordenável
  aparecem depois das entradas com chave ordenável.
- **Ordem total estável:** aplicar a mesma consulta duas vezes sobre as mesmas entradas devolve a
  mesma sequência de `numero`.
- **Idempotência de parse/serialize:** serializar um estado normalizado e parsear de novo produz o
  mesmo `EstadoFiltrosLibrary`.
- **Limpar filtros preserva busca:** para qualquer `q`, limpar os filtros remove apenas params de
  F04 e conserva `q`.

### Componentes (Vitest + Testing Library)

`BarraFiltros`:
- `BarraFiltros renderiza status tipos ordenacao direcao e limpar filtros`
- `BarraFiltros marca obtidas como status padrao`
- `BarraFiltros aciona alteracao de status sem recarregar a pagina`
- `BarraFiltros desabilita limpar filtros quando F04 esta no padrao`
- `BarraFiltros habilita limpar filtros quando ha tipo selecionado`
- `BarraFiltros preserva q ao limpar filtros`
- `BarraFiltros recolhe controles em mobile sem duplicar labels acessiveis`

`ControleTipo`:
- `ControleTipo mostra todos quando nenhum tipo esta selecionado`
- `ControleTipo permite selecionar mais de um tipo`
- `ControleTipo remove um tipo sem apagar os demais`
- `ControleTipo volta para todos ao remover o ultimo tipo`

`ControleOrdenacao`:
- `ControleOrdenacao inicia em numero crescente`
- `ControleOrdenacao altera campo para atk`
- `ControleOrdenacao alterna direcao crescente e decrescente`
- `ControleOrdenacao possui nome acessivel para a direcao atual`

`LibraryCliente`:
- `LibraryCliente passa para GradeColecao a sequencia filtrada e ordenada`
- `LibraryCliente exibe estado sem resultado quando filtros retornam lista vazia`
- `LibraryCliente mostra mensagem de busca quando F03 informa termo ativo sem resultado`
- `LibraryCliente mantem estado vazio de colecao quando status obtidas e progresso zero`
- `LibraryCliente mantem filtros ao acionar recarregar`
- `LibraryCliente nao monta controles quando useLibrary esta em falha de catalogo`

### Integração

- `library filtros na URL sobrevivem a navegacao para detalhe e retorno`
- `library status todas renderiza obtidas e bloqueadas na GradeColecao`
- `library status nao obtidas renderiza somente celulas bloqueadas`
- `library tipo monstro com status obtidas renderiza apenas cartas obtidas de monstro`
- `library tipo especifico com status todas nao renderiza bloqueadas`
- `library ordenar por atk desc alimenta F05 com a mesma sequencia exibida na grade`
- `library recarregar colecao recalcula filtros sobre o novo indice`
- `library nao emite escrita em collections ao alterar filtros`

### Análise estática

- `packages/rules/src/library/**` não importa React, DOM, `fetch`, Supabase, IndexedDB, relógio,
  ambiente, `data`, `engine`, `ai`, `web` ou `server`.
- `apps/web/src/components/library/**` não importa Supabase, IndexedDB, `cards-data/` nem
  `packages/data`; dados chegam por `EntradaLibrary`.
- Nenhum arquivo desta feature lê atributos de carta sem estreitar `entrada.obtida === true`.
- Nenhum arquivo desta feature contém `insert`, `update`, `upsert` ou `delete` contra
  `collections`.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F04) | Teste |
|---|---|
| O filtro por tipo restringe a grade a `monstro`, `magica`, `armadilha` ou `equipamento`, e "todos" mostra todas | `filtrarPorTipo com monstro devolve apenas cartas obtidas do tipo monstro` + `filtrarPorTipo com tipos vazio preserva todas as entradas` + `library tipo monstro com status obtidas renderiza apenas cartas obtidas de monstro` |
| A ordenação por `numero`, `nome`, `atk`, `def` e `estrelas` funciona em ordem crescente e decrescente; cartas sem valor numérico vão para o fim | Casos de `ordenarEntradasLibrary` para cada campo/direção + `ordenarEntradasLibrary coloca entradas sem valor numerico no fim em asc/desc` |
| O filtro de status "obtidas" mostra só obtidas; "não obtidas" e "todas" incluem cartas bloqueadas | `filtrarPorStatus devolve apenas obtidas para status obtidas` + `filtrarPorStatus devolve apenas bloqueadas para status nao obtidas` + `filtrarPorStatus preserva obtidas e bloqueadas para status todas` |
| Todos os filtros e a busca combinam em semântica E | `consultarEntradasLibrary aplica status tipo busca e ordenacao em semantica E` + propriedade `Sem vazamento por tipo` |
| "Limpar filtros" restaura tipo=todos, status=obtidas e ordenação=`numero` crescente | `serializarFiltrosLibraryUrl remove apenas parametros de F04 ao limpar filtros` + `BarraFiltros desabilita limpar filtros quando F04 esta no padrao` |
| Selecionar uma célula bloqueada não revela os atributos completos da carta | `consultarEntradasLibrary preserva a redacao de entradas bloqueadas` + propriedade `Redação preservada` + testes de F02/F05 sobre célula/detalhe bloqueado |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: busca (F03) e filtros/ordenação (F04) aplicados na grade de F02 refletem-se na sequência de navegação anterior/próxima de F05 | `consultarEntradasLibrary aplica status tipo busca e ordenacao em semantica E` + `library ordenar por atk desc alimenta F05 com a mesma sequencia exibida na grade` + `GradeColecao nao filtra nem reordena as entradas recebidas` de F02 |
| Cross-Feature: o filtro de status "não obtidas"/"todas" faz surgir células bloqueadas na grade, e essas células mostram apenas o estado bloqueado em F05 | `library status nao obtidas renderiza somente celulas bloqueadas` + `library status todas renderiza obtidas e bloqueadas na GradeColecao` + propriedade `Redação preservada` |
| Cross-Feature: o indicador "X de 722 obtidas" usa a contagem exposta por F01 e muda quando a coleção muda | F04 não altera o indicador; `LibraryCliente mantem filtros ao acionar recarregar` garante que a releitura de F01/F02 continue refletida sob filtros ativos |
| Cross-PRD: Password libera carta e ela passa a constar como obtida após recarregar a coleção | `library recarregar colecao recalcula filtros sobre o novo indice`; a escrita é contrato externo de Password/F01 |
| Cross-PRD: Campanha/Free Duel concedem carta e ela aparece na próxima abertura | Mesmo teste de recálculo sobre novo índice; F04 não escreve nem recebe evento direto |
| Cross-PRD: Library nunca modifica o estado de coleção mantido por Save/Password/Campanha | `library nao emite escrita em collections ao alterar filtros` + análise estática sem mutações |
| Cross-PRD: Library e Build Deck consomem o mesmo banco de cartas, exibindo atributos de forma consistente | F04 nunca lê `cards-data/` nem altera `EntradaLibrary`; filtros por campos da carta usam somente o objeto canônico recebido de F01 |
