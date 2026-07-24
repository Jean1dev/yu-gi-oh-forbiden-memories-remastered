# Arquitetura & Decisões Técnicas

> Documento vivo. Consolida as decisões técnicas para construir o **YuGiOh Forbidden
> Memories Remastered** a partir do `product.md` e dos PRDs em `docs/prds/`. Cada
> decisão referencia os pilares/PRDs que a motivam. Onde há valores/dados pendentes,
> o item fica marcado como **PENDÊNCIA**.

## 0. Decisões travadas (resumo)

| Eixo | Decisão | Motivação |
|------|---------|-----------|
| Linguagem/stack | **TypeScript ponta-a-ponta em monorepo** | Motor idêntico offline (browser) e no servidor autoritativo exige linguagem única compartilhada |
| Runtime | **Node.js 24 LTS** | Alvo estável para desenvolvimento, CI, scripts de dados e servidor online |
| Frontend | **Next.js (App Router) + React + PWA** | Web responsivo 320–1920px, offline via service worker, SSR/estático para o menu/telas |
| Backend/persistência | **Supabase (Postgres + Auth + Realtime)** | Menor esforço para o loop de conta/coleção/carteira; RLS para segurança por jogador |
| Servidor de duelo online | **Processo Node.js 24 LTS stateful à parte** (mesmo Postgres) | Duelo autoritativo é stateful/WebSocket e roda o `engine`; foge do modelo de funções do Supabase |
| Faseamento | **MVP offline-first primeiro; Online por último** | Valor jogável cedo, menor risco; Online reusa o mesmo `engine` |
| Monorepo | **pnpm workspaces + Turborepo** | Pacotes puros isoláveis, build/test incremental |
| Testes do motor | **Vitest + fast-check (property-based)** | PRDs exigem cobertura da tabela de combate e prova de determinismo |
| Validação de dados | **zod** na fronteira (ingestão, ações, payloads de rede) | Data-driven com falha explícita em vez de corrupção silenciosa |

## 1. Pilares de arquitetura (restrições dos PRDs)

Estes cinco pilares aparecem em todos os PRDs e são **não-negociáveis**:

1. **Motor de regras 100% desacoplado da UI** — puro, headless, testável; 0 imports de
   renderização (verificável por análise estática). — `motor-duelo-1x1`
2. **Determinismo por estado + seed** — mesmo estado + mesma sequência + mesmo seed ⇒
   mesmo resultado; snapshot serializável round-trip idempotente. — `motor-duelo-1x1` F05
3. **Data-driven** — nenhuma regra hard-coded; catálogo + 4 tabelas auxiliares em dados
   versionados com hash. — `banco-de-cartas`
4. **Offline-first + servidor autoritativo** — mesmo dataset e mesma lógica no cliente
   (offline) e no servidor (valida cada jogada, anti-trapaça). — `banco-de-cartas` F09/F10
5. **Persistência em conta + cache local + fila offline** — idempotência por
   `idDuelo`/`idRecompensa`. — `build-deck`, `free-duel`, `password`

**Consequência-chave:** o motor precisa rodar idêntico no browser (offline) e no servidor
(autoritativo). Isso força TypeScript compartilhado e um motor **sem I/O e sem UI**.

## 2. Estrutura do monorepo

```
packages/
  shared/     Schemas (zod) e tipos: Carta, Acao, Evento, EstadoDuelo, contratos de rede.
              Sem lógica. Importado por todos.
  data/       Banco de Cartas (PRD banco-de-cartas): pipeline de build 821→722,
              catálogo em memória (índices), resolução de artes, tabelas auxiliares,
              bundle versionado + hash. Build-time + runtime read-only.
  engine/     Motor de Duelo 1x1 (PRD motor-duelo-1x1): reducer puro
              apply(state, action) → { state, events }. Zero deps de UI/I/O.
              PRNG semeado. Máquina de estados com janela de reação.
  rules/      Guardian Star / Terrain / Fusion / Effect System. Funções puras que
              consomem tabelas de `data`. Hoje: tabelas vazias → modificador 0.
  ai/         IA de NPCs: (EstadoDuelo público) → Acao. Consome `engine`, não o duplica.
apps/
  web/        Next.js: Menu, Library, Build Deck, Password, Free Duel (UI + PWA).
              Instancia o `engine` localmente para partidas offline.
  server/     Online Duel: Node.js 24 LTS + WebSocket + 1 instância de `engine` por partida.
              Valida intents contra o dataset autoritativo. (Fase final.)
```

