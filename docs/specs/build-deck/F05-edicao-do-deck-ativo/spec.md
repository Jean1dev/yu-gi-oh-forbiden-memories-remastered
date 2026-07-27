# Edição do Deck Ativo

> PRD: `docs/prds/build-deck.md` — F05
> Pacote-alvo: `packages/rules` (+ `packages/shared`, `apps/web`)

## 1. Contexto e Escopo

Esta feature é o editor propriamente dito do deck único do jogador: um rascunho mutável em
memória que move cópias de carta entre a coleção (F01) e o deck, respeitando o teto
`min(quantidade possuída, 3)`, sem nunca escrever no deck ativo persistido — essa escrita é
exclusiva de F07, que só acontece quando o rascunho passa pela validação de F06. F05 é a
articulação da Wave 3 do roadmap do módulo (`arquitetura.md` §9, Fase 2): fecha o ciclo
F02 → F04 → F05 → F06 → F07 no ponto em que o jogador efetivamente decide o conteúdo do deck.

### Incluído
- Adicionar uma cópia de uma carta da coleção ao rascunho do deck (PRD Capabilities).
- Remover uma cópia de uma carta do rascunho, devolvendo-a à coleção disponível (PRD Capabilities).
- Bloquear a 4ª cópia, adicionar além do que o jogador possui, e adicionar carta não possuída —
  cada caso com sua mensagem específica (PRD Error Handling).
- Manter o rascunho vivo enquanto o jogador navega dentro do editor, com aviso ao tentar sair
  (navegação interna ou fechar/recarregar a aba) havendo alteração não salva (PRD Error Handling).
- Implementação real de `ConsultaDeckAtivo` (interface já declarada por `build-deck`/F04), que
  hoje opera com o fallback neutro `deckAtivoIndisponivel()`.

### Fronteiras
- A **validade** do deck (exatamente 40 cartas, ≤3 cópias, apenas possuídas) é calculada por
  **F06**; F05 só impede localmente o que o PRD já classifica como bloqueio de edição (4ª cópia,
  além do possuído, não possuída). O total pode ficar temporariamente ≠ 40 (PRD Capabilities).
- A **persistência** do deck ativo é de **F07**; F05 nunca grava em `active_decks` nem em
  `collections`.
- A **seleção de carta na coleção** e a listagem/busca/filtro são de **F04**; F05 consome a carta
  selecionada e o `numero` a partir de lá, sem duplicar a listagem.

### Contratos externos assumidos
- **`build-deck`/F02 — deck ativo atual.** Interface esperada: uma leitura assíncrona que devolve
  o deck ativo do jogador como `Colecao` (`numero → quantidade`), já definida pela spec de F02
  (`garantirEntradaDuelo(playerId): Promise<Result<Colecao, DomainError>>`). F05 consome essa
  leitura só para **inicializar** o rascunho; não a rechama durante a edição.
- **`build-deck`/F04 — carta selecionada e `ConsultaDeckAtivo`.** F04 expõe `numeroSelecionado` e
  a interface `ConsultaDeckAtivo` (`packages/shared/src/colecao/deck-ativo.ts`) com o método
  `quantidadeNoDeck(numero): number`; hoje é atendida por um fallback que sempre devolve `0`. F05
  fornece a implementação real, injetada na página do Build Deck no lugar do fallback.

