# Determinismo, Limites e Falha Segura

> PRD: `docs/prds/ia-de-npcs.md` — F05
> Pacote-alvo: `packages/ai` + `apps/web`

## 1. Contexto e Escopo

Esta feature fecha as garantias operacionais do agente de NPCs criado em F01 e alimentado por
F02–F04: a mesma entrada escolhe sempre a mesma ação, empates são resolvidos por ordem estável,
um turno completo cabe no guarda de 100 ações do Free Duel e nenhuma falha interna da IA escapa
de `AiAgent.decide`. O comportamento seguro é sempre `advance_phase`, preservando a partida e a
autoridade do Motor de Duelo 1x1.

F05 não adiciona aleatoriedade nem um segundo contador ao domínio. Ela endurece a fronteira do
agente, torna o desempate de F04 explícito, verifica a terminação contra
`MAX_CPU_ACTIONS_PER_ADVANCE` já publicado em `shared` e mede apenas o cálculo, excluindo a pausa
de apresentação de 650 ms. O desenho segue `docs/arquitetura.md` §§1–3 e §8, ADR-002 e ADR-008.

### Incluído

- Determinismo sem PRNG: mesmo `PublicDuelState` e mesmo `DifficultyProfile` resultam na mesma
  `DuelAction`, independentemente de execuções anteriores.
- Desempate estável da política `fm-basic`: dentro da categoria e da tupla de qualidade de F04,
  menor índice de zona e, persistindo o empate, menor índice de mão; empate completo preserva o
  menor índice da lista legal canônica de F02/F03.
- Validação defensiva de `PublicDuelState` na fronteira com o schema zod existente; entrada
  malformada gera `warn` e `advance_phase`.
- Captura de exceções e rejeições inesperadas de política, filtro de legalidade ou capabilities
  injetadas; gera `error` estruturado e `advance_phase`.
- Logging em melhor esforço: uma falha do logger não muda a ação nem escapa de `decide`.
- Pausa de apresentação aplicada pelo agente, padrão 650 ms, com espera injetável e valor zero
  para testes; a política e o benchmark permanecem sem espera.
- Prova automatizada de que o turno da CPU conclui abaixo de 100 ações e de que partidas com seed
  fixa chegam a um `DuelOutcome`, nunca a `failed`.
- Verificação de decisão em menos de 50 ms num estado de campo cheio, com metodologia estável e
  sem incluir apresentação, setup ou logging.

### Adiado

- Busca em profundidade, avaliação de turnos futuros, aprendizado, blefe e erro proposital por
  dificuldade.
- Fusão, ritual, tributo, mão variável e resposta da IA a janelas de reação, conforme a Seção 7
  do PRD.
- Telemetria persistida, dashboards ou budgets de performance no servidor online.

### Fronteiras

- `MAX_CPU_ACTIONS_PER_ADVANCE = 100`, o laço de CPU, a liquidação de janelas e os estados
  `ai_unavailable`/`no_progress_loop` pertencem ao Free Duel. F05 prova que o agente real não
  aciona esses ramos; não duplica ou remove o guarda.
- Legalidade, progressão de fase, combate e desfecho continuam exclusivos do motor. A IA não
  grava `outcome`, não altera snapshots e não converte ação recusada em sucesso.
- A seed pertence ao `DuelState` privado e ao motor; a IA continua recebendo somente
  `PublicDuelState` e não cria cursor ou fonte aleatória.
- A pausa de 650 ms é experiência de apresentação no adaptador assíncrono, não parte da
  heurística nem do limite de 50 ms.
- F05 não altera UI, roster, regras, catálogo, persistência, economia ou rede.

### Contratos externos assumidos

- **F01:** fornece `createAiAgent`, registro imutável, logger injetado, `sleep`/`delayMs` e
  `passive`.
- **F03:** fornece candidatos cuja legalidade foi verificada no motor e fallback discriminado
  `advance_phase`; falhas inesperadas atravessam até a fronteira de F05.
- **F04:** fornece a pontuação/seleção determinística de `fm-basic` e os metadados de origem
  necessários ao desempate estável.
- **Free Duel/F09:** fornece `advanceCpuDecisions` e o guarda
  `MAX_CPU_ACTIONS_PER_ADVANCE = 100`, reaplicando no motor cada ação escolhida.
