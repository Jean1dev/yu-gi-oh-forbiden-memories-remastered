# Inicialização do Duelo

> PRD: `docs/prds/motor-duelo-1x1.md` — F03
> Pacote-alvo: `packages/engine` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta feature é o ponto onde o motor deixa de ser só forma de dados (F01) e mecanismo de eventos
(F02) e passa a **produzir** o primeiro `EstadoDuelo` de verdade: recebe os dois decks (via Build
Deck, cross-PRD), valida-os com autoridade, embaralha por seed, distribui a mão inicial, zera o
campo e sorteia quem começa. É a primeira função do PRD com **determinismo por seed** exercitado de
fato (`arquitetura.md` §1, pilar 2) — a partir daqui, "mesmo estado + mesma sequência de ações +
mesmo seed ⇒ mesmo resultado" deixa de ser só uma promessa de F01/F02 e passa a ser testável.

F03 concretiza `initDuel(input): EstadoDuelo`, citado literalmente em `arquitetura.md` §3.1 e já
referenciado por esse nome exato na spec de `free-duel`/F02 ("`initDuel(input)`
(`arquitetura.md` §3.1) recebe os dois decks + seed... *Consumido por F03*"). Como o motor é
**agnóstico de quem o chama** (PRD §1 Resumo Executivo), F03 não pode confiar cegamente que o
chamador já validou os decks — por isso ela **revalida com autoridade**, reusando o validador de
deck já criado por `free-duel`/F02 em `packages/rules` (fonte única 40/≤3/existência) em vez de
duplicar essas três checagens dentro do motor.

Esta spec **não** conduz o ciclo de turno (F06), **não** decide se um deck é "possuído" pelo
jogador (`build-deck`/F06) e **não** persiste o estado resultante em lugar nenhum — devolve o
`EstadoDuelo` em memória, pronto para o turno 1.

### Incluído

- Validação com autoridade de cada deck recebido: exatamente 40 cartas, no máximo 3 cópias por
  `numero`, toda carta existente no catálogo (PRD F03 Capabilities e Error Handling; Fase 0.3)
- Resolução de `numero` → `Carta` completa para as 40 entradas de cada lado, usando o catálogo
  (necessário porque `EstadoDuelo`, F01 Decisão 9, embute cartas por valor)
- Embaralhamento determinístico de cada deck por um PRNG semeado (`arquitetura.md` §3.1: "PRNG
  semeado próprio, nunca `Math.random()`")
- Distribuição de **5 cartas** de mão inicial a cada jogador (PRD F03 Capabilities)
- Sorteio do **primeiro jogador**, derivado do mesmo seed (PRD F03 Capabilities)
- LP inicial **8000** para ambos, campo vazio (10 zonas livres por lado), sem terreno ativo (PRD
  F03 Capabilities; reusa `LP_INICIAL` de F01)
- Geração de um seed quando o chamador não fornece um, via dependência injetada — mantendo
  `initDuel` livre de qualquer fonte de entropia interna (PRD F03 Error Handling)
- Extensão de `EstadoDuelo` (F01) com o campo `seed`, reservado desde a Decisão 7 daquela spec

### Fronteiras

- **Ciclo de turno, fases, jogadas** → **F06–F12**. F03 entrega o estado pronto para o turno 1;
  não conduz nada depois disso.
- **Validação de posse** ("o jogador realmente tem essas cartas na coleção") → **`build-deck`/F06**.
  F03 valida só a estrutura do deck (tamanho, cópias, existência no catálogo), não a coleção do
  jogador. — mesma fronteira já traçada pela spec de `free-duel`/F02
- **Persistência do estado inicial** → fora deste PRD. `initDuel` devolve o estado em memória; quem
  chama decide se/onde guardá-lo (ex.: `apps/web` para Free Duel local, `apps/server` para Online).
- **Geração do valor do seed quando ausente** → delegada a uma dependência injetada, fora de
  `packages/engine` (Decisão 4). O motor nunca gera entropia por conta própria.
- **Efeitos, fusão, guardião, terreno** → não tocados aqui. O campo começa vazio e sem nenhum
  modificador aplicado; nenhum desses subsistemas (cross-PRD) é consultado durante a inicialização.

### Contratos externos assumidos

- **`ComposicaoDeck`, `ViolacaoDeck`, `montarDeckPronto`** — de `free-duel`/F02
  (`docs/specs/free-duel/F02-verificacao-do-deck-ativo/spec.md`), em `packages/shared/src/deck/` e
  `packages/rules/src/deck/`. Reusados sem redefinir (Decisão 1). Spec existe; implementação não.
- **`ConsultaCatalogo`** — `(numero) => Carta | undefined`, já declarada por `build-deck`/F01 e
  `free-duel`/F01, a ser fornecida por `banco-de-cartas`/F03.
- **`BuildDeck/FXX` (cross-PRD, per PRD §8)** — na prática, satisfeita transitivamente por
  `free-duel`/F02 (deck do jogador) e `free-duel`/F01 (deck do NPC), ambos já entregando a mesma
  forma `ComposicaoDeck`/lista de 40 `numero`.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A validação de deck **reusa** `montarDeckPronto`/`validarDeckParaDuelo` de `packages/rules` (criados por `free-duel`/F02) em vez de duplicar as três checagens dentro do motor. `initDuel` recebe `ComposicaoDeck` crua por lado, nunca um `DeckPronto` pré-validado por terceiros. | Entrevista (recomendação aceita) | confirmada |
| 2 | `initDuel` mantém o **nome literal em inglês** (não `inicializarDuelo`) — já é citado por esse nome exato em `arquitetura.md` §3.1 e na spec de `free-duel`/F02 ("`initDuel(input)`... Consumido por F03"). Mesma disciplina de exceção nomeada usada para os 10 tipos de evento em F02. | `arquitetura.md` §3.1; `docs/specs/free-duel/F02-verificacao-do-deck-ativo/spec.md` | confirmada |
| 3 | Duas camadas separadas: `montarEntradaInicializacao` (valida, resolve cartas, resolve seed — pode falhar, devolve `Result`) e `initDuel` (puro, **total**, assume entrada já válida — devolve `EstadoDuelo` direto, sem `Result`). Espelha o padrão `validarDeckParaDuelo` → `montarDeckPronto` → `expandirComposicao` já usado por `free-duel`/F02, e casa com a assinatura literal `initDuel(input): EstadoDuelo` de `arquitetura.md` §3.1. | `arquitetura.md` §3.1; precedente `free-duel`/F02 | confirmada |
| 4 | `seed` é **obrigatório** dentro de `initDuel` e nunca gerado internamente. Quando o chamador de `montarEntradaInicializacao` não fornece um, a geração acontece por uma função injetada (`geradorSeed`), fora do núcleo puro — mantendo `initDuel` livre de `Math.random()` ou qualquer entropia interna. | guidelines §12.2 (padrão `RandomSource`); `arquitetura.md` §3.1 ("nunca `Math.random()`") | confirmada |
| 5 | **Nenhum "cursor de PRNG" é armazenado no estado** nesta feature — apenas o `seed` estático. Dentro do escopo de F01–F12 deste PRD, nenhuma ação além da inicialização consome aleatoriedade; se uma feature futura precisar de mais sorteio, um cursor pode ser acrescentado alterando estes mesmos arquivos, como já feito para `pendente` em F02. | Leitura de todas as Capabilities de F06–F12 — nenhuma menciona sorteio | confirmada |
| 6 | **mulberry32** é o algoritmo de PRNG adotado — citado literalmente em `arquitetura.md` §3.1 como exemplo ("PRNG semeado próprio (ex.: mulberry32)"). | `arquitetura.md` §3.1 | confirmada |
| 7 | **Ordem fixa de consumo do PRNG** dentro de `initDuel`: embaralhar P1, depois embaralhar P2, depois sortear o primeiro jogador. Essa ordem é parte do próprio contrato de determinismo e nunca muda entre execuções. | PRD §9 F03, critério de aceite 3 | confirmada |
| 8 | **"Primeiro turno do duelo" (consumido por F06) é apenas `turno === 1`** — nenhuma flag booleana redundante é acrescentada a `EstadoDuelo`. **Correção em relação à previsão original de F01** (Fronteiras daquela spec anticipava uma flag separada "marcada por F03"): como `turno` já existe, é monotonicamente crescente a partir de 1 e este PRD é só 1x1 (sem múltiplas rodadas iniciais), uma flag paralela seria estado redundante e desincronizável (guidelines §1.1). | Releitura de F06 Capabilities; revisão da Fronteira de F01 | confirmada |
| 9 | Falha de validação no deck de P1 **interrompe antes de checar P2** (fail-fast, não acumula violações dos dois lados). As 3 mensagens do PRD não distinguem por jogador, e, na prática, cada lado já chega pré-validado por quem monta a partida (`free-duel`/F02 para o jogador humano, `free-duel`/F01 para o NPC) — F03 é rede de segurança de autoridade, não o ponto primário de UX de correção de deck. | PRD §6 F03 Error Handling (3 mensagens, sem menção a "qual jogador") | confirmada |
| 10 | Quando um deck viola mais de uma regra simultaneamente, a **primeira violação da lista já ordenada** (mesma ordenação de `free-duel`/F02: tamanho primeiro, depois `numero` crescente) decide qual das 3 mensagens do PRD é exibida. Nenhuma prioridade nova é inventada. | Precedente `free-duel`/F02 (ordenação de `violacoes`) | confirmada |
| 11 | `quantidade_invalida` (violação técnica do vocabulário de `free-duel`/F02 — quantidade não-inteira/negativa —, não citada nas 3 mensagens deste PRD) mapeia para a mensagem de **tamanho** ("são necessárias exatamente 40 cartas"), por refletir uma composição estruturalmente corrompida, mais próxima desse caso que dos outros dois. | Leitura conjunta dos dois PRDs (nenhum dos dois antecipa esse cruzamento) | confirmada |
| 12 | O estado inicial começa em `fase: 'compra'`, `turno: 1`. F06 (ainda não especificada) tratará a compra do primeiro turno normalmente — como a mão já tem 5 cartas, a compra do turno 1 é de 0 cartas, sem precisar de um caso especial fora do ciclo de turno. | Leitura de F06 Capabilities ("no início do turno, completa a mão até 5") | confirmada |
| 13 | `TAMANHO_MAO_INICIAL = 5` é uma **nova constante** em `packages/shared`, ao lado de `LP_INICIAL` (F01) — reusável por F07 quando essa spec existir. | PRD §6 F03 Capabilities | confirmada |
| 14 | Após separar a mão (5 primeiras cartas do deck embaralhado), o deck restante (35 cartas) preserva a mesma ordem relativa do embaralhamento — índice 0 continua sendo o topo (F01 Decisão 6). | F01 Decisão 6 | confirmada |
| 15 | `EstadoDuelo` ganha o campo **`seed: number`** (obrigatório, não opcional), por alteração dos arquivos criados em F01/F02 — confirma a previsão de F01 (Decisão 7) e satisfaz o requisito explícito de F05 ("inclui o seed de embaralhamento para permitir continuação determinística"). | F01 Decisão 7; PRD §6 F05 Capabilities | confirmada |
| 16 | `packages/engine` passa a depender também de `packages/rules` (antes só de `packages/shared`, desde F02) — permitido pela direção `shared ← data ← rules ← engine` de `arquitetura.md` §2. Primeira vez que essa aresta é exercida no monorepo. | `arquitetura.md` §2 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duelo/tipos.ts` | shared | alterado | Acrescenta `seed: number` a `EstadoDuelo` |
| `packages/shared/src/duelo/schema.ts` | shared | alterado | Acrescenta `seed: z.number().int().min(0).max(0xFFFFFFFF)` a `EstadoDueloSchema` |
| `packages/shared/src/duelo/constantes.ts` | shared | alterado | Acrescenta `TAMANHO_MAO_INICIAL = 5` |
| `packages/shared/src/duelo/inicializacao.ts` | shared | novo | `EntradaInicializacaoJogador`, `EntradaInicializacao` — a forma pré-embaralhamento, já validada |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta `seed`, `TAMANHO_MAO_INICIAL` e os tipos de `inicializacao.ts` |
| `packages/engine/src/prng/mulberry32.ts` | engine | novo | `criarMulberry32(seed)` — gerador determinístico puro |
| `packages/engine/src/prng/embaralhar.ts` | engine | novo | `embaralhar<T>(lista, proximoAleatorio)` — Fisher-Yates puro |
| `packages/engine/src/prng/index.ts` | engine | novo | Export público do subsistema `prng` |
| `packages/engine/src/inicializacao/montar-entrada-inicializacao.ts` | engine | novo | `montarEntradaInicializacao`, `GeradorSeed` — valida (reusa `packages/rules`), resolve cartas e seed |
| `packages/engine/src/inicializacao/init-duel.ts` | engine | novo | `initDuel` — puro, total, monta o `EstadoDuelo` inicial |
| `packages/engine/src/inicializacao/index.ts` | engine | novo | Export público do subsistema `inicializacao` |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta `prng` e `inicializacao` ao lado de `eventos` (F02) |
| `packages/engine/README.md` | engine | alterado | Acrescenta os dois novos subsistemas ao propósito e aos exports públicos |
| `packages/engine/src/prng/mulberry32.test.ts` | engine | novo | Unitários do gerador |
| `packages/engine/src/prng/embaralhar.test.ts` | engine | novo | Unitários + propriedades do embaralhamento |
| `packages/engine/src/inicializacao/montar-entrada-inicializacao.test.ts` | engine | novo | Unitários table-driven das três mensagens de recusa e do caminho feliz |
| `packages/engine/src/inicializacao/init-duel.test.ts` | engine | novo | Unitários da montagem do estado inicial |
| `packages/engine/src/inicializacao/init-duel.propriedades.test.ts` | engine | novo | Propriedade fast-check: mesmo seed + mesmas composições ⇒ mesmo `EstadoDuelo`, 1000 execuções |
| `.dependency-cruiser.cjs` | raiz | alterado | Acrescenta regra: `packages/engine` agora pode importar `packages/rules` (além de `shared`); continua proibido importar `web`, `server`, `ai`, React, DOM, `fetch`, Supabase |

**Verificação da direção de dependências:** `packages/engine/src/inicializacao/**` importa de
`packages/shared` (tipos, `ConsultaCatalogo`, `ComposicaoDeck`, `Result`, `DomainError`) e de
`packages/rules/src/deck/**` (`montarDeckPronto`) — ambos permitidos por
`shared ← data ← rules ← engine` (`arquitetura.md` §2). `packages/engine/src/prng/**` não importa
nada além de `packages/shared` (tipos genéricos, se necessário). Nenhum arquivo desta feature
importa `data`, `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase — reforça o pilar 1 já
estabelecido por F02.

## 3. Design Técnico

### Estruturas de dados

**`EntradaInicializacaoJogador`** (`packages/shared`) — um lado já validado e resolvido, pronto
para embaralhar: `{ cartas: readonly Carta[] }`, sempre com **exatamente 40** entradas, na ordem
determinística de `numero` crescente que `expandirComposicao` (`free-duel`/F02) produz — ainda
**não embaralhado**.

**`EntradaInicializacao`** — `{ jogadores: Record<JogadorId, EntradaInicializacaoJogador>; seed:
number }`. É o único parâmetro de `initDuel`; por construção (produzida só por
`montarEntradaInicializacao`), já está validada — `initDuel` não tem onde falhar.

**`GeradorSeed`** (`packages/engine`) — `() => number`, porta injetada análoga a `RandomSource`
(guidelines §12.2). Produz um seed em `[0, 0xFFFFFFFF]` quando o chamador não fornece um.

**`EstadoDuelo`** (alteração de F01/F02) — acrescenta `seed: number`, o valor estático usado para
o embaralhamento e o sorteio desta inicialização (Decisão 5: sem cursor).

### Fluxo

**Validação e resolução** (`montarEntradaInicializacao`, impura só na injeção de dependências —
puro no corpo):

1. **Validar P1.** Chama `montarDeckPronto({ composicao: entrada.composicaoP1, catalogo })`
   (reusado de `packages/rules`, `free-duel`/F02). Erro ⇒ mapear a primeira violação da lista
   ordenada para uma das 3 mensagens do PRD (Decisões 10, 11) e devolver `Result` de erro
   **imediatamente**, sem checar P2 (Decisão 9).
2. **Validar P2.** Mesma chamada para `entrada.composicaoP2`. Erro ⇒ mesma tradução de mensagem.
3. **Resolver cartas.** Para cada `numero` em `DeckPronto.numeros` de cada lado (40 entradas,
   `numero` crescente), resolve a `Carta` completa via `catalogo` — garantido presente, pois
   `montarDeckPronto` já confirmou existência no passo 1/2.
4. **Resolver o seed.** `entrada.seed ?? deps.geradorSeed()`.
5. **Montar `EntradaInicializacao`** com as duas listas de 40 `Carta` (ainda não embaralhadas) e o
   seed resolvido.

**Construção do estado** (`initDuel`, puro e total):

6. **Semear o PRNG.** `criarMulberry32(entrada.seed)` produz um gerador de números pseudoaleatórios
   determinístico.
7. **Embaralhar P1.** `embaralhar(entrada.jogadores.P1.cartas, prng)` — Fisher-Yates, consumindo a
   sequência do gerador (Decisão 7: P1 primeiro).
8. **Embaralhar P2.** Mesma operação sobre `entrada.jogadores.P2.cartas`, continuando o **mesmo**
   fluxo do gerador (não reiniciado).
9. **Distribuir a mão.** Para cada lado: as 5 primeiras cartas do array embaralhado viram `mao`; as
   35 restantes, na mesma ordem, viram `deck` (índice 0 = topo, Decisão 14).
10. **Sortear o primeiro jogador.** Consome o **próximo** valor do mesmo gerador (depois dos dois
    embaralhamentos, Decisão 7): `< 0.5` ⇒ `P1`; senão `P2`.
11. **Montar `EstadoDuelo`.** `lp: LP_INICIAL` (8000, F01) para os dois; campo com as 10 zonas de
    cada lado todas `{ ocupada: false }`; `terrenoAtivo: null`; `jogadorAtivo` do sorteio; `turno:
    1`; `fase: 'compra'` (Decisão 12); `seed: entrada.seed`; `pendente` ausente.

### Regras de negócio

- **Autoridade de validação** (Decisão 1) — `initDuel` nunca é alcançável com um deck estrutural-
  mente inválido; a única porta de entrada é `montarEntradaInicializacao`, que sempre valida antes.
- **Determinismo total** (Fase 0.3; critério de aceite 3) — mesmo `seed` + mesmas duas composições
  de deck ⇒ mesmo `EstadoDuelo` (mesma mão, mesmo deck restante, mesmo `jogadorAtivo`), em qualquer
  número de execuções.
- **Sem tributo/sacrifício e sem restrição de que cartas podem compor o deck** além de 40/≤3/
  existência — F03 não julga estratégia, só estrutura (Fase 0.3).
- **Campo sempre vazio ao iniciar** — nenhuma zona ocupada, nenhum terreno ativo, mesmo que algum
  efeito hipotético de "campo inicial" existisse em outro módulo (não existe neste PRD).
- **`lp` nunca é outro valor além de `LP_INICIAL`** nesta feature — qualquer variação de LP inicial
  seria uma regra de outro módulo (ex.: modo de jogo especial), fora de escopo.

### Eventos

`initDuel` **não emite nenhum evento**. A inicialização acontece antes do primeiro `onTurnStart`
(que é responsabilidade de F06, ao assumir o controle do turno 1) — não há "jogador de origem" para
um evento de inicialização, e o PRD não lista nenhum evento de gatilho para F03.

### Determinismo e pureza

- `criarMulberry32`, `embaralhar` e `initDuel` são **puros e totais**: nenhum I/O, nenhuma UI,
  nenhum `Math.random()`, nenhuma leitura de relógio.
- `embaralhar` não muta a lista recebida — devolve uma nova (guidelines §1.2).
- `montarEntradaInicializacao` isola a **única** fonte de não-determinismo desta feature
  (`geradorSeed`, chamado apenas quando `seed` está ausente) atrás de uma porta injetada — o
  núcleo (`initDuel`) permanece 100% determinístico e testável com seed fixo.
- `EstadoDuelo` continua 100% serializável em JSON após esta feature — `seed` é `number`, nenhuma
  estrutura nova quebra a Decisão 15 de F01.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`EntradaInicializacaoJogador`**, **`EntradaInicializacao`** — sem schema zod próprio: são
  produzidas inteiramente a partir de peças já validadas (composição validada por
  `montarDeckPronto`, cartas resolvidas pelo catálogo) e nunca cruzam uma fronteira externa não
  confiável dentro desta feature.
- **`EstadoDueloSchema`** (alteração) — acrescenta `seed: z.number().int().min(0).max(0xFFFFFFFF)`.
- **`TAMANHO_MAO_INICIAL`** — constante `5`, ao lado de `LP_INICIAL` (F01) em
  `packages/shared/src/duelo/constantes.ts`.
- **Reusados sem redefinir:** `ComposicaoDeck`, `ViolacaoDeck`, `VeredictoDeck` (`packages/shared`,
  `free-duel`/F02); `Carta`, `NumeroCarta`, `Result`, `DomainError` (`banco-de-cartas`/F01);
  `ConsultaCatalogo` (`build-deck`/F01, `free-duel`/F01); `LP_INICIAL`, `JogadorId`, `Fase` (F01).

### Funções públicas

```
// packages/engine/src/prng — núcleo puro

criarMulberry32(seed: number): () => number
  // pós: cada chamada devolve o próximo float em [0, 1); determinístico pelo seed
  // mesma sequência de chamadas com o mesmo seed produz sempre a mesma sequência de saída

embaralhar<T>(lista: readonly T[], proximoAleatorio: () => number): readonly T[]
  // pós: permutação de lista, mesmo comprimento, sem mutar a entrada
  //      Fisher-Yates consumindo proximoAleatorio() uma vez por posição a decidir
```

```
// packages/engine/src/inicializacao — núcleo puro (exceto a injeção de geradorSeed)

type GeradorSeed = () => number

montarEntradaInicializacao(
  entrada: { composicaoP1: ComposicaoDeck; composicaoP2: ComposicaoDeck; seed?: number },
  deps: { catalogo: ConsultaCatalogo; geradorSeed: GeradorSeed },
): Result<EntradaInicializacao, DomainError>
  // pós: ok ⇒ duas listas de 40 Carta (não embaralhadas) + seed resolvido
  //      erro ⇒ code 'deck_tamanho_invalido' | 'deck_copias_excedidas' | 'deck_carta_desconhecida'
  //             details { jogador: 'P1' | 'P2', violacoes }
  //             mensagem já no texto exato do PRD (Decisões 9, 10, 11)

initDuel(entrada: EntradaInicializacao): EstadoDuelo
  // pré: entrada só é produzida por montarEntradaInicializacao (sempre válida)
  // pós: EstadoDuelo com mao (5) + deck (35) por lado, lp 8000, campo vazio, terrenoAtivo null,
  //      jogadorAtivo sorteado, turno 1, fase 'compra', seed preservado, pendente ausente
  // total: nunca lança, nunca devolve Result — não há caminho de falha dado entrada pré-validada
  // determinístico: mesma entrada ⇒ mesmo EstadoDuelo, sempre
```

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01/F02. `initDuel` é uma função de biblioteca; quem a
expõe por rede (Online Duel, cross-PRD) ainda não existe.

### Contratos externos (cross-PRD)

**A ser fornecido por `banco-de-cartas`/F03:** `ConsultaCatalogo`, já declarado por múltiplas specs
anteriores. F03 usa tanto a checagem de existência (via `montarDeckPronto`) quanto a resolução
completa de `Carta` a partir de `numero`.

**Contrato oferecido por F03 (intra-PRD e a `free-duel`/F03, cross-PRD):**
`montarEntradaInicializacao` + `initDuel` juntas são o par que qualquer módulo de duelo (Free Duel,
e futuramente Online Duel) chama para começar uma partida, entregando `ComposicaoDeck` por lado —
o mesmo formato que `free-duel`/F02 (jogador) e `free-duel`/F01 (NPC) já produzem.

### Exemplo — recusa por tamanho

```json
{
  "ok": false,
  "error": {
    "code": "deck_tamanho_invalido",
    "message": "Deck inválido: são necessárias exatamente 40 cartas.",
    "details": { "jogador": "P1", "violacoes": [{ "tipo": "tamanho_insuficiente", "total": 38, "faltam": 2 }] }
  }
}
```

### Exemplo — recusa por carta desconhecida

```json
{
  "ok": false,
  "error": {
    "code": "deck_carta_desconhecida",
    "message": "Deck inválido: carta desconhecida (numero 998).",
    "details": { "jogador": "P2", "violacoes": [{ "tipo": "carta_inexistente", "numero": "998" }] }
  }
}
```

### Exemplo — `EstadoDuelo` recém-inicializado (mão abreviada por legibilidade)

```json
{
  "jogadores": {
    "P1": {
      "lp": 8000,
      "mao": ["...5 cartas..."],
      "deck": ["...35 cartas..."],
      "campo": { "monstros": [{ "ocupada": false }], "magias": [{ "ocupada": false }] }
    },
    "P2": { "lp": 8000, "mao": ["...5 cartas..."], "deck": ["...35 cartas..."], "campo": "..." }
  },
  "terrenoAtivo": null,
  "jogadorAtivo": "P2",
  "turno": 1,
  "fase": "compra",
  "seed": 1753617600
}
```

## 5. Modelo de Dados

Não aplicável. F03, como F01 e F02, não cria tabela Postgres nem estrutura IndexedDB/fila offline —
`initDuel` é uma função pura que devolve estado em memória. Persistir esse estado inicial (ex.:
criar uma sessão de duelo no servidor online) pertence a outros módulos.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| Deck com total ≠ 40 (de qualquer lado) | `montarDeckPronto` → violação de tamanho | `montarEntradaInicializacao` recusa, `code: 'deck_tamanho_invalido'` | "Deck inválido: são necessárias exatamente 40 cartas." (PRD F03 Error Handling) |
| Deck com 4+ cópias de uma carta | `montarDeckPronto` → `copias_excedidas` | Recusa, `code: 'deck_copias_excedidas'` | "Deck inválido: máximo de 3 cópias por carta." |
| Carta do deck não encontrada no catálogo | `montarDeckPronto` → `carta_inexistente` | Recusa, `code: 'deck_carta_desconhecida'`, `numero` interpolado | "Deck inválido: carta desconhecida (numero X)." |
| Deck de P1 inválido | Passo 1 do fluxo | Recusa **antes** de validar P2 (Decisão 9) | Uma das três mensagens acima, `details.jogador: 'P1'` |
| `seed` ausente na entrada | `montarEntradaInicializacao` | Gera um seed via `geradorSeed` injetado e o registra em `EntradaInicializacao.seed` — **não é erro** | — (comportamento silencioso, PRD F03 Error Handling: "gera e registra um seed") |
| `catalogo` não resolve um `numero` que `montarDeckPronto` já havia confirmado existente (inconsistência entre chamadas) | Defesa em profundidade — não deveria ocorrer dado que ambos leem o mesmo catálogo na mesma chamada | Erro de programação — lançado como exceção não recuperável, não modelado como `Result` (violaria a pré-condição documentada de `initDuel`) | — |

## 7. Estratégia de Testes

### Unitários (Vitest)

`criarMulberry32`:
- `criarMulberry32 produz a mesma sequência para o mesmo seed`
- `criarMulberry32 produz sequências diferentes para seeds diferentes`
- `criarMulberry32 sempre devolve valores no intervalo [0, 1)`

`embaralhar`:
- `embaralhar não muta a lista recebida`
- `embaralhar preserva o comprimento e o multiconjunto de elementos`
- `embaralhar produz a mesma permutação para o mesmo gerador semeado`

`montarEntradaInicializacao` — table-driven:
- `montarEntradaInicializacao recusa deck de P1 com menos de 40 cartas`
- `montarEntradaInicializacao recusa deck de P1 com mais de 40 cartas`
- `montarEntradaInicializacao recusa deck com 4 cópias da mesma carta`
- `montarEntradaInicializacao recusa deck com carta cujo numero não existe no catálogo, citando o numero`
- `montarEntradaInicializacao recusa deck de P1 inválido sem checar P2`
- `montarEntradaInicializacao resolve as 40 cartas completas de cada lado a partir dos numero`
- `montarEntradaInicializacao usa o seed fornecido quando presente`
- `montarEntradaInicializacao chama geradorSeed quando seed está ausente`

`initDuel`:
- `initDuel distribui exatamente 5 cartas de mão e 35 de deck por jogador`
- `initDuel inicia os dois jogadores com 8000 de LP`
- `initDuel inicia o campo com as 10 zonas de cada lado vazias`
- `initDuel inicia sem terreno ativo`
- `initDuel inicia no turno 1, fase compra`
- `initDuel inicia sem pendente`
- `initDuel preserva o seed recebido no estado resultante`
- `initDuel embaralha P1 antes de P2 e sorteia o primeiro jogador por último` (verifica a ordem via um `geradorSeed`/PRNG duplo instrumentado)

### Property-based (fast-check)

- **Determinismo ponta a ponta (critério de aceite 3):** para qualquer seed e qualquer par de
  composições de deck válidas (geradas por arbitrário respeitando 40/≤3/existência num catálogo
  sintético), `initDuel(montarEntradaInicializacao(...).value)` produz **exatamente o mesmo**
  `EstadoDuelo` em 1.000 execuções repetidas com os mesmos argumentos (round-trip estrutural,
  `assert.deepEqual`). Esta é a propriedade central do PRD (Métricas de Sucesso, Seção 4).
- **Conservação de cartas:** para qualquer entrada válida, o multiconjunto de `numero` em
  `mao ∪ deck` de cada jogador, após `initDuel`, é idêntico ao multiconjunto de `numero` da
  composição original daquele jogador — nenhuma carta é perdida, duplicada ou trocada de lado.
- **Independência de seeds diferentes:** para duas execuções com o mesmo par de decks e seeds
  diferentes, a probabilidade de `jogadorAtivo` e da ordem da mão serem idênticas nas duas tende a
  ser baixa (checagem estatística leve, não uma prova formal — sinaliza regressão grosseira, ex.:
  seed sendo ignorado).

### Integração

- `packages/engine/src/inicializacao/init-duel.integration.test.ts` — exercita
  `montarEntradaInicializacao` + `initDuel` com o catálogo real (via `banco-de-cartas`, quando
  existir) e composições de deck reais de 40 cartas, confirmando que o caminho feliz produz um
  `EstadoDuelo` que passa em `EstadoDueloSchema.safeParse`.

### Análise estática

- `packages/engine/**` importa apenas `packages/shared` e `packages/rules` — nunca `data`, `ai`,
  `web`, `server`, React, DOM, `fetch` ou Supabase (regra estendida em `.dependency-cruiser.cjs`).
- `packages/rules/src/deck/**` (reusado) continua sem importar `packages/engine` — a direção é de
  mão única, `engine` depende de `rules`, nunca o contrário.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F03) | Teste |
|---|---|
| Recusa iniciar com deck ≠ 40 cartas ou com 4+ cópias de uma carta, exibindo a mensagem específica | `montarEntradaInicializacao recusa deck de P1 com menos de 40 cartas` + `...com mais de 40 cartas` + `...com 4 cópias da mesma carta` + `...com carta cujo numero não existe` |
| Cada jogador começa com 8000 LP e 5 cartas na mão; o campo inicia vazio e sem terreno | `initDuel distribui exatamente 5 cartas de mão e 35 de deck por jogador` + `initDuel inicia os dois jogadores com 8000 de LP` + `initDuel inicia o campo com as 10 zonas de cada lado vazias` + `initDuel inicia sem terreno ativo` |
| O primeiro jogador é sorteado a partir do seed; com o mesmo seed, o sorteio e o embaralhamento se repetem identicamente | Propriedade `Determinismo ponta a ponta` (1.000 execuções) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Uma partida completa roda de ponta a ponta: F03 inicializa → F06 conduz turnos..." | `init-duel.integration.test.ts` estabelece o ponto de partida (`EstadoDuelo` válido, turno 1, fase compra) que F06 vai assumir quando existir; a cadeia completa só é testável quando F06–F12 existirem |
| Cross-Feature: determinismo (F05 testará o round-trip de serialização sobre um estado produzido aqui) | O `EstadoDuelo` de `initDuel` é a entrada de teste natural para o round-trip de F05 — citado como premissa, testado de fato lá |
| Cross-PRD: "Build Deck: um deck de 40 cartas exportado pelo Build Deck é aceito por F03 ao iniciar o duelo" | `montarEntradaInicializacao resolve as 40 cartas completas de cada lado a partir dos numero` — exercita exatamente o formato (`ComposicaoDeck`) que `free-duel`/F02 (e, por trás dela, o Build Deck) produz |