### Decisões e Premissas
| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | F05 não tem blocos `Core Scope`/`Full Scope additions` no PRD — escopo completo, sem divisão. | PRD §6 F05 | confirmada |
| 2 | Adaptador de estado React para o rascunho: **Zustand**. Resolve a pendência deixada em aberto por `arquitetura.md` §7 e adiada explicitamente até esta feature pelas specs de `build-deck`/F01 (Decisão 5) e `build-deck`/F04 (Decisão 7) — aqui nasce o primeiro estado mutável real do módulo que justifica a escolha. | entrevista | confirmada |
| 3 | O rascunho vive **apenas em memória** (dentro do store Zustand), sem cópia em IndexedDB. Diferente da coleção (F01) e do deck ativo (F02/F07), o rascunho é transitório por natureza: se o jogador fecha a aba sem salvar, a intenção é recomeçar do último deck ativo válido, não resgatar um estado parcial arbitrário. | entrevista | confirmada |
| 4 | Para compensar a falta de persistência do rascunho, um listener nativo `beforeunload` avisa o navegador quando há alteração não salva, cobrindo fechar/recarregar a aba — complementando o `confirm()` de navegação interna que já cobre trocar de rota dentro do app. | entrevista | confirmada |
| 5 | Consequência das Decisões 3+4: a frase do PRD "mantém o rascunho local para retomar depois" (Error Handling de F05) é lida como válida **apenas dentro da mesma aba/sessão do navegador** — navegar para outra tela do Build Deck e voltar preserva o rascunho; recarregar ou fechar a aba não preserva, e é o cenário que o aviso `beforeunload` existe para desencorajar. | entrevista + PRD §6 F05 Error Handling | confirmada |
| 6 | O rascunho reusa o **mesmo shape** de `Colecao` (`ReadonlyMap<NumeroCarta, number>`) já definido por `banco-de-cartas`/F01 e reaproveitado por `build-deck`/F02 para o deck ativo — introduzido como o alias `RascunhoDeck` para leitura de assinatura, sem duplicar schema de serialização nem funções de (des)serialização. | precedente: spec `build-deck/F02` Seção 4 | confirmada |
| 7 | As checagens de posse e limite reusam `quantidadePossuida`, `possui` e `limiteCopias` de `packages/rules/src/colecao` (F01) — F05 nunca reimplementa o teto `min(quantidade possuída, 3)`. | precedente: spec `build-deck/F01` Seção 4; spec `build-deck/F04` Decisão 9 | confirmada |
| 8 | As três mensagens de bloqueio do PRD viram três códigos de `DomainError` distintos (`carta_nao_possuida`, `limite_quantidade_possuida`, `limite_maximo_copias`), escolhidos por `quantidadePossuida` ser `0`, estar abaixo de 3, ou ser ≥3 respectivamente — permite à UI mapear código → texto sem inspecionar string livre. | PRD §6 F05 Error Handling | confirmada |
| 9 | Pacote-alvo: lógica pura de edição (adicionar/remover/consultas derivadas) em `packages/rules/src/deck`; estado de sessão (store Zustand, hooks, aviso de saída) em `apps/web`. Nenhuma checagem de posse/limite acontece na camada de UI — mesma divisão de ADR-004 e do precedente de F01/F04. | ADR-004; spec `build-deck/F01` Seção 2; spec `build-deck/F04` Decisão 2 | confirmada |
| 10 | A confirmação de navegação interna usa `window.confirm` nativo com o texto do PRD ("Você tem alterações não salvas. Sair sem salvar?"), sem modal customizado — o critério de aceite pede a mensagem, não uma UI específica; um modal fica como refinamento visual futuro fora do escopo lógico desta spec. | PRD §6 F05 Error Handling; escopo lógico (Fase 0 do skill, "Interface e apresentação" fora de escopo) | confirmada |
| 11 | F05 não cria tabela Postgres nem store IndexedDB — o único estado novo é em memória (Zustand), inicializado a partir do deck ativo lido por F02 e descartado ao trocar de conta/fechar a aba. | entrevista (Decisão 3) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/deck/tipos.ts` | shared | novo | `RascunhoDeck` (alias de `Colecao`), `MotivoBloqueioEdicaoDeck` (união de literais espelhando os códigos de `DomainError` desta feature) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os tipos de `deck/tipos.ts` |
| `packages/rules/src/deck/edicao.ts` | rules | novo | `adicionarCartaAoRascunho`, `removerCartaDoRascunho`, `totalCartasRascunho`, `rascunhoDivergeDoDeckAtivo`, `criarConsultaDeckAtivoDoRascunho` |
| `packages/rules/src/deck/index.ts` | rules | novo | Export público do subsistema de edição de deck |
| `packages/rules/src/index.ts` | rules | alterado | Reexporta o subsistema `deck` |
| `packages/rules/src/deck/edicao.test.ts` | rules | novo | Unitários table-driven das cinco funções + propriedades fast-check |
| `apps/web/src/stores/rascunho-deck.ts` | web | novo | Store Zustand: `deckAtivoOriginal`, `rascunho`, `ultimoBloqueio` + ações `inicializarRascunho`, `adicionarCarta`, `removerCarta`, `descartarRascunho` |
| `apps/web/src/stores/rascunho-deck.test.ts` | web | novo | Unitários do store (transições de estado, bloqueio refletido) |
| `apps/web/src/hooks/use-rascunho-deck.ts` | web | novo | Hook fino: expõe `rascunho`, `total`, `ultimoBloqueio`, `consultaDeckAtivo` memoizado, `temAlteracoesNaoSalvas`, e injeta `colecaoJogador` de `useColecao` (F01) nas ações |
| `apps/web/src/hooks/use-aviso-sair-sem-salvar.ts` | web | novo | Registra `beforeunload` quando há alteração não salva; expõe `confirmarNavegacaoInterna()` |
| `apps/web/src/hooks/use-aviso-sair-sem-salvar.test.ts` | web | novo | Unitários do listener e da função de confirmação (mock de `window.confirm`/`beforeunload`) |
| `apps/web/src/components/build-deck/editor-deck.tsx` | web | novo | Painel do deck em edição: lista as cartas do rascunho, contador de total, botão "－" por carta |
| `apps/web/src/components/build-deck/mensagem-bloqueio.tsx` | web | novo | Exibe a mensagem específica do `ultimoBloqueio` mapeada a partir do código de `DomainError` |
| `apps/web/src/app/build-deck/page.tsx` | web | alterado | Inicializa o store a partir do deck ativo (contrato de F02), injeta `consultaDeckAtivo` real no `usePainelColecao` de F04 (substitui `deckAtivoIndisponivel()`), conecta o botão "＋" do painel de F04 a `adicionarCarta`, e liga o guard de navegação interna |
| `apps/web/tests/build-deck-edicao.integration.test.tsx` | web | novo | Fluxo de UI: selecionar → adicionar → bloquear → remover → tentar sair com alteração pendente |

**Verificação da direção de dependências:** `packages/shared` continua sem importar nenhum outro
pacote do monorepo — `RascunhoDeck` é só um alias de tipo. `packages/rules/src/deck` importa
**apenas** `packages/shared` (para `NumeroCarta`, `Colecao`, `Result`, `DomainError`,
`ConsultaDeckAtivo`) e `packages/rules/src/colecao` (para `quantidadePossuida`, `possui`,
`limiteCopias`) — ambos já existem à esquerda na cadeia `shared ← data ← rules`, então não há
inversão. `apps/web` importa `shared` e `rules`; não importa `engine`, `ai` nem `server`. Esta
feature **não toca `packages/engine`** — as garantias de PRNG semeado e estado de duelo
serializável não se aplicam.

`packages/rules/src/deck/edicao.ts` não importa React, DOM, `fetch`, Supabase, `node:fs` nem
nenhuma API de I/O — recebe o rascunho, a coleção do jogador e o `numero` como argumentos e
devolve estruturas novas em memória (guidelines §7.3, mesma fronteira que F01 já estabeleceu).
`window.confirm` e `window.addEventListener('beforeunload', ...)` ficam confinados aos hooks de
`apps/web/src/hooks/**`, nunca em `packages/rules`.

## 3. Design Técnico

### Estruturas de dados

**`RascunhoDeck`** (alias de `Colecao`) — `ReadonlyMap<NumeroCarta, number>`, de `numero` para
quantidade **no deck em edição**. Reusa a mesma forma que `Colecao` já tem para "cartas possuídas"
(F01) e que `build-deck`/F02 já reusa para "deck ativo persistido" — três papéis diferentes, um
único shape, sem schema duplicado.

**`EstadoRascunhoDeck`** — estado interno do store:

| Campo | Tipo | Semântica |
|---|---|---|
| `deckAtivoOriginal` | `RascunhoDeck` | Snapshot do deck ativo carregado ao entrar no editor (via F02); referência fixa de comparação, nunca mutada por `adicionarCarta`/`removerCarta` |
| `rascunho` | `RascunhoDeck` | Estado mutável em edição; toda ação de adicionar/remover produz um novo `RascunhoDeck` |
| `ultimoBloqueio` | `MotivoBloqueioEdicaoDeck \| undefined` | Último bloqueio ocorrido, para a UI exibir a mensagem específica; limpo na próxima ação bem-sucedida |

**`MotivoBloqueioEdicaoDeck`** — união de literais: `'carta_nao_possuida' | 'limite_quantidade_possuida' | 'limite_maximo_copias' | 'carta_nao_esta_no_rascunho'`, espelhando 1:1 os códigos de
`DomainError` introduzidos por esta feature (Seção 4), para a UI mapear código → texto sem
inspecionar string livre.

### Fluxo

1. Ao entrar em `/build-deck`, a página resolve o deck ativo via o contrato de F02
   (`garantirEntradaDuelo`/leitura equivalente de `active_decks`) e chama
   `inicializarRascunho(deckAtivo)` no store — `rascunho` e `deckAtivoOriginal` começam iguais.
2. O store expõe `consultaDeckAtivo` (via `criarConsultaDeckAtivoDoRascunho(rascunho)`,
   memoizado) para o `usePainelColecao` de F04, substituindo `deckAtivoIndisponivel()`. A partir
   daqui, "no deck M" em F04 reflete o rascunho ao vivo, não mais sempre `0`.
3. O jogador seleciona uma carta em F04 (expõe `numeroSelecionado`) e clica "＋"; a página chama
   `adicionarCarta(numeroSelecionado)` do hook `useRascunhoDeck`, que injeta `colecaoJogador` (de
   `useColecao`, F01) e delega a `adicionarCartaAoRascunho` (Seção 3, Regras de negócio).
4. Em sucesso, `rascunho` é substituído pelo novo mapa, `ultimoBloqueio` é limpo, e tanto o
   contador do editor (`totalCartasRascunho`) quanto "no deck M" em F04 atualizam no mesmo render.
5. Em bloqueio, `rascunho` não muda; `ultimoBloqueio` recebe o código correspondente e
   `mensagem-bloqueio.tsx` exibe o texto mapeado (Seção 6).
6. No painel do editor (`editor-deck.tsx`), cada carta do rascunho tem um botão "－" que chama
   `removerCarta(numero)`, delegando a `removerCartaDoRascunho`.
7. `temAlteracoesNaoSalvas` (via `rascunhoDivergeDoDeckAtivo(rascunho, deckAtivoOriginal)`)
   alimenta dois mecanismos independentes: o listener `beforeunload` (fechar/recarregar a aba) e
   o guard de navegação interna (`confirmarNavegacaoInterna`, disparado antes de sair da rota do
   Build Deck).
8. Salvar o rascunho válido é responsabilidade de **F07**; F05 não decide quando salvar, apenas
   mantém o rascunho pronto para ser lido por F06 (validação) e, se válido, por F07.

### Regras de negócio

- **Adicionar uma carta** (`adicionarCartaAoRascunho`):
  1. `quantidadePossuida = quantidadePossuida(colecaoJogador, numero)` (F01).
  2. Se `quantidadePossuida === 0` → bloqueio `carta_nao_possuida` — carta nunca esteve na
     coleção (PRD Capabilities: "só permite adicionar cartas presentes na coleção").
  3. `quantidadeNoRascunho = rascunho.get(numero) ?? 0`; `limite = limiteCopias(quantidadePossuida)`
     (= `min(quantidadePossuida, 3)`, Fase 0.3/F01).
  4. Se `quantidadeNoRascunho >= limite`:
     - `quantidadePossuida >= 3` → bloqueio `limite_maximo_copias` ("Máximo de 3 cópias por
       carta.") — o teto é o hard cap de 3, não a posse.
     - `quantidadePossuida < 3` → bloqueio `limite_quantidade_possuida` ("Você possui apenas
       {quantidadePossuida} cópia(s) desta carta.") — o teto é a posse, abaixo de 3.
  5. Caso contrário → sucesso: novo `RascunhoDeck` com `quantidadeNoRascunho + 1`.
- **Remover uma carta** (`removerCartaDoRascunho`): se `rascunho.get(numero)` é `0`/ausente →
  bloqueio defensivo `carta_nao_esta_no_rascunho` (a UI não deveria oferecer o botão "－" nesse
  caso; existe para nunca produzir uma quantidade negativa mesmo sob uso indevido da API). Caso
  contrário, decrementa 1; a chave é removida do mapa se a quantidade chega a `0`.
- **Total do rascunho** (`totalCartasRascunho`): soma das quantidades de todas as entradas. Pode
  ser `≠ 40` a qualquer momento durante a edição (PRD Capabilities) — só afeta o botão de salvar
  através de F06, nunca é bloqueado por F05.
- **Divergência do deck ativo** (`rascunhoDivergeDoDeckAtivo`): `true` se `rascunho` e
  `deckAtivoOriginal` diferem em qualquer chave ou quantidade (comparação estrutural completa dos
  dois mapas, não só do total).

### Determinismo e pureza

Esta feature não toca `packages/engine`; as garantias de PRNG semeado e estado de duelo não se
aplicam. As cinco funções de `packages/rules/src/deck/edicao.ts` são, ainda assim, **puras e
determinísticas**: mesma entrada sempre produz a mesma saída, sem I/O, sem `Math.random()`, sem
mutação dos mapas recebidos (todo retorno é um novo `RascunhoDeck`).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`RascunhoDeck`** — `type RascunhoDeck = Colecao`. Nenhum schema zod novo: serialização e
  validação reusam `ColecaoSerializadaSchema`/`serializarColecao`/`desserializarColecao` de F01
  sem redefinição, já que o shape é idêntico.
- **`MotivoBloqueioEdicaoDeck`** — `'carta_nao_possuida' | 'limite_quantidade_possuida' | 'limite_maximo_copias' | 'carta_nao_esta_no_rascunho'`.
- **`ConsultaDeckAtivo`, `Colecao`, `NumeroCarta`, `Result`, `DomainError`** — reusados de
  `packages/shared` conforme as specs de `banco-de-cartas`/F01, `build-deck`/F01 e
  `build-deck`/F04. **Não são redefinidos aqui.**

Códigos de `DomainError` introduzidos por esta feature: `carta_nao_possuida`,
`limite_quantidade_possuida`, `limite_maximo_copias`, `carta_nao_esta_no_rascunho`.

### Funções públicas

```
// packages/rules/src/deck/edicao.ts — puro, sem I/O

adicionarCartaAoRascunho(
  rascunho: RascunhoDeck,
  colecaoJogador: Colecao,
  numero: NumeroCarta,
): Result<RascunhoDeck, DomainError>
  // pós: ok ⇒ quantidade de `numero` em rascunho +1, demais chaves inalteradas
  //      erro carta_nao_possuida ⇒ quantidadePossuida(colecaoJogador, numero) === 0
  //      erro limite_quantidade_possuida ⇒ 0 < quantidadePossuida < 3 e rascunho já no teto
  //      erro limite_maximo_copias ⇒ quantidadePossuida >= 3 e rascunho já tem 3 cópias

removerCartaDoRascunho(
  rascunho: RascunhoDeck,
  numero: NumeroCarta,
): Result<RascunhoDeck, DomainError>
  // pós: ok ⇒ quantidade de `numero` em rascunho -1 (chave removida se chega a 0)
  //      erro carta_nao_esta_no_rascunho ⇒ quantidade de `numero` em rascunho já era 0

totalCartasRascunho(rascunho: RascunhoDeck): number
  // pós: soma de todas as quantidades do mapa; 0 para rascunho vazio

rascunhoDivergeDoDeckAtivo(rascunho: RascunhoDeck, deckAtivoOriginal: RascunhoDeck): boolean
  // pós: true sse os dois mapas diferem em ao menos uma chave ou quantidade

criarConsultaDeckAtivoDoRascunho(rascunho: RascunhoDeck): ConsultaDeckAtivo
  // pós: quantidadeNoDeck(numero) devolve rascunho.get(numero) ?? 0, nunca lança
```

```
// apps/web/src/stores/rascunho-deck.ts

useRascunhoDeckStore: {
  deckAtivoOriginal: RascunhoDeck
  rascunho: RascunhoDeck
  ultimoBloqueio: MotivoBloqueioEdicaoDeck | undefined
  inicializarRascunho(deckAtivo: RascunhoDeck): void
  adicionarCarta(numero: NumeroCarta, colecaoJogador: Colecao): void
  removerCarta(numero: NumeroCarta): void
  descartarRascunho(): void   // rascunho = deckAtivoOriginal; usado ao confirmar saída sem salvar
}
```

```
// apps/web/src/hooks/use-rascunho-deck.ts

useRascunhoDeck(): {
  rascunho: RascunhoDeck
  total: number
  ultimoBloqueio: MotivoBloqueioEdicaoDeck | undefined
  consultaDeckAtivo: ConsultaDeckAtivo   // memoizado por `rascunho`
  temAlteracoesNaoSalvas: boolean
  adicionarCarta(numero: NumeroCarta): void   // injeta colecaoJogador de useColecao internamente
  removerCarta(numero: NumeroCarta): void
}
```

```
// apps/web/src/hooks/use-aviso-sair-sem-salvar.ts

useAvisoSairSemSalvar(temAlteracoesNaoSalvas: boolean): {
  confirmarNavegacaoInterna(): boolean   // dispara window.confirm com o texto do PRD; true = pode sair
}
// efeito colateral: registra/remove window.addEventListener('beforeunload', ...)
// conforme temAlteracoesNaoSalvas muda, sem expor o listener bruto ao chamador
```

### Exemplos

`RascunhoDeck` serializado (mesma forma de `ColecaoSerializada`, F01 — sem schema novo):

```json
{ "001": 3, "045": 1, "333": 2 }
```

Bloqueio ao tentar adicionar a 4ª cópia (`quantidadePossuida = 5`, `rascunho` já com 3):

```json
{ "situacao": "erro", "erro": { "code": "limite_maximo_copias", "message": "Máximo de 3 cópias por carta." } }
```

Bloqueio ao tentar adicionar além do que possui (`quantidadePossuida = 2`, `rascunho` já com 2):

```json
{ "situacao": "erro", "erro": { "code": "limite_quantidade_possuida", "message": "Você possui apenas 2 cópia(s) desta carta." } }
```

### Contratos externos (cross-PRD)

Nenhum novo nesta feature — os únicos contratos externos são internos ao PRD (F02, F04), já
declarados acima em "Contratos externos assumidos".

## 5. Modelo de Dados

Esta feature **não cria nem altera** tabela Postgres, migração, store IndexedDB ou arquivo de
dados versionado (Decisão 3/11). O único estado novo é o `EstadoRascunhoDeck` em memória (Seção
3), que vive só durante a sessão do navegador: inicializado a partir do deck ativo lido por F02 ao
entrar em `/build-deck`, e descartado (sem gravação) ao trocar de conta, fechar a aba, ou
recarregar a página. A persistência do que o jogador decide fica inteiramente a cargo de F07, que
lê `rascunho` (via F06, se válido) no momento do save — nunca antes disso.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|----------------------|
| Adicionar a 4ª cópia de uma carta (jogador possui ≥3) | `adicionarCartaAoRascunho` → `limite_maximo_copias` | `rascunho` inalterado; `ultimoBloqueio` setado | "Máximo de 3 cópias por carta." |
| Adicionar mais cópias do que possui (jogador possui 1 ou 2) | `adicionarCartaAoRascunho` → `limite_quantidade_possuida` | `rascunho` inalterado; `ultimoBloqueio` setado | "Você possui apenas N cópia(s) desta carta." (N = quantidade possuída) |
| Adicionar carta não possuída (quantidade possuída = 0) | `adicionarCartaAoRascunho` → `carta_nao_possuida` | `rascunho` inalterado; `ultimoBloqueio` setado | "Carta não está na sua coleção." |
| Remover carta ausente do rascunho (defensivo; UI normal nunca oferece o botão nesse estado) | `removerCartaDoRascunho` → `carta_nao_esta_no_rascunho` | `rascunho` inalterado; `warn` estruturado registrado (guidelines §23.3), sem crash | — (sem mensagem ao jogador; caminho não alcançável pela UI padrão) |
| Sair do editor por navegação interna com `temAlteracoesNaoSalvas` | `confirmarNavegacaoInterna()` | Cancelar mantém no editor com `rascunho` intacto; confirmar chama `descartarRascunho()` e navega | "Você tem alterações não salvas. Sair sem salvar?" |
| Fechar ou recarregar a aba com `temAlteracoesNaoSalvas` | listener `beforeunload` | Aviso nativo do navegador antes de descarregar a página; texto controlado pelo navegador, não customizável | (mensagem padrão do navegador) |
| `colecaoJogador` (F01) ainda carregando ou em erro ao tentar adicionar | estado de `useColecao` propagado ao hook | Botão "＋" desabilitado; nenhuma chamada a `adicionarCarta` acontece | (herdado do estado de carregamento/erro de F01, sem mensagem própria de F05) |
| Deck ativo (F02) ainda não resolvido ao entrar em `/build-deck` | ausência de `deckAtivoOriginal` | Editor não inicializa; reusa a mensagem de bloqueio de entrada já definida por F02 | "Preparando seu deck inicial…" (herdada de F02) |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `adicionarCartaAoRascunho bloqueia com limite_maximo_copias quando quantidade possuida for tres ou mais e o rascunho ja tiver tres copias`
- `adicionarCartaAoRascunho bloqueia com limite_quantidade_possuida quando quantidade possuida for uma ou duas e o rascunho ja tiver essa quantidade`
- `adicionarCartaAoRascunho bloqueia com carta_nao_possuida quando quantidade possuida for zero`
- `adicionarCartaAoRascunho adiciona com sucesso quando abaixo do limite e devolve rascunho com quantidade incrementada`
- `removerCartaDoRascunho decrementa a quantidade e remove a chave quando chega a zero`
- `removerCartaDoRascunho bloqueia com carta_nao_esta_no_rascunho quando a quantidade ja e zero`
- `totalCartasRascunho soma corretamente multiplas cartas com quantidades diferentes`
- `totalCartasRascunho devolve zero para rascunho vazio`
- `rascunhoDivergeDoDeckAtivo devolve falso quando os dois mapas sao identicos`
- `rascunhoDivergeDoDeckAtivo devolve verdadeiro quando qualquer quantidade muda entre os mapas`
- `criarConsultaDeckAtivoDoRascunho devolve zero para carta ausente do rascunho`
- `criarConsultaDeckAtivoDoRascunho devolve a quantidade exata para carta presente no rascunho`

### Property-based (fast-check)

- `uma sequencia aleatoria de adicionar e remover validos nunca deixa a quantidade de uma carta negativa nem acima de limiteCopias` — gera sequências de operações respeitando `colecaoJogador` arbitrária; após cada passo, invariante `0 <= quantidade <= limiteCopias(quantidadePossuida)` se mantém.
- `totalCartasRascunho apos uma sequencia aleatoria de adicionar e remover e sempre igual a soma manual dos valores do mapa resultante` — round-trip de invariante entre o total incremental e o recálculo direto do mapa.

### Integração

- `apps/web/src/stores/rascunho-deck.test.ts`: `inicializarRascunho` copia o deck ativo para
  `rascunho` e `deckAtivoOriginal`; `adicionarCarta`/`removerCarta` atualizam só `rascunho`;
  `descartarRascunho` restaura `rascunho = deckAtivoOriginal`.
- `apps/web/src/hooks/use-aviso-sair-sem-salvar.test.ts`: registra o listener `beforeunload`
  quando `temAlteracoesNaoSalvas` é `true` e remove quando volta a `false`;
  `confirmarNavegacaoInterna` devolve o valor de `window.confirm` mockado.
- `apps/web/tests/build-deck-edicao.integration.test.tsx`: fluxo completo — selecionar carta em
  F04, clicar "＋" e ver o contador/"no deck M" atualizar, repetir até bloquear e ver a mensagem
  específica, clicar "－", e navegar para fora do Build Deck com alteração pendente para verificar
  que `window.confirm` foi chamado com o texto do PRD. Nota: responsividade e a percepção real de
  latência ficam fora do que jsdom mede (mesma lacuna assumida por `build-deck`/F04); cobertos por
  verificação manual.

### Análise estática

- `packages/rules/src/deck/**` não importa React, DOM, `fetch`, Supabase nem `node:fs` (mesma
  regra de fronteira que F01 já aplica a `packages/rules/src/colecao/**`).

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---|---|
| Adicionar move +1 da coleção para o deck; remover devolve +1 à coleção; ambos refletem no contador na hora | `adicionarCartaAoRascunho adiciona com sucesso...` + `removerCartaDoRascunho decrementa...` + integração de UI (contador atualiza no mesmo render) |
| Recusa a 4ª cópia, adicionar além do que possui, e adicionar carta não possuída — cada caso com mensagem específica | os três testes `adicionarCartaAoRascunho bloqueia com ...` |
| O total pode ficar temporariamente ≠ 40 durante a edição; a validade é avaliada por F06 e só afeta o salvar | `totalCartasRascunho soma corretamente...` (F05 nunca bloqueia por total ≠ 40) |
| Sair com rascunho não salvo pede confirmação e preserva o rascunho local; o deck ativo anterior permanece intacto até um save válido | `build-deck-edicao.integration.test.tsx` (confirm) + `rascunhoDivergeDoDeckAtivo` + `deckAtivoOriginal` nunca mutado pelas ações do store |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Fluxo completo F02 → F04 → F05 → F06 → F07 sem estado inconsistente entre coleção e deck | `build-deck-edicao.integration.test.tsx` cobre o trecho F04↔F05; a ponta com F06/F07 fica marcada como pré-requisito de integração para quando essas specs existirem (Wave 4/5) |
| Somar/subtrair cartas em F05 nunca deixa "no deck + disponível na coleção" maior que a quantidade possuída em F01 | propriedade `uma sequencia aleatoria de adicionar e remover validos nunca deixa a quantidade... acima de limiteCopias` — `limiteCopias <= quantidadePossuida` garante a invariante por construção |
| Uma carta conquistada por F03 fica imediatamente utilizável em F04/F05 para troca no deck | comportamento herdado: F05 nunca guarda cópia própria de `colecaoJogador`, sempre lê ao vivo de `useColecao` (F01); nenhum teste novo necessário nesta feature, apenas ausência de cache local que quebraria essa invariante |
