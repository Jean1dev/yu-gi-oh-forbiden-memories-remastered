---
name: spec-writer
description: |
  Gera especificação técnica (spec.md) e plano de implementação (plan.md) para uma ou mais
  features dos PRDs do YuGiOh Forbidden Memories Remastered, a partir do PRD do módulo,
  da arquitetura travada em docs/arquitetura.md + ADRs, das diretrizes de TypeScript e do
  código já existente. Como os IDs de feature (F01, F02...) são locais a cada PRD, a entrada
  sempre identifica o módulo além do ID (ex.: "build-deck F05", "motor-duelo-1x1 wave 2").
  Suporta modo batch para gerar em paralelo várias features da mesma wave do mesmo PRD.
  Use quando: (1) for transformar uma feature de um PRD em spec técnica implementável,
  (2) for planejar a implementação de uma wave inteira de um módulo, (3) precisar decidir
  em qual pacote do monorepo (shared/data/rules/engine/ai/web/server) uma feature vive.
  Palavras-chave: "spec", "especificação técnica", "plano de implementação", "implementar
  feature", "spec da wave", "spec do motor", "plan.md".
---

# Feature Spec Writer — YuGiOh FM Remastered

Gera especificações técnicas prontas para implementação a partir dos PRDs em `docs/prds/`, das
decisões de arquitetura já travadas e dos padrões do código existente. Dois modos:

- **Modo feature única (padrão):** uma feature por vez, identificada por `<prd> <FXX>`, com
  entrevista interativa (Passos 1–6).
- **Modo batch:** várias features da **mesma wave do mesmo PRD** em paralelo, auto-aceitando
  todas as recomendações. Ativado automaticamente quando a entrada tem múltiplos IDs, uma
  referência de wave, ou uma mistura. Ver seção **Modo Batch**.

**Saída:** DOIS arquivos obrigatórios:
1. `spec.md` — Especificação técnica (7 seções)
2. `plan.md` — Plano de implementação (fases e passos)

**Local de saída:** `docs/specs/<prd-slug>/<FXX>-<kebab-name>/spec.md` e `.../plan.md`

O `<prd-slug>` é o nome do arquivo do PRD sem extensão (ex.: `build-deck`, `motor-duelo-1x1`).
O `<kebab-name>` vem do nome da feature na Seção 6 do PRD (minúsculas, espaços → hífens,
acentos removidos, caracteres fora de `[a-z0-9-]` descartados).
Exemplo: `build-deck` + `F05. Edição do Deck Ativo` → `docs/specs/build-deck/F05-edicao-do-deck-ativo/`.

**O `<prd-slug>` no caminho é obrigatório porque os IDs são locais a cada PRD** — existe um `F01`
em cada um dos 6 PRDs. Nunca salve em `docs/specs/F01-.../`.

**Escreva spec.md e plan.md inteiros em Português.**

---

## FASE 0: Contexto do Projeto (pré-carregado)

Diferente de um spec-writer genérico, este skill **não descobre a stack do zero** — ela já está
decidida. Antes do Passo 1, releia os documentos abaixo e confirme que o resumo continua fiel.
**Os arquivos são a fonte da verdade**; se divergirem deste resumo, o arquivo vence.

**Precedência de fontes (da mais forte para a mais fraca):**

1. `docs/prds/<modulo>.md` — **o quê** construir (requisitos da feature-alvo)
2. `docs/arquitetura.md` — **como** construir (decisões travadas, layout do monorepo, contratos)
3. `docs/adrs/generated/**/*.md` — o **porquê** de cada decisão + pendências (`needs-input/`)
4. `TypeScript-development-guidelines.md` — convenções de código, testes, erros, logs, DB
5. `product.md` — regras centrais do jogo e schema das cartas (imutáveis, ver abaixo)
6. Código existente em `packages/` e `apps/` — padrões reais observados

Quando o PRD contradiz `arquitetura.md`, **não escolha sozinho**: ver Casos de Borda.

### 0.1 Decisões de stack travadas (nunca reabrir na entrevista)

| Eixo | Decisão |
|------|---------|
| Linguagem | TypeScript ponta-a-ponta, monorepo |
| Runtime | Node.js 24 LTS |
| Frontend | Next.js (App Router) + React + PWA; tabuleiro em DOM/CSS |
| Backend/persistência | Supabase (Postgres + Auth + Realtime), RLS ligado |
| Servidor de duelo online | Processo Node.js 24 LTS stateful à parte, WebSocket |
| Monorepo | pnpm workspaces + Turborepo |
| Testes | Vitest + fast-check (property-based) |
| Validação | zod nas fronteiras (ingestão, ações, payloads de rede) |
| Faseamento | MVP offline-first primeiro; Online por último |

**Nunca pergunte ao usuário** qual framework, ORM, runtime, biblioteca de testes ou estratégia
de validação usar. Isso está travado. Pergunte apenas sobre o que é interno à feature.

### 0.2 Layout do monorepo e direção de dependências

```
packages/shared/   Schemas (zod) e tipos: Carta, Acao, Evento, EstadoDuelo, contratos de rede. Sem lógica.
packages/data/     Banco de Cartas: pipeline 821→722, catálogo em memória, artes, tabelas auxiliares, bundle versionado + hash.
packages/rules/    Guardian Star / Terrain / Fusion / Effect System. Funções puras sobre tabelas de `data`.
packages/engine/   Motor de Duelo: reducer puro apply(state, action) → { state, events }. Zero UI/IO. PRNG semeado.
packages/ai/       IA de NPCs: (EstadoDuelo público) → Acao. Consome `engine`, não o duplica.
apps/web/          Next.js: Menu, Library, Build Deck, Password, Free Duel. Instancia o engine localmente.
apps/server/       Online Duel: Node.js + WebSocket + 1 engine por partida. (Fase final.)
```