- **Motor de Duelo 1x1/F01–F12:** fornece inicialização semeada, transições puras e
  `DuelOutcome`; apenas o motor encerra a partida.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|---|---|---|
| 1 | F05 cobre o escopo completo, pois não possui divisão Core/Full. | PRD F05; auto-aceite: escopo | confirmada |
| 2 | A IA não possui PRNG, seed ou estado mutável entre chamadas; toda ordenação é total e estável. | PRD F05; `docs/arquitetura.md` §1; ADR-002 | confirmada |
| 3 | Dentro da categoria absoluta e da tupla de qualidade definidas por F04, o desempate compara menor índice de zona e depois menor índice de mão; campos ausentes usam sentinela posterior aos índices válidos e empate completo preserva o menor índice da lista legal canônica. | PRD F05; spec F04 decisões 2–3; auto-aceite: especificação parcial | a confirmar |
| 4 | A fronteira valida o estado com `PublicDuelStateSchema.safeParse`; não cria schema concorrente nem tenta reparar estado malformado. | PRD F05 Error Handling; guidelines §§6 e 18.3 | confirmada |
| 5 | Qualquer falha após a entrada em `AiAgent.decide`, inclusive rejeição assíncrona de política, vira `advance_phase`. O logger é chamado em melhor esforço e nunca pode quebrar essa garantia. | PRD F05; auto-aceite: default de falha segura; guidelines §§8 e 23 | a confirmar |
| 6 | Falha do `sleep` também não escapa; registra `error` em melhor esforço e devolve a ação segura `advance_phase`, sem nova tentativa de espera. | auto-aceite: caso de borda omitido | a confirmar |
| 7 | A pausa ocorre uma vez por chamada, depois do cálculo/fallback. O benchmark mede a função pura de seleção ou usa `delayMs: 0`, logger sem efeito e dependências pré-construídas. | PRD F05; precedente F01/free-duel F09 | confirmada |
| 8 | O limite de 100 continua no orquestrador. A IA garante progresso pela ordem de preferência de F04 e por `advance_phase` como piso; nenhum contador paralelo é criado em `packages/ai`. | PRD F05; código existente; auto-aceite: evitar duplicação | confirmada |
| 9 | O teste de performance usa aquecimento, estado representativo com 10 zonas ocupadas e mão de 5, múltiplas amostras e p95 abaixo de 50 ms; setup e asserções ficam fora da janela medida. | PRD F05; auto-aceite: default de mercado; guidelines §§15–17 | a confirmar |
| 10 | O teste de partida completa usa seed fixa, `sleep` imediato, motor real, roster real de Teana/Jono e um agente determinístico para P1; limita o total de passos do teste para detectar regressão sem loop infinito. | PRD F05 e Cross-Feature; auto-aceite: decisão técnica | a confirmar |
| 11 | F05 estende o pipeline materializado por F04 em `strategy/fm-basic/`: categorias continuam absolutas e o índice canônico da lista permanece o desempate final após zona e mão. | spec F04 decisões 2–3 | confirmada |
| 12 | Não há tabela de dado externo, valor de balanceamento, persistência ou decisão aberta de `arquitetura.md` §10 aplicável. | Fase 0.4; `docs/arquitetura.md` §10 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---|---|---|---|
| `packages/ai/src/agent/create-ai-agent.ts` | ai | alterado | Validação defensiva, captura total, fallback e logging em melhor esforço |
| `packages/ai/src/agent/create-ai-agent.test.ts` | ai | alterado | Estado malformado, falhas sync/async, logger/sleep falhos e garantia de não rejeição |
| `packages/ai/src/agent/create-ai-agent.properties.test.ts` | ai | novo | Mesma entrada produz mesma ação e nenhuma entrada/falha faz `decide` rejeitar |
| `packages/ai/src/strategy/fm-basic/types.ts` | ai | alterado | Consolida os metadados imutáveis de zona, mão e índice canônico usados no desempate |
| `packages/ai/src/strategy/fm-basic/select-action.ts` | ai | alterado | Fecha a comparação determinística sem mudar a precedência absoluta entre categorias |
| `packages/ai/src/strategy/fm-basic/fm-basic-policy.test.ts` | ai | alterado | Todos os níveis de desempate, progresso e fallback sem jogada favorável |
| `packages/ai/src/strategy/fm-basic/fm-basic-policy.properties.test.ts` | ai | alterado | Ordem total, estabilidade, repetição e não mutação |
| `packages/ai/src/index.ts` | ai | alterado | Mantém a API pública necessária sem expor helpers internos de teste |
| `packages/ai/tests/decision-performance.integration.test.ts` | ai | novo | Mede p95 do cálculo em campo cheio, sem pausa de apresentação |
| `apps/web/src/lib/free-duel/duel-runtime.ts` | web | alterado | Compõe o agente endurecido sem mudar `AiAgent` ou a sessão |
| `apps/web/src/lib/free-duel/duel-session.test.ts` | web | alterado | Turno real termina antes do guarda e falha da IA não vira rejeição do agente |
| `apps/web/tests/ai-full-match.integration.test.ts` | web | novo | Partida completa com seed fixa, motor e roster reais, CPU ativa e desfecho do motor |
| `scripts/check-ai-boundaries.mjs` | raiz | novo | Proíbe PRNG/I/O/UI e acesso a estado privado dentro de `packages/ai` |
| `package.json` | raiz | alterado | Encadeia o portão de fronteira da IA ao lint |

