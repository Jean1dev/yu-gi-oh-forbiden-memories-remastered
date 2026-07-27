# Rendição e Abandono

> PRD: `docs/prds/free-duel.md` — F04
> Pacote-alvo: `apps/web` (consome contratos de `free-duel`/F03, já especificada, em
> `packages/shared`/`apps/web/lib/free-duel`)

## 1. Contexto e Escopo

F04 é a feature que permite ao jogador **encerrar um duelo antes do fim natural**, de duas formas
equivalentes: acionando "Render-se" explicitamente, ou tentando **sair da tela de duelo** enquanto
a partida está em andamento. As duas formas convergem para o **mesmo** fluxo técnico: uma
confirmação obrigatória e, ao confirmar, o encaminhamento de uma **rendição** ao motor através de
`interromperSessao` — o canal que **F03** expõe especificamente para ações que o jogador pode
disparar "a qualquer momento", ignorando de propósito quem é o `proximoDecisor` no instante
(`docs/specs/free-duel/F03-orquestracao-da-partida/spec.md`, Decisão 21). F04 **não** usa
`submeterAcaoJogador` (o canal de jogadas normais de turno de F03): aquele canal recusa
silenciosamente qualquer ação quando não é a vez de P1, o que impediria uma rendição disparada
durante a janela — ainda que breve — em que a sessão está `em_andamento` com o decisor sendo a CPU.
F04 nunca decide localmente que o jogador perdeu — quem declara a derrota, com motivo `rendicao`, é
o **Motor de Duelo 1x1** (`MotorDuelo/F12`, cross-PRD). Isso é consequência direta do pilar "motor
headless determinístico" (ADR-002): qualquer novo caminho de encerramento de partida entra pelo
contrato do motor, nunca por um atalho de UI.

A feature pertence à **Fase 3** do roadmap (`arquitetura.md` §9 — "Free Duel vs IA") e à **Wave 3**
do PRD (junto de F05), depois de F03 ter estabelecido o backbone de runtime da sessão. F04 **não é
Foundation** do módulo (as Foundations são F01 e F03, PRD §8 Parte 2) — ela é uma camada fina sobre
a sessão que F03 cria, e por isso vive quase inteiramente em `apps/web`: não há regra de combate,
cálculo de nota ou recompensa aqui (isso é de F05/F06/F07, fora de escopo desta spec).

Dado o tamanho real do problema — encaminhar uma ação ao motor com confirmação de UI —, esta spec é
propositalmente mais enxuta que a de F03: a Seção 5 (Modelo de Dados) é omitida porque a feature não
introduz tabela, cache local nem arquivo de dados versionado (nenhuma escrita de qualquer natureza
ocorre aqui; ver Decisão 10).

### Incluído

- Ação de "Render-se" acessível a **qualquer momento** durante a fase `em_andamento` da sessão de
  duelo (F03), inclusive fora do turno do jogador (PRD F04 Capabilities: "a qualquer momento")
- Diálogo de confirmação **obrigatório e único**, reutilizado tanto pelo botão explícito de
  render-se quanto pela tentativa de sair da tela do duelo, com a mensagem exata do PRD
- Interceptação de tentativas de **navegação para fora da tela de duelo** enquanto a sessão está
  `em_andamento`, redirecionando para o mesmo diálogo de confirmação em vez de deixar a saída
  ocorrer sem aviso
- Encaminhamento da rendição confirmada ao motor via `interromperSessao` (F03) — F04 constrói a
  intenção, nunca o resultado
- Guarda de **idempotência de UI**: uma tentativa de render/abandono quando a sessão já não está
  `em_andamento` é ignorada silenciosamente (PRD F04 Error Handling)
- Tratamento documentado (não ativo) do **fechamento abrupto de aba/app**: nenhuma ação de motor é
  disparada nesse caso; o comportamento de derrota é consequência da sessão não persistida que F03
  já decidiu (ver Decisão 8)

### Adiado

Não aplicável — o bloco F04 do PRD não tem divisão `Core Scope`/`Full Scope additions` (só
`Consumes`, `Capabilities`, `Experience`, `Error Handling`); a spec cobre o escopo completo da
feature (Decisão 14).

### Fronteiras

Delimitadas pela Seção 7 do PRD (Fora de Escopo) e pelos blocos Consumes/Provides vizinhos:

- **Cálculo de nota, motivo de encerramento e resolução de regras** → **Motor de Duelo 1x1**
  (`MotorDuelo/F12`, cross-PRD). F04 não decide que o duelo terminou nem qual é o motivo — apenas
  constrói e envia a intenção de rendição.
- **Exibição do resultado, nota e recompensa** → **F05**. F04 não renderiza tela de resultado; ao
  confirmar a rendição, a transição de fase da sessão é o que aciona F05 a assumir a tela.
- **Concessão de carta e crédito de estrelas** → **F06/F07**. F04 não invoca nem bloqueia essas
  features explicitamente — elas simplesmente não disparam porque só reagem a **vitória** (suas
  próprias specs), e uma rendição nunca produz vitória do jogador.
