# Resultado do Duelo e Nota

> PRD: `docs/prds/free-duel.md` — F05
> Pacote-alvo: `packages/shared` + `apps/web`

## 1. Contexto e Escopo

F05 transforma a sessão encerrada de F03 em um resultado legível e consumível por F06, F07 e
F08. O desfecho e o motivo continuam pertencendo ao Motor de Duelo; a nota e a política de
recompensa continuam pertencendo ao Rating Engine. O Free Duel apenas valida esses contratos,
consolida as respostas e apresenta o resultado, preservando a separação entre motor e UI de
`docs/arquitetura.md` §§2, 3 e 7 e do ADR-002.

A implementação atual já entrega `DuelSession` em `packages/shared` e mantém `finalState` e
`duelSessionId` no ramo `status: "ended"`. Entretanto, `MotorDuelo/F12` e o Rating Engine ainda
não existem. Conforme o override autorizado, esta feature cria somente os tipos, schemas e portas
necessários para consumi-los; não cria uma implementação falsa desses subsistemas.

### Incluído

- Contrato validável do resultado de `MotorDuelo/F12`, com vencedor, perdedor e motivo.
- Contrato validável da avaliação do Rating Engine: nota, estrelas e faixa de raridade.
- Política mínima externa validável, usada quando a avaliação falha numa vitória.
- Consolidação do ponto de vista do jogador P1 em vitória, derrota ou empate.
- Garantia estrutural de que derrota e empate não carregam nota nem recompensa.
- Cache em memória por `duelSessionId`, evitando avaliar a mesma sessão mais de uma vez.
- Tela de resultado com desfecho, motivo e, apenas na vitória, nota/estrelas ou aviso de fallback.
- Estado seguro `unavailable` quando o resultado do motor está ausente ou inconsistente.

### Fronteiras

- Declaração e congelamento do resultado pertencem a `MotorDuelo/F12`; F05 não infere vitória por
  LP, deck ou fase do turno.
- Cálculo da nota, escala e tabela nota→recompensa pertencem ao Rating Engine; F05 trata a nota e a
  faixa como identificadores opacos.
- Sorteio e concessão da carta pertencem a F06.
- Crédito persistente de estrelas, carteira e ledger idempotente pertencem a F07 e à economia
  unificada de `docs/arquitetura.md` §5/ADR-006.
- Revanche e navegação pós-duelo pertencem a F08.
- Nenhum estado de duelo, regra de combate, tabela Postgres ou store IndexedDB é criado por F05.

### Contratos externos assumidos

- **`MotorDuelo/F12`** — fornece uma função que lê um `DuelState` final e devolve
  `Result<DuelOutcome, DomainError>`. A implementação real será de `packages/engine`; F05 declara
  apenas `ReadDuelOutcome`.
- **Rating Engine** — fornece `evaluate(snapshot)` e devolve `RatingEvaluation`. A escala de notas,
  a fórmula e os valores não são definidos aqui.
- **Política mínima do Rating Engine** — fornece `MinimumRatingReward`, proveniente da mesma fonte
  oficial da tabela nota→recompensa. É dependência obrigatória da composição; nenhum número ou
  faixa é hard-coded.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O jogador humano é P1; o desfecho é traduzido sempre desse ponto de vista. | PRD F03/F05 | confirmada |
