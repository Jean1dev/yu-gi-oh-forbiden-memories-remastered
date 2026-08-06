# Contrato do Agente e Registro de Estratégias

> PRD: `docs/prds/ia-de-npcs.md` — F01
> Pacote-alvo: `packages/ai` + `apps/web`

## 1. Contexto e Escopo

Esta feature cria a fundação de `packages/ai`: um agente compatível com o `AiAgent` já
publicado por `packages/shared`, um registro extensível endereçado pela string opaca
`DifficultyProfile.strategy` e a política segura `passive`. O pacote passa a ocupar a fronteira
prevista em `docs/arquitetura.md` §2 e na Fase 3 do roadmap (§9), sem mover regras de duelo para a
IA e sem alterar a sessão ou a tela.

O composition root do Free Duel troca o andaime local pelo agente do pacote. F02–F04 completam a
geração, validação e escolha de jogadas; por isso F01 define desde já o contrato de política e o
ponto de registro, mas não antecipa a heurística `fm-basic`.

### Incluído

- Reutilização, sem alteração, de `AiAgent.decide(state, profile): Promise<DuelAction>` e dos
  contratos `PublicDuelState`, `DifficultyProfile` e `DuelAction` existentes em `packages/shared`.
- Registro imutável `strategy → StrategyPolicy`, aberto a novas strings e com rejeição explícita
  de nomes vazios ou duplicados na sua construção.
- Política `passive`, que sempre devolve exatamente `{ "type": "advance_phase" }`.
- Resolução de estratégia vazia ou desconhecida para `passive`, com um `warn` estruturado contendo
  o identificador recebido e sem exceção propagada.
- Preservação da pausa de apresentação no agente, com padrão de 650 ms e função de espera
  injetável; políticas permanecem livres de espera e I/O.
- Substituição do agente passivo local em `createDuelRuntime`, sem mudar `duel-session`, store,
  hooks ou componentes.

### Adiado

- Geração de candidatos a partir do estado público (F02).
- Filtragem de legalidade pelo motor (F03).
- Implementação e registro efetivo da política `fm-basic` (F04). Ao concluir F04, o registro
  padrão conterá exatamente `passive` e `fm-basic`, como exige o PRD.
- Captura geral de exceções de política, validação defensiva de estado, limites e garantias
  completas de determinismo/falha segura (F05).

### Fronteiras

- O vocabulário e a legalidade das ações, a resolução de combate e o desfecho pertencem ao Motor
  de Duelo 1x1. F01 não replica regras nem chama `apply` (`docs/prds/ia-de-npcs.md` §7;
  `docs/arquitetura.md` §3; ADR-002).
- A projeção do estado público pertence a `packages/rules`; o agente apenas recebe o valor já
  projetado pelo orquestrador.
- O roster escolhe `profile.strategy` e fornece `parameters`; `packages/ai` apenas interpreta esses
  dados. F01 não altera arquivos de duelistas nem valida o roster.
- Montagem da partida, transporte da ação, incidente da sessão, UI, rendição e recompensa
  permanecem em outros módulos.

### Contratos externos assumidos

- **`free-duel`/F01:** fornece `DifficultyProfile` com `strategy: string` e mapa somente leitura de
  parâmetros `number | string | boolean`; já materializado em `packages/shared/src/duelist/` e no
  roster de `packages/data`.
- **`motor-duelo-1x1`/F01–F12:** fornece `PublicDuelState` e o vocabulário fechado `DuelAction`; já
  materializado em `packages/shared` e `packages/engine`.
- **F04 deste PRD:** fornecerá `fmBasicPolicy` e a acrescentará ao registro padrão. Até lá,
  `fm-basic` segue o mesmo caminho seguro de estratégia desconhecida.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|---|---|---|