- **Retomar duelo em andamento após fechamento abrupto** → fora de escopo desta versão (PRD §7);
  já decidido por F03 que nenhuma sessão em andamento é persistida. F04 não introduz persistência
  para viabilizar retomada.
- **Histórico de partidas / registro de abandono para estatísticas** → fora desta versão (PRD §7,
  candidato ao módulo Save). F04 não grava nada.
- **Renderização fina, animação e som** → camada de apresentação (PRD §7). Esta spec descreve
  fluxo, guardas e mensagens, não estética do diálogo.

### Contratos externos assumidos

- **F03 (interno ao PRD, Foundation) — `SessaoDuelo` e `interromperSessao`.**
  `docs/specs/free-duel/F03-orquestracao-da-partida/spec.md` já especifica os dois: `SessaoDuelo` é
  uma união discriminada por `fase` (`nao_iniciada | em_andamento | encerrada | falha`), onde o
  ramo `em_andamento` carrega `{ duelistaId, estado: EstadoDuelo, decisorAtual: JogadorId }` e o
  ramo `encerrada` carrega `{ duelistaId, estadoFinal: EstadoDuelo }`. `interromperSessao(sessao,
  acao, deps)` aplica uma `Acao` ao estado corrente **sem checar `proximoDecisor`** (F03, Decisão
  21) — reservada a ações de interrupção como a rendição, nunca a jogadas de turno normais (essas
  usam `submeterAcaoJogador`, que F04 **não** chama). F04 reusa `interromperSessao` exatamente como
  especificado — nunca cria um terceiro canal para levar ações ao motor.
- **`MotorDuelo/F12` (cross-PRD, sem spec própria) — Acao de rendição.** O motor precisa reconhecer
  uma variante de `Acao` que, submetida via `apply` (por trás de `interromperSessao`), encerra o
  duelo com `estado.fase === 'fim'` e o jogador local como perdedor. F04 **não define** a forma
  interna de `Acao` nem do motor, nem a forma como F05 decodificará vencedor/motivo a partir do
  `estadoFinal: EstadoDuelo` que `SessaoDuelo.encerrada` expõe — apenas declara o comportamento
  esperado e o consome. Detalhe em Seção 4.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O contrato de F03 (`SessaoDuelo`, `interromperSessao`, `submeterAcaoJogador`, `proximoDecisor`) é consumido conforme a spec real de F03 (`docs/specs/free-duel/F03-orquestracao-da-partida/spec.md`, reconciliada após a geração paralela do lote). | `free-duel`/F03, spec real | confirmada |
