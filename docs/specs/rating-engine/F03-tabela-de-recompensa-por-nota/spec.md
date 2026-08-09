# Tabela de Recompensa por Nota

> PRD: `docs/prds/rating-engine.md` — F03
> Pacote-alvo: `packages/rules`

## 1. Contexto e Escopo

F03 é a menor feature do módulo e a que fecha mais pendências. Uma função total de dez entradas:
nota → `{ stars, dropTier }`. Nada mais.

O que ela destrava é desproporcional ao seu tamanho. Hoje, `MINIMUM_RATING_REWARD` em
`apps/web/src/lib/free-duel/rating-policy.ts:11-14` é `{ stars: 0, dropTier: "common" }` e é o
**único** valor de recompensa que existe no repositório — porque `unavailableRatingEngine` sempre
erra e toda vitória cai no fallback. Consequências mensuráveis hoje: a carteira de estrelas nunca
sai de zero, então `password/F04` (liberação por senha) não tem fonte de renda; e os pools `sa-pow`
e `sa-tec` de jono (56 e 58 cartas) e teana (19 e 23) estão gravados no roster e são inalcançáveis,
porque nenhuma nota jamais devolve outra faixa.

Com F03, três itens de `docs/arquitetura.md` §10 saem da lista de pendências ao mesmo tempo: a
tabela nota→recompensa (`free-duel/F05`), o valor `N` de estrelas por vitória (`password/F02`), e a
alcançabilidade das faixas de drop (`free-duel/F06`).

**Fidelidade, não balanceamento.** O `N` de estrelas por vitória estava catalogado como "dado
tunável de balanceamento a definir" (`password` PRD §7; Fase 0.4 do skill). Ele não é tunável: é o
star chip do original, de 1 a 5 conforme a nota. A pendência não foi resolvida escolhendo um número
— foi resolvida descobrindo que o número já existia.

### Incluído

- A tabela nota → estrelas, com os valores do original (1 a 5)
- A tabela nota → faixa de drop, mapeando as dez notas nas três faixas do roster
- `rewardForGrade`, total e exaustiva sobre `DuelGrade` por construção do tipo
- Os identificadores de faixa (`common`, `sa-pow`, `sa-tec`) como constantes nomeadas, em vez de
  literais soltos espalhados

### Fronteiras

- **Calcular a nota** → F02 deste PRD. F03 recebe a nota pronta e nunca pontua.
- **Sortear a carta dentro da faixa** → `free-duel/F06`, já implementado
  (`selectDropCardNumber`). F03 escolhe a faixa e nunca olha dentro dela.
- **Compor os pools e seus pesos** → dado do roster (`free-duel/F01`, `banco-de-cartas/F08`). F03
  não sabe quais cartas existem em cada faixa, nem precisa saber.
- **Creditar as estrelas e somar a carta** → `free-duel/F07` e `build-deck/F03`, já implementados,
  atômicos e idempotentes por `duel_id` via `apply_victory_reward`
  (`supabase/migrations/0008_create_wallets_and_apply_victory_reward.sql`). F03 informa quantas
  estrelas; não credita, não persiste, não toca banco.
- **Gastar estrelas** → `password/F04`. F03 é fonte, nunca dreno.

### Contratos externos assumidos

- **`rating-engine/F02` (wave anterior)** — `DuelGrade` como união fechada das dez notas e
  `DUEL_GRADES` como lista fechada.
- **`free-duel/F05` (já implementado)** — `RatingReward = { stars: number; dropTier: DropTierId }`
  (`packages/shared/src/duel/result.ts:18-21`). F03 produz exatamente esse tipo, sem alterá-lo.
