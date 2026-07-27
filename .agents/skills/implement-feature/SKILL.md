---
name: implement-feature
description: |
  Implementa autonomamente uma feature do YuGiOh Forbidden Memories Remastered a partir do
  spec.md + plan.md já gerados pelo skill spec-writer, escrevendo o código fase a fase,
  validando cada fase (lint, typecheck, testes e portões de arquitetura do projeto),
  commitando 1 commit por fase e reportando o resultado contra os Critérios de Aceite da
  Seção 9 do PRD do módulo. Como os IDs de feature são locais a cada PRD, a entrada precisa
  identificar o módulo além do ID (ex.: "build-deck F05", "docs/specs/motor-duelo-1x1/F03-.../").
  Use quando: (1) for implementar uma feature que já tem spec e plano, (2) for retomar uma
  implementação parcial, (3) precisar validar uma feature contra seus critérios de aceite.
  Palavras-chave: "implementar feature", "executar o plano", "codar a spec", "implement",
  "rodar o plan.md", "implementar F0X".
---

# Implement Feature — YuGiOh FM Remastered

Implementa autonomamente uma feature a partir do `spec.md` + `plan.md` existentes. Lê a
especificação técnica e o plano, escreve o código fase a fase, valida cada fase, commita, e
reporta o resultado contra os Critérios de Aceite declarados no PRD do módulo.

**Pré-requisito:** a feature precisa ter spec e plano gerados pelo skill `spec-writer`. Sem eles,
este skill aborta e aponta para o `spec-writer`.

**Escreva o relatório final e as mensagens de commit em Português.**

## ENTRADA

Livre. O skill descobre o que foi passado. Qualquer combinação funciona:

- Módulo + ID: `build-deck F05`, `motor-duelo-1x1 F03`
- Pasta da feature: `docs/specs/build-deck/F05-edicao-do-deck-ativo/`
- Arquivo dentro da pasta: `docs/specs/build-deck/F05-.../spec.md`
- Caminho do PRD junto: `@docs/prds/build-deck.md F05`
- Instruções extras em linguagem natural em qualquer posição (ver **Overrides**)

O skill precisa localizar dois arquivos e uma fonte de referência:

1. **`spec.md` e `plan.md`** da feature-alvo, em `docs/specs/<prd-slug>/<FXX>-<kebab-name>/`.
   Se a entrada aponta uma pasta, olhe dentro; se aponta um arquivo, olhe na pasta pai; se aponta
   módulo + ID, procure `docs/specs/<prd-slug>/<FXX>-*`; se aponta só um nome, faça match
   kebab-case difuso contra as pastas em `docs/specs/**`.

2. **O PRD do módulo**, em `docs/prds/<prd-slug>.md`. Derive do `<prd-slug>` do caminho da spec
   (é a fonte mais confiável) ou do cabeçalho `> PRD:` no topo do `spec.md`. Se passado
   explicitamente, use o passado.

**ID sozinho é ambíguo neste projeto.** Existe um `F01` em cada um dos 6 PRDs
(`banco-de-cartas`, `build-deck`, `free-duel`, `library`, `motor-duelo-1x1`, `password`). Se a
entrada for só `F03`, procure em todos os módulos: se casar em exatamente um, siga; se casar em
mais de um, aborte listando os candidatos como `<prd-slug>/FXX — Nome`.

## SAÍDA

- **Commits**: um por fase do `plan.md`, na branch atual (não cria nem troca de branch).
- **Relatório no chat** ao final: checklist dos Critérios de Aceite marcado ✓ / ✗ / — contra
  resultados reais de teste, mais as seções Desvios, Soft-fails, Falhas pré-existentes, Portões de
  arquitetura, Overrides aplicados, Overrides ignorados e Status das fases.

Nenhum arquivo é escrito além das mudanças de código e dos commits. O relatório é efêmero.

---

## CONTEXTO DO PROJETO (pré-carregado)