| 2 | F04 **reusa exclusivamente `interromperSessao`** (F03) para encaminhar a rendição — não usa `submeterAcaoJogador`, não cria um segundo canal de submissão de ação, e não chama `apply`/`initDuel` diretamente. `interromperSessao` é o canal correto porque `submeterAcaoJogador` recusa silenciosamente qualquer ação quando `decisorAtual !== 'P1'` (comportamento correto para jogadas de turno, mas incompatível com uma rendição que precisa funcionar "a qualquer momento"). Consistente com o pilar "motor headless" (ADR-002): toda ação do jogador passa por um ponto de entrada do motor, nunca por um atalho de UI — apenas o ponto certo entre os dois que F03 oferece. | ADR-002 §6; `free-duel`/F03 (Decisão 21) | confirmada |
| 3 | **Render-se e abandono convergem para um único fluxo técnico**: o mesmo diálogo de confirmação, com o mesmo texto, e a mesma chamada de encaminhamento ao motor. A Experience do PRD já descreve os dois gatilhos levando ao mesmo diálogo ("O jogador aciona 'Render-se' (ou tenta sair da partida). Um diálogo confirma [...]"). Evita duplicar lógica de confirmação e mensagens entre dois caminhos que o PRD já trata como equivalentes. | PRD F04 Experience; guidelines §24 regra 1 (simplicidade) | confirmada |
| 4 | **Render-se fica disponível a qualquer momento**, inclusive fora do turno do jogador — a submissão da rendição não é condicionada por `proximoDecisor`. Isso é exatamente o que `interromperSessao` (F03, Decisão 21) garante: aplica a ação ignorando `proximoDecisor` de propósito. F04 não precisa de nenhuma lógica própria de bypass de turno — só precisa chamar o canal certo. | PRD F04 Capabilities ("render-se a qualquer momento"); `free-duel`/F03 (Decisão 21) | confirmada |
| 5 | **Confirmação é sempre obrigatória**, mesmo quando o gatilho é uma tentativa de navegação (não apenas o botão "Render-se"). Não existe caminho que encaminhe a rendição sem o jogador confirmar explicitamente o diálogo. | PRD F04 Capabilities ("exige confirmação explícita antes de render/abandonar") | confirmada |
| 6 | **Idempotência por checagem de fase, não por flag própria.** Antes de encaminhar a rendição, F04 relê `sessao.fase`; se não for mais `em_andamento` (o duelo já terminou por qualquer motivo, inclusive entre o clique e a confirmação), a ação é um no-op silencioso — sem diálogo, sem log de erro, sem mensagem ao jogador. Cobre exatamente o critério do PRD ("render após o duelo terminado não tem efeito") e a corrida em que o motor encerra por `lp_zerado`/`deck_out` no instante em que o jogador confirma. | PRD F04 Error Handling; PRD §9 F04 critério 3 | confirmada |
| 7 | **Nenhuma penalidade extra e nenhuma recompensa são código desta feature.** F04 não debita estrelas, não grava histórico e não bloqueia explicitamente F06/F07 — elas simplesmente não reagem porque, por design própria delas, só disparam em vitória do jogador. F04 apenas garante que o desfecho (derrota) flua pelo motor como qualquer outro. | PRD F04 Capabilities ("sem recompensa [...] e sem penalidade extra"); specs (futuras) de F06/F07 só reagem a vitória | confirmada |
| 8 | **Fechamento abrupto de aba/app não aciona nenhum código desta feature.** Não é implementado um handler de `beforeunload`/`pagehide` que tenta submeter a rendição de forma síncrona antes do fechamento: (a) esses eventos não garantem execução de trabalho assíncrono; (b) como F03 já decidiu não persistir sessão em andamento, não há nada a "salvar" mesmo se o handler rodasse — a próxima abertura do app não encontra duelo para retomar, o que já é funcionalmente uma derrota sem crédito de vitória. Adicionar um handler best-effort aumentaria a complexidade sem mudar o resultado observável. | PRD F04 Error Handling ("fechamento abrupto [...] tratado como abandono/derrota da sessão corrente; nenhum estado [...] é retomado"); guidelines §24 regra 1 (simplicidade) | confirmada |
| 9 | O diálogo de confirmação **não distingue** textualmente a origem (render explícito vs. tentativa de saída) — usa a mesma mensagem nos dois casos, refletindo a Experience do PRD, que descreve um único texto de confirmação para ambos os gatilhos. Um campo interno de origem pode existir apenas para telemetria futura, nunca para alterar o comportamento. | PRD F04 Experience (mensagem única citada) | confirmada |
| 10 | **Nenhuma tabela Postgres, cache local (IndexedDB) ou arquivo de dados versionado é criado ou tocado por esta feature.** F04 não persiste nada — nem o pedido de rendição, nem um registro de abandono. É por isso que a Seção 5 (Modelo de Dados) é omitida desta spec. | PRD F04 Capabilities/Error Handling; `arquitetura.md` §5.1/§5.4 (nenhuma linha nova a criar) | confirmada |
| 11 | **Nenhum tipo ou schema novo é declarado em `packages/shared` por F04.** A feature consome `SessaoDuelo`/`interromperSessao` (de F03, já especificados) e a Acao de rendição (de `MotorDuelo/F12`, cross-PRD, sem spec própria) sem redefini-los. Enquanto `packages/engine` (o dispatcher `apply` real) e a Acao de rendição não existirem em código, os testes desta feature usam dublês locais que espelham o comportamento descrito na Seção 4 — nunca uma implementação paralela. | `free-duel`/F03 (contratos já especificados); ADR-001 §6 (fronteiras entre pacotes) | confirmada |
| 12 | **Convenção de pastas em `apps/web`** segue o padrão sem `src/` já adotado por `free-duel` F01/F02 (`apps/web/lib/free-duel/`, `apps/web/components/free-duel/`, `apps/web/hooks/`), por ser feature irmã do mesmo módulo. A convergência com a convenção `apps/web/src/lib/` de `build-deck` F01 continua em aberto (já registrada como pendência por F02, Decisão 19). | precedentes `free-duel` F01 §2, `free-duel` F02 (Decisão 19) | confirmada |
| 13 | **Nenhuma tabela de dado externo pendente (guardião, terreno, fusão, drop, rating, balanceamento) toca F04.** A feature não lida com economia, nota nem drop — apenas com o encaminhamento de uma intenção de encerramento. Não se aplica fallback neutro aqui. | `arquitetura.md` §10; PRD §7 e §9 | não se aplica |
| 14 | Esta feature não tem divisão Core/Full Scope no PRD — a spec cobre o **escopo completo** de F04. | PRD §6 F04 | confirmada |
| 15 | Não existe código de implementação no repositório: nem `packages/` nem `apps/`. A Camada 0 (arquitetura + ADRs + guidelines + specs precedentes de `free-duel` F01/F02) é a única fonte de padrões desta spec. | estado do repositório; precedentes `free-duel` F01 (Decisão 20), F02 (Decisão 21); auto-aceite: "Sem código ainda" | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `apps/web/lib/free-duel/mensagens-rendicao.ts` | web | novo | Texto exato do PRD para o diálogo de confirmação — fonte única, sem duplicar em cada gatilho |
| `apps/web/lib/free-duel/acionar-rendicao.ts` | web | novo | `podeRenderSe` e `acionarRendicao` — guarda de idempotência (Decisão 6) + encaminhamento a `interromperSessao` (F03) |
| `apps/web/lib/free-duel/interceptar-saida-duelo.ts` | web | novo | Interceptação de tentativas de navegação para fora da tela de duelo enquanto a sessão está `em_andamento` |
| `apps/web/hooks/use-rendicao.ts` | web | novo | Hook fino: estado do diálogo (aberto/fechado), `confirmar`/`cancelar`, conectando os dois gatilhos ao mesmo fluxo (Decisão 3) |
| `apps/web/components/free-duel/botao-render-se.tsx` | web | novo | Controle "Render-se" a ser integrado à tela de duelo de F03; visível/habilitado apenas durante `em_andamento` |
| `apps/web/components/free-duel/dialogo-confirmar-rendicao.tsx` | web | novo | Diálogo de confirmação compartilhado pelos dois gatilhos, com a mensagem de `mensagens-rendicao.ts` |
| `apps/web/lib/free-duel/acionar-rendicao.test.ts` | web | novo | Unitários de `podeRenderSe`/`acionarRendicao`: idempotência, independência de turno |
| `apps/web/lib/free-duel/interceptar-saida-duelo.test.ts` | web | novo | Unitários da interceptação de navegação: bloqueia durante `em_andamento`, permite fora dela |
| `apps/web/hooks/use-rendicao.test.ts` | web | novo | Unitários do hook: abrir por render explícito, abrir por tentativa de saída, confirmar, cancelar |
| `apps/web/components/free-duel/dialogo-confirmar-rendicao.test.tsx` | web | novo | Unitários de tela: mensagem exata, ação só ocorre ao confirmar |
| `apps/web/components/free-duel/botao-render-se.test.tsx` | web | novo | Unitários de tela: disponibilidade do botão por fase da sessão |
| `apps/web/tests/rendicao.integration.test.ts` | web | novo | Integração com um dublê do contrato de F03/MotorDuelo simulando a transição para `encerrada`/`motivo: 'rendicao'` |

