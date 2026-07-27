# Grade da Coleção

> PRD: `docs/prds/library.md` — F02
> Pacote-alvo: `apps/web` (+ `packages/rules`)

## 1. Contexto e Escopo

Esta feature é a **tela da Library**: a rota `/library`, a grade responsiva que renderiza as
entradas produzidas por F01, o indicador de progresso "X de 722 obtidas" e a seleção que abre o
detalhe de uma carta. É a primeira feature do módulo que o jogador enxerga — F01 entregou dados,
F02 entrega a experiência — e é sobre a estrutura dela que F03 (busca), F04 (filtros e ordenação)
e F05 (detalhe) se encaixam nas waves seguintes.

O desenho é inteiramente de apresentação e obedece a ADR-004: "a camada web mantém adaptadores
finos para renderização e interação, preservando as regras em pacotes compartilhados". Nenhuma
regra de posse, contagem ou resolução de arte é recalculada aqui — tudo vem pronto do
`IndiceLibrary` de F01. A única adição a `packages/rules` é o recorte por status de posse, que
F02 usa no seu padrão ("somente obtidas") e que F04 generaliza depois.

Duas decisões estruturais moldam a feature. A primeira: o detalhe é uma **rota real**
(`/library/[numero]`), não estado de componente — o que dá botão voltar, deep link e navegação por
teclado sem código, e deixa o estado de busca e filtros de F03/F04 viver na URL, sobrevivendo à ida
e volta. A segunda: a fluidez com centenas de cartas vem de **CSS**, não de uma biblioteca de
windowing — `content-visibility` por célula mais carregamento preguiçoso de imagem, que preserva
rolagem nativa, busca do navegador, foco e leitura de tela, e dispensa medir a largura do contêiner
a cada redimensionamento (`arquitetura.md` §7; guidelines §20.1).

A feature pertence à **Fase 2** do roadmap (`arquitetura.md` §9) e depende exclusivamente de F01.

### Incluído

Escopo escolhido: **Core Scope + Full Scope additions** (PRD §6 F02).

- Rota `/library` com o app shell da Library, cacheável pelo service worker (ADR-004)
- Grade fluida de **1 coluna em 320 px até múltiplas colunas em 1920 px**, sem scroll horizontal
  (PRD §6 F02 Capabilities)
- Célula única e fluida com arte (ou placeholder), `nome` e `numero`, que se compacta por tamanho
  do contêiner em vez de por um segundo componente (Decisão 3)
- **Rótulo de tipo/classe** em cada célula — *Full Scope addition*
- **Render-skipping** por `content-visibility` mais carregamento preguiçoso das artes, para manter
  a fluidez com as 722 cartas quando F04 pedir status "todas" — *Full Scope addition* (Decisão 2)
- Célula **bloqueada** — silhueta, `numero` e `???` — pronta para o filtro de status de F04, ainda
  que o padrão de F02 não a exiba (PRD §6 F02 Capabilities)
- Indicador de progresso "X de 722 obtidas" fixo no topo do módulo, derivado da contagem de F01
- Estado de carregamento (esqueleto), estado vazio e os dois estados de falha do PRD §6 F01
  Error Handling, com ação de recarregar
- Aviso de coleção vinda do cache local, quando F01 reporta essa procedência
- Seleção de uma célula abrindo `/library/[numero]`, com o detalhe cheio em telas pequenas e
  modal por rota interceptada em telas largas (Decisão 4)
- Acessibilidade: grade como lista semântica, nome acessível por célula, foco visível, alvo de
  toque ≥ 44 px e contraste AA (`docs/estetica-visual.md` §2.2)

### Fronteiras

- **Carregamento do catálogo e da coleção, cruzamento, contagens e resolução de arte** → **F01**.
  F02 consome `IndiceLibrary` e não conhece Supabase, IndexedDB nem o resolvedor de artes.
  — PRD §6 F01
- **Campo de busca, normalização do termo e mensagem "Nenhuma carta encontrada"** → **F03**. F02
  entrega a grade que aquele campo vai filtrar. — PRD §6 F03
- **Filtro por tipo, ordenação por `nome`/`atk`/`def`/`estrelas`, filtro de status, barra de
  controles e "limpar filtros"** → **F04**. F02 aplica apenas o status padrão "obtidas" e a
  ordenação padrão por `numero`. — PRD §6 F04
- **Conteúdo da tela de detalhe** — blocos de campos, cópia da senha, navegação anterior/próxima →
  **F05**. F02 define a rota e a leva até lá; o que ela renderiza é de F05. — PRD §6 F05
- **Escrita na coleção** de qualquer natureza → Password / Campanha / Free Duel (cross-PRD). A
  grade reflete, não escreve. — PRD §7
- **Contagem de cópias por carta** → Build Deck. A célula nunca exibe "possui N". — PRD §7
- **Ícones de Guardião Estelar, bônus de terreno, fusões e drops** → fora desta versão do módulo.
  A célula mostra tipo e classe, nada derivado de tabela inexistente. — PRD §7