**Direção de dependências (nunca inverter):** `shared ← data ← rules ← engine ← ai`; `web`/`server`
dependem de todos. `engine` **não** depende de `web`, `server`, React, DOM, `fetch` ou Supabase.

Toda spec deve declarar explicitamente em qual pacote cada arquivo novo vive e por quê
(Seção 2 da spec). Alocação errada é o erro mais caro deste projeto.

### 0.3 Invariantes de regra do jogo (de `product.md` — nunca contradizer)

5 zonas de monstro + 5 de magia/armadilha por jogador; 1 terreno ativo por vez; mão de 5 cartas
no início do turno; deck de exatamente 40 cartas com máximo 3 cópias; 8000 LP; deck zerado =
derrota; 1 ação principal por turno; monstro ataca no máximo 1x por turno; posições ataque/defesa
× face cima/baixo; quem joga o primeiro turno não ataca; fusão de monstros existe.

Schema de carta: `id, numero, nome, img, classe, atk, def, guardiao1, guardiao2, password,
estrelas, tipo`. `estrelas` = preço de compra; `password` = senha da aba Password. Dados reais em
`cards-data/dados/*.json` (821 arquivos → 722 cartas canônicas) e artes em `cards-data/*.jpg`.
**Nenhuma spec inventa campos novos** sem justificativa explícita em Decisões e Premissas.

### 0.4 Pendências de dado externo (nunca inventar valores)

Estas tabelas **não existem no repositório** e são dado externo a ser fornecido pelo usuário:

- Matriz de Guardiões Estelares (10×10: Sun, Moon, Mars, Jupiter, Mercury, Neptune, Pluto,
  Saturn, Uranus, Venus)
- Matriz terreno ↔ classe (~24 classes)
- Tabela de fusões
- Tabela de drops por duelista
- Rating Engine: escala de notas + tabela nota→recompensa (`free-duel` F05)
- Balanceamento: pool do deck inicial, N estrelas/vitória, saldo inicial, roster de NPCs

**Regra dura:** a spec entrega **schema + loader + validação + fallback neutro** (modificador 0,
"sem fusão conhecida", lista vazia), **nunca valores inventados de lore do jogo original**. Toda
feature que toca uma dessas tabelas registra a pendência em Decisões e Premissas e gera um
critério de teste do caminho neutro.

### 0.5 Pendências de decisão em aberto (`docs/arquitetura.md` §10)

- Regra de guardiões vs. cartas ritual (`banco-de-cartas` F02 reprovaria o dataset real)
- Unificação da carteira de estrelas e do handler `onVictory` entre `free-duel` e `password`
- ADRs em `docs/adrs/generated/**/needs-input/` têm blocos `[PRECISA DE ENTRADA: ...]`

Se a feature-alvo depende de uma dessas, **pergunte ao usuário** no modo feature única; no modo
batch, aplique o default da Política de Auto-Aceite e documente.

---

## PASSOS DE EXECUÇÃO (6 Passos)

Estes são passos internos do agente. O `plan.md` gerado terá 1-5 fases conforme a complexidade.

### Passo 1: Resolver Entrada e Pré-Análise

**1.1: Identificar o PRD e a feature-alvo**

Aceite entrada livre. O usuário pode referenciar por `<prd> <FXX>` (`build-deck F05`), por nome
(`Edição do Deck Ativo`), por caminho (`docs/prds/build-deck.md F05`), ou combinações.

- Liste os PRDs disponíveis em `docs/prds/`. Hoje: `banco-de-cartas`, `build-deck`, `free-duel`,
  `library`, `motor-duelo-1x1`, `password`.
- **Se o usuário informou só o ID (`F05`) sem o módulo, pergunte qual PRD** — o ID sozinho é
  ambíguo por construção neste projeto. Não adivinhe.
- Se o nome da feature casar com features de PRDs diferentes, liste os candidatos e peça
  desambiguação.
- Se a feature não existir no PRD, liste as features da Seção 8 daquele PRD e pergunte.

**PRD é obrigatório.** Se o módulo pedido não tiver PRD em `docs/prds/`, pare e instrua o usuário
a gerar um antes com o skill `duel-feature-prd`. Não caia numa entrevista solta.

**1.2: Checar prontidão de dependências (internas e cross-PRD)**

Leia a Seção 8 do PRD (Parte 1: Tabela de Dependências). A coluna `Dependências` mistura dois
tipos — trate-os de forma diferente:

- **Dependências internas (`FXX` do mesmo PRD):** verifique se já existe spec em
  `docs/specs/<prd-slug>/<FXX>-*/` e/ou implementação no código. Se faltar, avise:
  "F05 depende de F04 (sem spec e sem implementação). Continuar mesmo assim?" — prossiga só se
  confirmado.
- **Dependências cross-PRD (`Módulo/FXX`, "Auth/Cadastro", "banco de cartas", etc.):** verifique
  se o pacote correspondente existe em `packages/`/`apps/`. Se não existir, **não bloqueie** —
  a spec deve tratar a dependência como **contrato externo** e declarar explicitamente a
  interface esperada na Seção 4 (Contratos), marcando-a como "a ser fornecida por <Módulo>".
  Avise o usuário uma vez e siga.

**1.3: Estado do projeto e ordem do roadmap (equivalente de greenfield/Foundation)**

O projeto está hoje **sem código de implementação** (só `cards-data/`, `docs/` e `product.md`).
A detecção correta de estado usa artefatos característicos, não marcadores genéricos:

- `packages/data/` com pipeline de ingestão / `cards.json` gerado → Fase 0 do roadmap implementada
- `packages/engine/` com `apply`/`initDuel` → Fase 1 implementada
- `apps/web/` com App Router e telas → Fase 2+ em andamento
- `apps/server/` com WebSocket → Fase 5 em andamento

**Não use** a mera existência de `package.json`, `pnpm-workspace.yaml` ou `node_modules` como
sinal — qualquer scaffolding cria isso.

Cruze com duas ordens de precedência:

- **Foundation Features do PRD** (Seção 8, Parte 2) — infraestrutura compartilhada do módulo.
- **Roadmap por fases** (`docs/arquitetura.md` §9) — Fase 0 (dados) → 1 (motor) → 2 (auth/
  persistência/Library/Build Deck/Password) → 3 (Free Duel vs IA) → 4 (Effect System + tabelas)
  → 5 (Online).

Cenários:

- **Alvo é Foundation do seu PRD e nada foi implementado ainda:** prossiga sem aviso extra. É o
  caminho esperado.
- **Alvo não é Foundation e a Foundation do PRD não tem spec/implementação:** avise — "F05 não é
  Foundation; F01 (Coleção do Jogador) é a Foundation deste módulo e ainda não existe. Recomendo
  começar por F01. Continuar com F05 mesmo assim?" — prossiga só se confirmado.
- **Alvo pertence a uma fase do roadmap posterior enquanto uma fase anterior não existe** (ex.:
  spec de `online-duel` sem `packages/engine`): avise que a spec vai depender de contratos ainda
  não materializados e que o `plan.md` assumirá esses contratos como pré-requisito. Prossiga se
  confirmado.

**Nota Modo Batch:** o orquestrador faz estas checagens uma vez para o lote inteiro (B.2 e B.3) e
filtra antes de despachar. Sub-agentes pulam todo "avise o usuário / continuar mesmo assim?".

**1.4: Descoberta de Padrões (três camadas)**

Obrigatório antes de escrever a spec (antes da entrevista no modo único; antes da Política de
Auto-Aceite no modo batch).

**Camada 0 — Documentos de arquitetura (SEMPRE obrigatória, mesmo sem código):**
Esta camada substitui a "entrevista de stack" de um spec-writer genérico. Extraia:
- `docs/arquitetura.md`: pacote-alvo da feature, contratos já definidos (`apply`, `initDuel`,
  `serialize`/`deserialize`, registry de efeitos), esquema Postgres inicial (§5.1), estratégia
  offline/IndexedDB + fila idempotente (§5.4), contrato online (§6), estratégia de testes (§8),
  pendências (§10).
- ADRs relevantes ao pacote-alvo: leia o ADR correspondente ao eixo da feature (dados → ADR-003,
  duelo → ADR-002, frontend → ADR-004, persistência → ADR-005, economia → ADR-006, online →
  ADR-007, qualidade → ADR-008, roadmap → ADR-009, plataforma → ADR-001). Cite o ADR na spec
  quando a decisão dele restringir o desenho.
- `TypeScript-development-guidelines.md`: convenções de nomenclatura, sistema de tipos, tratamento
  de erros, testes unitários/integração, mocks, banco de dados, logs/observabilidade, segurança.
  A spec deve estar em conformidade com essas seções, não reinventá-las.
- Specs já geradas em `docs/specs/**` — padrões e decisões já tomadas em features anteriores
  valem como precedente e **não devem ser reperguntados**.

**Camada 1 — Baseline do código (quando `packages/`/`apps/` já tiverem implementação):**
runtime e versão efetiva; estrutura real de pacotes vs. a planejada; forma dos schemas zod em
`shared`; convenção de exports dos pacotes; estilo de reducer/eventos no `engine`; acesso a
Supabase e uso de RPC; formato de erro; padrão de teste (nomes de arquivo, uso de fast-check);
convenções de nome de arquivo/pasta.

**Camada 2 — Exploração ampla (também obrigatória quando há código):** qualquer padrão adicional
que informe a implementação — idiomas recorrentes, abstrações repetidas, logging, config, build
scripts, i18n, acessibilidade, PWA/service worker. O baseline é piso, não teto.

**Se ainda não há código:** a Camada 0 sozinha é suficiente para escrever a spec — **não pergunte
questões transversais de stack**, elas já estão respondidas na Fase 0 e nos ADRs. Qualquer decisão
transversal genuinamente nova (ex.: escolher entre Zustand e `useReducer`+context, que
`arquitetura.md` §7 deixa em aberto) é uma pergunta legítima da entrevista.

**1.5: Ler os dados da feature no PRD**

Extraia a definição completa da feature-alvo e carregue como contexto:
- Nome e ID da feature; bloco Consumes; bloco Provides; Core Scope; Full Scope additions;
  Capabilities; Experience; Error Handling
- Critérios de aceite da Seção 9 daquela feature
- Critérios de **Cross-Feature Integration** da Seção 9 que citam esta feature
- Critérios de **Cross-PRD Integration** da Seção 9 que citam esta feature
- Itens da Seção 7 (Fora de Escopo) que delimitam a fronteira desta feature

**1.6: Apresentar o entendimento**