- **`free-duel/F01` (já implementado)** — `DropTierId` (`packages/shared/src/duelist/types.ts`) e as
  faixas efetivamente presentes no roster, reportadas por `RosterReport.observedDropTiers`
  (`packages/data/src/roster/load-roster.ts`).

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **O `N` de estrelas por vitória não é dado de balanceamento pendente — é o star chip do original**, de 1 a 5 conforme a nota. A Fase 0.4 do skill e o PRD `password` §7 o listavam como "a definir"; a pesquisa de F02 recuperou a tabela junto com a fórmula, da mesma fonte e com a mesma conferência. A pendência é fechada por dado real, não por escolha. | pesquisa desta spec e de F02; `password` PRD §7; `docs/arquitetura.md` §10 | confirmada |
| 2 | **As faixas de drop são as três já observadas no roster**: `common`, `sa-pow`, `sa-tec`. Não são inventadas nem escolhidas aqui — são os identificadores que `packages/data/data/duelists/*.json` já carrega e que `docs/duelistas/README.md` documenta como o mapeamento dos pools BCD/SAPow/SATec do original. F03 apenas as conecta às notas. | `packages/data/data/duelists/{jono,teana}.json`; `docs/duelistas/README.md` | confirmada |
| 3 | **Só `S` e `A` abrem faixa rara; as seis notas centrais compartilham `common`.** É o corte do original (três pools, não dez) e é o que a conferência de F02 já validou: a escada de dez notas produz `≥ 80` para `S`/`A` POW e `≤ 19` para `S`/`A` TEC, exatamente o corte de três faixas publicado pela fonte independente. | proveniência registrada em `docs/specs/rating-engine/F02-.../spec.md` §3 | confirmada |
| 4 | **A tabela é um `Record<DuelGrade, RatingReward>`, não um `switch` nem um `Map`.** Com `DuelGrade` fechado por F02, o compilador exige a entrada de toda nota: acrescentar uma nota sem recompensa vira erro de tipo. É a razão prática do estreitamento de tipo da Decisão 2 de F02. | guidelines §6; `rating-engine/F02` Decisão 2 | confirmada |
| 5 | **A recompensa é simétrica no eixo**, e isso é intencional: `S-TEC` e `S-POW` valem ambos 5 estrelas, `D-TEC` e `D-POW` ambos 1. A pontuação é um eixo único onde os dois extremos são difíceis e o meio é fácil, então a recompensa é uma função da **distância ao centro**, não da pontuação bruta. Um jogador que tira `S-TEC` (pontuação `≤ 9`) fez algo tão deliberado quanto quem tira `S-POW` (`≥ 90`). | proveniência da tabela; PRD F03 Capabilities | confirmada |
| 6 | **F03 não credita, não persiste e não sorteia.** É uma função pura sem I/O. O crédito atômico e idempotente é de `free-duel/F07` via `apply_victory_reward`, que já existe, e o sorteio é de `free-duel/F06`, que já existe. F03 não introduz tabela, migração, RPC nem fila. | PRD F03 Capabilities; `docs/arquitetura.md` §5.2 | confirmada |
| 7 | **`stars` é sempre `≥ 1` na tabela.** Nenhuma nota concede zero estrelas — vencer sempre vale alguma coisa, que é o que o PRD `free-duel` §4 pede ("100% das vitórias creditam... as estrelas correspondentes à nota"). O `stars: 0` de `MINIMUM_RATING_REWARD` continua existindo, mas apenas como fallback de **falha do módulo**, não como recompensa de nenhuma nota. | PRD `free-duel` §4 Métricas; `apps/web/src/lib/free-duel/rating-policy.ts:11-14` | confirmada |
| 8 | **A monotonicidade é por lado do eixo, não global.** "Nota mais extrema concede `≥`" vale dentro de `TEC` (`D-TEC` 1 → `S-TEC` 5) e dentro de `POW` (`D-POW` 1 → `S-POW` 5), não entre os dois lados comparados por pontuação bruta. O teste codifica exatamente isso e não a versão global, que seria falsa. | achado desta spec; PRD §4 Métricas ("escalonamento monotônico") | confirmada |
| 9 | Nenhuma divisão Core/Full Scope no PRD para F03 — a spec cobre o escopo completo da Seção 6 F03. | PRD §6 F03 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/duelist/constants.ts` | shared | alterado | `FM_DROP_TIERS` — os três identificadores de faixa como constantes nomeadas |
| `packages/shared/src/index.ts` | shared | alterado | Exporta `FM_DROP_TIERS` |
| `packages/rules/src/rating/rating-reward-table.ts` | rules | novo | `GRADE_REWARDS` e `rewardForGrade` |
| `packages/rules/src/rating/index.ts` | rules | alterado | Reexporta a tabela de recompensa |
| `packages/rules/src/rating/evaluate-duel.ts` | rules | alterado | Passa a compor `rewardForGrade` no passo 8 (F02, fluxo) |
| `packages/rules/src/rating/rating-reward-table.test.ts` | rules | novo | Unitários das dez entradas e dos invariantes da tabela |

**Verificação da direção de dependências:**

- `packages/rules/src/rating/rating-reward-table.ts` importa **apenas** `packages/shared`
  (`DuelGrade`, `RatingReward`, `DropTierId`, `FM_DROP_TIERS`). Nenhum import de `packages/data`,
  `packages/engine`, `packages/ai`, React, DOM, `fetch`, `node:*` ou Supabase.
- **Notável:** F03 mapeia para identificadores de faixa que são dados de `packages/data`
  (`roster.json`), mas **não importa `data`** — os identificadores são strings do tipo `DropTierId`,
  declarado em `shared`. É o mesmo padrão que `free-duel/F06` já usa (Decisão 7 da spec de F06):
  `rules` recebe ou nomeia o identificador, `apps/web` resolve o dado.
- `packages/shared/src/duelist/constants.ts` já existe (códigos de erro de duelista) e continua sem
  importar nenhum pacote do monorepo.

## 3. Design Técnico

### Estruturas de dados

**`GRADE_REWARDS`** — `Readonly<Record<DuelGrade, RatingReward>>`, a tabela inteira como uma
constante congelada:

| Nota | `stars` | `dropTier` |
|---|---|---|
| `S-TEC` | 5 | `sa-tec` |
| `A-TEC` | 4 | `sa-tec` |
| `B-TEC` | 3 | `common` |
| `C-TEC` | 2 | `common` |
| `D-TEC` | 1 | `common` |
| `D-POW` | 1 | `common` |
| `C-POW` | 2 | `common` |
| `B-POW` | 3 | `common` |
| `A-POW` | 4 | `sa-pow` |
| `S-POW` | 5 | `sa-pow` |

**`FM_DROP_TIERS`** (`packages/shared`) — os três identificadores como constantes nomeadas:
`COMMON: "common"`, `SA_POW: "sa-pow"`, `SA_TEC: "sa-tec"`. Existem para que a tabela acima não
espalhe literais e para que uma renomeação de faixa no roster tenha um único ponto de verdade do
lado das regras.

### Fluxo

1. `rewardForGrade(grade)` indexa `GRADE_REWARDS` e devolve a entrada. Total por construção: o tipo
   `Record<DuelGrade, RatingReward>` garante que toda nota tem entrada, e `DuelGrade` é fechado
   (F02, Decisão 2). Nenhum ramo de erro, nenhum `Result` — não há entrada inválida possível.
2. `evaluateDuel` (F02) chama `rewardForGrade` no seu passo 8 e monta `RatingEvaluation
   { grade, reward }`.
3. `free-duel/F05` (`resolveDuelResult`, já implementado) valida essa avaliação com
   `RatingEvaluationSchema` e a envolve em `ConsolidatedRating { source: "rating_engine", grade,
   reward }`.
4. `free-duel/F06` (`grantVictoryReward`, já implementado) lê `rating.reward.dropTier` e o passa a
   `selectDropCardNumber`; `free-duel/F07` lê `rating.reward.stars` e o passa a
   `apply_victory_reward`. **Nenhuma dessas duas features precisa mudar** — elas já consomem esses
   campos hoje, só recebiam sempre os valores do fallback mínimo.

### Regras de negócio

- Dez notas, dez entradas, sem lacuna e sem entrada extra (garantido pelo tipo, Decisão 4).
- `stars` entre 1 e 5, inclusive; nenhuma nota concede zero (Decisão 7).
- `dropTier` sempre uma das três faixas de `FM_DROP_TIERS`; as três são alcançáveis.
- `S`/`A` do lado `POW` abrem `sa-pow`; `S`/`A` do lado `TEC` abrem `sa-tec`; as seis restantes
  abrem `common` (Decisão 3).
- Monotonicidade por lado do eixo (Decisão 8), não global.
- F03 é fonte de estrelas, nunca dreno (Decisão 6).

### Determinismo e pureza

- `rewardForGrade` é **pura e total**: sem I/O, sem relógio, sem log, sem `Math.random()`, e não
  pode falhar. É uma indexação de constante congelada.
- `GRADE_REWARDS` é congelada e nunca reatribuída; os objetos `RatingReward` que ela devolve são
  compartilhados e imutáveis, então nenhum chamador pode corromper a tabela para os outros.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duelist/constants.ts
export const FM_DROP_TIERS = {
  COMMON: "common",
  SA_POW: "sa-pow",
  SA_TEC: "sa-tec",
} as const satisfies Record<string, DropTierId>;
```