Este skill não descobre a arquitetura do zero — ela está travada. Estes documentos são a
referência de conformidade, e o código escrito precisa obedecê-los:

- `docs/arquitetura.md` — layout do monorepo, direção de dependências, contratos do motor, esquema
  Postgres, estratégia offline, contrato online, estratégia de testes, pendências (§10)
- `docs/adrs/generated/**/*.md` — o porquê de cada decisão; `needs-input/` marca decisões abertas
- `TypeScript-development-guidelines.md` — nomenclatura, tipos, erros, testes, mocks, DB, logs
- `product.md` — regras do jogo e schema das cartas (invariantes)

**Stack travada (nunca substituir por conta própria):** TypeScript, Node.js 24 LTS, pnpm workspaces
+ Turborepo, Next.js App Router + React + PWA, Supabase (Postgres + Auth + Realtime, RLS ligado),
servidor de duelo Node stateful com WebSocket, Vitest + fast-check, zod nas fronteiras.

**Layout e direção de dependências:**
`packages/shared ← packages/data ← packages/rules ← packages/engine ← packages/ai`;
`apps/web` e `apps/server` dependem de todos. **Nunca inverter.**

---

## PASSOS DE EXECUÇÃO

### Passo 1: Resolver a Entrada

Parseie a entrada inteira como texto livre. Extraia:

- **Referência da feature**: primeiro token que resolve para uma pasta contendo `spec.md` +
  `plan.md`. Casa com `<prd-slug> F\d+`, caminhos de pasta/arquivo (pasta pai = alvo), ou nome de
  feature em kebab-case.
- **Referência do PRD**: caminho `*.md` explícito com ou sem `@`. Caso contrário, derive do
  `<prd-slug>`.
- **Instruções extras**: qualquer texto restante que não seja caminho/ID/nome — trate como
  overrides (Passo 3).

Falhas de resolução:

- Sem `spec.md` ou `plan.md` na pasta resolvida → aborte: "spec.md/plan.md ausente em `<pasta>`.
  Gere-os antes com o skill `spec-writer`."
- Nenhuma pasta casa com a referência → aborte listando as features que já têm spec.
- Referência ambígua (casa em mais de um módulo) → aborte listando os candidatos.
- PRD do módulo não encontrado em `docs/prds/` → aborte: "PRD `<prd-slug>` não encontrado."

### Passo 2: Carregar o Contexto

Leia por completo:

- **`spec.md`** da feature-alvo, com atenção a:
  Seção 1 (Contexto e Escopo, incluindo `Contratos externos assumidos` e `Decisões e Premissas`),
  Seção 2 (**Alocação no Monorepo** — a lista de arquivos que define "pronto"),
  Seção 3 (Design Técnico), Seção 4 (Contratos), Seção 5 (Modelo de Dados),
  Seção 6 (Tratamento de Erros), Seção 7 (Estratégia de Testes).
- **`plan.md`** — pré-requisitos, fases e passos, na ordem.
- **Os Critérios de Aceite da feature no PRD** — localize **semanticamente**, não por número fixo.
  Neste projeto o formato típico é `## 9. Critérios de Aceite` com subseções `### F<ID>. <Nome>` em
  lista de checkbox `- [ ]`, mais os blocos `### Cross-Feature Integration` e
  `### Cross-PRD Integration` ao final. Carregue os critérios da feature-alvo **e** os critérios de
  integração que a citam.

Se o PRD não tiver critérios para esta feature, siga com checklist vazio e registre em soft-fails.

Leia também as **Pendências** citadas na Seção 1 da spec (tabelas de dado externo, itens do §10 da
arquitetura) — elas determinam o comportamento neutro que o código deve implementar.

**Não explore o codebase de forma ampla e antecipada.** Abra arquivos preguiçosamente, conforme
cada fase precisar.

### Passo 3: Aplicar Overrides

Interprete as instruções extras como overrides dos defaults:

| Default | Exemplos de override |
|---|---|
| Limite de retentativa em hard fail = 3 | "sem limite de retentativa", "no máximo 5 tentativas" |
| Totalmente autônomo | "pause entre as fases" — o skill espera resposta com `ok`, `segue`, `continua`, `sim` |
| 1 commit por fase | "um commit só no final", "não commite, só implemente" |
| Roda lint + typecheck + testes | "pule os testes", "pule o lint", "pule o typecheck" |
| Implementa todas as fases | "só as fases 1 e 2", "pule a fase 3" — posições são ordinais; rótulos `A/B/C` mapeiam para `1/2/3` |
| Aborta se dependência interna faltar | — (não overridável, ver Passo 4) |
| Aborta se contrato cross-PRD faltar | "assuma os contratos externos" — cria apenas os **tipos/schemas em `packages/shared`** conforme a Seção 4 da spec, nunca uma implementação falsa em código de produção |
| Aborta testes com dependência externa ausente | "stube o Supabase", "assuma resposta vazia para APIs ausentes" — stubs **somente em código de teste**, nunca em módulos de produção |

Registre cada override reconhecido (antes → depois) para a seção "Overrides aplicados" do relatório.

**Núcleo imutável (não overridável):** o checklist final de Critérios de Aceite e sua
rastreabilidade ao PRD; e os **Portões de Arquitetura** (seção abaixo). Instruções que tentem
desligar qualquer um dos dois vão para "Overrides ignorados" com o motivo.

Instruções ambíguas ou contraditórias → o default vence; registre em "Overrides ignorados" com
"ambíguo, mantido o default".

### Passo 4: Checagem de Dependências (pré-voo)

Localize a Seção 8 do PRD (`## 8. Grafo de Dependências`, `### Parte 1: Tabela de Dependências`).
A coluna `Dependências` mistura dois tipos — trate-os de forma diferente:

**Dependências internas (`FXX` do mesmo PRD):** verifique se aparecem implementadas no código —
procure os arquivos característicos listados na Seção 2 (Alocação no Monorepo) da spec **daquela**
feature, em `docs/specs/<prd-slug>/<FXX>-*/spec.md`. Se alguma faltar → **aborte antes de qualquer
implementação**: "`<prd-slug>`/F<alvo> depende de F<N>, que ainda não está implementada."

**Dependências cross-PRD (`Módulo/FXX`, "Auth/Cadastro", "banco de cartas", etc.):** verifique se o
pacote/módulo correspondente existe. Se não existir:
- Se a Seção 1 da spec listou o item em **`Contratos externos assumidos`** e o `plan.md` o repetiu
  em Pré-requisitos, aborte com: "F<alvo> depende do contrato externo `<X>`, ainda inexistente. Use
  `assuma os contratos externos` para criar apenas os tipos em `packages/shared` e seguir."
- Se não estiver declarado na spec, aborte sem sugerir o override — a spec está incompleta e
  precisa voltar ao `spec-writer`.