```
Com base na análise, entendi que você quer implementar:

**Feature:** <prd-slug> / F<ID>. <Nome>
**Resumo técnico:** [1-2 frases derivadas de Capabilities + Experience]
**Pacote-alvo:** packages/<x> (+ apps/<y>) — [motivo em uma linha]
**Arquitetura aplicável:** [decisões de arquitetura.md e ADRs que restringem esta feature]
**Estado do projeto:** [fase do roadmap implementada / ainda sem código]
**Pendências que tocam esta feature:** [tabelas de dado externo, itens do §10, ou "nenhuma"]
**Contexto do PRD carregado:** Consumes, Provides, Core/Full Scope, Capabilities, Experience,
Error Handling, critérios de aceite e integração

Preciso esclarecer algumas decisões técnicas que o PRD e a arquitetura não respondem.
```

**Nota Modo Batch:** sub-agentes pulam este passo — não há usuário interativo. O plano
consolidado (B.4) cobre o entendimento compartilhado do lote.

### Passo 2: Entrevista

**Override do Modo Batch:** neste modo o passo inteiro é substituído pela Política de Auto-Aceite.
Sub-agentes pulam o Passo 2 e vão direto ao Passo 3 com os defaults aplicados. Toda instrução
"pergunte ao usuário" vira "aplique o default e documente em Decisões e Premissas".

Entreviste o usuário sobre cada aspecto do desenho até chegar a um entendimento compartilhado.
Percorra cada ramo da árvore de decisão, resolvendo dependências entre decisões uma a uma. Para
cada pergunta, dê sua resposta recomendada. **Uma pergunta por vez.**

Se a pergunta pode ser respondida explorando o código ou lendo PRD/arquitetura/ADR/guidelines,
**explore ou leia em vez de perguntar**.

**Pergunta de escopo (primeira, quando aplicável):** se a feature tem os blocos `Core Scope` **e**
`Full Scope additions` no PRD, pergunte: "A spec deve cobrir só o Core Scope, ou Core + Full Scope
additions?". Se só um bloco existir, ou nenhum, pule e assuma o escopo completo da feature.

**Regra anti-redundância — NÃO pergunte sobre nada já observável em:**
- Definição da feature no PRD (Consumes, Provides, Core Scope, Capabilities, Experience, Error
  Handling) e seus critérios de aceite
- Fase 0 deste skill (regras do jogo, schema de carta, stack travada, layout do monorepo)
- `docs/arquitetura.md` e ADRs (runtime, framework, persistência, testes, contratos do motor)
- `TypeScript-development-guidelines.md` (nomenclatura, erros, logs, padrão de testes)
- Padrões descobertos no Passo 1.4 ou specs anteriores em `docs/specs/**`

**Foque a entrevista no que ninguém respondeu ainda:** arquitetura interna da feature, formato
exato de estruturas de estado, colunas/índices/constraints novos além do esquema inicial de
`arquitetura.md` §5.1, assinaturas de função/endpoint/RPC, regras de validação não fixadas em
Capabilities, nomes de arquivos novos, escolha entre bibliotecas quando o ADR não fixou, ordem de
resolução de eventos, casos de borda não cobertos por Error Handling.

**Especificação parcial no PRD:** quando o PRD cita uma capacidade mas omite um detalhe técnico
(ex.: "busca ≤200ms" sem dizer se é debounce ou índice pré-computado), pergunte o detalhe em vez
de assumir default silenciosamente.

**Pendências de dado externo:** se a feature depende de uma tabela da Fase 0.4, **não pergunte os
valores** — pergunte apenas como o sistema deve se comportar enquanto a tabela estiver vazia
(recomende: fallback neutro conforme `arquitetura.md` §4.3) e confirme.

### Passo 3: Resumo e Premissas

Depois das respostas:
- Resuma as decisões técnicas tomadas
- Liste as premissas derivadas do PRD, da arquitetura/ADRs, dos padrões do código e da entrevista
- Aponte explicitamente qual bloco do PRD / seção de arquitetura informou cada parte da spec
  (rastreabilidade)
- Liste as pendências que a spec deixa em aberto e o comportamento neutro adotado para cada uma

**Nota Modo Batch:** não há respostas de entrevista. Trate cada default de Auto-Aceite aplicado
como se fosse uma resposta — liste em premissas, nomeie a linha da política que o produziu, e
marque para revisão posterior do usuário.

### Passo 4: Gerar os Documentos

**Anuncie:** "Gerando DOIS documentos: SPEC e PLAN..."

**Escala por complexidade:**
- trivial: 1-2 fases, 2-4 passos
- simples: 2-3 fases, 5-8 passos
- média: 3-4 fases, 10-15 passos
- complexa: 4-5 fases, 15-25 passos

A profundidade da SPEC (estruturas, índices, migrações, tabelas de teste) escala com a
complexidade. Os passos do PLAN são sempre de alto nível, independente da complexidade.

**4.1: Gerar a SPEC** — 7 seções:

1. **Contexto e Escopo** — o que a feature entrega, com subseções `Incluído`, `Adiado` (Full Scope
   quando o usuário escolheu só Core) e `Decisões e Premissas` (obrigatória).
2. **Alocação no Monorepo** — pacote(s)-alvo, lista de arquivos novos/alterados com caminho
   completo, e verificação explícita da direção de dependências.
3. **Design Técnico** — estruturas de dados, funções/módulos, algoritmos, fluxo de estados,
   eventos emitidos/consumidos, pureza e determinismo quando tocar o `engine`.
4. **Contratos** — tipos/schemas zod em `shared`, assinaturas de funções públicas, ações e eventos
   do motor, endpoints/RPCs, payloads de rede, contratos externos cross-PRD ainda inexistentes.
   Com exemplos JSON.
5. **Modelo de Dados** — tabelas Postgres (colunas, tipos, PK/FK, índices, constraints, RLS),
   estruturas IndexedDB/fila offline, e/ou formato dos arquivos de dados versionados. Inclui
   migrações quando houver.