| 1 | F01 cobre o escopo completo, pois não possui divisão Core/Full. | PRD F01; auto-aceite: escopo | confirmada |
| 2 | `AiAgent`, `DuelAction`, `PublicDuelState` e `DifficultyProfile` são reutilizados sem alteração ou schema duplicado. | PRD F01; código existente; `docs/arquitetura.md` §2; ADR-001 | confirmada |
| 3 | A política recebe um objeto com estado e parâmetros e pode ser síncrona ou assíncrona via `Promise`; o agente normaliza a chamada. Isso permite F03/F04 sem mudar `AiAgent`. | auto-aceite: decisão técnica com recomendação clara; guidelines §10.1–§10.3 | a confirmar |
| 4 | O registro é construído uma vez e exposto somente para leitura; não há estado global mutável nem registro em runtime. | auto-aceite: default de boa prática; guidelines §19.4 e §24 | a confirmar |
| 5 | Nome vazio ou duplicado é erro de configuração na construção do registro; lookup vazio/desconhecido durante o duelo é recuperável e cai em `passive`. | auto-aceite: especificação parcial; PRD F01 Error Handling | a confirmar |
| 6 | O logger é uma porta pequena injetada pelo composition root; `packages/ai` não importa o logger do app nem escreve diretamente em `console`. | auto-aceite: decisão técnica; guidelines §8.1 e §23.1–§23.3 | a confirmar |
| 7 | A pausa padrão de 650 ms continua no agente e ocorre uma vez antes de devolver a ação; `sleep` e `delayMs` são injetáveis. | PRD F04/F05; precedente `free-duel` F09 | confirmada |
| 8 | F01 registra apenas `passive`; F04 completa o registro padrão com `fm-basic`. O critério que exige comportamento F04 é teste cross-feature adiado até F04. | grafo/waves do PRD; auto-aceite: dependência futura | a confirmar |
| 9 | Parâmetros são encaminhados intactos à política; desconhecidos são naturalmente ignorados pela política e tipos incorretos usarão defaults em F04. F01 não cria enum ou zod fechado para eles. | PRD F01; contrato existente de `DifficultyProfile` | confirmada |
| 10 | Não há dado externo, persistência, Supabase, cache ou fila offline nesta feature. | PRD F01; `docs/arquitetura.md` §2 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---|---|---|---|
| `packages/ai/package.json` | ai | novo | Manifesto do workspace, dependência de `@yugioh/shared` e scripts de qualidade |
| `packages/ai/tsconfig.json` | ai | novo | Configuração TypeScript estrita alinhada aos demais pacotes |
| `packages/ai/README.md` | ai | novo | Propósito, API pública, fronteiras, runtime e comandos do pacote |
| `packages/ai/src/index.ts` | ai | novo | Superfície pública estável e pequena do pacote |
| `packages/ai/src/strategy/types.ts` | ai | novo | Contratos somente leitura de política, logger e contexto de decisão |
| `packages/ai/src/strategy/create-strategy-registry.ts` | ai | novo | Construção e lookup imutáveis do registro aberto |
| `packages/ai/src/strategy/create-strategy-registry.test.ts` | ai | novo | Registro, duplicidade, string vazia e lookup |
| `packages/ai/src/strategy/passive-policy.ts` | ai | novo | Política segura que devolve `advance_phase` |
| `packages/ai/src/strategy/passive-policy.test.ts` | ai | novo | Ação única e independência de estado/parâmetros |
| `packages/ai/src/agent/create-ai-agent.ts` | ai | novo | Adaptador `AiAgent`, fallback, warn e pausa de apresentação |
| `packages/ai/src/agent/create-ai-agent.test.ts` | ai | novo | Seleção, fallback, logging, pausa e contrato assíncrono |
| `apps/web/package.json` | web | alterado | Declara `@yugioh/ai` como dependência de workspace |
| `apps/web/next.config.mjs` | web | alterado | Inclui `@yugioh/ai` entre os pacotes transpilados pelo Next |
| `apps/web/src/lib/logging.ts` | web | alterado | Expõe adaptador estrutural compatível com a porta de log da IA |
| `apps/web/src/lib/free-duel/duel-runtime.ts` | web | alterado | Compõe o agente de `@yugioh/ai` com logger e espera da aplicação |
| `apps/web/src/lib/free-duel/duel-runtime.test.ts` | web | alterado | Prova a troca do agente sem mudança no contrato da sessão |
| `apps/web/src/lib/free-duel/passive-ai-agent.ts` | web | removido | Andaime migra para o pacote responsável pela IA |
| `apps/web/src/lib/free-duel/passive-ai-agent.test.ts` | web | removido | Cobertura migra para `packages/ai` |
| `apps/web/tests/free-duel-ai-agent.integration.test.ts` | web | novo | Integra composition root, perfil do roster e agente do pacote |

**Verificação da direção de dependências:** `packages/ai` importa apenas
`@yugioh/shared` nesta fase; F03 poderá acrescentar `@yugioh/engine`, sempre na direção
`shared ← data ← rules ← engine ← ai`. `apps/web` consome `ai`, `engine`, `rules`, `data` e
`shared`, como permitido por `docs/arquitetura.md` §2 e ADR-001. Nenhum arquivo de `shared`,
`engine` ou `ai` importa React, DOM, `fetch`, Supabase ou código de `apps/web`; logging e espera
entram em `ai` por portas injetadas.

