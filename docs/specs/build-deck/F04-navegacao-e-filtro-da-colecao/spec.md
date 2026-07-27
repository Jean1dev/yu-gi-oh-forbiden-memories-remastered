# Navegação e Filtro da Coleção

> PRD: `docs/prds/build-deck.md` — F04
> Pacote-alvo: `apps/web` (+ `packages/rules`, `packages/shared`)

## 1. Contexto e Escopo

Esta feature é o **painel da coleção** dentro do Build Deck: a superfície onde o jogador enxerga o
que possui, encontra uma carta pelo nome e a seleciona para a ação de adicionar ao deck (F05). É a
primeira feature de UI do módulo — não existe ainda nenhuma rota de Build Deck — e por isso também
estabelece a rota `/build-deck` e o app shell sobre o qual F05, F06 e F07 vão se encaixar nas waves
seguintes, do mesmo modo que `library`/F02 estabeleceu `/library` para o seu módulo.

O desenho é inteiramente de apresentação e obedece a ADR-004 ("a camada web mantém adaptadores
finos para renderização e interação, preservando as regras em pacotes compartilhados"). F04 não
recalcula posse, teto de cópias ou dados de carta — tudo isso já vem pronto de `build-deck`/F01
através de `useColecao` e `enriquecerColecao`. A única regra nova é a busca textual por nome, que
é pura o suficiente para viver em `packages/rules` ao lado do subsistema `colecao` já existente,
seguindo o mesmo padrão que `library`/F02 usou para `somenteObtidas`.

A feature pertence à **Fase 2** do roadmap (`arquitetura.md` §9), a mesma de `build-deck`/F01, e
depende exclusivamente dela (PRD §8, Tabela de Dependências: F04 → F01).

**Escopo escolhido nesta versão: apenas Core Scope** (Política de Auto-Aceite do Modo Batch —
"Escopo: Só Core" quando o PRD declara os dois blocos). Filtros por classe/tipo/guardião,
ordenação por múltiplos atributos e a alternância "somente fora do deck" × "toda a coleção" — todos
do bloco Full Scope additions do PRD — ficam fora desta spec e registrados em Adiado.

### Incluído

- Listagem da coleção possuída com arte, nome, classe, tipo, ATK/DEF, quantidade possuída e
  quantidade já no deck, por carta — PRD §6 F04 Core Scope
- Busca textual por nome, **case-insensitive** e por substring, recalculada a cada tecla —
  PRD §6 F04 Core Scope e Capabilities
- Resultado de busca em até **200 ms** sobre a coleção do jogador — PRD §6 F04 Capabilities
- Ordenação **padrão única** por `numero` crescente, herdada de F01 — nenhuma ordenação alternativa
  nesta versão (a combinação de critérios é Full Scope)
- Marca de **"limite atingido"** quando a quantidade no deck alcança `min(quantidade possuída, 3)`
  — PRD §6 F04 Experience
- **Seleção de uma carta**, que a destaca e expõe seu `numero` para a ação de adicionar ao deck de
  F05 — PRD §6 F04 Provides
- Navegação **somente leitura**: nenhuma função desta feature altera quantidade possuída, deck ou
  qualquer outro estado persistido — PRD §6 F04 Capabilities
- Fluidez com a coleção inteira sem paginação por número de página, via a mesma técnica de
  render-skipping por CSS que `library`/F02 já validou — PRD §6 F04 Capabilities ("lista
  virtualizada/paginada... ou rolagem virtual equivalente")
- Rota `/build-deck` com o app shell do módulo, cacheável pelo service worker (ADR-004), sobre a
  qual F05–F07 constroem o restante do editor
- Estados de carregamento, falha e coleção vazia, herdados do contrato de F01, com o aviso de
  coleção vinda do cache quando aplicável

### Adiado

Full Scope additions do PRD §6 F04, fora desta spec:

- Filtros por **classe**, **tipo** e **guardião** (`guardiao1`/`guardiao2`)
- Ordenação por `numero`, nome, `atk`, `def`, `estrelas` e quantidade possuída (mantém-se apenas a
  ordenação padrão por `numero`, herdada de F01)
- Alternância de exibição "somente cartas fora do deck" × "toda a coleção" (o painel sempre mostra
  a coleção inteira nesta versão)

### Fronteiras

- **Carregamento, enriquecimento e cache da coleção, teto de cópias por carta** → **F01**. F04
  consome `useColecao`, `ColecaoEnriquecida`, `ItemColecao` e `limiteCopias`, e não os recalcula.
  — PRD §6 F01
- **Ação de adicionar a carta selecionada ao deck** → **F05**. F04 apenas expõe o `numero`
  selecionado; a movimentação de cópia entre coleção e deck é de lá. — PRD §6 F05
- **Cálculo de validade do deck (40 cartas, ≤3 cópias)** → **F06**. F04 não valida o deck, apenas
  exibe a quantidade atual no deck por carta. — PRD §6 F06
- **Persistência do deck e da coleção** → **F07** e **F01**. F04 não grava em `active_decks` nem em
  `collections`. — PRD §6 F07
- **Escrita na coleção** (semeadura inicial, recompensa) → **F02**/**F03**. F04 é somente-leitura.
  — PRD §6 F02, F03
- **Renderização, layout responsivo concreto, animação e som** — os detalhes finais de estilo
  pertencem à camada de UI; esta spec descreve estrutura, fluxo e comportamento, não o design
  visual acabado. — PRD §7

### Contratos externos assumidos

- **`build-deck`/F01 — Coleção do Jogador.** Tem spec em
  `docs/specs/build-deck/F01-colecao-do-jogador-bau/`, sem implementação. F04 consome dela
  `useColecao`, `EstadoColecao`, `ColecaoCarregada`, `enriquecerColecao`, `ColecaoEnriquecida`,
  `ItemColecao` e `limiteCopias`. Nenhum é redefinido aqui. *Dependência interna, mesma wave*
  (Wave 2 do PRD), satisfeita porque F01 já tem spec neste repositório.
- **Quantidade da carta no deck ativo — contrato interno ainda não formalizado.** O Core Scope do
  PRD exige exibir "quantidade já no deck" por carta, mas a única feature que produzirá esse dado
  (`F05` — rascunho de edição, e `F07` — deck persistido) está em waves posteriores (3 e 5) e não
  tem spec ainda. F04 declara a interface mínima que precisa (`ConsultaDeckAtivo`, Seção 4),
  injetada, e cai num **fallback neutro de quantidade zero para todas as cartas** enquanto nenhuma
  implementação real existir — o mesmo idioma de "schema + loader + fallback neutro" que a Fase 0.4
  do skill aplica às tabelas de dado externo, generalizado aqui para uma dependência interna futura
  ainda sem contrato. *A ser fornecida por F02 (semeia o deck inicial) e refinada por F05/F07.*
- **`banco-de-cartas`/F03 e F04, Auth/Cadastro** — contratos externos herdados de F01, por
  transitividade. F04 não fala com nenhum deles diretamente. *A ser fornecidos pelos módulos
  correspondentes.*

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **Escopo desta spec: só Core Scope.** Filtros, ordenação múltipla e a alternância de exibição (Full Scope additions) ficam em Adiado. | auto-aceite: Política de Auto-Aceite, linha "Escopo (Core vs Core+Full)" | confirmada |
| 2 | O pacote-alvo é `apps/web`, com duas funções puras novas em `packages/rules` (busca por nome; composição com quantidade no deck) e um tipo/interface novos em `packages/shared`. Nenhuma regra de posse, contagem ou catálogo é recalculada aqui — ADR-004 e o precedente de `library`/F02, que aplicou a mesma divisão para a grade da Library. | ADR-004; spec `library/F02` Decisão 1 | confirmada |
| 3 | A **quantidade no deck** é lida por uma interface injetada (`ConsultaDeckAtivo`), com **fallback neutro de zero** enquanto F02/F05/F07 não expõem uma implementação real. O painel nunca quebra nem exibe dado inventado — apenas "no deck 0" até o contrato existir. | auto-aceite: Política de Auto-Aceite, linha "Feature exige tecnologia nova fora da stack" (aqui: dependência interna futura tratada com o mesmo idioma de fallback neutro) | a confirmar quando F05/F07 existirem |
| 4 | **Sem índice pré-computado nem debounce na busca.** A coleção de um jogador é no máximo algumas centenas de entradas (nunca as 722 cartas do jogo — só as possuídas); um `filter` linear sobre substring roda em frações de milissegundo, muito abaixo do orçamento de 200 ms do PRD. Adicionar debounce ou um índice de busca seria complexidade sem medição que a justifique. | auto-aceite: "Especificação parcial no PRD" (PRD cita `≤200ms` sem especificar a técnica); guidelines §17.1 ("measure first") | confirmada |
| 5 | A fluidez com a coleção inteira usa **`content-visibility: auto` + `contain-intrinsic-size` por célula** e carregamento preguiçoso de imagem — a mesma técnica que `library`/F02 já adotou e testou para 722 células — em vez de uma biblioteca de windowing nova. Zero dependência adicional; a coleção de um jogador é sempre um subconjunto menor que o catálogo inteiro, então a técnica já validada tem folga de sobra. | spec `library/F02` Decisão 2; guidelines §17.1, §20.1 | confirmada |
| 6 | A rota `/build-deck` é criada por **esta** feature, por ser a primeira de UI do módulo — no mesmo papel que `library`/F02 teve ao criar `/library`. F05, F06 e F07 estendem o app shell aqui criado; F04 não pressupõe nenhum layout de painel de deck ao lado, porque esse painel ainda não existe. | precedente: spec `library/F02` Decisão 10 | confirmada |
| 7 | A **seleção de carta** é estado local ao painel (não estado global, não persistido), exposta ao chamador por uma propriedade de retorno de chamada (`aoSelecionarCarta`). A escolha entre Zustand e `useReducer`+context (aberta em `arquitetura.md` §7) permanece **adiada para F05**, onde existirá o rascunho mutável do deck que justifica a decisão — repetindo a Decisão 5 de `build-deck`/F01 e a Decisão 12 de `library`/F01. | `arquitetura.md` §7; spec `build-deck/F01` Decisão 5; spec `library/F01` Decisão 12 | confirmada |
| 8 | O `useColecao` de F01 **não expõe uma função de recarregamento explícita** (ao contrário do `useLibrary` de `library`/F01, que expõe `recarregar`). Consequência aceita: uma carta creditada por F03 enquanto o jogador está com `/build-deck` aberto só aparece no painel ao **reabrir/remontar** a rota, não em tempo real durante a permanência contínua na tela. Atualização em tempo real é uma extensão de F01, fora do escopo desta feature. | spec `build-deck/F01` Seção 4 (contrato de `useColecao`) | confirmada — **limitação herdada, não desta feature** |
| 9 | A marca de **"limite atingido"** reusa `limiteCopias` de `packages/rules/src/colecao` (F01) — nunca reimplementa o teto de 3 cópias. `limiteAtingido = quantidadeNoDeck >= limiteCopias(quantidadePossuida)`. | PRD §6 F04 Experience; spec `build-deck/F01` Seção 4 | confirmada |
| 10 | Testes de componente com **@testing-library/react** sobre jsdom, reaproveitando a configuração que `library`/F02 já introduziu (`vitest.config.ts`, `vitest.setup.ts`), sem devDependency nova. **Consequência aceita:** jsdom não faz layout, então "reflui sem scroll horizontal de 320 px a 1920 px" e a percepção de fluidez da busca **não têm cobertura automatizada** e dependem do roteiro de verificação manual da Seção 7. | spec `library/F02` Decisão 9 | confirmada — **lacuna de cobertura assumida** |
| 11 | **Nenhuma tabela de dado externo pendente** (guardiões, terrenos, fusões, drops, rating, balanceamento) é consumida por F04. Guardião e classe trafegam como rótulos vindos do catálogo, sem cálculo de compatibilidade — que, de qualquer forma, é Full Scope adiado nesta versão. | PRD §7; `arquitetura.md` §10 | não se aplica |
| 12 | O monorepo, os pacotes `rules`/`web` e a configuração de teste de componente já são assumidos de `banco-de-cartas`/F01, `build-deck`/F01 e `library`/F02. Esta feature não recria nenhum. | spec `banco-de-cartas/F01` Decisão 14; spec `build-deck/F01` Decisão 13; spec `library/F02` Decisão 9 | confirmada |
| 13 | Não há Error Handling explícito para F04 no PRD. Os casos de borda desta spec (coleção vazia, busca sem resultado, falha de carregamento, deck indisponível) são derivados por boa prática e alinhados à redação já usada por F01 e por `library`/F02 para não introduzir um terceiro texto para a mesma situação. | auto-aceite: "Descrição vaga demais" / boa prática | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/colecao/deck-ativo.ts` | shared | novo | Interface `ConsultaDeckAtivo` e tipo `ItemColecaoComDeck` |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos contratos |
| `packages/rules/src/colecao/busca.ts` | rules | novo | `buscarPorNome` — filtro puro por substring case-insensitive |
| `packages/rules/src/colecao/busca.test.ts` | rules | novo | Unitários de `buscarPorNome` |
| `packages/rules/src/colecao/busca.propriedades.test.ts` | rules | novo | Propriedades fast-check de `buscarPorNome` |
| `packages/rules/src/colecao/com-deck.ts` | rules | novo | `comQuantidadeNoDeck` — composição pura com a quantidade no deck e a marca de limite |
| `packages/rules/src/colecao/com-deck.test.ts` | rules | novo | Unitários de `comQuantidadeNoDeck` |
| `packages/rules/src/colecao/index.ts` | rules | alterado | Reexporta `buscarPorNome` e `comQuantidadeNoDeck` |
| `apps/web/src/app/build-deck/page.tsx` | web | novo | Rota `/build-deck`: app shell estático que monta a fronteira de cliente |
| `apps/web/src/app/build-deck/build-deck-cliente.tsx` | web | novo | Fronteira de cliente: consome `useColecao` (F01) e `usePainelColecao`, escolhe entre esqueleto, falha, vazio e painel pronto |
| `apps/web/src/components/build-deck/painel-colecao.tsx` | web | novo | Painel: campo de busca + lista de cartas, renderiza o que recebe do hook |
| `apps/web/src/components/build-deck/painel-colecao.module.css` | web | novo | Layout fluido do painel, render-skipping por célula |
| `apps/web/src/components/build-deck/campo-busca-colecao.tsx` | web | novo | Campo de texto controlado que dispara a busca a cada tecla |
| `apps/web/src/components/build-deck/carta-colecao-item.tsx` | web | novo | Item da lista: arte, nome, classe, tipo, ATK/DEF, "possui N · no deck M", marca de limite atingido |
| `apps/web/src/components/build-deck/carta-colecao-item.module.css` | web | novo | Proporção fixa da arte, destaque de seleção, alvo de toque ≥ 44 px |
| `apps/web/src/components/build-deck/estado-vazio-colecao.tsx` | web | novo | Estado de coleção vazia (antes de F02 semear, ou após zerar) |
| `apps/web/src/components/build-deck/sem-resultado-busca.tsx` | web | novo | Estado "nenhuma carta encontrada" para o termo digitado |
| `apps/web/src/components/build-deck/falha-colecao.tsx` | web | novo | Estados de falha herdados de F01, com ação de recarregar |
| `apps/web/src/components/build-deck/esqueleto-painel.tsx` | web | novo | Esqueleto de carregamento com a métrica do item da lista |
| `apps/web/src/components/build-deck/mensagens.ts` | web | novo | Mapa único de código de erro/estado → mensagem ao jogador |
| `apps/web/src/lib/build-deck/deck-ativo-indisponivel.ts` | web | novo | Implementação-fallback de `ConsultaDeckAtivo` que devolve zero para toda carta, usada até F02/F05/F07 fornecerem a real |
| `apps/web/src/hooks/use-painel-colecao.ts` | web | novo | Hook fino: combina `useColecao`, o termo de busca e a seleção; expõe os itens já filtrados e compostos |
| `apps/web/src/components/build-deck/carta-colecao-item.test.tsx` | web | novo | Conteúdo do item, marca de limite, nome acessível, seleção |
| `apps/web/src/components/build-deck/painel-colecao.test.tsx` | web | novo | Filtragem ao vivo, estado vazio, sem resultado, ordem herdada |
| `apps/web/src/hooks/use-painel-colecao.test.ts` | web | novo | Composição do hook: busca, seleção, fallback de quantidade no deck |
| `apps/web/src/app/build-deck/build-deck-cliente.test.tsx` | web | novo | Máquina de estados da tela |

**Verificação da direção de dependências:** `packages/shared` continua sem importar nenhum pacote
do monorepo. `packages/rules` importa **apenas** `packages/shared` — `ConsultaDeckAtivo` entra por
injeção, então não há import de `packages/data` nem de nenhuma implementação concreta de deck.
`apps/web` importa `shared` e `rules`. Nenhum deles importa `engine`, `ai` ou `server`. A direção
`shared ← data ← rules` de `arquitetura.md` §2 é respeitada.

Esta feature **não toca `packages/engine`**: não produz estado de duelo, não usa PRNG e não
participa de replay. A fronteira de I/O e de regra é verificada por análise estática:

- `packages/rules/src/colecao/busca.ts` e `com-deck.ts` não importam React, DOM, `fetch`, Supabase
  nem relógio — recebem os itens já enriquecidos por F01 e devolvem estruturas em memória.
- Nenhum componente de `apps/web/src/components/build-deck/**` importa Supabase ou IndexedDB
  diretamente — todo dado de coleção chega por `useColecao` (F01), e a quantidade no deck chega por
  `ConsultaDeckAtivo` injetada.
- Nenhum componente recalcula `limiteCopias` nem o predicado de posse: ambos vêm de
  `packages/rules/src/colecao` (F01).
- Nenhum arquivo desta feature grava em `collections` ou `active_decks` — é o que sustenta o
  critério "navegação somente leitura" do PRD.

## 3. Design Técnico

### Estruturas de dados

**`ItemColecaoComDeck`** — a entrada que o painel renderiza, composta a partir de `ItemColecao`
(F01):

| Campo | Tipo | Semântica |
|---|---|---|
| `carta` | `Carta` | Os 12 campos canônicos, herdados de `ItemColecao.carta` |
| `quantidade` | `number` | Quantidade possuída, herdada de `ItemColecao.quantidade` |
| `limiteCopias` | `number` | `min(quantidade, 3)`, herdado de `ItemColecao.limiteCopias` |
| `quantidadeNoDeck` | `number` | Quantidade atual desta carta no deck ativo/rascunho — via `ConsultaDeckAtivo`, `0` enquanto o contrato não existir (Decisão 3) |
| `limiteAtingido` | `boolean` | `quantidadeNoDeck >= limiteCopias` |

**`ConsultaDeckAtivo`** — interface injetada (Seção 4), com um único método de leitura por
`numero`. Sem cache próprio: cada chamada do painel a invoca por carta, e a implementação decide
como resolver internamente.

**`EstadoPainelColecao`** — estado interno do hook `usePainelColecao`:

| Campo | Tipo | Semântica |
|---|---|---|
| `termo` | `string` | Texto de busca atual, controlado pelo campo |
| `itens` | `readonly ItemColecaoComDeck[]` | Itens já filtrados por `termo` e compostos com a quantidade no deck, na ordem herdada de F01 |
| `numeroSelecionado` | `NumeroCarta \| undefined` | Carta atualmente destacada, ou nenhuma |

### Fluxo

1. **Entrada.** O jogador abre `/build-deck`. A rota serve o app shell e monta a fronteira de
   cliente, que dispara `useColecao` (F01).
2. **Carregando.** Enquanto F01 não resolve, o esqueleto do painel ocupa o espaço com a mesma
   métrica do item da lista, para que a troca de estado não desloque o layout.
3. **Falha.** `useColecao` devolve erro ⇒ estado de falha com a mensagem herdada de F01 (coleção
   indisponível, sessão ausente) e ação de recarregar. Nenhum item é exibido.
4. **Pronta, coleção vazia.** `useColecao` resolve com uma coleção sem nenhuma entrada (jogador
   antes de F02 semear) ⇒ estado vazio próprio, sem lista em branco.
5. **Pronta, com cartas.** F04 chama `enriquecerColecao` (F01, se F01 ainda não devolver o
   resultado enriquecido) e `comQuantidadeNoDeck` para produzir `ItemColecaoComDeck[]`, na ordem
   por `numero` crescente herdada de F01. **F04 não reordena.**
6. **Busca.** A cada tecla no campo, `buscarPorNome(itens, termo)` recalcula a lista exibida,
   síncrono, sem debounce (Decisão 4). Termo vazio ou só espaços devolve a lista inteira.
7. **Sem resultado.** Termo que não casa com nenhum nome ⇒ estado "Nenhuma carta encontrada.",
   mantendo o campo de busca visível para o jogador ajustar o termo.
8. **Item da lista.** Cada carta mostra arte, nome, classe, tipo, ATK/DEF, "possui N", "no deck M"
   e a marca "limite atingido" quando `limiteAtingido` é verdadeiro.
9. **Seleção.** Ativar um item o destaca (`numeroSelecionado`) e chama `aoSelecionarCarta(numero)`,
   propriedade que o consumidor (futuramente F05) usa para habilitar a ação de adicionar. F04 não
   executa nenhuma ação de adicionar — apenas expõe a seleção.
10. **Somente leitura.** Nenhum passo acima grava em `collections`, `active_decks` ou qualquer
    outro estado persistido.

### Regras de negócio

- **Busca por nome é case-insensitive e por substring.** Compara `nome` e `termo` normalizados
  (minúsculas, sem espaços de borda). — PRD §6 F04 Capabilities
- **Resultado da busca em até 200 ms.** Cumprido por construção: `filter` linear sobre no máximo
  algumas centenas de itens roda em frações de milissegundo (Decisão 4). — PRD §6 F04 Capabilities
- **Ordenação única: `numero` crescente**, herdada de F01. Nenhuma ordenação alternativa nesta
  versão. — Adiado (Full Scope)
- **Marca de limite atingido quando `quantidadeNoDeck >= limiteCopias`.** — PRD §6 F04 Experience
- **Somente cartas possuídas aparecem** — herdado de F01 (`quantidade >= 1`); F04 nunca lista carta
  fora da coleção. — PRD §6 F01 Capabilities
- **Nenhuma escrita.** F04 não altera quantidade possuída, deck ou qualquer estado persistido. —
  PRD §6 F04 Capabilities

### Eventos

Não se aplica. Esta feature não toca `packages/engine` nem o Effect System, não emite eventos de
duelo e não consome nenhum.

### Determinismo e pureza

Não se aplica a `packages/engine` — F04 não produz estado de duelo, não usa PRNG e não participa de
replay. As garantias relevantes são de **pureza de `packages/rules`**:

- `buscarPorNome` e `comQuantidadeNoDeck` não executam I/O, não leem relógio nem sorteiam.
- `buscarPorNome` é função apenas de (itens, termo): a mesma dupla produz o mesmo subconjunto, na
  mesma ordem relativa da entrada.
- `comQuantidadeNoDeck` preserva a ordem e a contagem dos itens recebidos; a única variação é o
  campo anexado por carta.
- As estruturas devolvidas são imutáveis (`Readonly`, guidelines §6.3); nenhuma função muta os itens
  recebidos.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`ItemColecaoComDeck`** — tipo derivado (não precisa de schema zod: nunca cruza rede nem
  armazenamento, é uma composição em memória para a UI).
- **`ConsultaDeckAtivo`** — interface nomeada por capacidade (guidelines §10.1):
  `quantidadeNoDeck(numero: NumeroCarta): number`, sem lançar — carta ausente do deck devolve `0`.
  Composável com `ConsultaCatalogo` de F01 no mesmo padrão de composição de guidelines §10.3.
- **`Carta`, `NumeroCarta`, `ItemColecao`, `ColecaoEnriquecida`** — reusados de `packages/shared`
  conforme a spec de `build-deck`/F01. **Não são redefinidos aqui.**

Nenhum código de `DomainError` novo é introduzido: F04 reusa `colecao_indisponivel`,
`sessao_ausente` e `catalogo_indisponivel` já declarados por `build-deck`/F01.

### Funções públicas

```
// packages/rules/src/colecao — puro, sem I/O

buscarPorNome(itens: readonly ItemColecao[], termo: string): readonly ItemColecao[]
  // pré: nenhuma — termo pode ser vazio, só espaços, ou conter qualquer texto
  // pós: termo vazio/só espaços ⇒ devolve itens inalterado
  //      caso contrário ⇒ subconjunto cujo carta.nome normalizado contém termo normalizado
  //      preserva a ordem relativa de itens; nunca lança

comQuantidadeNoDeck(
  itens: readonly ItemColecao[],
  consultaDeck: ConsultaDeckAtivo,
): readonly ItemColecaoComDeck[]
  // pós: |saida| === |itens|, mesma ordem
  //      cada item ganha quantidadeNoDeck = consultaDeck.quantidadeNoDeck(carta.numero)
  //      e limiteAtingido = quantidadeNoDeck >= limiteCopias
```

```
// apps/web/src/hooks — adaptador React fino, sem regra

usePainelColecao(consultaDeck: ConsultaDeckAtivo): EstadoPainelColecao & {
  definirTermo: (termo: string) => void;
  selecionar: (numero: NumeroCarta | undefined) => void;
}
  // envolve useColecao (F01); em erro ou carregando, repassa o mesmo estado sem itens
  // em sucesso, produz itens = buscarPorNome(comQuantidadeNoDeck(enriquecida.itens, consultaDeck), termo)
```

```
// apps/web/src/lib/build-deck — fronteira de I/O (fallback)

deckAtivoIndisponivel(): ConsultaDeckAtivo
  // implementação neutra: quantidadeNoDeck sempre devolve 0
  // usada enquanto F02/F05/F07 não fornecem uma implementação real (Decisão 3)
```

### Endpoints / RPC / mensagens de rede

F04 **não introduz nenhum endpoint, RPC nem mensagem de rede.** Toda leitura de coleção passa por
`useColecao` (F01), que já encapsula o acesso a `collections` via PostgREST. A leitura de
quantidade no deck, quando existir uma implementação real, será fornecida por F02/F05/F07 — esta
spec não antecipa a forma dela além da interface `ConsultaDeckAtivo`.

Exemplo de `ItemColecaoComDeck` como o painel o recebe, com limite atingido:

```json
{
  "carta": {
    "id": 1, "numero": "001", "nome": "Blue-eyes White Dragon", "img": null,
    "classe": "Dragon", "atk": 3000, "def": 2500,
    "guardiao1": "Sun", "guardiao2": "Mars",
    "password": "89 63 11 39", "estrelas": 999999, "tipo": "monstro"
  },
  "quantidade": 3,
  "limiteCopias": 3,
  "quantidadeNoDeck": 3,
  "limiteAtingido": true
}
```

### Contratos externos (cross-PRD e internos futuros)

- **`useColecao`, `enriquecerColecao`, `ItemColecao`, `limiteCopias`** — *a serem fornecidos por
  `build-deck`/F01.* Já especificados; F04 os consome sem redefinir.
- **`ConsultaDeckAtivo` real** — *a ser fornecida por F02 (deck inicial) e refinada por F05
  (rascunho em edição) e F07 (deck persistido).* Enquanto isso, `deckAtivoIndisponivel()` cobre o
  contrato com zero para toda carta — nunca um valor inventado.
- **Contrato oferecido a F05** — `numeroSelecionado` e a propriedade `aoSelecionarCarta` são a
  superfície que F05 vai consumir para habilitar "adicionar ao deck". F04 não invoca nenhuma ação
  de escrita; apenas comunica a seleção.

## 5. Modelo de Dados

Esta feature **não cria nem altera tabela Postgres, store IndexedDB, migração ou arquivo de dados
versionado**. Ela não persiste nada: os itens exibidos são uma projeção em memória do que F01 já
carregou, recomposta a cada tecla de busca.

Duas consequências que valem registro, no mesmo espírito de `library`/F02:

- **Nenhuma preferência de visualização é persistida.** Termo de busca e seleção vivem apenas no
  estado do componente/hook; fechar e reabrir `/build-deck` reinicia ambos. Quando F04 ganhar
  filtros e ordenação (Full Scope, versão futura), a persistência desse estado — se necessária — é
  decisão daquela expansão, não desta.
- **A coleção continua sendo lida, nunca escrita.** F04 herda a RLS de `build-deck`/F01, que não
  concede ao cliente nenhuma política de escrita em `collections`; a garantia de somente-leitura é
  do banco, não apenas do código (spec `build-deck/F01`, Seção 5).

## 6. Tratamento de Erros e Casos de Borda

O PRD não declara um bloco Error Handling para F04. Os casos abaixo são derivados por boa prática
(Decisão 13), alinhados à redação que F01 e `library`/F02 já usam para as mesmas situações.

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Falha ao carregar a coleção, sem cache | `useColecao` devolve erro `colecao_indisponivel` | Estado de falha, nenhum item exibido, ação de recarregar | `Não foi possível carregar sua coleção. Tente novamente.` |
| Falha ao carregar a coleção, com cache disponível | `useColecao` devolve `origem: 'cache'` | **Sucesso.** Painel normal, com aviso acima da lista | `Coleção carregada do cache; algumas cartas podem estar desatualizadas.` |
| Sem sessão autenticada | `useColecao` devolve `sessao_ausente` | Estado de falha próprio | `Faça login para ver sua coleção.` |
| Coleção legitimamente vazia (antes de F02 semear, ou zerada) | Coleção resolvida com zero itens | Estado vazio próprio, campo de busca **oculto** (nada para buscar) | `Você ainda não possui cartas. Vença duelos ou use senhas para começar sua coleção.` |
| Termo de busca sem nenhum resultado | `buscarPorNome` devolve lista vazia | Estado "sem resultado", campo de busca continua visível e editável | `Nenhuma carta encontrada para "<termo>".` |
| Termo com espaços extras ou maiúsculas/minúsculas mistas | Normalização em `buscarPorNome` | Comparação normalizada; não afeta o resultado | — |
| `ConsultaDeckAtivo` real ainda não existe (F02/F05/F07 não implementados) | `deckAtivoIndisponivel()` em uso | Todas as cartas mostram "no deck 0"; nenhuma quebra, nenhuma marca de limite atingido indevida | — (comportamento neutro, sem mensagem) |
| Carta com `numero` desconhecido no catálogo | Já tratado por `enriquecerColecao` (F01) | A entrada nunca chega a F04 — F01 já a oculta e registra | Tratado por F01 |
| Nova carta creditada por F03 enquanto `/build-deck` está aberto | `useColecao` sem `recarregar` explícito (Decisão 8) | A carta aparece ao **reabrir** a rota, não durante a permanência contínua na tela | — (limitação herdada, documentada) |
| Duas abas com `/build-deck` aberto simultaneamente | Estado local ao componente | Cada aba mantém seu próprio termo de busca e seleção, sem compartilhamento; nenhuma escrita ocorre em nenhuma delas | — |
| Redimensionamento de 320 px a 1920 px | CSS fluido (Seção 3) | Reflui sem scroll horizontal; nenhuma largura fixa em pixel na trilha do painel | — |

Todo descarte é **registrado**, nunca silencioso (guidelines §8.3), reaproveitando o padrão de
registro já estabelecido por F01.

## 7. Estratégia de Testes

### Unitários (Vitest)

`buscarPorNome`:
- `buscarPorNome devolve todos os itens quando o termo e vazio`
- `buscarPorNome devolve todos os itens quando o termo e somente espacos`
- `buscarPorNome filtra por substring case-insensitive no nome`
- `buscarPorNome devolve lista vazia quando nenhum nome contem o termo`
- `buscarPorNome preserva a ordem relativa dos itens recebidos`
- `buscarPorNome nao muta a lista de itens recebida`

`comQuantidadeNoDeck`:
- `comQuantidadeNoDeck anexa a quantidade no deck vinda da consulta injetada`
- `comQuantidadeNoDeck usa zero quando a consulta de deck nao conhece o numero`
- `comQuantidadeNoDeck marca limiteAtingido quando a quantidade no deck alcanca o limite de copias`
- `comQuantidadeNoDeck nao marca limiteAtingido quando a quantidade no deck fica abaixo do limite`
- `comQuantidadeNoDeck preserva a ordem e a quantidade de itens recebidos`

`deckAtivoIndisponivel`:
- `deckAtivoIndisponivel devolve zero para qualquer numero de carta`

### Property-based (fast-check)

- **Correção da busca:** para qualquer lista de itens e qualquer termo, todo item devolvido por
  `buscarPorNome` tem `nome` normalizado contendo `termo` normalizado, e nenhum item cujo nome não
  contém o termo é devolvido. 1.000 execuções.
- **Neutralidade do termo vazio:** para qualquer lista de itens, `buscarPorNome(itens, "")` é igual
  a `itens`.
- **Conservação em `comQuantidadeNoDeck`:** para qualquer lista de itens e qualquer consulta de
  deck, `comQuantidadeNoDeck` devolve exatamente `|itens|` entradas, na mesma ordem, e
  `limiteAtingido` é sempre igual a `quantidadeNoDeck >= limiteCopias` para cada uma.

### Componentes (Vitest + @testing-library/react)

`CartaColecaoItem`:
- `CartaColecaoItem exibe arte nome classe tipo atk def possui e no deck`
- `CartaColecaoItem exibe a marca de limite atingido quando quantidadeNoDeck alcanca o limite`
- `CartaColecaoItem nao exibe a marca de limite atingido quando quantidadeNoDeck fica abaixo do limite`
- `CartaColecaoItem destaca o item quando selecionado`
- `CartaColecaoItem aciona aoSelecionarCarta com o numero ao ser ativado`

`PainelColecao`:
- `PainelColecao renderiza um item por carta da colecao recebida`
- `PainelColecao filtra a lista ao digitar no campo de busca`
- `PainelColecao exibe sem resultado quando o termo nao casa com nenhuma carta`
- `PainelColecao volta a exibir todos os itens quando o termo e apagado`
- `PainelColecao preserva a ordem por numero recebida do carregamento`
- `PainelColecao nao exibe o campo de busca quando a colecao esta vazia`

`usePainelColecao`:
- `usePainelColecao expõe itens vazios enquanto a colecao esta carregando`
- `usePainelColecao expõe o erro devolvido por useColecao sem gerar itens`
- `usePainelColecao aplica a busca sobre os itens compostos com a quantidade no deck`
- `usePainelColecao usa zero para quantidadeNoDeck quando nenhuma consulta real e fornecida`
- `usePainelColecao atualiza numeroSelecionado ao chamar selecionar`

`BuildDeckCliente` (máquina de estados):
- `BuildDeckCliente exibe o esqueleto enquanto o carregamento nao resolve`
- `BuildDeckCliente exibe a mensagem de falha de colecao e nenhum item`
- `BuildDeckCliente exibe a mensagem de sessao ausente quando nao ha jogador autenticado`
- `BuildDeckCliente exibe o estado vazio quando o jogador nao possui nenhuma carta`
- `BuildDeckCliente exibe o aviso de cache quando a colecao veio do armazenamento local`
- `BuildDeckCliente exibe o painel pronto quando a colecao carrega com sucesso`

### Análise estática

- `packages/rules/src/colecao/busca.ts` e `com-deck.ts` não importam React, DOM, `fetch`, Supabase
  nem relógio (guidelines §3.3, §12).
- `packages/rules` importa apenas `packages/shared`; nenhum import de `data`, `engine`, `ai`, `web`
  ou `server` (`arquitetura.md` §2).
- Nenhum arquivo de `apps/web/src/components/build-deck/**` reimplementa `limiteCopias` ou o
  predicado de posse — ambos vêm de `packages/rules` (ADR-004).
- Nenhum arquivo desta feature executa `insert`, `update`, `upsert` ou `delete` sobre `collections`
  ou `active_decks` (PRD §6 F04 Capabilities — "somente leitura").
- Nenhuma folha de estilo do painel declara largura fixa em pixel na trilha responsiva.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Verificação manual (lacuna assumida — Decisão 10)

jsdom não calcula layout nem tempo real de digitação; o roteiro abaixo é executado a cada mudança
no painel ou no item e registrado no PR:

- **Responsividade**, em 320, 375, 768, 1024, 1440 e 1920 px de largura: ausência de scroll
  horizontal; alvo de toque ≥ 44 px em todas as larguras; nome longo truncado sem estourar o item.
- **Percepção de fluidez da busca**, digitando em uma coleção com várias centenas de itens, sob
  perfil de rede e CPU representativos (guidelines §15.3): o resultado deve parecer instantâneo,
  cumprindo os 200 ms do PRD com folga (Decisão 4).

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F04) | Teste |
|---|---|
| Busca por nome (case-insensitive, substring) retorna resultados sobre a coleção em até 200 ms | `buscarPorNome filtra por substring case-insensitive no nome` + a propriedade de correção da busca + a verificação manual de percepção de fluidez (Decisão 4 cobre o orçamento por construção) |
| Cada carta mostra "possui N · no deck M" e marca "limite atingido" quando `M == min(N, 3)` | `CartaColecaoItem exibe arte nome classe tipo atk def possui e no deck` + `CartaColecaoItem exibe a marca de limite atingido quando quantidadeNoDeck alcanca o limite` + `comQuantidadeNoDeck marca limiteAtingido quando a quantidade no deck alcanca o limite de copias` |
| A navegação é somente leitura: não altera quantidades nem o deck | Análise estática (nenhuma escrita em `collections`/`active_decks`) + nenhuma função de mutação exportada por esta feature |
| Filtros por classe, tipo e guardião são combináveis e ordenação por múltiplos atributos funciona | **Não aplicável nesta versão** — Full Scope adiado (ver Adiado, Seção 1) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: fluxo completo F02 → F04 → F05 → F06 → F07 sem estado inconsistente entre coleção e deck | Esta feature contribui o lado de leitura: análise estática de que F04 nunca escreve em `collections` nem em `active_decks`. A consistência de escrita é responsabilidade de F05/F06/F07 |
| Cross-Feature: uma carta conquistada por F03 fica imediatamente utilizável em F04/F05 para troca no deck | `usePainelColecao expõe o erro devolvido por useColecao sem gerar itens` + a Decisão 8 documenta que "imediatamente" depende de reabrir `/build-deck` enquanto `useColecao` não expuser recarregamento — comportamento herdado de F01, não desta feature |
| Cross-PRD: Library e Build Deck exibem `atk`/`def`/`classe`/`guardiões` de forma consistente | `CartaColecaoItem exibe arte nome classe tipo atk def possui e no deck` — os valores vêm de `ItemColecao.carta` sem transformação, o mesmo `Carta` que `library`/F01 expõe sobre o mesmo catálogo |