| 2 | `DuelOutcome` é uma união discriminada: empate não possui vencedor/perdedor; resultados decisivos exigem jogadores distintos. | PRD F05; guidelines §§6–8 | confirmada |
| 3 | `DuelGrade` e `DropTierId` são strings opacas não vazias; F05 não ordena nem interpreta esses valores. | PRD F05; pendência do Rating Engine | confirmada |
| 4 | O fallback de vitória usa uma `MinimumRatingReward` injetada e validada. F05 não inventa `1 estrela`, `comum` ou qualquer outro valor. | `arquitetura.md` §§4.3, 10; ADR-006 | pendente — aguarda dado oficial |
| 5 | Ausência da política mínima torna a composição de F05 inválida; não se concede recompensa com valor adivinhado. | portão “tabelas pendentes neutras” | confirmada |
| 6 | Resultado inconsistente do motor produz `status: "unavailable"` e nunca autoriza F06/F07. | PRD F05 Error Handling | confirmada |
| 7 | O Rating Engine só é chamado em vitória. Derrota e empate são consolidados sem serializar nem avaliar. | PRD F05 Capabilities | confirmada |
| 8 | Falha, exceção ou resposta inválida do Rating Engine usa a política mínima e registra incidente estruturado. | PRD F05 Error Handling; guidelines §§8–9 | confirmada |
| 9 | A apuração é memoizada em memória por `duelSessionId`; F05 não persiste nem aplica recompensa. | fronteira F05/F06/F07; ADR-006 | confirmada |
| 10 | A tela atual de F03 é estendida no ramo `status: "ended"`; não é criada uma rota paralela. | código atual; ADR-004 | confirmada |
| 11 | O estado terminal hoje não contém resultado de F12. A integração usa uma porta injetada até F12 materializar o campo/reader oficial. | baseline do código; override “assuma os contratos externos” | a confirmar na implementação de F12 |
| 12 | A spec cobre todo o escopo de F05; o PRD não possui divisão Core/Full para esta feature. | PRD F05 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/duel/result.ts` | shared | novo | Tipos de desfecho, avaliação, política mínima, resultado consolidado e portas externas |
| `packages/shared/src/duel/result-schema.ts` | shared | novo | Schemas zod e invariantes das respostas externas |
| `packages/shared/src/index.ts` | shared | alterado | Export público dos contratos e schemas |
| `apps/web/src/lib/free-duel/consolidate-duel-result.ts` | web | novo | Núcleo puro que traduz e consolida os contratos |
| `apps/web/src/lib/free-duel/consolidate-duel-result.test.ts` | web | novo | Testes unitários e propriedades do núcleo |
| `apps/web/src/lib/free-duel/resolve-duel-result.ts` | web | novo | Orquestra leitura do motor, Rating Engine, validação, fallback, log e cache |
| `apps/web/src/lib/free-duel/resolve-duel-result.test.ts` | web | novo | Testes de fronteira, fallback e idempotência por sessão |
| `apps/web/src/lib/free-duel/duel-result-messages.ts` | web | novo | Tradução do motivo técnico para mensagem de UI |
| `apps/web/src/hooks/use-duel-result.ts` | web | novo | Hook fino para a resolução assíncrona da sessão encerrada |
| `apps/web/src/components/free-duel/duel-result.tsx` | web | novo | Painel acessível de resultado |
| `apps/web/src/components/free-duel/duel-result.test.tsx` | web | novo | Testes dos ramos visuais |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.tsx` | web | alterado | Substitui “Duel ended.” pelo fluxo F05 quando as dependências são fornecidas |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.test.tsx` | web | alterado | Integração da tela de duelo com F05 |
| `apps/web/tests/free-duel-result.integration.test.tsx` | web | novo | Fluxo F03→F05 com portas externas controladas |

**Verificação da direção de dependências:** `packages/shared` contém somente contratos/schemas.
Toda orquestração, I/O, cache e React ficam em `apps/web`. Nenhum arquivo em `packages/engine` ou
`packages/rules` é alterado; nenhum pacote importa `apps/web`. A direção
`shared ← data ← rules ← engine ← ai`, com `web` como consumidor, permanece válida
(`docs/arquitetura.md` §2 e ADR-001).

## 3. Design Técnico

### Estruturas de dados

`DuelOutcome`:

```ts
type DuelOutcome =
  | { status: "decisive"; winner: PlayerId; loser: PlayerId;
      reason: "lp_zerado" | "deck_out" | "rendicao" }
  | { status: "draw"; winner: null; loser: null; reason: "empate" };