6. **Tratamento de Erros e Casos de Borda** — mapeando o bloco Error Handling do PRD + falhas
   técnicas (rede, conflito de versão/hash, dados inválidos, fila offline, idempotência).
7. **Estratégia de Testes** — testes específicos com nome de função/caso: unitários (Vitest),
   property-based (fast-check) quando houver determinismo/round-trip, integração, análise estática
   (pilar do `engine` sem UI/IO), e os critérios de aceite do PRD como testes de aceitação.

Escala de seções:
- trivial/simples: pule as Seções 4 e 5 se genuinamente não aplicáveis (ex.: feature puramente de
  UI sem contrato novo). Seções 1, 2, 3, 6 e 7 são sempre obrigatórias.
- média/complexa: todas as 7 seções.

**Mapeamento PRD → SPEC (aplicar consistentemente):**

| Bloco do PRD | Destino no spec.md |
|--------------|--------------------|
| Consumes | Seção 1 (contratos de entrada) + Seção 4 (quando o dado chega por API/contrato) |
| Provides | Seção 1 (contratos de saída) + Seção 4 |
| Core Scope | Seção 1 → "Incluído" |
| Full Scope additions | Seção 1 → "Adiado" (se o usuário pediu só Core) ou "Incluído" |
| Capabilities | Seção 3 (regras de negócio e limites) |
| Experience | Seção 3 (fluxos) e, quando houver UI, Seção 2 (componentes em `apps/web`) |
| Error Handling | Seção 6 |
| Seção 9 — critérios da feature | Seção 7 → testes de aceitação |
| Seção 9 — Cross-Feature Integration citando a feature | Seção 7 → testes de integração |
| Seção 9 — Cross-PRD Integration citando a feature | Seção 7 → testes de contrato/integração externa |
| Seção 7 do PRD (Fora de Escopo) relevante | Seção 1 → fronteira explícita |

**Mapeamento arquitetura → SPEC:** cite `docs/arquitetura.md §X` e `ADR-00N` sempre que uma decisão
da spec for consequência direta deles. Uma spec sem nenhuma citação de arquitetura provavelmente
não fez a Camada 0.

**4.2: Gerar o PLAN**
- Seção de Pré-requisitos (dependências internas, contratos externos assumidos, pendências de dado)
- Fases com passos numerados, 1-3 frases cada, alto nível
- Descreva O QUE fazer, referenciando a spec para o COMO

Use `references/feature-template.md` como template dos dois arquivos.

**Anuncie:** "Ambos os documentos prontos. Salvando..."

### Passo 5: Validar e Salvar

**Checklist da SPEC:**
- [ ] Seções obrigatórias presentes (todas as 7 em média/complexa)
- [ ] Seção 2 lista caminhos completos de arquivo e nomeia o pacote de cada um
- [ ] Direção de dependências respeitada: `shared ← data ← rules ← engine ← ai`; nada em `engine`
      importa UI, DOM, `fetch`, Supabase ou React
- [ ] Se toca o `engine`: pureza declarada, PRNG semeado (nunca `Math.random()`), estado
      serializável, `atk`/`def` base nunca sobrescritos
- [ ] Contratos com exemplos JSON (quando a Seção 4 existe)
- [ ] Modelo de dados com tipos, índices, constraints e RLS (quando a Seção 5 existe)
- [ ] Testes com nomes específicos de caso, não descrições vagas
- [ ] Blocos do PRD mapeados conforme a tabela; Consumes/Provides refletidos em Escopo ou Contratos
- [ ] Critérios de Cross-Feature e Cross-PRD Integration do PRD viraram testes
- [ ] Nenhum valor inventado das tabelas pendentes (guardião, terreno, fusão, drops, rating,
      balanceamento) — fallback neutro documentado
- [ ] Nenhuma contradição com os invariantes de regra da Fase 0.3 sem desvio confirmado pelo usuário
- [ ] Conformidade com `TypeScript-development-guidelines.md` (nomenclatura, erros, testes, DB)
- [ ] Se toca economia (estrelas/recompensa): atomicidade via RPC server-side, idempotência por
      `duel_id`/`idRecompensa`, nenhum valor sensível vindo do cliente
- [ ] Se toca online: handshake de versão/hash do dataset e validação autoritativa no servidor
- [ ] Dependências cross-PRD marcadas como contrato externo, não como código interno

**Checklist do PLAN:**
- [ ] Passos numerados dentro das fases
- [ ] Formato: **N. Componente** — parágrafo de alto nível (1-3 frases)
- [ ] Passos dizem O QUE, não COMO (o COMO está na spec)
- [ ] Sem fase de testes dedicada; sem estimativas de tempo

**Loop de validação:** rode o checklist uma vez; se algo falhar, corrija e rode de novo (até 3
iterações). Se persistir, pare, reporte e peça orientação antes de salvar.

**Salve** em `docs/specs/<prd-slug>/<FXX>-<kebab-name>/spec.md` e `.../plan.md` (crie a pasta com
`mkdir -p`). **Releia os dois arquivos** com o Read para confirmar que não ficaram vazios ou
truncados; se ficaram, regenere e salve de novo.

### Passo 6: Resultado

Informe: caminho da spec, caminho do plan, o pacote-alvo, o nível de complexidade, quantas fases
o plano tem, e a lista de pendências/contratos externos que a implementação vai precisar resolver.

---

## Modo Batch

Gera specs para várias features da **mesma wave do mesmo PRD** em paralelo, auto-aceitando as
recomendações. É um wrapper fino sobre os Passos 1–6: sub-agentes rodam o fluxo completo de
feature única; o orquestrador só resolve entrada, valida, despacha e reporta.

### Ativação

