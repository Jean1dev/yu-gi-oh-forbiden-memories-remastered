# Modelo de Estado do Duelo

> PRD: `docs/prds/motor-duelo-1x1.md` — F01
> Pacote-alvo: `packages/shared`

## 1. Contexto e Escopo

Esta feature define a **fonte única da verdade** do Motor de Duelo 1x1: a forma de dados do
`EstadoDuelo` — por jogador (LP, mão, deck, campo com 5 zonas de monstro e 5 de magia/armadilha) e
globalmente (terreno ativo, jogador ativo, número do turno, fase atual). É, junto de F02, a
**Foundation** do módulo (PRD §8, Parte 2) e o primeiro passo da **Fase 1** do roadmap
(`docs/arquitetura.md` §9, "Motor headless F01–F12 + testes") — sem ela nenhuma outra feature do
PRD (F02–F12) tem sobre o que ler ou escrever.

O desenho segue diretamente `arquitetura.md` §2 ("`shared`: Schemas (zod) e tipos: Carta, Acao,
Evento, EstadoDuelo, contratos de rede. Sem lógica.") e §3.1 ("Estado como objeto JSON
serializável — não classes com estado escondido"), e concretiza o pilar arquitetural registrado em
ADR-002: um motor headless, determinístico e orientado a eventos só é possível se o estado que ele
manipula for, desde a base, um valor puro e serializável, sem UI, sem I/O e sem lógica embutida.

Esta spec **não** implementa nenhuma mutação de estado, nenhuma regra de combate, nenhuma
inicialização e nenhuma serialização — apenas a **forma** dos dados e as garantias estruturais que
a tornam impossível de violar por construção (tipos) e por validação (zod). Todas as features
seguintes (F02–F12) leem e escrevem sobre este mesmo tipo; nenhuma delas duplica ou redefine campos
que já existem aqui.

### Incluído

- Tipo `EstadoDuelo`, agregando os dois jogadores por chave (`P1`/`P2`), terreno ativo, jogador
  ativo, número do turno e fase atual (PRD F01 Provides)
- Tipo `EstadoJogador`, agregando LP, mão, deck e campo de um jogador (PRD F01 Provides)
- Campo com **exatamente 5 zonas de monstro** e **5 zonas de magia/armadilha** por jogador (PRD F01
  Capabilities; invariante da Fase 0.3 deste skill)
- Cada zona de monstro registrando a carta, uma das **4 posições** (ataque/defesa × face-cima/
  face-baixo) e as flags de turno "já atacou" / "já mudou de posição" (PRD F01 Capabilities e
  critério de aceite 2)
- Cada zona de magia/armadilha registrando a carta e sua visibilidade (face-cima/face-baixo) — ver
  Decisão 5
- **8000 LP** como constante do domínio, pronta para F03 aplicar (PRD F01 Capabilities)
- **1 terreno ativo** por vez, tipado como `Carta | null` (PRD F01 Capabilities)
- Garantia estrutural de que nenhuma zona ou estrutura de estado permite sobrescrever `atk`/`def`
  base da carta armazenada (PRD F01 Experience e critério de aceite 3)
- Reuso exclusivo do schema canônico de 12 campos do banco de cartas — nenhum campo novo inventado
  na carta (PRD F01 Capabilities e critério de aceite 4)
- Schemas zod espelhando cada tipo, para validação de fronteira por quem vier a desserializar um
  estado (F05) ou inicializar um duelo (F03)

### Fronteiras

- **Construção do estado inicial** (embaralhar deck, distribuir mão de 5, sortear primeiro
  jogador, registrar seed) → **F03**. F01 define a forma; não instancia. — PRD §6 F03
- **Campo `pendente` / janela de reação** → **F02**, que estende este mesmo tipo com o estado de
  máquina suspensa (`arquitetura.md` §3.2). F01 não define esse campo. — PRD §6 F02
- **Flag "primeiro turno do duelo"** → **F03** Capabilities ("marca a flag ... para F06"). Não
  faz parte do Provides de F01. — PRD §6 F03
- **Flag "jogada da mão já usada neste turno"** → decorre da Capability de **F06** ("1 jogada
  vinda da mão por turno"); não está listada no Provides de F01. — PRD §6 F06
- **Seed e cursor de PRNG** → **F03** os registra no estado para determinismo
  (`arquitetura.md` §3.1); F01 não os inclui. — PRD §6 F03, F05
- **Cálculo de ATK/DEF efetivo** (guardião + terreno + equipamento) → **F04**. F01 só garante que
  a estrutura de dados não tem onde sobrescrever o base. — PRD §6 F04
- **Mutação de qualquer campo por ação de jogador** (invocar, atacar, mudar posição, comprar,
  etc.) → **F06–F12**. F01 é somente a forma dos dados, nunca uma função que os altera.
- **Serialização/snapshot e round-trip idempotente** → **F05**, que consome este tipo.
- **Qual carta pode ocupar `terrenoAtivo`** (checagem de `tipo`/`classe` de carta de terreno) →
  **F09** Capabilities. F01 aceita `Carta | null` genericamente — ver Decisão 13.
- **Duelos 2x2** — fora deste motor (PRD §7).

### Contratos externos assumidos

- **`Carta` e `CartaSchema`** (12 campos canônicos) — especificados por `banco-de-cartas`/F01
  (`docs/specs/banco-de-cartas/F01-ingestao-e-normalizacao-da-fonte/spec.md`). A spec já existe;
  a implementação ainda não. F01 **reusa** esses contratos sem redefinição — ver Decisão 8.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | `JogadorId = 'P1' \| 'P2'` — vocabulário usado literalmente pelo PRD ("dois lados (P1 e P2)"). | PRD §1 Resumo Executivo | confirmada |
| 2 | `Fase = 'compra' \| 'principal' \| 'batalha' \| 'fim'` — citação literal da máquina de estados já registrada em arquitetura. | `arquitetura.md` §3.2 | confirmada |
| 3 | `PosicaoMonstro` é uma união de 4 literais nomeados por extenso (`ataque_face_cima`, `ataque_face_baixo`, `defesa_face_cima`, `defesa_face_baixo`), na mesma enumeração do PRD. | PRD §6 F01 Capabilities | confirmada |
| 4 | Cada campo de zonas (`monstros`, `magias`) é uma **tupla TS de 5 posições** (garantia em tempo de compilação) somada a `z.tuple([...5])` em runtime; cada zona é uma **união discriminada por `ocupada: boolean`**, impedindo estados como `jaAtacou: true` sem `carta`. | Entrevista (recomendação aceita); guidelines §1.1 "make invalid states hard to represent" | confirmada |
| 5 | Zona de magia/armadilha ocupada tem a forma `{ carta, viradaParaCima }` — sem os campos de posição de batalha e sem as flags de turno da zona de monstro, que não fazem sentido para essas cartas. | Entrevista | confirmada |
| 6 | No array `deck`, o **índice 0 representa o topo do baralho**; comprar remove do início (sem mutação — devolve um novo array). | Entrevista | confirmada |
| 7 | F01 **não inclui** `seed`, `pendente` (janela de reação), a flag de primeiro turno do duelo, nem a flag de jogada da mão usada — cada uma pertence ao Provides de uma feature futura (F03, F02, F03, F06, respectivamente) e será acrescentada por **alteração deste mesmo arquivo** quando aquela spec for gerada. | Leitura granular do PRD §6, comparando o Provides de cada feature | confirmada |
| 8 | `Carta` e `CartaSchema` são reusados de `banco-de-cartas`/F01 sem redefinição — nenhum campo novo, nenhuma cópia paralela do schema. | PRD §6 F01 Capabilities ("referencia o schema do banco de cartas") | confirmada |
| 9 | Cartas em mão/deck/campo são **embutidas por valor** (objeto `Carta` completo), não por referência a `numero` exigindo lookup em catálogo. Necessário para que o estado seja autocontido — pré-requisito estrutural do snapshot de F05. | PRD §6 F01 Provides ("mão: lista de cartas") | confirmada |
| 10 | O atributo de pontos de vida se chama `lp` (não `pontosDeVida`) — o PRD e `product.md` usam "LP" como termo de domínio em todo o texto. | PRD (uso consistente de "LP"); guidelines §5.3 "domain terms should match product vocabulary" | confirmada |
| 11 | `terrenoAtivo` é um campo **único e global** (`Carta \| null`), não duplicado por jogador. | PRD §6 F01 Capabilities ("1 terreno ativo por vez") | confirmada |
| 12 | `jogadores` é `Record<JogadorId, EstadoJogador>` (chaves exaustivas `P1`/`P2`), não uma tupla posicional — favorece acesso nomeado e torna a chave inválida irrepresentável no tipo. | Decisão de design, mesma filosofia da Decisão 4 | confirmada |
| 13 | O schema não restringe **qual** carta pode ocupar `terrenoAtivo` (aceita qualquer `Carta`); a checagem de "é uma carta de terreno válida" é responsabilidade de F09, que já declara essa regra. | PRD §6 F09 Capabilities (`tipo: magica`, `classe: Magic`) | confirmada |
| 14 | `lp` tem limite inferior **0** no schema (nunca negativo); a responsabilidade de aplicar dano sem ultrapassar esse piso (clamping) é de F11. | Invariante Fase 0.3 deste skill ("LP zerado = derrota") | confirmada |
| 15 | `EstadoDuelo` é **100% dados serializáveis em JSON** — nenhuma função, classe, `Map` ou `Set` em nenhum campo. É pré-requisito estrutural do round-trip idempotente que F05 vai implementar e testar. | `arquitetura.md` §3.1 ("Estado como objeto JSON serializável") | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duelo/tipos.ts` | shared | novo | `JogadorId`, `Fase`, `PosicaoMonstro`, `ZonaMonstro`, `ZonaMagia`, `CampoJogador`, `EstadoJogador`, `EstadoDuelo` |
| `packages/shared/src/duelo/schema.ts` | shared | novo | `PosicaoMonstroSchema`, `ZonaMonstroSchema`, `ZonaMagiaSchema`, `CampoJogadorSchema`, `EstadoJogadorSchema`, `EstadoDueloSchema` (zod) |
| `packages/shared/src/duelo/constantes.ts` | shared | novo | `TOTAL_ZONAS_MONSTRO`, `TOTAL_ZONAS_MAGIA`, `LP_INICIAL` |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta o subsistema `duelo` no export público do pacote |
| `packages/shared/src/duelo/schema.test.ts` | shared | novo | Unitários table-driven: aceitação de estado válido e rejeição de cada invariante violada |
| `packages/shared/src/duelo/schema.propriedades.test.ts` | shared | novo | Propriedades fast-check sobre a invariante "exatamente 5 zonas" |
| `.dependency-cruiser.cjs` | raiz | alterado | Acrescenta regra: nada em `packages/shared/src/duelo/**` importa de `data`, `rules`, `engine`, `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase |

**Verificação da direção de dependências:** `packages/shared/src/duelo/**` importa apenas de
`packages/shared/src/carta/**` (mesmo pacote, contrato já existente de `banco-de-cartas`/F01) e da
biblioteca externa `zod`. Não importa `data`, `rules`, `engine`, `ai`, `web` ou `server` —
respeita `shared ← data ← rules ← engine ← ai` de `arquitetura.md` §2 por não depender de nada
abaixo na cadeia.

Esta feature **não toca `packages/engine`**: o pacote do motor propriamente dito (reducer `apply`,
`initDuel`) só nasce em F03/F06, quando há lógica de fato para colocar nele (ver Fronteiras). Ainda
assim, o princípio "zero UI/IO" do pilar 1 (`arquitetura.md` §1) já se aplica a este código por
definição de fronteira de `shared` (guidelines §3.2: "types, schemas, and contracts only") e é
verificado preventivamente pela regra de `dependency-cruiser` acrescentada aqui, antes mesmo de
`packages/engine` existir.

## 3. Design Técnico

### Estruturas de dados

**`JogadorId`** — união de 2 literais: `'P1' | 'P2'`.

**`Fase`** — união de 4 literais: `'compra' | 'principal' | 'batalha' | 'fim'`.

**`PosicaoMonstro`** — união de 4 literais: `'ataque_face_cima' | 'ataque_face_baixo' |
'defesa_face_cima' | 'defesa_face_baixo'`.

**`ZonaMonstro`** — união discriminada por `ocupada`:

| Variante | Campos |
|---|---|
| Vazia | `{ ocupada: false }` |
| Ocupada | `{ ocupada: true; carta: Carta; posicao: PosicaoMonstro; jaAtacou: boolean; jaMudouDePosicao: boolean }` |

**`ZonaMagia`** — união discriminada por `ocupada`:

| Variante | Campos |
|---|---|
| Vazia | `{ ocupada: false }` |
| Ocupada | `{ ocupada: true; carta: Carta; viradaParaCima: boolean }` |

**`CampoJogador`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `monstros` | `readonly [ZonaMonstro, ZonaMonstro, ZonaMonstro, ZonaMonstro, ZonaMonstro]` | As 5 zonas de monstro, identidade por índice (0–4) |
| `magias` | `readonly [ZonaMagia, ZonaMagia, ZonaMagia, ZonaMagia, ZonaMagia]` | As 5 zonas de magia/armadilha, identidade por índice (0–4) |

**`EstadoJogador`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `lp` | `number` | Pontos de vida. Inteiro, `≥ 0` (Decisão 14). 8000 é o valor inicial (F03), não fixado aqui |
| `mao` | `readonly Carta[]` | Cartas na mão, sem tamanho fixo no tipo — 5 é uma invariante de turno (F06/F07), não do tipo |
| `deck` | `readonly Carta[]` | Cartas do baralho, ordenadas; índice 0 = topo (Decisão 6) |
| `campo` | `CampoJogador` | As 10 zonas do jogador |

**`EstadoDuelo`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `jogadores` | `Record<JogadorId, EstadoJogador>` | Chaves exaustivas `P1` e `P2` (Decisão 12) |
| `terrenoAtivo` | `Carta \| null` | Único terreno ativo, global, `null` = nenhum ativo |
| `jogadorAtivo` | `JogadorId` | Quem tem o turno agora |
| `turno` | `number` | Inteiro `≥ 1` |
| `fase` | `Fase` | Fase corrente do turno |

Nenhum destes tipos possui função, classe, `Map` ou `Set` — são literais de objeto, arrays/tuplas,
strings, números e booleanos, todos serializáveis em JSON por construção (Decisão 15).

### Fluxo

F01 não define um fluxo de execução — é a forma dos dados que outras features leem e escrevem.
O contrato de uso é:

1. Qualquer feature que precise ler ou escrever estado de duelo importa `EstadoDuelo` (e os tipos
   auxiliares) de `packages/shared`; nenhuma feature declara uma cópia paralela de qualquer campo
   já definido aqui (PRD F01 Experience: "nenhuma feature mantém estado paralelo").
2. Leitura de zona: verificar `ocupada` antes de acessar `carta`/`posicao`/flags — o discriminante
   torna o acesso indevido um erro de compilação, não um `undefined` em runtime.
3. Cálculo de poder efetivo (F04) lê `zona.carta.atk`/`zona.carta.def` como valores **base** e
   soma modificadores externos sem jamais escrever de volta em `zona.carta` — não há campo em
   `ZonaMonstro` para armazenar um valor "efetivo" ou "modificado" (critério de aceite 3).
4. Qualquer feature que precise de um campo ainda não definido aqui (`seed`, `pendente`, flags de
   turno — ver Fronteiras) o acrescenta a `EstadoDuelo`/`EstadoJogador` **alterando estes mesmos
   arquivos**, nunca criando uma estrutura de estado alternativa.

### Regras de negócio

- **Exatamente 5 + 5 zonas por jogador** (Fase 0.3 deste skill; critério de aceite 1) — garantido
  em tempo de compilação pela tupla de 5 posições e reforçado em runtime por `z.tuple` de 5
  elementos (não uma checagem de `.length` sobre um array de tamanho variável).
- **8000 LP iniciais** (Fase 0.3) — `LP_INICIAL` é uma constante exportada; F01 não atribui valor
  a nenhum `lp` (isso é F03), apenas declara o tipo e disponibiliza a constante para reuso.
- **1 terreno ativo por vez, inicialmente nenhum** (Fase 0.3) — `terrenoAtivo: Carta | null`, sem
  estrutura para um segundo terreno simultâneo.
- **Modificadores não sobrescrevem `atk`/`def` base** (critério de aceite 3) — garantido pela
  ausência de qualquer campo de "poder modificado" em `ZonaMonstro`; a carta armazenada é sempre o
  objeto `Carta` original e `Readonly` (herdado de `banco-de-cartas`/F01).
- **Cartas referenciam exclusivamente o schema canônico de 12 campos** (critério de aceite 4) —
  `mao`, `deck` e o campo `carta` de cada zona usam o tipo `Carta` importado, sem `extends`,
  `intersection` ou campo adicional.

### Eventos

Não aplicável. F01 não emite nem consome eventos — o barramento é F02, que consome este mesmo
`EstadoDuelo` como base e o estende com o campo `pendente` para representar a janela de reação
suspensa (`arquitetura.md` §3.2). F01 não define esse campo (Decisão 7).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`JogadorIdSchema`** — `z.enum(['P1', 'P2'])`. Tipo derivado `JogadorId`.
- **`FaseSchema`** — `z.enum(['compra', 'principal', 'batalha', 'fim'])`. Tipo derivado `Fase`.
- **`PosicaoMonstroSchema`** — `z.enum(['ataque_face_cima', 'ataque_face_baixo',
  'defesa_face_cima', 'defesa_face_baixo'])`. Tipo derivado `PosicaoMonstro`.
- **`ZonaMonstroSchema`** — `z.discriminatedUnion('ocupada', [vazia, ocupada])`:
  - vazia: `z.object({ ocupada: z.literal(false) }).strict()`
  - ocupada: `z.object({ ocupada: z.literal(true), carta: CartaSchema, posicao:
    PosicaoMonstroSchema, jaAtacou: z.boolean(), jaMudouDePosicao: z.boolean() }).strict()`
- **`ZonaMagiaSchema`** — `z.discriminatedUnion('ocupada', [vazia, ocupada])`:
  - vazia: `z.object({ ocupada: z.literal(false) }).strict()`
  - ocupada: `z.object({ ocupada: z.literal(true), carta: CartaSchema, viradaParaCima:
    z.boolean() }).strict()`
- **`CampoJogadorSchema`** — objeto estrito com `monstros: z.tuple([ZonaMonstroSchema ×5])` e
  `magias: z.tuple([ZonaMagiaSchema ×5])`.
- **`EstadoJogadorSchema`** — objeto estrito: `lp: z.number().int().min(0)`; `mao:
  z.array(CartaSchema)`; `deck: z.array(CartaSchema)`; `campo: CampoJogadorSchema`.
- **`EstadoDueloSchema`** — objeto estrito: `jogadores: z.object({ P1: EstadoJogadorSchema, P2:
  EstadoJogadorSchema }).strict()`; `terrenoAtivo: CartaSchema.nullable()`; `jogadorAtivo:
  JogadorIdSchema`; `turno: z.number().int().min(1)`; `fase: FaseSchema`.

Todos os tipos TS acima (`EstadoDuelo`, `EstadoJogador`, `CampoJogador`, `ZonaMonstro`,
`ZonaMagia`) são inferidos de seus schemas via `z.infer`, seguindo o mesmo padrão de
`CartaSchema` → `Carta` já estabelecido por `banco-de-cartas`/F01.

### Funções públicas

Nenhuma. F01 define apenas tipos e contratos zod — não há função que crie, transforme ou valide
um estado além do próprio `EstadoDueloSchema.parse`/`safeParse` (comportamento padrão do zod, não
uma função de domínio desta feature). A primeira função pública que **constrói** um `EstadoDuelo`
é `initDuel` (F03, `packages/engine`).

### Endpoints / RPC / mensagens de rede

Não aplicável. F01 não expõe endpoint nem RPC — é um contrato de tipos em memória. Os payloads de
rede do modo online (`arquitetura.md` §6) serializam este mesmo tipo por meio de F05, ainda não
especificada.

### Contratos externos (cross-PRD)

Nenhum contrato cross-PRD **ainda inexistente** é consumido aqui. `Carta` e `CartaSchema` já têm
spec própria (`banco-de-cartas`/F01) e são reusados sem redefinição (Decisão 8) — ver Contratos
externos assumidos, Seção 1.

### Exemplo de `EstadoDuelo` válido

```json
{
  "jogadores": {
    "P1": {
      "lp": 8000,
      "mao": [],
      "deck": [],
      "campo": {
        "monstros": [
          {
            "ocupada": true,
            "carta": {
              "id": 1,
              "numero": "001",
              "nome": "Blue-eyes White Dragon",
              "img": null,
              "classe": "Dragon",
              "atk": 3000,
              "def": 2500,
              "guardiao1": "Sun",
              "guardiao2": "Mars",
              "password": "89 63 11 39",
              "estrelas": 999999,
              "tipo": "monstro"
            },
            "posicao": "ataque_face_cima",
            "jaAtacou": false,
            "jaMudouDePosicao": false
          },
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false }
        ],
        "magias": [
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false }
        ]
      }
    },
    "P2": {
      "lp": 8000,
      "mao": [],
      "deck": [],
      "campo": {
        "monstros": [
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false }
        ],
        "magias": [
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false },
          { "ocupada": false }
        ]
      }
    }
  },
  "terrenoAtivo": null,
  "jogadorAtivo": "P1",
  "turno": 1,
  "fase": "principal"
}
```

## 5. Modelo de Dados

Não aplicável. F01 não cria tabela Postgres, não define estrutura IndexedDB/fila offline e não
produz arquivo de dados versionado — é um contrato de tipos e schema em memória, consumido em
tempo de execução por outras features. Persistência do resultado de um duelo (`dataset_versions`,
`wallets`, `reward_ledger`) pertence a outros PRDs; o snapshot serializável do próprio
`EstadoDuelo` é F05, não F01.

## 6. Tratamento de Erros e Casos de Borda

F01 não tem bloco de Error Handling no PRD (só aparece a partir de F03) — os casos abaixo são
falhas técnicas de validação de fronteira via zod, relevantes para quem vier a chamar
`EstadoDueloSchema.safeParse` (F03 ao inicializar, F05 ao desserializar um snapshot):

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| `monstros`/`magias` com array de comprimento diferente de 5 | `z.tuple` de 5 elementos | `safeParse` retorna `{ success: false }` com o índice do elemento faltante/excedente | Erro padrão do zod — customização de mensagem ao usuário é responsabilidade de quem chama (F03/F05) |
| Zona com `ocupada: true` sem o campo `carta` | `z.discriminatedUnion` | Rejeitado — variante não casa com nenhum membro da união | Erro padrão do zod |
| Zona com `ocupada: false` e algum campo extra (`carta`, `posicao`, flags) | `.strict()` na variante vazia | Rejeitado — campo não reconhecido | Erro padrão do zod |
| `lp` negativo | `z.number().int().min(0)` | Rejeitado | Erro padrão do zod |
| `turno` menor que 1 | `z.number().int().min(1)` | Rejeitado | Erro padrão do zod |
| Carta em `mao`/`deck`/zona que viola `CartaSchema` (ex.: `tipo` fora do enum de 5) | `CartaSchema` (reuso de `banco-de-cartas`/F01) | Rejeitado — mesma regra de validação já especificada naquela feature | Erro padrão do zod |
| `jogadorAtivo` fora de `'P1' \| 'P2'` | `JogadorIdSchema` | Rejeitado | Erro padrão do zod |
| `fase` fora das 4 conhecidas | `FaseSchema` | Rejeitado | Erro padrão do zod |
| `terrenoAtivo` com uma carta que não é logicamente "de terreno" (ex.: um monstro) | Não validado aqui — ver Decisão 13 | **Aceito pelo schema de F01.** A checagem de elegibilidade da carta de terreno é de F09 | — |

## 7. Estratégia de Testes

### Unitários (Vitest)

`EstadoDueloSchema` / tipos aninhados — table-driven (guidelines §11.2):

- `EstadoDueloSchema aceita um estado inicial com todas as zonas vazias e LP 8000`
- `EstadoDueloSchema aceita uma zona de monstro ocupada em cada uma das 4 posições` (4 casos: 
  `ataque_face_cima`, `ataque_face_baixo`, `defesa_face_cima`, `defesa_face_baixo`)
- `EstadoDueloSchema rejeita campo monstros com 4 zonas`
- `EstadoDueloSchema rejeita campo monstros com 6 zonas`
- `EstadoDueloSchema rejeita campo magias com comprimento diferente de 5`
- `EstadoDueloSchema rejeita zona de monstro ocupada sem o campo carta`
- `EstadoDueloSchema rejeita zona de monstro vazia com jaAtacou presente`
- `EstadoDueloSchema rejeita zona de magia ocupada sem viradaParaCima`
- `EstadoDueloSchema aceita zona de magia ocupada com viradaParaCima false (armadilha setada)`
- `EstadoDueloSchema aceita zona de magia ocupada com viradaParaCima true (equipamento revelado)`
- `EstadoDueloSchema rejeita lp negativo`
- `EstadoDueloSchema aceita lp zero`
- `EstadoDueloSchema rejeita turno menor que 1`
- `EstadoDueloSchema aceita terrenoAtivo nulo`
- `EstadoDueloSchema aceita terrenoAtivo com uma carta qualquer do schema canônico`
- `EstadoDueloSchema rejeita jogadorAtivo fora de P1 ou P2`
- `EstadoDueloSchema rejeita fase fora das quatro conhecidas`
- `EstadoDueloSchema rejeita carta em mao que viola o schema canonico de 12 campos`
- `EstadoDueloSchema rejeita objeto com campo desconhecido no nivel raiz`

### Property-based (fast-check)

- **Invariante de exatamente 5 zonas:** para qualquer inteiro `n` gerado em `[0, 10]` diferente de
  5, um array de `n` zonas de monstro (ou de magia) sempre falha na validação; para `n === 5`,
  sempre passa (dado o resto do estado válido). 1.000 execuções.
- **Aceitação de qualquer carta canônica válida em zona ocupada:** para qualquer `Carta` gerada a
  partir de um arbitrário compatível com `CartaSchema` e qualquer uma das 4 `PosicaoMonstro`, uma
  zona de monstro ocupada com esses valores sempre passa em `ZonaMonstroSchema`.
- **Preservação do valor base:** para qualquer `Carta` válida inserida numa zona ocupada, o valor
  de `atk`/`def` lido de volta em `zona.carta` é sempre idêntico (`===`) ao valor original — não
  há transformação em nenhum ponto do schema ou do tipo.

### Integração

Não aplicável. Esta feature não atravessa pacotes nem toca Postgres, RLS, RPC ou filesystem. A
verificação de ponta a ponta — um `EstadoDuelo` real construído a partir de decks do Build Deck —
pertence a F03.

### Análise estática

- `packages/shared/src/duelo/**` não importa `data`, `rules`, `engine`, `ai`, `web`, `server`,
  React, DOM, `fetch` nem Supabase (regra nova em `.dependency-cruiser.cjs`).
- `packages/shared` continua sem importar nenhum outro pacote do monorepo (regra herdada de
  `banco-de-cartas`/F01, reforçada aqui).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F01) | Teste |
|---|---|
| O estado expõe, por jogador, LP, mão, deck e um campo com exatamente 5 zonas de monstro e 5 de magia/armadilha, além de terreno ativo, jogador ativo, turno e fase globais | `EstadoDueloSchema aceita um estado inicial com todas as zonas vazias e LP 8000` + `EstadoDueloSchema rejeita campo monstros com 4 zonas` + `EstadoDueloSchema rejeita campo monstros com 6 zonas` + `EstadoDueloSchema rejeita campo magias com comprimento diferente de 5` |
| Cada zona de monstro registra a carta, uma das 4 posições e as flags "já atacou" / "já mudou de posição" | `EstadoDueloSchema aceita uma zona de monstro ocupada em cada uma das 4 posições` + `EstadoDueloSchema rejeita zona de monstro ocupada sem o campo carta` + `EstadoDueloSchema rejeita zona de monstro vazia com jaAtacou presente` |
| Modificadores (guardião/terreno/equip) não alteram o `atk`/`def` base da carta armazenada | Propriedade `Preservação do valor base` + ausência estrutural de campo de poder modificado em `ZonaMonstro` (verificável por leitura do tipo) |
| Cartas referenciam apenas campos do schema existente, sem campos novos | `EstadoDueloSchema rejeita carta em mao que viola o schema canonico de 12 campos` + reuso direto de `CartaSchema` sem `extends`/`intersection` (verificável por leitura do código) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Nenhuma capacidade do motor depende de UI" (verificação de desacoplamento) | Análise estática acima — garante, antes mesmo de `packages/engine` existir, que a base de dados do motor já nasce livre de UI/IO |
| Cross-Feature: pré-requisito estrutural de "o mesmo estado inicial + mesma sequência de ações + mesmo seed produz o mesmo resultado" (determinismo, testado de fato por F05) | Decisão 15 (`EstadoDuelo` é 100% JSON serializável) — citada aqui como premissa estrutural; o round-trip em si é testado por F05 |
| Cross-PRD | Nenhum critério de Cross-PRD Integration da Seção 9 cita F01 diretamente — F01 é consumido transitivamente por todos eles via F03 (Build Deck), F04 (Guardian Star/Terrain/Effect System) e F05 (Online Duel) |