**Verificação da direção de dependências:**

- Todos os arquivos desta feature vivem em `apps/web`. Nenhum arquivo importa `packages/engine`,
  `packages/rules`, `packages/ai`, `packages/data` ou `apps/server` — a única fronteira de domínio
  tocada é o ponto de interrupção já estabelecido por F03 (`interromperSessao`), que por sua vez
  encapsula a chamada ao motor (`arquitetura.md` §3.1).
- `packages/shared` é importado para os tipos `SessaoDuelo` e (quando existir) a Acao de rendição —
  como o dispatcher `apply` real e a Acao de rendição ainda não existem em código (Contratos
  externos assumidos), os testes desta feature usam dublês locais que espelham exatamente o
  contrato descrito na Seção 4, nunca uma implementação paralela (Decisão 11).
- Nenhum arquivo desta feature toca `packages/engine` diretamente: não há PRNG, não há estado de
  duelo próprio e não há chamada a `apply`/`initDuel`. A direção `shared ← data ← rules ← engine ←
  ai` de `arquitetura.md` §2 não é tensionada — `web` aparece só como consumidor do contrato de F03.
- Nenhuma escrita em Supabase, IndexedDB ou fila de mutações offline (Decisão 10) — não há
  `apps/web` importando cliente Supabase nesta feature.

## 3. Design Técnico

### Estruturas de dados

**`EstadoDialogoRendicao`** (interno a `apps/web`, não exportado de `packages/shared`) — estado
efêmero de UI do hook `useRendicao`:

| Campo | Tipo | Semântica |
|---|---|---|
| `aberto` | `boolean` | Se o diálogo de confirmação está sendo exibido |

Não há campo de "origem" com efeito no comportamento (Decisão 9): o mesmo estado serve tanto ao
clique em "Render-se" quanto à interceptação de saída.

**Contratos consumidos, não declarados por F04** (ver Seção 4 para o detalhe):

- `SessaoDuelo` (de F03) — união discriminada por `fase`: `nao_iniciada | em_andamento | encerrada
  | falha`; o ramo `em_andamento` carrega `estado: EstadoDuelo`, o ramo `encerrada` carrega
  `estadoFinal: EstadoDuelo`.
- `interromperSessao(sessao, acao, deps)` (de F03) — aplica uma `Acao` ao estado corrente sem
  checar `proximoDecisor`.
- A Acao de rendição (de `MotorDuelo/F12`) — variante opaca de `Acao` que F04 apenas constrói e
  repassa, sem inspecionar seus campos internos além do necessário para a chamada.

### Fluxo

1. **Gatilho.** O jogador aciona o botão "Render-se" (sempre visível/habilitado durante
   `em_andamento`, Decisão 4) **ou** tenta sair da tela de duelo (navegação, botão voltar, link de
   menu) enquanto a sessão está `em_andamento`.
2. **Interceptação de saída.** Quando o gatilho é uma tentativa de navegação,
   `interceptarSaidaDuelo` verifica a fase da sessão: se **não** está `em_andamento`, a navegação
   segue normalmente, sem interferência; se está `em_andamento`, a navegação é cancelada
   imediatamente e o mesmo diálogo de confirmação do render-se explícito é aberto (Decisão 3).