Entra em Modo Batch automaticamente quando a entrada casa com:
- Múltiplos IDs do mesmo PRD: `build-deck F02 F03 F04`
- Referência de wave: `build-deck wave 2`
- Mistura dentro da mesma wave: `build-deck wave 2 F04`
- Múltiplos nomes de feature, ou nomes misturados com IDs, todos da mesma wave

Entrada de feature única (`build-deck F05`) segue o fluxo interativo.

### Regras de lote

**Um PRD por lote.** Features de PRDs diferentes não podem ir no mesmo lote — os IDs são locais e
os módulos têm fases de roadmap distintas. Mensagem de rejeição: "Features de PRDs diferentes não
podem ser geradas no mesmo lote (IDs são locais a cada PRD). Rode um lote por módulo."

**Uma wave por lote.** Todas as features devem pertencer à mesma wave da Parte 3 da Seção 8.
- Entrada cross-wave (`wave 2 wave 3`, ou `F04 F05` em waves diferentes) é rejeitada: "Features de
  waves diferentes não podem ir no mesmo lote. Specs de waves posteriores ficam melhores quando
  geradas depois que a wave anterior já existe no código. Rode a wave N primeiro."
- Misturar `wave N` com IDs extras só é permitido se todos pertencerem à wave N.
- Wave inexistente → rejeite listando as waves disponíveis daquele PRD.
- ID/nome inexistente → rejeite listando as features disponíveis daquele PRD.

### Fluxo de orquestração

O Passo 1 é adaptado abaixo. Os Passos 2–6 rodam dentro de cada sub-agente, um por feature.

**B.1: Resolver o lote**
- Identifique o PRD pelas regras do Passo 1.1. Se o usuário não informou o módulo, **pergunte** —
  é a primeira pausa interativa possível.
- Expanda waves, junte listas, deduplique.
- Se o PRD não tiver a "Parte 3: Execution Waves" na Seção 8 e a entrada citar uma wave, rejeite:
  "Referências de wave exigem a subseção 'Parte 3: Execution Waves' na Seção 8 do PRD, que este
  PRD não tem. Use os IDs diretamente ou atualize o PRD." Não sintetize waves.
- Nome ambíguo → liste os candidatos e peça desambiguação antes de seguir (segunda pausa possível).
- Valide as regras de lote (um PRD, uma wave).
- Para cada alvo, veja se `docs/specs/<prd-slug>/<FXX>-*/spec.md` já existe → marque "já tem spec".

**B.2: Classificação de Foundation e fase do roadmap**
Aplique a detecção do Passo 1.3 uma vez para o lote. Classifique cada feature:
- **Foundation do PRD, ainda sem spec/implementação** → roda **sequencialmente** (define a
  infraestrutura compartilhada que as outras vão referenciar).
- **Não-Foundation, ou Foundation já resolvida** → elegível para o pool paralelo.

**B.3: Prontidão de dependências**
Para cada alvo, cheque as dependências internas da Seção 8. Se uma dependência interna não está
implementada, não tem spec, **e** não está no próprio lote → marque "dependência faltando — será
abortada". Dependências satisfeitas por outra feature do mesmo lote são aceitáveis. Dependências
cross-PRD **nunca** abortam — viram contrato externo declarado na spec.

**B.4: Apresentar o plano consolidado e aguardar confirmação**

```
Plano de lote para <entrada>:
PRD: build-deck (docs/prds/build-deck.md) — Wave 2

- F02 Geração do Deck Inicial no Cadastro (só Core) — nova
- F03 Recompensa: Adicionar Carta à Coleção (escopo completo) — já tem spec (pular / regerar?)
- F04 Navegação e Filtro da Coleção (escopo completo — sem divisão Core/Full) — nova

Modo: paralelo (2 sub-agentes)      # ou "sequencial (Foundation detectada)"
Estado do projeto: sem código ainda (Fase 0 do roadmap pendente)
Contratos externos assumidos: banco de cartas (packages/data), Auth/Cadastro
Auto-aceite: todas as recomendações do spec-writer serão aplicadas
Destino: docs/specs/build-deck/F02-.../, docs/specs/build-deck/F04-.../

Posso seguir? (sim/não)
```

Tags de escopo por feature: `(só Core)` quando o PRD tem os dois blocos; `(escopo completo)` quando
tem só um; `(escopo completo — sem divisão Core/Full)` quando não tem nenhum.
Tags de status: `nova`, `já tem spec (pular / regerar?)`, `dependência faltando — será abortada`,
`Foundation, roda sequencialmente`, `já implementada, pulando`.

Prossiga só com "sim" explícito. Em "não" ou resposta ambígua/negativa, aborte sem despachar
sub-agentes e sem criar arquivos. Features "já tem spec" são puladas por padrão; o usuário pode
pedir regeração na confirmação ("sim, regerar F03").

**B.5: Despachar sub-agentes**
- **Fase sequencial (Foundations):** despache uma por vez, esperando cada uma terminar, na ordem
  da Seção 8 do PRD.
- **Fase paralela:** despache o restante em uma única mensagem com várias chamadas do Agent, sem
  limite de concorrência.
- Cada prompt de sub-agente inclui: o `<prd-slug>` + caminho do PRD + ID da feature; instrução de
  executar os Passos 1–6 deste SKILL.md; a Política de Auto-Aceite no lugar do Passo 2; lembrete de
  salvar em `docs/specs/<prd-slug>/<FXX>-<kebab-name>/`; e a instrução de ler a Fase 0 (product.md,
  arquitetura.md, ADRs, guidelines) por conta própria.
- Cada sub-agente faz sua própria Descoberta de Padrões (Passo 1.4) — nada é compartilhado.