**Verificação da direção de dependências:** `packages/ai` consome `shared` e `engine`
pelas capabilities estabelecidas em F01–F03; `apps/web` compõe todos os pacotes. A direção
`shared ← data ← rules ← engine ← ai` permanece intacta (`docs/arquitetura.md` §2;
ADR-001). `engine` não importa `ai`, UI ou I/O. `ai` não importa React, DOM, `fetch`, Supabase,
filesystem, WebSocket ou o app; logger e espera continuam portas injetadas.

## 3. Design Técnico

### Estruturas de dados

- **`RankedCandidate`**: candidato legal de F03 mais a tupla de qualidade da categoria de F04 e
  origem somente leitura (`zoneIndex`, `handIndex`, `canonicalIndex`). Índices ausentes não são
  inferidos do estado e ocupam a posição posterior aos índices válidos na comparação.
- **Chave estável da categoria**: tupla conceitual composta pela qualidade específica de F04,
  seguida de `zoneIndex`, `handIndex` e `canonicalIndex`. As categorias não são misturadas por
  score global: a primeira categoria elegível na precedência de F04 continua vencendo.
- **Resultado seguro da fronteira**: sempre um membro válido de `DuelAction`; qualquer erro antes
  de haver ação ou durante a espera produz o singleton imutável `advance_phase`.
- **Contextos de log**: objetos de baixa cardinalidade com evento, estratégia e categoria de
  falha. Não incluem snapshot, mãos, decks, parâmetros completos ou stack de erro no browser.

### Fluxo

1. `AiAgent.decide` entra num invólucro que garante um único retorno seguro e nenhuma rejeição.
2. A fronteira executa `PublicDuelStateSchema.safeParse(state)`. Falha emite em melhor esforço
   `ai_invalid_public_state` em `warn`, escolhe `advance_phase` e não invoca registro/política.
3. Para estado válido, F01 resolve a estratégia e F02/F03 produzem candidatos legais. F04 atribui
   pontuação e metadados de origem sem mutar entrada ou estado resultante.
4. O seletor de F04 escolhe a primeira categoria elegível e compara sua tupla de qualidade;
   persistindo empate, usa menor índice de zona, menor índice de mão e menor índice canônico
   da lista. Ele não usa sort instável, locale, tempo, iteração de objeto ou `Math.random()`.
5. Sem candidato selecionável, a política devolve `advance_phase` sem log: é fluxo normal.
6. Exceção síncrona ou rejeição assíncrona de lookup, geração, avaliação ou política é
   capturada na fronteira. O agente emite em melhor esforço `ai_policy_failed` em `error`, com
   `strategy` e uma categoria segura, e substitui a escolha por `advance_phase`.
7. O agente executa uma vez a espera configurada depois da escolha. Se ela falhar, registra em
   melhor esforço `ai_presentation_delay_failed` e devolve `advance_phase`.