**Pré-requisitos do `plan.md`** que não sejam dependências de feature (ex.: "decisão sobre guardião
em cartas ritual a confirmar") não abortam: registre em `Soft-fails` e siga com o comportamento
neutro documentado na spec.

Se o PRD não tiver Seção 8, pule este passo.

### Passo 5: Executar as Fases

Para cada fase do `plan.md`, na ordem:

**5.1 — Pular se já feita**

Inspecione os ~20 commits mais recentes da branch atual. Se alguma mensagem indicar que esta fase
exata já rodou (mesmo `<prd-slug>` + ID + nome ou ordinal da fase), pule com status
`— já commitada`. A detecção é best-effort: case por `<prd-slug>/F<ID>` mais o nome normalizado ou
o índice da fase.

**5.2 — Implementar**

Leia as seções da spec relevantes à fase. Crie/edite os arquivos para cumprir os passos da fase.

**Bootstrap do monorepo:** este projeto pode ainda não ter `package.json`, `pnpm-workspace.yaml`,
`turbo.json` ou o pacote-alvo. Se o `plan.md` já cobre o bootstrap, siga o plano. Se **não** cobre e
o pacote-alvo não existe, crie o mínimo necessário conforme `docs/arquitetura.md` §2 (workspace,
`turbo.json`, `tsconfig` base, `vitest.config`, o pacote-alvo com `package.json` e `src/`) e
registre isso em `Desvios`. **Não** invente estrutura fora do §2 nem crie pacotes que a feature não
precisa.

**O que conta como "pronto" numa fase** — tudo abaixo, não só "escrevi o código":

- Todo arquivo listado para esta fase na **Seção 2 (Alocação no Monorepo)** existe e contém o
  conteúdo descrito.
- Todo contrato descrito para esta fase (schema zod, assinatura de função, ação/evento do motor,
  endpoint/RPC, payload de rede) bate com o que foi escrito.
- A validação do 5.3 passou (hard fails resolvidos), **incluindo os Portões de Arquitetura**.
- Se a fase produz comportamento em runtime não coberto por teste unitário (tela do Next, rota HTTP,
  migração Postgres, WebSocket, script de build de dados), **exercite de verdade** antes de dar como
  pronta: rode o dev server / build / migração / script contra um ambiente local e confirme. Se o
  ambiente não subir nesta execução, registre a checagem em `Soft-fails` — **não** declare a fase
  pronta silenciosamente.

Escrever código sem rodar não é "pronto". Declarar conclusão sem cumprir a checklist acima é
violação do contrato deste skill.

**Adapte quando a realidade divergir da spec** (coluna `stars` no banco vs. `estrelas` na spec, nome
de componente diferente, caminho ligeiramente diferente, tipos estruturalmente compatíveis). Specs
nunca são 100% fiéis à realidade — adaptar é esperado. Registre cada adaptação em `Desvios`. **Não
aborte** por divergência cosmética.

**Aborte a execução inteira somente em:**
- Dependência interna ausente (normalmente pega no Passo 4; se descoberta no meio, aborte aqui).
- Hard fail acima do limite de retentativa (5.3).
- Violação de Portão de Arquitetura que não foi possível resolver dentro do limite de retentativa.

Dependência externa ausente necessária **só para testes** (ex.: Supabase local não disponível) **não**
aborta — soft-falha o teste afetado. O código de produção que chama o serviço continua sendo escrito.

**5.3 — Validar**

Descubra os comandos em runtime: inspecione `package.json` (raiz e do pacote-alvo), `turbo.json`,
`vitest.config.*`, `eslint.config.*`, `tsconfig.json`. Rode os que existirem — tipicamente
`pnpm lint`, `pnpm typecheck` (ou `tsc --noEmit`), `pnpm test` (Vitest), com filtro pelo pacote-alvo
(`pnpm --filter <pacote> test`) durante as fases.

Classificação:

- **Hard fail** = saída não-zero de lint, typecheck, testes **ou de um Portão de Arquitetura**,
  atribuível ao código que esta execução mudou. Retente até o limite (default 3): cada retentativa lê
  o erro, ajusta o código e roda de novo. Passado o limite, aborte a execução e vá ao Passo 6.
- **Soft fail** = a validação não consegue executar neste ambiente (Supabase local ausente, browser
  indisponível para e2e, comando não encontrado, suíte marcada como não executável). Pule, registre
  em `Soft-fails`, siga.
- **Falha pré-existente** = a validação falha mas não é atribuível ao código desta execução (já
  falhava na branch antes). Registre em `Falhas pré-existentes`, **não** conte contra o orçamento de
  retentativas, siga.

Warnings sem saída não-zero nunca são falhas.

**5.4 — Commitar**

Se a validação passou (hard fails resolvidos; só restam soft fails e falhas pré-existentes), stage
**apenas os arquivos que esta fase tocou** e commite com mensagem resumindo a fase. Case o estilo do
projeto inspecionando os ~10 commits recentes. Fallback: `feat(<prd-slug>/F<ID>): <nome da fase>`.

Stage arquivo por arquivo (**nunca** `git add -A` / `git add .`). Commite na branch atual. Não pule
hooks. Nunca commite artefatos de build gerados (`cards.json`, `arts-manifest.json`, `dist/`,
`.next/`, `node_modules/`) — se o pipeline os gerar, garanta que estão no `.gitignore` e registre
isso em `Desvios`.

Se um override desligou os commits, pule este sub-passo e mantenha as mudanças na working tree.

**5.5 — Seguir**

Vá para a próxima fase. Um abort de execução para tudo e vai ao Passo 6 com as fases já commitadas.

### Passo 6: Verificação Final

Depois da última fase (ou quando a execução abortou), rode uma verificação independente sobre a
feature inteira antes de escrever o relatório. Este passo existe porque checagens por fase deixam
regressões passarem, e porque é comum declarar "pronto" sem estar. **Nenhum sub-passo é opcional.**

**6.1 — Validação da suíte completa**

Rode lint, typecheck e a suíte de testes **do repositório inteiro** (não filtre pelos arquivos
tocados).

- Falhas novas que não apareceram por fase → contam como **regressões**. Tente corrigir até o limite
  de retentativa. Se persistirem, **não** declare sucesso: o status vira `concluída com regressões` e
  as falhas vão para `Regressões`.
- Falhas pré-existentes já registradas no 5.3 continuam pré-existentes; não viram regressões.

**6.2 — Conferência da Alocação no Monorepo**

Leia a **Seção 2** da spec e, para cada arquivo listado, verifique: o arquivo existe, o papel
descrito está visível no conteúdo, e os contratos (exports, rotas, schemas, ações/eventos) batem com
a spec dentro das regras de adaptação do 5.2.

Qualquer arquivo, export ou contrato ausente → vai para `Ausente na spec` no relatório. **Não**
declare sucesso com essa lista não vazia.

**6.3 — Re-checagem dos Critérios de Aceite**

Para cada critério carregado no Passo 2, localize o(s) teste(s) mapeado(s) via **Seção 7** da spec
(Estratégia de Testes). Rode esses testes **agora, do zero** — não confie em que passaram numa fase
anterior. Marque ✓ só se passar nesta re-checagem. Se não passar mais → ✗, adicione a `Regressões`,
e não declare sucesso.

Critérios sem teste mapeado ficam `—` (sem teste).

**6.4 — Portões de Arquitetura (re-rodar todos)**

Rode a bateria completa da seção **Portões de Arquitetura** sobre o repositório, não só sobre o
pacote-alvo. Qualquer portão vermelho impede o status `sucesso`.

**6.5 — Smoke check de ambiente (quando aplicável)**

Se a feature produz superfícies de runtime que a validação por fase não exercita, faça um exercício
final de cada uma:
- `apps/web`: `pnpm build` e/ou dev server + carregar a tela da feature
- `apps/server`: subir o processo e completar o handshake de versão/hash
- Postgres/Supabase: aplicar a migração num banco efêmero e checar RLS
- `packages/data`: rodar o pipeline e conferir a contagem canônica (821 arquivos → 722 cartas)
- `packages/engine`: além dos unitários, uma partida sintética curta que chegue ao fim sem exceção

Se o ambiente não subir nesta execução, registre cada smoke check pulado em `Soft-fails` — **não**
suba o status para `sucesso` a menos que todo smoke check tenha passado ou sido honestamente
soft-falhado.

**6.6 — Decisão de status**

O status final vem deste passo, não de "as fases commitaram":

- `sucesso` — suíte completa verde, todos os itens da Seção 2 presentes, todo critério com teste
  passando no 6.3, todos os portões verdes, todo smoke check passou ou soft-falhou.
- `concluída com regressões` — fases commitaram, mas 6.1, 6.3 ou 6.4 acharam falhas não resolvidas.
- `incompleta` — `Ausente na spec` (6.2) não está vazio.
- `abortada na fase <N>` — a execução parou no Passo 5 antes de chegar aqui.

**Nunca** reporte `sucesso` com qualquer checagem acima em falha, mesmo que toda fase tenha
commitado limpa.

### Passo 7: Relatório Final

Saída no chat, em Português. O status vem do 6.6, nunca de "acho que terminei":

```
Feature <prd-slug>/F<ID> — <nome>

Status: sucesso | concluída com regressões | incompleta | abortada na fase <N>
Fases: <N> commitadas / <M> totais
Branch: <branch atual>
Pacotes tocados: packages/<x>, apps/<y>

Critérios de Aceite (re-checados no 6.3):
✓ <texto do critério> (coberto por <nome do teste>)
✗ <texto do critério> (teste falhou após <K> retentativas: <resumo do erro>)
— <texto do critério> (nenhum teste cobre este critério)

Integração cross-feature / cross-PRD (se houver):
✓ <critério> (coberto por <nome do teste>)

Portões de arquitetura:
✓ engine sem imports de UI/IO
✓ sem Math.random() em engine/rules
✓ direção de dependências preservada
✓ tabelas pendentes sem valores inventados
✗ <portão> — <o que foi encontrado>

Ausente na spec (do 6.2):
- <arquivo/export/contrato exigido pela spec e não entregue>

Regressões (do 6.1, 6.3 ou 6.4):
- <teste> passou a falhar nesta execução: <erro>

Desvios:
- <o que foi adaptado e por quê>

Soft-fails:
- <o que foi pulado e por quê, incluindo smoke checks não exercitados>

Falhas pré-existentes:
- <teste>: já falhava na entrada desta execução; deixado como estava

Pendências que a feature deixou em aberto:
- <tabela de dado externo / decisão do §10 e o comportamento neutro implementado>

Overrides aplicados:
- Limite de retentativa: 3 → ilimitado

Overrides ignorados:
- "<texto>" (motivo)

Motivo do abort (se abortada): <erro>
```

Se abortou, o relatório mesmo assim lista o que as fases commitadas entregaram e marca claramente
qual fase falhou e por quê.

---

## Portões de Arquitetura

Verificações específicas deste projeto, rodadas no 5.3 (escopo do pacote tocado) e no 6.4 (repo
inteiro). Um portão vermelho é **hard fail**. Nenhum é overridável.

| Portão | Como verificar | Quando aplica |
|---|---|---|
| `engine` puro | Nenhum import de `react`, `next`, `react-dom`, DOM globals, `fetch`, `@supabase/*`, `fs`, `node:*` em `packages/engine` e `packages/rules` | Fase toca `engine`/`rules` |
| Sem aleatoriedade não semeada | Nenhuma ocorrência de `Math.random()`, `Date.now()` ou `crypto.randomUUID()` dentro de `packages/engine`, `packages/rules`, `packages/ai` — o PRNG semeado vive no estado | Idem |
| Direção de dependências | Nenhum pacote importa outro à sua direita em `shared ← data ← rules ← engine ← ai`; nenhum `packages/*` importa `apps/*` | Sempre |
| Estado serializável | O `EstadoDuelo` sobrevive a `deserialize(serialize(s))` sem perda (teste de round-trip existe e passa) | Fase toca o estado do duelo |
| Base imutável | `atk`/`def` base da carta nunca sobrescritos; modificadores de guardião/terreno/equip entram só no cálculo efetivo | Fase toca cálculo de combate |
| Tabelas pendentes neutras | Fusões, drops, matriz de guardiões e matriz terreno↔classe permanecem vazias/parciais no repo; o código trata ausência como neutro (modificador 0 / sem fusão). **Nenhum valor de lore inventado no código ou em fixtures de produção** | Fase toca `rules`/`data` |
| Invariantes do jogo | Constantes hard-coded não contradizem: 40 cartas, máx. 3 cópias, 8000 LP, 5+5 zonas, mão de 5, 1 ação/turno, sem ataque no primeiro turno | Sempre |
| Validação na fronteira | Toda entrada externa (ingestão de dados, ação do jogador, payload de rede, resposta de RPC) passa por schema zod antes de virar estado | Fase toca fronteira |
| Economia atômica e idempotente | Débito de estrelas + concessão de carta numa única transação/RPC server-side; crédito de vitória com chave única (`duel_id`); nenhum valor de economia vindo do cliente | Fase toca estrelas/recompensa/coleção |
| RLS ligada | Toda tabela nova em Postgres tem RLS habilitada e política por jogador | Fase cria tabela |
| Handshake de dataset | Sessão online recusa datasets com `version`/`hash` divergentes | Fase toca `apps/server` |
| Conformidade com os guidelines | Nomenclatura, tratamento de erro, estrutura de testes e logs conforme `TypeScript-development-guidelines.md` | Sempre |

Quando um portão falha, corrija o código — **nunca** afrouxe o portão, nem adicione exceção de lint,
nem mova o arquivo de pacote só para o portão passar. Se a spec pedir algo que viola um portão, isso
é um erro da spec: aborte e reporte, apontando o conflito.

---

## REGRAS

**SEMPRE:**
- Exigir `spec.md` + `plan.md` na pasta-alvo; abortar sem eles apontando o `spec-writer`.
- Incluir o `<prd-slug>` ao resolver a feature — IDs são locais a cada PRD.
- Localizar critérios de aceite e grafo de dependências no PRD **semanticamente**, nunca por número
  fixo de seção.
- Commitar 1 por fase (default), stageando só os arquivos daquela fase.
- Casar o estilo de mensagem de commit recente do projeto.
- Adaptar divergências pequenas entre spec e código; registrar tudo em `Desvios`.
- Validar após cada fase, diferenciando hard fail (retenta ≤ limite), soft fail (pula + registra) e
  falha pré-existente (registra, não retenta).
- Rodar os Portões de Arquitetura no 5.3 e no 6.4.
- Antes de dar uma fase como pronta: confirmar que todo arquivo da Seção 2 daquela fase existe com o
  conteúdo descrito **e** que a validação passou.
- Para fases com superfície de runtime (tela, rota, migração, WebSocket, script de dados),
  exercitá-las contra um ambiente local antes de dar como prontas, ou soft-falhar a checagem.
- Executar o Passo 6 inteiro antes de reportar.
- Derivar o status exclusivamente do 6.6.
- Escrever relatório e commits em Português.

**NUNCA:**
- Declarar `sucesso` com regressões, itens ausentes na spec, portão vermelho ou falhas não resolvidas
  — mesmo que toda fase tenha commitado limpa.
- Pular o checklist de Critérios de Aceite ou sua rastreabilidade ao PRD (núcleo imutável).
- Pular o Passo 6 ou qualquer Portão de Arquitetura.
- Criar ou trocar de branch.
- Abortar por divergência cosmética de nome/caminho/tipo.
- Abortar por dependência externa ausente **de teste** — soft-falhe o teste e siga implementando.
- Usar `git add -A` ou `git add .`.
- Pular hooks de git.
- Commitar artefatos gerados (`cards.json`, `arts-manifest.json`, `dist/`, `.next/`).
- Contar falhas pré-existentes contra o orçamento de retentativas.
- Reexecutar fases já commitadas na branch.
- Inserir stub de serviço em módulo de produção — stubs só em arquivos de teste.
- Preencher valores de guardião, terreno, fusão, drops, rating ou balanceamento no código ou em
  fixtures de produção.
- Trocar qualquer item da stack travada por conta própria.
- Explorar o codebase inteiro de forma antecipada — leia sob demanda, fase a fase.
- Declarar fase completa só porque "escrevi os arquivos".

---

## Overrides

Instruções livres na invocação sobrescrevem defaults:

- **Retentativa**: `sem limite de retentativa`, `no máximo 5 tentativas`
- **Autonomia**: `pause entre as fases` — espera resposta (`ok`, `segue`, `continua`, `sim`)
- **Commits**: `não commite, só implemente`; `um commit só no final`
- **Validação**: `pule os testes`, `pule o lint`, `pule o typecheck`
- **Seleção de fase**: `só as fases 1 e 2`, `pule a fase 3` — ordinais; `A/B/C` → `1/2/3`
- **Contratos externos**: `assuma os contratos externos` — cria só os tipos/schemas em
  `packages/shared` conforme a Seção 4 da spec
- **Serviços externos**: `stube o Supabase`, `assuma resposta vazia para APIs ausentes` — stubs
  **somente** em código de teste

Overrides não reconhecidos ou contraditórios: default vence, registrado em `Overrides ignorados`.

**Núcleo imutável:** o checklist de Critérios de Aceite com rastreabilidade ao PRD, e os Portões de
Arquitetura.

---

## Casos de Borda

**Sem `spec.md` ou `plan.md`:** aborte antes de começar, apontando o skill `spec-writer`.

**PRD do módulo não encontrado:** aborte antes de começar.

**Só o ID informado (`F03`):** procure em todos os PRDs; um match → siga; vários → aborte listando
`<prd-slug>/FXX — Nome`.

**Dependência interna não implementada:** aborte no Passo 4 com mensagem clara.

**Contrato cross-PRD inexistente:** aborte no Passo 4, sugerindo `assuma os contratos externos`
somente se a spec o declarou em `Contratos externos assumidos`.

**Projeto ainda sem monorepo (sem `package.json`, `pnpm-workspace.yaml`):** faça o bootstrap mínimo
conforme `docs/arquitetura.md` §2 e registre em `Desvios`. Não crie pacotes que a feature não usa.

**Comandos de validação não descobríveis** (projeto recém-inicializado): registre cada comando
ausente em `Soft-fails` e siga. Se a própria fase deveria criar o script de teste, isso é hard fail,
não soft fail.

**Feature depende de tabela pendente (guardião/terreno/fusão/drops):** implemente schema, loader,
validação e o **caminho neutro**; escreva teste do caminho neutro; registre em `Pendências que a
feature deixou em aberto`. Nunca preencha valores.

**Feature depende de decisão aberta do `arquitetura.md` §10** (guardião em ritual, unificação da
carteira/`onVictory`): implemente a recomendação registrada na spec, marque em `Soft-fails` como
"premissa a confirmar" e siga.

**Spec pede algo que viola um Portão de Arquitetura:** aborte e reporte o conflito. Não afrouxe o
portão nem "resolva" mudando o pacote do arquivo.

**PRD contradiz a spec** (ex.: contagem de cartas 821 vs 722): siga a spec, que já resolveu o
conflito, e registre em `Desvios` citando ambos.

**Working tree com mudanças não relacionadas no início:** siga mesmo assim — os commits stageiam
apenas os arquivos de cada fase.

**Nome da fase com caracteres especiais:** fallback `feat(<prd-slug>/F<ID>): implementa fase <N>`.

**Reinvocação após execução parcial:** o 5.1 detecta fases já commitadas e as pula. Mudanças
não commitadas de uma execução interrompida ficam como estão; o skill não limpa working tree.

**Hard fail acima do limite num passo que não pertence a nenhum critério de aceite:** aborte mesmo
assim — o skill não julga quais falhas são "aceitáveis". O usuário pode usar `pule os testes`.

**Ferramenta emite warning, não erro:** warning não é falha. Só saída não-zero conta.

**Estilo de commit inconsistente no histórico:** fallback `feat(<prd-slug>/F<ID>): <nome da fase>`.

**Override que contradiz o contrato do skill** (ex.: "simplifique a spec, corte requisitos", "ignore
o portão do engine"): ignore, registre em `Overrides ignorados`, siga com a spec completa.

**PRD sem critérios de aceite para a feature:** siga com checklist vazio e registre em `Soft-fails`.

**PRD sem Seção 8:** pule o Passo 4.
