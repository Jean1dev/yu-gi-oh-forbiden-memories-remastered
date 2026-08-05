# Legalidade Verificada pelo Motor

> PRD: `docs/prds/ia-de-npcs.md` — F03
> Pacote-alvo: `packages/ai` + `packages/shared` + `apps/web`

## 1. Contexto e Escopo

Esta feature transforma a lista de ações plausíveis produzida por F02 em candidatos comprovadamente aceitos pelo Motor de Duelo 1x1. O filtro executa cada ação contra o mesmo `apply` usado pelo duelo, preserva o snapshot da partida e entrega à futura política F04 somente a ação e a projeção pública do estado resultante. Assim, a IA continua consumidora do motor, sem reproduzir regras em `packages/ai`, conforme `docs/arquitetura.md` §1–3, ADR-001 e ADR-002.

A implementação pertence à Fase 3 do roadmap (`docs/arquitetura.md` §9). Como `AiAgent.decide` recebe `PublicDuelState`, mas `engine.apply` exige o `DuelState` privado, a integração usa uma capability injetada e pertencente ao orquestrador. Ela associa por identidade a projeção entregue ao agente ao snapshot privado que a originou, aplica o candidato nesse snapshot e retorna apenas uma nova projeção pública. O contrato público de dois argumentos de `AiAgent.decide(state, profile)` permanece inalterado e nenhum dado oculto cruza a fronteira da IA.

### Incluído

- Filtrar todos os candidatos de F02 por aplicação especulativa no `engine.apply` real.
- Representar cada aceitação como ação original mais `PublicDuelState` resultante pela ótica de `P2`.
- Tratar `Result.ok === false` como recusa normal: descartar o candidato sem emitir log de erro.
- Preservar o estado privado e a projeção pública de entrada, sem mutação entre tentativas.
- Manter a ordem original dos candidatos aceitos.
- Retornar `advance_phase` como fallback quando nenhum candidato for aceito, sem alegar que o fallback foi validado.
- Criar a ponte de autoridade que permite ao agente consultar o motor sem receber cartas ocultas, deck privado, seed ou `DuelState`.

### Fronteiras

- A enumeração de candidatos pertence a F02; esta feature não cria nem completa candidatos.
- Pontuação e escolha da melhor jogada pertencem a F04; esta feature preserva ordem e não ranqueia.
- Determinismo global, limite de ações e captura de exceções inesperadas pertencem a F05.
- Legalidade, transição, combate e fim do duelo permanecem exclusivamente no Motor de Duelo 1x1, conforme a Seção 7 do PRD e ADR-002.
- A IA não trata janelas de reação nem candidata `resolve_attack` ou `surrender`; essas fronteiras continuam com motor e orquestrador.
- Não há persistência, UI, rede, Supabase, valores de balanceamento ou tabelas externas nesta feature.

### Contratos externos assumidos