```

`RatingEvaluation` contém `grade` opaca e `reward: { stars, dropTier }`. `MinimumRatingReward`
contém somente `stars` e `dropTier`; não fabrica uma nota.

`ConsolidatedDuelResult`:

```ts
type ConsolidatedDuelResult =
  | { status: "victory"; duelSessionId: string; reason: DecisiveReason;
      rating: { source: "rating_engine"; grade: DuelGrade; reward: RatingReward }
            | { source: "minimum_fallback"; grade: null; reward: MinimumRatingReward } }
  | { status: "defeat"; duelSessionId: string; reason: DecisiveReason }
  | { status: "draw"; duelSessionId: string; reason: "empate" }
  | { status: "unavailable"; duelSessionId: string; reason: "missing_outcome" | "invalid_outcome" };
```

### Fluxo

1. O hook recebe somente uma `DuelSession` com `status: "ended"`.
2. O resolver consulta o cache por `duelSessionId`.
3. Chama `ReadDuelOutcome(finalState)` e valida o valor com `DuelOutcomeSchema`.
4. Falha/valor inválido gera `unavailable`, log estruturado e nenhuma avaliação/recompensa.
5. Empate ou derrota é consolidado imediatamente, sem chamar `serialize` nem o Rating Engine.
6. Vitória serializa `finalState` usando a porta `CreateDuelSnapshot` e chama
   `RatingEngine.evaluate`.
7. A resposta externa passa por `RatingEvaluationSchema`.
8. Sucesso gera avaliação de origem `rating_engine`.
9. Exceção, `Result` de erro ou resposta inválida gera origem `minimum_fallback` usando a política
   mínima já validada e registra `rating_engine_unavailable`.
10. O resultado é armazenado no cache da sessão e exposto à UI.
11. A UI mostra desfecho e motivo; vitória mostra nota/estrelas ou a mensagem de fallback.

### Regras de negócio

- Apenas `winner === "P1"` é vitória; `loser === "P1"` é derrota.
- Resultado decisivo que não menciona P1 é inválido para o Free Duel 1x1.
- Derrota/empate não carregam `rating`, `stars` ou `dropTier`.
- Rating Engine é chamado no máximo uma vez por `duelSessionId`.
- Estrelas são inteiras e não negativas; `grade`/`dropTier` são strings não vazias.
- F05 apenas calcula uma intenção de recompensa. F06/F07 mantêm a responsabilidade de aplicar
  carta/estrelas de modo atômico e idempotente (`docs/arquitetura.md` §5.2, ADR-006).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- `DuelOutcomeSchema`: união discriminada com refinamento `winner !== loser`.
- `RatingRewardSchema`: `{ stars: int >= 0, dropTier: nonempty string }`.
- `RatingEvaluationSchema`: `{ grade: nonempty string, reward: RatingRewardSchema }`.
- `MinimumRatingRewardSchema`: mesma forma da recompensa, sem nota.
- `ConsolidatedDuelResultSchema`: união fechada dos quatro estados.

### Funções públicas

```ts
type ReadDuelOutcome =
  (state: DuelState) => Result<DuelOutcome, DomainError>;

type CreateDuelSnapshot = (state: DuelState) => Snapshot;

type RatingEngine = Readonly<{
  evaluate(snapshot: Snapshot): Promise<Result<unknown, DomainError>>;
}>;

consolidateDuelResult(input: ConsolidateDuelResultInput): ConsolidatedDuelResult;