## 3. Design Técnico

### Estruturas de dados

- `StrategyPolicy`: capacidade nomeada por `strategy`, com `decide(context)` que produz uma
  `DuelAction` ou uma `Promise<DuelAction>`. O contexto somente leitura contém
  `PublicDuelState` e `DifficultyProfile.parameters`; o nome não é enum fechado.
- `StrategyRegistry`: objeto somente leitura com `resolve(strategy)` retornando uma política ou
  `undefined` e `names()` retornando a lista estável dos nomes registrados para diagnóstico/teste.
- `AiLogger`: porta com `warn(event, context)` nesta feature. A forma é deliberadamente menor que
  um logger concreto e não expõe Pino ou `console`.
- `CreateAiAgentOptions`: registro, logger, `sleep` e `delayMs`; todas as dependências com efeitos
  são recebidas na construção.

### Fluxo

1. O composition root cria o registro padrão de F01 com `passive` e instancia um `AiAgent` uma
   vez por runtime, injetando o adaptador de log e a função de espera.
2. O orquestrador chama a assinatura existente `decide(publicState, profile)`; nenhuma nova
   informação privada entra na IA.
3. O agente normaliza `profile.strategy` somente para decidir se a string é vazia; nomes
   não-vazios são comparados exatamente, sem lowercase/trim silencioso que mascare erro no roster.
4. Se houver política registrada, ela recebe o estado e os parâmetros originais. Parâmetros
   desconhecidos não são filtrados por F01.
5. Se a estratégia for vazia ou desconhecida, o agente emite uma vez por chamada o evento
   `ai_strategy_fallback` em `warn`, com `requestedStrategy` (string recebida) e
   `fallbackStrategy: "passive"`, e resolve a política `passive`.
6. O agente aguarda a pausa configurada, padrão 650 ms, e devolve exatamente a única ação
   produzida. A pausa não faz parte da política e os testes usam espera imediata.
7. Quando F04 for implementada, seu composition helper acrescenta `fm-basic` ao mesmo registro;
   nenhum chamador de `AiAgent` muda.

### Regras de negócio

- `strategy` permanece string aberta. Apenas o registro conhece as strings com semântica.
- O nome reservado de fallback é exatamente `passive`; todo registro usado pelo agente deve
  contê-lo.
- Cada nome de estratégia é não vazio e único. A ordem de entrada define a ordem estável de
  `names()`, mas não afeta o lookup.
- Lookup desconhecido nunca lança. Erro ao construir configuração inválida é detectado antes do
  duelo e não é convertido silenciosamente em registro parcial.
- `passive` ignora estado e parâmetros e sempre devolve `advance_phase`; não rende o NPC, encerra
  o duelo ou altera estado.
- `delayMs` deve ser finito e não negativo. Valor inválido falha na construção do agente; zero é
  permitido para testes.
- F01 não valida `PublicDuelState` nem tipos internos dos parâmetros: os tipos corretos chegam por
  contratos materializados, e a defesa contra estado malformado pertence a F05.

### Eventos

F01 não emite nem consome eventos do motor. O único evento observável é de telemetria:
`ai_strategy_fallback`, emitido pela borda do agente e não pela política. O desfecho continua
exclusivamente no motor, conforme ADR-002.

### Determinismo e pureza

As políticas e o registro são funções/objetos sem I/O, relógio, PRNG ou estado global mutável.
F01 não usa `Math.random()` e não modifica `PublicDuelState`, `parameters` nem `atk`/`def` base.
Logging e espera são efeitos explícitos do adaptador `AiAgent` e são injetáveis, mantendo a
decisão testável. A garantia property-based completa de mesma entrada → mesma ação pertence a
F05, mas `passive` já satisfaz a propriedade por construção (`docs/arquitetura.md` §1 e §8;
ADR-008).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

Nenhum tipo ou schema novo é criado em `shared`. F01 consome os contratos existentes:

- `AiAgent`: objeto somente leitura com `decide(PublicDuelState, DifficultyProfile)` assíncrono,
  retornando `DuelAction`.
- `DifficultyProfile`: `strategy: string` e `parameters` somente leitura, indexado por string, com
  valores `number | string | boolean`.