- **Design final do placeholder de arte ausente e da silhueta** → pendência de arte registrada em
  `docs/estetica-visual.md` §4. F02 define o *lugar* e o *comportamento* dos dois; o desenho do
  asset chega depois sem alterar a estrutura. — Decisão 8

### Contratos externos assumidos

- **`library`/F01 — Acesso à Coleção do Jogador.** Tem spec em
  `docs/specs/library/F01-acesso-a-colecao-do-jogador/`, sem implementação. F02 consome dela
  `useLibrary`, `IndiceLibrary`, `EntradaLibrary`, `ProgressoColecao`, `ReferenciaArte` e
  `LibraryCarregada`. Nenhum é redefinido aqui. *Dependência interna, wave anterior.*
- **`banco-de-cartas`/F03 e F04, `build-deck`/F01, Auth/Cadastro** — contratos externos de F01,
  herdados por transitividade. F02 não fala com nenhum deles diretamente. *A ser fornecido pelos
  módulos correspondentes.*
- **Assets de placeholder e de silhueta** — *a ser fornecido pela direção de arte.* Até lá, ambos
  são marcadores neutros; ver Decisão 8.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | F02 é **puramente de apresentação**. Não recalcula posse, contagem nem referência de arte; consome o `IndiceLibrary` pronto de F01. A única regra que toca — o recorte por status de posse — vive em `packages/rules`, não no componente. | ADR-004; spec `library/F01` | confirmada |