Nenhum tipo novo: `RatingReward` (`{ stars, dropTier }`) e `DropTierId` já existem e não mudam.

### Funções públicas

```
// packages/rules/src/rating — puro, sem I/O

GRADE_REWARDS: Readonly<Record<DuelGrade, RatingReward>>
  // invariante: exatamente uma entrada por nota de DUEL_GRADES (garantido pelo tipo)

rewardForGrade(grade: DuelGrade): RatingReward
  // pós: resultado.stars ∈ [1, 5]
  //      resultado.dropTier ∈ { 'common', 'sa-pow', 'sa-tec' }
  //      total: não pode falhar, não devolve Result, nunca lança
  //      determinístico e referencialmente transparente
```

Exemplos:

```json
{ "grade": "S-POW", "reward": { "stars": 5, "dropTier": "sa-pow" } }
```

```json
{ "grade": "A-TEC", "reward": { "stars": 4, "dropTier": "sa-tec" } }
```

```json
{ "grade": "C-POW", "reward": { "stars": 2, "dropTier": "common" } }
```

### Contratos externos (cross-PRD, já implementados — nenhum precisa mudar)

- **`free-duel/F06` (`grantVictoryReward`)** — já lê `result.rating.reward.dropTier` e o repassa a
  `selectDropCardNumber` (`apps/web/src/lib/free-duel/grant-victory-reward.ts:55-60`). Com F03, esse
  valor deixa de ser sempre `"common"`.
