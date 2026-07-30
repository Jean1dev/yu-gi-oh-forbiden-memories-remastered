# Revanche e Navegação Pós-Duelo

> PRD: `docs/prds/free-duel.md` — F08
> Pacote-alvo: `apps/web`

## 1. Contexto e Escopo

F08 é a última peça do loop de uma partida avulsa: quando a sessão de duelo criada por F03 chega a
`status: "ended"` e F05 já expõe o resultado consolidado, esta feature acrescenta as três saídas
possíveis da tela — **Revanche** (mesmo oponente, sessão nova), **Trocar oponente** (volta ao
roster de F01) e **Voltar ao menu** (rota raiz do app) — sem interferir em nenhuma delas. A feature
não introduz um subsistema novo: ela é **navegação pura** sobre rotas e contratos que F01, F02, F03
e F05 já especificam e que o código já implementa. Por isso a spec segue o caso de borda "feature
puramente de UI" do skill: as Seções 4 e 5 são reduzidas ao mínimo (sem contrato novo em
`packages/shared`, sem tabela nem cache), mas as Seções 2, 3, 6 e 7 permanecem completas, com a
Seção 3 detalhando o fluxo de `Experience` do PRD.

A alocação é 100% `apps/web`: não há regra de jogo nova (a revanche não decide nada sobre o duelo,
só volta a acionar o que já existe), então não há trabalho para `packages/shared`, `packages/data`,
`packages/rules`, `packages/engine` nem `packages/ai`. A feature pertence à **Wave 4** do PRD (junto
de F06/F07) e à **Fase 3** do roadmap (`arquitetura.md` §9 — "Free Duel vs IA"); diferente de F06/F07,
ela não toca a economia unificada de `arquitetura.md` §5 — é a única feature da wave que permanece
inteiramente fora de `wallets`/`collections`/`reward_ledger` (PRD F08 Capabilities, "não concede nem
revoga recompensas").

O código já implementado (Camada 1 — baseline) usa identificadores em **inglês**, consistente com
`CLAUDE.md` ("Code, comments and identifiers are in English"), embora as specs textuais de F01–F03
tenham sido escritas com identificadores em português (`SessaoDuelo`, `EstadoDuelo`,
`criarSessaoDuelo`) que não correspondem ao que foi de fato implementado
(`DuelSession`, `DuelState`, `createDuelSession`, em `packages/shared/src/duel/orchestration.ts` e
`apps/web/src/lib/free-duel/duel-session.ts`). Esta spec segue o **código real**, não o texto
daquelas specs, e registra a divergência aqui em vez de silenciá-la (ver Decisão 2).

### Incluído

- Um componente de apresentação com as três ações de navegação (Revanche, Trocar oponente, Voltar
  ao menu), renderizado quando `DuelSession.status === "ended"` — a mesma condição que já ativa o
  resultado consolidado de F05 na tela de duelo
- Reexecução do fluxo **F02 → F03** para a Revanche por meio da própria cadeia de rotas que F01/F02
  já estabelecem (`/free-duel/[duelistId]/prepare` → `/free-duel/[duelistId]/duel`), sem duplicar
  nem contornar a verificação de deck ativo de F02
- Navegação para o roster de duelistas (F01, rota `/free-duel`) via "Trocar oponente"
- Navegação para o menu principal do app (rota `/`, `MainMenu`) via "Voltar ao menu"
- Garantia estrutural de que uma revanche produz uma sessão nova e independente (novo
  `duelSessionId`, novo `seed` quando não informado), sem qualquer referência residual à sessão
  anterior — a forma concreta de "estado de fim de partida não se acumula entre revanches" (PRD F08
  Capabilities)

### Fronteiras

Delimitadas pela Seção 7 do PRD e pelos blocos Consumes/Capabilities vizinhos:

- **Revalidação do deck ativo** → **F02** (`useActiveDeckVerification`, `DeckBlock`,
  `DeckLoadFailure`, já implementados). F08 não reimplementa a verificação nem decide sozinho que o
  deck está pronto — apenas leva o jogador de volta à tela onde F02 já roda.
- **Inicialização da nova partida, seed, `duelSessionId`** → **F03**
  (`createDuelSession`/`buildMatchInput`/`generateDuelSessionId`/`createCryptoSeedGenerator`, já
  implementados). F08 não gera seed nem monta `MatchOrchestrationInput` por conta própria — apenas
  aciona a tela de F03 de novo, pela mesma rota que a primeira partida usou.
- **Cálculo/exibição de nota, motivo, estrelas** → **F05** (`ConsolidatedDuelResult`, `DuelResult`,
  já implementados). F08 não lê nem interpreta o conteúdo do resultado — as três ações aparecem
  igual em vitória, derrota, empate ou resultado indisponível.
- **Concessão de carta e crédito de estrelas** → **F06/F07** (cross-feature, ainda a implementar
  nesta wave). F08 nunca invoca nem referencia `wallets`, `collections` ou `reward_ledger` — a
  navegação não concede nem revoga nada (PRD F08 Capabilities, explícito).
- **Histórico de partidas, estatísticas agregadas** → fora de escopo do módulo (PRD §7, candidato ao
  Save). F08 não persiste nenhuma lista de duelos anteriores nem "contador de revanches".
- **Renderização fina, animação e som** → camada de apresentação (PRD §7). Esta spec descreve rotas,
  condições de exibição e mensagens, não estética dos botões/links.

### Contratos externos assumidos

Nenhum. As quatro dependências de F08 (F01, F02, F03, F05) já têm spec **e** implementação neste
repositório; não há contrato cross-PRD nem peça inexistente a assumir.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A spec não tem divisão Core/Full Scope — o PRD só declara um bloco `Capabilities` para F08; a spec cobre o escopo completo. | PRD §6 F08 | confirmada |
| 2 | Esta spec segue os identificadores em **inglês** do código já implementado (`DuelSession`, `ReadyDeck`, `Duelist`, `useActiveDeckVerification`, `DuelPreparation`, `OpponentSelection`, `MainMenu`, rotas `apps/web/src/app/...`), e não os nomes em português usados no texto das specs de F01–F03 (`SessaoDuelo`, `criarSessaoDuelo`, `apps/web/app/...` sem `src/`). O código real convergiu para inglês (`CLAUDE.md`, "Code, comments and identifiers are in English") e essa é a única fonte confiável quando spec e implementação divergem (Camada 1 do skill tem precedência sobre o texto de specs anteriores). Registrado aqui para que uma auditoria futura das specs de F01–F03 saiba da divergência; corrigir aqueles textos está fora do escopo de F08. | baseline do código; `CLAUDE.md` | confirmada |
| 3 | **A "Revanche" reaproveita a cadeia de rotas já existente** (`/free-duel/[duelistId]/prepare` → `/free-duel/[duelistId]/duel`, implementada por F02/F03) em vez de inventar um mecanismo de reinício de sessão dentro de `DuelScreen`. Um link simples para `/free-duel/{duelistId}/prepare` remonta a tela de F02 do zero: ela revalida o deck ativo (que pode ter mudado, PRD F08 Capabilities) e, ao confirmar, grava um novo handoff e navega para `/free-duel/{duelistId}/duel`, remontando `DuelScreen` do zero. Como cada montagem de `DuelScreen` gera um `duelSessionId` novo (`generateDuelSessionId`) e — quando nenhum seed é passado — um `seed` novo (`createCryptoSeedGenerator`), a revanche satisfaz "novo seed" e "nenhum estado de fim de partida acumulado" sem que F08 precise tocar `packages/shared`, `duel-session.ts` ou o store Zustand. É a aplicação mais direta do princípio "não reinventar" já seguido por F03/F04/F05. | PRD F08 Capabilities ("Revanche reexecuta o fluxo F02→F03"); baseline do código (`duel-preparation.tsx`, `duel-screen.tsx`, `duel-session.ts`) | confirmada |
| 4 | Consequência aceita da Decisão 3: a Revanche pede **um clique de confirmação a mais** ("Start duel" na tela de F02) em vez de recomeçar instantaneamente. Alternativa descartada: adicionar um modo "autoconfirmar" a `DuelPreparation` (F02, já implementada e testada) só para a revanche — invasivo e duplicaria uma decisão de UX dentro de uma feature já fechada, por um ganho marginal (uma tela a menos). O padrão do módulo já exige um clique de confirmação em cada etapa (F01 "Confirm opponent", F02 "Start duel"), então este clique extra não quebra a expectativa de "poucos passos" do PRD (§3 Perfil Comportamental). | auto-aceite: "especificação parcial no PRD — aplicar default de boa prática, documentar"; precedente de UX de F01/F02 | confirmada |
| 5 | **"Trocar oponente" navega para `/free-duel`** — a raiz do módulo, onde `OpponentSelection` (F01) já está implementada. Não introduz estado novo: é um link declarativo. | PRD F08 Capabilities; baseline (`apps/web/src/app/free-duel/page.tsx`, `opponent-selection.tsx`) | confirmada |
| 6 | **"Voltar ao menu" navega para `/`** — a raiz do app, onde `MainMenu` já está implementada. Isso é **distinto** do link de mesmo rótulo em `OrchestrationFailureNotice` (F03, já implementado), que aponta para `/free-duel` como recuperação de uma falha de orquestração — um caso de erro diferente do desfecho normal de F08. F08 não altera o comportamento de F03 (fora do seu escopo); registra a divergência de rótulo/rota para uma eventual revisão de terminologia entre features, sem bloquear esta spec. | PRD F08 Capabilities ("Voltar ao menu principal"); baseline (`apps/web/src/app/page.tsx`, `main-menu.tsx`); baseline (`orchestration-failure-notice.tsx`) | confirmada — divergência de rótulo registrada para revisão futura, não corrigida aqui |
| 7 | As três ações **só renderizam quando `session.status === "ended"`** — nunca durante `in_progress` (duelo ainda rolando) nem em `failed` (falha de orquestração de F03, que já tem seu próprio link de recuperação em `OrchestrationFailureNotice`). F08 não duplica a recuperação de falha de F03. | PRD F08 Consumes ("F05: resultado consolidado — partida encerrada"); baseline (`DuelSession` união por `status`) | confirmada |
| 8 | As três ações **não variam com o conteúdo de `ConsolidatedDuelResult`** — aparecem de forma idêntica em vitória, derrota, empate ou `unavailable`. F08 não lê `rating`, `reward` nem `reason`; só verifica que a sessão (não o resultado) terminou. | PRD F08 Capabilities ("não concede nem revoga recompensas — é navegação") | confirmada |
| 9 | **Nenhum tipo novo em `packages/shared`, nenhuma função nova em `packages/rules`.** A única lógica nova desta feature é a montagem de uma string de rota (`buildRematchHref`), que vive em `apps/web` por ser detalhe de apresentação/roteamento, não regra de jogo — mesmo critério já usado por F02 (Decisão 1) e F03 (Decisão 4) para não inflar `packages/rules` com o que não é regra. | `arquitetura.md` §2, §7 ("UI não contém regra", mas roteamento de UI não é regra de jogo); precedentes F02 (Decisão 1), F03 (Decisão 4) | confirmada |
| 10 | O guard de saída de F04 (`useSurrender`/`interceptDuelExit`, já implementado) **não bloqueia** as três ações de F08: `canSurrender(session)` só é verdadeiro para `status === "in_progress"`, e as ações de F08 só existem quando `status === "ended"`. Nenhuma mudança é necessária em F04 para que a revanche/navegação funcione. | baseline (`surrender.ts`, `duel-exit-guard.ts`) | confirmada |
| 11 | Convenção de caminhos: `apps/web/src/components/free-duel/`, `apps/web/src/lib/free-duel/`, `apps/web/src/app/free-duel/...` — a convenção **com** `src/` que o código já usa em todo o módulo (F02–F05 implementadas), e não a forma "sem `src/`" descrita no texto das specs de F01–F03 (ver Decisão 2). | baseline do código | confirmada |
| 12 | Nenhuma tabela de dado externo pendente (guardião, terreno, fusão, drop, rating, balanceamento) toca F08 — é navegação pura sem regra tunável. Nada é inventado e nenhum fallback neutro é necessário. | `arquitetura.md` §10; PRD §7 e §9 | não se aplica |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `apps/web/src/lib/free-duel/post-duel-routes.ts` | web | novo | `OPPONENT_SELECTION_HREF`, `MAIN_MENU_HREF`, `buildRematchHref(duelistId)` — as três rotas de destino, como funções/constantes puras |
| `apps/web/src/lib/free-duel/post-duel-routes.test.ts` | web | novo | Unitários + propriedade leve de `buildRematchHref` |
| `apps/web/src/components/free-duel/post-duel-actions.tsx` | web | novo | Componente de apresentação: três `Link` (Revanche, Trocar oponente, Voltar ao menu) |
| `apps/web/src/components/free-duel/post-duel-actions.test.tsx` | web | novo | Unitários de rótulo/`href` de cada ação |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.tsx` | web | alterado | Renderiza `PostDuelActions` ao lado do resultado consolidado quando `session.status === "ended"` |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.test.tsx` | web | alterado | Novas asserções: ações aparecem só em `ended`, hrefs corretos |
| `apps/web/tests/free-duel-post-duel-navigation.integration.test.tsx` | web | novo | Integração: `DuelScreen` numa sessão encerrada expõe resultado + as três ações simultaneamente |
| `apps/web/tests/free-duel-rematch-independence.integration.test.ts` | web | novo | Integração: duas chamadas consecutivas de `createDuelSession` (duelo original e revanche simulada) nunca compartilham `duelSessionId` nem estado residual |

**Verificação da direção de dependências:**

- Todo arquivo novo/alterado vive em `apps/web`. Nenhum arquivo em `packages/shared`,
  `packages/data`, `packages/rules`, `packages/engine` ou `packages/ai` é criado ou alterado por
  F08 — a direção `shared ← data ← rules ← engine ← ai`, com `web` como consumidor de todos, permanece
  intacta (`arquitetura.md` §2).
- `post-duel-routes.ts` e `post-duel-actions.tsx` não importam Supabase, `fetch`, `packages/engine`
  nem `packages/ai` — apenas `next/link` e, quando necessário para tipar a prop, `DuelistId`/tipos já
  exportados por `@yugioh/shared`.
- `duel-screen.tsx` (alterado) continua sem importar `packages/engine`/`packages/ai` diretamente —
  os pontos de integração (`startMatch`, `applyAction`, `resolveResult`) já entram por injeção,
  como estabelecido por F03/F05; F08 não abre um novo ponto de integração direto com esses pacotes.

## 3. Design Técnico

### Estruturas de dados

Nenhuma estrutura de domínio nova. F08 introduz apenas:

- **`OPPONENT_SELECTION_HREF`**: `string` constante, valor `"/free-duel"` — a rota de F01.
- **`MAIN_MENU_HREF`**: `string` constante, valor `"/"` — a rota raiz do app (`MainMenu`).
- **`buildRematchHref(duelistId: string): string`** — função pura e total que devolve
  `` `/free-duel/${duelistId}/prepare` ``, a mesma rota que F01 usa ao confirmar um oponente e que
  F02 já implementa (`app/free-duel/[duelistId]/prepare`).
- **Prop do componente**: `PostDuelActions({ duelistId }: { readonly duelistId: string })` — o
  mesmo `duelistId` que `DuelScreen` já recebe e usa para montar o resultado da partida atual.

### Fluxo

1. O duelo avança por F03 até `DuelSession.status === "ended"` (já implementado); F05 resolve o
   `ConsolidatedDuelResult` correspondente e `DuelScreen` renderiza `DuelResult` (já implementado).
2. `DuelScreen`, no mesmo ramo `status === "ended"`, renderiza `PostDuelActions` com o `duelistId`
   da rota atual — nenhuma nova condição de guarda é introduzida além da já existente
   (`session.status === "ended"`).
3. `PostDuelActions` mostra três links, sempre juntos, na mesma tela: "Revanche"
   (`href={buildRematchHref(duelistId)}`), "Trocar oponente" (`href={OPPONENT_SELECTION_HREF}`) e
   "Voltar ao menu" (`href={MAIN_MENU_HREF}`).
4. **Revanche**: o clique navega para `/free-duel/{duelistId}/prepare` — a tela de F02
   (`DuelPreparation`) monta do zero e roda `useActiveDeckVerification` de novo, revalidando o deck
   ativo mais recente (PRD F08 Capabilities, "que pode ter mudado"). Se bloqueado/indisponível, F02
   já mostra o aviso correspondente (nenhuma lógica nova de F08). Se liberado, o jogador confirma
   "Start duel" (UX de F02 inalterada); `setDuelHandoff` grava um `ReadyDeck` novo e a navegação para
   `/free-duel/{duelistId}/duel` remonta `DuelScreen` do zero — nova sessão, novo `duelSessionId`
   (`generateDuelSessionId`) e, quando nenhum seed é passado, novo `seed`
   (`createCryptoSeedGenerator`), ambos herdados de F03 sem alteração.
5. **Trocar oponente**: o clique navega para `/free-duel` (F01, `OpponentSelection`), de onde o
   jogador escolhe outro duelista e segue o fluxo normal F01→F02→F03 desde o início.
6. **Voltar ao menu**: o clique navega para `/` (`MainMenu`).
7. Nenhuma das três ações lê, grava ou aguarda `wallets`, `collections`, `reward_ledger` ou qualquer
   chamada de F06/F07.

### Regras de negócio

- **As três ações existem apenas quando `session.status === "ended"`** — nunca durante
  `in_progress` (duelo em curso) nem `failed` (falha de orquestração, tratada por F03).
- **Nenhuma ação depende do conteúdo do resultado consolidado** — vitória, derrota, empate e
  `unavailable` mostram as mesmas três ações.
- **A revanche é, do ponto de vista de F03, indistinguível de uma primeira partida**: mesmo
  `duelistId`, `duelSessionId` novo, estado novo. Nenhum campo de F08 é passado adiante para a nova
  sessão além do próprio `duelistId` (herdado da rota).
- **Nenhuma escrita em Postgres, IndexedDB ou fila offline** ocorre nesta feature — apenas
  navegação client-side.

### Eventos

Não aplicável — F08 não toca o barramento de eventos do motor (`packages/engine`); nenhum evento é
emitido, consumido ou reinterpretado por esta feature.

### Determinismo e pureza

Não aplicável a `packages/engine` (F08 não o toca). Dentro de `apps/web`, `buildRematchHref` é pura
e total (mesma entrada ⇒ mesma saída, nunca lança); `PostDuelActions` é um componente de
apresentação sem efeito colateral além da navegação declarativa do próprio `next/link`.

## 4. Contratos

Feature puramente de UI (nenhum contrato novo em `packages/shared` nem `packages/rules`) — seção
reduzida ao mínimo necessário, conforme o caso de borda do skill.

### Funções públicas

```
buildRematchHref(duelistId: string): string
  // pós: retorna `/free-duel/${duelistId}/prepare`
  // total: nunca lança, mesmo para duelistId vazio ou com caracteres especiais de URL
```

### Componente

```
PostDuelActions(props: { readonly duelistId: string }): JSX.Element
  // renderiza sempre os três links (Revanche, Trocar oponente, Voltar ao menu);
  // o chamador (DuelScreen) já decide quando montá-lo (status === "ended")
```

### Tipos reusados (sem redefinir)

`DuelSession`, `ConsolidatedDuelResult` (`@yugioh/shared`) — usados apenas para decidir que a
sessão terminou; nenhum campo de recompensa é lido.

### Endpoints / RPC / mensagens de rede

Não aplicável — navegação client-side pura, sem chamada de rede nova.

### Contratos externos (cross-PRD)

Nenhum — F01, F02, F03 e F05 já estão implementados neste repositório e são consumidos como estão.

## 5. Modelo de Dados

Não aplicável. F08 não cria tabela Postgres, estrutura IndexedDB, fila offline nem arquivo de dados
versionado — é navegação sobre rotas já existentes. `wallets`, `collections` e `reward_ledger`
permanecem inteiramente fora do alcance desta feature (PRD F08 Capabilities).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|----------------|----------------------|
| Deck ativo tornou-se inválido entre o duelo anterior e a revanche | `useActiveDeckVerification` (F02), ao montar `/prepare` de novo | Bloqueia exatamente como qualquer entrada nova no Free Duel — comportamento já especificado por F02; F08 não duplica nem contorna essa lógica | Mensagens exatas já definidas por F02 ("Você ainda não tem um deck pronto...", "Seu deck está inválido...") |
| `duelistId` da revanche não existe mais no roster (removido entre partidas) | `DuelScreen.loadDefaultContext` (F03), ao remontar | Redireciona para `/free-duel` — comportamento já especificado por F03, sem alteração | Nenhuma nova (navegação silenciosa, mesmo padrão de F03) |
| Jogador clica em qualquer uma das três ações enquanto a apuração de F05 ainda está `loading` | Os links já existem assim que `session.status === "ended"`, antes mesmo da apuração terminar | Navegação ocorre normalmente; o resultado consolidado simplesmente deixa de ser exibido na tela de origem | Nenhuma |
| Duplo clique em "Revanche"/"Trocar oponente"/"Voltar ao menu" | Comportamento nativo de `next/link` — navegação client-side idempotente | Nenhum efeito colateral; apenas uma navegação é concluída | Nenhuma |
| Jogador usa o botão "Voltar" do navegador após iniciar a revanche | Nenhum tratamento novo — a sessão anterior (`ended`) não é resumível nem mutável (F03, Decisão de sessão só em memória) | A tela antiga volta a aparecer apenas como registro; nenhuma ação de F06/F07 é reexecutada, porque F08 nunca as invoca | Nenhuma |
| `session.status === "failed"` (falha de orquestração de F03) | Ramo já tratado por `OrchestrationFailureNotice` (F03) | `PostDuelActions` não renderiza — só ativa em `ended`; o link de recuperação de F03 (que já aponta para `/free-duel`) permanece o único caminho nesse ramo | Mensagem já definida por F03 |

## 7. Estratégia de Testes

### Unitários (Vitest)

`post-duel-routes` (`apps/web`):

- `buildRematchHref builds the prepare route for the given duelistId`
- `buildRematchHref preserves the duelistId literally, without trimming or escaping`
- `OPPONENT_SELECTION_HREF points to the module roster route`
- `MAIN_MENU_HREF points to the app root route`

`post-duel-actions` (`apps/web`):

- `PostDuelActions renders a Revanche link pointing to the duelist prepare route`
- `PostDuelActions renders a Trocar oponente link pointing to /free-duel`
- `PostDuelActions renders a Voltar ao menu link pointing to /`
- `PostDuelActions renders all three actions together, in every render`

`duel-screen` (`apps/web`, alterado):

- `DuelScreen renders post-duel actions only when the session has ended`
- `DuelScreen does not render post-duel actions while the session is in progress`
- `DuelScreen does not render post-duel actions when orchestration failed`
- `DuelScreen renders post-duel actions alongside the consolidated result on every outcome (victory, defeat, draw, unavailable)`

### Property-based (fast-check)

- Para qualquer `duelistId` não vazio (incluindo caracteres típicos de identificador de rota:
  hífens, dígitos), `buildRematchHref` sempre devolve uma string que começa com `/free-duel/`,
  contém o `duelistId` literal e termina com `/prepare` — prova a ausência de escaping ou mutação
  inesperada na composição da rota.

### Integração

- `free-duel-post-duel-navigation.integration.test.tsx` — monta `DuelScreen` com uma sessão
  `ended` e as mesmas portas controladas de F03/F05 (`startMatch`, `resolveResult`), e confirma que
  o resultado consolidado e as três ações de F08 aparecem juntos, com os `href` corretos, para os
  quatro desfechos de `ConsolidatedDuelResult` (vitória, derrota, empate, indisponível).
- `free-duel-rematch-independence.integration.test.ts` — chama `createDuelSession` duas vezes em
  sequência (simulando "duelo original" e "revanche" após a navegação por `/prepare`), com fakes de
  `initDuel`/`generateSessionId` que produzem valores distintos a cada chamada; confirma que as duas
  `DuelSession` resultantes têm `duelSessionId` diferentes e nenhum campo herdado da sessão anterior
  — a prova direta de "estado de fim de partida não se acumula entre revanches" (PRD F08
  Capabilities), sem exigir os pacotes reais de `packages/engine`/`packages/ai` (mesma limitação já
  documentada por F03 §7 para a cadeia completa).

### Análise estática

- Nenhum arquivo em `packages/shared`, `packages/data`, `packages/rules`, `packages/engine` ou
  `packages/ai` é criado ou alterado por F08.
- `post-duel-routes.ts` e `post-duel-actions.tsx` não importam Supabase, `fetch` nem qualquer módulo
  de `wallets`/`collections`/`reward_ledger` — prova de que a navegação "não concede nem revoga
  recompensas" (PRD F08 Capabilities).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F08) | Teste |
|---|---|
| A tela de resultado oferece Revanche (mesmo oponente, novo seed), Trocar oponente (volta ao roster) e Voltar ao menu | `PostDuelActions renders a Revanche link...` + `...Trocar oponente...` + `...Voltar ao menu...` + `free-duel-post-duel-navigation.integration.test.tsx` |
| Revanche reexecuta a verificação do deck (F02) e a orquestração (F03) com o deck ativo mais recente | Decisão 3 (reaproveita a rota `/prepare`→`/duel` já especificada e testada por F02/F03) + `free-duel-rematch-independence.integration.test.ts` |
| A navegação não concede nem revoga recompensas | Análise estática (nenhum import de F06/F07/`wallets`/`collections`/`reward_ledger`) + `PostDuelActions renders all three actions together, in every render` (independe do `ConsolidatedDuelResult`) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Fluxo completo de vitória: F01... → F05 apura resultado... → F08 oferece revanche/navegação, sem estado inconsistente" | `free-duel-post-duel-navigation.integration.test.tsx` + `free-duel-rematch-independence.integration.test.ts` |
| Cross-Feature: "Uma mesma vitória nunca concede carta ou estrelas em duplicidade" | Fora do alcance direto de F08 (é de F06/F07); reforçado por análise estática — F08 nunca invoca esses módulos, então não pode duplicá-los |
| Cross-PRD: nenhuma dependência cross-PRD nova é introduzida por F08 | Análise estática — nenhum import de módulo fora deste PRD além dos já usados por F01–F05 |