**B.6: Coletar e reportar**

```
Lote concluído: 2/3 features geradas
✓ F02 → docs/specs/build-deck/F02-geracao-do-deck-inicial-no-cadastro/
✓ F04 → docs/specs/build-deck/F04-navegacao-e-filtro-da-colecao/
✗ F03 → falhou: <motivo>

Pendências agregadas: [tabelas de dado externo e contratos cross-PRD citados pelas specs]
```

Falhas de sub-agente são isoladas — os demais continuam. Features falhas podem ser reexecutadas
individualmente.

### Política de Auto-Aceite

| Decisão | Default |
|---|---|
| Escopo (Core vs Core+Full, quando ambos existem) | Só Core |
| Decisão técnica com recomendação clara do spec-writer | Aplicar a recomendação |
| Dependência interna não implementada | Orquestrador resolve em B.3 — sub-agente nunca recebe feature com dependência interna não satisfeita |
| Dependência cross-PRD inexistente | Declarar como contrato externo na Seção 4 e listar em Pré-requisitos do plan |
| Avisos de Foundation/roadmap (Passo 1.3) | Orquestrador resolve em B.2 — sub-agente pula |
| Tabela de dado externo pendente (guardião, terreno, fusão, drops, rating, balanceamento) | Schema + loader + validação + fallback neutro (modificador 0 / sem fusão / lista vazia). **Nunca inventar valores.** Registrar em Decisões e Premissas |
| Pendência de decisão em aberto do §10 / ADR `needs-input` | Adotar a recomendação já registrada em `arquitetura.md` (ex.: excluir ritual da checagem de guardião; carteira única com handler `onVictory` idempotente) e marcar como premissa a confirmar |
| Feature exige tecnologia nova fora da stack travada | Auto-confirmar apenas se não conflitar com um ADR aceito; documentar a nova dependência em Decisões e Premissas. Se conflitar com ADR, marcar como bloqueio e reportar em B.6 |
| Padrões conflitantes no código | Escolher o mais frequente (o mais recente em caso de empate); documentar |
| Referência ambígua de feature | Não ocorre — orquestrador desambigua em B.1 |
| Sem código ainda | Usar a Camada 0 (arquitetura + ADRs + guidelines) como fonte de padrões; documentar as premissas |
| Especificação parcial no PRD (capacidade citada, detalhe técnico omitido) | Aplicar default de mercado consistente com os guidelines; documentar como premissa explícita. **Não bloquear** |
| Descrição vaga demais | Aplicar defaults de boa prática para cada decisão em aberto e documentá-los; nunca inferir silenciosamente |

Todas as demais regras do skill (conteúdo dirigido pelo PRD, aderência à arquitetura, validação de
SPEC/PLAN, kebab-case, estrutura de arquivos, Português) valem sem alteração.

**Requisito de documentação:** sempre que um sub-agente aplicar um default de Auto-Aceite para algo
que o PRD não respondeu, ele DEVE registrar em "Decisões e Premissas" (Seção 1 da spec).

---

## Regras

**Precedência:** quando uma feature roda em Modo Batch, os grupos `(Modo Batch)` abaixo prevalecem
sobre qualquer regra conflitante das listas gerais — notadamente as regras de entrevista. As
regras não-conflitantes continuam valendo.

**SEMPRE:**
- Gerar DOIS arquivos (spec e plan) em `docs/specs/<prd-slug>/<FXX>-<kebab-name>/`
- Incluir o `<prd-slug>` no caminho — IDs são locais a cada PRD
- Escrever spec e plan inteiros em Português
- Rodar a Descoberta de Padrões (Camada 0 sempre; Camadas 1 e 2 quando houver código) antes da
  entrevista
- Ler a feature-alvo no PRD e usar Consumes/Provides/Core/Full/Capabilities/Experience/Error
  Handling/critérios como contexto primário
- Declarar o pacote-alvo do monorepo e verificar a direção de dependências
- Citar `docs/arquitetura.md §X` e ADRs quando a decisão da spec vier deles
- Marcar dependências cross-PRD como contrato externo
- Aplicar o mapeamento PRD → SPEC consistentemente
- Manter o estilo de entrevista iterativa: uma pergunta por vez, com resposta recomendada
- Validar internamente ANTES de salvar, e reler os arquivos salvos

**NUNCA:**
- Colocar código real na spec (descreva estruturas, assinaturas e contratos — não implementações)
- Colocar decisões de arquitetura no plan
- Incluir estimativas de tempo
- Criar fase de testes dedicada no plan
- Incluir cabeçalho de ID/data/versão nos documentos
- Incluir detalhes de implementação nos passos do plan (tipos, colunas, métodos)
- Prosseguir sem PRD — sempre exigir um e apontar o `duel-feature-prd` se faltar
- Perguntar sobre stack, runtime, framework, ORM ou biblioteca de testes (travados na Fase 0)
- Repetir perguntas cuja resposta está no PRD, na arquitetura, nos ADRs, nos guidelines, no código
  ou em specs anteriores
- Inventar valores das tabelas de guardiões, terrenos, fusões, drops, rating ou balanceamento
- Propor desenho que viole os invariantes de regra do jogo da Fase 0.3 sem desvio confirmado
- Propor `Math.random()`, I/O ou dependência de UI dentro do `engine`
- Confiar em valor de economia vindo do cliente, ou desenhar crédito/débito não idempotente

**SEMPRE (Modo Batch):**
- Validar "um PRD por lote" e "uma wave por lote" antes de despachar
- Apresentar plano consolidado e aguardar confirmação explícita
- Pular features que já têm spec, salvo pedido explícito de regeração
- Rodar Foundations sequencialmente quando ainda não existem
- Aplicar a Política de Auto-Aceite dentro de cada sub-agente