8. O orquestrador reaplica a ação no motor real. A ordem de preferência de F04 consome jogadas
   finitas; quando nenhuma resta, `advance_phase` progride a máquina. O laço retorna a P1 ou
   encontra `outcome` antes de 100 ações.
9. Testes de partida repetem exatamente decks, perfil e seed. A sequência de ações da CPU e o
   estado/desfecho finais devem ser profundamente iguais.

### Regras de negócio

- A política nunca sorteia, consulta relógio ou conserva histórico oculto. Dificuldade vem do
  deck/perfil, não de erro probabilístico.
- Valores numéricos nas tuplas de qualidade devem ser finitos. Resultado `NaN` ou infinito é
  falha interna capturada pelo agente, não candidato silenciosamente privilegiado.
- Para índices válidos, zona e mão ficam em `0–4`; ausência usa sentinela fixa `5`. Metadado fora
  desses limites é falha interna.
- `canonicalIndex` vem da ordem estável de F02/F03 e é o último desempate dentro de uma
  categoria; nunca muda a precedência absoluta entre invocação, magia/equipamento, mudança de
  posição, ataque e avanço.
- `advance_phase` é o piso em qualquer estado e o único fallback. A IA nunca candidata ou devolve
  `surrender` por política.
- O teto de 100 não é margem para loop: a sequência esperada é no máximo 1 invocação, 5
  mudanças, 5 ataques, 5 magias e avanços de fase, bem abaixo do guarda.
- A garantia de não lançar vale para entradas runtime malformadas e dependências injetadas que
  falhem durante a chamada. Erro de configuração na construção do registro/agente continua
  falhando cedo, antes de existir `AiAgent`.
- O fallback não promete que um `advance_phase` recusado pelo motor seja aceito; esse caso é
  incidente de integração do orquestrador e permanece observável.

### Eventos

F05 não emite eventos do motor. Ela emite apenas logs estruturados de borda:

- `ai_invalid_public_state` (`warn`), com `strategy` quando disponível e quantidade de issues,
  sem serializar os valores inválidos;
- `ai_policy_failed` (`error`), com `strategy` e categoria `synchronous_exception`,
  `asynchronous_rejection`, `invalid_score` ou `candidate_evaluator_unavailable`;
- `ai_presentation_delay_failed` (`error`), sem repetir a espera.

Falha do logger é engolida exclusivamente pelo helper de melhor esforço. Não há log para
ausência normal de jogada favorável ou candidato recusado pelo motor.

### Determinismo e pureza

Seleção, pontuação, geração e filtragem são puras sobre objetos somente leitura. Nenhum
arquivo de `packages/ai` usa `Math.random()`, PRNG, `Date.now()`, `performance.now()` em produção,
I/O ou estado module-global mutável. O estado permanece JSON serializável; a IA não recebe seed,
não muta o snapshot e nunca sobrescreve `atk`/`def` base. Mesma entrada gera a mesma chave total,
mesma ação e, quando reaplicada ao motor semeado, a mesma sequência e desfecho
(`docs/arquitetura.md` §§1, 3.1 e 8; ADR-002; ADR-008).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

F05 reutiliza `AiAgent`, `DuelAction`, `PublicDuelState`, `DifficultyProfile`,
`PublicDuelStateSchema` e `MAX_CPU_ACTIONS_PER_ADVANCE`; nenhum contrato cross-package muda.
Os candidatos ranqueados e metadados de desempate são internos a `packages/ai`, pois nenhum app ou
pacote inferior precisa conhecê-los.

### Funções públicas

```text
AiAgent.decide(state: PublicDuelState, profile: DifficultyProfile): Promise<DuelAction>
```

A assinatura permanece idêntica. Pós-condição reforçada: uma vez criado corretamente, o agente
sempre resolve com uma `DuelAction` e nunca rejeita; falhas runtime resolvem `advance_phase`.

```text
selectFmBasicAction(input: FmBasicSelectionInput): DuelAction
```

Contrato interno determinístico de F04 reforçado por F05: respeita a precedência absoluta e as
tuplas de qualidade existentes, aplicando zona, mão e índice canônico como desempates finais.
Lista vazia devolve `advance_phase`; entradas não são mutadas nem reordenadas.

Exemplo de dois candidatos empatados em score:

```json
[
  {
    "action": { "type": "declare_attack", "attackerZoneIndex": 3 },
    "quality": [400],
    "origin": { "zoneIndex": 3, "handIndex": null, "canonicalIndex": 7 }
  },
  {
    "action": { "type": "declare_attack", "attackerZoneIndex": 1 },
    "quality": [400],
    "origin": { "zoneIndex": 1, "handIndex": null, "canonicalIndex": 4 }
  }
]
```

Resultado estável:

```json
{ "type": "declare_attack", "attackerZoneIndex": 1 }
```

Fallback de qualquer falha runtime:

```json
{ "type": "advance_phase" }
```

Exemplo de log seguro de política:

```json
{
  "event": "ai_policy_failed",
  "strategy": "fm-basic",
  "category": "asynchronous_rejection",
  "fallbackAction": "advance_phase"
}
```

### Endpoints / RPC / mensagens de rede

Não se aplica. F05 não cria endpoint, RPC, persistência ou mensagem de rede.

### Contratos externos (cross-PRD)

- `apps/web` continua consumindo somente `AiAgent` e fornece logger/sleep no composition root.
- `advanceCpuDecisions` continua impondo `MAX_CPU_ACTIONS_PER_ADVANCE`; o agente não recebe nem
  controla esse contador.
- O motor continua sendo a única fonte de legalidade e `DuelOutcome`. O teste de partida usa suas
  APIs reais sem redefini-las.

## 5. Modelo de Dados

### Postgres / Supabase

Não se aplica. Não há tabela, migração, índice, constraint ou RLS.

### Cache local / fila offline

Não se aplica. Não existe histórico de decisão, cache, IndexedDB ou fila. Cada chamada depende
somente dos argumentos e das capabilities imutáveis compostas no agente.

### Arquivos de dados versionados

Nenhum formato muda. Decks/perfis do roster e catálogo versionado são fixtures de integração;
F05 não inventa ou corrige valores de balanceamento.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Estado público malformado | `PublicDuelStateSchema.safeParse` falha | `warn` em melhor esforço e `advance_phase`; política não roda | Nenhuma; duelo continua |
| Nenhum candidato legal/além de avançar | Resultado de F03/F04 vazio | `advance_phase`, sem log | Nenhuma |
| Política lança sincronicamente | `try/catch` da fronteira | `error` em melhor esforço e `advance_phase` | Nenhuma; não vira `ai_unavailable` |
| Política rejeita Promise | `await` dentro da fronteira | Mesmo fallback seguro | Nenhuma |
| Capability de legalidade indisponível/expirada | Resultado discriminado de F03 ou exceção | `error` e `advance_phase`; não escolhe candidato não verificado | Nenhuma |
| Qualidade `NaN`/infinita ou metadado fora do limite | Validação antes da comparação | Trata como falha da política, loga e passa fase | Nenhuma |
| Empate completo | Chaves iguais até `canonicalIndex` | Preserva a primeira ocorrência na lista canônica de F02/F04 | Nenhuma |
| Logger lança | Helper de log em melhor esforço | Engole somente a falha de observabilidade e mantém fallback | Nenhuma |
| `sleep` rejeita | `await` protegido | `error` em melhor esforço e `advance_phase`, sem retry | Nenhuma |
| Turno alcançaria 100 ações | Guarda existente no orquestrador | Teste falha antes da entrega; em runtime o ramo `no_progress_loop` permanece como última defesa | Mensagem existente do Free Duel |
| `advance_phase` fallback é recusado | Motor rejeita na reaplicação real | Orquestrador registra incidente; IA não mascara divergência | Mensagem existente de falha da IA |
| Partida longa por deck-out | Motor controla compra e desfecho | Teste possui limite externo de passos, mas não inventa vencedor | Tela de resultado existente |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `selectFmBasicAction preserves absolute category precedence` — score de ataque não supera uma invocação elegível.
- `selectFmBasicAction breaks quality ties by lower zone index` — primeiro desempate do PRD.
- `selectFmBasicAction breaks remaining ties by lower hand index` — segundo desempate do PRD.
- `selectFmBasicAction uses canonical index only after zone and hand ties` — ordem total.
- `selectFmBasicAction keeps the first canonical candidate on a complete tie` — estabilidade.
- `selectFmBasicAction empty input returns advance_phase` — fallback normal sem log.
- `selectFmBasicAction rejects non-finite quality and invalid origins` — falha não ordena
  silenciosamente.
