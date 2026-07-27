# Barramento de Eventos e Janela de Reação

> PRD: `docs/prds/motor-duelo-1x1.md` — F02
> Pacote-alvo: `packages/shared` + `packages/engine`

## 1. Contexto e Escopo

Esta feature entrega o **vocabulário de eventos de gatilho** do motor e a **mecânica de janela de
reação** — a máquina de estados explícita descrita em `docs/arquitetura.md` §3.2, que permite ao
motor pausar o fluxo de uma ação, publicar um evento e aguardar o Effect System (cross-PRD)
resolver 0..N efeitos antes de retomar. É, junto de F01, a **Foundation** do módulo (PRD §8, Parte
2): toda ação de jogador definida por F06–F11 emitirá seus eventos por este contrato.

F02 consome apenas o `EstadoDuelo` de F01 e o **estende** — acrescenta o campo `pendente` que a
spec de F01 já havia reservado explicitamente para esta feature (F01, Decisão 7). É também a
primeira feature do PRD com **lógica pura de fato** (não apenas tipos): por isso, é aqui que o
pacote `packages/engine` nasce no monorepo — até agora só `packages/shared` existia, porque F01
não tinha nenhuma função, só forma de dados (guidelines §3.2: `shared` é "types, schemas, and
contracts only. Sem lógica"; `engine` é "reducer puro", `arquitetura.md` §2).

Esta spec **não** implementa nenhuma ação de jogador (comprar, invocar, atacar, etc. são F06–F12) e
**não** resolve o que uma armadilha ou magia faz quando reage — isso é responsabilidade do Effect
System (cross-PRD, `packages/rules`, fora deste PRD). F02 entrega apenas: o formato do evento, o
mecanismo de pausar (abrir janela) e retomar (fechar janela) o fluxo, e o predicado que outras
features usam para saber se uma janela está aberta.

### Incluído

- Vocabulário fechado de **10 tipos de evento**: `onTurnStart`, `onDraw`, `onSummon`, `onSet`,
  `onFlip`, `onPositionChange`, `onAttackDeclared`, `onDamage`, `onDestroy`, `onTurnEnd` (PRD F02
  Capabilities; ≥ 8 exigidos, 10 fornecidos)
- Forma do `Evento`: tipo, jogador de origem, cartas envolvidas, zonas envolvidas e um contexto
  livre serializável em JSON (PRD F02 Capabilities)
- Referência de zona (`ReferenciaZona`) para apontar a uma das 10 zonas de um jogador sem duplicar
  a carta ali
- Campo `pendente` em `EstadoDuelo`, representando a janela de reação suspensa (PRD F02
  Capabilities; extensão do tipo reservada por F01)
- Mecânica pura de **abrir** e **fechar** a janela de reação, e o predicado de "há janela aberta"
  que F06–F12 usarão como guarda antes de aceitar uma nova ação (PRD F02 Capabilities: "o motor
  pausa o fluxo ... e aguarda ... antes de retomar")
- Construtor puro de evento, garantindo forma consistente para quem for emitir (F06–F11)
- Garantia estrutural de que a lista de eventos emitidos nunca é reordenada (PRD F02 Capabilities:
  "o motor garante apenas a ordem de emissão dos eventos, determinística")
- Criação do pacote `packages/engine` (scaffold + primeiro subsistema `eventos/`)

### Fronteiras

- **Resolução do que um efeito faz** (o que uma armadilha ou magia executa ao reagir) → **Effect
  System, cross-PRD**. F02 só publica o evento e abre a janela; não decide nem executa reação. —
  PRD §6 F02 Capabilities, PRD §7
- **Ordem de resolução entre múltiplos efeitos disparados pelo mesmo evento** → **Effect System,
  cross-PRD**. F02 garante apenas a ordem de *emissão*, não de *resolução*. — PRD §6 F02
  Capabilities
- **Decisão de qual ação concreta emite qual evento e se abre janela** → **F06–F11**, cada uma na
  sua própria spec. F02 oferece o mecanismo (criar evento, abrir/fechar janela); não decide
  quando cada uma é chamada.
- **Recusa de uma nova ação de jogo enquanto a janela está aberta** — a mensagem e a decisão de
  recusar pertencem a cada feature de ação (F06–F12); F02 só expõe o predicado que ela consulta.
- **`Acao` (união de todas as ações de jogador) e o dispatcher `apply(state, action)`** — não são
  definidos aqui. Emergem progressivamente de F06–F12, cada uma contribuindo sua própria variante.
  F02 define apenas o par `{ estado, eventos }` que qualquer uma dessas ações devolve.
- **Inicialização do estado (`initDuel`)** → F03, que também usa `packages/engine`.

### Contratos externos assumidos

- **`EstadoDuelo`, `EstadoJogador`, `JogadorId`, `Carta`, `Fase`** — de `motor-duelo-1x1`/F01
  (`docs/specs/motor-duelo-1x1/F01-modelo-de-estado-do-duelo/spec.md`). Reusados; `EstadoDuelo` é
  **estendido** (campo `pendente`), nunca redefinido do zero.
- **`Carta`/`CartaSchema`** — de `banco-de-cartas`/F01 (transitivo, via F01 deste PRD).

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | `contexto: Record<string, ValorJson>` — bag livre serializável em JSON; cada feature que emite um evento decide o que incluir (ex.: `{ dano: 1500 }` em `onDamage`). F02 não fixa chaves por tipo de evento. | Entrevista (recomendação aceita) | confirmada |
| 2 | `pendente?: JanelaReacao` é acrescentado a `EstadoDuelo` **alterando o arquivo criado por F01**, nunca redefinindo o tipo. | F01 Decisão 7; `arquitetura.md` §3.2 (citação literal do campo `pendente`) | confirmada |
| 3 | Os 10 nomes de evento (`onTurnStart` … `onTurnEnd`) permanecem em inglês, exatamente como aparecem no PRD e em `arquitetura.md`, mesmo com o resto do domínio nomeado em português. | PRD §6 F02 Capabilities; `arquitetura.md` §3.3 (citação literal) | confirmada |
| 4 | `ReferenciaZona = { jogador: JogadorId; tipoZona: 'monstro' \| 'magia'; indice: 0\|1\|2\|3\|4 }` aponta para uma zona sem duplicar a carta ali — permite ao Effect System (cross-PRD) localizar a zona exata sem escanear o campo inteiro. | Decisão de design, mesma filosofia de F01 (estados inválidos difíceis de representar: `indice` é união fechada de 5 literais, não `number`) | confirmada |
| 5 | Só existe **uma** janela de reação pendente por vez — abrir uma segunda antes de fechar a primeira é erro. | PRD §6 F02 Capabilities ("o motor pausa o fluxo", singular); `arquitetura.md` §3.2 (`pendente` é um campo único, não uma pilha) | confirmada |
| 6 | `abrirJanelaReacao`/`fecharJanelaReacao` retornam `Result<EstadoDuelo, DomainError>` em vez de lançar exceção para as duas falhas de pré-condição (janela já aberta / nenhuma janela aberta). | Mesma convenção usada em `banco-de-cartas`/F01 para falhas de domínio esperadas; guidelines §7.2 | confirmada |
| 7 | `criarEvento` não valida o resultado contra `EventoSchema` internamente — é um construtor puro que confia na tipagem TS. Validação de fronteira (ex.: evento desserializado de uma mensagem de rede) usa `EventoSchema.safeParse` separadamente, por quem cruza aquela fronteira. | Guidelines §7.3 ("não misture validação, persistência e formatação numa função") | confirmada |
| 8 | Esta feature cria `packages/engine` pela primeira vez no monorepo — é a primeira com lógica pura de fato; F01 tinha apenas tipos/schema, apropriados para `shared`. | Guidelines §3.2 (`shared` = "types, schemas, and contracts only. Sem lógica"); `arquitetura.md` §2 (`engine` = "reducer puro") | confirmada |
| 9 | `packages/engine` depende, por enquanto, **só** de `packages/shared` — nenhuma dependência de `data`, `rules` ou `ai` ainda, porque a mecânica de janela de reação não precisa de nenhuma delas. | PRD §6 F02 Consumes (só F01) | confirmada |
| 10 | A decisão de **se** um evento abre janela de reação é de quem o emite (F06–F12), não de F02 — o subsistema de eventos oferece o mecanismo, não a política de quando usá-lo. | PRD §6 F02 Capabilities ("ao emitir um evento **com janela de reação**" — condicional, não universal a todo evento) | confirmada |
| 11 | `haJanelaReacaoAberta` é a guarda que F06–F12 devem consultar antes de aceitar uma nova ação; a recusa concreta e sua mensagem ao jogador são responsabilidade de cada feature consumidora. | Leitura de fronteira entre o Provides de F02 e o Consumes de F06–F12 | confirmada |
| 12 | `jogadorOrigem` representa o jogador cuja ação **disparou** o evento (o agente), não necessariamente o dono da carta/zona afetada — ex.: o `onFlip` do monstro do defensor durante a resolução de um ataque tem `jogadorOrigem` igual ao **atacante**. | Leitura literal de "jogador de origem" no PRD §6 F02 Capabilities | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duelo/eventos.ts` | shared | novo | `TipoEvento`, `TipoZonaCampo`, `IndiceZona`, `ReferenciaZona`, `ValorJson`, `Evento`, `JanelaReacao` |
| `packages/shared/src/duelo/tipos.ts` | shared | alterado | Acrescenta `pendente?: JanelaReacao` a `EstadoDuelo` (campo reservado desde F01, Decisão 7) |
| `packages/shared/src/duelo/resultado.ts` | shared | novo | `ResultadoAplicacao` — par `{ estado: EstadoDuelo; eventos: readonly Evento[] }` (`arquitetura.md` §3.1) |
| `packages/shared/src/duelo/schema.ts` | shared | alterado | Acrescenta `TipoEventoSchema`, `TipoZonaCampoSchema`, `IndiceZonaSchema`, `ReferenciaZonaSchema`, `ValorJsonSchema` (recursivo), `EventoSchema`, `JanelaReacaoSchema`; estende `EstadoDueloSchema` com `pendente` opcional |
| `packages/shared/src/duelo/constantes.ts` | shared | alterado | Acrescenta `TIPOS_EVENTO` (os 10 valores, para iteração/teste) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos contratos de evento e o `ResultadoAplicacao` |
| `packages/shared/src/duelo/schema.test.ts` | shared | alterado | Novos casos: `EventoSchema`, `ReferenciaZonaSchema`, `JanelaReacaoSchema`, `EstadoDueloSchema` com `pendente` preenchido |
| `packages/engine/package.json` | engine | novo | Pacote com dependência `workspace:` em `shared` |
| `packages/engine/README.md` | engine | novo | Propósito, exports públicos, direção de dependência, comando de teste (guidelines §21.3) |
| `packages/engine/src/eventos/criar-evento.ts` | engine | novo | `criarEvento` — construtor puro |
| `packages/engine/src/eventos/janela-reacao.ts` | engine | novo | `abrirJanelaReacao`, `fecharJanelaReacao`, `haJanelaReacaoAberta` |
| `packages/engine/src/eventos/index.ts` | engine | novo | Export público do subsistema `eventos` |
| `packages/engine/src/index.ts` | engine | novo | Export público estável do pacote (primeira vez) |
| `packages/engine/src/eventos/criar-evento.test.ts` | engine | novo | Unitários do construtor |
| `packages/engine/src/eventos/janela-reacao.test.ts` | engine | novo | Unitários de abrir/fechar/predicado |
| `packages/engine/src/eventos/janela-reacao.propriedades.test.ts` | engine | novo | Propriedades fast-check: round-trip abrir+fechar; segunda abertura sempre falha |
| `.dependency-cruiser.cjs` | raiz | alterado | Acrescenta regra: `packages/engine` só importa `packages/shared`; nunca `web`, `server`, React, DOM, `fetch` ou Supabase |

**Verificação da direção de dependências:** `packages/engine/src/eventos/**` importa apenas de
`packages/shared` (`Evento`, `EstadoDuelo`, `ReferenciaZona`, `JogadorId`, `Result`,
`DomainError`) — respeitando `shared ← data ← rules ← engine ← ai` de `arquitetura.md` §2 por não
depender de nada acima na cadeia (não importa `data`, `rules` nem `ai`, embora pudesse). **Esta é
a primeira aplicação real do pilar 1** ("motor sem UI") em código deste PRD: nenhum arquivo de
`packages/engine` importa React, DOM, `fetch`, WebSocket ou Supabase — verificado por
`dependency-cruiser` desde o primeiro commit do pacote, não adicionado depois.

## 3. Design Técnico

### Estruturas de dados

**`TipoEvento`** — união fechada de 10 literais: `'onTurnStart' | 'onDraw' | 'onSummon' | 'onSet'
| 'onFlip' | 'onPositionChange' | 'onAttackDeclared' | 'onDamage' | 'onDestroy' | 'onTurnEnd'`.

**`TipoZonaCampo`** — `'monstro' | 'magia'`, identifica qual das duas tuplas de `CampoJogador` (F01)
uma `ReferenciaZona` aponta.

**`IndiceZona`** — `0 | 1 | 2 | 3 | 4`, união fechada (não `number`) — mesma filosofia de F01 de
tornar índices fora de alcance irrepresentáveis no tipo.

**`ReferenciaZona`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `jogador` | `JogadorId` | De quem é a zona referenciada |
| `tipoZona` | `TipoZonaCampo` | Zona de monstro ou de magia/armadilha |
| `indice` | `IndiceZona` | Posição na tupla de 5 (F01) |

**`ValorJson`** — tipo recursivo: `string | number | boolean | null | ValorJson[] | { [chave:
string]: ValorJson }`. Garante que `contexto` seja sempre serializável em JSON, sem abrir a porta
para funções, `undefined`, `Map`/`Set` ou datas não serializadas.

**`Evento`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `tipo` | `TipoEvento` | Qual dos 10 gatilhos |
| `jogadorOrigem` | `JogadorId` | Jogador cuja ação disparou o evento (Decisão 12) |
| `cartasEnvolvidas` | `readonly Carta[]` | Cartas relevantes ao evento; pode ser vazio (ex.: `onTurnStart`) |
| `zonasEnvolvidas` | `readonly ReferenciaZona[]` | Zonas relevantes; pode ser vazio |
| `contexto` | `Record<string, ValorJson>` | Dado suplementar específico do gatilho (Decisão 1); pode ser `{}` |

**`JanelaReacao`** — citação literal de `arquitetura.md` §3.2: `{ tipo: 'janela_reacao'; evento:
Evento; jogadorPodeReagir: JogadorId }`. O campo `tipo` interno é um literal único hoje, mas deixa
a estrutura pronta para outros tipos de estado suspenso no futuro, sem quebrar quem já faz
`if (pendente.tipo === 'janela_reacao')`.

**`EstadoDuelo`** (alteração de F01) — acrescenta `pendente?: JanelaReacao`. Ausente/`undefined` =
fluxo normal; presente = motor pausado aguardando resolução externa.

**`ResultadoAplicacao`** — `{ estado: EstadoDuelo; eventos: readonly Evento[] }`, o par que
`arquitetura.md` §3.1 descreve como retorno de `apply(state, action)`. F02 define o **par**; o
dispatcher `apply` em si e a união `Acao` emergem de F06–F12.

### Fluxo

1. Uma feature de ação (F06–F12) monta seu `Evento` chamando `criarEvento`, no ponto do próprio
   fluxo que a sua spec descreve.
2. Se aquele ponto exige janela de reação (ex.: `onSummon`, `onAttackDeclared` — decisão de cada
   feature, não de F02, Decisão 10), ela chama `abrirJanelaReacao(estado, evento,
   jogadorPodeReagir)`, obtendo um novo estado com `pendente` preenchido.
3. Enquanto `pendente` estiver definido, nenhuma nova ação de jogo deve ser aceita — cada feature
   de ação verifica `haJanelaReacaoAberta(estado)` no início do próprio handler e recusa se
   verdadeiro (mensagem de recusa é responsabilidade dela, não de F02).
4. Quem orquestra a partida (UI local, IA, ou servidor online) encaminha `estado.pendente.evento`
   ao Effect System (cross-PRD), que resolve 0..N efeitos, possivelmente aplicando novas ações
   sobre o motor.
5. Ao término da resolução — mesmo que nenhum efeito tenha reagido — o orquestrador chama
   `fecharJanelaReacao(estado)`, e o fluxo original (ex.: a resolução de combate de F11) continua
   a partir do estado sem `pendente`.
6. Eventos que **não** abrem janela são apenas construídos com `criarEvento` e acumulados na lista
   `eventos` do `ResultadoAplicacao` da ação — sem tocar `abrirJanelaReacao`/`fecharJanelaReacao`.

### Regras de negócio

- **Uma única janela pendente por vez** (Decisão 5) — `abrirJanelaReacao` rejeita uma segunda
  chamada enquanto `pendente` já existe.
- **Fechar sem estar aberta é erro** — protege o chamador contra perder a contagem do próprio
  fluxo (ex.: fechar duas vezes por engano).
- **`eventos` é sempre uma lista ordenada por inserção** — nenhuma função deste subsistema
  reordena eventos; satisfaz "ordem de emissão determinística" (PRD F02 Capabilities) por
  construção, não por um passo extra de ordenação.
- **Vocabulário fechado de 10 tipos** — nenhuma feature futura inventa um 11º tipo sem alterar
  `TipoEvento` neste mesmo arquivo (mesma disciplina de extensão por alteração usada em F01).
- **`pendente.evento` é imutável durante a janela** — `fecharJanelaReacao` apenas remove o campo;
  nunca transforma o evento nele contido.

### Eventos

Os 10 tipos e o ponto do PRD que os emite (F02 define o vocabulário; a emissão concreta é de cada
feature citada):

| Tipo | Emitido por | Abre janela? |
|---|---|---|
| `onTurnStart` | F06, início de turno | Decisão de F06 |
| `onDraw` | F07, cada carta comprada | Decisão de F07 |
| `onSummon` | F08, monstro invocado face-cima | Decisão de F08 |
| `onSet` | F08 (monstro face-baixo) e F09 (magia/armadilha) | Decisão de F08/F09 |
| `onFlip` | F10 e F11, carta face-baixo revelada | Decisão de F10/F11 |
| `onPositionChange` | F10, mudança de posição de monstro | Decisão de F10 |
| `onAttackDeclared` | F11, declaração de ataque | Sim — exemplo explícito do PRD (Experience de F02) |
| `onDamage` | F11, dano de LP aplicado | Decisão de F11 |
| `onDestroy` | F11, monstro destruído em combate | Decisão de F11 |
| `onTurnEnd` | F06, fim de turno | Decisão de F06 |

### Determinismo e pureza

- `criarEvento`, `abrirJanelaReacao`, `fecharJanelaReacao` e `haJanelaReacaoAberta` são **puras**:
  nenhuma toca I/O, UI, relógio ou gerador aleatório.
- `abrirJanelaReacao`/`fecharJanelaReacao` **nunca mutam** o objeto `estado` recebido — devolvem um
  novo objeto (`{ ...estado, pendente: ... }` / com `pendente` omitido), preservando imutabilidade
  por padrão (guidelines §1.2).
- Nenhuma função desta feature usa `Math.random()` nem qualquer fonte de aleatoriedade — não há
  necessidade de PRNG aqui (nada é sorteado).
- `Evento` e `JanelaReacao` são 100% serializáveis em JSON — `ValorJson` é a única estrutura
  "livre" e ela própria é definida recursivamente só sobre primitivos JSON. Isso preserva a
  Decisão 15 de F01 (`EstadoDuelo` inteiro continua serializável) mesmo com `pendente` presente.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`TipoEventoSchema`** — `z.enum([...os 10 valores...])`. Tipo derivado `TipoEvento`.
- **`TipoZonaCampoSchema`** — `z.enum(['monstro', 'magia'])`.
- **`IndiceZonaSchema`** — `z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3),
  z.literal(4)])`.
- **`ReferenciaZonaSchema`** — objeto estrito com os 3 campos acima.
- **`ValorJsonSchema`** — schema recursivo via `z.lazy`, aceitando string, número, booleano, nulo,
  array de `ValorJsonSchema` ou objeto de chave-string para `ValorJsonSchema`.
- **`EventoSchema`** — objeto estrito: `tipo` via `TipoEventoSchema`; `jogadorOrigem` via
  `JogadorIdSchema` (F01); `cartasEnvolvidas: z.array(CartaSchema)`; `zonasEnvolvidas:
  z.array(ReferenciaZonaSchema)`; `contexto: z.record(z.string(), ValorJsonSchema)`.
- **`JanelaReacaoSchema`** — objeto estrito: `tipo: z.literal('janela_reacao')`; `evento:
  EventoSchema`; `jogadorPodeReagir` via `JogadorIdSchema`.
- **`EstadoDueloSchema`** (alteração de F01) — acrescenta `pendente:
  JanelaReacaoSchema.optional()`.

### Funções públicas

```
// packages/engine/src/eventos — núcleo puro, sem I/O

criarEvento(entrada: {
  tipo: TipoEvento;
  jogadorOrigem: JogadorId;
  cartasEnvolvidas?: readonly Carta[];
  zonasEnvolvidas?: readonly ReferenciaZona[];
  contexto?: Record<string, ValorJson>;
}): Evento
  // puro; campos omitidos viram [] / [] / {} — nunca undefined
  // não valida contra EventoSchema (Decisão 7) — confia na tipagem do chamador

abrirJanelaReacao(
  estado: EstadoDuelo,
  evento: Evento,
  jogadorPodeReagir: JogadorId,
): Result<EstadoDuelo, DomainError>
  // pré: estado.pendente === undefined
  // pós: ok ⇒ novo estado (sem mutar o recebido) com pendente = { tipo: 'janela_reacao', evento, jogadorPodeReagir }
  //      erro ⇒ code 'janela_ja_aberta', details { tipoEventoPendente: estado.pendente.evento.tipo }

fecharJanelaReacao(estado: EstadoDuelo): Result<EstadoDuelo, DomainError>
  // pré: estado.pendente !== undefined
  // pós: ok ⇒ novo estado com pendente removido
  //      erro ⇒ code 'nenhuma_janela_aberta'

haJanelaReacaoAberta(estado: EstadoDuelo): boolean
  // puro; true sse estado.pendente !== undefined — guarda para F06–F12 usarem antes de aceitar ação
```

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01: contrato em memória, sem endpoint próprio. O modo
online (`arquitetura.md` §6) transmitirá `Evento`/`pendente` como parte do snapshot de F05, ainda
não especificada.

### Contratos externos (cross-PRD)

**Effect System (`packages/rules`, cross-PRD, ainda não implementado):** consome o par
`(estado.pendente.evento, estado.pendente.jogadorPodeReagir)` para decidir quais armadilhas/magias
reagem, e devolve o controle ao orquestrador (que chama `fecharJanelaReacao`) depois de aplicar
0..N ações de efeito sobre o motor. F02 **fornece** este contrato de saída (`Evento`,
`JanelaReacao`); a lógica de resolução em si é do Effect System — ver PRD §9, Cross-PRD
Integration.

### Exemplo de `Evento`

```json
{
  "tipo": "onAttackDeclared",
  "jogadorOrigem": "P1",
  "cartasEnvolvidas": [
    {
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
    }
  ],
  "zonasEnvolvidas": [
    { "jogador": "P1", "tipoZona": "monstro", "indice": 0 },
    { "jogador": "P2", "tipoZona": "monstro", "indice": 2 }
  ],
  "contexto": {}
}
```

### Exemplo de `EstadoDuelo` com janela de reação aberta

```json
{
  "jogadores": { "...": "omitido — ver exemplo completo na spec de F01" },
  "terrenoAtivo": null,
  "jogadorAtivo": "P1",
  "turno": 3,
  "fase": "batalha",
  "pendente": {
    "tipo": "janela_reacao",
    "evento": {
      "tipo": "onAttackDeclared",
      "jogadorOrigem": "P1",
      "cartasEnvolvidas": [],
      "zonasEnvolvidas": [
        { "jogador": "P1", "tipoZona": "monstro", "indice": 0 },
        { "jogador": "P2", "tipoZona": "monstro", "indice": 2 }
      ],
      "contexto": {}
    },
    "jogadorPodeReagir": "P2"
  }
}
```

## 5. Modelo de Dados

Não aplicável. F02, como F01, não cria tabela Postgres, estrutura IndexedDB/fila offline nem
arquivo de dados versionado — é um contrato de tipos/schema e um punhado de funções puras em
memória.

## 6. Tratamento de Erros e Casos de Borda

F02 não tem bloco de Error Handling no PRD (só aparece a partir de F03). Os casos abaixo cobrem as
falhas técnicas desta feature:

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| `abrirJanelaReacao` chamada com `estado.pendente` já definido | Pré-condição em `abrirJanelaReacao` | `Result` de erro, `code: 'janela_ja_aberta'`; estado não é alterado | Erro de domínio sem string de UI — cada chamador (F06–F12) traduz para sua própria mensagem |
| `fecharJanelaReacao` chamada com `estado.pendente` indefinido | Pré-condição em `fecharJanelaReacao` | `Result` de erro, `code: 'nenhuma_janela_aberta'` | Idem |
| `EventoSchema` recebendo `tipo` fora dos 10 conhecidos | `TipoEventoSchema` (zod enum) | `safeParse` falha | Erro padrão do zod |
| `ReferenciaZonaSchema` recebendo `indice` fora de 0–4 | `IndiceZonaSchema` (união de literais) | `safeParse` falha | Erro padrão do zod |
| `contexto` com valor não serializável em JSON (ex.: `undefined` aninhado) | `ValorJsonSchema` recursivo | `safeParse` falha | Erro padrão do zod |
| Nova ação de jogo tentada enquanto `haJanelaReacaoAberta(estado)` é `true` | Responsabilidade de cada feature F06–F12, fora de F02 | Fora de escopo — F02 só fornece o predicado; a recusa concreta e sua mensagem pertencem a cada feature consumidora | — |

## 7. Estratégia de Testes

### Unitários (Vitest)

`criarEvento`:
- `criarEvento preenche cartasEnvolvidas vazio quando omitido`
- `criarEvento preenche zonasEnvolvidas vazio quando omitido`
- `criarEvento preenche contexto vazio quando omitido`
- `criarEvento preserva os valores explicitamente informados sem alterá-los`

`abrirJanelaReacao` / `fecharJanelaReacao` / `haJanelaReacaoAberta`:
- `abrirJanelaReacao define pendente a partir do evento e do jogador que pode reagir`
- `abrirJanelaReacao não muta o objeto de estado recebido`
- `abrirJanelaReacao falha com janela_ja_aberta quando pendente já existe`
- `fecharJanelaReacao remove pendente de um estado com janela aberta`
- `fecharJanelaReacao não muta o objeto de estado recebido`
- `fecharJanelaReacao falha com nenhuma_janela_aberta quando pendente é undefined`
- `haJanelaReacaoAberta retorna false para um estado sem pendente`
- `haJanelaReacaoAberta retorna true depois de abrirJanelaReacao`

`EventoSchema` / tipos de zona (em `packages/shared`):
- `TIPOS_EVENTO contém exatamente os dez tipos esperados, incluindo onPositionChange`
- `EventoSchema rejeita tipo fora dos dez conhecidos`
- `EventoSchema aceita contexto aninhado com string, numero, booleano, nulo, array e objeto`
- `EventoSchema rejeita contexto com valor undefined`
- `ReferenciaZonaSchema rejeita indice 5`
- `ReferenciaZonaSchema aceita indice 0 e indice 4`
- `EstadoDueloSchema aceita um estado com pendente preenchido`
- `EstadoDueloSchema aceita um estado sem pendente (campo opcional)`

### Property-based (fast-check)

- **Round-trip abrir + fechar:** para qualquer `Evento` e `JogadorId` gerados por arbitrário,
  `fecharJanelaReacao(abrirJanelaReacao(estado, evento, jogador).value).value` é estruturalmente
  igual ao `estado` original (mesmo sem `pendente` nos dois lados). 1.000 execuções.
- **Segunda abertura sempre falha:** para qualquer par de eventos arbitrários, chamar
  `abrirJanelaReacao` duas vezes em sequência sobre o mesmo estado sempre falha na segunda
  chamada com `janela_ja_aberta`, independentemente do conteúdo dos dois eventos. 1.000 execuções.

### Integração

Não aplicável — mesma justificativa de F01. A verificação de ponta a ponta (uma ação real de
F06–F12 emitindo e reagindo a um evento) só existe quando aquelas features forem especificadas.

### Análise estática

- `packages/engine/src/eventos/**` não importa `data`, `rules`, `ai`, `web`, `server`, React, DOM,
  `fetch` nem Supabase — só `packages/shared` (regra nova em `.dependency-cruiser.cjs`).
- `packages/shared/src/duelo/**` continua sem importar de nenhum outro pacote do monorepo (regra
  herdada de F01, reforçada aqui).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F02) | Teste |
|---|---|
| Emite ao menos 8 tipos de evento, incluindo onTurnStart, onDraw, onSummon, onSet, onFlip, onAttackDeclared, onDamage, onDestroy, onTurnEnd | `TIPOS_EVENTO contém exatamente os dez tipos esperados, incluindo onPositionChange` |
| Ao emitir um evento com janela de reação, o fluxo pausa, permite 0..N resoluções externas e retoma; sem reações, a janela fecha imediatamente | `abrirJanelaReacao define pendente...` + `fecharJanelaReacao remove pendente...` + propriedade `Round-trip abrir + fechar` — nota: "0..N resoluções externas" em si é do Effect System (cross-PRD); F02 garante e testa apenas a mecânica de pausa/retomada |
| A ordem de emissão dos eventos é determinística para a mesma sequência de ações | `criarEvento preserva os valores explicitamente informados` + garantia estrutural de que `eventos` é sempre uma lista por inserção (Regras de negócio) — a verificação plena de "mesma sequência ⇒ mesma ordem" acontece quando F06–F11 existirem e emitirem de fato |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Todos os eventos emitidos pelas ações (F06–F11) passam por F02 e abrem janela de reação quando aplicável" | `criarEvento`/`abrirJanelaReacao` são o único caminho declarado para emitir evento e abrir janela nesta spec; a verificação plena ocorre quando F06–F11 existirem e os chamarem |
| Cross-Feature: "Nenhuma capacidade do motor depende de UI" | Análise estática de `packages/engine` (criado por esta feature) |
| Cross-PRD: "Effect System: armadilhas/magias posicionadas por F09 reagem aos eventos emitidos por F02 na janela de reação" | Contrato externo declarado na Seção 4 (`Evento` + `JanelaReacao`) — fornecido por F02, a ser consumido pelo Effect System quando aquele PRD existir |
