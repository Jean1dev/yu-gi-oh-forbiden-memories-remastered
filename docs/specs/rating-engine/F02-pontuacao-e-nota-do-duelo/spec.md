# Pontuação e Nota do Duelo

> PRD: `docs/prds/rating-engine.md` — F02
> Pacote-alvo: `packages/rules` (+ `packages/shared`)

## 1. Contexto e Escopo

F02 é a fórmula. Recebe o snapshot final de um duelo encerrado, lê os sete contadores que F01
acumulou mais os três parâmetros já presentes no estado (turno, cartas restantes no deck, pontos de
vida restantes), aplica a pontuação do Forbidden Memories original e devolve uma das dez notas da
escala `S`/`A`/`B`/`C`/`D` × `POW`/`TEC`.

Esta é a feature que fecha a pendência mais antiga do repositório. `docs/arquitetura.md` §10 lista
"Rating Engine: escala de notas + tabela nota→recompensa (`free-duel` F05)" como item aberto; a spec
de `free-duel/F05` registra em Decisão 3 que "`DuelGrade` e `DropTierId` são strings opacas não
vazias; F05 não ordena nem interpreta esses valores" precisamente porque a escala não existia; e
`apps/web/src/lib/free-duel/rating-policy.ts` hoje expõe um `unavailableRatingEngine` que sempre
erra. F02 substitui essa lacuna por uma implementação real, e o faz **estreitando** o contrato
opaco que F05 já consome — sem exigir que F05 mude de comportamento.

**Fidelidade, não invenção.** A Fase 0.4 do skill `spec-writer` lista o Rating Engine como dado
externo pendente e proíbe inventar valores. Esta spec não inventa: transcreve a fórmula do jogo
original, recuperada e conferida por duas fontes independentes que concordam entre si (Seção 3,
"Proveniência"). A verificação aritmética descrita ali é o que distingue transcrição de invenção.

### Incluído

- As tabelas de coeficientes do original, como constantes congeladas com proveniência documentada
- A função pura de pontuação: base `50`, dez parâmetros por limiar, mais os pontos do tipo de vitória
- A escada de dez notas em faixas de dez pontos
- O estreitamento de `DuelGrade` de `string` opaca para união fechada de dez literais
- A extensão de `RatingEngine.evaluate` para receber o jogador avaliado além do snapshot
- A composição `evaluateDuel`, que valida o snapshot e devolve `RatingEvaluation` ou erro de domínio

### Fronteiras

- **Acumular os contadores** → F01 deste PRD, já entregue nesta wave anterior. F02 lê o snapshot e
  não toca o motor.
- **Traduzir nota em estrelas e faixa de drop** → F03 deste PRD. F02 devolve a nota; a recompensa é
  a feature seguinte. A composição `evaluateDuel` chama F03 porque `RatingEvaluation` carrega
  `{ grade, reward }`, mas a **tabela** de recompensa não vive aqui.
- **Sortear a carta dentro da faixa** → `free-duel/F06`, já implementado.
- **Creditar estrelas e somar a carta à coleção** → `free-duel/F07` e `build-deck/F03`, já
  implementados, atômicos e idempotentes por `duel_id`.
- **Nota para o perdedor, empate ou abandono** → sem nota, por decisão de `free-duel/F05`.
- **Nota em Campanha e Online Duel** → Seção 7 do PRD; os módulos não existem. A função é
  reutilizável, mas nada é escrito para eles.

### Contratos externos assumidos

- **`rating-engine/F01`** — `DuelState.stats: DuelStatsByPlayer`, campo obrigatório com sete
  contadores inteiros `≥ 0` por jogador, e `DUEL_STAT_COUNTERS` como lista fechada.
- **`motor-duelo-1x1/F05` (já implementado)** — `Snapshot = DuelState`
  (`packages/shared/src/duel/snapshot.ts`), produzido por `serialize`.
- **`motor-duelo-1x1/F12` (já implementado)** — `DuelOutcome` com ramo decisivo
  `{ winner, loser, reason: "lp_depleted" | "deck_out" | "surrender" }` e ramo de empate
  (`packages/shared/src/duel/outcome.ts`), presente em `DuelState.outcome`.