3. **Diálogo.** Exibe a mensagem exata do PRD: "Render-se conta como derrota. Confirmar?", com ações
   Confirmar e Cancelar (Decisão 9).
4. **Cancelar.** Fecha o diálogo sem submeter nada ao motor; se a origem foi uma tentativa de
   navegação, essa navegação **não** ocorre — o jogador permanece na partida.
5. **Confirmar — guarda de idempotência.** `acionarRendicao` relê `sessao.fase` no momento da
   confirmação (não no momento em que o diálogo abriu). Se não for mais `em_andamento` — o duelo já
   terminou por outro motivo entre a abertura do diálogo e a confirmação —, a chamada é um no-op
   silencioso: fecha o diálogo, não encaminha nada, não exibe mensagem (Decisão 6).
6. **Confirmar — encaminhamento.** Se ainda `em_andamento`, F04 constrói a intenção de rendição e
   chama `interromperSessao(sessao, acaoDeRendicao, deps)` (F03), que aplica a ação
   **independentemente de qual lado é o `proximoDecisor`** no momento (Decisão 4) — a rendição não
   respeita turno, por desenho do próprio canal.
7. **Resultado esperado do motor.** `interromperSessao` devolve a `SessaoDuelo` atualizada;
   espera-se `fase: 'encerrada'` com `estadoFinal.fase === 'fim'` refletindo a derrota do jogador
   local por rendição. F04 **não decodifica** vencedor/motivo a partir de `estadoFinal` — essa
   tradução é de F05 (consumindo `MotorDuelo/F12`), fora do escopo desta feature (contrato externo
   assumido, Seção 4).
8. **Handoff a F05.** A tela de duelo (F03) observa a transição de `fase` da sessão e cede lugar à
   tela de resultado (F05), que lê `motivo: 'rendicao'` e não exibe nota nem recompensa. F04 não
   participa dessa exibição — seu trabalho termina no passo 7.
9. **Fechamento abrupto de aba/app.** Nenhuma ação desta feature roda. Como F03 não persiste sessão
   em andamento, a próxima abertura do Free Duel não encontra duelo para retomar — o que já
   satisfaz "conta como derrota" sem exigir nenhum código de F04 (Decisão 8).
10. **Após o fim do duelo.** Uma vez `fase !== 'em_andamento'`, o botão "Render-se" deixa de ser
    exibido/habilitado (ele é parte da tela de duelo de F03, que já cede lugar a F05); qualquer
    tentativa residual de acioná-lo cai na guarda do passo 5.

### Regras de negócio

- **Disponibilidade irrestrita por turno:** render-se funciona a qualquer momento de
  `em_andamento`, inclusive fora do turno do jogador (PRD F04 Capabilities; Decisão 4).
- **Confirmação sempre obrigatória**, sem exceção para nenhum dos dois gatilhos (Decisão 5).
- **Idempotência por releitura de fase no momento da confirmação**, não por uma flag de "já
  enviado" mantida localmente — a fonte da verdade é sempre a `SessaoDuelo` atual (Decisão 6).
- **Sem penalidade extra e sem recompensa** — nenhuma escrita de estrelas, coleção ou histórico
  nesta feature (Decisão 7).
- **Sem tratamento ativo de fechamento abrupto** — nenhum handler de `beforeunload`/`pagehide`
  tenta submeter rendição de forma síncrona (Decisão 8).

**Não-regras (explicitamente ausentes):** F04 não calcula LP, turno, motivo de derrota por
`lp_zerado`/`deck_out`, nota ou recompensa; não decide se o jogador venceu ou perdeu — apenas
constrói e encaminha a intenção de rendição, e o motor decide o resto.

### Eventos

Esta feature não emite nem consome eventos de domínio do motor ou do Effect System (nenhum
`onSummon`/`onAttackDeclared` aqui). Os únicos "eventos" são de nível de UI/navegação:

- **Abertura do diálogo** — disparada pelo clique em "Render-se" ou pela interceptação de saída.
- **Confirmação** — único ponto que produz a chamada a `interromperSessao`.
- **Transição de fase da sessão** (`em_andamento` → `encerrada`) — observada por F03/F05, não
  produzida por F04; F04 apenas a desencadeia ao confirmar.

### Determinismo e pureza

Não se aplica a `packages/engine` diretamente — F04 nunca chama `apply`/`initDuel` nem introduz
PRNG; toda mutação de estado de duelo acontece dentro do motor, por trás de `interromperSessao`
(F03). As garantias que **são** exigidas desta feature:

- `podeRenderSe(sessao)` é uma função **pura e total**: mesma `SessaoDuelo` de entrada produz o
  mesmo booleano, sem I/O, sem relógio, sem aleatoriedade.
- A construção da intenção de rendição é determinística: dado o mesmo jogador local, produz sempre
  a mesma Acao (nenhum campo aleatório ou dependente de tempo é necessário para expressar
  "render-se").