**NUNCA (Modo Batch):**
- Misturar PRDs ou waves diferentes no mesmo lote
- Despachar Foundations em paralelo enquanto alguma ainda não existe
- Cancelar sub-agentes em execução porque outro falhou
- Compartilhar uma única Descoberta de Padrões entre sub-agentes

---

## Casos de Borda

**Precedência do Modo Batch:** qualquer caso abaixo que mande "perguntar ao usuário" é substituído
pela linha correspondente da Política de Auto-Aceite. Sub-agentes nunca pausam; casos de nível de
orquestrador (PRD ambíguo, feature ambígua, dependências) são resolvidos em B.1–B.3.

**Nenhum PRD para o módulo:** pare e instrua a gerar um com o skill `duel-feature-prd`.

**Feature não encontrada no PRD:** liste as features da Seção 8 daquele PRD e pergunte.

**Só o ID informado, sem o módulo (`F03`):** pergunte qual PRD. Nunca adivinhe — há um `F01` em
cada um dos 6 PRDs.

**Nome de feature que casa com PRDs diferentes:** liste os candidatos como `<prd>/FXX — Nome` e
peça desambiguação.

**PRD contradiz `docs/arquitetura.md`** (ex.: `banco-de-cartas` F02 exige guardiões em cartas
ritual, mas o dataset real não tem — §4.2; ou contagens 821 vs. 722 de cartas): não escolha
sozinho. Apresente as duas versões, cite os dois documentos, recomende a que o dado real sustenta,
e peça decisão. Registre o desfecho em Decisões e Premissas. No modo batch, adote a recomendação
já registrada em `arquitetura.md` e marque como premissa a confirmar.

**Feature depende de tabela de dado externo ainda não fornecida:** não bloqueie. Especifique
schema, loader, validação zod e **fallback neutro**; registre a pendência em Decisões e Premissas e
gere teste do caminho neutro. Nunca preencha valores.

**Feature depende de item do §10 (pendências abertas) ou de ADR em `needs-input/`:** pergunte a
decisão ao usuário; se ele não decidir agora, adote a recomendação de `arquitetura.md`, marque como
premissa a confirmar e liste em Pré-requisitos do plan.

**Feature de fase posterior do roadmap sem a anterior implementada** (ex.: `online-duel` sem
`engine`): avise, e escreva a spec assumindo os contratos de `arquitetura.md` §3 e §6 como
pré-requisito declarado no plan. Não redefina esses contratos por conta própria.

**Feature puramente de UI (Library, filtros, navegação):** as Seções 4 e 5 podem ser omitidas se
não houver contrato nem dado novo; as Seções 2, 3, 6 e 7 continuam obrigatórias, e a Seção 3 deve
detalhar o fluxo da `Experience` do PRD, virtualização, performance (busca ≤200ms) e
responsividade 320–1920px conforme `arquitetura.md` §7.

**Feature que toca economia de estrelas ou recompensa:** a spec DEVE cobrir atomicidade
(RPC/transação Postgres), idempotência (`duel_id`/`idRecompensa` com unique), RLS, e o
comportamento offline (crédito enfileirado é seguro; débito deve preferir online autoritativo —
`arquitetura.md` §5.2 e §5.4). Trate a carteira como **única** entre `free-duel` e `password`.

**Feature que toca o `engine`:** a spec DEVE declarar pureza (sem I/O, sem UI), determinismo (PRNG
semeado no estado, nunca `Math.random()`), estado JSON serializável com round-trip idempotente, e
que modificadores não mutam `atk`/`def` base. Testes property-based com fast-check são obrigatórios
na Seção 7.

**Feature que toca o modo online:** a spec DEVE cobrir o handshake de versão/hash do dataset,
validação autoritativa server-side de cada intent, e reconexão por reenvio de snapshot.

**Padrões conflitantes no código existente:** apresente ambos, pergunte qual seguir, documente.

**Feature exige tecnologia fora da stack travada:** verifique primeiro se algum ADR aceito já
decide o contrário. Se decide, aponte o conflito ao usuário antes de propor. Se não, liste a nova
dependência, peça confirmação e documente em Decisões e Premissas.

**Já existe spec para a feature:** pergunte se é para atualizar/regerar ou se o usuário quis outra
feature.

**Feature com 4+ dependências:** confirme que cada uma é requisito funcional genuíno (a feature não
funciona sem aquele dado), não apenas ordem lógica sugerida.

**Sanitizar nome para kebab-case:** minúsculas, acentos removidos (`ç`→`c`, `ã`→`a`, `é`→`e`),
espaços → hífens, caracteres fora de `[a-z0-9-]` descartados. Exemplo: `F05. Edição do Deck Ativo`
→ `F05-edicao-do-deck-ativo`.

**Lote cross-PRD ou cross-wave:** rejeite conforme as regras de lote. Não divida automaticamente —
o usuário roda um lote por vez.

**PRD sem "Parte 3: Execution Waves":** rejeite referências de wave e peça IDs diretos.

**Falha de sub-agente no lote:** os demais seguem até o fim; o relatório lista sucessos e falhas
com motivo.

**Usuário recusa o plano consolidado (B.4):** aborte limpo — nenhum sub-agente despachado, nenhum
arquivo criado, nenhum estado parcial.

---

## SAÍDA

Ao finalizar, retorne os caminhos de `spec.md` e `plan.md`, o pacote-alvo no monorepo, e a lista de
pendências e contratos externos que a implementação vai precisar antes de rodar.