- **`free-duel/F05` (já implementado)** — `RatingEngine`, `RatingEvaluation`, `RatingReward`,
  `ConsolidatedRating` (`packages/shared/src/duel/result.ts`) e o consumidor `resolveDuelResult`
  (`apps/web/src/lib/free-duel/resolve-duel-result.ts`). F02 estreita esses tipos; a fiação do
  adaptador real em `apps/web` é lane curto, fora desta spec.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **A fórmula é transcrita, não inventada.** As duas fontes concordam e se validam por aritmética: os limites teóricos publicados para o original (`-140` mínimo, `+139` máximo) são exatamente o que a soma dos coeficientes transcritos produz, e a divisão em três faixas de drop derivada da escada de dez notas coincide com a divisão documentada. Uma transcrição errada não passaria nos dois testes ao mesmo tempo. A proveniência fica registrada no cabeçalho do módulo de tabelas e na Seção 3. | pesquisa desta spec; PRD F02 "FIDELIDADE"; Fase 0.4 do skill (pendência agora resolvida por dado externo real, não por invenção) | confirmada |
| 2 | **`DuelGrade` deixa de ser `string` e vira união fechada de dez literais.** Isso é um estreitamento, não uma quebra: `free-duel/F05` trata a nota como opaca e apenas a exibe (Decisão 3 da spec de F05), então continua compilando e continua sem interpretar. O ganho é que a exaustividade da tabela de F03 passa a ser verificada pelo compilador — uma nota nova sem recompensa vira erro de tipo, não bug em produção. | `docs/specs/free-duel/F05-.../spec.md` Decisão 3; guidelines §6 (uniões fechadas em vez de `string`) | confirmada |
| 3 | **`RatingEngine.evaluate` passa a receber o jogador avaliado**: `evaluate(snapshot, player)`. Hoje a assinatura é `evaluate(snapshot)` e devolve `Result<unknown, DomainError>` (`packages/shared/src/duel/result.ts:72-74`). Sem o jogador, a função não sabe de quem são os contadores — e `DuelState.stats` é indexado por jogador. O tipo de retorno também deixa de ser `unknown` e passa a ser `RatingEvaluation`, que já existe e já é validado por `RatingEvaluationSchema` no consumidor. | achado desta spec; `packages/shared/src/duel/result.ts` | confirmada |
| 4 | **Os coeficientes vivem em `packages/rules`, não em `packages/data`.** As tabelas pendentes de `arquitetura.md` §4.3 (guardiões, terrenos, fusões, drops) vivem em `data` porque são **dados de conteúdo** que viajam no bundle versionado e podem mudar sem mudar código. Os coeficientes da nota são **a regra em si**, não conteúdo: não variam por carta, por duelista nem por versão do dataset, e não têm loader nem validação de referência cruzada. Colocá-los em `data` acrescentaria um arquivo JSON, um schema, um loader e um selo, sem nenhum dos benefícios que justificam esse aparato. | `docs/arquitetura.md` §4.3; CLAUDE.md ("`packages/rules` — pure game rules"); achado desta spec | confirmada |
| 5 | **A avaliação só produz nota para o vencedor.** Empate, derrota do avaliado e desfecho ausente devolvem erro de domínio, nunca uma nota. É o critério de `free-duel/F05` ("derrota/empate não geram estrelas nem drop") movido para dentro da função, em vez de confiado ao chamador. | PRD F02 Error Handling; PRD `free-duel` §9 F05 | confirmada |
| 6 | **Vitória por rendição não tem pontuação.** `DecisiveDuelEndReason` inclui `"surrender"`, mas o original só define pontos para aniquilação, deck-out e Exodia. Um jogador não vence por render-se a si mesmo, e o motor não expõe ação de rendição do adversário (`SurrenderAction` carrega `player`, e a UI só a submete para P1). O caso é erro de domínio explícito, não um `0` silencioso — inventar pontos para ele seria exatamente o que a Fase 0.4 proíbe. | `packages/shared/src/duel/outcome.ts`; `packages/engine/src/end/surrender.ts`; Fase 0.4 do skill | confirmada |
| 7 | **Exodia (+40) é registrado e inalcançável.** A constante entra na tabela de tipos de vitória por fidelidade e para que a transcrição some exatamente `+139` no máximo publicado, mas o motor não implementa Exodia e nenhum caminho a produz. Registrado como pendência, não como código morto acidental. | PRD F02 Capabilities; PRD §7 | pendente — aguarda Exodia no motor |
| 8 | **A leitura por limiar satura nas duas pontas.** Um valor abaixo do primeiro limiar recebe o primeiro ponto; um valor maior ou igual a todos os limiares recebe o último. Nenhum contador precisa de teto: 40 fusões e 4 fusões recebem os mesmos `-12`. Isso torna a função total para qualquer inteiro `≥ 0` sem validação de faixa superior. | PRD F02 Capabilities; achado desta spec | confirmada |
| 9 | **Nenhum PRNG, nenhum I/O, nenhum relógio.** A avaliação é função pura e total do snapshot e do jogador. Não é `packages/engine`, mas herda a mesma disciplina: a nota precisa ser reproduzível para que o determinismo do sorteio de `free-duel/F06` (que já é determinístico por `duelSessionId`) tenha um `dropTier` estável como entrada. Uma nota não determinística reabriria o risco de recompensa divergente entre tentativas que F06 fechou. | `docs/specs/free-duel/F06-.../spec.md` Decisão 6; `arquitetura.md` §3.1 | confirmada |
| 10 | **Contadores ausentes no snapshot são erro, não zeros.** Um snapshot anterior a F01 avaliado com contadores assumidos como zero produziria `50 + 12 + 4 + 0 + 0 + 4 + 4 + 2 + 2 + 15 + 6 + 2` — nota `S-POW` — para um duelo do qual não se sabe nada. Falha silenciosa que concede a recompensa máxima é o pior desfecho possível numa feature de economia. | guidelines ("falhas viajam como valor"); `rating-engine/F01` Decisão 7 | confirmada |
| 11 | Identificadores e comentários em inglês; mensagens ao jogador em português — a convenção do repositório, seguida também por `free-duel/F05` e `F06`. | CLAUDE.md | confirmada |
| 12 | Nenhuma divisão Core/Full Scope no PRD para F02 — a spec cobre o escopo completo da Seção 6 F02. | PRD §6 F02 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/duel/result.ts` | shared | alterado | `DuelGrade` vira união fechada; `RatingEngine.evaluate` ganha `player` e retorno tipado |
| `packages/shared/src/duel/result-schema.ts` | shared | alterado | `DuelGradeSchema` como enum fechado; `RatingEvaluationSchema` ajustado |
| `packages/shared/src/duel/constants.ts` | shared | alterado | `DUEL_GRADES` — a lista fechada das dez notas, fonte única de `DuelGrade` |
| `packages/shared/src/index.ts` | shared | alterado | Exporta `DUEL_GRADES` e `DuelGradeSchema` |
| `packages/rules/src/rating/fm-score-table.ts` | rules | novo | Coeficientes, base, pontos por tipo de vitória e limites teóricos, com proveniência |
| `packages/rules/src/rating/score-duel.ts` | rules | novo | `scoreDuel` — a pontuação pura |
| `packages/rules/src/rating/grade-duel.ts` | rules | novo | `gradeFromScore` — a escada de dez notas |
| `packages/rules/src/rating/evaluate-duel.ts` | rules | novo | `evaluateDuel` — valida o snapshot, compõe pontuação, nota e recompensa |
| `packages/rules/src/rating/index.ts` | rules | novo | Reexporta o subsistema |
| `packages/rules/src/index.ts` | rules | alterado | Acrescenta os exports de `rating/` |
| `packages/rules/src/rating/fm-score-table.test.ts` | rules | novo | Verificação aritmética da transcrição (os limites `-140`/`+139`) |
| `packages/rules/src/rating/score-duel.test.ts` | rules | novo | Unitários table-driven por parâmetro e por limiar |
| `packages/rules/src/rating/score-duel.properties.test.ts` | rules | novo | Propriedades: faixa `[-140, 139]`, totalidade, determinismo, monotonicidade por parâmetro |
| `packages/rules/src/rating/grade-duel.test.ts` | rules | novo | Unitários das dez faixas e das suas fronteiras |
| `packages/rules/src/rating/grade-duel.properties.test.ts` | rules | novo | Propriedades: cobertura total da escada, sem lacuna, sem sobreposição |
| `packages/rules/src/rating/evaluate-duel.test.ts` | rules | novo | Unitários da composição e dos ramos de erro |

**Verificação da direção de dependências:**

- `packages/rules/src/rating/**` importa **apenas** `packages/shared` — nenhum import de
  `packages/data`, `packages/engine`, `packages/ai`, React, DOM, `fetch`, `node:*` ou Supabase.
  A regra `rules-depends-only-on-shared` do `.dependency-cruiser.cjs` e a regra
  `domain-cores-are-pure` valem integralmente.
- **`rules` não importa `engine`**, e é por isso que os tipos de estatística de F01 vivem em
  `shared` e não em `engine`: `evaluateDuel` recebe um `Snapshot`, que é `DuelState`, que é um tipo
  de `shared`. A direção `shared ← data ← rules ← engine` é respeitada sem inversão.
- `packages/shared/src/duel/result.ts` continua importando apenas outros arquivos de `shared`.
- `apps/web` (fora desta spec) importará `packages/rules` para montar o adaptador — direção já
  praticada por `free-duel/F06`, que importa `selectDropCardNumber` de `@yugioh/rules`.

## 3. Design Técnico

### Proveniência da fórmula

As tabelas desta seção são transcritas do Forbidden Memories original. Duas fontes independentes
foram cruzadas:

- A documentação pública do jogo, que publica a base (`50`), o mecanismo de recompensa em star chips
  por nota, e os **limites teóricos da pontuação: `-140` mínimo e `+139` máximo**.
- Uma implementação comunitária independente do cálculo de nota, que publica os limiares e os pontos
  de cada parâmetro e o corte em três faixas de pool de drop.

A conferência é aritmética e é o que sustenta a Decisão 1:

- **Mínimo:** `50 + (-12 -4 -40 -8 -12 -12 -16 -32 -7 -7) + (-40) = 50 - 150 - 40 = -140` ✔
- **Máximo:** `50 + (12 + 4 + 0 + 0 + 4 + 4 + 2 + 2 + 15 + 6) + 40 = 50 + 49 + 40 = +139` ✔
- **Corte de faixas:** a escada de dez notas coloca `S-POW`/`A-POW` em `≥ 80`, `S-TEC`/`A-TEC` em
  `≤ 19`, e as seis notas centrais entre `20` e `79` — exatamente o corte de três pools publicado
  pela outra fonte.

Os dois primeiros testes de `fm-score-table.test.ts` são essa própria conferência: uma transcrição
com um dígito errado quebra pelo menos um deles.

### Estruturas de dados

**`ScoreParameterTable`** (interno a `packages/rules`) — um parâmetro da fórmula:

| Campo | Tipo | Semântica |
|---|---|---|
| `thresholds` | `readonly [number, number, number, number]` | Os quatro limiares, estritamente crescentes |
| `points` | `readonly [number, number, number, number, number]` | Os cinco pontos, um a mais que os limiares |

A tupla de tamanho fixo (não `number[]`) é o que torna a invariante "cinco pontos para quatro
limiares" verificável pelo compilador em vez de por teste.

**`DuelScoreInput`** — o que a pontuação consome, já extraído do snapshot:

| Campo | Origem no snapshot |
|---|---|
| `turns` | `snapshot.turn` |
| `effectiveAttacks` … `triggeredTraps` | `snapshot.stats[player]` (os sete de F01) |
| `remainingCards` | `snapshot.players[player].deck.length` |
| `remainingLifePoints` | `snapshot.players[player].lp` |
| `winType` | derivado de `snapshot.outcome.reason` |

**`DuelWinType`** — `"annihilation" | "deck_out" | "exodia"`. Mapeamento a partir de
`DecisiveDuelEndReason`: `"lp_depleted"` → `"annihilation"`, `"deck_out"` → `"deck_out"`,
`"surrender"` → sem mapeamento (Decisão 6). `"exodia"` não tem origem no motor (Decisão 7).

### Tabelas de coeficientes

Base: **`50`**. Regra de leitura: o primeiro índice `i` tal que `valor < thresholds[i]` dá
`points[i]`; se o valor for `≥` a todos, dá `points[4]` (Decisão 8).

| Parâmetro | Limiares | Pontos |
|---|---|---|
| `turns` | 5, 9, 29, 33 | 12, 8, 0, −8, −12 |
| `effectiveAttacks` | 2, 4, 10, 20 | 4, 2, 0, −2, −4 |
| `defensiveVictories` | 2, 6, 10, 15 | 0, −10, −20, −30, −40 |
| `faceDownPlays` | 1, 11, 21, 31 | 0, −2, −4, −6, −8 |
| `fusions` | 1, 5, 10, 15 | 4, 0, −4, −8, −12 |
| `equips` | 1, 5, 10, 15 | 4, 0, −4, −8, −12 |
| `pureMagics` | 1, 4, 7, 10 | 2, −4, −8, −12, −16 |
| `triggeredTraps` | 1, 3, 5, 7 | 2, −8, −16, −24, −32 |
| `remainingCards` | 4, 8, 28, 32 | −7, −5, 0, 12, 15 |
| `remainingLifePoints` | 100, 1000, 7000, 8000 | −7, −5, 0, 4, 6 |

Tipo de vitória: `annihilation` `+2`; `deck_out` `−40`; `exodia` `+40`.

Observação sobre o eixo, que explica o folclore de `A-TEC` citado no PRD: os parâmetros que um
jogador "técnico" acumula (fusões, magias, equipamentos, armadilhas, cartas baixadas) só têm pontos
**positivos na faixa "nenhum"** e caem rápido a partir daí. Uma nota `TEC` alta não é uma recompensa
por técnica: é o resultado de empurrar a pontuação para baixo de propósito. A fórmula é fiel a isso
e a spec não a "corrige".

### Escada de notas

| Pontuação | Nota |
|---|---|
| ≤ 9 | `S-TEC` |
| 10–19 | `A-TEC` |
| 20–29 | `B-TEC` |
| 30–39 | `C-TEC` |
| 40–49 | `D-TEC` |
| 50–59 | `D-POW` |
| 60–69 | `C-POW` |
| 70–79 | `B-POW` |
| 80–89 | `A-POW` |
| ≥ 90 | `S-POW` |

Dez faixas de dez pontos, saturando nas duas pontas. Como o mínimo é `-140` e o máximo `+139`, a
escada cobre o intervalo inteiro sem lacuna e sem sobreposição.

### Fluxo

**`evaluateDuel(snapshot, player)`**

1. **Validar o desfecho.** `snapshot.outcome` ausente → erro `duel_outcome_missing`.
2. **Validar o vencedor.** Desfecho de empate → erro `duel_not_won_by_player`. Desfecho decisivo com
   `winner !== player` → o mesmo erro (Decisão 5).
3. **Validar o motivo.** `reason === "surrender"` → erro `unscorable_duel_end_reason` (Decisão 6).
4. **Validar os contadores.** `snapshot.stats?.[player]` ausente → erro `duel_stats_missing`
   (Decisão 10). Nenhum zero assumido.
5. **Extrair `DuelScoreInput`** do snapshot conforme a tabela de origens acima.
6. **Pontuar** com `scoreDuel`.
7. **Graduar** com `gradeFromScore`.
8. **Recompensar** com a tabela de F03 (`rewardForGrade`), obtendo `{ stars, dropTier }`.
9. **Devolver** `RatingEvaluation { grade, reward }`.

**`scoreDuel(input)`**

10. Somar a base `50`, os dez pontos por limiar e os pontos do tipo de vitória. Nenhuma validação
    de faixa: a função é total para qualquer inteiro `≥ 0` (Decisão 8).

**`gradeFromScore(score)`**

11. Mapear a pontuação para uma das dez notas pela escada. Total para qualquer inteiro.

### Regras de negócio

- Base `50`, dez parâmetros, um tipo de vitória — nada mais entra na soma.
- Pontuação sempre em `[-140, +139]` para qualquer entrada válida; o teste de propriedade é o que
  guarda a transcrição contra edição acidental.
- Exatamente dez notas; a escada é exaustiva e disjunta.
- Só o vencedor é avaliado (Decisão 5); rendição não pontua (Decisão 6).
- Contadores ausentes são erro, nunca zeros (Decisão 10).
- Nenhum coeficiente é configurável em runtime: são constantes congeladas, não dado carregado.

### Determinismo e pureza

F02 não vive em `packages/engine`, mas herda a disciplina (Decisão 9):

- `scoreDuel`, `gradeFromScore` e `evaluateDuel` são **puras e totais**: sem I/O, sem relógio, sem
  log, sem `Math.random()`, e nunca lançam — toda falha vira `Result` de erro.
- Nenhuma entrada é mutada; as tabelas são congeladas e nunca reatribuídas.
- Mesmo snapshot e mesmo jogador produzem sempre a mesma `RatingEvaluation`, o que dá a
  `free-duel/F06` um `dropTier` estável para o seu sorteio já determinístico por `duelSessionId`.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duel/constants.ts
export const DUEL_GRADES = [
  "S-TEC", "A-TEC", "B-TEC", "C-TEC", "D-TEC",
  "D-POW", "C-POW", "B-POW", "A-POW", "S-POW",
] as const;
```

```ts
// packages/shared/src/duel/result.ts — alterações
export type DuelGrade = (typeof DUEL_GRADES)[number];   // era: string

export type RatingEngine = Readonly<{
  evaluate(snapshot: Snapshot, player: PlayerId): Promise<Result<RatingEvaluation, DomainError>>;
}>;                                                      // era: evaluate(snapshot) => Result<unknown, …>
```

`RatingReward`, `MinimumRatingReward`, `RatingEvaluation`, `ConsolidatedRating` e
`ConsolidatedDuelResult` permanecem com a mesma forma — apenas o tipo de `grade` estreita.

```ts
// packages/shared/src/duel/result-schema.ts
export const DuelGradeSchema = z.enum(DUEL_GRADES);   // era: z.string().min(1)
```

### Funções públicas

```
// packages/rules/src/rating — puro, sem I/O

scoreDuel(input: DuelScoreInput): number
  // pós: -140 <= resultado <= 139
  //      total: nunca lança para qualquer contador inteiro >= 0
  //      determinístico: mesma entrada ⇒ mesma saída

gradeFromScore(score: number): DuelGrade
  // pós: resultado ∈ DUEL_GRADES
  //      score <= 9 ⇒ 'S-TEC'; 50 <= score <= 59 ⇒ 'D-POW'; score >= 90 ⇒ 'S-POW'
  //      total para qualquer inteiro, inclusive fora de [-140, 139]

evaluateDuel(snapshot: Snapshot, player: PlayerId): Result<RatingEvaluation, DomainError>
  // pré: nenhuma — toda validação é interna e devolvida como erro
  // pós: ok ⇒ { grade, reward } com reward = rewardForGrade(grade)  (F03)
  //      sem desfecho ⇒ err('duel_outcome_missing')
  //      empate ou vitória de outro jogador ⇒ err('duel_not_won_by_player')
  //      desfecho por rendição ⇒ err('unscorable_duel_end_reason')
  //      snapshot sem stats ⇒ err('duel_stats_missing')
  //      total: nunca lança; determinístico
```

Novos códigos de `DomainError`: `duel_not_won_by_player`, `unscorable_duel_end_reason`,
`duel_stats_missing`. Reusado sem redefinição: `duel_outcome_missing` (já emitido por
`readDuelOutcome`, `apps/web/src/lib/free-duel/rating-policy.ts:18`).

Exemplo de `RatingEvaluation` devolvido:

```json
{
  "grade": "A-POW",
  "reward": { "stars": 4, "dropTier": "sa-pow" }
}
```

### Contratos externos (cross-PRD)

- **`free-duel/F05` (já implementado)** — `resolveDuelResult` recebe um `RatingEngine` injetado e
  valida a saída com `RatingEvaluationSchema` antes de compor `ConsolidatedRating`. A troca do
  `unavailableRatingEngine` por um adaptador sobre `evaluateDuel` acontece em `apps/web` e está
  fora desta spec (lane curto). F02 só garante que a forma devolvida satisfaz o schema que F05 já
  valida.
- **`rating-engine/F03` (wave seguinte)** — `rewardForGrade(grade): RatingReward`. `evaluateDuel`
  a chama no passo 8. Enquanto F03 não existir, `evaluateDuel` não pode ser composta; `scoreDuel` e
  `gradeFromScore` são independentes e testáveis isoladamente.

## 5. Modelo de Dados

**Nenhuma tabela Postgres, nenhuma migração, nenhum store IndexedDB, nenhum arquivo de dados novo.**

Esta é a Decisão 4 em forma concreta: os coeficientes são constantes de código em
`packages/rules/src/rating/fm-score-table.ts`, não um JSON em `packages/data/config/`. Não há
loader, não há schema de arquivo, não há entrada no selo do dataset (`dataset-seal.json`) e não há
versionamento independente — mudar um coeficiente é mudar a regra do jogo, e passa por revisão de
código como qualquer outra regra.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Snapshot sem `outcome` (duelo ainda em andamento) | passo 1 de `evaluateDuel` | `err('duel_outcome_missing')`; nenhuma nota | `free-duel/F05` já aplica a recompensa mínima e exibe "Não foi possível avaliar a nota; recompensa mínima aplicada." |
| Desfecho de empate | passo 2 | `err('duel_not_won_by_player')` | idem — mas F05 nunca chega a chamar a avaliação em empate |
| Desfecho decisivo com `winner` diferente do jogador avaliado | passo 2 | `err('duel_not_won_by_player')` | idem |
| Vitória por rendição | passo 3 | `err('unscorable_duel_end_reason')` (Decisão 6) | idem |
| Snapshot sem `stats` (anterior a F01) | passo 4 | `err('duel_stats_missing')`; **nunca** zeros assumidos (Decisão 10) | idem |
| Contador muito acima do último limiar (ex.: 200 fusões) | nenhuma — não é erro | Satura no último ponto da tabela (Decisão 8) | nenhuma |
| Deck vazio no fim (vitória por deck-out do adversário com o próprio deck no limite) | nenhuma — não é erro | `remainingCards = 0` cai na primeira faixa (`-7`) | nenhuma |
| Pontuação fora de `[-140, 139]` | impossível pela aritmética; guardado por teste de propriedade | Se acontecer, é transcrição corrompida — o teste de propriedade falha no CI antes do deploy | nenhuma |
| Nota nova acrescentada a `DUEL_GRADES` sem entrada na tabela de F03 | `tsc` — o `Record<DuelGrade, RatingReward>` de F03 deixa de ser exaustivo | Erro de compilação, não bug em produção (Decisão 2) | nenhuma |

Nenhuma mensagem nova ao jogador é introduzida por F02: todos os ramos de erro caem no fallback de
recompensa mínima que `free-duel/F05` já implementa e já tem mensagem.

## 7. Estratégia de Testes

### Unitários (Vitest)

`fm-score-table` — a verificação da transcrição (Decisão 1):

- `the minimum achievable score is exactly -140`
- `the maximum achievable score is exactly +139`
- `every parameter table has exactly four thresholds and five point values`
- `every parameter table has strictly increasing thresholds`

`scoreDuel` — table-driven, um caso por parâmetro cobrindo as cinco faixas:

- `scoreDuel awards 12 points for a duel of fewer than 5 turns`
- `scoreDuel awards -12 points for a duel of 33 turns or more`
- `scoreDuel awards 4 points for fewer than 2 effective attacks`
- `scoreDuel awards -40 points for 15 or more defensive victories`
- `scoreDuel awards 0 points for zero face-down plays`
- `scoreDuel awards -12 points for 15 or more fusions`
- `scoreDuel awards -12 points for 15 or more equips`
- `scoreDuel awards -16 points for 10 or more pure magics`
- `scoreDuel awards 2 points for zero triggered traps`
- `scoreDuel awards 15 points for 32 or more remaining deck cards`
- `scoreDuel awards 6 points for 8000 remaining life points`
- `scoreDuel adds 2 points for an annihilation win`
- `scoreDuel subtracts 40 points for a deck-out win`
- `scoreDuel adds 40 points for an exodia win`
- `scoreDuel saturates at the last point value for a counter far above every threshold`
- `scoreDuel returns exactly 50 for the base case with neutral parameters`

`gradeFromScore` — as dez faixas e as suas fronteiras:

- `gradeFromScore returns S-TEC at 9 and below`
- `gradeFromScore returns A-TEC at exactly 10 and at 19`
- `gradeFromScore returns D-TEC at exactly 40 and at 49`
- `gradeFromScore returns D-POW at exactly 50 and at 59`
- `gradeFromScore returns A-POW at exactly 80 and at 89`
- `gradeFromScore returns S-POW at exactly 90 and above`
- `gradeFromScore returns S-TEC at the theoretical minimum of -140`
- `gradeFromScore returns S-POW at the theoretical maximum of 139`

`evaluateDuel` — a composição e os quatro ramos de erro:

- `evaluateDuel returns a grade and a reward for the winning player`
- `evaluateDuel returns duel_outcome_missing when the snapshot has no outcome`
- `evaluateDuel returns duel_not_won_by_player for a draw`
- `evaluateDuel returns duel_not_won_by_player when the player lost`
- `evaluateDuel returns unscorable_duel_end_reason for a surrender win`
- `evaluateDuel returns duel_stats_missing when the snapshot carries no stats`
- `evaluateDuel never assumes zeroed counters for a snapshot without stats`
- `evaluateDuel reads the counters of the evaluated player and not of the opponent`
- `evaluateDuel maps lp_depleted to an annihilation win and deck_out to a deck-out win`

### Property-based (fast-check)

- **Faixa da pontuação:** para qualquer `DuelScoreInput` com contadores inteiros `≥ 0`, turno `≥ 1`,
  deck de `0` a `40` e LP de `0` a `8000`, `scoreDuel` devolve um valor em `[-140, 139]`. Esta é a
  propriedade que valida a transcrição contra edição acidental — 1.000 execuções.
- **Exaustividade da escada:** para qualquer inteiro, `gradeFromScore` devolve um valor pertencente
  a `DUEL_GRADES`, e a nota é a mesma para dois valores da mesma faixa de dez e diferente para
  valores de faixas adjacentes. 1.000 execuções.
- **Monotonicidade por parâmetro:** para cada um dos dez parâmetros isoladamente, aumentar o valor
  nunca aumenta a contribuição em pontos, **exceto** `remainingCards` e `remainingLifePoints`, onde
  a relação é a inversa (mais cartas e mais vida valem mais). Codifica o sentido de cada tabela e
  pega uma transposição de sinal na transcrição. 1.000 execuções.
- **Determinismo:** para qualquer `(snapshot, player)` fixos, `evaluateDuel` chamado repetidamente
  (1 a 20 vezes) devolve resultados profundamente iguais. 1.000 execuções.
- **Totalidade:** para qualquer combinação arbitrária de snapshot (incluindo sem `outcome`, sem
  `stats`, com empate, com rendição) e jogador, `evaluateDuel` nunca lança — sempre devolve
  `Result`. 1.000 execuções.

### Integração

- `a duel played to lp_depleted in few turns with few cards used grades into the POW band` — parte
  de um `DuelState` real produzido pelo motor (F01 já acumulou), não de um input sintético.
- `a duel won slowly with many fusions and magics grades into the TEC band` — o caminho oposto,
  demonstrando que o eixo funciona ponta a ponta.
- `a duel won by the opponent's deck-out grades lower than the same duel won by annihilation` —
  isola o efeito do tipo de vitória sobre um estado por outro lado idêntico.

### Análise estática

- `packages/rules/src/rating/**` não importa `packages/data`, `packages/engine`, `packages/ai`,
  React, DOM, `fetch`, `node:*` nem Supabase (regras `rules-depends-only-on-shared` e
  `domain-cores-are-pure` do `.dependency-cruiser.cjs`).
- Nenhum arquivo de `packages/rules/src/rating/**` usa `Math.random()`, `Date`, `console` ou
  função assíncrona.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1, incluindo a exaustividade da
  tabela de F03 sobre `DuelGrade`.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F02) | Teste |
|---|---|
| A pontuação é `50 + Σ(dez parâmetros) + tipo de vitória`, com os coeficientes da tabela | Toda a suíte table-driven de `scoreDuel` + `scoreDuel returns exactly 50 for the base case with neutral parameters` |
| Cada parâmetro usa o primeiro limiar tal que `valor < limiar`; valores acima de todos recebem o último ponto | `scoreDuel saturates at the last point value...` + os casos de fronteira de cada parâmetro |
| A pontuação de qualquer duelo válido cai em `[-140, +139]` | Propriedade de faixa da pontuação + `the minimum achievable score is exactly -140` + `the maximum achievable score is exactly +139` |
| Vencer por LP zerados soma `+2`; vencer por deck-out do adversário soma `−40` | `scoreDuel adds 2 points for an annihilation win` + `scoreDuel subtracts 40 points for a deck-out win` + `evaluateDuel maps lp_depleted to an annihilation win...` |
| A nota é uma das dez, em faixas de dez pontos, sem lacuna e sem sobreposição | Toda a suíte de `gradeFromScore` + propriedade de exaustividade da escada |
| Vitória rápida e agressiva produz faixa `POW`; vitória lenta e carregada de fusões produz faixa `TEC` | `a duel played to lp_depleted in few turns... grades into the POW band` + `a duel won slowly with many fusions and magics grades into the TEC band` |
| O mesmo snapshot avaliado 1.000 vezes devolve a mesma nota; nenhum PRNG, relógio ou I/O | Propriedade de determinismo + análise estática (sem `Math.random`, `Date`, `console`, `async`) |
| Snapshot sem desfecho, com empate, com derrota, ou sem contadores devolve erro e nenhuma nota | `evaluateDuel returns duel_outcome_missing...` + `...duel_not_won_by_player for a draw` + `...when the player lost` + `...duel_stats_missing...` + `evaluateDuel never assumes zeroed counters...` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: os contadores que F01 acumula são exatamente os que F02 lê; nenhum parâmetro fica sem fonte | `evaluateDuel reads the counters of the evaluated player and not of the opponent` + os três testes de integração, que partem de estados reais do motor |
| Cross-Feature: uma vitória por deck-out com deck cheio e muitos turnos chega a uma faixa `TEC` | `a duel won by the opponent's deck-out grades lower than the same duel won by annihilation` + `a duel won slowly with many fusions and magics grades into the TEC band` |
| Cross-PRD (`free-duel/F05`): passa a receber nota real e deixa de aplicar a recompensa mínima no caminho feliz | Teste de contrato: a saída de `evaluateDuel` satisfaz `RatingEvaluationSchema` (o schema que `resolveDuelResult` já valida) para todas as dez notas |
| Cross-PRD (`docs/arquitetura.md` §10): a escala de notas deixa de ser pendência | `DUEL_GRADES` tem exatamente dez entradas e `DuelGradeSchema` as aceita todas — teste que falha se a escala for alterada sem revisão |
