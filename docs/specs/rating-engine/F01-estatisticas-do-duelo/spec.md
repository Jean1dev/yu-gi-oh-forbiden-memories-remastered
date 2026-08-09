# Estatísticas do Duelo

> PRD: `docs/prds/rating-engine.md` — F01
> Pacote-alvo: `packages/shared` + `packages/engine`

## 1. Contexto e Escopo

F01 é a Foundation do módulo Rating Engine e a **única** feature dele que toca o Motor de Duelo. Ela
acrescenta ao `DuelState` sete contadores por jogador que registram **como** o duelo foi jogado — e
que hoje não existem em lugar nenhum do repositório. Sem eles, a fórmula de nota de F02 fica sem
sete dos seus dez parâmetros e a distinção `POW`/`TEC` é matematicamente impossível: as duas notas
descrevem trajetórias diferentes que terminam no mesmo estado final.

O desenho segue o mesmo padrão aditivo que `motor-duelo-1x1` F01–F12 já usaram para crescer o
`DuelState` (`outcome`, `attackLocks`, `pendingFusion`, `deckOutPlayer`): um campo novo, um schema
zod correspondente, e um post-step central em `apply` — irmão de `stampOutcome`
(`packages/engine/src/turn/apply.ts:58`) — em vez de incrementos espalhados pelas oito ações que
poderiam contar alguma coisa. Nenhuma regra de duelo muda de comportamento; a instrumentação é
puramente observacional.

Esta feature entrega os contadores. **Não** calcula pontuação, não produz nota e não conhece a
fórmula — isso é F02, que lê o snapshot final e não importa nada de `packages/engine`.

### Incluído

- Sete contadores inteiros `≥ 0` por jogador (`effectiveAttacks`, `defensiveVictories`,
  `faceDownPlays`, `fusions`, `equips`, `pureMagics`, `triggeredTraps`), zerados em `initDuel`
- Campo `stats` **obrigatório** no `DuelState` e no `DuelStateSchema`, com round-trip de
  serialização preservado (`motor-duelo-1x1` F05)
- Um acumulador puro chamado num único ponto de `apply`, derivado do estado anterior à ação, da
  própria ação e dos eventos que ela emitiu
- Congelamento junto com o resto do estado quando o duelo termina (`motor-duelo-1x1` F12)

### Fronteiras

- **Cálculo de pontuação, nota e recompensa** → F02 e F03 deste PRD. F01 não conhece coeficiente,
  limiar nem escala.
- **Duração em turnos, cartas restantes no deck e pontos de vida restantes** → já existem em
  `DuelState` (`turn`, `players[p].deck.length`, `players[p].lp`). F01 **não** os duplica em
  contador: um contador redundante pode divergir do estado, e a Seção 6 do PRD é explícita sobre os
  três serem lidos do estado final.
- **Exibir os contadores ao jogador** → Seção 7 do PRD (fora de escopo). F01 os disponibiliza; a
  tela de resultado decide depois se os mostra.