- Nenhuma função desta feature muta a `SessaoDuelo` recebida; `acionarRendicao` devolve o resultado
  de `interromperSessao` sem side-effects adicionais sobre o objeto de entrada.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

**Nenhum tipo ou schema novo é declarado por F04** (Decisão 11). A feature consome:

- `SessaoDuelo` — de F03: união discriminada por `fase` (`nao_iniciada | em_andamento | encerrada |
  falha`).
- `interromperSessao` — de F03: aplica uma `Acao` ao estado corrente sem checar `proximoDecisor`.
- Uma Acao de rendição — assumida de `MotorDuelo/F12` (cross-PRD, sem spec própria): variante de
  `Acao` reconhecida por `apply` como pedido de rendição de um jogador específico.

### Funções públicas

```
// apps/web/lib/free-duel — orquestração fina sobre o contrato de F03

podeRenderSe(sessao: SessaoDuelo): boolean
  // pós: true sse sessao.fase === 'em_andamento'
  // pura e total (Seção 3, Determinismo e pureza)

acionarRendicao(
  sessao: SessaoDuelo,
  jogadorLocal: JogadorId,
  deps: { apply: (estado: EstadoDuelo, acao: Acao) => ResultadoAplicacao },
): SessaoDuelo
  // pré: nenhuma — a função é segura de chamar em qualquer fase
  // pós: se podeRenderSe(sessao) é falso, devolve a sessao inalterada (no-op, Decisão 6)
  //      caso contrário, devolve
  //        interromperSessao(sessao, acaoDeRendicaoPara(jogadorLocal), deps)
  //      que ignora proximoDecisor de propósito (F03, Decisão 21)
  //      espera-se, no caminho de sucesso do motor: sessao.fase === 'encerrada'; a decodificação
  //      de vencedor/motivo a partir de estadoFinal é responsabilidade de F05, não desta função
```

```
// apps/web/lib/free-duel/interceptar-saida-duelo.ts

interceptarSaidaDuelo(
  sessao: SessaoDuelo,
  abrirDialogoDeConfirmacao: () => void,
): 'bloqueada' | 'permitida'
  // pós: sessao.fase === 'em_andamento' ⇒ cancela a navegação, chama
  //        abrirDialogoDeConfirmacao() e devolve 'bloqueada'
  //      caso contrário ⇒ não interfere e devolve 'permitida'
```

```
// apps/web/hooks/use-rendicao.ts — adaptador React fino, sem regra

useRendicao(sessao: SessaoDuelo, jogadorLocal: JogadorId): {
  dialogoAberto: boolean;
  abrirPorRenderExplicito: () => void;
  abrirPorTentativaDeSaida: () => void; // usado por interceptarSaidaDuelo
  confirmar: () => void;                // chama acionarRendicao internamente
  cancelar: () => void;
  disponivel: boolean;                  // = podeRenderSe(sessao), para o BotaoRenderSe
}
```

### Endpoints / RPC / mensagens de rede

Não aplicável. F04 não faz nenhuma chamada de rede nem RPC — toda a interação é local, através do
contrato de sessão de F03 (que por sua vez roda o motor no cliente, 100% offline conforme PRD F03
Capabilities).

### Contratos externos (cross-PRD e intra-PRD já materializados)

**Fornecido por F03 (`SessaoDuelo`, `interromperSessao`) — intra-PRD, já especificado:**

Forma real de `SessaoDuelo` (`docs/specs/free-duel/F03-orquestracao-da-partida/spec.md`, Seção 4),
antes da rendição:

```json
{
  "fase": "em_andamento",
  "duelistaId": "duelista-exemplo",
  "decisorAtual": "P1",
  "estado": { "...EstadoDuelo completo (motor-duelo-1x1 F01/F02)...": true }
}
```

Após `acionarRendicao` confirmar (via `interromperSessao`), espera-se a sessão no ramo `encerrada`:

```json
{
  "fase": "encerrada",
  "duelistaId": "duelista-exemplo",
  "estadoFinal": { "...EstadoDuelo completo, fase: 'fim'...": true }
}
```

`SessaoDuelo.encerrada` **não** carrega um campo `resultado`/`vencedor`/`motivo` já decodificado —
apenas o `estadoFinal: EstadoDuelo` bruto. A tradução desse estado em vencedor/perdedor/motivo
(`lp_zerado | deck_out | rendicao | empate`, vocabulário do PRD F05) é responsabilidade de **F05**
(consumindo `MotorDuelo/F12`), não de F04. F04 só garante que a `Acao` de rendição chegou ao motor
e que a sessão transitou para `encerrada`.

- `interromperSessao(sessao, acao, deps)` é o **único** canal usado por F04 para levar a rendição
  ao motor — distinto de `submeterAcaoJogador`, que outras ações de turno normal (jogadas de P1)
  usam. F04 não conhece o conteúdo de `Acao` além de construir a variante de rendição.