**Direção de dependências (nunca inverter):**

```
shared ← data ← rules ← engine ← ai
                                 ↑
                     web / server dependem de engine, rules, data, ai, shared
```

`engine` **não** depende de `web`, `server`, React, DOM, `fetch` ou Supabase. Um teste de
análise estática (lint rule / dependency-cruiser) garante o pilar 1.

## 3. Motor de Duelo (`packages/engine`)

### 3.1 Contrato central

```ts
// Puro e determinístico. Sem efeitos colaterais, sem I/O.
function apply(state: EstadoDuelo, action: Acao): { state: EstadoDuelo; events: Evento[] };
function initDuel(input: InitInput): EstadoDuelo;      // F03: decks + seed → estado inicial
function serialize(state: EstadoDuelo): Snapshot;      // F05
function deserialize(snap: Snapshot): EstadoDuelo;     // F05 (round-trip idempotente)
```

- **Estado como objeto JSON serializável** (não classes com estado escondido). Snapshot =
  o próprio estado serializado. Isso entrega F05 quase de graça.
- **PRNG semeado próprio** (ex.: `mulberry32`), **nunca `Math.random()`**. O `seed` e o
  cursor do RNG vivem dentro do estado. É o que habilita determinismo, replays e
  revalidação no servidor.
- **Modificadores não mutam o base**: `atk`/`def` base da carta nunca são sobrescritos;
  guardião/terreno/equip entram só no cálculo efetivo (F04), que é uma função pura.

### 3.2 Janela de reação = máquina de estados explícita

Em vez de callbacks/generators, o motor entra num estado suspenso e devolve o controle:

```ts
type Fase = 'compra' | 'principal' | 'batalha' | 'fim';
type EstadoDuelo = {
  // ... jogadores, campo, terreno, turno, fase, seed ...
  pendente?: { tipo: 'janela_reacao'; evento: Evento; jogadorPodeReagir: PlayerId };
};
```

Quando uma ação emite um evento com janela (ex.: `onAttackDeclared`), `apply` retorna um
estado com `pendente`. O chamador (UI local, IA, ou servidor online) resolve com ações de
follow-up; sem reações, a janela fecha e o fluxo segue. **Vantagem:** serializa
naturalmente para o modo online e para testes — não há continuação escondida na stack.

### 3.3 Eventos (contrato do Effect System)

≥ 8 tipos: `onTurnStart, onDraw, onSummon, onSet, onFlip, onPositionChange,
onAttackDeclared, onDamage, onDestroy, onTurnEnd`. Ordem de **emissão** é determinística e
responsabilidade do motor; ordem de **resolução** de múltiplos efeitos é do Effect System
(`packages/rules`).

### 3.4 Efeitos como registry (não `if` por carta)

```ts
// packages/rules/effects
type EffectHandler = (ctx: EffectCtx, ev: Evento) => Acao[] | void;
const registry: Record<TipoEvento, EffectHandler[]>;  // cartas registram gatilhos aqui
```

Com 722 cartas, isso evita que cada armadilha vire um ramo dentro do combate. — pilar
"efeitos por eventos".

### 3.5 Tabela de resolução de combate (maior risco de bug → cobertura exaustiva)

Fiel ao FM, **sem perfuração**. Testar todos os ramos (ver `motor-duelo-1x1` F11):
ATK vs ATK (maior vence / empate destrói ambos sem dano), ATK vs DEF (>, <, =), ataque
direto, revelação de face-baixo antes de resolver.

## 4. Banco de Cartas (`packages/data`)

### 4.1 Pipeline de build (821 → 722)

Script Node.js 24 LTS executado no build (não em runtime): lê `cards-data/dados/*.json`, descarta os
99 `success:false`, desembrulha `{success, card}`, desambigua colisões por `numero`
normalizado (`01.json` inválido vs `001.json` válido), valida com zod e emite:

- `cards.json` — 722 cartas canônicas (`numero` 001–722 contíguo, ordenado).
- `arts-manifest.json` — mapa `numero → cards-data/{numero}.jpg` (paridade 1:1; faltas → placeholder).
- `version` + `hash` de conteúdo (F10).

### 4.2 Achados nos dados reais (verificados)

- Tipos conferem: **621 monstro + 24 ritual + 34 equipamento + 33 magica + 10 armadilha = 722**.
- **10 guardiões**: Sun, Moon, Mars, Jupiter, Mercury, Neptune, Pluto, Saturn, Uranus, Venus
  → matriz de compatibilidade é 10×10. ~24 classes → matriz terreno×classe.
- **PENDÊNCIA / conflito de regra:** rituais **não têm guardiões** nos dados (`guardiao1:""`
  aparece 101× = 77 não-monstro + 24 ritual). Porém `banco-de-cartas` F02 exige "monstro
  **e ritual** com guardiões preenchidos" — essa regra **reprovaria o dataset real**.
  → **Decidir:** F02 deve excluir `ritual` da checagem de guardião (rituais não usam
  guardião estelar no FM). Corrigir o critério no PRD.

### 4.3 Tabelas auxiliares — schema+loader agora, valores depois

Fusões, drops por duelista, matriz de guardiões, matriz terreno↔classe: **os valores não
existem no repositório**. Entregar schema + loader + validação; viajam vazias/parciais no
bundle. O motor trata ausência como neutro (modificador 0 / "sem fusão conhecida"). São
**dado externo pendente**, fornecido por você. — `banco-de-cartas` F05–F08.

## 5. Persistência (Supabase / Postgres)

### 5.1 Esquema inicial

| Tabela | Campos-chave | PRD |
|--------|--------------|-----|
| `profiles` | `id` (= auth.users), `username`, `dataset_version` | Auth/Save |
| `collections` | `player_id, numero, quantity int ≥ 0` (PK composta) | build-deck F01/F03 |
| `active_decks` | `player_id` (PK), `cards jsonb` (`numero→qty`), `updated_at` | build-deck F07 (slot único) |
| `wallets` | `player_id` (PK), `stars int ≥ 0` | password F01 / free-duel F07 **(unificar — ver 5.3)** |
| `reward_ledger` | `duel_id` (unique), `player_id, card_numero, stars, applied_at` | idempotência de vitória |
| `password_releases` | `player_id, numero, stars_spent, created_at` | password F05 |
| `dataset_versions` | `version, hash, created_at` | banco-de-cartas F10 |

- **RLS ligado**: cada jogador só lê/escreve suas próprias linhas.
- **Coleção** é `quantity` (Build Deck usa `min(qty,3)`); Library deriva o booleano
  "obtida" como `qty ≥ 1`. Uma fonte, dois consumos.

### 5.2 Mutações de economia via RPC server-side (atomicidade)

Débito de estrelas + concessão de carta (`password` F04) precisam ser **atômicos** e
**nunca** confiar em valor vindo do cliente. Implementar como **funções Postgres (RPC)** /
transações: debitar `wallets` e incrementar `collections` numa única transação; crédito de
vitória idempotente por `duel_id` via `reward_ledger` (INSERT com unique → conflito = já
aplicado). Isso satisfaz "0 estrela debitada sem carta" e "0 crédito duplicado".

### 5.3 Reconciliação necessária entre PRDs (a decidir)

- **Carteira de estrelas está definida duas vezes** (`free-duel` F07 e `password` F01):
  é a **mesma carteira**. `wallets` é a fonte única; ambos os módulos a consomem.
- **Crédito de estrelas na vitória** aparece em `free-duel` F07 (via Rating Engine) **e**
  `password` F02. → **Unificar num único handler "onVictory"** que, idempotente por
  `duel_id`, concede 1 carta (build-deck F03) **e** N estrelas (uma vez). Evita crédito
  duplo. Recomendo registrar isso como decisão nos PRDs.

### 5.4 Offline-first e sync

- **IndexedDB** guarda deck (rascunho + ativo), coleção, saldo e uma **fila de mutações**
  com `idempotencyKey`. Escrita local imediata; replica ao servidor ao reconectar.
