# Orquestração da Partida

> PRD: `docs/prds/free-duel.md` — F03
> Pacote-alvo: `apps/web` (+ `packages/shared`, `packages/rules`)

## 1. Contexto e Escopo

Esta feature é o **backbone de runtime** do Free Duel (PRD §8, Parte 2 — Foundation, junto com F01):
entre a verificação do deck (F02) e o fim de partida (F04/F05/F08), ela monta a partida entregando
o deck do jogador e o deck do NPC ao motor (`MotorDuelo/F03`, já especificado), conduz o lado da
CPU repassando o estado a um agente de IA a cada ponto de decisão dele, e encaminha as ações do
jogador humano ao motor sem interpretá-las como regra (PRD F03 Capabilities). F03 **não decide
jogadas nem valida regras** — é a única responsabilidade que a diferencia de F01/F02: enquanto
aquelas leem e validam dados de entrada, esta conduz um processo em execução.

O PRD lista as dependências de F03 como `F01, F02, MotorDuelo/F03 (cross-PRD), IA de NPCs
(cross-PRD)`. As duas primeiras já têm spec neste repositório
(`docs/specs/free-duel/F01-selecao-de-oponente-roster-de-duelistas`,
`docs/specs/free-duel/F02-verificacao-do-deck-ativo`); `MotorDuelo/F03` (`initDuel`,
`montarEntradaInicializacao`) também já tem spec
(`docs/specs/motor-duelo-1x1/F03-inicializacao-do-duelo`). **Nenhum dos quatro está implementado**
— não há `packages/` nem `apps/` no repositório ainda —, mas a Camada 0 (arquitetura + ADRs +
guidelines + as quatro specs citadas) é suficiente para especificar F03 sem inventar contrato
alheio.