- `proximoDecisor` **não é consultado** por F04 antes de encaminhar a rendição (Decisão 4) —
  `interromperSessao` já ignora esse valor por desenho (F03, Decisão 21).

**A ser fornecido por `MotorDuelo/F12` (cross-PRD, sem spec própria):**

- Uma variante de `Acao` que expressa "o jogador `X` se rende", aceita por `apply` **em qualquer
  momento** de `fase !== 'fim'` do estado de duelo, independentemente de quem é o jogador ativo.
- Ao ser aplicada, o motor deve produzir um estado com `fase: 'fim'` (refletido por F03 como
  `SessaoDuelo.fase: 'encerrada'`) cujo resultado identifica o autor da rendição como perdedor e o
  motivo como `'rendicao'` — o mesmo vocabulário de motivo citado pelo PRD F05
  (`lp_zerado | deck_out | rendicao | empate`).
- F04 não define o nome do discriminador da Acao, seus campos ou onde ela entra na união `Acao` de
  `packages/shared` — apenas a função `acionarRendicao` (Seção 4, Funções públicas) encapsula essa
  construção, para que o restante da feature (diálogo, interceptação, guarda de idempotência)
  permaneça estável mesmo quando a forma real da Acao for definida.

## 5. Modelo de Dados

Não aplicável — omitida (Decisão 10). F04 não cria tabela Postgres, não introduz store de
IndexedDB e não versiona arquivo de dados: não há nenhuma escrita nesta feature, em nenhuma
camada. Toda persistência eventualmente relevante ao desfecho de uma rendição (nota, recompensa,
histórico) é de responsabilidade de F05/F06/F07 e do próprio motor, nunca de F04.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Render-se acionado com a sessão já `encerrada` ou `falha` | `podeRenderSe` (via `acionarRendicao`) | Ignora silenciosamente; nenhum diálogo é aberto, nenhuma Acao é construída | nenhuma |
| Confirmação do diálogo chega depois que o duelo já terminou por outro motivo (corrida: LP zerado/deck out entre abrir o diálogo e confirmar) | Releitura de `sessao.fase` no momento da confirmação (Decisão 6) | No-op: fecha o diálogo sem encaminhar nada; o resultado real (outro motivo) já está em `SessaoDuelo` e será exibido por F05 | nenhuma |
| Jogador cancela o diálogo | Ação de UI | Fecha o diálogo; se a origem foi tentativa de navegação, a navegação não ocorre; nenhuma Acao é construída | nenhuma |
| Tentativa de sair da tela de duelo (navegação, botão voltar, link) enquanto `em_andamento` | `interceptarSaidaDuelo` | Cancela a navegação imediata e abre o mesmo diálogo de confirmação do render-se explícito | "Render-se conta como derrota. Confirmar?" |
| Tentativa de sair da tela quando a sessão **não** está `em_andamento` (duelo já terminou) | `interceptarSaidaDuelo` | Permite a navegação normalmente, sem diálogo | nenhuma |
| Clique repetido em "Render-se" enquanto o diálogo já está aberto | Estado do hook `useRendicao` | Idempotente: um único diálogo montado por vez; cliques adicionais não abrem um segundo diálogo | nenhuma |
| `interromperSessao` falha ou lança (ex.: erro interno do motor) | Borda de chamada em `acionarRendicao` | F04 não inventa um resultado local de derrota; o erro é registrado (log estruturado) e a sessão segue o mesmo tratamento de falha de motor já definido por F03 ("encerra a partida com segurança sem travar o jogador") — F04 não redefine esse comportamento | conforme o tratamento de falha de F03 (não duplicado aqui) |
| Fechamento abrupto da aba/app durante o duelo | Nenhuma — não há detecção ativa (Decisão 8) | Nenhuma ação de F04 roda; a próxima abertura do Free Duel não encontra sessão para retomar (decisão já tomada por F03) | nenhuma (tratado na tela de entrada do Free Duel, fora desta feature) |
| Botão "Render-se" acionado antes de qualquer sessão existir (`fase: 'nao_iniciada'`) | `podeRenderSe` retorna `false` | O botão nem é exibido/habilitado nessa fase — cenário defensivo, não esperado em uso normal | nenhuma |

Nenhum destes casos produz uma mensagem de erro "genérica": os desfechos silenciosos (ignorar,
permitir navegação) são comportamento esperado do PRD, não falha a ser sinalizada (guidelines §8.3
— não confundir "sem efeito por design" com "erro engolido").

## 7. Estratégia de Testes

### Unitários (Vitest)