- `DuelAction`: alias da união fechada `Action`; `passive` usa o membro `AdvancePhaseAction`.

Validação zod continua na ingestão do roster e na fronteira de ações existentes. Criar schema
fechado de estratégia em `shared` violaria a decisão data-driven do PRD.

### Funções públicas

```text
createStrategyRegistry(policies: readonly StrategyPolicy[]): StrategyRegistry
```

Cria um snapshot imutável do registro. Rejeita lista sem `passive`, nomes vazios e duplicados;
não oferece `register` mutável depois da construção.

```text
createF01StrategyRegistry(): StrategyRegistry
```

Composition helper desta wave, contendo somente `passive`. F04 substitui seu uso pelo registro
padrão completo, sem mudar `createAiAgent`.

```text
createAiAgent(options: CreateAiAgentOptions): AiAgent
```

Exige registro e logger; aceita `sleep` e `delayMs` opcionais. O resultado satisfaz exatamente o
tipo já consumido pelo Free Duel.

Exemplo de perfil conhecido:

```json
{
  "strategy": "passive",
  "parameters": {}
}
```

Exemplo de perfil reservado para F04, cujos parâmetros passam intactos:

```json
{
  "strategy": "fm-basic",
  "parameters": {
    "aggression": 0.5,
    "playsSpells": true,
    "playsFieldSpells": false,
    "defensiveThreshold": 0
  }
}
```

Exemplo do resultado de `passive`:

```json
{
  "type": "advance_phase"
}
```

Exemplo do contexto de log para estratégia desconhecida:

```json
{
  "event": "ai_strategy_fallback",
  "requestedStrategy": "fm-baisc",
  "fallbackStrategy": "passive",
  "reason": "unknown_strategy"
}
```

Para string vazia, `reason` é `empty_strategy` e `requestedStrategy` preserva o valor recebido. O
log não inclui estado, mão, deck ou parâmetros, evitando dados volumosos/sensíveis.

### Endpoints / RPC / mensagens de rede

Não se aplica. Esta feature é uma biblioteca local e não cria HTTP, RPC, WebSocket ou payload
persistido.

### Contratos externos (cross-PRD)

O contrato consumido pelo `apps/web` continua sendo o `AiAgent` fornecido por `packages/shared`.
O composition root fornece ao agente um logger com `warn(event, context)` que delega ao
chokepoint estruturado de `apps/web/src/lib/logging.ts`. F04 fornecerá uma `StrategyPolicy`
nomeada `fm-basic`; `free-duel`/F01 fornece o perfil sem interpretar a string.

## 5. Modelo de Dados

### Postgres / Supabase

Não se aplica. F01 não persiste configuração nem altera RLS ou migrações.

### Cache local / fila offline

Não se aplica. Registro e agente são recriados pelo composition root; não há IndexedDB,
sincronização ou idempotency key.

### Arquivos de dados versionados

O roster versionado existente continua sendo dono de `profile.strategy` e `parameters`. F01 não
altera seu formato, não introduz tabela externa nem inventa valores de balanceamento.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| `strategy` desconhecida | Lookup retorna `undefined` | `warn` `ai_strategy_fallback`, executa `passive`, não lança | Nenhuma; invisível ao jogador |
| `strategy` vazia ou só com whitespace | Checagem na borda do agente | Preserva o valor no `warn`, usa motivo `empty_strategy` e executa `passive` | Nenhuma |
| `parameters` vazio | Mapa vazio do perfil | Encaminha `{}`; `passive` ignora e F04 aplicará seus defaults | Nenhuma |
| Parâmetro desconhecido | A política não reconhece a chave | Ignorado pela política; F01 não remove nem lança | Nenhuma |
| Parâmetro conhecido com tipo errado | Política futura faz narrowing | Usa o padrão da política, conforme F04; F01 apenas encaminha | Nenhuma |
| Registro sem `passive` | Validação na construção | Falha explícita antes de iniciar o duelo | Falha de configuração, não exibida durante partida |
| Nome de política vazio ou duplicado | Validação na construção | Falha explícita; nenhum registro parcial é devolvido | Nenhuma |
| `delayMs` negativo, infinito ou `NaN` | Validação na construção | Falha explícita antes de iniciar o duelo | Nenhuma |
| Logger da aplicação indisponível | Dependência obrigatória ausente em compile-time/composição | Não se cria agente silencioso; o composition root deve fornecer a porta | Nenhuma |
| Política lança ou estado público está malformado | Fora do tratamento de F01 | F05 capturará e retornará `advance_phase`; até lá, não mascarar erro de desenvolvimento | Tratamento definitivo adiado a F05 |
| `fm-basic` usado antes de F04 | Lookup desconhecido | `warn` e fallback `passive` | NPC passa a fase; partida continua |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `createStrategyRegistry resolve passive by exact name` — retorna a mesma política registrada.
- `createStrategyRegistry returns undefined for an unknown strategy` — lookup não lança.
- `createStrategyRegistry rejects an empty policy name` — configuração inválida falha cedo.
- `createStrategyRegistry rejects duplicate policy names` — não há sobrescrita silenciosa.
- `createStrategyRegistry rejects a registry without passive` — fallback é invariante.
- `passivePolicy always returns advance_phase` — ignora estados e parâmetros representativos.
- `createAiAgent delegates a known strategy exactly once` — encaminha estado e parâmetros por
  referência e devolve uma única ação.
