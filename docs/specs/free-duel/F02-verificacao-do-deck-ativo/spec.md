# Verificação do Deck Ativo

> PRD: `docs/prds/free-duel.md` — F02
> Pacote-alvo: `packages/rules` (+ `packages/shared`, `apps/web`)

## 1. Contexto e Escopo

Esta feature é a **porta de entrada do duelo**: entre a escolha do oponente (F01) e a montagem da
partida (F03), ela carrega o **deck ativo único** do jogador — persistido por `BuildDeck/F07`
(cross-PRD) na tabela `active_decks` (`docs/arquitetura.md` §5.1) —, **revalida** os invariantes de
deck da Fase 0 e só então libera o início. Quando o deck está ausente ou inválido, ela **bloqueia**
o fluxo e oferece navegação direta ao Build Deck em vez de deixar o `initDuel` do motor recusar a
inicialização e produzir um beco sem saída (PRD §2, "Deck inválido ou ausente pode travar a
partida"; PRD §6 F03 Error Handling).

O PRD descreve F02 como uma **verificação de defesa**: o Build Deck já se compromete a nunca
persistir deck inválido (`build-deck` §6 F07 Capabilities), então esta feature existe para o caso
em que essa garantia falha — dado corrompido, `cards jsonb` malformado, cache local obsoleto,
carta que saiu do catálogo entre versões do bundle. Por isso ela não repete a *experiência* de
edição: ela **lê e valida**, nada mais. Duas consequências de desenho seguem disso: a regra de
validade tem de ser a **mesma** regra que o Build Deck aplica (uma fonte única, não uma segunda
implementação divergente), e a feature não escreve absolutamente nada — nem no servidor, nem no
cache, nem na fila de mutações offline.

A alocação segue as três camadas já estabelecidas pelos precedentes deste projeto: os **contratos**
(tipos e schemas zod) em `packages/shared`; a **regra pura de validade de deck** em
`packages/rules`, cujo charter foi ampliado para cobrir regra de montagem pela spec de
`build-deck` F01 (Decisão 1); e o **I/O, o fluxo de bloqueio e o redirecionamento** confinados a
`apps/web` (`arquitetura.md` §7, "UI **não** contém regra"; ADR-004). A feature pertence à
**Fase 3** do roadmap (`arquitetura.md` §9 — "Free Duel vs IA") e consome contratos das Fases 0 e 2
que ainda não existem em código, declarados na Seção 4 como contratos externos.

### Incluído

- Contratos canônicos do deck em `packages/shared`: a composição `numero → quantidade` (a mesma
  forma de `active_decks.cards jsonb`), o vocabulário de violações, a procedência do carregamento
  e os schemas zod de fronteira (linha do Postgres e snapshot do cache local)
- **Fonte única da regra de validade de deck** em `packages/rules`: exatamente **40 cartas**,
  **no máximo 3 cópias** por `numero` e **apenas cartas existentes** no catálogo — reusando as
  constantes já declaradas por `free-duel` F01 em `packages/shared/src/deck/constantes.ts`
  (Decisão 2), com produção de **violações estruturadas** em vez de um booleano
- Expansão determinística da composição em uma **lista de 40 `numero`**, o formato que F03 entrega
  ao `initDuel` do motor (`arquitetura.md` §3.1) e o mesmo formato que F01 usa para o deck do NPC
- Carregamento do deck ativo com **procedência explícita** servidor → cache local
  (`arquitetura.md` §5.4), sem nenhuma escrita
- Distinção entre os três desfechos que o PRD trata de forma diferente: **liberado**,
  **bloqueado** (deck ausente ou inválido — mensagens exatas do PRD + botão "Ir para Build Deck")
  e **indisponível** (falha de carregamento sem cache)
- Rota e tela de preparação da partida em `apps/web`, destino da confirmação de F01
  (spec de `free-duel` F01, Decisão 17), com estado de carregamento, bloqueio e nova tentativa
- Flag `temDeckValido` e o **deck pronto** entregues a F03 (PRD F02 Provides)
- Validação zod na fronteira do `cards jsonb` e do snapshot de cache, tratando ambos como entrada
  não confiável (guidelines §18.3)

### Fronteiras

Delimitadas pela Seção 7 do PRD (Fora de Escopo) e pelos blocos Consumes/Provides vizinhos:

- **Construir, editar e salvar deck** → **Build Deck (cross-PRD)**, features F05/F06/F07. F02
  recebe o deck ativo já persistido; não oferece edição, não grava e não corrige deck inválido.
  — PRD §7 ("Montagem e origem do deck")
- **Selecionar entre múltiplos decks** → **não existe nesta versão**. Há **1 deck ativo** por
  jogador (`active_decks` com `player_id` como PK; `build-deck` §6 F05 "slot único"). F02 não
  apresenta seletor. — PRD §6 F02 Capabilities e §7
- **Validar "apenas cartas possuídas em quantidade suficiente"** → **`build-deck`/F06**. Essa é
  regra do módulo de montagem, não invariante da Fase 0, e exige a coleção. F02 valida os três
  invariantes da Fase 0 e não lê `collections`. — `build-deck` §6 F06 Capabilities
- **Inicializar o duelo, sortear quem começa, distribuir mãos e conduzir a IA** → **F03** e
  **`MotorDuelo/F03`** (cross-PRD). F02 **provê** o deck válido e a flag; quem chama `initDuel` é
  F03. — PRD §6 F03 Capabilities
- **Validar o deck do NPC** → **F01**, em `packages/data/src/roster/validar-duelista.ts`. F02
  valida apenas o deck do jogador. — spec de `free-duel` F01, Fronteiras
- **Nota, estrelas, drop e carteira** → **F05/F06/F07**. F02 não toca economia, `wallets`,
  `collections` nem `reward_ledger`. — PRD §6 F05–F07
- **Retomar duelo interrompido** → fora desta versão. F02 sempre revalida a partir do dado
  persistido; não há sessão de preparação retomável. — PRD §7
- **Renderização fina, animação e som** → camada de apresentação. Esta spec descreve estrutura de
  tela, estados e mensagens, não estética. — PRD §7

### Contratos externos assumidos

Nenhum dos módulos abaixo está implementado. A spec os trata como contrato externo e o `plan.md`
os lista como pré-requisito.

- **`BuildDeck/F07` (cross-PRD) — deck ativo persistido.** A dependência única de F02 na tabela do
  PRD §8. Espera-se a tabela `active_decks` de `arquitetura.md` §5.1 (`player_id` PK, `cards jsonb`
  no formato `numero → quantidade`, `updated_at`) com RLS por jogador, e o snapshot equivalente no
  cache local de `arquitetura.md` §5.4, gravado por F07 ao salvar. F02 é **somente leitura** sobre
  ambos. Detalhe em §4. *A ser fornecido por Build Deck.*
- **`banco-de-cartas` / `packages/data` (cross-PRD) — existência de carta por `numero`.** A porta
  `ConsultaCatalogo` (`(numero) => Carta | undefined`) sobre as 722 cartas canônicas, já declarada
  pelas specs de `build-deck` F01 e `free-duel` F01. F02 usa **apenas existência**; não lê `atk`,
  `classe` nem qualquer outro campo. *A ser fornecido por `banco-de-cartas`/F03.*
- **Auth/Supabase (cross-PRD) — sessão do jogador.** Fornece o identificador do jogador; no banco,
  `player_id` corresponde a `auth.uid()`. Sessão ausente ou expirada é caso de borda tratado
  (Seção 6). *A ser fornecido por Auth/Cadastro.*
- **`MotorDuelo/F03` (cross-PRD) — consumidor a jusante.** `initDuel(input)`
  (`arquitetura.md` §3.1) recebe os dois decks + seed. F02 se compromete apenas com o **formato**
  do deck do jogador entregue a F03; **não chama o motor**. *Consumido por F03.*
- **`free-duel`/F01 — oponente escolhido.** F01 navega para a rota de preparação levando o
  `duelistaId` (spec de F01, Decisão 17). F02 usa o identificador apenas para compor o handoff a
  F03; não revalida o roster.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A **regra de validade de deck vive em `packages/rules/src/deck/`**, não em `apps/web` nem em `packages/shared`. `arquitetura.md` §2 define `shared` como "schemas e tipos, sem lógica", guidelines §3.2 define `rules` como "pure rule helpers", e a spec de `build-deck` F01 (Decisão 1) já ampliou o charter de `rules` para cobrir regra de montagem. O fluxo de bloqueio/redirect é interface e fica em `apps/web`. | `arquitetura.md` §2, §7; guidelines §3.2; ADR-004; precedente `build-deck` F01 (Decisão 1) | confirmada |
| 2 | **Anti-duplicação — constantes.** `TAMANHO_DECK_OBRIGATORIO = 40` e `MAX_COPIAS_POR_CARTA = 3` são **reusadas** de `packages/shared/src/deck/constantes.ts`, arquivo criado pela spec de `free-duel` F01 (Decisão 18). F02 **não** declara constante paralela e **não** usa os literais `40`/`3` fora desse arquivo. | precedente `free-duel` F01 (Decisão 18); `product.md`; Fase 0.3 | confirmada |
| 3 | **Anti-duplicação — validador.** F02 cria o validador canônico do **deck do jogador** em `packages/rules`. Ele não existe ainda: a spec de `build-deck` F01 entrega apenas `limiteCopias(quantidade) = min(quantidade, 3)` (teto **por carta**, derivado da posse) e o validador de deck inteiro é de `build-deck` F06, ainda sem spec. Portanto F02 **cria a fonte única** e a oferece a `build-deck` F06, que a estenderá com a regra própria daquele módulo ("apenas cartas possuídas em quantidade suficiente") em vez de reimplementar 40/≤3. Registrado como contrato oferecido em §4. | PRD `build-deck` §6 F06 Capabilities; precedente `build-deck` F01 §4; auto-aceite: aplicar a recomendação | **a confirmar** — convergir quando `build-deck` F06 ganhar spec |
| 4 | **Convergência com `free-duel` F01.** `validarDuelista`, em `packages/data`, valida o deck do **NPC** em forma de lista e **não pode importar `packages/rules`** (a direção `shared ← data ← rules` proíbe). A convergência possível é no nível das **constantes em `shared`** (Decisão 2) e da **semântica declarada idêntica**: o mesmo tamanho, o mesmo teto de cópias e a mesma exigência de existência no catálogo, testados pelas mesmas propriedades. Recomendação registrada: se uma terceira implementação surgir, promover o predicado estrutural para um refinamento zod em `packages/shared/src/deck/schema.ts`, único ponto alcançável por `data` e por `rules`. | `arquitetura.md` §2 (direção de dependências); precedente `free-duel` F01 (Decisões 1 e 18) | **a confirmar** — reavaliar em `build-deck` F06 |
| 5 | F02 valida **três** regras: soma das quantidades = 40, toda quantidade ≤ 3, e todo `numero` existe no catálogo. A terceira não é citada nas Capabilities de F02, mas é exigida indiretamente: `MotorDuelo/F03` recusa "carta desconhecida" (PRD §6 F03 Error Handling) e o critério Cross-PRD exige que o deck carregado por F02 seja "aceito por `MotorDuelo/F03`". Verificar só 40/≤3 deixaria passar o beco sem saída que F02 existe para evitar. | PRD §6 F03 Error Handling; PRD §9 Cross-PRD Integration; auto-aceite: "Especificação parcial no PRD" | confirmada |
| 6 | F02 **não escreve nada**: não grava em `active_decks`, não regrava o snapshot do cache após leitura bem-sucedida do servidor e **não cria entrada na fila de mutações** de `arquitetura.md` §5.4. É uma leitura; a fila serve a mutações (créditos/débitos, save de deck), que pertencem a F06/F07 e a `BuildDeck/F07`. Consequência aceita: manter o cache fresco é responsabilidade de `BuildDeck/F07`, que é quem o escreve. | PRD §6 F02 Capabilities ("não edita o deck — apenas lê e valida"); `arquitetura.md` §5.4 | confirmada |
| 7 | **Precedência quando cache e servidor divergem: o servidor vence.** O cache local é lido **apenas** no ramo de falha da leitura remota, nunca mesclado nem comparado. Motivo: `active_decks` é a fonte que `MotorDuelo/F03` e o Online Duel também vão ler (`build-deck` §6 F07 Capabilities, "fonte única entregue aos módulos de duelo"); duelar com um deck local mais novo que o servidor criaria divergência entre modos. Resolução de conflito entre dispositivos é de `BuildDeck/F07` (Full Scope). | PRD `build-deck` §6 F07; `arquitetura.md` §5.4; auto-aceite: aplicar o default recomendado | confirmada |
| 8 | **Leitura bem-sucedida sem linha em `active_decks` é "deck ausente", não falha.** Ausência é estado legítimo (jogador cujo cadastro ainda não semeou o deck, ou `BuildDeck/F02` em curso) e recebe a mensagem de bloqueio do PRD; falha de carregamento é outro desfecho, com outra mensagem. Simetria com a spec de `build-deck` F01 (Decisão 4), que separa coleção vazia de falha de leitura. | PRD §6 F02 Error Handling; precedente `build-deck` F01 (Decisão 4) | confirmada |
| 9 | O carregamento devolve uma **união discriminada por `origem`** (`'servidor' \| 'cache'`) com `atualizadoEm`, e não uma flag booleana — o consumidor não consegue ignorar a procedência. Mesmo desenho de `carregarColecao` na spec de `build-deck` F01 (Decisão 3). | precedente `build-deck` F01 (Decisão 3); `arquitetura.md` §5.4 | confirmada |
| 10 | O resultado da verificação é uma **união de três situações** (`liberado`, `bloqueado`, `indisponivel`), e não um `Result` de duas pontas. Os três desfechos do PRD têm mensagens e ações diferentes: bloqueio oferece "Ir para Build Deck"; indisponibilidade oferece "Tentar novamente". Um `Result<DeckPronto, DomainError>` obrigaria a UI a reclassificar códigos de erro para decidir qual botão mostrar. | PRD §6 F02 Error Handling e Experience; guidelines §7.2 (união discriminada para desfecho de domínio) | confirmada |
| 11 | **A mensagem exata do PRD para deck inválido é usada como título**, e a lista de violações concretas aparece como detalhe técnico abaixo dela ("Faltam 3 cartas", "Dark Magician: 4 cópias"), sem inventar novo texto de bloqueio. Isso inclui `carta_inexistente`, que também recai no bloqueio de deck inválido — todos os caminhos de invalidez levam ao mesmo destino (ajustar no Build Deck). | PRD §6 F02 Error Handling (mensagens exatas); precedente `build-deck` §6 F06 Experience ("lista curta de pendências") | confirmada |
| 12 | O **deck entregue a F03 é uma lista de exatamente 40 `numero` em ordem determinística** (`numero` crescente, uma entrada por cópia), acompanhada da composição original. Motivo: `initDuel` recebe decks + seed e o determinismo do motor depende de a entrada ser estável (pilar 2 de `arquitetura.md` §1); um objeto cuja ordem de chaves varia tornaria o embaralhamento irreprodutível. É também o mesmo formato que `free-duel` F01 provê para o deck do NPC, então F03 recebe os dois lados na mesma forma. | `arquitetura.md` §1 pilar 2, §3.1; precedente `free-duel` F01 §4 (`DeckNpc` como lista de 40) | confirmada |
| 13 | O `cards jsonb` e o snapshot do cache são tratados como **fronteira não confiável** e validados por zod antes de virar `ComposicaoDeck`. `jsonb` malformado não derruba a tela: vira bloqueio de deck inválido com registro estruturado. | guidelines §18.3, §8.1; `arquitetura.md` §0 ("zod na fronteira") | confirmada |
| 14 | Quantidade `0` ou negativa dentro do `cards jsonb` é **violação**, não entrada a ignorar silenciosamente. Ignorar mudaria o total e poderia transformar um deck corrompido em "válido de 40". | guidelines §8.3 ("não engolir erros"); Decisão 13 | confirmada |
| 15 | **Catálogo indisponível bloqueia a preparação** em vez de liberar o duelo sem verificar existência. Liberar violaria a métrica do PRD §4 ("0 partidas iniciadas com deck do jogador inválido/ausente"). Simetria com `free-duel` F01 (Decisão 12), que não exibe roster não validado. | PRD §4 Métricas; precedente `free-duel` F01 (Decisão 12); ADR-003 §6 | confirmada |
| 16 | F02 **não introduz store global de estado** (Zustand vs `useReducer`+context segue em aberto em `arquitetura.md` §7). A verificação é assíncrona e efêmera, exposta por um hook fino, como em `build-deck` F01 (Decisão 5) e `free-duel` F01 (Decisão 15). A decisão continua adiada para F03, que tem estado de runtime de duelo. | `arquitetura.md` §7 (decisão em aberto); precedentes `build-deck` F01 (Decisão 5) e `free-duel` F01 (Decisão 15) | **a confirmar** — reavaliar em F03 |
| 17 | A tela de preparação é **Client Component** sob a rota `app/free-duel/[duelistaId]/preparar`, herdada da Decisão 17 de `free-duel` F01: precisa funcionar offline lendo o snapshot de IndexedDB e o bundle cacheado pelo service worker. | ADR-004; `arquitetura.md` §7 (PWA); precedente `free-duel` F01 (Decisão 17) | confirmada |
| 18 | **Nenhuma tabela nova** e nenhuma migração. F02 lê `active_decks`, que pertence a `BuildDeck/F07`. A Seção 5 documenta o contrato de leitura esperado, incluindo a política de RLS de `SELECT`, mas a migração é de F07. | `arquitetura.md` §5.1; PRD §6 F02 Capabilities | confirmada |
| 19 | **Convenção de caminhos em `apps/web`:** adotada a forma sem `src/` (`apps/web/app/`, `apps/web/lib/`, `apps/web/components/`, `apps/web/hooks/`) de `free-duel` F01, por ser a feature irmã do mesmo módulo. A spec de `build-deck` F01 usou `apps/web/src/lib/`; a divergência é registrada para convergir na implementação do primeiro dos dois. | precedente `free-duel` F01 §2; auto-aceite: "Padrões conflitantes — escolher e documentar" | **a confirmar** — convergir com `build-deck` F01 |
| 20 | **Nenhuma tabela de dado externo pendente toca F02.** Não há guardião, terreno, fusão, drop, rating nem balanceamento aqui: os três limites que F02 aplica são invariantes da Fase 0 vindos de `product.md`, não valores tunáveis. Nada é inventado e nenhum fallback neutro é necessário. | `arquitetura.md` §10; PRD §7 e §9 | não se aplica |
| 21 | Não existe código de implementação no repositório: nem `packages/` nem `apps/`. A Camada 0 (arquitetura + ADRs + guidelines + specs precedentes) é a única fonte de padrões. O scaffolding do monorepo é pré-requisito herdado de `banco-de-cartas` F01 e `free-duel` F01, não recriado aqui. | estado do repositório; precedentes `banco-de-cartas` F01 (Decisão 14) e `free-duel` F01 (Decisão 20); auto-aceite: "Sem código ainda" | confirmada |
| 22 | Esta feature não tem divisão Core/Full Scope no PRD — a spec cobre o **escopo completo** de F02. | PRD §6 F02 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/deck/constantes.ts` | shared | **reusado** (criado por `free-duel` F01) | `TAMANHO_DECK_OBRIGATORIO`, `MAX_COPIAS_POR_CARTA` — nenhuma constante nova (Decisão 2) |
| `packages/shared/src/deck/tipos.ts` | shared | novo | `ComposicaoDeck`, `ViolacaoDeck`, `VeredictoDeck`, `DeckPronto`, `OrigemDeckAtivo`, `DeckAtivoCarregado`, `VerificacaoDeckAtivo`, `MotivoBloqueioDeck` |
| `packages/shared/src/deck/schema.ts` | shared | novo | `ComposicaoDeckSchema`, `LinhaDeckAtivoSchema`, `SnapshotDeckAtivoSchema` (zod de fronteira) |
| `packages/shared/src/deck/codigos-erro.ts` | shared | novo | `CODIGOS_ERRO_DECK` — conjunto fechado de códigos usados nos `DomainError` |
| `packages/shared/src/index.ts` | shared | alterado | Acrescenta os exports públicos do subsistema de deck |
| `packages/rules/src/deck/composicao.ts` | rules | novo | `totalCartas`, `expandirComposicao` — contagem e expansão determinística em lista |
| `packages/rules/src/deck/validar-deck.ts` | rules | novo | `validarComposicaoDeck` (estrutural) e `validarDeckParaDuelo` (estrutural + existência no catálogo) |
| `packages/rules/src/deck/montar-deck-pronto.ts` | rules | novo | `montarDeckPronto` — valida e devolve o `DeckPronto` consumido por F03 |
| `packages/rules/src/deck/index.ts` | rules | novo | Export público do subsistema de deck |
| `packages/rules/src/index.ts` | rules | alterado | Reexporta `deck/` ao lado de `colecao/` (criado por `build-deck` F01) |
| `packages/rules/src/deck/composicao.test.ts` | rules | novo | Unitários de contagem e expansão determinística |
| `packages/rules/src/deck/validar-deck.test.ts` | rules | novo | Unitários table-driven das três regras + propriedades fast-check |
| `packages/rules/src/deck/montar-deck-pronto.test.ts` | rules | novo | Unitários do contrato entregue a F03 |
| `apps/web/lib/free-duel/repositorio-deck-ativo.ts` | web | novo | Leitura de `active_decks` por `player_id` e validação zod da resposta |
| `apps/web/lib/free-duel/cache-deck-ativo.ts` | web | novo | Leitura (somente) do snapshot do deck ativo no IndexedDB |
| `apps/web/lib/free-duel/carregar-deck-ativo.ts` | web | novo | Orquestra servidor → cache, define `origem`, nunca escreve (Decisão 6) |
| `apps/web/lib/free-duel/verificar-deck-ativo.ts` | web | novo | Compõe carregamento + validação de `rules` e devolve `VerificacaoDeckAtivo` |
| `apps/web/lib/free-duel/mensagens-deck.ts` | web | novo | Mapa código de bloqueio → mensagem exata do PRD e rótulo das violações |
| `apps/web/hooks/use-verificacao-deck-ativo.ts` | web | novo | Hook fino: dispara a verificação e expõe carregando/liberado/bloqueado/indisponível |
| `apps/web/app/free-duel/[duelistaId]/preparar/page.tsx` | web | novo | Rota fina de preparação, destino da confirmação de F01 |
| `apps/web/app/free-duel/[duelistaId]/preparar/preparacao-duelo.tsx` | web | novo | Client Component: verifica, exibe estados e faz o handoff a F03 |
| `apps/web/components/free-duel/bloqueio-deck.tsx` | web | novo | Painel de bloqueio: título do PRD, violações e botão "Ir para Build Deck" |
| `apps/web/components/free-duel/falha-carregamento-deck.tsx` | web | novo | Painel de indisponibilidade com ação de nova tentativa |
| `apps/web/lib/free-duel/verificar-deck-ativo.test.ts` | web | novo | Unitários do portão: liberado, bloqueado, indisponível, cache, sessão |
| `apps/web/app/free-duel/[duelistaId]/preparar/preparacao-duelo.test.tsx` | web | novo | Unitários de tela: mensagens, botões, handoff, acessibilidade |
| `apps/web/tests/deck-ativo.integration.test.ts` | web | novo | Integração: leitura de `active_decks` com RLS, fallback de cache, `jsonb` malformado |
| `.dependency-cruiser.cjs` | raiz | alterado | Regras de fronteira do subsistema de deck (§7 Análise estática) |

**Verificação da direção de dependências:**

- `packages/shared` continua sem importar nenhum pacote do monorepo.
- `packages/rules/src/deck/**` importa **apenas** `packages/shared`. O catálogo entra pela porta
  injetada `ConsultaCatalogo` (mesma decisão da spec de `build-deck` F01, Decisão 12), então não há
  import de `packages/data` — os testes da regra rodam com um catálogo sintético.
- `apps/web` importa `shared`, `rules` e `data`. Nenhum import na direção contrária.
- Nenhum arquivo desta feature importa `packages/engine`, `packages/ai` ou `apps/server`. A direção
  `shared ← data ← rules` de `arquitetura.md` §2 é respeitada e `web` aparece só como consumidor.
- Esta feature **não toca `packages/engine`**: não há estado de duelo, PRNG nem ação de motor aqui
  (o seed e o `initDuel` são de F03, `arquitetura.md` §3.1). As garantias de determinismo do motor
  não se aplicam; a pureza exigida é a de `packages/rules`, verificada por análise estática.
- `packages/rules/src/deck/**` **não** importa React, DOM, `fetch`, Supabase, IndexedDB, `node:fs`
  nem `console`. `apps/web/lib/free-duel/**` é a **única** borda com Supabase e IndexedDB
  (guidelines §7.3, §19.2).
- **Nenhum arquivo de `apps/web` contém os literais `40` ou `3` como regra de deck, nem recalcula
  total ou teto de cópias**: tudo vem de `packages/rules` (ADR-004; `arquitetura.md` §7).

## 3. Design Técnico

### Estruturas de dados

**`ComposicaoDeck`** (`packages/shared`) — a forma canônica do deck do jogador, idêntica ao
conteúdo de `active_decks.cards jsonb` (`arquitetura.md` §5.1):
`Readonly<Record<NumeroCarta, number>>`, de `numero` para quantidade de cópias no deck. Chaves são
`numero` de 3 dígitos; valores são inteiros ≥ 1. É serializável em JSON sem perda, o que a torna
simultaneamente formato de transporte, de cache e de memória — diferente da coleção, que na spec
de `build-deck` F01 tem duas formas (`ReadonlyMap` e objeto), porque um deck tem no máximo 40
entradas e não há acesso por chave em laço quente.

**`ViolacaoDeck`** — união discriminada por `tipo`, o vocabulário completo de invalidez:

| `tipo` | Campos | Semântica |
|---|---|---|
| `tamanho_insuficiente` | `total`, `faltam` | Soma das quantidades < 40 |
| `tamanho_excedido` | `total`, `excedem` | Soma das quantidades > 40 |
| `copias_excedidas` | `numero`, `quantidade` | Quantidade de um `numero` > 3 |
| `quantidade_invalida` | `numero`, `quantidade` | Quantidade não é inteiro ≥ 1 (Decisão 14) |
| `carta_inexistente` | `numero` | `numero` que o catálogo não resolve (Decisão 5) |

**`VeredictoDeck`** — união discriminada por `valido`:

```
| { valido: true;  total: 40 }
| { valido: false; total: number; violacoes: readonly ViolacaoDeck[] }
```

`violacoes` é sempre **não-vazia** no ramo inválido e ordenada deterministicamente: primeiro a
violação de tamanho (no máximo uma), depois as de `numero` em ordem crescente de `numero`.

**`DeckPronto`** — o que F02 provê a F03 (PRD F02 Provides):

| Campo | Tipo | Semântica |
|---|---|---|
| `composicao` | `ComposicaoDeck` | A composição validada, como veio do armazenamento |
| `numeros` | `readonly NumeroCarta[]` | Exatamente 40 entradas, `numero` crescente, uma por cópia (Decisão 12) |
| `total` | `number` | Sempre 40 — redundante por construção, presente para leitura direta |

**`DeckAtivoCarregado`** — união discriminada por procedência (Decisão 9):

```
| { origem: 'servidor'; composicao: ComposicaoDeck; atualizadoEm: string }
| { origem: 'cache';    composicao: ComposicaoDeck; atualizadoEm: string }
```

`atualizadoEm` é ISO 8601. No ramo `'servidor'` vem de `active_decks.updated_at`; no ramo
`'cache'` é o carimbo gravado pelo último save de `BuildDeck/F07`, **não** o instante da leitura
local — é o que permite à tela dizer quão antigo é o deck em uso.

**`VerificacaoDeckAtivo`** — o resultado do portão, com os três desfechos do PRD (Decisão 10):

```
| { situacao: 'liberado';     temDeckValido: true;  deckPronto: DeckPronto; origem: OrigemDeckAtivo }
| { situacao: 'bloqueado';    temDeckValido: false; motivo: 'deck_ausente' | 'deck_invalido';
                              violacoes: readonly ViolacaoDeck[]; origem: OrigemDeckAtivo | null }
| { situacao: 'indisponivel'; temDeckValido: false;
                              motivo: 'carregamento_falhou' | 'sessao_ausente' | 'catalogo_indisponivel' }
```

`temDeckValido` é a flag que o PRD lista em Provides; é derivada de `situacao === 'liberado'` e
existe para que F03 não precise inspecionar a união. `violacoes` é vazia quando
`motivo === 'deck_ausente'`.

**`SnapshotDeckAtivo`** — o registro lido do IndexedDB:
`{ playerId, cards: ComposicaoDeck, atualizadoEm }`. O store pertence a `BuildDeck/F07`; F02 só o
lê (Decisão 6).

**`ConsultaCatalogo`** — porta injetada, `(numero: NumeroCarta) => Carta | undefined`, reusada
das specs de `build-deck` F01 e `free-duel` F01. **Não é redefinida aqui.**

### Fluxo

**Carregamento** (`carregarDeckAtivo`, em `apps/web` — borda de I/O):

1. **Resolver o jogador.** Obtém o identificador da sessão Supabase Auth (contrato externo). Sem
   sessão, devolve erro `sessao_ausente` sem tocar em rede ou cache.
2. **Ler do servidor.** Consulta `active_decks` filtrando por `player_id`. A RLS já restringe o
   resultado; o filtro explícito é defesa em profundidade.
3. **Validar a resposta** com `LinhaDeckAtivoSchema`. `cards` que não casa `ComposicaoDeckSchema`
   (não é objeto, chave fora de `^[0-9]{3}$`, valor não numérico) devolve erro
   `linha_deck_ativo_invalida` com registro estruturado, e o fluxo segue para o passo 6 — não para
   o fallback de cache: o servidor respondeu, o dado é que está corrompido.
4. **Zero linhas** ⇒ desfecho **deck ausente** (Decisão 8). Não é erro e não consulta o cache.
5. **Uma linha válida** ⇒ devolve com `origem: 'servidor'` e `atualizadoEm = updated_at`.
6. **Fallback.** Falha na etapa 2 (rede, timeout, 5xx, 401/403) ⇒ lê o snapshot do IndexedDB,
   valida com `SnapshotDeckAtivoSchema` e devolve com `origem: 'cache'`, preservando o
   `atualizadoEm` gravado. Este é o ramo que satisfaz "tenta o cache local" do PRD.
7. **Sem cache.** Falha na etapa 2 **e** ausência (ou corrupção) do snapshot ⇒ erro
   `deck_ativo_indisponivel`. **Nunca** um deck vazio: um deck vazio seria classificado como
   "ausente" e mostraria a mensagem errada ao jogador.

**Validação** (`validarDeckParaDuelo` + `montarDeckPronto`, em `packages/rules` — puro):

8. **Somar as quantidades.** Total ≠ 40 gera `tamanho_insuficiente` (com `faltam`) ou
   `tamanho_excedido` (com `excedem`). O número 40 vem de `TAMANHO_DECK_OBRIGATORIO` (Decisão 2).
9. **Checar cada quantidade.** Não-inteiro, ≤ 0 ou `NaN` gera `quantidade_invalida`; valor > 3
   gera `copias_excedidas`. O número 3 vem de `MAX_COPIAS_POR_CARTA`.
10. **Checar existência.** Cada `numero` é consultado na `ConsultaCatalogo`; ausência gera
    `carta_inexistente` citando o `numero` (Decisão 5).
11. **Acumular todas as violações** antes de devolver — a tela precisa listar tudo o que está
    errado de uma vez, não a primeira falha (PRD Experience de bloqueio; guidelines §7.2).
12. **Expandir.** Somente no veredito válido, `expandirComposicao` produz a lista de 40 `numero`
    em ordem crescente, repetindo cada `numero` conforme a quantidade (Decisão 12).

**Portão de preparação** (`verificarDeckAtivo`, em `apps/web`):

13. **Catálogo primeiro.** Catálogo indisponível ⇒ `indisponivel` com
    `motivo: 'catalogo_indisponivel'`, sem sequer carregar o deck (Decisão 15).
14. **Carregar.** `sessao_ausente` ⇒ `indisponivel`; `deck_ativo_indisponivel` ⇒ `indisponivel`;
    deck ausente ⇒ `bloqueado` com `motivo: 'deck_ausente'`; `linha_deck_ativo_invalida` ⇒
    `bloqueado` com `motivo: 'deck_invalido'` e uma violação sintética de dado corrompido.
15. **Validar.** Veredito inválido ⇒ `bloqueado` com `motivo: 'deck_invalido'` e as violações.
    Veredito válido ⇒ `liberado` com o `DeckPronto` e a `origem`.

**Tela de preparação** (`apps/web/app/free-duel/[duelistaId]/preparar`):

16. **Entrar.** O Client Component dispara a verificação e exibe estado de carregamento. O
    `duelistaId` vem do parâmetro de rota, entregue por F01 (Decisão 17 daquela spec).
17. **Liberado** ⇒ faz o handoff a F03 com `{ duelistaId, deckPronto }`, sem exibir tela
    intermediária além de um estado de transição — o PRD pede que a verificação seja silenciosa
    no caminho feliz ("carrega o deck ativo do jogador silenciosamente").
18. **Bloqueado** ⇒ exibe o painel de bloqueio com a **mensagem exata do PRD** conforme o motivo,
    a lista de violações como detalhe (Decisão 11) e o botão **"Ir para Build Deck"**.
19. **Indisponível** ⇒ exibe a mensagem exata do PRD para falha de carregamento e um botão de
    **nova tentativa** que reexecuta a verificação. O duelo **não** inicia.
20. **Revanche (F08).** F08 reexecuta este mesmo fluxo com o deck ativo mais recente; F02 não
    guarda resultado entre execuções e não tem cache de veredito. Cada entrada revalida.

### Regras de negócio

**Invariantes da Fase 0 reforçados** (de `product.md`; Fase 0.3 do skill):

- **Exatamente 40 cartas.** A soma das quantidades da composição deve ser exatamente
  `TAMANHO_DECK_OBRIGATORIO`. 39 e 41 bloqueiam. É o mesmo número que `MotorDuelo/F03` exige, então
  um deck que passa aqui não é recusado lá.
- **No máximo 3 cópias por `numero`.** A quarta cópia bloqueia, mesmo que o total seja 40.
- **Apenas cartas do catálogo.** Todo `numero` deve existir nas 722 cartas canônicas (Decisão 5).
- **Um único deck ativo.** `active_decks` tem `player_id` como PK; F02 não oferece seleção entre
  decks e não conhece o conceito de "outro deck" (PRD §6 F02 Capabilities).
- **Nenhum campo novo no schema da carta.** O deck referencia carta apenas por `numero`; não
  redeclara, não estende e não sobrescreve nada de `Carta`.

**Regras próprias desta feature:**

- **Rascunho não salvo nunca chega ao duelo.** F02 lê exclusivamente `active_decks` e o snapshot do
  **deck ativo**, jamais o store de rascunho de `build-deck` F05. É o mecanismo que satisfaz o
  critério Cross-PRD "nenhum rascunho não salvo chega ao duelo".
- **Composição vazia (`{}`)** é tratada como **deck ausente**, não como deck de 0 cartas: para o
  jogador, os dois casos significam "monte seu deck".
- **Quantidade fora do domínio** (0, negativa, fracionária, `NaN`) bloqueia (Decisão 14).
- **Todas as violações são acumuladas**, nunca só a primeira.
- **Nenhuma escrita.** Nenhuma função desta feature grava em Postgres, IndexedDB ou fila
  (Decisão 6).
- **Ordem determinística.** Violações e expansão têm ordem definida, independentes da ordem de
  iteração das chaves do `jsonb`.

**Não-regras (explicitamente ausentes):** F02 não valida posse (é de `build-deck` F06), não valida
o deck do NPC (é de F01), não calcula nota, não concede recompensa, não cria sessão de duelo, não
edita nem repara deck, e não persiste nada.

### Eventos

Esta feature não emite nem consome eventos do motor ou do Effect System — não há
`onSummon`/`onAttackDeclared` aqui. O único "evento" externo é a **navegação**: a entrada vem da
confirmação de F01 por parâmetro de rota, e a saída é o handoff do `DeckPronto` a F03 (situação
`liberado`) ou a navegação ao Build Deck (situação `bloqueado`).

### Determinismo e pureza

Não se aplica a `packages/engine` — F02 não produz estado de duelo, não usa PRNG e não participa de
replay; o seed é de F03 (`arquitetura.md` §3.1). As garantias relevantes são de **pureza de
`packages/rules`** e de **estabilidade da entrada do motor**:

- Nenhuma função de `packages/rules/src/deck/` executa I/O, lê relógio, lê ambiente ou sorteia.
  Recebe composição e catálogo como argumentos e devolve estruturas em memória.
- `validarDeckParaDuelo` é **total**: para qualquer `unknown` já parseado, devolve veredito e nunca
  lança.
- `expandirComposicao` é **determinística**: a mesma composição produz a mesma lista de 40, na
  mesma ordem, independentemente da ordem de inserção das chaves. É o que garante que o
  embaralhamento semeado de `initDuel` seja reprodutível (pilar 2 de `arquitetura.md` §1).
- As estruturas devolvidas são imutáveis (`Readonly`, guidelines §6.3); nenhuma função muta a
  composição recebida.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`ComposicaoDeckSchema`** — `record` de `NumeroCartaSchema` (reusado de
  `packages/shared/src/carta/schema.ts`, `banco-de-cartas` F01) para número. O schema valida
  **forma**: chave no formato de 3 dígitos, valor numérico finito. Não valida 40/≤3/existência —
  isso produz violações estruturadas e é responsabilidade do validador em `packages/rules`
  (guidelines §18.3: validar na fronteira sem esconder dependência de dado externo no schema).
- **`LinhaDeckAtivoSchema`** — forma de uma linha de `active_decks`: `player_id` uuid, `cards` via
  `ComposicaoDeckSchema`, `updated_at` ISO 8601. Nunca vaza de
  `apps/web/lib/free-duel/repositorio-deck-ativo.ts`.
- **`SnapshotDeckAtivoSchema`** — forma do registro no IndexedDB: `playerId` string não-vazia,
  `cards` via `ComposicaoDeckSchema`, `atualizadoEm` ISO 8601. Trata o armazenamento local como
  fronteira não confiável.
- **`ViolacaoDeckSchema`**, **`VeredictoDeckSchema`** — formas serializáveis do veredito, para
  registro estruturado e para testes de contrato.
- **`CODIGOS_ERRO_DECK`** — conjunto fechado: `deck_ativo_ausente`, `deck_ativo_invalido`,
  `deck_ativo_indisponivel`, `linha_deck_ativo_invalida`, `snapshot_deck_ativo_invalido`.
- **Reusados sem redefinir:** `Carta`, `NumeroCarta`, `NumeroCartaSchema`, `Result`, `DomainError`
  (`banco-de-cartas` F01); `ConsultaCatalogo` (`build-deck` F01 / `free-duel` F01);
  `TAMANHO_DECK_OBRIGATORIO`, `MAX_COPIAS_POR_CARTA` (`free-duel` F01); `sessao_ausente` e
  `catalogo_indisponivel` como códigos de erro (`build-deck` F01).

### Funções públicas

```
// packages/rules/src/deck — núcleo puro, sem I/O

totalCartas(composicao: ComposicaoDeck): number
  // pós: soma das quantidades; 0 para composição vazia

expandirComposicao(composicao: ComposicaoDeck): readonly NumeroCarta[]
  // pré: composição já aprovada por validarComposicaoDeck
  // pós: |saída| === totalCartas(composicao); numero crescente; qty repetições de cada numero
  //      determinística: independe da ordem de inserção das chaves

validarComposicaoDeck(composicao: ComposicaoDeck): VeredictoDeck
  // pós: valido sse totalCartas === TAMANHO_DECK_OBRIGATORIO e toda quantidade é
  //      inteiro em [1, MAX_COPIAS_POR_CARTA]
  //      inválido ⇒ violacoes não-vazio, ordenado (tamanho primeiro, depois numero crescente)
  // total: nunca lança

validarDeckParaDuelo(entrada: { composicao: ComposicaoDeck; catalogo: ConsultaCatalogo }): VeredictoDeck
  // pós: violações de validarComposicaoDeck + carta_inexistente para todo numero não resolvido
  //      acumula todas as violações; não interrompe na primeira

montarDeckPronto(entrada: { composicao: ComposicaoDeck; catalogo: ConsultaCatalogo })
  : Result<DeckPronto, DomainError>
  // pós: ok ⇒ DeckPronto com numeros de tamanho 40 em ordem determinística
  //      erro ⇒ code 'deck_ativo_invalido', details.violacoes com o veredito completo
```

```
// apps/web/lib/free-duel — bordas de I/O

lerDeckAtivoDoServidor(playerId: string): Promise<Result<LinhaDeckAtivo | null, DomainError>>
  // pós: null ⇒ jogador sem linha em active_decks (deck ausente, não erro)
  //      erro ⇒ linha_deck_ativo_invalida (cards corrompido) ou falha de leitura

lerSnapshotDeckAtivo(playerId: string): Promise<SnapshotDeckAtivo | undefined>
  // somente leitura; snapshot corrompido é tratado como ausente e registrado

carregarDeckAtivo(deps: DependenciasDeckAtivo)
  : Promise<Result<DeckAtivoCarregado | 'ausente', DomainError>>
  // deps: { playerId, repositorio, cache }
  // pós: origem 'servidor' | 'cache' | 'ausente'; nunca escreve (Decisão 6)
  //      erro ⇒ sessao_ausente | deck_ativo_indisponivel | linha_deck_ativo_invalida

verificarDeckAtivo(deps: DependenciasVerificacao): Promise<VerificacaoDeckAtivo>
  // deps: { playerId, repositorio, cache, catalogo }
  // total: nunca lança e nunca devolve Result — os três desfechos são a união (Decisão 10)
```

```
// apps/web/hooks — adaptador React fino, sem regra

useVerificacaoDeckAtivo(): EstadoPreparacao
  // EstadoPreparacao = { situacao: 'carregando' }
  //                  | { situacao: 'resolvida'; verificacao: VerificacaoDeckAtivo }
  // expõe também 'tentarNovamente' para o ramo indisponível
```

### Endpoints / RPC / mensagens de rede

F02 **não introduz RPC**. A leitura é um `SELECT` sobre `active_decks` via PostgREST, autorizado
pela RLS de `BuildDeck/F07`. Não há escrita, portanto nenhuma função `SECURITY DEFINER` e nenhuma
mutação de economia.

Leitura — `GET /rest/v1/active_decks?player_id=eq.<uuid>&select=player_id,cards,updated_at`

```json
[
  {
    "player_id": "6f1c…",
    "cards": { "001": 3, "045": 2, "333": 1, "681": 3 },
    "updated_at": "2026-07-27T12:00:00.000Z"
  }
]
```

Jogador sem deck ativo — resposta bem-sucedida com zero linhas, tratada como **ausente**
(Decisão 8):

```json
[]
```

Snapshot no IndexedDB, escrito por `BuildDeck/F07` e apenas lido aqui:

```json
{
  "playerId": "6f1c…",
  "cards": { "001": 3, "045": 2, "333": 1, "681": 3 },
  "atualizadoEm": "2026-07-27T12:00:00.000Z"
}
```

Veredito inválido, com violações acumuladas e ordenadas:

```json
{
  "valido": false,
  "total": 38,
  "violacoes": [
    { "tipo": "tamanho_insuficiente", "total": 38, "faltam": 2 },
    { "tipo": "copias_excedidas", "numero": "001", "quantidade": 4 },
    { "tipo": "carta_inexistente", "numero": "998" }
  ]
}
```

`DeckPronto` entregue a F03 (lista abreviada por legibilidade — na prática tem 40 entradas):

```json
{
  "composicao": { "001": 3, "045": 2 },
  "numeros": ["001", "001", "001", "045", "045"],
  "total": 40
}
```

`VerificacaoDeckAtivo` nos três desfechos:

```json
{
  "situacao": "liberado",
  "temDeckValido": true,
  "origem": "servidor",
  "deckPronto": { "composicao": { "001": 3 }, "numeros": ["001", "001", "001"], "total": 40 }
}
```

```json
{
  "situacao": "bloqueado",
  "temDeckValido": false,
  "motivo": "deck_ausente",
  "violacoes": [],
  "origem": "servidor"
}
```

```json
{
  "situacao": "indisponivel",
  "temDeckValido": false,
  "motivo": "carregamento_falhou"
}
```

### Contratos externos (cross-PRD)

**A ser fornecido por Build Deck (`BuildDeck/F07`):**

- **Tabela `active_decks`** — `player_id uuid` PK e FK para `auth.users(id)`, `cards jsonb` no
  formato `numero → quantidade`, `updated_at timestamptz`, com RLS habilitada e política de
  `SELECT` para `player_id = auth.uid()` (`arquitetura.md` §5.1). F02 depende de **um único
  registro por jogador** e de o `jsonb` estar nesse formato; qualquer outro formato é tratado como
  dado corrompido (Seção 6). A **migração é de F07**, não desta feature (Decisão 18).
- **Snapshot do deck ativo no cache local** — store IndexedDB com o registro
  `{ playerId, cards, atualizadoEm }`, gravado por F07 a cada save bem-sucedido
  (`arquitetura.md` §5.4; `build-deck` §6 F07 Capabilities "grava primeiro no cache local"). F02 é
  somente leitura sobre ele (Decisão 6).
- **Garantia de que apenas deck válido é persistido** (`build-deck` §6 F07 Capabilities). F02 é a
  verificação de defesa **contra a falha dessa garantia**, não sua substituta.
- **Store de rascunho** — existe (`build-deck` §6 F05) e F02 **nunca** o lê. Declarado aqui para
  tornar o critério "nenhum rascunho não salvo chega ao duelo" verificável por análise estática.

**A ser fornecido por `banco-de-cartas` (`packages/data`, F01/F03):**

- **`ConsultaCatalogo`** — `(numero: NumeroCarta) => Carta | undefined` sobre as 722 cartas
  canônicas, satisfeita pelo `getByNumero` de `banco-de-cartas` F03. F02 usa **apenas existência**.
  Enquanto F03 não existir, os testes de `packages/rules` a satisfazem com um catálogo sintético
  (guidelines §12.1).
- **`Carta`, `NumeroCarta`, `NumeroCartaSchema`** — schema da Fase 0 (12 campos), já em
  `packages/shared/src/carta/`. F02 reusa sem estender.

**A ser fornecido por Auth/Cadastro:**

- **Sessão Supabase Auth autenticada**, da qual se obtém o identificador do jogador; `player_id`
  corresponde a `auth.uid()`. Sessão ausente ou expirada é caso de borda (Seção 6).

**Contratos oferecidos por F02:**

- **A F03 (intra-PRD):** `{ temDeckValido: true, deckPronto: { composicao, numeros, total } }`,
  com `numeros` no mesmo formato de lista de 40 que `free-duel` F01 provê para o deck do NPC —
  F03 recebe os dois lados na mesma forma e os entrega a `initDuel` com o seed. F02 não chama o
  motor.
- **A F08 (intra-PRD):** `verificarDeckAtivo` é reexecutável e sem estado, o que satisfaz
  "revanche reexecuta a verificação do deck com o deck ativo mais recente".
- **A `build-deck` F06 (cross-PRD, Decisão 3):** `validarComposicaoDeck` e `validarDeckParaDuelo`
  são a **fonte única** dos invariantes 40/≤3/existência. F06 deve compor essas funções e
  acrescentar sua própria regra ("apenas cartas possuídas em quantidade suficiente", usando
  `limiteCopias` e `quantidadePossuida` de `build-deck` F01), em vez de reimplementar os limites.

## 5. Modelo de Dados

### Postgres / Supabase

**Nenhuma tabela nova, nenhuma coluna nova, nenhuma migração e nenhuma escrita** (Decisão 18). A
seção **não é omitida** porque F02 depende criticamente da forma de uma tabela existente, e essa
dependência precisa estar contratada: `active_decks` pertence a `BuildDeck/F07` e é o dado que
esta feature lê.

Contrato de leitura esperado (`arquitetura.md` §5.1), a ser criado pela migração de `BuildDeck/F07`:

| Tabela | Coluna | Tipo | Constraints / Índices |
|--------|--------|------|------------------------|
| `active_decks` | `player_id` | `uuid` | PK, `NOT NULL`, FK → `auth.users(id)` `ON DELETE CASCADE` |
| `active_decks` | `cards` | `jsonb` | `NOT NULL` — mapa `numero → quantidade` |
| `active_decks` | `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

- **`player_id` como PK** é o que materializa o invariante "1 único deck ativo": o banco impede
  fisicamente um segundo deck por jogador, então a ausência de seletor de deck em F02 não é uma
  omissão de UI e sim uma consequência do modelo.
- **Nenhum índice adicional é necessário** para F02: a consulta é por PK.
- **F02 não pressupõe constraint de conteúdo no `jsonb`.** Ainda que F07 acrescente `CHECK`s, o
  `cards` é validado por zod na leitura (Decisão 13) — o `jsonb` é fronteira, não garantia.

**RLS:** habilitada por `BuildDeck/F07`, com política de `SELECT` para `player_id = auth.uid()`.
F02 depende dela para isolamento por jogador e **não cria política nenhuma**. Não há política de
escrita a considerar: F02 não escreve.

**Migração:** nenhuma. Se `active_decks` não existir no ambiente, F02 degrada para o desfecho
`indisponivel` (falha de leitura) e não cria a tabela — criar tabela de outra feature quebraria a
propriedade de cada migração pertencer à feature que possui a tabela, adotada pela spec de
`build-deck` F01.

**Atomicidade e idempotência:** não se aplicam. F02 não escreve, não toca economia
(`wallets`, `reward_ledger`, `collections`) e não precisa de chave de idempotência
(`arquitetura.md` §5.2).

### Cache local / fila offline

F02 usa **um** store, em modo **somente leitura**, alinhado a `arquitetura.md` §5.4:

| Store | Chave | Campos | Papel de F02 |
|---|---|---|---|
| `deckAtivo` (de `BuildDeck/F07`) | `playerId` | `cards`, `atualizadoEm` | **Somente leitura**, apenas no ramo de fallback. Validado por `SnapshotDeckAtivoSchema` antes do uso |

- **F02 não grava o snapshot** após leitura bem-sucedida do servidor (Decisão 6). Consequência
  aceita e documentada: a frescura do cache é responsabilidade de `BuildDeck/F07`, que é quem
  escreve; F02 nunca introduz uma segunda escritora do mesmo registro.
- **F02 não participa da fila de mutações** com `idempotencyKey`: não há mutação. A fila de
  `arquitetura.md` §5.4 serve a créditos/débitos e ao save do deck, que são de F06/F07 e de
  `BuildDeck/F07`.
- **Semântica offline:** offline, o passo 2 falha e o fluxo cai no cache; o jogador pode duelar
  com o deck ativo salvo localmente. Sem snapshot, a preparação fica `indisponivel` — nenhum duelo
  inicia sem deck verificado (métrica do PRD §4).
- **Store de rascunho de `build-deck` F05 nunca é lido** (Seção 3, Regras de negócio).

### Arquivos de dados versionados

Nenhum. F02 **consome** o catálogo versionado de `banco-de-cartas` (F09/F10) através da porta
`ConsultaCatalogo`, mas não produz, versiona nem assina artefato de dado. Não há tabela auxiliar de
balanceamento envolvida (Decisão 20).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Nenhuma linha em `active_decks` (leitura bem-sucedida, zero linhas) | `lerDeckAtivoDoServidor` ⇒ `null` | `bloqueado` / `deck_ausente`. Não consulta cache. Botão "Ir para Build Deck" | `Você ainda não tem um deck pronto. Monte seu deck no Build Deck.` |
| `cards` com composição vazia (`{}`) | `totalCartas === 0` | Tratado como **ausente**, não como deck de 0 cartas | `Você ainda não tem um deck pronto. Monte seu deck no Build Deck.` |
| Deck com total ≠ 40 (39, 41, 80…) | `validarComposicaoDeck` ⇒ `tamanho_insuficiente` / `tamanho_excedido` | `bloqueado` / `deck_invalido`, violações listadas como detalhe (Decisão 11) | `Seu deck está inválido (precisa de 40 cartas, máx. 3 cópias). Ajuste no Build Deck.` |
| Deck com 4+ cópias do mesmo `numero` | `validarComposicaoDeck` ⇒ `copias_excedidas` | Idem acima; a violação nomeia o `numero` | mesma mensagem de deck inválido |
| Quantidade 0, negativa, fracionária ou `NaN` no `cards` | `validarComposicaoDeck` ⇒ `quantidade_invalida` (Decisão 14) | Idem acima; registra `warn` com o `numero` | mesma mensagem de deck inválido |
| `numero` do deck que não existe no catálogo de 722 | `validarDeckParaDuelo` ⇒ `carta_inexistente` | Idem acima (Decisão 5). Evita a recusa posterior do motor por "carta desconhecida" | mesma mensagem de deck inválido |
| `cards jsonb` malformado (não é objeto, chave fora de `^[0-9]{3}$`, valor não numérico) | `LinhaDeckAtivoSchema` ⇒ `linha_deck_ativo_invalida` | `bloqueado` / `deck_invalido` com violação sintética de dado corrompido; registra `error` com `playerId`. **Não** cai no cache: o servidor respondeu (Decisão 13) | mesma mensagem de deck inválido |
| Falha de leitura no servidor (rede, timeout, 5xx) **com** snapshot no cache | `catch` no repositório | Devolve `origem: 'cache'` e segue para a validação normalmente — o PRD manda "tentar o cache local" | nenhuma se o deck do cache for válido; se inválido, a mensagem de deck inválido |
| Falha de leitura no servidor **sem** snapshot | `carregarDeckAtivo` ⇒ `deck_ativo_indisponivel` | `indisponivel` / `carregamento_falhou`. Duelo **não** inicia. Botão de nova tentativa | `Não foi possível carregar seu deck agora. Tente novamente.` |
| Sessão expirada ou sem autorização (401/403) ao ler | Resposta do Supabase | Mesmo fallback de cache; se houver snapshot, a preparação segue offline. Sem snapshot, `indisponivel` e sinaliza reautenticação | `Faça login novamente para sincronizar seu deck.` (com snapshot) / `Não foi possível carregar seu deck agora. Tente novamente.` (sem) |
| Sem sessão autenticada ao entrar na preparação | Guarda em `carregarDeckAtivo` ⇒ `sessao_ausente` | `indisponivel` / `sessao_ausente`, sem tocar em rede ou cache | `Faça login para duelar.` |
| Snapshot de cache corrompido ou de formato antigo | `SnapshotDeckAtivoSchema` ⇒ `snapshot_deck_ativo_invalido` | Tratado como cache ausente; registra `warn`. Com o servidor também falho, vira `indisponivel` | `Não foi possível carregar seu deck agora. Tente novamente.` |
| IndexedDB indisponível (modo privativo, cota, permissão) | `try/catch` no cache | Segue apenas com o servidor. Falha de rede posterior vira `indisponivel`. Nunca derruba a tela | nenhuma, salvo quando resultar em `indisponivel` |
| Catálogo de cartas indisponível | Guarda antes de carregar (Decisão 15) | `indisponivel` / `catalogo_indisponivel`. **Nunca** libera duelo sem verificar existência | `Não foi possível carregar o banco de cartas. Tente novamente.` |
| Cache obsoleto em relação ao servidor (deck editado em outro dispositivo) | Não detectado por F02 — por desenho | O servidor **vence** quando alcançável; o cache só é usado se o servidor falhar (Decisão 7). Conflito entre dispositivos é de `BuildDeck/F07` | nenhuma; a tela informa `atualizadoEm` no ramo de cache |
| Deck alterado entre a verificação e o handoff a F03 | Não detectado por F02 | `MotorDuelo/F03` é a última guarda e recusa deck inválido (PRD §6 F03 Error Handling); F02 não trava a linha nem cria versão otimista | tratado por F03 |
| Revanche (F08) após o jogador editar o deck | Reexecução completa de `verificarDeckAtivo` | Sem cache de veredito: revalida do zero e pode passar a bloquear onde antes liberava | conforme o novo desfecho |
| `active_decks` inexistente no ambiente (migração de F07 não aplicada) | Erro de leitura do PostgREST | `indisponivel` / `carregamento_falhou`; registra `error`. F02 não cria a tabela | `Não foi possível carregar seu deck agora. Tente novamente.` |
| Nova tentativa acionada repetidamente | Guarda no hook | Requisições concorrentes são descartadas; a última resolução vence. Sem escrita, não há risco de estado parcial | nenhuma |
| `duelistaId` da rota ausente ou desconhecido | Guarda na rota | Retorna à seleção de oponente (F01); a verificação do deck não é executada sem oponente | `Escolha um oponente para continuar.` |

Nenhum descarte é silencioso: toda violação e todo dado rejeitado é **registrado** (guidelines
§8.3). O núcleo puro de `packages/rules` **retorna** as violações; quem **loga** é a borda em
`apps/web`, em log estruturado com `playerId` e `codigo`, sem dado sensível (guidelines §23.1–23.3).

## 7. Estratégia de Testes

### Unitários (Vitest)

`totalCartas` e `expandirComposicao`:

- `totalCartas devolve zero para composicao vazia`
- `totalCartas soma as quantidades de todas as entradas`
- `expandirComposicao devolve quarenta numeros para composicao valida`
- `expandirComposicao repete o numero conforme a quantidade declarada`
- `expandirComposicao ordena os numeros de forma crescente`
- `expandirComposicao produz a mesma lista para composicoes com ordem de chaves diferente`

`validarComposicaoDeck` — table-driven (guidelines §11.2):

- `validarComposicaoDeck aceita deck com total exatamente quarenta`
- `validarComposicaoDeck rejeita deck de trinta e nove com codigo tamanho_insuficiente`
- `validarComposicaoDeck reporta quantas cartas faltam para quarenta`
- `validarComposicaoDeck rejeita deck de quarenta e uma com codigo tamanho_excedido`
- `validarComposicaoDeck aceita tres copias do mesmo numero`
- `validarComposicaoDeck rejeita quatro copias do mesmo numero com codigo copias_excedidas`
- `validarComposicaoDeck rejeita quatro copias mesmo quando o total e quarenta`
- `validarComposicaoDeck rejeita quantidade zero com codigo quantidade_invalida`
- `validarComposicaoDeck rejeita quantidade negativa com codigo quantidade_invalida`
- `validarComposicaoDeck rejeita quantidade fracionaria com codigo quantidade_invalida`
- `validarComposicaoDeck rejeita composicao vazia`
- `validarComposicaoDeck acumula violacao de tamanho e de copias na mesma resposta`
- `validarComposicaoDeck ordena a violacao de tamanho antes das violacoes por numero`
- `validarComposicaoDeck nunca devolve violacoes vazias no ramo invalido`

`validarDeckParaDuelo` (com catálogo sintético injetado):

- `validarDeckParaDuelo aceita deck de quarenta cartas existentes no catalogo`
- `validarDeckParaDuelo rejeita numero ausente do catalogo com codigo carta_inexistente`
- `validarDeckParaDuelo cita o numero inexistente na violacao`
- `validarDeckParaDuelo acumula carta_inexistente junto com violacao de tamanho`
- `validarDeckParaDuelo nao consulta nenhum campo da carta alem da existencia`

`montarDeckPronto`:

- `montarDeckPronto devolve deckPronto com quarenta numeros para deck valido`
- `montarDeckPronto preserva a composicao original no deckPronto`
- `montarDeckPronto falha com deck_ativo_invalido e anexa as violacoes nos details`

`carregarDeckAtivo` (com repositório e cache falsos, guidelines §12.1):

- `carregarDeckAtivo devolve origem servidor quando a leitura remota tem sucesso`
- `carregarDeckAtivo devolve ausente quando o servidor nao tem linha para o jogador`
- `carregarDeckAtivo devolve origem cache quando a leitura remota falha e ha snapshot`
- `carregarDeckAtivo preserva o atualizadoEm do snapshot no ramo de cache`
- `carregarDeckAtivo falha com deck_ativo_indisponivel quando nao ha servidor nem cache`
- `carregarDeckAtivo falha com sessao_ausente quando nao ha jogador autenticado`
- `carregarDeckAtivo falha com linha_deck_ativo_invalida quando o cards esta malformado`
- `carregarDeckAtivo nao consulta o cache quando o servidor responde com cards malformado`
- `carregarDeckAtivo trata snapshot corrompido como cache ausente`
- `carregarDeckAtivo nao grava no cache apos leitura remota bem-sucedida`
- `carregarDeckAtivo nao enfileira nenhuma mutacao offline`
- `carregarDeckAtivo nao le o store de rascunho do build deck`

`verificarDeckAtivo`:

- `verificarDeckAtivo libera com temDeckValido verdadeiro para deck ativo valido`
- `verificarDeckAtivo bloqueia com motivo deck_ausente quando nao ha deck salvo`
- `verificarDeckAtivo bloqueia com motivo deck_ausente quando a composicao esta vazia`
- `verificarDeckAtivo bloqueia com motivo deck_invalido quando o total nao e quarenta`
- `verificarDeckAtivo bloqueia com motivo deck_invalido quando ha quatro copias`
- `verificarDeckAtivo bloqueia com motivo deck_invalido quando ha carta inexistente`
- `verificarDeckAtivo devolve indisponivel com motivo carregamento_falhou sem servidor e sem cache`
- `verificarDeckAtivo devolve indisponivel com motivo sessao_ausente sem sessao`
- `verificarDeckAtivo devolve indisponivel com motivo catalogo_indisponivel antes de carregar o deck`
- `verificarDeckAtivo libera deck valido vindo do cache com origem cache`
- `verificarDeckAtivo bloqueia deck invalido vindo do cache`
- `verificarDeckAtivo expoe temDeckValido falso em todo desfecho que nao libera`
- `verificarDeckAtivo nunca lanca para qualquer combinacao de falhas das dependencias`

Tela (`preparacao-duelo`):

- `preparacao de duelo exibe a mensagem exata de deck ausente e o botao ir para build deck`
- `preparacao de duelo exibe a mensagem exata de deck invalido e o botao ir para build deck`
- `preparacao de duelo lista as violacoes concretas abaixo da mensagem de deck invalido`
- `preparacao de duelo exibe a mensagem exata de falha ao carregar com botao de nova tentativa`
- `preparacao de duelo nao inicia o duelo em nenhum desfecho bloqueado`
- `preparacao de duelo nao inicia o duelo no desfecho indisponivel`
- `preparacao de duelo faz o handoff do deckPronto e do duelistaId quando libera`
- `preparacao de duelo nao apresenta seletor de deck`
- `preparacao de duelo nao oferece edicao do deck`
- `preparacao de duelo reexecuta a verificacao ao acionar nova tentativa`
- `preparacao de duelo retorna a selecao de oponente quando o duelistaId esta ausente`
- `preparacao de duelo permite acionar o bloqueio e a nova tentativa por teclado`
- `preparacao de duelo renderiza sem scroll horizontal de 320px a 1920px`

### Property-based (fast-check)

Propriedades genuínas da regra de validade, 1.000 execuções cada:

- **Bicondicional do validador estrutural (a propriedade central):** para qualquer composição
  gerada, `validarComposicaoDeck` devolve `valido: true` **se e somente se** a soma das quantidades
  é exatamente 40 **e** toda quantidade é inteiro em `[1, 3]`. Prova o invariante da Fase 0 sem
  enumerar casos e é a garantia de que o portão não aceita nem rejeita nada além do especificado.
- **Solidez do deck válido:** para todo multiset de 40 `numero` sorteados de um catálogo sintético
  com no máximo 3 repetições por `numero`, `validarDeckParaDuelo` **sempre** aprova. É o espelho
  exato da propriedade de solidez da spec de `free-duel` F01 para o deck do NPC (Decisão 4).
- **Completude do tamanho:** para todo total ≠ 40 (0 a 120), o veredito contém exatamente uma
  violação de tamanho, e é `tamanho_insuficiente` quando o total é menor e `tamanho_excedido`
  quando é maior.
- **Completude das cópias:** toda composição com alguma quantidade > 3 produz `copias_excedidas`
  para **todos** os `numero` violadores, e para nenhum outro.
- **Completude da existência:** toda composição com pelo menos um `numero` fora do catálogo produz
  `carta_inexistente` exatamente para os `numero` ausentes.
- **Conservação da expansão:** para toda composição válida,
  `expandirComposicao` devolve 40 entradas e a contagem por `numero` na lista reproduz exatamente
  a composição — nenhuma cópia é perdida nem duplicada.
- **Determinismo da expansão:** para qualquer permutação da ordem de inserção das chaves,
  `expandirComposicao` devolve a mesma lista, na mesma ordem. É o que sustenta a
  reprodutibilidade do embaralhamento semeado de `initDuel` (pilar 2 de `arquitetura.md` §1).
- **Round-trip composição ↔ lista:** recompor a composição a partir de `expandirComposicao`
  devolve a composição original, para toda composição válida. Autoriza `numeros` e `composicao` a
  coexistirem em `DeckPronto` sem risco de divergirem.
- **Totalidade e pureza:** para qualquer composição arbitrária, `validarDeckParaDuelo` nunca lança
  e duas chamadas consecutivas produzem resultados profundamente iguais, incluindo a ordem das
  violações.
- **Idempotência do portão:** duas execuções consecutivas de `verificarDeckAtivo` com as mesmas
  dependências falsas produzem o mesmo desfecho — o que sustenta a revanche de F08.

### Integração

`apps/web/tests/deck-ativo.integration.test.ts`, contra uma instância Supabase local com a
migração de `BuildDeck/F07` aplicada e contra o catálogo real de 722 cartas:

- `leitura de active_decks devolve o deck do jogador autenticado`
- `RLS impede o jogador A de ler o deck ativo do jogador B`
- `player_id como chave primaria impede um segundo deck ativo para o mesmo jogador`
- `remover o usuario em auth.users remove sua linha de active_decks em cascata`
- `verificarDeckAtivo contra o banco real libera um deck de quarenta cartas reais do catalogo`
- `verificarDeckAtivo contra o banco real bloqueia deck com numero fora das 722 cartas`
- `verificarDeckAtivo contra o banco real bloqueia quando o cards jsonb esta malformado`
- `verificarDeckAtivo usa o snapshot de IndexedDB quando o servidor esta inacessivel`
- `verificarDeckAtivo devolve indisponivel quando servidor e IndexedDB estao inacessiveis`
- `verificarDeckAtivo nao altera nenhuma linha de active_decks nem nenhum registro de IndexedDB`
- `verificarDeckAtivo devolve indisponivel quando active_decks nao existe no ambiente`

### Análise estática

- `packages/rules/src/deck/**` não importa React, DOM, `fetch`, Supabase, IndexedDB, `node:fs`,
  `node:process` nem `console` — a regra de deck é pura e testável sem navegador nem banco
  (guidelines §3.3; Decisão 1).
- `packages/rules` importa apenas `packages/shared`; nenhum import de `engine`, `ai`, `web` ou
  `server` (`arquitetura.md` §2).
- `packages/shared` continua sem importar nenhum pacote do monorepo.
- **Nenhum arquivo de `apps/web` referencia os literais `40` ou `3` como regra de deck** nem
  reimplementa contagem, teto de cópias ou verificação de existência: a UI só consome
  `packages/rules` (ADR-004; `arquitetura.md` §7 "UI não contém regra").
- **Nenhum arquivo desta feature declara constante própria de tamanho de deck ou de limite de
  cópias** — ambas vêm de `packages/shared/src/deck/constantes.ts` (Decisão 2), verificado por
  regra de lint sobre o diretório de deck.
- **Nenhum arquivo desta feature escreve** em Supabase, em IndexedDB ou na fila de mutações
  offline (Decisão 6), e nenhum importa o store de rascunho de `build-deck` F05.
- Nenhum arquivo desta feature importa `packages/engine` ou `packages/ai` — a inicialização do
  duelo e a IA são de F03.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1, incluindo
  `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F02) | Teste |
|---|---|
| O Free Duel carrega o deck ativo do jogador (`BuildDeck/F07`) sem exigir seleção manual | `carregarDeckAtivo devolve origem servidor quando a leitura remota tem sucesso` + `verificarDeckAtivo libera com temDeckValido verdadeiro para deck ativo valido` + `preparacao de duelo nao apresenta seletor de deck` + `leitura de active_decks devolve o deck do jogador autenticado` |
| Deck ausente ou inválido (≠ 40 cartas / 4+ cópias) bloqueia o início e oferece ir ao Build Deck, com a mensagem específica | `verificarDeckAtivo bloqueia com motivo deck_ausente quando nao ha deck salvo` + `verificarDeckAtivo bloqueia com motivo deck_invalido quando o total nao e quarenta` + `verificarDeckAtivo bloqueia com motivo deck_invalido quando ha quatro copias` + `preparacao de duelo exibe a mensagem exata de deck ausente e o botao ir para build deck` + `preparacao de duelo exibe a mensagem exata de deck invalido e o botao ir para build deck` + `preparacao de duelo nao inicia o duelo em nenhum desfecho bloqueado` + a propriedade bicondicional do validador |
| Falha ao carregar o deck tenta o cache local e, se indisponível, reporta erro sem iniciar o duelo | `carregarDeckAtivo devolve origem cache quando a leitura remota falha e ha snapshot` + `verificarDeckAtivo libera deck valido vindo do cache com origem cache` + `carregarDeckAtivo falha com deck_ativo_indisponivel quando nao ha servidor nem cache` + `preparacao de duelo exibe a mensagem exata de falha ao carregar com botao de nova tentativa` + `preparacao de duelo nao inicia o duelo no desfecho indisponivel` + `verificarDeckAtivo usa o snapshot de IndexedDB quando o servidor esta inacessivel` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: fluxo completo de vitória — F01 escolhe oponente → **F02 valida deck** → F03 conduz o duelo, sem estado inconsistente | `preparacao de duelo faz o handoff do deckPronto e do duelistaId quando libera` + `preparacao de duelo retorna a selecao de oponente quando o duelistaId esta ausente` + teste de contrato verificando que `DeckPronto.numeros` tem 40 entradas na mesma forma de lista que `free-duel` F01 provê para o deck do NPC, consumível por F03 sem transformação |
| Cross-Feature (F08): revanche reexecuta a verificação do deck (F02) com o deck ativo mais recente | `preparacao de duelo reexecuta a verificacao ao acionar nova tentativa` + a propriedade de idempotência do portão + `verificarDeckAtivo bloqueia deck invalido vindo do cache` — o portão não guarda veredito entre execuções |
| Cross-Feature: a verificação não concede nem revoga recompensa e não altera dado do jogador | `verificarDeckAtivo nao altera nenhuma linha de active_decks nem nenhum registro de IndexedDB` + `carregarDeckAtivo nao enfileira nenhuma mutacao offline` + análise estática de que nenhum arquivo desta feature escreve em `collections`, `wallets`, `reward_ledger` ou na fila |
| **Cross-PRD (Build Deck): o deck ativo salvo por `BuildDeck/F07` é carregado por F02 e aceito por `MotorDuelo/F03`; nenhum rascunho não salvo chega ao duelo** | `leitura de active_decks devolve o deck do jogador autenticado` + `verificarDeckAtivo contra o banco real libera um deck de quarenta cartas reais do catalogo` + a propriedade de solidez do deck válido (os mesmos invariantes que `initDuel` exige, `arquitetura.md` §3.1) + `carregarDeckAtivo nao le o store de rascunho do build deck` e a análise estática correspondente |
| Cross-PRD (Build Deck): há **um único** deck ativo por jogador, sem seleção entre decks | `player_id como chave primaria impede um segundo deck ativo para o mesmo jogador` + `preparacao de duelo nao apresenta seletor de deck` |
| Cross-PRD (Build Deck / anti-duplicação, Decisão 3): a regra 40/≤3 tem fonte única no projeto | Análise estática: nenhum arquivo fora de `packages/shared/src/deck/constantes.ts` declara os limites, e `apps/web` não os referencia. Teste de contrato: `validarComposicaoDeck` é o único caminho pelo qual o portão produz veredito, disponível a `build-deck` F06 |
| Cross-PRD (`banco-de-cartas`): todo `numero` do deck do jogador existe no catálogo canônico de 722 cartas | `verificarDeckAtivo contra o banco real bloqueia deck com numero fora das 722 cartas` + a propriedade de completude da existência, ambas com o catálogo real injetado |
| Cross-PRD (`banco-de-cartas`): o deck não estende nem redefine o schema da carta da Fase 0 | Análise estática: `packages/shared/src/deck/**` referencia `NumeroCarta` e nunca redeclara campos de `Carta`; `validarDeckParaDuelo nao consulta nenhum campo da carta alem da existencia` |
| Cross-PRD (Auth/Supabase): o deck pertence à conta e não vaza entre jogadores | `RLS impede o jogador A de ler o deck ativo do jogador B` + `remover o usuario em auth.users remove sua linha de active_decks em cascata` + `verificarDeckAtivo devolve indisponivel com motivo sessao_ausente sem sessao` |
| Cross-PRD (Motor de Duelo): F02 não reimplementa regra de duelo e não inicializa a partida | Análise estática: nenhum import de `packages/engine` nem de `packages/ai` nesta feature; `preparacao de duelo nao inicia o duelo em nenhum desfecho bloqueado` |
| PRD §4 Métricas — "0 partidas iniciadas com deck do jogador inválido/ausente" | A propriedade bicondicional do validador + `verificarDeckAtivo expoe temDeckValido falso em todo desfecho que nao libera` + `verificarDeckAtivo devolve indisponivel com motivo catalogo_indisponivel antes de carregar o deck` (nem mesmo o caminho degradado libera sem verificação completa) |