- **`free-duel/F07` (`applyVictoryReward` → `apply_victory_reward`)** — já lê
  `result.rating.reward.stars` e o envia como `p_stars` ao RPC atômico. Com F03, esse valor deixa de
  ser sempre `0`.
- **`password/F02`** — adota a carteira e o handler de vitória de `free-duel/F07`; o `N` que faltava
  é o `stars` desta tabela (Decisão 1).

## 5. Modelo de Dados

**Nenhuma tabela Postgres, nenhuma migração, nenhum store IndexedDB, nenhum arquivo de dados novo.**

A tabela de recompensa é constante de código pelo mesmo motivo dos coeficientes de F02 (Decisão 4
daquela spec): é a regra do jogo, não conteúdo versionado. Ela alimenta a coluna `stars` de
`reward_ledger` e a coluna `stars` de `wallets`, ambas já criadas pela migração
`0008_create_wallets_and_apply_victory_reward.sql`, sem alterar seu esquema, seus grants nem sua RLS.

**Nota sobre linhas históricas:** a spec de `free-duel/F07` (Decisão 7) registra que linhas de
`reward_ledger` criadas antes daquele retrofit mantêm `stars = 0` permanentemente, sem
reprocessamento retroativo. F03 não altera isso: as vitórias que já aconteceram com o fallback
mínimo continuam valendo zero estrelas. Só as vitórias a partir daqui recebem o valor da tabela.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Nota fora da escala | impossível — `DuelGrade` é união fechada (F02, Decisão 2) | Erro de compilação no chamador, não erro de runtime | nenhuma |
| Nota acrescentada a `DUEL_GRADES` sem entrada em `GRADE_REWARDS` | `tsc` — o `Record<DuelGrade, RatingReward>` deixa de ser exaustivo | Erro de compilação (Decisão 4) | nenhuma |
| Faixa devolvida não existe no pool do duelista derrotado | não é erro de F03 | `free-duel/F06` já trata: cai na `defaultCommonDropPool` e registra a pendência de configuração (Decisão 4 da spec de F06) | mesma UI da carta concedida, sem aviso |
| Roster renomeia ou remove uma das três faixas | `RosterReport.observedDropTiers` deixa de conter a faixa; teste de contrato desta spec falha | Falha no CI, não em produção | nenhuma |
| Falha do Rating Engine antes de chegar a F03 | `evaluateDuel` (F02) devolve erro | `free-duel/F05` aplica `MINIMUM_RATING_REWARD` (`stars: 0`, `common`) — o fallback de falha continua existindo (Decisão 7) | "Não foi possível avaliar a nota; recompensa mínima aplicada." (já existente) |
| Crédito duplicado da mesma vitória | não é responsabilidade de F03 | `apply_victory_reward` é idempotente por `duel_id` (migração `0008`) | "Recompensa já recebida." (já existente) |