- `podeRenderSe retorna true quando a sessao esta em_andamento`
- `podeRenderSe retorna false quando a sessao esta nao_iniciada`
- `podeRenderSe retorna false quando a sessao esta encerrada`
- `podeRenderSe retorna false quando a sessao esta em falha`
- `acionarRendicao encaminha a acao de rendicao via interromperSessao quando a sessao esta em_andamento`
- `acionarRendicao devolve a sessao inalterada quando ela ja esta encerrada`
- `acionarRendicao devolve a sessao inalterada quando ela esta em falha`
- `acionarRendicao encaminha a rendicao independentemente de qual lado e o proximoDecisor`
- `interceptarSaidaDuelo cancela a navegacao e abre o dialogo quando a sessao esta em_andamento`
- `interceptarSaidaDuelo permite a navegacao sem abrir o dialogo quando a sessao nao esta em_andamento`
- `useRendicao abre o dialogo ao acionar render explicito`
- `useRendicao abre o dialogo ao interceptar uma tentativa de saida`
- `useRendicao chama acionarRendicao apenas ao confirmar`
- `useRendicao fecha o dialogo sem chamar acionarRendicao ao cancelar`
- `dialogo de confirmacao exibe a mensagem exata do PRD`
- `botao render-se fica habilitado durante toda a fase em_andamento, inclusive fora do turno do jogador`
- `botao render-se nao e exibido/habilitado apos a sessao encerrar`

### Property-based (fast-check)

Propriedade de totalidade/equivalência sobre a guarda pura, 1.000 execuções:

- **Equivalência de disponibilidade:** para qualquer `SessaoDuelo` sintética gerada com uma `fase`
  arbitrária do domínio fechado (`nao_iniciada | em_andamento | encerrada | falha`),
  `podeRenderSe(sessao)` é verdadeiro **se e somente se** `sessao.fase === 'em_andamento'` — nunca
  diverge para as demais fases.
- **Idempotência de `acionarRendicao` fora de `em_andamento`:** para qualquer sessão sintética cuja
  fase não seja `em_andamento`, `acionarRendicao` devolve um objeto profundamente igual à entrada,
  sem invocar o dublê de `interromperSessao`.

### Integração

- `rendicao.integration.test.ts` — usando um dublê do contrato de F03/MotorDuelo que simula
  `interromperSessao`: confirmar o render-se leva a sessão de `em_andamento` a `encerrada` com
  `estadoFinal.fase === 'fim'`, consistente com uma derrota do jogador local por rendição (a
  decodificação de vencedor/motivo fica a cargo do dublê usado por F05, não é verificada aqui).
- `tentativa de sair da tela durante o duelo abre o dialogo e, ao confirmar, encerra a sessao antes de qualquer navegacao efetiva`
- `sessao que encerra por lp_zerado exatamente durante a confirmacao do render-se nao sobrescreve o motivo real` — usando o dublê para simular a corrida da Decisão 6.

### Análise estática

- Nenhum arquivo desta feature importa `packages/engine`, `packages/rules`, `packages/ai`,
  `packages/data`, `apps/server` ou um cliente Supabase (Seção 2).
- Nenhum arquivo desta feature calcula localmente LP, turno, motivo de derrota ou qualquer regra de
  combate — a única saída de domínio é a chamada a `interromperSessao` (guidelines §24 regra 4:
  lógica de domínio pertence ao motor, não à UI).
- Nenhum arquivo desta feature contém `console.log` fora de um logger estruturado de borda
  (guidelines §23.1) para o caso de falha de `interromperSessao`.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F04) | Teste |
|---|---|
| Render-se encaminha `rendicao` ao `MotorDuelo/F12` e resulta em derrota do jogador, sem recompensa | `acionarRendicao encaminha a acao de rendicao via interromperSessao quando a sessao esta em_andamento` + `rendicao.integration.test.ts` |
| Sair da partida (abandono) conta como derrota, exige confirmação e não concede recompensa nem aplica penalidade extra | `interceptarSaidaDuelo cancela a navegacao e abre o dialogo [...]` + `useRendicao chama acionarRendicao apenas ao confirmar` + `tentativa de sair da tela durante o duelo abre o dialogo e, ao confirmar, encerra a sessao [...]` |
| Render após o duelo terminado não tem efeito | `acionarRendicao devolve a sessao inalterada quando ela ja esta encerrada` + `acionarRendicao devolve a sessao inalterada quando ela esta em falha` + `botao render-se nao e exibido/habilitado apos a sessao encerrar` + propriedade de idempotência fora de `em_andamento` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: em derrota/empate (inclusive por rendição/abandono de F04), F06 e F07 não disparam | Análise estática: nenhum arquivo desta feature importa código de F06/F07; teste de contrato confirmando que o resultado consolidado com `motivo: 'rendicao'` não contém campos de recompensa a interpretar |
| Cross-Feature: fluxo completo sem estado inconsistente — F04 opera sobre a sessão que F03 cria e cede a F05 | `rendicao.integration.test.ts` (transição `em_andamento` → `encerrada` observável por quem monitora a sessão) |
| Cross-PRD (Motor de Duelo): a rendição é aceita pelo motor a qualquer momento, independentemente de turno | `acionarRendicao encaminha a rendicao independentemente de qual lado e o proximoDecisor` |
| Cross-PRD (Motor de Duelo): nenhuma regra de combate é reimplementada no Free Duel para produzir a derrota | Análise estática (Seção 7 acima) — F04 nunca calcula motivo de derrota localmente |