Dois contratos cross-PRD que F03 precisaria consumir **não têm spec própria ainda**: o ciclo de
turno do motor (`MotorDuelo/F06–F12`, de onde emergem `Acao` e o dispatcher `apply`) e a IA de NPCs
(`packages/ai`, sem PRD no repositório). Esta spec os trata como **contratos externos assumidos**
(Seção 1, Contratos externos assumidos) com a assinatura mínima que `arquitetura.md` §3.1 e a spec
de `motor-duelo-1x1`/F02 já fixam (`ResultadoAplicacao`), sem inventar a forma interna de `Acao` nem
a lógica de decisão da IA — exatamente a fronteira que o PRD já traça (§7 Fora de Escopo: "lógica de
decisão da IA... Free Duel só seleciona o perfil e transporta as ações").

Uma peça, porém, **não tinha nenhum contrato nem spec** e é bloqueante para esta feature: a entrada
da IA é citada em `arquitetura.md` §2 como "`(EstadoDuelo público) → Acao`", mas nenhuma spec define
o que "público" significa nem quem produz essa projeção. Como o `EstadoDuelo` completo já está
totalmente especificado (`motor-duelo-1x1` F01/F02), esta feature **define essa projeção agora**
(Decisões 4–5), em vez de deixar a IA enxergar a mão do jogador humano — o que violaria o valor
central do módulo ("duelos justos", PRD §2 Oportunidade).

### Incluído

- Montagem da entrada da partida a partir das saídas já validadas de F01 (deck do NPC) e F02 (deck
  do jogador), convertida para o formato que `MotorDuelo/F03` exige, com geração de seed quando
  ausente
- Criação da sessão de duelo via `montarEntradaInicializacao` + `initDuel` (reuso, sem redefinir)
- Projeção de "estado público" do `EstadoDuelo`, ocultando a mão do adversário, a identidade de
  cartas viradas para baixo de ambos os lados e a ordem/conteúdo do deck restante — a entrada real
  do agente de IA
- Condução do lado CPU: a cada ponto em que o próximo decisor é P2 (turno normal **ou** janela de
  reação), repassa o estado público ao agente e submete a ação retornada ao motor
- Encaminhamento de ações do jogador humano (P1) vindas da UI ao motor, sem validação de regra
- Estado de runtime da sessão de duelo (store Zustand) e a tela de duelo em `apps/web`, com o
  tabuleiro montado (Fase 0: 5+5 zonas por lado), mãos iniciais e indicadores de LP
- Guarda de segurança contra IA sem progresso (loop sem decisor P1 nem fim de partida) e contra
  recusa do motor ao iniciar apesar da verificação de F02

### Fronteiras

Delimitadas pela Seção 7 do PRD e pelos blocos Consumes/Provides vizinhos:

- **Decisão de jogadas da CPU** → **IA de NPCs (cross-PRD)**. F03 nunca calcula, pontua nem
  escolhe uma ação — só chama o agente injetado e submete o que ele devolve.
- **Validação e resolução de regras de duelo, incl. combate, fusão, guardião, terreno** →
  **Motor de Duelo 1x1 (cross-PRD)**. F03 nunca reimplementa uma checagem de legalidade: qualquer
  ação (humana ou da IA) que o motor rejeitar é tratada como falha externa (Seção 6), nunca
  reinterpretada aqui.
- **Construção e validação do deck** → **F01** (NPC) e **F02** (jogador). F03 recebe as duas saídas
  já prontas; não revalida composição, só remonta a forma exigida por `initDuel`.
- **Cálculo de nota, drop e estrelas** → **F05, F06, F07**. F03 não lê nem escreve
  `wallets`/`collections`/`reward_ledger`; apenas mantém a sessão que essas features vão consultar
  ao final.
- **Rendição, abandono e navegação pós-duelo** → **F04, F08**. F03 expõe o ponto genérico de
  submissão de ação (usado por F04 para encaminhar a rendição) e a capacidade de criar uma nova
  sessão (usada por F08 para a revanche), mas não implementa nenhuma das duas.
- **Persistência de partida em andamento** → fora desta versão (PRD §7). A sessão vive só em
  memória; fechar o app perde a sessão corrente.
- **Renderização fina, animação e som** → camada de apresentação (PRD §7). Esta spec descreve a
  estrutura da tela e do estado, não a estética do tabuleiro.

### Contratos externos assumidos

Nenhum dos módulos abaixo está implementado. A spec os trata como contrato externo; o `plan.md` os
lista como pré-requisito.

- **`montarEntradaInicializacao` e `initDuel`** (`motor-duelo-1x1`/F03, spec existente) — recebem
  `{ composicaoP1, composicaoP2, seed? }` e devolvem `EstadoDuelo` inicial ou recusa estruturada.
  F03 os consome sem redefinir. *A ser fornecido por `packages/engine`.*
- **`apply(estado: EstadoDuelo, acao: Acao): ResultadoAplicacao`** — o dispatcher de ações do motor,
  citado em `arquitetura.md` §3.1 e cujo tipo de retorno (`ResultadoAplicacao = { estado, eventos }`)
  já foi definido por `motor-duelo-1x1`/F02, mas cuja implementação e cuja união `Acao` emergem de
  `MotorDuelo/F06–F12`, ainda sem spec. F03 trata `Acao` como opaca: nunca inspeciona sua forma
  interna, apenas a recebe da UI ou da IA e a repassa a `apply`. *A ser fornecido por
  `packages/engine`.*
- **Agente de IA de NPCs** (`packages/ai`, sem PRD no repositório) — decide a ação do lado CPU a
  partir do estado público e do perfil de dificuldade (F01). F03 declara apenas o **tipo da porta**
  (`AgenteIA`, Seção 4) e injeta um fake determinístico em seus próprios testes; a estratégia real
  por dificuldade é responsabilidade exclusiva desse módulo. *A ser fornecido por `packages/ai`.*
- **`ConsultaCatalogo`** — já declarada por `banco-de-cartas`, `build-deck`/F01 e `free-duel`/F01,
  usada aqui só para satisfazer a defesa em profundidade de `montarEntradaInicializacao`.
  *A ser fornecido por `banco-de-cartas`/F03.*

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O estado de runtime da sessão de duelo (o `EstadoDuelo` do motor espelhado no cliente + o controle do loop de decisores) é gerenciado por **Zustand**, não `useReducer`+context. Esta é a decisão que `arquitetura.md` §7 deixa em aberto especificamente para o "adaptador React fino" que espelha o `EstadoDuelo` — e que as specs de `free-duel`/F01 (Decisão 15) e `free-duel`/F02 (Decisão 16) explicitamente adiaram para F03, "que é quem tem estado de runtime de duelo". Motivo: a store precisa ser lida/escrita por uma função assíncrona fora do ciclo de render (o loop de decisores da CPU, Decisão 2) e por múltiplos componentes (tabuleiro, mão, LP, log) sem re-render em cascata a cada evento do motor — isso pede um `getState()/setState()` acessível fora de React, que `useReducer`+context não oferece sem trabalho extra. **Esta decisão vale para o estado de sessão de duelo deste módulo**; `build-deck` (Decisão 5 de F01, adiada para `build-deck`/F05) e `library` (Decisão 12 de F01, adiada para F03/F04) têm seus próprios pontos de decisão análogos e podem concluir de forma diferente para o rascunho de deck ou os filtros da grade — não há contradição a reconciliar, são estados de natureza distinta. | entrevista; `arquitetura.md` §7; precedentes `free-duel` F01 (Decisão 15), F02 (Decisão 16) | confirmada |
| 2 | O loop de condução da CPU trata **"turno da CPU" e "janela de reação da CPU" de forma unificada**: sempre que o próximo decisor (Decisão 7) é `P2` — seja porque `jogadorAtivo === 'P2'`, seja porque `pendente.jogadorPodeReagir === 'P2'` — F03 consulta o agente de IA e submete a ação retornada; só devolve o controle à UI quando o decisor é `P1`. Motivo: o PRD descreve "a cada turno da CPU" (Capabilities), mas a janela de reação (`arquitetura.md` §3.2) pode abrir com o decisor invertido em relação a `jogadorAtivo` (ex.: P2 reage a um ataque de P1); tratar só `jogadorAtivo` deixaria a CPU sem resposta nesse caso, quebrando o duelo. | entrevista | confirmada |
| 3 | Geração de seed via **Web Crypto API** (`crypto.getRandomValues`), implementando o `GeradorSeed` que `motor-duelo-1x1`/F03 já especifica como porta injetada (`() => number`). Disponível tanto em `apps/web` (browser) quanto em Node 24 (`globalThis.crypto`), sem dependência nova, com entropia melhor que `Date.now()`. | entrevista | confirmada |
| 4 | A projeção **"EstadoDuelo público"**, citada em `arquitetura.md` §2 para a assinatura de `packages/ai` (`(EstadoDuelo público) → Acao`) mas nunca especificada, é definida **por esta feature**, em `packages/rules/src/visibilidade/` — um novo subsistema, paralelo a `deck/`. Isso é possível porque o shape completo de `EstadoDuelo` já está fechado (`motor-duelo-1x1` F01/F02) e a projeção não depende de nenhuma regra do ciclo de turno ainda não especificada; só reorganiza campos já conhecidos. Registrado como "criado por necessidade de F03; `motor-duelo-1x1` deve convergir para este subsistema se especificar isso formalmente depois" — mesmo padrão já usado por `free-duel`/F01 (Decisão 18, constantes de deck) e `free-duel`/F02 (Decisão 3, validador de deck). | entrevista; `arquitetura.md` §2; precedente `free-duel` F01 (Decisão 18) | confirmada — **a confirmar convergência quando `motor-duelo-1x1` especificar o ciclo de turno/IA formalmente** |
| 5 | Regra de ocultação de `obterEstadoPublico(estado, paraJogador)`: o **lado do próprio jogador** é sempre totalmente visível (mão, campo, LP); o **lado do adversário** oculta a mão (só a contagem) e a identidade de qualquer zona de campo virada para baixo (`posicao` face-baixo ou `viradaParaCima === false`); **ambos os lados** ocultam a ordem e o conteúdo do deck restante (só a contagem — nem o próprio jogador "vê" a ordem do baralho embaralhado); `terrenoAtivo` é sempre visível (nenhuma regra do FM o esconde); `seed` nunca é exposto (permitiria prever o PRNG). A mesma regra de visibilidade por carta é aplicada a `pendente.evento.cartasEnvolvidas`, para que a janela de reação não vaze identidade de carta que o `paraJogador` não veria de outra forma. | entrevista | confirmada |
| 6 | **`Acao`** (o tipo de ação submetida ao motor) e o dispatcher **`apply(estado, acao): ResultadoAplicacao`** ainda não têm spec própria — emergem de `MotorDuelo/F06–F12`. F03 os trata como contrato externo: nunca inspeciona o conteúdo de uma `Acao`, apenas a transporta entre UI/IA e o motor (PRD Fronteiras). O par de retorno `ResultadoAplicacao = { estado: EstadoDuelo; eventos: readonly Evento[] }` **já** foi definido por `motor-duelo-1x1`/F02 e é reusado sem redefinição — só o dispatcher em si e a união `Acao` estão pendentes. | `motor-duelo-1x1`/F02 (Decisão de `ResultadoAplicacao`); PRD Fronteiras | confirmada |
| 7 | O **"próximo decisor"** de um `EstadoDuelo` é `estado.pendente.jogadorPodeReagir` quando há janela de reação aberta (`arquitetura.md` §3.2), senão `estado.jogadorAtivo`. A função `proximoDecisor` é nova nesta feature, mas deriva inteiramente de campos já especificados por `motor-duelo-1x1` F01/F02 — não introduz estado paralelo nem uma terceira fonte de verdade sobre "de quem é a vez". | `motor-duelo-1x1` F01 (`jogadorAtivo`), F02 (`pendente.jogadorPodeReagir`) | confirmada |
| 8 | **Fim de partida é detectado por `estado.fase === 'fim'`** — literal já existente na união `Fase` definida por `motor-duelo-1x1`/F01. F03 não inventa uma segunda forma de saber que o duelo acabou (ex.: um campo `resultado` novo); quando `MotorDuelo/F12` especificar a transição para essa fase e o desfecho (vencedor/motivo), F05 consome esses detalhes a partir do `EstadoDuelo` final que a sessão já retém. | `motor-duelo-1x1` F01 (`Fase`); PRD F05 Consumes (`MotorDuelo/F12`) | confirmada |
| 9 | O deck do NPC (`DeckNpc`, lista de 40 `numero` com repetições, de `free-duel`/F01) é convertido para `ComposicaoDeck` (`numero → quantidade`, de `free-duel`/F02) por uma nova função **`agruparEmComposicao`**, adicionada a `packages/rules/src/deck/composicao.ts` — irmã de `expandirComposicao` (já criada por `free-duel`/F02), em vez de reimplementar essa transformação em `apps/web`. | precedente `free-duel`/F02 (`expandirComposicao`); `arquitetura.md` §2 (regra fora da UI) | confirmada |
| 10 | **`montarEntradaPartida` (`apps/web`) não valida nada** — apenas remonta a forma `{ composicaoP1, composicaoP2, seed? }` exigida por `motor-duelo-1x1`/F03 a partir das saídas já validadas de F01 (NPC) e F02 (jogador). Toda validação estrutural de deck já ocorreu nessas duas features; a revalidação de defesa em profundidade é responsabilidade do próprio `montarEntradaInicializacao` (motor), não desta função. | precedente `motor-duelo-1x1`/F03 (Decisão 1, "defesa em profundidade, não o ponto primário de UX") | confirmada |
| 11 | **Guarda de segurança contra loop sem progresso**: `avancarDecisoresCpu` aborta após `MAX_ACOES_CPU_POR_AVANCO` (constante nova, `packages/shared`) iterações sem alcançar decisor `P1` nem `estado.fase === 'fim'`, tratando o caso como falha da IA (PRD F03 Error Handling: "Falha na IA do oponente; duelo encerrada"). Sem essa guarda, um agente de IA que sempre devolve uma ação que reabre outra janela de reação (bug do agente) travaria a sessão indefinidamente. | PRD F03 Error Handling; guidelines §24 golden rule 5 ("erros explícitos") | confirmada |
| 12 | **Falha da IA é tratada uniformemente**, qualquer que seja a causa técnica (exceção síncrona, promise rejeitada, esgotamento da guarda da Decisão 11, ou ação que `apply` rejeita): a sessão transita para `fase: 'falha'`, o incidente é registrado (log estruturado) e a mensagem ao jogador é a única do PRD ("Falha na IA do oponente; duelo encerrado"). F03 não distingue essas causas para o jogador — só no registro estruturado, para diagnóstico. | PRD F03 Error Handling; guidelines §23.1–23.2 | confirmada |
| 13 | Como `apply` ainda não existe, os testes desta feature usam um **fake** com a mesma assinatura `(estado, acao) => ResultadoAplicacao`, documentado explicitamente como caminho de integração provisório — mesma limitação já registrada por `motor-duelo-1x1`/F03 (Seção 7, "a cadeia completa só é testável quando F06–F12 existirem"). | precedente `motor-duelo-1x1`/F03 §7 | confirmada |
| 14 | **`packages/ai` não é criado por esta feature.** F03 declara apenas o tipo da porta `AgenteIA` em `packages/shared` e injeta um fake determinístico em seus próprios testes; a implementação real do agente (estratégias por dificuldade) é integralmente de `packages/ai`, sem PRD/spec própria ainda. Nenhum arquivo desta feature vive em `packages/ai` nem o importa. | PRD §7 ("lógica de decisão da IA é cross-PRD"); auto-aceite: dependência cross-PRD inexistente vira contrato externo | confirmada |
| 15 | **Nenhuma tabela Postgres, estrutura IndexedDB ou fila offline** é criada por esta feature — a sessão de duelo vive inteiramente em memória (store Zustand) durante a partida. Interromper o app perde a sessão corrente; ao reabrir, o jogador retorna ao menu do Free Duel (PRD F03 Error Handling; PRD §7 Fora de Escopo, "retomar duelo em andamento"). | PRD F03 Error Handling; PRD §7 | confirmada |
| 16 | **`SessaoDuelo` é uma união discriminada por `fase`** (`nao_iniciada \| em_andamento \| encerrada \| falha`), não um objeto com múltiplos booleanos independentes — mesmo estilo de união usado por `VerificacaoDeckAtivo` (`free-duel`/F02, Decisão 10) para desfechos de domínio mutuamente exclusivos. | precedente `free-duel`/F02 (Decisão 10); guidelines §7.2 | confirmada |
| 17 | A tela de duelo é **Client Component** sob `app/free-duel/[duelistaId]/duelo`, seguindo a convenção sem `src/` já usada por F01/F02 deste módulo (Decisão 19 de F02) e o mesmo `duelistaId` de parâmetro de rota herdado da confirmação de F01. | precedente `free-duel`/F02 (Decisão 19); ADR-004 | confirmada |
| 18 | **Zustand é uma dependência nova** do monorepo (primeiro uso, já que F01/F02 explicitamente adiaram a escolha). Deve ser adicionada a `apps/web/package.json`; nenhum outro pacote a importa (só `apps/web`, consistente com `arquitetura.md` §7 — "web" é onde vive o adaptador de render). | `arquitetura.md` §2, §7 | confirmada |
| 19 | Não existe código de implementação no repositório: nem `packages/` nem `apps/`. A Camada 0 (arquitetura + ADRs + guidelines + as specs de `motor-duelo-1x1` F01–F03 e `free-duel` F01–F02) é a única fonte de padrões. Precedente: mesma decisão registrada por `free-duel`/F01 (Decisão 20) e F02 (Decisão 21). | estado do repositório; precedentes citados | confirmada |
| 20 | Esta feature não tem divisão Core/Full Scope no PRD — a spec cobre o **escopo completo** de F03. | PRD §6 F03 | confirmada |
| 21 | **`submeterAcaoJogador` não é o canal certo para ações "a qualquer momento" (ex.: rendição, F04).** Sua guarda (Decisão 10 do fluxo) rejeita silenciosamente qualquer ação quando `decisorAtual !== 'P1'` — correto para jogadas normais de turno, mas incompatível com uma ação de interrupção que o PRD de F04 exige poder disparar "a qualquer momento", inclusive durante a janela transitória em que a sessão está `em_andamento` com `decisorAtual === 'P2'` (passo 17 do Fluxo). F03 expõe por isso um **segundo canal**, `interromperSessao`, que aplica a ação **sem checar `proximoDecisor`** — reservado a ações de interrupção do próprio jogador (rendição), nunca a jogadas de turno. F04 usa este canal, não `submeterAcaoJogador`, para render-se. | Reconciliação com `free-duel`/F04 (dependente direta desta feature) | confirmada |
| 22 | **`SessaoDuelo` carrega um `idSessaoDuelo: string` estável**, gerado uma vez em `criarSessaoDuelo` (via `crypto.randomUUID()`) e preservado em todos os ramos que representam uma sessão existente (`em_andamento`, `encerrada`, `falha`). Motivo: F05/F06/F07 (waves seguintes) precisam de um identificador único de partida para a idempotência de crédito de recompensa (`reward_ledger.duel_id`, `arquitetura.md` §5.2). **Não é o `seed`**: o `seed` já existe dentro de `estado`/`estadoFinal` (F01/F03 do motor) mas serve à reprodutibilidade determinística, não à identidade — sendo um `number` de 32 bits, o risco de colisão por aniversário fica não-desprezível na escala de milhões de duelos, o que o torna inadequado como chave de idempotência global. `idSessaoDuelo` é gerado independentemente do `seed`, com um espaço de colisão desprezível (UUID v4). | Reconciliação com `free-duel`/F05 (dependente direta desta feature); `arquitetura.md` §5.2 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duelo/tipos.ts` | shared | alterado | Acrescenta `CartaPublica`, `MaoPublica`, `ZonaMonstroPublica`, `ZonaMagiaPublica`, `CampoJogadorPublico`, `EstadoJogadorPublico`, `EventoPublico`, `JanelaReacaoPublica`, `EstadoDueloPublico` |
| `packages/shared/src/duelo/schema.ts` | shared | alterado | Schemas zod correspondentes aos tipos acima |
| `packages/shared/src/duelo/constantes.ts` | shared | alterado | Acrescenta `MAX_ACOES_CPU_POR_AVANCO` |
| `packages/shared/src/duelo/orquestracao.ts` | shared | novo | `AgenteIA`, `ObterEstadoPublico`, `EntradaOrquestracaoPartida`, `SessaoDuelo`, `MotivoFalhaOrquestracao`, `CODIGOS_ERRO_ORQUESTRACAO` |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos tipos/constantes |
| `packages/rules/src/deck/composicao.ts` | rules | alterado | Acrescenta `agruparEmComposicao` |
| `packages/rules/src/deck/composicao.test.ts` | rules | alterado | Testes da nova função |
| `packages/rules/src/visibilidade/obter-estado-publico.ts` | rules | novo | `obterEstadoPublico`, `cartaVisivelPara` (helper interno) |
| `packages/rules/src/visibilidade/index.ts` | rules | novo | Export público do subsistema `visibilidade` |
| `packages/rules/src/index.ts` | rules | alterado | Reexporta `visibilidade/` ao lado de `deck/` |
| `packages/rules/src/visibilidade/obter-estado-publico.test.ts` | rules | novo | Unitários table-driven + propriedades fast-check |
| `apps/web/lib/free-duel/gerador-seed.ts` | web | novo | `criarGeradorSeedCripto(): GeradorSeed` via `crypto.getRandomValues`; `gerarIdSessao(): string` via `crypto.randomUUID()` (Decisão 22) — irmã do gerador de seed, mesma borda de entropia |
| `apps/web/lib/free-duel/montar-entrada-partida.ts` | web | novo | `montarEntradaPartida` — remonta a forma exigida por `initDuel` a partir de F01/F02 |
| `apps/web/lib/free-duel/sessao-duelo.ts` | web | novo | `criarSessaoDuelo`, `avancarDecisoresCpu`, `submeterAcaoJogador`, `proximoDecisor`, `interromperSessao` (canal para ações "a qualquer momento", ex.: rendição de F04 — Decisão 21) |
| `apps/web/lib/free-duel/agente-ia-porta.ts` | web | novo | Ponto único de injeção do `AgenteIA` real (a conectar quando `packages/ai` existir) |
| `apps/web/stores/free-duel/sessao-duelo-store.ts` | web | novo | Store Zustand: `sessao`, `iniciar`, `submeterAcao` |
| `apps/web/app/free-duel/[duelistaId]/duelo/page.tsx` | web | novo | Rota fina da tela de duelo |
| `apps/web/app/free-duel/[duelistaId]/duelo/tela-duelo.tsx` | web | novo | Client Component: monta o tabuleiro, aciona a store, exibe estados de falha |
| `apps/web/components/free-duel/tabuleiro.tsx` | web | novo | Renderiza as 5+5 zonas de cada lado a partir do estado próprio do jogador |
| `apps/web/components/free-duel/mao-jogador.tsx` | web | novo | Mão do jogador humano (sempre visível) |
| `apps/web/components/free-duel/indicador-lp.tsx` | web | novo | LP de cada lado |
| `apps/web/components/free-duel/aviso-falha-orquestracao.tsx` | web | novo | Painel de falha (IA indisponível / deck recusado pelo motor) com botão "Voltar ao menu" |
| `apps/web/lib/free-duel/gerador-seed.test.ts` | web | novo | Unitários: intervalo, ausência de repetição óbvia |
| `apps/web/lib/free-duel/montar-entrada-partida.test.ts` | web | novo | Unitários da conversão `DeckNpc → ComposicaoDeck` e do handoff |
| `apps/web/lib/free-duel/sessao-duelo.test.ts` | web | novo | Unitários + propriedades, com fakes de `apply`/`initDuel`/`AgenteIA` (Decisão 13) |
| `apps/web/stores/free-duel/sessao-duelo-store.test.ts` | web | novo | Unitários da store: iniciar, submeter ação, transição de fases |
| `apps/web/app/free-duel/[duelistaId]/duelo/tela-duelo.test.tsx` | web | novo | Unitários de tela: tabuleiro, avisos, handoff a F04/F05/F08 |
| `apps/web/tests/fakes/agente-ia-fake.ts` | web | novo | Fake determinístico de `AgenteIA`, uso exclusivo em testes |
| `apps/web/tests/fakes/motor-fake.ts` | web | novo | Fakes de `apply`/`initDuel`/`montarEntradaInicializacao`, uso exclusivo em testes (Decisão 13) |
| `apps/web/tests/free-duel-orquestracao.integration.test.ts` | web | novo | Integração F01→F02→F03 com fakes de motor/IA |
| `apps/web/package.json` | web | alterado | Adiciona `zustand` (Decisão 18) |
| `.dependency-cruiser.cjs` | raiz | alterado | Regras de fronteira do subsistema `visibilidade` e da store de sessão |

**Verificação da direção de dependências:**

- `packages/shared` continua sem importar nenhum pacote do monorepo.
- `packages/rules/src/visibilidade/**` importa **apenas** `packages/shared` (tipos `EstadoDuelo`,
  `Carta`, `JogadorId`, `Evento`, `EstadoDueloPublico`). Não importa `packages/data`,
  `packages/engine`, `packages/ai`, `apps/web` nem `apps/server`.
- `packages/rules/src/deck/composicao.ts` (alterado) continua importando apenas `packages/shared`
  — `agruparEmComposicao` não precisa de catálogo nem de I/O.
- `apps/web` importa `shared`, `rules`, `data` — nenhum import na direção contrária. **Não importa
  `packages/engine` nem `packages/ai` diretamente**: ambos ainda não existem como pacotes; os pontos
  de integração (`apply`, `initDuel`, `montarEntradaInicializacao`, o agente de IA real) entram por
  injeção de dependência em `sessao-duelo.ts` e `agente-ia-porta.ts`, isolando o único lugar que
  precisará de um import real quando esses pacotes existirem.
- Esta feature **não cria nem altera nenhum arquivo em `packages/engine`**: reusa `initDuel`/
  `montarEntradaInicializacao` (já especificados por `motor-duelo-1x1`/F03) por injeção, sem
  redefinir nem duplicar.
- Nenhum arquivo de `apps/web` reimplementa uma checagem de legalidade de jogada, uma regra de
  combate ou uma pontuação de dificuldade — a única lógica de domínio nova desta feature
  (`proximoDecisor`, `obterEstadoPublico`, `agruparEmComposicao`) opera sobre campos já
  especificados, sem introduzir regra de jogo (`arquitetura.md` §7, "UI não contém regra").

## 3. Design Técnico

### Estruturas de dados

**`CartaPublica`** (`packages/shared`) — união discriminada por `visivel`:

| Variante | Campos | Semântica |
|---|---|---|
| Visível | `{ visivel: true; carta: Carta }` | A carta real, quando o `paraJogador` da projeção pode vê-la |
| Oculta | `{ visivel: false }` | Identidade escondida — nunca revela `numero`, `nome` nem qualquer campo de `Carta` |

**`MaoPublica`** — união discriminada por `visivel`:

| Variante | Campos | Semântica |
|---|---|---|
| Visível | `{ visivel: true; cartas: readonly Carta[] }` | A mão do próprio `paraJogador` |
| Oculta | `{ visivel: false; quantidade: number }` | A mão do adversário — só a contagem |

**`ZonaMonstroPublica`** — espelha `ZonaMonstro` (motor-duelo-1x1 F01), trocando `carta: Carta` por
`carta: CartaPublica`:

```
| { ocupada: false }
| { ocupada: true; carta: CartaPublica; posicao: PosicaoMonstro; jaAtacou: boolean; jaMudouDePosicao: boolean }
```

**`ZonaMagiaPublica`** — mesma ideia sobre `ZonaMagia`:

```
| { ocupada: false }
| { ocupada: true; carta: CartaPublica; viradaParaCima: boolean }
```

**`CampoJogadorPublico`** — `{ monstros: readonly [5× ZonaMonstroPublica]; magias: readonly [5×
ZonaMagiaPublica] }`, mesma forma tupla de 5 posições de `CampoJogador`.

**`EstadoJogadorPublico`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `lp` | `number` | Sempre visível, dos dois lados |
| `mao` | `MaoPublica` | Visível para o próprio lado, contagem para o adversário |
| `deckRestante` | `number` | Só a contagem, **para os dois lados** — nem o próprio jogador vê a ordem do baralho (Decisão 5) |
| `campo` | `CampoJogadorPublico` | Identidade revelada por zona conforme a Decisão 5 |

**`EventoPublico`** — espelha `Evento` (motor-duelo-1x1 F02), trocando `cartasEnvolvidas: readonly
Carta[]` por `cartasEnvolvidas: readonly CartaPublica[]`, mesma regra de visibilidade por carta.

**`JanelaReacaoPublica`** — `{ tipo: 'janela_reacao'; evento: EventoPublico; jogadorPodeReagir:
JogadorId }`.

**`EstadoDueloPublico`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `jogadores` | `Record<JogadorId, EstadoJogadorPublico>` | Projeção por lado |
| `terrenoAtivo` | `Carta \| null` | Sempre visível (Decisão 5) |
| `jogadorAtivo` | `JogadorId` | Idêntico ao `EstadoDuelo` — não é segredo |
| `turno` | `number` | Idêntico |
| `fase` | `Fase` | Idêntico |
| `pendente` | `JanelaReacaoPublica \| undefined` | Projeção de `pendente`, quando presente |

**Ausente de propósito:** `seed` — nunca aparece em `EstadoDueloPublico` (Decisão 5).

**`AgenteIA`**, **`ObterEstadoPublico`** (`packages/shared/src/duelo/orquestracao.ts`) — as duas
portas injetadas que fecham o contrato `(EstadoDuelo público) → Acao` de `arquitetura.md` §2.

**`EntradaOrquestracaoPartida`** — `{ duelistaId: DuelistaId; composicaoP1: ComposicaoDeck;
composicaoP2: ComposicaoDeck; seed?: number }`. A forma que `montarEntradaPartida` produz e que
`criarSessaoDuelo` consome para chamar `montarEntradaInicializacao`.

**`SessaoDuelo`** — união discriminada por `fase` (Decisão 16):

```
| { fase: 'nao_iniciada' }
| { fase: 'em_andamento'; idSessaoDuelo: string; duelistaId: DuelistaId; estado: EstadoDuelo; decisorAtual: JogadorId }
| { fase: 'encerrada'; idSessaoDuelo: string; duelistaId: DuelistaId; estadoFinal: EstadoDuelo }
| { fase: 'falha'; idSessaoDuelo: string; duelistaId: DuelistaId; motivo: MotivoFalhaOrquestracao }
```

**`MotivoFalhaOrquestracao`** — união fechada: `'deck_recusado_pelo_motor' | 'ia_indisponivel' |
'loop_sem_progresso'`. Os dois últimos recebem a mesma mensagem ao jogador (Decisão 12); o código
distinto só existe para o registro estruturado.

### Fluxo

**Montagem da entrada** (`montarEntradaPartida`, puro):

1. Recebe `deckJogador: DeckPronto` (F02) e `duelista: Duelista` (F01).
2. `composicaoP1 = deckJogador.composicao` (já é `ComposicaoDeck`, sem transformação).
3. `composicaoP2 = agruparEmComposicao(duelista.deck)` (nova função, `packages/rules`).
4. Devolve `EntradaOrquestracaoPartida` com o `seed` recebido (opcional — repassado adiante para
   `montarEntradaInicializacao` resolver via `geradorSeed`, se ausente).

**Criação da sessão** (`criarSessaoDuelo`):

5. Gera `idSessaoDuelo` (`crypto.randomUUID()`, Decisão 22) **antes** de qualquer validação —
   mesmo uma sessão que falha ao iniciar carrega o id, para que `SessaoDuelo` tenha uma forma
   uniforme em todo ramo que não seja `nao_iniciada`. Chama `montarEntradaInicializacao({
   composicaoP1, composicaoP2, seed }, { catalogo, geradorSeed: criarGeradorSeedCripto() })`
   (motor-duelo-1x1/F03).
6. Erro (deck estruturalmente inválido, apesar da verificação de F02/F01) ⇒ `SessaoDuelo` com
   `fase: 'falha'`, `idSessaoDuelo`, `motivo: 'deck_recusado_pelo_motor'` (Decisão 12 análoga —
   mensagem específica do PRD, não a genérica de IA).
7. Sucesso ⇒ `initDuel(entrada)` produz o `EstadoDuelo` inicial. **Jogador humano = P1, CPU = P2**,
   fixo (PRD F03 Capabilities) — não é o motor quem atribui isso; é a convenção com que F03 monta
   `composicaoP1`/`composicaoP2` desde o passo 2.
8. `decisorAtual = proximoDecisor(estado)` (Decisão 7). Gera `idSessaoDuelo` (`crypto.randomUUID()`,
   Decisão 22 — independente do `seed`). Sessão entra em `fase: 'em_andamento'`.
9. Se `decisorAtual === 'P2'` já no primeiro estado (o sorteio de `initDuel` pode dar o primeiro
   turno à CPU), o chamador aciona `avancarDecisoresCpu` imediatamente após a criação.

**Condução do lado CPU** (`avancarDecisoresCpu`, assíncrono):

10. Enquanto `proximoDecisor(estado) === 'P2'` e `estado.fase !== 'fim'`:
    a. Projeta `estadoPublico = obterEstadoPublico(estado, 'P2')` (`packages/rules`).
    b. Chama `agenteIA(estadoPublico, perfilCpu)` (o `perfil` do duelista escolhido, de F01).
    c. Submete a ação retornada: `{ estado, eventos } = apply(estado, acao)`.
    d. Incrementa o contador de iterações; se exceder `MAX_ACOES_CPU_POR_AVANCO` (Decisão 11),
       interrompe com `fase: 'falha'`, `motivo: 'loop_sem_progresso'`.
    e. Se a chamada ao agente lançar, rejeitar, ou `apply` sinalizar rejeição da ação (contrato
       ainda a definir por `MotorDuelo/F06–F12` — tratado com tolerância, Decisão 6), interrompe
       com `fase: 'falha'`, `motivo: 'ia_indisponivel'`.
11. Ao sair do laço: `estado.fase === 'fim'` ⇒ `fase: 'encerrada'`, `estadoFinal: estado`;
    `proximoDecisor(estado) === 'P1'` ⇒ `fase: 'em_andamento'` com o novo `estado` e
    `decisorAtual: 'P1'`.

**Ação do jogador humano** (`submeterAcaoJogador`):

12. Recebe uma `Acao` vinda da UI (F03 não a interpreta, PRD Capabilities).
13. Se `sessao.decisorAtual !== 'P1'`, devolve a sessão **inalterada** (guarda contra ação fora de
    ordem — ex.: duplo clique ou UI dessincronizada).
14. Caso contrário: `{ estado, eventos } = apply(sessao.estado, acao)`, então delega imediatamente
    a `avancarDecisoresCpu` sobre o novo estado (o próximo decisor pode já ser P2).

**Tela de duelo** (`apps/web/app/free-duel/[duelistaId]/duelo`):

15. Ao entrar, se a store ainda está `nao_iniciada`, aciona `iniciar` com a saída de F02
    (`deckPronto`) e o `duelista` resolvido por F01 (via `duelistaId` da rota).
16. `em_andamento` com `decisorAtual === 'P1'` ⇒ tabuleiro interativo, mão do jogador clicável.
17. `em_andamento` com `decisorAtual === 'P2'` (transitório, durante o `await` de
    `avancarDecisoresCpu`) ⇒ tabuleiro em modo leitura, sem ação disponível ao jogador.
18. `encerrada` ⇒ handoff a F05 com o `estadoFinal` (fora do escopo desta feature interpretar).
19. `falha` ⇒ exibe `aviso-falha-orquestracao` com a mensagem correspondente ao `motivo`
    (`deck_recusado_pelo_motor` usa a mensagem específica do PRD F03 Error Handling; os outros dois
    usam a mensagem de falha de IA) e o botão "Voltar ao menu".

### Regras de negócio

**Invariantes da Fase 0 respeitados** (herdados, não recalculados aqui):

- **P1 = jogador humano, P2 = CPU, fixo** — convenção de montagem, nunca invertida (PRD F03
  Capabilities).
- **5+5 zonas por lado, 8000 LP iniciais** — já garantidos por `initDuel` (motor-duelo-1x1/F03);
  F03 não recria nem reconfirma esses valores, só os exibe.
- **1 ação principal por turno, monstro ataca no máximo 1×** — regras do motor (F06–F12, ainda sem
  spec); F03 nunca as verifica — se uma `Acao` violar essas regras, a rejeição (Decisão 6) é
  responsabilidade de `apply`, não desta feature.

**Regras próprias desta feature:**

- **Nenhuma jogada é decidida aqui.** Toda `Acao` submetida a `apply` vem de fora (UI para P1,
  agente de IA para P2); F03 nunca constrói uma `Acao` por conta própria, exceto a submissão
  transparente do que recebeu.
- **A sessão nunca mistura decisor e turno.** `proximoDecisor` é a única fonte de "de quem é a
  vez de agir agora" — nenhuma função desta feature consulta `jogadorAtivo` isoladamente para
  decidir se deve chamar a IA.
- **Projeção pública é sempre recalculada, nunca cacheada** entre chamadas — `obterEstadoPublico`
  é pura e barata (não há I/O), então cada consulta ao agente recebe uma projeção fresca do estado
  corrente.
- **Nenhuma escrita em Postgres, IndexedDB ou fila offline** durante a partida (Decisão 15).
- **A sessão anterior não sobrevive a uma nova chamada de `criarSessaoDuelo`** (usada por F08 na
  revanche) — cada partida é independente, sem histórico acumulado (PRD F08 Capabilities).

**Não-regras (explicitamente ausentes):** F03 não pontua a partida, não decide vitória/derrota
(isso é do motor, consumido por F05), não persiste nada, não valida deck (F01/F02 já fizeram) e não
implementa render/abandono (F04) nem navegação pós-duelo (F08) além de expor os pontos de extensão
que essas features usam (`submeterAcaoJogador` genérico; `criarSessaoDuelo` reexecutável).

### Eventos

F03 não define novo tipo de evento — reusa `Evento`/`TipoEvento` (10 tipos, motor-duelo-1x1/F02)
sem alteração. A única transformação que esta feature aplica a eventos é a projeção de visibilidade
(`EventoPublico`, dentro de `pendente`), que **não** é o barramento de eventos em si — é a mesma
projeção aplicada ao restante do `EstadoDuelo`.

### Determinismo e pureza

- `proximoDecisor`, `obterEstadoPublico`, `agruparEmComposicao` e `montarEntradaPartida` são
  **puras e totais**: nenhuma I/O, nenhuma UI, nenhum relógio, nenhuma aleatoriedade.
- `obterEstadoPublico` não muta o `EstadoDuelo` recebido — devolve uma estrutura nova
  (`Readonly`, guidelines §6.3).
- A única fonte de não-determinismo desta feature é `criarGeradorSeedCripto` (Web Crypto API),
  isolada atrás da porta `GeradorSeed` já especificada por `motor-duelo-1x1`/F03 — mesma disciplina
  de isolar aleatoriedade na borda usada naquela spec.
- `avancarDecisoresCpu` e `submeterAcaoJogador` são **impuras por composição** (chamam `apply` e
  `agenteIA`, ambos injetados): a impureza vem inteiramente das dependências externas, nunca de
  lógica própria desta feature.
- `EstadoDueloPublico` continua 100% serializável em JSON — nenhuma função, `Map` ou `Set` é
  introduzida (mesma disciplina de `EstadoDuelo`, motor-duelo-1x1/F01 Decisão 15).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`CartaPublicaSchema`**, **`MaoPublicaSchema`**, **`ZonaMonstroPublicaSchema`**,
  **`ZonaMagiaPublicaSchema`**, **`CampoJogadorPublicoSchema`**, **`EstadoJogadorPublicoSchema`**,
  **`EventoPublicoSchema`**, **`JanelaReacaoPublicaSchema`**, **`EstadoDueloPublicoSchema`** —
  espelham as uniões acima; todos objetos estritos com `z.discriminatedUnion` onde há variantes.
- **`MAX_ACOES_CPU_POR_AVANCO`** — constante nova, `packages/shared/src/duelo/constantes.ts`.
- **`CODIGOS_ERRO_ORQUESTRACAO`** — conjunto fechado: `deck_recusado_pelo_motor`,
  `ia_indisponivel`, `loop_sem_progresso`.
- **Reusados sem redefinir:** `EstadoDuelo`, `JogadorId`, `Fase`, `Carta`, `CampoJogador`,
  `ZonaMonstro`, `ZonaMagia` (motor-duelo-1x1/F01); `Evento`, `TipoEvento`, `JanelaReacao`,
  `ResultadoAplicacao`, `ReferenciaZona` (motor-duelo-1x1/F02); `EntradaInicializacao`,
  `GeradorSeed`, `montarEntradaInicializacao`, `initDuel` (motor-duelo-1x1/F03); `ComposicaoDeck`,
  `DeckPronto` (free-duel/F02); `Duelista`, `DuelistaId`, `PerfilDificuldade`, `DeckNpc`
  (free-duel/F01); `Result`, `DomainError` (banco-de-cartas/F01); `ConsultaCatalogo`
  (build-deck/F01, free-duel/F01).

### Funções públicas

```
// packages/rules/src/deck — extensão

agruparEmComposicao(numeros: readonly NumeroCarta[]): ComposicaoDeck
  // pós: expandirComposicao(agruparEmComposicao(xs)) é uma permutação de xs (round-trip)
  // total: nunca lança
```

```
// packages/rules/src/visibilidade — núcleo puro

obterEstadoPublico(estado: EstadoDuelo, paraJogador: JogadorId): EstadoDueloPublico
  // pós: jogadores[paraJogador] — mao.visivel = true, campo com toda carta visivel = true
  //      jogadores[oponente]    — mao.visivel = false (quantidade = mao.length)
  //                              campo: carta visivel sse a zona está face-cima
  //      jogadores[*].deckRestante = deck.length (nunca a lista)
  //      terrenoAtivo preservado; seed nunca aparece no tipo de retorno
  //      pendente, se presente, projeta cartasEnvolvidas pela mesma regra de visibilidade
  // pura, total: nunca lança
```

```
// apps/web/lib/free-duel — bordas de I/O e orquestração

criarGeradorSeedCripto(): GeradorSeed
  // pós: cada chamada devolve um number em [0, 0xFFFFFFFF] a partir de crypto.getRandomValues

montarEntradaPartida(entrada: {
  duelistaId: DuelistaId;
  deckJogador: DeckPronto;
  duelista: Duelista;
  seed?: number;
}): EntradaOrquestracaoPartida
  // pura: composicaoP1 = deckJogador.composicao; composicaoP2 = agruparEmComposicao(duelista.deck)

criarSessaoDuelo(
  entrada: EntradaOrquestracaoPartida,
  deps: {
    montarEntradaInicializacao: MontarEntradaInicializacao; // motor-duelo-1x1/F03
    initDuel: InitDuel;                                      // motor-duelo-1x1/F03
    geradorSeed: GeradorSeed;
    catalogo: ConsultaCatalogo;
    gerarIdSessao: () => string;                             // crypto.randomUUID() (Decisão 22)
  },
): SessaoDuelo
  // idSessaoDuelo é gerado primeiro, antes de qualquer validação (independente do resultado)
  // erro do motor ⇒ { fase: 'falha', idSessaoDuelo, motivo: 'deck_recusado_pelo_motor' }
  // sucesso ⇒ { fase: 'em_andamento', idSessaoDuelo, estado: initDuel(...),
  //             decisorAtual: proximoDecisor(estado) }

proximoDecisor(estado: EstadoDuelo): JogadorId
  // pós: estado.pendente?.jogadorPodeReagir ?? estado.jogadorAtivo

avancarDecisoresCpu(
  sessao: Extract<SessaoDuelo, { fase: 'em_andamento' }>,
  deps: {
    apply: (estado: EstadoDuelo, acao: Acao) => ResultadoAplicacao;
    agenteIA: AgenteIA;
    obterEstadoPublico: ObterEstadoPublico;
    perfilCpu: PerfilDificuldade;
  },
): Promise<SessaoDuelo>
  // enquanto proximoDecisor(estado) === 'P2' e estado.fase !== 'fim': consulta agenteIA, aplica
  // devolve 'em_andamento' (decisor P1) | 'encerrada' (fase fim) | 'falha' (Decisões 11/12)

submeterAcaoJogador(
  sessao: Extract<SessaoDuelo, { fase: 'em_andamento' }>,
  acao: Acao,
  deps: Parameters<typeof avancarDecisoresCpu>[1],
): Promise<SessaoDuelo>
  // decisorAtual !== 'P1' ⇒ devolve sessao inalterada
  // decisorAtual === 'P1' ⇒ aplica acao, então delega a avancarDecisoresCpu

interromperSessao(
  sessao: Extract<SessaoDuelo, { fase: 'em_andamento' }>,
  acao: Acao,
  deps: { apply: (estado: EstadoDuelo, acao: Acao) => ResultadoAplicacao },
): SessaoDuelo
  // pós: aplica acao ao estado corrente SEM checar proximoDecisor (Decisão 21)
  //      reservado a ações de interrupção do próprio jogador humano (ex.: rendição, F04) —
  //      nunca usado para jogadas de turno normais
  //      não invoca avancarDecisoresCpu em seguida: uma interrupção tipicamente encerra a
  //      sessão (estado.fase === 'fim'); se não encerrar, a sessão permanece 'em_andamento'
  //      com o mesmo decisorAtual de antes, recalculado por proximoDecisor(estado)
```

```
// apps/web/stores/free-duel — Zustand

useSessaoDuelo: {
  sessao: SessaoDuelo;
  iniciar(entrada: { duelistaId; deckJogador; duelista }): Promise<void>;
  submeterAcao(acao: Acao): Promise<void>;
}
```

### Endpoints / RPC / mensagens de rede

Não aplicável — F03 roda 100% offline (PRD F03 Capabilities). Nenhuma chamada de rede é feita por
esta feature; o handshake de versão/hash do modo online (`arquitetura.md` §6) é do Online Duel,
cross-PRD e fora desta versão.

### Contratos externos (cross-PRD)

**A ser fornecido por `packages/engine` (motor-duelo-1x1):**

- **`apply(estado, acao): ResultadoAplicacao`** — dispatcher de ações, emerge de F06–F12. F03
  assume a assinatura de `arquitetura.md` §3.1 e o tipo de retorno já definido por
  motor-duelo-1x1/F02, sem assumir nada sobre como uma ação ilegal é sinalizada além de tratá-la
  com tolerância (Decisão 6, Decisão 12).
- **`Acao`** — união ainda a ser definida por F06–F12. F03 a trata como opaca.
- **`initDuel`, `montarEntradaInicializacao`, `GeradorSeed`** — já especificados por
  motor-duelo-1x1/F03; reusados sem alteração.

**A ser fornecido por `packages/ai` (IA de NPCs, sem PRD):**

- **Implementação real de `AgenteIA`** conforme o `perfil` (`PerfilDificuldade`, free-duel/F01) de
  cada duelista. F03 só declara o tipo da porta e o ponto de injeção
  (`apps/web/lib/free-duel/agente-ia-porta.ts`); a estratégia de decisão em si é inteiramente
  daquele módulo.

**A ser fornecido por `banco-de-cartas` (`packages/data`):**

- **`ConsultaCatalogo`** — usada apenas para satisfazer a defesa em profundidade de
  `montarEntradaInicializacao` (já declarada por especificações anteriores).

**Contratos oferecidos por F03 (consumidos por F04, F05, F08, intra-PRD):**

- **`SessaoDuelo`** e **`interromperSessao`** (Decisão 21) — F04 encaminha a rendição submetendo uma
  `Acao` de rendição (forma a ser definida por `MotorDuelo/F12`) por este canal, que ignora
  `proximoDecisor` de propósito, sem F03 conhecer o conteúdo dessa ação. `submeterAcaoJogador`
  continua sendo o canal exclusivo das jogadas normais de turno de P1 — F04 não o usa.
- **`SessaoDuelo` em `fase: 'encerrada'`** — expõe `estadoFinal: EstadoDuelo` para F05 extrair
  desfecho, motivo e as estatísticas que `MotorDuelo/F05`/F12 definirem, e `idSessaoDuelo` (Decisão
  22) como o identificador estável que F05 repassa a F06/F07 para a idempotência de recompensa
  (`reward_ledger.duel_id`, `arquitetura.md` §5.2) — distinto do `seed` interno ao `EstadoDuelo`.
- **`criarSessaoDuelo`** reexecutável, sem estado global entre chamadas — usado por F08 para a
  revanche (nova sessão, novo `idSessaoDuelo` e novo seed) e para trocar de oponente.

### Exemplo — `EstadoDueloPublico` do ponto de vista de P2 (a entrada real da IA)

```json
{
  "jogadores": {
    "P1": {
      "lp": 8000,
      "mao": { "visivel": false, "quantidade": 5 },
      "deckRestante": 35,
      "campo": {
        "monstros": [
          { "ocupada": true, "carta": { "visivel": false }, "posicao": "defesa_face_baixo", "jaAtacou": false, "jaMudouDePosicao": false },
          { "ocupada": false }, { "ocupada": false }, { "ocupada": false }, { "ocupada": false }
        ],
        "magias": [
          { "ocupada": false }, { "ocupada": false }, { "ocupada": false }, { "ocupada": false }, { "ocupada": false }
        ]
      }
    },
    "P2": {
      "lp": 8000,
      "mao": { "visivel": true, "cartas": ["...5 cartas completas..."] },
      "deckRestante": 35,
      "campo": {
        "monstros": [
          { "ocupada": false }, { "ocupada": false }, { "ocupada": false }, { "ocupada": false }, { "ocupada": false }
        ],
        "magias": [
          { "ocupada": false }, { "ocupada": false }, { "ocupada": false }, { "ocupada": false }, { "ocupada": false }
        ]
      }
    }
  },
  "terrenoAtivo": null,
  "jogadorAtivo": "P1",
  "turno": 3,
  "fase": "batalha"
}
```

Note que `seed` não aparece, `P1.mao` só revela a contagem, e o monstro de P1 em posição
`defesa_face_baixo` tem `carta: { visivel: false }` mesmo estando presente no campo.

### Exemplo — `SessaoDuelo` nos quatro desfechos

```json
{ "fase": "nao_iniciada" }
```

```json
{
  "fase": "em_andamento",
  "idSessaoDuelo": "b3f1c2a4-7e5d-4a2b-9c1e-8f6a7d5b3c2a",
  "duelistaId": "duelista-exemplo",
  "decisorAtual": "P1",
  "estado": { "...EstadoDuelo completo (F01 do motor)...": true }
}
```

```json
{
  "fase": "encerrada",
  "idSessaoDuelo": "b3f1c2a4-7e5d-4a2b-9c1e-8f6a7d5b3c2a",
  "duelistaId": "duelista-exemplo",
  "estadoFinal": { "...EstadoDuelo completo, fase: 'fim'...": true }
}
```

```json
{
  "fase": "falha",
  "idSessaoDuelo": "b3f1c2a4-7e5d-4a2b-9c1e-8f6a7d5b3c2a",
  "duelistaId": "duelista-exemplo",
  "motivo": "ia_indisponivel"
}
```

## 5. Modelo de Dados

Não aplicável. F03, como F01 e F02, não cria tabela Postgres nem estrutura IndexedDB/fila offline
(Decisão 15) — a sessão de duelo vive inteiramente em memória (store Zustand) durante a execução da
partida. Persistir o resultado (estrelas, carta, atualização de `wallets`/`collections`) é de
F06/F07, a partir do `estadoFinal` que F03 apenas retém até o fim da partida.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| Motor recusa iniciar (deck ≠ 40 / carta desconhecida) apesar da verificação de F02/F01 | `montarEntradaInicializacao` devolve erro | `criarSessaoDuelo` devolve `{ fase: 'falha', motivo: 'deck_recusado_pelo_motor' }` | "Não foi possível iniciar o duelo (deck inválido). Verifique seu deck." (PRD F03 Error Handling) |
| Agente de IA lança exceção ou rejeita a promise | `try/catch` em `avancarDecisoresCpu` | Sessão vai para `fase: 'falha'`, `motivo: 'ia_indisponivel'`, incidente registrado | "Falha na IA do oponente; duelo encerrado." (PRD F03 Error Handling) |
| Agente de IA devolve ação que `apply` rejeita | Contrato de rejeição ainda a definir por `MotorDuelo/F06–F12`; tratado com a mesma tolerância da linha acima | Mesmo desfecho da linha acima | Mesma mensagem |
| Loop de decisores CPU excede `MAX_ACOES_CPU_POR_AVANCO` sem decisor P1 nem `fase: 'fim'` | Contador em `avancarDecisoresCpu` | Sessão vai para `fase: 'falha'`, `motivo: 'loop_sem_progresso'`, incidente registrado | "Falha na IA do oponente; duelo encerrado." (mesma mensagem do PRD — causa técnica distinta só no log) |
| Jogador submete ação quando o decisor atual é P2 (UI dessincronizada, duplo clique) | Guarda em `submeterAcaoJogador` | Ação ignorada; sessão devolvida inalterada | nenhuma (ação inerte) |
| Interrupção do app durante a partida (fechar aba, recarregar) | Nenhuma — a sessão vive só na store em memória | Ao reabrir, `sessao` volta a `nao_iniciada`; jogador retorna ao menu do Free Duel | nenhuma (PRD F03 Error Handling, PRD §7 Fora de Escopo) |
| `duelistaId` da rota não corresponde a nenhum duelista do roster (revalidação entre F01 e F03) | `obterDuelista` (F01) falha ao resolver | Retorna à seleção de oponente (F01) com aviso | "Este duelista não está mais disponível. Escolha outro." (mesmo padrão de F01 Error Handling) |
| `deckPronto`/`duelista` ausentes ao entrar diretamente na rota de duelo (navegação fora do fluxo F01→F02→F03) | Guarda de entrada da tela | Redireciona à seleção de oponente (F01) | nenhuma (navegação silenciosa) |

Nenhuma falha é silenciosa para o jogador além das duas marcadas "ação inerte"/"navegação
silenciosa" acima, que não representam erro — são guardas defensivas contra estado de UI
inconsistente, não desfechos de partida (guidelines §8.3, "não engolir erros" aplicado ao que É
erro; ações fora de ordem não são consideradas erro de domínio).

## 7. Estratégia de Testes

### Unitários (Vitest)

`agruparEmComposicao` (`packages/rules`):

- `agruparEmComposicao conta corretamente as repeticoes de cada numero`
- `agruparEmComposicao de uma lista vazia devolve composicao vazia`
- `agruparEmComposicao seguido de expandirComposicao preserva o multiconjunto original`

`obterEstadoPublico` (`packages/rules`) — table-driven:

- `obterEstadoPublico revela a mao completa do proprio jogador`
- `obterEstadoPublico oculta a mao do adversario e expoe apenas a quantidade`
- `obterEstadoPublico revela carta de zona de monstro do adversario quando a posicao e face-cima`
- `obterEstadoPublico oculta a identidade de zona de monstro do adversario quando a posicao e face-baixo`
- `obterEstadoPublico oculta a identidade de zona de magia do adversario quando nao esta virada para cima`
- `obterEstadoPublico revela toda zona do proprio jogador independente de face-cima ou face-baixo`
- `obterEstadoPublico expoe apenas a contagem do deck restante dos dois lados`
- `obterEstadoPublico nunca inclui o campo seed no resultado`
- `obterEstadoPublico preserva terrenoAtivo visivel para os dois jogadores`
- `obterEstadoPublico projeta cartasEnvolvidas do pendente pela mesma regra de visibilidade`
- `obterEstadoPublico nao muta o EstadoDuelo recebido`

`gerador-seed` (`apps/web`):

- `criarGeradorSeedCripto sempre devolve um valor no intervalo 0 a 0xFFFFFFFF`
- `gerarIdSessao sempre devolve uma string nao vazia e nao repete em chamadas consecutivas (checagem estatistica leve)`
- `criarGeradorSeedCripto nao repete o mesmo valor em chamadas consecutivas (checagem estatistica leve)`

`montar-entrada-partida` (`apps/web`):

- `montarEntradaPartida usa a composicao do deckPronto sem transformacao para composicaoP1`
- `montarEntradaPartida agrupa o deck do NPC em composicaoP2 via agruparEmComposicao`
- `montarEntradaPartida repassa o seed recebido sem gerar um novo`
- `montarEntradaPartida omite seed quando nao fornecido`

`sessao-duelo` (`apps/web`) — com fakes de `apply`/`initDuel`/`AgenteIA` (Decisão 13):

- `criarSessaoDuelo entra em fase falha com motivo deck_recusado_pelo_motor quando o motor recusa`
- `criarSessaoDuelo entra em fase em_andamento com o estado inicial quando o motor aceita`
- `criarSessaoDuelo gera um idSessaoDuelo mesmo quando o motor recusa o deck`
- `criarSessaoDuelo preserva o mesmo idSessaoDuelo do inicio ao fim da sessao (em_andamento, encerrada, falha)`
- `proximoDecisor devolve jogadorPodeReagir quando ha janela de reacao aberta`
- `proximoDecisor devolve jogadorAtivo quando nao ha janela de reacao aberta`
- `avancarDecisoresCpu consulta o agente e aplica a acao enquanto o decisor for P2`
- `avancarDecisoresCpu consulta o agente numa janela de reacao mesmo fora do turno da CPU`
- `avancarDecisoresCpu devolve fase em_andamento com decisorAtual P1 quando o controle volta ao jogador`
- `avancarDecisoresCpu devolve fase encerrada quando o estado atinge fase fim`
- `avancarDecisoresCpu devolve fase falha com motivo ia_indisponivel quando o agente lanca excecao`
- `avancarDecisoresCpu devolve fase falha com motivo loop_sem_progresso apos MAX_ACOES_CPU_POR_AVANCO iteracoes`
- `submeterAcaoJogador ignora a acao e devolve a sessao inalterada quando o decisor nao e P1`
- `submeterAcaoJogador aplica a acao de P1 e delega a avancarDecisoresCpu em seguida`
- `submeterAcaoJogador encadeia corretamente quando o proximo decisor apos a acao de P1 e P2`
- `interromperSessao aplica a acao independentemente de decisorAtual (inclusive quando e P2)`
- `interromperSessao nao invoca avancarDecisoresCpu apos aplicar a acao`

`sessao-duelo-store` (`apps/web`):

- `useSessaoDuelo comeca em fase nao_iniciada`
- `useSessaoDuelo.iniciar transiciona para em_andamento ou falha conforme criarSessaoDuelo`
- `useSessaoDuelo.submeterAcao atualiza a sessao apos o retorno de submeterAcaoJogador`

Tela (`tela-duelo`):

- `tela de duelo aciona iniciar automaticamente ao entrar`
- `tela de duelo renderiza o tabuleiro com as 5+5 zonas de cada lado`
- `tela de duelo desabilita a interacao do jogador quando o decisor atual e P2`
- `tela de duelo exibe o aviso de falha com a mensagem do motor quando fase e falha com deck_recusado_pelo_motor`
- `tela de duelo exibe o aviso de falha de IA quando fase e falha com ia_indisponivel ou loop_sem_progresso`
- `tela de duelo redireciona a selecao de oponente quando deckPronto ou duelista estao ausentes`

### Property-based (fast-check)

- **Round-trip de agrupamento:** para todo multiset de 40 `numero` com no máximo 3 repetições,
  `expandirComposicao(agruparEmComposicao(numeros))` é uma permutação de `numeros` (mesmo
  multiconjunto).
- **Sigilo da projeção pública:** para todo `EstadoDuelo` sintético e todo `paraJogador`,
  `obterEstadoPublico` nunca inclui, em nenhum campo da saída, a identidade de uma carta que está
  na mão do adversário ou numa zona face-baixo do adversário — verificado varrendo recursivamente
  o JSON de saída em busca de qualquer `numero` que só deveria existir do lado oculto.
- **Simetria da própria mão:** para todo `EstadoDuelo` e todo `paraJogador`, a mão projetada do
  próprio `paraJogador` tem exatamente os mesmos `numero`, na mesma ordem, da mão original.
- **Terminação do loop de decisores:** para todo agente de IA fake que sempre devolve uma ação
  válida que avança o turno (nunca reabre janela), `avancarDecisoresCpu` termina em no máximo
  `MAX_ACOES_CPU_POR_AVANCO` iterações, sempre em `em_andamento` ou `encerrada`, nunca em `falha`.
- **Nunca falha para o próprio jogador:** para toda sessão `em_andamento` com `decisorAtual === 'P1'`
  e qualquer `Acao` sintética, `submeterAcaoJogador` nunca lança — devolve sempre uma `SessaoDuelo`
  válida (mesmo que o fake de `apply` rejeite a ação, o resultado é uma sessão bem formada).

### Integração

- `apps/web/tests/free-duel-orquestracao.integration.test.ts` — exercita
  `montarEntradaPartida` → `criarSessaoDuelo` → `avancarDecisoresCpu` com o `initDuel`/
  `montarEntradaInicializacao` reais (quando `packages/engine` existir) ou os fakes documentados
  (Decisão 13) até lá, e com o `agente-ia-fake`, confirmando que o handoff de F01 (duelista) + F02
  (deckPronto) produz uma sessão `em_andamento` consistente com `EstadoDueloSchema`.

### Análise estática

- `packages/rules/src/visibilidade/**` importa apenas `packages/shared` — nunca `data`, `engine`,
  `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase.
- `packages/rules/src/deck/composicao.ts` (alterado) continua sem importar nada além de
  `packages/shared`.
- **Nenhum arquivo de `apps/web` sob `free-duel/duelo` importa `packages/ai` diretamente** — toda
  integração com o agente real passa por `agente-ia-porta.ts` (ponto único de injeção), verificável
  por regra de `dependency-cruiser`.
- **Nenhum arquivo desta feature contém uma checagem de legalidade de jogada** (ex.: comparação de
  `atk`/`def`, contagem de invocações por turno) — toda decisão de regra passa por `apply`,
  reforçado por revisão da fronteira (não há uma regra de lint automatizável para "ausência de
  lógica de combate", mas os testes de `sessao-duelo` usam fakes que provam que F03 nunca precisa
  inspecionar o resultado de `apply` além de `estado`/`eventos`).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F03) | Teste |
|---|---|
| Inicia o duelo entregando ao `MotorDuelo/F03` o deck do jogador e o deck do NPC + seed; jogador é P1 e CPU é P2 | `montarEntradaPartida usa a composicao do deckPronto sem transformacao para composicaoP1` + `montarEntradaPartida agrupa o deck do NPC em composicaoP2 via agruparEmComposicao` + `criarSessaoDuelo entra em fase em_andamento com o estado inicial quando o motor aceita` |
| Turnos da CPU usam as ações da IA de NPCs conforme o perfil do oponente; Free Duel não valida regras nem decide jogadas | `avancarDecisoresCpu consulta o agente e aplica a acao enquanto o decisor for P2` + `avancarDecisoresCpu consulta o agente numa janela de reacao mesmo fora do turno da CPU` + análise estática (nenhuma checagem de legalidade em `apps/web`) |
| Nenhuma regra de combate é reimplementada no Free Duel (todo desfecho vem de `MotorDuelo/F12`) | Análise estática (`packages/rules/src/visibilidade` e `apps/web/lib/free-duel/sessao-duelo.ts` só transportam `Acao`/`ResultadoAplicacao`, nunca os interpretam) + `submeterAcaoJogador aplica a acao de P1 e delega a avancarDecisoresCpu em seguida` |
| Recusa do motor ao iniciar (deck inválido) aborta com mensagem específica; falha da IA encerra a partida com segurança sem travar o jogador | `criarSessaoDuelo entra em fase falha com motivo deck_recusado_pelo_motor quando o motor recusa` + `avancarDecisoresCpu devolve fase falha com motivo ia_indisponivel quando o agente lanca excecao` + `avancarDecisoresCpu devolve fase falha com motivo loop_sem_progresso apos MAX_ACOES_CPU_POR_AVANCO iteracoes` + `tela de duelo exibe o aviso de falha...` (ambas variantes) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Fluxo completo de vitória: F01 escolhe oponente → F02 valida deck → F03 conduz o duelo → F05 apura resultado..." | `free-duel-orquestracao.integration.test.ts` estabelece o trecho F01→F02→F03 (sessão `em_andamento` consistente); a cadeia completa até F05 só é testável quando aquela feature existir — mesma limitação já registrada por `motor-duelo-1x1`/F03 §7 |
| Cross-Feature: em derrota/empate (inclusive por rendição/abandono de F04), F06 e F07 não disparam | Fora do alcance direto de F03 (a sessão apenas retém `estadoFinal`); o teste de contrato aqui é que `SessaoDuelo.encerrada.estadoFinal` é o único artefato que F05/F06/F07 recebem — nenhum caminho paralelo de recompensa existe nesta feature |
| Cross-PRD (Motor de Duelo): "todo o desfecho e o snapshot vêm de `MotorDuelo/F12`/`F05`; o Free Duel não reimplementa regras" | Análise estática (nenhuma checagem de legalidade em `apps/web`) + testes de `sessao-duelo` com fakes provam que F03 só transporta `Acao`/`ResultadoAplicacao` |
| Cross-PRD (IA de NPCs): "o lado CPU (P2) é conduzido pelo agente conforme o perfil de dificuldade do oponente do roster" | `avancarDecisoresCpu consulta o agente e aplica a acao enquanto o decisor for P2` + teste de contrato: o `perfilCpu` passado ao agente é exatamente o `PerfilDificuldade` que F01 provê para o `duelistaId` da sessão |
| Cross-PRD (Build Deck, indireto via F02): nenhum rascunho não salvo chega ao duelo | Já garantido por F02 (Decisão de F02); F03 só consome `DeckPronto`, nunca lê o store de rascunho — reforçado por análise estática (nenhum import do store de rascunho de `build-deck`/F05 em `apps/web/lib/free-duel/**`) |