| 2 | A fluidez com centenas de cartas vem de **`content-visibility: auto` + `contain-intrinsic-size` por célula**, mais `loading="lazy"` nas artes, e **não** de uma biblioteca de windowing. Zero dependência nova (guidelines §20.1), funciona com contagem de colunas variável sem medir o contêiner, e preserva rolagem nativa, busca do navegador, ordem de foco e leitura de tela. 722 nós DOM é volume pequeno; o custo real é decodificação de imagem, que o carregamento preguiçoso resolve. Se a medição mostrar insuficiência, a escalada é windowing real — mas otimizar antes de medir contraria guidelines §17.1. | entrevista; `arquitetura.md` §7; guidelines §17.1, §20.1 | confirmada |
| 3 | **Uma única célula fluida**, que se compacta por container query conforme o espaço disponível, em vez de dois componentes trocados por breakpoint. Em 320 px a grade cabe uma coluna e a célula assume a forma compacta que o PRD descreve — por consequência do tamanho, não por um segundo caminho de renderização. Um componente, uma árvore de foco, um alvo de teste para F03/F04/F05. | entrevista; PRD §6 F02 Experience | confirmada |
| 4 | O detalhe é uma **rota real** `/library/[numero]`: página cheia em telas pequenas e modal por rota interceptada em telas largas — os dois modos que o PRD §6 F05 Experience descreve. A célula vira link, e com isso botão voltar, deep link, meio-clique, navegação por teclado e nome acessível saem de graça. Consequência para F03/F04: o estado de busca e filtros deve viver em query params para sobreviver à ida e volta do detalhe. | entrevista; PRD §6 F05 Experience | confirmada |
| 5 | A célula **bloqueada** é construída agora, embora o padrão de F02 exiba somente obtidas. O PRD §6 F02 Capabilities já exige suportar as 722 cartas quando F04 pedir status "todas", e a variante bloqueada de `EntradaLibrary` (spec F01, Decisão 2) não carrega campo nenhum da carta — então a redação é estrutural: o componente não *tem* o que vazar. | PRD §6 F02 e F04 Capabilities; spec `library/F01` Decisão 2 | confirmada |
| 6 | A célula bloqueada também navega para `/library/[numero]`, que renderiza o **estado bloqueado**. O PRD §6 F04 diz que ela "não abre o detalhe **completo**", e o §6 F05 descreve explicitamente o detalhe bloqueado — logo abre o detalhe, em estado bloqueado. Tratá-la como não clicável quebraria a navegação anterior/próxima de F05 sobre uma sequência que inclui bloqueadas. | PRD §6 F04 e F05 Capabilities | confirmada |
| 7 | As artes usam `<img>` simples com `loading="lazy"`, `decoding="async"` e proporção fixa declarada, e **não** o otimizador de imagem do Next.js. As 722 artes são assets estáticos pequenos já cacheados pelo service worker como parte do app shell (`arquitetura.md` §7; `estetica-visual.md` §2.1); reprocessá-las acrescentaria uma etapa de build e uma rota de runtime sem ganho. A proporção fixa é o que impede deslocamento de layout durante o carregamento preguiçoso. | `arquitetura.md` §7; `estetica-visual.md` §2.1 | confirmada |
| 8 | Placeholder de arte ausente e silhueta de carta não obtida são tratados como **assets pendentes** (`estetica-visual.md` §4). F02 define o lugar, o tamanho, o texto alternativo e o comportamento de cada um; o desenho final entra depois sem alterar estrutura nem contrato. Nenhum valor de lore ou arte é inventado. | `estetica-visual.md` §4 | **pendente de asset** — não bloqueia |
| 9 | Testes de componente com **@testing-library/react** sobre o Vitest já travado — duas novas devDependencies (`@testing-library/react`, `@testing-library/jest-dom`) e o ambiente jsdom, nenhuma em conflito com ADR aceito. **Consequência aceita e explícita:** jsdom não faz layout, então os critérios "reflui sem scroll horizontal de 320 px a 1920 px" (PRD §9 F02) e "carga inicial ≤ 1 s com as 722 cartas" (PRD §4) **ficam sem cobertura automatizada** e passam a depender do roteiro de verificação manual da Seção 7. | entrevista; guidelines §20.1 | confirmada — **lacuna de cobertura assumida** |
| 10 | A rota `/library` é renderizada como app shell estático e a grade é um componente de cliente. Os dados dependem do jogador autenticado e do armazenamento local, então não há o que pré-renderizar no servidor; o que se ganha do App Router aqui é o shell cacheável do PWA e o roteamento do detalhe. Nenhuma diretiva de cache de dados se aplica. | ADR-004; `arquitetura.md` §7 | confirmada |
| 11 | O recorte "somente obtidas" vive em `packages/rules/src/library/visibilidade.ts`, não no componente. É o **padrão** do filtro de status que F04 vai generalizar para `obtidas | não obtidas | todas`; deixá-lo em `apps/web` obrigaria F04 a movê-lo depois e abriria precedente para regra na UI (ADR-004). | ADR-004; PRD §6 F04 Capabilities | confirmada |
| 12 | O indicador de progresso interpola `total` vindo de `ProgressoColecao`; o "722" do texto do PRD é **derivado, nunca literal**. Mantém a decisão 8 da spec de F01 e ADR-003, que fazem do catálogo a fonte única da contagem canônica. | ADR-003; spec `library/F01` Decisão 8 | confirmada |
| 13 | **Nenhuma tabela de dado externo pendente** é consumida. O rótulo da célula exibe `tipo` e `classe` como vêm do catálogo; nenhum ícone de Guardião, bônus de terreno ou fusão aparece, porque as tabelas correspondentes não existem (`arquitetura.md` §10) e o PRD §7 já os exclui. | PRD §7; `arquitetura.md` §10 | não se aplica |
| 14 | Esta feature assume o scaffolding de `banco-de-cartas`/F01 e os pacotes `rules` e `web` de `build-deck`/F01, e acrescenta a eles a configuração de teste de componente. Não recria nenhum. | spec `banco-de-cartas/F01` Decisão 14; spec `build-deck/F01` Decisão 13 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/rules/src/library/visibilidade.ts` | rules | novo | `somenteObtidas` — recorte por status de posse, padrão de F02 e base do filtro de F04 |
| `packages/rules/src/library/visibilidade.test.ts` | rules | novo | Unitários do recorte |
| `packages/rules/src/library/index.ts` | rules | alterado | Reexporta o recorte no export público do subsistema |
| `apps/web/src/app/library/page.tsx` | web | novo | Rota da grade: app shell estático que monta a fronteira de cliente |
| `apps/web/src/app/library/library-cliente.tsx` | web | novo | Fronteira de cliente: consome `useLibrary` e escolhe entre esqueleto, falha, vazio e grade |
| `apps/web/src/components/library/grade-colecao.tsx` | web | novo | Grade: lista semântica, render-skipping por célula, ordem recebida |
| `apps/web/src/components/library/grade-colecao.module.css` | web | novo | Grid fluido `auto-fill`, `content-visibility`, `contain-intrinsic-size` |
| `apps/web/src/components/library/celula-carta.tsx` | web | novo | Célula única fluida: variante obtida e variante bloqueada, ambas como link |
| `apps/web/src/components/library/celula-carta.module.css` | web | novo | Container query da forma compacta, proporção fixa da arte, foco visível, alvo ≥ 44 px |
| `apps/web/src/components/library/arte-carta.tsx` | web | novo | Imagem com carregamento preguiçoso, proporção fixa e queda para placeholder/silhueta |
| `apps/web/src/components/library/indicador-progresso.tsx` | web | novo | "X de N obtidas", região viva para anunciar mudança após recarregar |
| `apps/web/src/components/library/aviso-cache.tsx` | web | novo | Aviso de coleção vinda do cache, com o carimbo de sincronização |
| `apps/web/src/components/library/estado-vazio.tsx` | web | novo | Estado de coleção vazia, com a mensagem do PRD |
| `apps/web/src/components/library/esqueleto-grade.tsx` | web | novo | Esqueleto de carregamento, com a mesma métrica de célula da grade |
| `apps/web/src/components/library/falha-library.tsx` | web | novo | Estados de falha de catálogo e de coleção, com ação de recarregar |
| `apps/web/src/components/library/mensagens.ts` | web | novo | Mapa único de código de erro → mensagem ao jogador |
| `apps/web/src/components/library/celula-carta.test.tsx` | web | novo | Conteúdo da célula, redação da bloqueada, nome acessível, destino do link |
| `apps/web/src/components/library/grade-colecao.test.tsx` | web | novo | Ordem, recorte padrão, semântica de lista, estado vazio |
| `apps/web/src/components/library/indicador-progresso.test.tsx` | web | novo | Interpolação da contagem e atualização após recarregar |
| `apps/web/src/app/library/library-cliente.test.tsx` | web | novo | Máquina de estados da tela e mapeamento de erro para mensagem |
| `apps/web/vitest.config.ts` | web | alterado | Ambiente jsdom e setup de testes de componente |
| `apps/web/vitest.setup.ts` | web | novo | Registro dos matchers de DOM |
| `apps/web/package.json` | web | alterado | Acrescenta `@testing-library/react` e `@testing-library/jest-dom` em devDependencies |

**Verificação da direção de dependências:** `apps/web` importa `shared` e `rules`; `packages/rules`
continua importando **apenas** `packages/shared`. Nenhum import de `engine`, `ai` ou `server`. A
direção `shared ← data ← rules` de `arquitetura.md` §2 é respeitada, e o novo arquivo de `rules`
não acrescenta nenhuma dependência ao pacote.

Esta feature **não toca `packages/engine`**: não produz estado de duelo, não usa PRNG e não
participa de replay. A fronteira de I/O e de regra é verificada por análise estática:

- `packages/rules/src/library/visibilidade.ts` é puro: sem React, DOM, `fetch`, Supabase ou
  relógio.
- Nenhum componente de `apps/web/src/components/library/**` importa Supabase, IndexedDB ou o
  resolvedor de artes — todo dado chega por propriedade, vindo de `useLibrary` (F01).
- Nenhum componente decide se uma carta é obtida, conta o progresso ou escolhe entre arte,
  placeholder e silhueta: os três já vêm resolvidos em `EntradaLibrary` (ADR-004).
- Nenhum arquivo desta feature contém o literal `722` (Decisão 12) nem lê `cards-data/`
  diretamente (ADR-003 §6).

## 3. Design Técnico

### Estados da tela

`library-cliente.tsx` é uma máquina de cinco estados sobre o `EstadoLibrary` de F01:

| Estado | Condição | Render |
|---|---|---|
| `carregando` | F01 ainda não resolveu | Esqueleto com a mesma métrica de célula da grade, para que a troca não desloque o layout |
| `falha_catalogo` | erro `catalogo_indisponivel` | `Não foi possível carregar as cartas. Tente novamente.` + botão de recarregar. **A grade não é montada** (PRD §6 F01 Error Handling) |
| `falha_colecao` | erro `colecao_indisponivel` ou `sessao_ausente` | `Não foi possível carregar sua coleção. Tente novamente.` + botão de recarregar. Nenhuma carta é exibida como obtida |
| `vazia` | índice pronto e `progresso.obtidas === 0` | `Você ainda não obteve nenhuma carta. Vença duelos ou use senhas para começar sua coleção.` — e **não** uma grade em branco |
| `pronta` | índice pronto com ao menos uma obtida | Indicador + grade. Se `origemColecao === 'cache'`, o aviso de dado desatualizado aparece acima do indicador |

O mapeamento de código de erro para mensagem vive num único módulo (`mensagens.ts`), para que
F03, F04 e F05 não repitam texto e para que uma mudança de redação seja um só ponto.

### Fluxo (Experience do PRD)

1. **Entrada.** O jogador abre `/library`. A rota serve o app shell e monta a fronteira de
   cliente, que dispara o carregamento de F01. Enquanto isso, o esqueleto ocupa o espaço.
2. **Pronta.** Com o índice resolvido, a grade preenche com as entradas **recortadas por
   `somenteObtidas`** e na ordem em que chegam de F01 — `numero` crescente, a ordenação padrão do
   PRD. F02 **não reordena**: ordenar é de F04.
3. **Indicador.** O topo do módulo exibe "X de N obtidas", com X e N vindos de
   `calcularProgresso`. É região viva educada, para que o leitor de tela anuncie a mudança quando
   `recarregar()` traz uma carta nova.
4. **Célula.** Cada entrada vira um item de lista contendo um link para `/library/[numero]`. A
   variante obtida mostra arte, `nome`, `numero` e o rótulo de tipo/classe; a bloqueada mostra
   silhueta, `numero` e `???` no lugar do nome, **sem rótulo de tipo/classe** — que ela nem
   possui (Decisão 5).
5. **Foco e ponteiro.** A célula destaca-se no `:hover` e no `:focus-visible` com o mesmo
   tratamento, para que teclado e mouse tenham a mesma leitura.
6. **Seleção.** Ativar a célula navega para `/library/[numero]`. Em telas largas a rota é
   interceptada e o detalhe aparece como modal sobre a grade, preservando a posição de rolagem;
   em telas pequenas é a página cheia. Fechar o modal ou voltar retorna à grade — o botão voltar
   do sistema funciona porque a navegação é real (Decisão 4).
7. **Vazia.** Sem nenhuma carta obtida, o estado vazio substitui a grade. O indicador continua
   visível exibindo "0 de N obtidas": o progresso é informação válida mesmo em zero.

### Grade responsiva

- **Colunas por espaço disponível**, não por breakpoint: uma trilha `auto-fill` com largura mínima
  fixa e máxima flexível. Em 320 px cabe uma coluna; em 1920 px, tantas quantas couberem. Não há
  lista de breakpoints a manter em sincronia, e nenhuma largura fixa em pixel na trilha — que é a
  causa usual de scroll horizontal.
- **Nenhum elemento da grade excede a largura do contêiner**: a arte é limitada a 100 % da célula
  e o `nome` trunca com reticências, expondo o texto completo no atributo de título. Nome longo é
  o outro caminho comum para o estouro horizontal.
- **Forma compacta por container query**, não por media query: a célula reage ao espaço que ela
  própria recebeu, então continua correta se F04 introduzir uma barra lateral de filtros que
  estreite a grade sem estreitar a janela (Decisão 3).

### Fluidez com 722 células

- Cada célula declara `content-visibility: auto` e um `contain-intrinsic-size` correspondente à
  sua altura estimada. O navegador pula layout, estilo e pintura das células fora da viewport,
  mantendo a barra de rolagem com o tamanho correto graças ao tamanho intrínseco declarado.
- As artes usam carregamento preguiçoso e decodificação assíncrona, com **proporção fixa
  declarada** para que a chegada da imagem não desloque nada (Decisão 7).
- A grade não mede o contêiner, não observa redimensionamento e não mantém índice de janela.
  Rolagem nativa, âncora de rolagem, busca do navegador e ordem de foco permanecem intactas
  (Decisão 2).
- **Orçamento assumido:** o custo por célula é uma imagem preguiçosa e três textos; o trabalho de
  montagem do índice já foi pago em F01. O alvo de 1 s do PRD §4 é verificado manualmente
  (Decisão 9 e Seção 7).

### Acessibilidade

Deriva de `docs/estetica-visual.md` §2.2, que fixa contraste AA, foco visível e alvos de toque
≥ 44 px como direção do projeto:

- A grade é uma **lista semântica**, e cada carta um item — o leitor de tela anuncia a contagem e
  a posição, o que substitui a percepção visual de "quantas cartas há aqui".
- **Nome acessível por célula**: a variante obtida anuncia nome, número e tipo; a bloqueada
  anuncia apenas número e a condição de não obtida. O `???` visual não é lido como texto.
- **Alvo de toque ≥ 44 px** em qualquer largura, inclusive na forma compacta de 320 px.
- **Foco visível** com o mesmo destaque do `:hover`, nunca removido.
- O estado não depende só de cor: a carta bloqueada é reconhecível pela silhueta e pelo `???`,
  não por um matiz diferente.
- Animações de entrada respeitam `prefers-reduced-motion`.

### Regras de negócio

- **Padrão da grade: somente cartas obtidas**, ordenadas por `numero` crescente. — PRD §6 F02
  Capabilities e Experience
- **A célula bloqueada não exibe nome, tipo, classe, ATK, DEF, guardiões, senha nem estrelas.**
  A restrição é estrutural: a variante não obtida de `EntradaLibrary` não carrega esses campos.
  — Decisão 5; spec `library/F01` Decisão 2
- **A célula nunca exibe quantidade de cópias.** A Library é booleana. — PRD §7
- **O total do indicador vem do índice**, nunca de um literal. — Decisão 12
- **F02 não reordena nem filtra além do status padrão.** Ordem e filtros são de F04. — Decisão 11
- **Coleção vazia é estado válido, não erro**, e tem mensagem própria. — PRD §6 F02 Experience
- **Falha de catálogo impede a grade de abrir**; falha de coleção não exibe nenhuma carta como
  obtida. — PRD §6 F01 Error Handling

### Determinismo e pureza

Não se aplica a `packages/engine` — esta feature não produz estado de duelo, não usa PRNG e não
participa de replay. As garantias relevantes são:

- `somenteObtidas` é pura: sem I/O, sem relógio, sem sorteio; preserva a ordem relativa das
  entradas recebidas, que é o que mantém a ordenação padrão de F01 intacta.
- Os componentes são funções da propriedade recebida: a mesma entrada produz a mesma árvore
  renderizada, o que é o que torna os testes de componente determinísticos sem congelar relógio.

## 4. Contratos

Esta feature **não acrescenta nenhum tipo a `packages/shared`**. Consome os contratos que F01 já
declarou e oferece três superfícies: uma função pura em `rules`, as propriedades dos componentes e
o contrato de rota.

### Função pública (`packages/rules`)

```
// packages/rules/src/library — puro, sem I/O

somenteObtidas(entradas: readonly EntradaLibrary[]): readonly EntradaLibrary[]
  // pós: apenas entradas com obtida true, na mesma ordem relativa da entrada
  //      lista vazia devolve lista vazia; não lança
  // F04 generaliza esta função para o filtro de status obtidas | não obtidas | todas
```

### Propriedades dos componentes (`apps/web`)

```
GradeColecao({ entradas, rotuloVazio })
  // entradas: readonly EntradaLibrary[] — já recortadas e ordenadas pelo chamador
  // a grade não filtra, não ordena e não pagina; renderiza o que recebe, na ordem recebida
  // é este contrato que F03 e F04 preenchem sem reescrever a grade

CelulaCarta({ entrada })
  // entrada: EntradaLibrary — a união discriminada de F01
  // obtida true  ⇒ arte, nome, numero, rótulo de tipo/classe
  // obtida false ⇒ silhueta, numero, ???  (sem nome, tipo ou classe: não existem na variante)

IndicadorProgresso({ progresso })
  // progresso: ProgressoColecao — { obtidas, total }
  // renderiza "X de N obtidas" com N vindo do índice, nunca de um literal

ArteCarta({ arte, rotulo })
  // arte: ReferenciaArte — 'arte' com caminho, 'placeholder' ou 'silhueta'
  // proporção fixa declarada; carregamento preguiçoso; falha de rede cai no placeholder

AvisoCache({ sincronizadaEm })
FalhaLibrary({ erro, aoRecarregar })
EstadoVazio() / EsqueletoGrade()
```

### Contrato de rota

| Rota | Papel | Renderização |
|---|---|---|
| `/library` | Grade da coleção | App shell estático + fronteira de cliente (Decisão 10) |
| `/library/[numero]` | Detalhe da carta — **conteúdo é de F05** | Página cheia; é o destino de toda célula |
| `/library/@modal/(.)[numero]` | Mesmo detalhe interceptado sobre a grade | Modal em telas largas, preservando a rolagem |

`numero` no caminho é a string de 3 dígitos do schema canônico. F05 é quem trata `numero`
inexistente e o estado bloqueado. **Query params ficam reservados a F03 e F04** (termo de busca,
tipo, status, ordenação) — F02 não os lê nem os escreve, mas a escolha de rota é o que garante
que sobrevivam à ida e volta do detalhe (Decisão 4).

### Contratos externos (cross-PRD)

Nenhum consumido diretamente. F02 fala apenas com F01, que por sua vez encapsula catálogo, artes
e coleção. É essa indireção que mantém a grade testável sem Supabase, sem dataset e sem
navegador real.

## 5. Modelo de Dados

Esta feature **não cria nem altera tabela Postgres, store IndexedDB, migração ou arquivo de dados
versionado**. Ela não persiste nada: a grade é uma projeção do índice em memória que F01 monta a
cada abertura do módulo.

Duas consequências que valem registro:

- **Nenhuma preferência de visualização é persistida.** Não há densidade, tamanho de célula ou
  última posição de rolagem salvos — coerente com o módulo somente-leitura do PRD §7. Quando F04
  introduzir filtros, o estado deles vive na URL (Decisão 4), que é endereçável e compartilhável
  sem armazenamento.
- **O estado da coleção continua sendo lido, nunca escrito.** A grade não tem caminho de escrita
  em `collections`; a RLS herdada de `build-deck`/F01 não concede ao cliente política de escrita
  alguma, então a garantia é do banco e não apenas do código (spec `library/F01`, Seção 5).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Falha ao carregar o catálogo | `useLibrary` devolve `catalogo_indisponivel` | Estado `falha_catalogo`. **A grade não é montada** | `Não foi possível carregar as cartas. Tente novamente.` + recarregar |
| Falha ao carregar a coleção | `colecao_indisponivel` | Estado `falha_colecao`. Nenhuma carta exibida como obtida (fail-safe) | `Não foi possível carregar sua coleção. Tente novamente.` + recarregar |
| Sem sessão autenticada | `sessao_ausente` | Mesmo estado de falha de coleção, com mensagem própria | `Faça login para ver sua coleção.` |
| Coleção vinda do cache local | `origemColecao === 'cache'` | **Sucesso.** Grade normal, com aviso acima do indicador e o carimbo de sincronização | `Coleção carregada do cache; algumas cartas podem estar desatualizadas.` |
| Coleção vazia | `progresso.obtidas === 0` | Estado vazio em lugar da grade; o indicador segue visível em "0 de N obtidas" | `Você ainda não obteve nenhuma carta. Vença duelos ou use senhas para começar sua coleção.` |
| Carta obtida sem arquivo de arte | `arte.tipo === 'placeholder'` (resolvido em F01) | Placeholder no lugar da imagem; **nome, número e rótulo continuam visíveis** | — (visual) |
| Arte que existe no manifesto mas falha ao carregar no navegador (404, rede, cache frio) | `onError` da imagem | Queda para o mesmo placeholder, sem quebrar a célula nem a grade | — (visual) |
| Carta não obtida | `obtida === false` | Silhueta, `numero` e `???`. Sem nome, tipo, classe ou qualquer atributo — a variante não os possui | — (visual) |
| Nome de carta muito longo em célula estreita | CSS | Trunca com reticências e expõe o texto completo no título. **Nunca** estoura a largura da célula | — |
| Largura de 320 px | Trilha `auto-fill` | Uma coluna, célula na forma compacta, sem scroll horizontal | — |
| Largura de 1920 px | Trilha `auto-fill` | Várias colunas; a célula não estica além da largura máxima da trilha, evitando arte gigante | — |
| Grade estreitada por barra lateral futura (F04) | Container query | A célula assume a forma compacta mesmo em janela larga (Decisão 3) | — |
| Todas as 722 cartas exibidas (status "todas" de F04) | `content-visibility` | Só as células visíveis pagam layout e pintura; a barra de rolagem fica correta pelo tamanho intrínseco declarado | — |
| Recarregar enquanto a grade está aberta | `useLibrary` | Índice substituído por inteiro; o indicador anuncia a nova contagem por região viva | — |
| `prefers-reduced-motion` ativo | Media query | Transições de hover e entrada suprimidas | — |
| Navegação por teclado até uma célula fora da viewport | Rolagem nativa | Funciona: os nós existem no DOM, apenas não são pintados. É a razão de não usar windowing (Decisão 2) | — |
| Célula bloqueada ativada | Link para `/library/[numero]` | Abre o detalhe em **estado bloqueado**, tratado por F05 (Decisão 6) | Tratada por F05 |

## 7. Estratégia de Testes

### Unitários (Vitest)

`somenteObtidas` (`packages/rules`):
- `somenteObtidas mantem apenas entradas com obtida verdadeira`
- `somenteObtidas descarta entradas bloqueadas`
- `somenteObtidas preserva a ordem relativa das entradas recebidas`
- `somenteObtidas devolve lista vazia para lista vazia`
- `somenteObtidas devolve lista vazia quando nenhuma carta foi obtida`

### Componentes (Vitest + @testing-library/react)

`CelulaCarta`:
- `CelulaCarta exibe arte nome e numero para carta obtida`
- `CelulaCarta exibe o rotulo de tipo e classe para carta obtida`
- `CelulaCarta exibe silhueta numero e interrogacoes para carta bloqueada`
- `CelulaCarta nao expoe o nome da carta bloqueada em nenhum lugar da arvore`
- `CelulaCarta nao expoe tipo classe atk def guardiao password ou estrelas da carta bloqueada`
- `CelulaCarta aponta para a rota de detalhe do numero da carta obtida`
- `CelulaCarta aponta para a rota de detalhe tambem quando a carta esta bloqueada`
- `CelulaCarta usa placeholder quando a referencia de arte e placeholder`
- `CelulaCarta cai no placeholder quando a imagem dispara erro de carregamento`
- `CelulaCarta anuncia nome numero e tipo no nome acessivel da carta obtida`
- `CelulaCarta anuncia apenas numero e condicao de nao obtida no nome acessivel da bloqueada`
- `CelulaCarta nao exibe quantidade de copias`

`GradeColecao`:
- `GradeColecao renderiza uma celula por entrada recebida`
- `GradeColecao preserva a ordem das entradas recebidas`
- `GradeColecao renderiza a grade como lista semantica com um item por carta`
- `GradeColecao nao filtra nem reordena as entradas recebidas`
- `GradeColecao renderiza as 722 entradas quando o status inclui nao obtidas`

`IndicadorProgresso`:
- `IndicadorProgresso exibe a contagem de obtidas e o total do indice`
- `IndicadorProgresso exibe zero de total para colecao vazia`
- `IndicadorProgresso exibe total de total para colecao completa`
- `IndicadorProgresso anuncia a mudanca de contagem por regiao viva`
- `IndicadorProgresso nao contem o literal setecentos e vinte e dois no codigo`

`LibraryCliente` (máquina de estados):
- `LibraryCliente exibe o esqueleto enquanto o carregamento nao resolve`
- `LibraryCliente exibe a mensagem de falha de catalogo e nao monta a grade`
- `LibraryCliente exibe a mensagem de falha de colecao e nenhuma carta obtida`
- `LibraryCliente exibe a mensagem de sessao ausente quando nao ha jogador autenticado`
- `LibraryCliente exibe o estado vazio quando o jogador nao tem nenhuma carta`
- `LibraryCliente mantem o indicador visivel no estado vazio`
- `LibraryCliente exibe o aviso de cache quando a colecao veio do armazenamento local`
- `LibraryCliente nao exibe o aviso de cache quando a colecao veio do servidor`
- `LibraryCliente exibe somente as cartas obtidas por padrao`
- `LibraryCliente aciona o recarregamento ao ativar o botao de recarregar`

### Análise estática

- Nenhum componente de `apps/web/src/components/library/**` importa Supabase, IndexedDB, `fetch`
  ou o resolvedor de artes — todo dado chega por propriedade (ADR-004).
- Nenhum arquivo desta feature deriva posse, contagem de progresso ou escolha de arte por conta
  própria; os três vêm de `packages/rules` e de `EntradaLibrary` (ADR-004).
- Nenhum arquivo desta feature contém o literal `722` (Decisão 12) nem referencia `cards-data/`
  (ADR-003 §6).
- `packages/rules/src/library/visibilidade.ts` não importa React, DOM, rede nem relógio
  (guidelines §3.3).
- Nenhum arquivo desta feature executa escrita sobre `collections` (PRD §7).
- Nenhuma folha de estilo da grade declara largura fixa em pixel na trilha do grid — é a causa
  usual do scroll horizontal que o PRD §9 proíbe.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Verificação manual (lacuna assumida — Decisão 9)

jsdom não calcula layout, então os dois critérios abaixo **não têm cobertura automatizada**. O
roteiro é executado a cada mudança na grade ou na célula e registrado no PR:

- **Responsividade**, em 320, 375, 768, 1024, 1440 e 1920 px de largura: ausência de scroll
  horizontal; 1 coluna em 320 px e múltiplas colunas em 1920 px; célula na forma compacta em 320 px;
  alvo de toque ≥ 44 px em todas as larguras; nome longo truncado sem estourar a célula.
- **Carga**, com as 722 cartas e status "todas": tela utilizável em ≤ 1 s e rolagem sem
  travamento perceptível, medidas em perfil de rede e CPU representativos (guidelines §15.3).

Se a segunda verificação reprovar de forma consistente, a escalada registrada na Decisão 2 é
adotar windowing real — decisão de medição, não de antecipação.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F02) | Teste |
|---|---|
| Por padrão, a grade exibe somente as cartas obtidas, ordenadas por `numero` crescente | `LibraryCliente exibe somente as cartas obtidas por padrao` + `somenteObtidas descarta entradas bloqueadas` + `GradeColecao preserva a ordem das entradas recebidas` + `somenteObtidas preserva a ordem relativa das entradas recebidas` — a ordenação por `numero` é garantida na origem por F01 |
| Cada célula mostra arte (ou placeholder), nome e `numero`, e é selecionável por clique/toque | `CelulaCarta exibe arte nome e numero para carta obtida` + `CelulaCarta usa placeholder quando a referencia de arte e placeholder` + `CelulaCarta aponta para a rota de detalhe do numero da carta obtida` |
| O indicador "X de 722 obtidas" aparece no topo e reflete a contagem real | `IndicadorProgresso exibe a contagem de obtidas e o total do indice` + `IndicadorProgresso nao contem o literal setecentos e vinte e dois no codigo` + a análise estática do literal |
| A grade reflui sem scroll horizontal de 320 px a 1920 px | **Verificação manual** (Decisão 9), apoiada pela análise estática que proíbe largura fixa em pixel na trilha do grid |
| Coleção vazia exibe o estado próprio em vez de grade em branco | `LibraryCliente exibe o estado vazio quando o jogador nao tem nenhuma carta` + `LibraryCliente mantem o indicador visivel no estado vazio` |
| Selecionar uma carta obtida abre a tela de detalhe (F05) | `CelulaCarta aponta para a rota de detalhe do numero da carta obtida` — o destino é o contrato de rota da Seção 4; o conteúdo renderizado lá é testado por F05 |
| Carga inicial ≤ 1 s com as 722 cartas (PRD §4) | **Verificação manual** (Decisão 9) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: cartas marcadas como obtidas em F01 aparecem na grade de F02 e abrem detalhe completo em F05 | `LibraryCliente exibe somente as cartas obtidas por padrao` + `CelulaCarta aponta para a rota de detalhe do numero da carta obtida` — F02 fecha o caminho de F01 até a rota; o detalhe em si é de F05 |
| Cross-Feature: o filtro de status "não obtidas"/"todas" (F04) faz surgir células bloqueadas na grade, que mostram apenas o estado bloqueado em F05 | `GradeColecao renderiza as 722 entradas quando o status inclui nao obtidas` + `CelulaCarta exibe silhueta numero e interrogacoes para carta bloqueada` + `CelulaCarta nao expoe o nome da carta bloqueada` + `CelulaCarta nao expoe tipo classe atk def guardiao password ou estrelas da carta bloqueada` |
| Cross-Feature: o indicador "X de 722 obtidas" usa a contagem exposta por F01 e muda quando a coleção subjacente muda | `IndicadorProgresso exibe a contagem de obtidas e o total do indice` + `IndicadorProgresso anuncia a mudanca de contagem por regiao viva` + `LibraryCliente aciona o recarregamento ao ativar o botao de recarregar` |
| Cross-Feature: busca (F03) e filtros/ordenação (F04) aplicados na grade refletem-se na sequência de navegação de F05 | `GradeColecao nao filtra nem reordena as entradas recebidas` — a grade renderiza exatamente a sequência que recebe, então a sequência que F03/F04 produzem é a mesma que F05 percorrerá. O contrato de propriedade da Seção 4 é o ponto de encaixe |
| Cross-PRD: carta liberada pelo Password, ou concedida por Campanha/Free Duel, aparece como obtida na Library | `LibraryCliente aciona o recarregamento ao ativar o botao de recarregar` — a releitura é de F01; F02 fornece o gatilho e reflete o resultado |
| Cross-PRD: a Library nunca modifica o estado de coleção mantido por Save/Password/Campanha | Análise estática de que nenhum arquivo desta feature escreve em `collections`, somada à RLS sem política de escrita herdada de `build-deck`/F01 |
| Cross-PRD: Library e Build Deck exibem `atk`/`def`/`classe`/`guardiões` de forma consistente | `CelulaCarta exibe o rotulo de tipo e classe para carta obtida` — os valores vêm de `EntradaLibrary` sem transformação, e a análise estática impede qualquer leitura alternativa de `cards-data/` (ADR-003) |