- `createAiAgent malformed public state warns and resolves advance_phase` — usa entrada `unknown`
  por cast de fronteira e verifica zero chamada à política.
- `createAiAgent synchronous policy failure errors and resolves advance_phase` — nunca rejeita.
- `createAiAgent asynchronous policy failure errors and resolves advance_phase` — cobre Promise.
- `createAiAgent logger failure does not escape decide` — observabilidade é melhor esforço.
- `createAiAgent sleep failure resolves advance_phase without retry` — apresentação não derruba
  a partida.
- `fmBasicPolicy no favorable move advances phase` — termina o ciclo em vez de repetir ação.

### Property-based (fast-check)

- `same public state and profile always choose the same action` — ao menos 1.000 execuções por
  conjunto gerado, sem `Math.random()` ou estado residual, conforme ADR-008.
- `selectFmBasicAction result is invariant under repeated evaluation` — mesma lista resulta na
  mesma ação e não é mutada.
- `selectFmBasicAction obeys category-local lexicographic total order` — compara pares válidos sem cruzar categorias.
- `createAiAgent any malformed unknown input resolves a valid DuelAction` — fuzz de objetos
  truncados, tipos errados e campos extras; a Promise nunca rejeita.
- `decision does not mutate state profile or legal candidates` — snapshots antes/depois são
  idênticos.

### Integração

- `cpu full field turn returns control before MAX_CPU_ACTIONS_PER_ADVANCE` — motor real, 10 zonas
  ocupadas, mão de 5 e contador de `onStep` estritamente menor que 100.
- `ai decision p95 stays below 50ms without presentation delay` — aquece a função, mede amostras
  independentes em estado cheio e exclui setup/log/delay.
- `fixed seed full match is reproducible` — duas execuções com mesmos decks/perfis/seed produzem
  mesma sequência da CPU e mesmo estado final.
- `fixed seed roster duel ends with engine outcome and never failed` — Teana e Jono, agentes reais,
  `sleep` imediato e motor real; CPU invoca e ataca antes do desfecho.
- `policy failure keeps free duel session in progress` — falha injetada retorna
  `advance_phase`, sem `ai_unavailable`.

### Análise estática

- Nenhum arquivo de produção em `packages/ai` contém `Math.random`, fonte de PRNG, relógio,
  timer direto, filesystem, rede, UI ou persistência.
- `packages/ai` não acessa `DuelState.seed`, decks privados, `outcome` ou campos ausentes de
  `PublicDuelState`.
- `engine` permanece sem imports de `ai`, apps ou I/O; nenhum modificador da IA escreve
  `card.atk`/`card.def`.
- `MAX_CPU_ACTIONS_PER_ADVANCE` continua definido uma vez em `shared` e consumido pelo
  orquestrador, sem constante paralela em `ai`.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---|---|
| Mesma dupla estado público/perfil devolve mesma ação repetidamente | Property `same public state and profile always choose the same action` com 1.000 execuções |
| Turno completo de CPU em campo cheio conclui em menos de 100 ações | `cpu full field turn returns control before MAX_CPU_ACTIONS_PER_ADVANCE` |
| Decisão nunca lança, inclusive com estado malformado | Fuzz property + testes sync/async/logger/sleep |
| Duelo completo com seed fixa termina pelo motor, nunca em `failed` | `fixed seed roster duel ends with engine outcome and never failed` |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| F01 usa F04 somente sobre candidatos aprovados por F03 e o Free Duel aceita 100% | Partida instrumentada registra cada candidato legal e afirma zero recusa na reaplicação |
| Teana e Jono chegam à tela de resultado com CPU invocando e atacando | `ai-full-match.integration.test.ts` registra eventos `onSummon`/`onAttackDeclared` antes do outcome |
| Trocar `profile.strategy` muda comportamento sem código | Mesma partida/seed com `passive` e `fm-basic` produz sequências distintas e determinísticas |
| Desfecho continua exclusivamente no motor | Teste afirma `state.outcome` produzido por `engine.apply`; API de `ai` não expõe função de encerramento |