Nenhuma mensagem nova ao jogador é introduzida por F03.

## 7. Estratégia de Testes

### Unitários (Vitest)

Entradas da tabela — as dez, explicitamente:

- `rewardForGrade returns 5 stars and the sa-tec tier for S-TEC`
- `rewardForGrade returns 4 stars and the sa-tec tier for A-TEC`
- `rewardForGrade returns 3 stars and the common tier for B-TEC`
- `rewardForGrade returns 2 stars and the common tier for C-TEC`
- `rewardForGrade returns 1 star and the common tier for D-TEC`
- `rewardForGrade returns 1 star and the common tier for D-POW`
- `rewardForGrade returns 2 stars and the common tier for C-POW`
- `rewardForGrade returns 3 stars and the common tier for B-POW`
- `rewardForGrade returns 4 stars and the sa-pow tier for A-POW`
- `rewardForGrade returns 5 stars and the sa-pow tier for S-POW`

Invariantes da tabela:

- `GRADE_REWARDS has exactly one entry per grade in DUEL_GRADES`
- `every reward grants between 1 and 5 stars`
- `no grade grants zero stars`
- `every reward maps to one of the three FM drop tiers`
- `all three drop tiers are reachable from at least one grade`
- `only S and A grades open a rare tier`
- `the six central grades all map to the common tier`
- `stars increase monotonically from D to S within the TEC band`
- `stars increase monotonically from D to S within the POW band`
- `the reward table is symmetric across the axis for equivalent letters`
- `rewardForGrade returns a referentially stable object for repeated calls`

### Property-based (fast-check)

Escopo deliberadamente pequeno: com domínio de dez valores, os unitários acima são exaustivos e
uma propriedade sobre `DuelGrade` não acrescenta cobertura. As duas que acrescentam são de
composição:

- **Totalidade sobre a escada completa:** para qualquer inteiro, `rewardForGrade(gradeFromScore(n))`
  devolve uma recompensa válida (`stars ∈ [1,5]`, `dropTier` entre as três) — cobre a cadeia
  pontuação → nota → recompensa sem lacuna. 1.000 execuções.
- **Monotonicidade da cadeia por lado do eixo:** para qualquer par de pontuações do mesmo lado do
  centro (`≤ 49` ou `≥ 50`), a pontuação mais distante do centro nunca concede menos estrelas que a
  mais próxima (Decisão 8). 1.000 execuções.

### Integração

- `a victory evaluated end to end yields a reward whose drop tier exists in the defeated duelist's pool`
  — atravessa F01 → F02 → F03 e confere a faixa contra o roster real de teana e jono.
- `every grade produces a reward that satisfies RatingEvaluationSchema` — teste de contrato contra o
  schema que `resolveDuelResult` (`free-duel/F05`) já valida.

### Análise estática

- `packages/rules/src/rating/rating-reward-table.ts` não importa `packages/data`,
  `packages/engine`, `packages/ai`, React, DOM, `fetch`, `node:*` nem Supabase (regras
  `rules-depends-only-on-shared` e `domain-cores-are-pure`).
- Nenhum uso de `Math.random()`, `Date`, `console` ou função assíncrona.
- `tsc --noEmit` passa, e a exaustividade de `GRADE_REWARDS` sobre `DuelGrade` é verificada pelo
  compilador (Decisão 4).

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F03) | Teste |
|---|---|
| Cada uma das dez notas mapeia para estrelas entre 1 e 5 e para exatamente uma faixa | Os dez unitários de entrada + `GRADE_REWARDS has exactly one entry per grade...` + `every reward grants between 1 and 5 stars` |
| `S-POW` e `A-POW` abrem `sa-pow`; `S-TEC` e `A-TEC` abrem `sa-tec`; as seis restantes abrem `common` | `only S and A grades open a rare tier` + `the six central grades all map to the common tier` + os quatro unitários das notas `S`/`A` |
| As três faixas são todas atingíveis; nenhuma faixa do roster fica inalcançável | `all three drop tiers are reachable from at least one grade` + `a victory evaluated end to end yields a reward whose drop tier exists in the defeated duelist's pool` |
| A recompensa é monotônica: nenhuma nota mais extrema concede menos estrelas que uma mais central do mesmo lado | `stars increase monotonically from D to S within the TEC band` + `...within the POW band` + propriedade de monotonicidade da cadeia |
| A tabela não credita, não persiste e não sorteia carta | Análise estática (sem I/O, sem Supabase, sem assíncrono) + `rewardForGrade returns a referentially stable object for repeated calls` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: uma vitória por deck-out com deck cheio e muitos turnos atravessa F01→F02→F03 e chega a uma faixa `TEC` | `a victory evaluated end to end yields a reward whose drop tier exists in the defeated duelist's pool` (variante deck-out) |
| Cross-PRD (`free-duel/F06`): a faixa que F03 devolve é a usada no sorteio, e o pool correspondente do oponente é consultado | Teste de integração conferindo a faixa contra `RosterReport.observedDropTiers` do roster real; o sorteio em si já é coberto pelos testes de F06 |
| Cross-PRD (`free-duel/F07` e `password/F02`): as estrelas devolvidas são as creditadas no RPC idempotente, fechando a pendência de valor `N` | `every grade produces a reward that satisfies RatingEvaluationSchema` — a mesma forma que `applyVictoryReward` já envia como `p_stars`; a idempotência já é coberta pelos testes de integração de F07 |
| Cross-PRD (`docs/arquitetura.md` §10): a tabela nota→recompensa e o `N` de estrelas por vitória deixam de ser pendências | `GRADE_REWARDS has exactly one entry per grade in DUEL_GRADES` + `no grade grants zero stars` — falham se a tabela regredir para o fallback mínimo |