resolveDuelResult(
  session: Extract<DuelSession, { status: "ended" }>,
  dependencies: ResolveDuelResultDependencies,
): Promise<ConsolidatedDuelResult>;
```

Exemplo de avaliação externa válida:

```json
{
  "grade": "GRADE_DEFINED_BY_RATING_ENGINE",
  "reward": {
    "stars": 0,
    "dropTier": "TIER_DEFINED_BY_RATING_ENGINE"
  }
}
```

Os literais acima demonstram apenas a forma; não são dados de produção.

### Contratos externos (cross-PRD)

`ReadDuelOutcome` será implementado por `MotorDuelo/F12`. `RatingEngine` e
`MinimumRatingReward` serão fornecidos pelo Rating Engine. Até esses módulos existirem, testes
injetam fakes locais; nenhum fake entra em código de produção.

## 5. Modelo de Dados

F05 não cria persistência. O cache é um `Map<string, ConsolidatedDuelResult>` privado ao módulo
web e dura somente durante a execução do app. A chave é `duelSessionId`; uma revanche terá outro
identificador e será avaliada separadamente.

Não há migração, RLS, IndexedDB ou fila offline nesta feature. `wallets`, `collections` e
`reward_ledger` permanecem responsabilidade de F06/F07 e do handler econômico unificado.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Resultado do motor ausente | `ReadDuelOutcome` retorna erro | `unavailable`, sem recompensa, log `error` | “Não foi possível apurar o resultado do duelo.” |
| Resultado estruturalmente inválido | falha no `DuelOutcomeSchema` | `unavailable`, sem recompensa, log `error` | mesma mensagem |
| Resultado decisivo não envolve P1 | núcleo puro | `unavailable`, sem recompensa | mesma mensagem |
| Rating Engine retorna erro/exceção | fronteira assíncrona | aplica política mínima, log `warn` | “Não foi possível avaliar a nota; recompensa mínima aplicada.” |
| Rating Engine retorna payload inválido | `RatingEvaluationSchema` | aplica política mínima, log `warn` | mesma mensagem |
| Política mínima inválida/ausente | composição da dependência | F05 não é iniciado; nenhuma recompensa inventada | erro de integração, não mensagem de duelo |
| Renderização repetida da mesma sessão | cache por ID | devolve o mesmo resultado sem nova avaliação | nenhuma |
| Derrota/empate | ramo do desfecho | Rating Engine não é chamado | sem recompensa |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `consolidateDuelResult maps P1 winner to victory` — vitória carrega avaliação.
- `consolidateDuelResult maps P1 loser to defeat without rating` — derrota não carrega recompensa.
- `consolidateDuelResult maps draw without rating` — empate não carrega recompensa.
- `consolidateDuelResult rejects decisive outcome unrelated to P1` — caminho seguro.
- `resolveDuelResult does not call rating engine for defeat or draw`.
- `resolveDuelResult validates external rating response`.
- `resolveDuelResult applies injected minimum reward on rating failure`.
- `resolveDuelResult caches one evaluation per duel session`.
- `DuelResult renders every outcome and exact fallback message`.

### Property-based (fast-check)

- Para qualquer recompensa válida, derrota e empate nunca produzem propriedades `rating`,
  `stars` ou `dropTier`.
- Para qualquer ID de sessão e avaliação válida, duas resoluções da mesma sessão chamam o Rating
  Engine no máximo uma vez.

### Integração

- `free-duel-result.integration.test.tsx` conduz uma `DuelSession` encerrada por portas controladas,
  confirma a avaliação apenas na vitória e renderiza a tela consolidada.

### Análise estática

- `packages/engine` e `packages/rules` não recebem imports de UI/I/O.
- `packages/shared` não importa `apps/web`.
- Não há valores concretos de nota, estrelas ou faixa definidos em módulos de produção.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| Exibe desfecho e motivo vindos do Motor/F12 | testes de `DuelResult` + integração F03→F05 |
| Apenas vitória obtém nota/tabela; derrota/empate não geram recompensa | testes do resolver para os três ramos |
| Resultado consolidado fornece desfecho, nota, estrelas e faixa a F06/F07/F08 | schemas + testes do núcleo |
| Rating Engine indisponível aplica mínimo e registra incidente | teste de fallback do resolver |
| Reflete escala/tabela oficiais quando fornecidas | teste de payload opaco preservado integralmente |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|----------|-------|
| F03 encerra e F05 apura sem estado paralelo | `free-duel-result.integration.test.tsx` |
| Derrota/empate, inclusive rendição, não disparam recompensa | testes do resolver e integração com outcome `surrender` |
| F05 não reimplementa regras do motor | porta `ReadDuelOutcome` injetada + lint de fronteiras |
| Rating Engine oficial pode substituir o fake sem alterar F05 | teste de contrato com payload opaco |