- **F02 — Leitura do Estado e Geração de Candidatos:** fornece uma lista imutável e ordenada de `DuelAction` derivada exclusivamente da projeção pública.
- **F01 — Contrato do Agente e Registro de Estratégias:** fornece a composição do agente e sua injeção de dependências sem alterar `AiAgent.decide(state, profile)`.
- **Motor de Duelo 1x1/F01–F12:** `@yugioh/engine.apply(DuelState, DuelAction)` retorna `Result<ApplyResult, DomainError>` e não muta a entrada.
- **Free Duel/F09:** o orquestrador detém o `DuelState`, produz `getPublicDuelState(state, "P2")`, chama o agente e aplica a ação escolhida na partida real.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O escopo completo de F03 é incluído; a feature não possui divisão Core/Full. | PRD F03; auto-aceite: especificação parcial/escopo completo quando não há divisão | confirmada |
| 2 | `packages/ai` nunca reconstrói `DuelState` a partir de `PublicDuelState` nem passa a projeção diretamente a `apply`. | código existente; `docs/arquitetura.md` §2; ADR-002 | confirmada |
| 3 | Uma capability injetada avalia `(publicState, action)` contra o snapshot privado associado e retorna apenas resultado público; a associação é por identidade do objeto e vale por uma chamada de decisão. | auto-aceite: decisão técnica com recomendação clara; guidelines §10 e 12.2 | a confirmar |
| 4 | A ponte de autoridade vive em `apps/web`, onde o orquestrador já possui estado privado, `apply` e `getPublicDuelState`; `shared` declara somente o contrato e `ai` somente o consome. | `docs/arquitetura.md` §2; ADR-001 | confirmada |
| 5 | O resultado legal exposto à IA contém apenas `action` e `resultingState: PublicDuelState`; eventos privados, `DuelState`, erros e detalhes do motor não atravessam a fronteira. | PRD F03 Provides; auto-aceite: default de boa prática de menor privilégio; guidelines §18 | a confirmar |
| 6 | Cada candidato é avaliado isoladamente sobre o mesmo snapshot privado original, na ordem recebida; resultados de uma tentativa não alimentam a seguinte. | PRD F03 Capabilities; ADR-002 | confirmada |
| 7 | Recusas `Result.ok === false` são esperadas e descartadas sem log; exceções da capability não são convertidas silenciosamente nesta camada e ficam para a falha segura de F05. | PRD F03; guidelines §7–8 | confirmada |
| 8 | Se nenhum candidato for aceito, o retorno discriminado informa fallback `advance_phase`; o orquestrador continua sendo a autoridade final e pode registrar incidente caso também o recuse. | PRD F03 Capabilities | confirmada |
| 9 | F01 e F02 são pré-requisitos assumidos porque o lote F01–F05 foi previamente aprovado pelo orquestrador. | auto-aceite: dependência interna resolvida pelo orquestrador | confirmada |
| 10 | Não se cria schema zod para a capability, pois ela é uma fronteira interna de função e usa tipos já validados; entradas externas continuam validadas nas fronteiras existentes. | guidelines §3.2, 6 e 10 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/ai/legal-candidate.ts` | shared | novo | Tipos imutáveis `LegalCandidate`, `LegalCandidateFilterResult` e contrato `EvaluateAiCandidate` |
| `packages/shared/src/ai/index.ts` | shared | novo | Exporta a superfície pública de contratos da IA |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os contratos de legalidade |
| `packages/ai/src/legal-candidates/filter-legal-candidates.ts` | ai | novo | Filtra candidatos por resultados da capability, preservando ordem e fallback |
| `packages/ai/src/legal-candidates/filter-legal-candidates.test.ts` | ai | novo | Testes unitários de aceitação, recusa, ordem, imutabilidade e fallback |
| `packages/ai/src/legal-candidates/filter-legal-candidates.properties.test.ts` | ai | novo | Propriedades de não mutação, subsequência e estabilidade |
| `packages/ai/src/legal-candidates/index.ts` | ai | novo | Exporta o filtro pelo submódulo |
| `packages/ai/src/index.ts` | ai | alterado | Expõe o filtro na API de `@yugioh/ai` |
| `packages/ai/package.json` | ai | alterado | Declara a dependência de workspace em `shared`, se ainda não estiver estabelecida por F01 |
| `apps/web/src/lib/free-duel/ai-candidate-evaluator.ts` | web | novo | Associa projeção pública a snapshot privado e adapta `engine.apply` para `EvaluateAiCandidate` |
| `apps/web/src/lib/free-duel/ai-candidate-evaluator.test.ts` | web | novo | Prova uso do snapshot correto, projeção segura, recusa por valor e expiração do contexto |
| `apps/web/src/lib/free-duel/duel-session.ts` | web | alterado | Abre e encerra o contexto de avaliação em torno de cada `AiAgent.decide`, sem mudar sua assinatura |
| `apps/web/tests/ai-legality.integration.test.ts` | web | novo | Integra candidatos, motor real e orquestrador, cobrindo aceitação de 100% das ações escolhidas |

**Verificação da direção de dependências:** `shared` declara apenas tipos; `ai` importa `shared`; `web` compõe `ai`, `engine` e `rules` e é o único ponto desta feature que chama o motor. Isso respeita `shared ← data ← rules ← engine ← ai`, com `web` como consumidor superior (`docs/arquitetura.md` §2; ADR-001). Nenhum arquivo de `engine` passa a importar `ai`, React, DOM, `fetch` ou Supabase.

## 3. Design Técnico

### Estruturas de dados

- **`LegalCandidate`**: registro imutável com `action: DuelAction` e `resultingState: PublicDuelState`. A projeção resultante é sempre calculada para `P2` pelo adaptador autorizado.
- **`CandidateEvaluation`**: união discriminada interna da capability: aceitação com `resultingState`, recusa esperada sem `DomainError` exposto, ou falha de contexto com código estável.
- **`LegalCandidateFilterResult`**: união entre `{ kind: "legal_candidates"; candidates }` e `{ kind: "fallback"; action: { type: "advance_phase" } }`. O fallback não é misturado à lista como se tivesse sido aceito.
- **Contexto de avaliação**: associação efêmera entre a referência exata de `PublicDuelState` entregue ao agente e o `DuelState` privado corrente. Ela não é exportada por `packages/ai`, não é serializada e é invalidada ao terminar `decide`.

### Fluxo

1. O orquestrador conserva o `DuelState` privado e produz `publicState = getPublicDuelState(state, "P2")`.
2. Antes de chamar o agente, registra temporariamente o par por identidade `publicState → state` no adaptador de autoridade.
3. F01 chama F02 com `publicState` e recebe a lista imutável e ordenada de candidatos.
4. F03 percorre a lista uma vez e chama `evaluate(publicState, action)` para cada item.
5. O adaptador aceita somente a mesma instância de `publicState` registrada e o contexto ainda ativo; então executa `engine.apply(privateState, action)`.
6. Se `apply` retorna recusa, o adaptador devolve `rejected`; o filtro ignora o candidato sem log e continua.
7. Se `apply` aceita, o adaptador não promove o novo estado à partida real. Ele projeta `getPublicDuelState(result.value.state, "P2")` e devolve somente essa projeção; eventos e estado privado são descartados na borda.
8. O filtro inclui `{ action, resultingState }`, preservando a posição relativa do candidato.
9. Depois de todos os candidatos, retorna os legais; se a lista estiver vazia, retorna o fallback explícito `advance_phase`.
10. Ao resolver ou rejeitar `AiAgent.decide`, o orquestrador encerra o contexto em `finally`; nenhuma avaliação atrasada pode reutilizar o snapshot.
11. F04 pontua somente `LegalCandidate`; a ação escolhida volta ao orquestrador, que a reaplica uma única vez ao estado real e continua a liquidação de janelas existente.

### Regras de negócio

- O filtro não inspeciona fase, ocupação de zona, flags de ataque/posição, primeiro turno, tipo de carta, efeito ou host de equipamento para decidir legalidade.
- Um candidato é legal se e somente se a capability, apoiada no `engine.apply` real, retorna aceitação.
- Toda tentativa parte do mesmo snapshot original. O processamento de candidato A não altera a entrada usada por B.
- Ordem e duplicatas de candidatos aceitos são preservadas; deduplicação mudaria o desempate estável de F05.
- A recusa é um resultado esperado e não gera `warn` nem `error`.
- O filtro não captura falhas inesperadas de programação. F05 captura na fronteira do agente e devolve `advance_phase`.
- A capability nunca entrega ao pacote `ai` a mão adversária, ordem dos decks, cartas ocultas, `seed`, `DomainError.details` ou eventos privados.
- A aplicação especulativa pode produzir janela de reação; o `resultingState` é a projeção pública imediatamente após a ação, sem liquidar janelas. A liquidação real continua no orquestrador.

### Eventos

F03 não emite nem resolve eventos. `engine.apply` pode produzir eventos durante a simulação, mas o adaptador não os expõe e nenhum efeito especulativo é persistido. Quando o orquestrador reaplica a ação escolhida, somente essa aplicação real fornece eventos ao fluxo existente.

### Determinismo e pureza

O filtro em `packages/ai` é puro em relação à entrada observável: não faz I/O, não usa PRNG nem `Math.random()`, não muta candidatos e preserva a ordem. O adaptador chama o motor puro sobre um snapshot imutável; o `DuelState` continua JSON serializável, seed/cursor não são alterados na partida real e `atk`/`def` base nunca são sobrescritos (`docs/arquitetura.md` §1 e 3.1; ADR-002). A associação efêmera é uma capability de composição, não estado de domínio.

## 4. Contratos

### Tipos (`packages/shared`)

- `LegalCandidate`: `Readonly<{ action: DuelAction; resultingState: PublicDuelState }>`.
- `CandidateEvaluation`: união `accepted` com `resultingState`, `rejected`, ou `unavailable` com código `unknown_public_state | expired_decision_context`.
- `EvaluateAiCandidate`: função que recebe `PublicDuelState` e `DuelAction` e devolve `CandidateEvaluation` sincronicamente.
- `LegalCandidateFilterResult`: união discriminada descrita na Seção 3.

Não há schema zod novo: são contratos internos de função compostos por tipos já existentes. A fronteira externa de estado público continua coberta por `PublicDuelStateSchema`.

### Funções públicas

```text
filterLegalCandidates(input: {
  state: PublicDuelState;
  candidates: readonly DuelAction[];
  evaluate: EvaluateAiCandidate;
}): LegalCandidateFilterResult
```

Pré-condições: `state` é a mesma projeção entregue a `AiAgent.decide`; candidatos vieram de F02. Pós-condições: cada item de `legal_candidates` foi aceito pelo motor no snapshot associado, entradas permanecem inalteradas e a ordem é preservada.

```text
createAiCandidateEvaluator(dependencies: {
  apply: ApplyAction;
  getPublicDuelState: GetPublicDuelState;
}): {
  open(publicState: PublicDuelState, privateState: DuelState): DecisionContext;
  evaluate: EvaluateAiCandidate;
}
```

`DecisionContext` expõe apenas encerramento idempotente. `evaluate` nunca retorna `privateState`, eventos nem `DomainError`.

`AiAgent.decide(state: PublicDuelState, profile: DifficultyProfile): Promise<DuelAction>` permanece sem alteração.

### Exemplos de payload em memória

Candidato aceito:

```json
{
  "kind": "accepted",
  "resultingState": {
    "players": {
      "P1": { "lp": 8000, "hand": { "visible": false, "count": 5 }, "remainingDeck": 35 },
      "P2": { "lp": 8000, "hand": { "visible": true, "cards": [] }, "remainingDeck": 35 }
    },
    "activeField": null,
    "activePlayer": "P2",
    "turn": 2,
    "phase": "main"
  }
}
```

O exemplo abrevia os campos `field` somente para legibilidade documental; em runtime eles continuam obrigatórios pelo `PublicDuelStateSchema`.

Recusa normal:

```json
{ "kind": "rejected" }
```

Fallback quando nenhuma tentativa foi aceita:

```json
{ "kind": "fallback", "action": { "type": "advance_phase" } }
```

### Contratos externos (cross-PRD)

- **A ser fornecido por F02:** `generateCandidates(publicState): readonly DuelAction[]`.
- **Fornecido por Motor de Duelo 1x1:** `apply` e `getPublicDuelState` nos formatos existentes. Nenhum deles é redefinido por F03.
- **Integrado por Free Duel/F09:** abertura/fechamento do contexto autorizado ao redor de `AiAgent.decide` e reaplicação real da ação escolhida.

## 5. Modelo de Dados

F03 não cria tabela Postgres, migração, RLS, cache IndexedDB, fila offline nem arquivo de dados versionado. Os únicos dados adicionais são objetos imutáveis em memória e um contexto efêmero, não serializável e limitado a uma chamada de decisão. Nenhum dado sensível deve ser persistido ou logado.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Motor recusa candidato | `CandidateEvaluation.kind === "rejected"` | Descarta silenciosamente e continua | Nenhuma |
| Cinco zonas de monstro ocupadas | `apply` recusa cada `summon_monster` | Nenhuma invocação sobrevive; nenhuma regra de zona é duplicada | Nenhuma |
| Todos os candidatos recusados | Lista final vazia | Retorna fallback discriminado `advance_phase`, sujeito à autoridade final do orquestrador | Nenhuma; eventual incidente é do Free Duel |
| Projeção desconhecida | Não existe associação por identidade | Retorna `unavailable: unknown_public_state`; F05 converte a falha da decisão em fallback seguro | Nenhuma nesta feature |
| Contexto expirado/reutilizado | Contexto foi encerrado | Retorna `unavailable: expired_decision_context`; não usa snapshot antigo | Nenhuma nesta feature |
| Candidato duplicado | Mesma ação aparece mais de uma vez | Avalia e preserva cada ocorrência aceita na ordem | Nenhuma |
| `apply` produz janela de reação | Estado aceito possui `pending` | Retorna sua projeção sem resolver; orquestrador resolve apenas após a aplicação real | Nenhuma |
| Candidato tenta `surrender` ou `resolve_attack` apesar da fronteira de F02 | A capability recebe a ação | O motor continua autoridade; F03 não cria exceção de legalidade, mas teste de integração acusa violação do contrato F02 | Nenhuma |
| Exceção inesperada do adaptador/motor | Exceção atravessa `evaluate` | Não é mascarada como recusa; F05 a captura na fronteira do agente | Nenhuma nesta feature |
| Tentativa de ler dados privados | Tipo de retorno não possui `DuelState`, eventos ou erro | Falha em typecheck/revisão; projeção oculta permanece opaca | Nenhuma |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `filterLegalCandidates mantem somente candidatos aceitos pela capability` — mistura aceitações e recusas.
- `filterLegalCandidates preserva ordem e duplicatas dos candidatos aceitos` — protege o desempate futuro.
- `filterLegalCandidates nao registra erro para uma recusa normal` — usa spy de logger na borda e comprova zero chamadas.
- `filterLegalCandidates retorna fallback advance_phase quando todos sao recusados` — distingue fallback de candidato validado.
- `filterLegalCandidates nao altera candidatos nem estados de entrada` — usa fixtures congeladas.
- `createAiCandidateEvaluator rejeita projecao nao registrada` — impede uso fora do contexto.
- `createAiCandidateEvaluator rejeita contexto encerrado` — impede snapshot obsoleto.
- `createAiCandidateEvaluator projeta resultado para P2 sem expor cartas ocultas de P1` — inspeciona forma exata do retorno.
- `createAiCandidateEvaluator nao promove o estado especulativo ao duelo real` — compara snapshot antes/depois.

### Property-based (fast-check)

- `filterLegalCandidates sempre produz uma subsequencia estavel da entrada` — para listas arbitrárias e padrões arbitrários de aceitação.
- `filterLegalCandidates nunca muta entrada` — serializa candidatos e estado antes/depois.
- `mesma projecao contexto e candidatos produzem os mesmos candidatos legais` — repete a avaliação com snapshots equivalentes e motor determinístico, conforme ADR-008.

### Integração

- `ai legality motor real descarta acao em fase errada` — usa `engine.apply`, não stub de regra.
- `ai legality cinco zonas ocupadas elimina toda invocacao` — satisfaz o critério explícito do PRD.
- `ai legality candidato aceito pode ser reaplicado pelo orquestrador` — o mesmo snapshot privado aceita a ação escolhida.
- `ai legality avaliacao especulativa preserva estado privado original` — igualdade profunda e referências congeladas.
- `ai legality cartas ocultas permanecem ausentes do retorno` — cobre a fronteira `PublicDuelState`/`DuelState`.

### Análise estática

- `packages/ai` pode importar `shared` e `engine`, mas não `apps`, React, DOM, `fetch` ou Supabase.
- `packages/engine` não importa `ai`, `web` nem I/O.
- Nenhum arquivo de produção em `packages/ai` acessa campos exclusivos de `DuelState` (`deck`, `seed`, `handPlayUsed`, `outcome`).
- Revisão assegura ausência de predicados paralelos de fase, zona, ataque, equipamento ou primeiro turno no filtro.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| Candidato recusado não é escolhido e não gera log de erro | `filterLegalCandidates mantem somente candidatos aceitos pela capability` + spy com zero logs |
| Com as cinco zonas ocupadas, nenhuma invocação sobrevive | `ai legality cinco zonas ocupadas elimina toda invocacao` |
| Aplicação de teste não altera o estado da partida | `ai legality avaliacao especulativa preserva estado privado original` |
| Nenhuma legalidade do motor é duplicada em `packages/ai` | gate de dependências + checklist de revisão e busca por predicados proibidos |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|----------|-------|
| F01 usa F04 somente sobre candidatos aprovados por F03, e o Free Duel aceita 100% das escolhas | `ai-legality.integration.test.ts` percorre decisões da CPU e afirma zero `Result.err` na reaplicação real |
| Free Duel contra Teana e Jono chega ao resultado com CPU ativa (critério que cita F03) | teste end-to-end do lote F01–F05; F03 fornece a asserção de zero recusas, sem assumir a política ainda inexistente |
| Trocar `profile.strategy` muda comportamento sem mudar código | teste de contrato F01/F04; F03 verifica que ambas as estratégias continuam sujeitas ao mesmo filtro |
| O desfecho continua exclusivo do motor | teste de integração confirma que F03 nunca produz `outcome` fora do resultado especulativo do motor e nunca o promove |