- **Nota para o perdedor, empate ou duelo abandonado** → sem nota por decisão de `free-duel/F05`.
  F01 mesmo assim conta para **os dois** jogadores, porque o motor não sabe quem é "o jogador".

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A acumulação acontece num **único post-step** de `apply`, ao lado de `stampOutcome`, e não dentro de cada ação. Motivo idêntico ao registrado por `motor-duelo-1x1/F12` para `stampOutcome`: "manter ambos aqui em vez de dentro de cada ação significa que nenhuma ação pode esquecer nenhum dos dois". Uma ação futura que emita eventos passa a contar sem alteração no acumulador. | `packages/engine/src/turn/apply.ts:28-37` (comentário de F12); achado desta spec | confirmada |
| 2 | A atribuição de contador é feita **pela ação**, não pelo evento, sempre que a ação identifica o jogador sem ambiguidade. Motivo: `onSet` é emitido por cinco caminhos diferentes (`activate-spell.ts:81`, `equip-card.ts:109`, `play-field-spell.ts:66`, `play-spell-or-trap.ts:123`, `summon-monster.ts:104`), então contar `onSet` misturaria equipamento, magia, terreno, armadilha e monstro virado para baixo num contador só. Os eventos são usados **apenas** onde a ação não basta — o par ataque/defesa (Decisão 3). | achado desta spec (inspeção dos emissores de `onSet`) | confirmada |
| 3 | `effectiveAttacks` e `defensiveVictories` são derivados de `resolve_attack` cruzando o **estado anterior** com os eventos `onDestroy` resultantes. Necessário porque `resolveAttack` emite `onDestroy` com `originPlayer: attackerPlayer` para **ambas** as destruições (`resolve-attack.ts:181-200`) — quem foi destruído só se distingue por `involvedZones[0].player`. E a **posição** do defensor precisa vir do estado anterior, porque `resolveAttack` revela um defensor virado para baixo antes de resolver o combate (`resolve-attack.ts:96-115`); a postura (ataque/defesa) é preservada pela revelação, então ler do estado anterior é correto e é a única leitura disponível quando o zone foi esvaziado. | `packages/engine/src/combat/resolve-attack.ts`; achado desta spec | confirmada |
| 4 | `faceDownPlays` conta **invocação de monstro em posição virada para baixo** e **armadilha baixada**. Não conta magia, equipamento nem terreno, porque `playSpellOrTrap` só coloca virado para baixo quando `card.tipo === "armadilha"` (`play-spell-or-trap.ts:103`) — magia e equipamento entram com a face para cima. Isso reproduz "cartas que o jogador baixou durante o duelo" do original sem inventar semântica. | `packages/engine/src/spells/play-spell-or-trap.ts:103`; PRD F01 Capabilities | confirmada |
| 5 | `complete_fusion` incrementa **apenas** `fusions`, mesmo quando a colocação do resultado é `equip`, `activate_spell`, `field_spell` ou `spell_or_trap`. Uma fusão consome a jogada única da mão do turno (`fusion-system/F02`) e é uma jogada só; contá-la duas vezes inflaria dois parâmetros da fórmula a partir de um único ato do jogador. | `docs/prds/fusion-system.md` F02 Capabilities ("consome uma jogada"); achado desta spec | confirmada |
| 6 | `triggeredTraps` existe, é serializado, alimenta a fórmula e permanece **sempre `0`**, porque o motor não implementa ativação de armadilha. O valor `0` não é um placeholder inventado: é a contagem verdadeira de um duelo em que nenhuma armadilha disparou, e a fórmula de F02 já atribui a esse caso o ponto de "nenhuma armadilha" (`+2`). Nenhum valor é simulado. | PRD F01 "PENDÊNCIA DECLARADA"; Fase 0.4 do skill | pendente — aguarda ativação de armadilha no motor |
| 7 | O campo `stats` é **obrigatório**, não opcional. Um `stats` opcional forçaria todo consumidor a escolher entre erro e assumir zeros, e assumir zeros produz silenciosamente uma nota errada (`50 + 12 + 4 + 0 + 0 + 4 + 4 + 2 + 2` com deck cheio e poucos turnos = nota `S-POW` para um duelo que pode ter sido péssimo). Estados serializados antes desta feature falham na validação zod, que é o comportamento desejado — F02 registra isso como erro de domínio explícito. | guidelines ("falhas viajam como valor"); PRD F02 Error Handling | confirmada |
| 8 | Contadores são **monotônicos crescentes**: nunca decrementam, nunca são zerados durante o duelo, e o acumulador nunca reduz um valor existente. Isso torna a acumulação segura sob reprocessamento parcial e torna a propriedade de monotonicidade testável por fast-check. | PRD F01 Capabilities ("nunca decrementados"); guidelines §14 | confirmada |
| 9 | Uma ação **recusada** pelo motor não incrementa nada, porque o post-step só roda no ramo `ok` de `dispatch` — exatamente como `stampOutcome`. Nenhuma guarda adicional é necessária. | `packages/engine/src/turn/apply.ts:57-58` | confirmada |
| 10 | Nenhuma divisão Core/Full Scope no PRD para F01 — a spec cobre o escopo completo da Seção 6 F01. | PRD §6 F01 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/duel/stats.ts` | shared | novo | Tipos `DuelStats`, `DuelStatsByPlayer`, `DuelStatCounter` |
| `packages/shared/src/duel/types.ts` | shared | alterado | `DuelState` ganha o campo obrigatório `stats` |
| `packages/shared/src/duel/schema.ts` | shared | alterado | `DuelStatsSchema` + campo `stats` em `DuelStateSchema` + guarda de tipo |
| `packages/shared/src/duel/constants.ts` | shared | alterado | `DUEL_STAT_COUNTERS` — a lista fechada dos sete nomes, fonte única de `DuelStatCounter` |
| `packages/shared/src/index.ts` | shared | alterado | Exporta os novos tipos e o schema |
| `packages/engine/src/stats/empty-stats.ts` | engine | novo | `emptyDuelStats()` / `emptyDuelStatsByPlayer()` — o zero de cada contador |
| `packages/engine/src/stats/accumulate-stats.ts` | engine | novo | `accumulateStats(preState, action, result)` — o acumulador puro |
| `packages/engine/src/stats/index.ts` | engine | novo | Reexporta o subsistema |
| `packages/engine/src/turn/apply.ts` | engine | alterado | Encadeia `accumulateStats` antes de `stampOutcome` no ramo `ok` |
| `packages/engine/src/initialization/init-duel.ts` | engine | alterado | Inicializa `stats` zerado para os dois jogadores |
| `packages/engine/src/index.ts` | engine | alterado | Exporta o subsistema de estatísticas |
| `packages/engine/src/stats/accumulate-stats.test.ts` | engine | novo | Unitários table-driven por contador |
| `packages/engine/src/stats/accumulate-stats.properties.test.ts` | engine | novo | Propriedades: monotonicidade, totalidade, não-interferência |
| `packages/engine/src/serialization/round-trip.properties.test.ts` | engine | alterado | Cobre `stats` no round-trip |
| `packages/engine/src/initialization/init-duel.test.ts` | engine | alterado | Cobre a inicialização zerada |
| `packages/shared/src/duel/schema.test.ts` | shared | alterado | Cobre `DuelStatsSchema` e a obrigatoriedade do campo |

**Verificação da direção de dependências:**

- `packages/shared/src/duel/stats.ts` importa apenas outros arquivos de `packages/shared` — nenhuma
  dependência de pacote, como todo o resto de `shared`.
- `packages/engine/src/stats/**` importa **apenas** `packages/shared`. Nenhum import de
  `packages/rules`, `packages/data`, `packages/ai`, React, DOM, `fetch`, `node:*` ou Supabase — o
  pilar 1 de `docs/arquitetura.md` §3.1 vale integralmente aqui.
- A direção `shared ← data ← rules ← engine ← ai` é respeitada: `engine` importando `shared` é o
  sentido correto, e nada passa a importar `engine`.
- F02 e F03 (as outras features deste PRD) viverão em `packages/rules`, que **não** importa
  `engine`. Elas consomem o snapshot como dado de `shared`, não a implementação do motor — por isso
  os tipos de estatística vivem em `shared`, não em `engine`.

## 3. Design Técnico

### Estruturas de dados

**`DuelStats`** (`packages/shared`) — os contadores de um jogador. Todos inteiros `≥ 0`, todos
obrigatórios, nenhum opcional:

| Campo | Semântica |
|---|---|
| `effectiveAttacks` | Quantas vezes um monstro deste jogador destruiu um monstro adversário que estava em **postura de ataque** |
| `defensiveVictories` | Quantas vezes um monstro deste jogador em **postura de defesa** sobreviveu a um ataque adversário |
| `faceDownPlays` | Quantas cartas este jogador baixou viradas para baixo (monstro em posição virada para baixo + armadilha) |
| `fusions` | Quantas fusões este jogador concluiu |
| `equips` | Quantas magias de equipamento este jogador jogou |
| `pureMagics` | Quantas magias de efeito ou de terreno este jogador ativou |
| `triggeredTraps` | Quantas armadilhas este jogador disparou (sempre `0` — Decisão 6) |

**`DuelStatsByPlayer`** — `Readonly<Record<PlayerId, DuelStats>>`, a mesma forma de
`DuelState["players"]`, para que `stats` seja indexado exatamente como o resto do estado.

**`DUEL_STAT_COUNTERS`** (`packages/shared/src/duel/constants.ts`) — a lista fechada dos sete nomes,
no mesmo padrão de `EVENT_TYPES` e `LP_CHANGE_KINDS`: `DuelStatCounter` deriva dela em vez de
redeclarar a união, e o schema zod itera sobre ela em vez de repetir sete linhas idênticas.

**`DuelState.stats`** — `DuelStatsByPlayer`, campo obrigatório, posicionado junto de `seed` e
`turn` (estado global do duelo, não estado de jogador), pelo mesmo motivo que `turn` não vive dentro
de `PlayerState`: é uma dimensão do duelo indexada por jogador, não uma propriedade do jogador.

### Fluxo

**Inicialização**

1. `initDuel` monta `stats: { P1: emptyDuelStats(), P2: emptyDuelStats() }`, com os sete contadores
   em `0`. Nenhuma outra parte da inicialização muda.

**Acumulação — o post-step de `apply`**

2. `apply` chama `dispatch`. No ramo de erro, nada acontece (Decisão 9).
3. No ramo `ok`, `accumulateStats(preState, action, applyResult)` roda **antes** de `stampOutcome`.
   A ordem importa: um duelo que acabou de terminar ainda deve contabilizar a jogada que o encerrou.
4. `accumulateStats` produz os incrementos daquela transição e devolve um `ApplyResult` novo com
   `state.stats` atualizado. Os eventos passam intocados — a acumulação não emite evento nenhum.
5. `stampOutcome` recebe esse resultado e carimba o desfecho, se houver. Um duelo encerrado congela
   `stats` junto com o resto do estado, porque `apply` recusa toda ação seguinte.

**Derivação por ação**

6. `summon_monster` com `position` virada para baixo (`attack_face_down` ou `defense_face_down`) →
   `faceDownPlays` de `action.player`.
7. `play_spell_or_trap` cuja carta seja `tipo: "armadilha"` → `faceDownPlays` de
   `preState.activePlayer` (Decisão 4). A carta é lida de `preState.players[activePlayer].hand[action.handIndex]`.
8. `equip_card` → `equips` de `preState.activePlayer`.
9. `activate_spell` e `play_field_spell` → `pureMagics` de `preState.activePlayer`.
10. `complete_fusion` → `fusions` de `preState.pendingFusion.player` (Decisão 5). A ação em si não
    carrega o jogador; a pendência carrega.
11. `advance_phase`, `change_position`, `declare_attack`, `begin_fusion` e `surrender` não
    incrementam contador algum.

**Derivação do par ataque/defesa (`resolve_attack`)**

12. Ler do `preState` a janela pendente: `preState.pending.event.involvedZones` = `[refAtacante,
    refAlvo?]`. Sem `refAlvo` (ataque direto), nada é contado — não há monstro destruído nem
    monstro defendendo.
13. Ler a **postura do alvo no estado anterior**: `preState.players[refAlvo.player]
    .field.monsters[refAlvo.index].position`. Postura de ataque = `attack_face_up` ou
    `attack_face_down`; de defesa = as outras duas. A revelação que `resolveAttack` faz preserva a
    postura, então a leitura anterior é fiel (Decisão 3).
14. Procurar nos eventos do resultado um `onDestroy` cujo `involvedZones[0]` seja **igual ao
    `refAlvo`** (mesmo jogador, mesmo tipo de zona, mesmo índice). Presente = o alvo foi destruído.
15. Alvo destruído **e** postura de ataque → `effectiveAttacks` de `refAtacante.player`.
16. Alvo **não** destruído **e** postura de defesa → `defensiveVictories` de `refAlvo.player` — do
    dono do monstro que defendeu, não do atacante.
17. Alvo destruído em postura de defesa, e alvo sobrevivente em postura de ataque, não incrementam
    nada: nenhum dos dois é um dos dois casos do original.

### Regras de negócio

- Sete contadores, por jogador, inteiros `≥ 0`, monotônicos crescentes (Decisão 8).
- Um único ato do jogador incrementa **no máximo um** contador (Decisão 5).
- Ação recusada não conta (Decisão 9).
- Ataque direto (sem alvo) não conta nem ataque efetivo nem vitória defensiva.
- `defensiveVictories` é creditado ao **dono do monstro atacado**, invertendo a atribuição padrão de
  "quem agiu" — é a única inversão do acumulador e a única atribuição que não segue `activePlayer`
  ou `action.player`.
- Instrumentar não muda regra: nenhum teste existente de invocação, combate, fase, fusão, magia ou
  fim de duelo pode mudar de resultado por causa desta feature.

### Eventos

F01 **consome** eventos, nunca emite. Os únicos eventos lidos são os `onDestroy` produzidos por
`resolveAttack` (`resolve-attack.ts:181-200`), e apenas para responder "o alvo foi destruído?".
Nenhum evento novo entra em `EVENT_TYPES`, que permanece fechado em dez (`motor-duelo-1x1` F02,
`docs/arquitetura.md` §3.3).

### Determinismo e pureza

Obrigatório — esta feature toca `packages/engine`:

- `accumulateStats` e `emptyDuelStats` são funções **puras e totais**: sem I/O, sem relógio, sem
  log, sem `Math.random()`, e nunca lançam. Não recebem nem consultam o PRNG semeado.
- Nenhuma entrada é mutada. O acumulador devolve um `ApplyResult` novo com um `stats` novo, no mesmo
  estilo imutável de `stampOutcome` e `withMonsterZone`.
- `stats` é 100% JSON-serializável — só inteiros — então o invariante de `DuelState` ("nenhuma
  função, classe, `Map` ou `Set` em nenhum campo", `types.ts:83-87`) continua valendo, e o
  round-trip `deserialize(serialize(s)) == s` de `motor-duelo-1x1/F05` se estende ao campo novo sem
  tratamento especial.
- `atk`/`def` base nunca são tocados — a feature não participa de cálculo de combate, só o observa.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duel/constants.ts
export const DUEL_STAT_COUNTERS = [
  "effectiveAttacks",
  "defensiveVictories",
  "faceDownPlays",
  "fusions",
  "equips",
  "pureMagics",
  "triggeredTraps",
] as const;
```

```ts
// packages/shared/src/duel/stats.ts
export type DuelStatCounter = (typeof DUEL_STAT_COUNTERS)[number];

export type DuelStats = Readonly<Record<DuelStatCounter, number>>;

export type DuelStatsByPlayer = Readonly<Record<PlayerId, DuelStats>>;
```

```ts
// packages/shared/src/duel/types.ts — acréscimo ao DuelState
stats: DuelStatsByPlayer;   // obrigatório; zerado por initDuel (Decisão 7)
```

```ts
// packages/shared/src/duel/schema.ts
export const DuelStatsSchema;        // strictObject: sete chaves, z.number().int().min(0)
export const DuelStatsByPlayerSchema; // strictObject: { P1: DuelStatsSchema, P2: DuelStatsSchema }
// DuelStateSchema ganha: stats: DuelStatsByPlayerSchema
```

A guarda `const _schemaMatchesDeclaredType: DuelState = {} as z.infer<typeof DuelStateSchema>`
(`schema.ts:303`) já existente passa a cobrir o campo novo automaticamente: se o tipo e o schema
divergirem, o typecheck quebra ali.

Exemplo do campo dentro de um snapshot:

```json
{
  "stats": {
    "P1": {
      "effectiveAttacks": 3,
      "defensiveVictories": 0,
      "faceDownPlays": 1,
      "fusions": 2,
      "equips": 1,
      "pureMagics": 0,
      "triggeredTraps": 0
    },
    "P2": {
      "effectiveAttacks": 0,
      "defensiveVictories": 1,
      "faceDownPlays": 4,
      "fusions": 0,
      "equips": 0,
      "pureMagics": 2,
      "triggeredTraps": 0
    }
  }
}
```

### Funções públicas

```
// packages/engine/src/stats — puro, sem I/O

emptyDuelStats(): DuelStats
  // pós: todos os sete contadores em 0

emptyDuelStatsByPlayer(): DuelStatsByPlayer
  // pós: P1 e P2 com emptyDuelStats()

accumulateStats(
  preState: DuelState,
  action: Action,
  result: ApplyResult,
): ApplyResult
  // pré: `result` é o ramo ok de dispatch(preState, action)
  // pós: result.events devolvido intocado
  //      para todo contador c e jogador p: saida.state.stats[p][c] >= preState.stats[p][c]
  //      a soma total de incrementos numa única chamada é 0 ou 1
  //      total: nunca lança; puro: mesma entrada ⇒ mesma saída
```

### Contratos externos (cross-PRD)

- **`motor-duelo-1x1` F01/F02/F05 (já implementados)** — `DuelState`, `Action`, `ApplyResult`,
  `DuelEvent`, `ZoneReference`, `serialize`/`load`. F01 estende `DuelState` de forma aditiva, no
  mesmo padrão que F07–F12 já usaram, e não redefine nenhum desses contratos.
- **`rating-engine` F02 (esta wave + 1)** — consumirá `snapshot.stats[player]` junto de
  `snapshot.turn`, `snapshot.players[player].deck.length` e `snapshot.players[player].lp`. F01 não
  antecipa a fórmula; só garante que os sete valores existem e são fiéis.

## 5. Modelo de Dados

**Nenhuma tabela Postgres, nenhuma migração, nenhum store IndexedDB novo.** Os contadores vivem
dentro do `DuelState`, que já é serializado inteiro pelo mecanismo de snapshot de
`motor-duelo-1x1/F05` e nunca foi persistido no Supabase — a persistência do Free Duel guarda
coleção, deck ativo e ledger de recompensa, não estado de duelo (`docs/arquitetura.md` §5.1).

**Compatibilidade de snapshots antigos:** como `stats` é obrigatório (Decisão 7), um snapshot
serializado antes desta feature falha em `DuelStateSchema` ao ser carregado por `load`. Isso é
intencional e não é uma quebra de produção: nenhum snapshot de duelo é persistido além da execução
do app. Um estado de duelo em memória de uma aba aberta durante o deploy é descartado no reload,
que é o mesmo comportamento que qualquer mudança aditiva anterior de `DuelState` já produziu.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Ação recusada pelo motor (fase errada, jogador errado, índice inválido) | ramo de erro de `dispatch`; o post-step não roda | Nenhum contador incrementa | nenhuma (o erro da ação já tem a sua) |
| `resolve_attack` sem alvo (ataque direto) | `involvedZones[1]` ausente no `preState.pending` | Nenhum contador incrementa | nenhuma |
| `resolve_attack` em que **ambos** os monstros são destruídos | `onDestroy` para as duas zonas; a checagem do passo 14 casa só com a zona do alvo | `effectiveAttacks` incrementa se o alvo estava em ataque; a destruição do atacante não conta para ninguém | nenhuma |
| `resolve_attack` em que nenhum monstro é destruído e o alvo estava em ataque | nenhum `onDestroy` para a zona do alvo, postura de ataque | Nenhum contador incrementa (não é ataque efetivo nem vitória defensiva) | nenhuma |
| Alvo destruído estando em postura de defesa | `onDestroy` na zona do alvo, postura de defesa | Nenhum contador incrementa | nenhuma |
| `complete_fusion` sem `pendingFusion` no estado anterior | impossível: `completeFusion` já recusa nesse caso, e o post-step só roda no ramo `ok` | Guarda defensiva: sem `pendingFusion`, nenhum incremento, sem lançar (função total) | nenhuma |
| `play_spell_or_trap` com `handIndex` fora da mão no estado anterior | impossível: a ação já teria sido recusada | Guarda defensiva: carta ausente ⇒ nenhum incremento | nenhuma |
| Snapshot antigo sem `stats` sendo carregado por `load` | `DuelStateSchema` rejeita o campo ausente | `load` devolve erro de domínio, como já faz para qualquer snapshot malformado | mensagem já existente de snapshot inválido |
| Duelo já encerrado recebendo nova ação | `apply` recusa antes de `dispatch` (`apply.ts:48-55`) | Contadores congelados junto com o resto do estado | "O duelo já terminou." (já existente) |
| Contador ultrapassando os limiares mais altos da fórmula (ex.: 40 fusões) | nenhuma — não é erro | Contador segue crescendo; F02 satura no último ponto da tabela | nenhuma |

Nenhuma mensagem nova ao jogador é introduzida por F01. A feature é inteiramente interna ao motor.

## 7. Estratégia de Testes

### Unitários (Vitest)

`emptyDuelStats` / inicialização:

- `emptyDuelStats returns every counter at zero`
- `initDuel starts both players with zeroed stats`

`accumulateStats` — table-driven, um caso por contador e por ramo:

- `accumulateStats counts a face-down summon as a face-down play for the acting player`
- `accumulateStats does not count a face-up summon as a face-down play`
- `accumulateStats counts a trap set as a face-down play`
- `accumulateStats does not count a magic played to a spell zone as a face-down play`
- `accumulateStats counts equip_card as an equip for the active player`
- `accumulateStats counts activate_spell as a pure magic for the active player`
- `accumulateStats counts play_field_spell as a pure magic for the active player`
- `accumulateStats counts complete_fusion as a fusion for the pending fusion owner`
- `accumulateStats counts complete_fusion only once even when the placement is an equip`
- `accumulateStats counts an attack that destroys a defender in attack position as an effective attack`
- `accumulateStats does not count an attack that destroys a defender in defense position`
- `accumulateStats counts a surviving defender in defense position as a defensive victory for the defender's owner`
- `accumulateStats does not count a surviving defender in attack position`
- `accumulateStats ignores a direct attack with no target`
- `accumulateStats credits the effective attack to the attacker and never to the defender`
- `accumulateStats leaves every counter untouched for advance_phase, change_position, declare_attack, begin_fusion and surrender`
- `accumulateStats returns the events array unchanged`
- `accumulateStats never leaves triggeredTraps above zero`

`DuelStatsSchema` (`packages/shared`):

- `DuelStatsSchema rejects a negative counter`
- `DuelStatsSchema rejects a fractional counter`
- `DuelStatsSchema rejects an unknown counter key`
- `DuelStateSchema rejects a state without stats`

### Property-based (fast-check)

- **Monotonicidade:** para qualquer estado e qualquer ação aceita, todo contador do resultado é
  `≥` ao contador correspondente do estado anterior. 1.000 execuções.
- **Incremento unitário:** a soma de todos os incrementos numa única chamada de `accumulateStats`
  é `0` ou `1` — nenhum ato do jogador move dois contadores (Decisão 5). 1.000 execuções.
- **Totalidade:** para qualquer combinação arbitrária de estado, ação e resultado, `accumulateStats`
  nunca lança. 1.000 execuções.
- **Não-interferência:** para qualquer estado e ação, o resultado de `accumulateStats` difere do
  `ApplyResult` de entrada **somente** no campo `stats` — todo o resto do estado e os eventos são
  profundamente iguais. Esta é a propriedade que garante "instrumentar não muda regra". 1.000
  execuções.
- **Round-trip com `stats`** (estende o property test existente de `motor-duelo-1x1/F05`):
  `deserialize(serialize(s)) == s` continua valendo para estados com contadores arbitrários.
  1.000 execuções.

### Integração

- `a full duel from initDuel to outcome accumulates a consistent set of counters for both players`
  — roda uma partida completa via `apply` e confere que os contadores refletem as jogadas feitas.
- `a duel replayed from the same seed and the same action sequence produces identical stats` —
  determinismo ponta a ponta, o mesmo invariante que o motor já garante para o resto do estado.

### Análise estática

- `packages/engine/src/stats/**` não importa `packages/rules`, `packages/data`, `packages/ai`,
  React, DOM, `fetch`, `node:*` nem Supabase — pilar 1 de `docs/arquitetura.md` §3.1 e regra
  `domain-cores-are-pure` do `.dependency-cruiser.cjs`.
- Nenhum arquivo de `packages/engine/src/stats/**` usa `Math.random()`, `Date`, `console` ou
  qualquer função assíncrona.
- `packages/shared/src/duel/stats.ts` não importa nenhum pacote do monorepo.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F01) | Teste |
|---|---|
| O estado carrega sete contadores inteiros `≥ 0` por jogador, zerados na inicialização | `emptyDuelStats returns every counter at zero` + `initDuel starts both players with zeroed stats` + `DuelStatsSchema rejects a negative counter` |
| Destruir um monstro adversário em posição de ataque incrementa `effectiveAttacks` do jogador, e apenas dele | `accumulateStats counts an attack that destroys a defender in attack position...` + `accumulateStats credits the effective attack to the attacker and never to the defender` |
| Um monstro em defesa que sobrevive incrementa `defensiveVictories` do **dono do monstro atacado** | `accumulateStats counts a surviving defender in defense position as a defensive victory for the defender's owner` |
| Baixar carta, concluir fusão, jogar equipamento e ativar magia/terreno incrementam os contadores correspondentes | `accumulateStats counts a trap set...` + `...counts a face-down summon...` + `...counts complete_fusion...` + `...counts equip_card...` + `...counts activate_spell...` + `...counts play_field_spell...` |
| Uma ação recusada pelo motor não incrementa contador algum | Propriedade de monotonicidade + `accumulateStats leaves every counter untouched for advance_phase...` (o post-step nunca roda no ramo de erro — Decisão 9) |
| Os contadores sobrevivem a um round-trip de serialização sem perda | Propriedade de round-trip com `stats` |
| Um duelo encerrado congela os contadores junto com o resto do estado | `a full duel from initDuel to outcome accumulates a consistent set of counters` (a recusa pós-desfecho já é coberta pelos testes de `motor-duelo-1x1/F12`) |
| Nenhum teste de regra de duelo existente muda de resultado | Propriedade de não-interferência + a suíte inteira de `packages/engine` passando sem alteração de expectativa |
| **(Pendência declarada)** `triggeredTraps` permanece `0`; nenhum valor é simulado | `accumulateStats never leaves triggeredTraps above zero` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: os contadores que F01 acumula são exatamente os que F02 lê do snapshot final; nenhum parâmetro da fórmula fica sem fonte | Teste de contrato: `DUEL_STAT_COUNTERS` cobre os sete parâmetros não deriváveis da tabela de F02, e os três restantes (`turn`, `deck.length`, `lp`) existem no `DuelState` — verificado por um teste que enumera a lista e falha se ela divergir dos sete nomes esperados |
| Cross-PRD (`motor-duelo-1x1`): a extensão de `DuelState` é aditiva e não quebra serialização, fim de duelo nem nenhuma ação | Propriedade de não-interferência + propriedade de round-trip + suíte completa de `packages/engine` verde |