- **Créditos offline** (ganhar estrelas/carta) são seguros: enfileira e sobe idempotente.
- **Débitos offline** (liberar carta gastando estrelas) têm risco de double-spend entre
  dispositivos → preferir **online-autoritativo** para débito, ou reconciliar por ledger.
  Registrar como refinamento; os PRDs já pedem atomicidade+idempotência que empurram a
  economia para o servidor.

## 6. Modo Online (fase final, contrato pronto desde já)

- Servidor Node.js 24 LTS stateful mantém **1 instância de `engine` por partida**. Cliente envia
  **intents** (ações) por **WebSocket dedicado**; servidor valida com o **mesmo** `engine`
  + dataset autoritativo, e transmite eventos/estado autoritativo pelo mesmo canal.
- **Handshake de versão/hash** (banco-de-cartas F10) antes da partida: datasets divergentes
  recusam a sessão.
- **Reconexão** = reenviar snapshot (`engine` F05). **Matchmaking** = fila simples.
- Como o `engine` é determinístico, dá para transmitir só o stream de eventos e o cliente
  reencena localmente — otimização posterior; começar com "servidor é a verdade, envia
  estado".

## 7. Frontend (`apps/web`)

- **Next.js App Router + React + TS.** Tabuleiro do duelo em **DOM/CSS** (não precisa de
  Phaser/canvas para um card game); grid/flex responsivo 320–1920px.
- **Estado**: o `EstadoDuelo` do `engine` é a fonte da verdade; um adaptador React fino
  (Zustand ou `useReducer` + context) espelha para render. UI **não** contém regra.
- **PWA**: service worker cacheia app shell + bundle de cartas + artes. Library com grade
  **virtualizada** (722 cartas), busca ≤200ms, filtros combináveis (semântica E).
- **Artes**: 722 JPGs como assets estáticos; lazy-load + placeholder para faltantes.

## 8. Estratégia de testes

- **`engine`**: unit tests exaustivos da tabela de combate; **property-based (fast-check)**
  para determinismo — 1.000 execuções mesmo seed/sequência ⇒ estado final idêntico;
  round-trip `deserialize(serialize(s)) == s`.
- **`data`**: teste que a ingestão emite 722, descarta 99, range contíguo, sem duplicados.
- **Análise estática**: `engine` sem imports de UI/I/O (pilar 1).
- **RPCs de economia**: testes de atomicidade (falha no meio não deixa estado parcial) e
  idempotência (mesmo `duel_id` não credita 2×).

## 9. Roadmap por fases (segue as waves dos PRDs)

| Fase | Entrega | Pacotes/PRD | Destrava |
|------|---------|-------------|----------|
| **0** | Ingestão + catálogo de cartas | `data` (banco-de-cartas W1–W3) | Todo o resto |
| **1** | Motor headless F01–F12 + testes | `engine` (motor-duelo) | Duelos determinísticos |
| **2** | Auth + persistência + Library + Build Deck + Password | `web` + Supabase (build-deck, library, password) | Loop de conta/coleção/economia |
| **3** | Free Duel vs IA | `web` + `ai` (free-duel) | Primeiro loop jogável completo offline |
| **4** | Effect System + tabelas (guardião/terreno/fusão) conforme chegarem | `rules` + `data` F05–F08 | Fidelidade de regras |
| **5** | Online Duel autoritativo | `server` (online-duel) | Multiplayer ranqueado |

Marco jogável mínimo = **fim da Fase 3**: cadastrar → receber deck inicial → editar deck →
duelar contra a CPU → ganhar carta/estrelas → liberar carta por senha. Tudo offline.

## 10. Pendências abertas (dado externo / decisão)

- [ ] Regra F02 de guardiões vs rituais (ver 4.2) — corrigir critério.
- [ ] Unificar carteira e handler `onVictory` entre `free-duel` e `password` (ver 5.3).
- [ ] **Valores** das tabelas: fusões, drops por duelista, matriz de guardiões (10×10),
      matriz terreno↔classe (~24 classes). — fornecidos por você.
- [ ] Rating Engine: escala de notas + tabela nota→recompensa (free-duel F05).
- [ ] Balanceamento: pool do deck inicial, `N` estrelas/vitória, saldo inicial, roster de
      NPCs e pools de drop.
```