- `createAiAgent unknown strategy warns and delegates to passive` — log estruturado tem valor e
  motivo, sem exceção.
- `createAiAgent blank strategy warns and delegates to passive` — whitespace segue fallback.
- `createAiAgent preserves unknown parameters for the selected policy` — registro não fecha o
  mapa de parâmetros.
- `createAiAgent waits 650ms by default before returning` — spy de `sleep` observa o padrão sem
  espera real.
- `createAiAgent accepts zero delay for tests` — partida automatizada não aguarda apresentação.
- `createAiAgent rejects an invalid delay at construction` — negativos e não finitos falham.

### Property-based (fast-check)

- `passivePolicy any public state and parameters always yields advance_phase` — para valores
  somente leitura gerados dentro do contrato, a saída é invariável e a entrada não é mutada.
- `createStrategyRegistry unique non-empty names preserve exact lookup` — qualquer conjunto de
  nomes válidos e únicos resolve cada política pelo nome exato.

Essas propriedades antecipam apenas os invariantes locais de F01. Os 1.000 casos de mesma entrada
→ mesma escolha do agente completo ficam em F05, alinhados a `docs/arquitetura.md` §8 e ADR-008.

### Integração

- `free-duel composition root uses @yugioh/ai without changing DuelSession` — inicia uma partida,
  executa decisão CPU com perfil `passive` e observa `advance_phase` pelo mesmo laço existente.
- `free-duel unknown roster strategy logs warning and keeps session in progress` — perfil com
  typo não produz `ai_unavailable`.
- `free-duel agent can be replaced without changing session or screen modules` — portão de
  fronteira e diff de tipos confirmam que apenas o composition root conhece `@yugioh/ai`.

### Análise estática

- `packages/ai` não importa `apps/*`, React, DOM, `fetch`, Supabase, filesystem ou WebSocket.
- `packages/shared` não passa a importar `packages/ai`; o contrato permanece no pacote inferior.
- Não há `console.*` em `packages/ai`; logs atravessam a porta injetada.
- A API pública é exportada apenas por `packages/ai/src/index.ts` e usa nomes/arquivos conforme
  guidelines §5 e tipos estritos conforme §6.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---|---|
| O agente satisfaz `AiAgent` sem mudar a assinatura e substitui o passivo sem alterar sessão/tela | Typecheck do assignment para `AiAgent`, teste do composition root e portão de fronteira |
| `fm-basic` usa F04; `passive` passa a vez | Em F01, teste de `passive`; teste cross-feature bloqueado por F04 e obrigatório na integração da wave 4 |
| Estratégia desconhecida resolve em `passive`, registra `warn` e não lança | Unitário com logger spy + integração da sessão |
| `parameters` vazio produz defaults de F04 | F01 prova encaminhamento de `{}`; F04 deve provar cada default reconhecido |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| F01 escolhe F04 somente entre candidatos aprovados por F03 e o Free Duel aceita todos | Adiado até F02–F04; teste de pacote completo obrigatório na wave 4 |
| Free Duel contra Teana e Jono chega ao resultado com CPU invocando e atacando | Adiado até F04/F05; teste end-to-end obrigatório na wave 5 |
| Trocar `profile.strategy` no roster muda comportamento sem código | F01 prova lookup data-driven entre duas policies fake; F04 integra `passive` e `fm-basic` reais |
| Desfecho permanece exclusivamente no motor | Análise estática e integração verificam que nenhuma policy escreve `state.outcome` ou retorna comando de encerramento |
